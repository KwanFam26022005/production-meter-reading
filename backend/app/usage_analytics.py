"""Unit-aware usage read model from confirmed cumulative register readings."""

from collections import Counter, defaultdict
from datetime import date, datetime, timedelta, timezone
from decimal import Decimal, InvalidOperation
from statistics import median
from typing import Optional

from fastapi import HTTPException
from sqlalchemy import func
from sqlalchemy.orm import Session

from .models import Meter, MeterReading, ReadingRound
from .operational_assignments import LOCAL_TZ
from .reporting_scope import load_scope_tasks, utc
from .schemas import DerivedUsageInterval, UsageMeterResponse, UsageRegisterPoint, UsageOverviewResponse


def numeric(value: Optional[str]) -> Optional[Decimal]:
    try:
        result = Decimal(value) if value is not None else None
        return result if result is not None and result.is_finite() else None
    except (InvalidOperation, ValueError):
        return None


def derive_intervals(
    meter: Meter, points: list[tuple[MeterReading, ReadingRound]],
) -> list[DerivedUsageInterval]:
    """Derive adjacent confirmed points. REVIEW records never become endpoints."""
    confirmed = sorted(
        ((rd, r) for rd, r in points if rd.status == "CONFIRMED" and r.status != "CANCELLED"),
        key=lambda pair: (utc(pair[1].scheduled_at), pair[0].id),
    )
    unit = meter.measurement_unit or "UNKNOWN"
    semantics = meter.register_semantics or "UNKNOWN"
    utility = meter.utility_type or "UNKNOWN"
    intervals: list[DerivedUsageInterval] = []
    for (before, from_round), (after, to_round) in zip(confirmed, confirmed[1:]):
        start, end = utc(from_round.scheduled_at), utc(to_round.scheduled_at)
        elapsed = (end - start).total_seconds() / 60
        previous, current = numeric(before.reading), numeric(after.reading)
        delta: Optional[float] = None
        rate: Optional[float] = None
        rate_unit: Optional[str] = None
        state = "VALID"
        if semantics != "CUMULATIVE":
            state = "INTERVAL_REGISTER_NOT_DERIVED" if semantics == "INTERVAL" else "UNKNOWN_REGISTER_SEMANTICS"
        elif previous is None or current is None:
            state = "NON_NUMERIC_READING"
        elif elapsed <= 0:
            state = "INVALID_INTERVAL"
        elif current < previous:
            state = "RESET_OR_ROLLOVER_SUSPECTED"
        else:
            delta = float(current - previous)
            if unit == "UNKNOWN":
                state = "UNKNOWN_UNIT"
            elif (utility, unit) not in (("ELECTRICITY", "KWH"), ("WATER", "M3")):
                state = "UNKNOWN_UNIT"
            else:
                rate = round(delta / (elapsed / 60), 4)
                rate_unit = "KW" if unit == "KWH" else "M3/H"
        intervals.append(DerivedUsageInterval(
            meter_id=meter.id, utility_type=utility, measurement_unit=unit,
            register_semantics=semantics, from_reading_id=before.id,
            to_reading_id=after.id, from_scheduled_at=start.isoformat(),
            to_scheduled_at=end.isoformat(), from_value=before.reading or "",
            to_value=after.reading or "", delta=delta, elapsed_minutes=round(elapsed, 2),
            normalized_rate=rate, rate_unit=rate_unit, quality_status=state,
            unit_status="CONFIGURED" if state == "VALID" else ("UNKNOWN" if unit == "UNKNOWN" else "CONFIGURED"),
            from_confirmation_source=before.confirmation_source,
            to_confirmation_source=after.confirmation_source,
        ))

    # Baseline: median of valid intervals from the previous seven LOCAL calendar
    # days with identical start and end clock times. Three peers are required.
    for target in intervals:
        if target.quality_status != "VALID":
            continue
        target_start = datetime.fromisoformat(target.from_scheduled_at).astimezone(LOCAL_TZ)
        target_end = datetime.fromisoformat(target.to_scheduled_at).astimezone(LOCAL_TZ)
        peers: list[float] = []
        for prior in intervals:
            if prior is target or prior.quality_status != "VALID" or prior.delta is None:
                continue
            prior_start = datetime.fromisoformat(prior.from_scheduled_at).astimezone(LOCAL_TZ)
            prior_end = datetime.fromisoformat(prior.to_scheduled_at).astimezone(LOCAL_TZ)
            days = (target_end.date() - prior_end.date()).days
            if 1 <= days <= 7 and prior_start.time() == target_start.time() and prior_end.time() == target_end.time():
                peers.append(prior.delta)
        if len(peers) >= 3:
            baseline = float(median(peers))
            target.baseline_status = "AVAILABLE"
            target.baseline_delta = baseline
            target.difference = round((target.delta or 0) - baseline, 4)
            target.deviation_percent = round(target.difference / baseline * 100, 1) if baseline else None
    return intervals


def _load_points(db: Session, meter_ids: set[str], start_date: str, end_date: str):
    if not meter_ids:
        return {}, {}
    earliest = (date.fromisoformat(start_date) - timedelta(days=9)).isoformat()
    latest = end_date
    first_utc = datetime.combine(date.fromisoformat(earliest), datetime.min.time(), LOCAL_TZ).astimezone(timezone.utc)
    last_utc = datetime.combine(date.fromisoformat(latest) + timedelta(days=1), datetime.min.time(), LOCAL_TZ).astimezone(timezone.utc)
    rounds = {
        r.id: r for r in db.query(ReadingRound).filter(
            ReadingRound.is_legacy == False, ReadingRound.status != "CANCELLED",
            ReadingRound.scheduled_at >= first_utc, ReadingRound.scheduled_at < last_utc,
        ).all()
    }
    readings = db.query(MeterReading).filter(
        MeterReading.meter_id.in_(meter_ids),
        MeterReading.reading_round_id.in_(list(rounds)),
        MeterReading.status == "CONFIRMED",
    ).all() if rounds else []
    by_meter: dict[str, list[tuple[MeterReading, ReadingRound]]] = defaultdict(list)
    for reading in readings:
        by_meter[reading.meter_id].append((reading, rounds[reading.reading_round_id]))
    # A long gap may leave the first selected reading without an endpoint in
    # the baseline lookback. Fetch one preceding confirmed point per meter.
    ranked = db.query(
        MeterReading.id.label("reading_id"),
        func.row_number().over(
            partition_by=MeterReading.meter_id,
            order_by=(ReadingRound.scheduled_at.desc(), MeterReading.id.desc()),
        ).label("position"),
    ).join(ReadingRound, ReadingRound.id == MeterReading.reading_round_id).filter(
        MeterReading.meter_id.in_(meter_ids), MeterReading.status == "CONFIRMED",
        ReadingRound.is_legacy == False, ReadingRound.status != "CANCELLED",
        ReadingRound.scheduled_at < first_utc,
    ).subquery()
    prior_ids = [row.reading_id for row in db.query(ranked.c.reading_id).filter(ranked.c.position == 1).all()]
    if prior_ids:
        for reading, round_obj in db.query(MeterReading, ReadingRound).join(
            ReadingRound, ReadingRound.id == MeterReading.reading_round_id,
        ).filter(MeterReading.id.in_(prior_ids)).all():
            by_meter[reading.meter_id].append((reading, round_obj))
    return rounds, by_meter


def get_usage_overview(
    db: Session, start_date: str, end_date: str,
    utility_type: Optional[str] = None, zone_id: Optional[str] = None,
    meter_id: Optional[str] = None,
) -> UsageOverviewResponse:
    scoped_tasks = load_scope_tasks(db, start_date, end_date, zone_id=zone_id,
                                    utility_type=utility_type)
    # Keep the meter picker stable when a single meter is selected. Scope and
    # utility filters still determine which assets are offered.
    available_meters = sorted(
        {task.meter_id: {"id": task.meter_id, "code": task.meter_code}
         for task in scoped_tasks if task.meter_id}.values(),
        key=lambda item: item["code"],
    )
    tasks = [task for task in scoped_tasks if meter_id is None or task.meter_id == meter_id]
    # Only published workload in the requested slice can contribute.
    selected = {(t.round.id, t.meter_id): t for t in tasks if t.meter_id}
    meter_ids = {t.meter_id for t in tasks if t.meter_id}
    meters = {m.id: m for m in db.query(Meter).filter(Meter.id.in_(meter_ids)).all()} if meter_ids else {}
    _, points_by_meter = _load_points(db, meter_ids, start_date, end_date)
    interval_rows: list[DerivedUsageInterval] = []
    to_round_by_reading: dict[str, str] = {}
    for mid, meter in meters.items():
        all_intervals = derive_intervals(meter, points_by_meter.get(mid, []))
        # Interval end must be an in-scope round. The prior point may predate
        # the selected range; this preserves the first usable interval.
        to_round_by_reading.update({rd.id: r.id for rd, r in points_by_meter.get(mid, [])})
        interval_rows.extend(i for i in all_intervals
                             if (to_round_by_reading.get(i.to_reading_id), mid) in selected)

    eligible: dict[tuple[str, str], set[str]] = defaultdict(set)
    eligible_zone: dict[tuple[Optional[str], str, str, str], set[str]] = defaultdict(set)
    for task in tasks:
        if task.meter_id:
            meter = meters.get(task.meter_id)
            unit = (meter.measurement_unit if meter else "UNKNOWN") or "UNKNOWN"
            eligible[(task.utility_type, unit)].add(task.meter_id)
            eligible_zone[(task.zone_id, task.zone_name, task.utility_type, unit)].add(task.meter_id)
    valid: dict[tuple[str, str], list[DerivedUsageInterval]] = defaultdict(list)
    interval_zone: dict[str, tuple[Optional[str], str]] = {}
    for interval in interval_rows:
        if interval.quality_status == "VALID":
            # Snapshot utility type wins for grouping when the current asset changed.
            round_id = to_round_by_reading.get(interval.to_reading_id)
            task = selected.get((round_id, interval.meter_id))
            interval.utility_type = task.utility_type if task else interval.utility_type
            if task:
                interval_zone[interval.to_reading_id] = (task.zone_id, task.zone_name)
            if (interval.utility_type, interval.measurement_unit) not in (("ELECTRICITY", "KWH"), ("WATER", "M3")):
                interval.quality_status = "INCOMPATIBLE_METADATA"
                interval.unit_status = "INCOMPATIBLE"
                interval.normalized_rate = None
                interval.rate_unit = None
                interval.baseline_status = "INSUFFICIENT_HISTORY"
                interval.baseline_delta = None
                interval.difference = None
                interval.deviation_percent = None
            else:
                valid[(interval.utility_type, interval.measurement_unit)].append(interval)

    quality = Counter(i.quality_status for i in interval_rows)
    quality["INSUFFICIENT_DATA"] = len(meter_ids - {i.meter_id for i in interval_rows})

    groups = []
    series_map: dict[tuple[str, str, str, str], list[DerivedUsageInterval]] = defaultdict(list)
    contributors: dict[tuple[str, str, str, Optional[str], str], float] = defaultdict(float)
    zone_valid: dict[tuple[Optional[str], str, str, str], list[DerivedUsageInterval]] = defaultdict(list)
    for key, ids in sorted(eligible.items()):
        rows = valid.get(key, [])
        contributor_ids = {row.meter_id for row in rows}
        coverage = len(contributor_ids) / len(ids) * 100 if ids else 0
        baselines = [row.baseline_delta for row in rows]
        baseline = sum(baselines) if rows and all(value is not None for value in baselines) else None
        total = round(sum(row.delta or 0 for row in rows), 4) if rows else None
        difference = round(total - baseline, 4) if total is not None and baseline is not None else None
        groups.append({
            "utility_type": key[0], "measurement_unit": key[1],
            "total_delta": total, "interval_count": len(rows),
            "coverage": {"eligible_meters": len(ids), "meters_with_valid_interval": len(contributor_ids),
                         "coverage_percent": round(coverage, 1)},
            "highest_interval": max(rows, key=lambda row: row.delta or 0) if rows else None,
            "baseline_delta": baseline, "difference": difference,
            "deviation_percent": round(difference / baseline * 100, 1) if difference is not None and baseline else None,
        })
        for row in rows:
            to_local = datetime.fromisoformat(row.to_scheduled_at).astimezone(LOCAL_TZ)
            from_local = datetime.fromisoformat(row.from_scheduled_at).astimezone(LOCAL_TZ)
            series_map[(key[0], key[1], to_local.date().isoformat(),
                        f"{from_local:%H:%M}–{to_local:%H:%M}")].append(row)
            zid, zname = interval_zone.get(row.to_reading_id, (None, "Chưa phân khu"))
            contributors[(row.meter_id, key[0], key[1], zid, zname)] += row.delta or 0
            zone_valid[(zid, zname, key[0], key[1])].append(row)

    series = [
        {"utility_type": utility, "measurement_unit": unit, "date": day, "slot": slot,
         "delta": round(sum(row.delta or 0 for row in rows), 4),
         "contributor_count": len({row.meter_id for row in rows})}
        for (utility, unit, day, slot), rows in sorted(series_map.items())
    ]
    top_contributors = []
    for (mid, utility, unit, zid, zname), delta in contributors.items():
        top_contributors.append({
            "meter_id": mid, "meter_code": meters[mid].meter_code,
            "zone_id": zid, "zone_name": zname,
            "utility_type": utility, "measurement_unit": unit, "delta": round(delta, 4),
        })
    top_contributors.sort(key=lambda row: (-row["delta"], row["meter_code"]))
    zone_breakdown = []
    for (zid, zname, utility, unit), ids in sorted(eligible_zone.items(), key=lambda item: (item[0][2], item[0][3], item[0][1])):
        rows = zone_valid.get((zid, zname, utility, unit), [])
        contributors_in_zone = {row.meter_id for row in rows}
        zone_breakdown.append({
            "zone_id": zid, "zone_name": zname, "utility_type": utility, "measurement_unit": unit,
            "total_delta": round(sum(row.delta or 0 for row in rows), 4) if rows else None,
            "coverage": {"eligible_meters": len(ids), "meters_with_valid_interval": len(contributors_in_zone),
                         "coverage_percent": round(len(contributors_in_zone) / len(ids) * 100, 1) if ids else 0.0},
        })
    return UsageOverviewResponse(
        date_range={"start_date": start_date, "end_date": end_date},
        selection={"utility_type": utility_type, "zone_id": zone_id, "meter_id": meter_id},
        resolution="Theo lượt ghi đã công bố; không phải dữ liệu thời gian thực.",
        available_meters=available_meters,
        groups=groups, series=series, top_contributors=top_contributors,
        zone_breakdown=zone_breakdown,
        intervals=interval_rows, data_quality=dict(quality),
    )


def get_meter_usage(db: Session, meter_id: str, start_date: str, end_date: str) -> UsageMeterResponse:
    meter = db.query(Meter).filter(Meter.id == meter_id).first()
    if not meter:
        raise HTTPException(status_code=404, detail="Meter not found")
    _, by_meter = _load_points(db, {meter_id}, start_date, end_date)
    pairs = sorted(by_meter.get(meter_id, []), key=lambda item: utc(item[1].scheduled_at))
    intervals = derive_intervals(meter, pairs)
    points = [UsageRegisterPoint(
        reading_id=rd.id, round_id=r.id, scheduled_at=utc(r.scheduled_at).isoformat(),
        value=rd.reading or "", confirmation_source=rd.confirmation_source,
    ) for rd, r in pairs if start_date <= utc(r.scheduled_at).astimezone(LOCAL_TZ).date().isoformat() <= end_date]
    intervals = [i for i in intervals if start_date <= datetime.fromisoformat(i.to_scheduled_at).astimezone(LOCAL_TZ).date().isoformat() <= end_date]
    return UsageMeterResponse(
        meter_id=meter.id, meter_code=meter.meter_code, meter_name=meter.name,
        utility_type=meter.utility_type or "UNKNOWN", measurement_unit=meter.measurement_unit or "UNKNOWN",
        register_semantics=meter.register_semantics or "UNKNOWN", points=points, intervals=intervals,
    )
