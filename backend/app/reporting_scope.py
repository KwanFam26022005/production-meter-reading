"""Published workload projection for Admin reporting.

Snapshot rows are publication-time scope. Legacy rounds deliberately retain a
dynamic active-inventory denominator; no historical scope is manufactured.
"""

from collections import defaultdict
from dataclasses import dataclass
from datetime import date, datetime, timedelta, timezone
from typing import Optional

from sqlalchemy.orm import Session

from .models import Meter, MeterReading, OperationalAssignment, OperationalZone, ReadingRound, ReadingRoundMeter, User
from .operational_assignments import LOCAL_TZ, shift_window


def utc(dt: datetime) -> datetime:
    return dt.replace(tzinfo=timezone.utc) if dt.tzinfo is None else dt.astimezone(timezone.utc)


def expected_shifts(scheduled_at: datetime) -> list[tuple[str, str]]:
    local = utc(scheduled_at).astimezone(LOCAL_TZ)
    candidates = []
    for work_day in (local.date() - timedelta(days=1), local.date()):
        for code in ("CA1", "CA2", "CA3", "HC"):
            start, end = shift_window(work_day.isoformat(), code)
            if start <= local < end:
                candidates.append((work_day.isoformat(), code))
    return candidates


@dataclass(frozen=True)
class ScopeTask:
    round: ReadingRound
    meter_id: Optional[str]
    meter_code: str
    meter_name: str
    meter_type: str
    zone_id: Optional[str]
    zone_name: str
    utility_type: str
    scope_mode: str
    due: bool
    reading: Optional[MeterReading]
    assignments: tuple[OperationalAssignment, ...]

    @property
    def status(self) -> str:
        if not self.due:
            return "UPCOMING"
        if self.reading and self.reading.status in ("CONFIRMED", "REVIEW"):
            return self.reading.status
        return "MISSING"


def load_scope_tasks(
    db: Session,
    start_date: str,
    end_date: str,
    *,
    zone_id: Optional[str] = None,
    utility_type: Optional[str] = None,
    meter_type: Optional[str] = None,
    meter_id: Optional[str] = None,
    location: Optional[str] = None,
    now: Optional[datetime] = None,
) -> list[ScopeTask]:
    """Bulk-load round, scope, reading and staffing truth without round × meter queries."""
    now_utc = utc(now or datetime.now(timezone.utc))
    start_utc = datetime.combine(date.fromisoformat(start_date), datetime.min.time(), LOCAL_TZ).astimezone(timezone.utc)
    end_utc = datetime.combine(date.fromisoformat(end_date) + timedelta(days=1), datetime.min.time(), LOCAL_TZ).astimezone(timezone.utc)
    rounds = [
        r for r in db.query(ReadingRound).filter(
            ReadingRound.is_legacy == False, ReadingRound.status != "CANCELLED",
            ReadingRound.scheduled_at >= start_utc, ReadingRound.scheduled_at < end_utc,
        ).order_by(ReadingRound.scheduled_at.asc()).all()
    ]
    if not rounds:
        return []
    round_ids = [r.id for r in rounds]
    snapshot_ids = [r.id for r in rounds if r.scope_mode == "SNAPSHOT"]
    scopes = db.query(ReadingRoundMeter).filter(
        ReadingRoundMeter.reading_round_id.in_(snapshot_ids),
        ReadingRoundMeter.scope_status == "SCHEDULED",
    ).all() if snapshot_ids else []
    scopes_by_round: dict[str, list[ReadingRoundMeter]] = defaultdict(list)
    for scope in scopes:
        scopes_by_round[scope.reading_round_id].append(scope)

    meters = db.query(Meter).all()
    meter_by_id = {m.id: m for m in meters}
    active_meters = [m for m in meters if m.is_active and (m.lifecycle_status or "ACTIVE") == "ACTIVE"]
    zones = {z.id: z.name for z in db.query(OperationalZone).all()}
    readings = db.query(MeterReading).filter(MeterReading.reading_round_id.in_(round_ids)).all()
    reading_by_pair = {(rd.reading_round_id, rd.meter_id): rd for rd in readings}

    # One staffing query covers all local dates, including prior-day CA3 starts.
    first_day = min(utc(r.scheduled_at).astimezone(LOCAL_TZ).date() for r in rounds) - timedelta(days=1)
    last_day = max(utc(r.scheduled_at).astimezone(LOCAL_TZ).date() for r in rounds)
    assignments = db.query(OperationalAssignment).filter(
        OperationalAssignment.status.in_(["ASSIGNED", "ACTIVE"]),
        OperationalAssignment.work_date >= first_day.isoformat(),
        OperationalAssignment.work_date <= last_day.isoformat(),
    ).all()
    assignments_by_date: dict[str, list[OperationalAssignment]] = defaultdict(list)
    for assignment in assignments:
        assignments_by_date[assignment.work_date].append(assignment)
    covering_by_round: dict[str, dict[str, tuple[OperationalAssignment, ...]]] = {}
    for r in rounds:
        scheduled_local = utc(r.scheduled_at).astimezone(LOCAL_TZ)
        by_zone: dict[str, list[OperationalAssignment]] = defaultdict(list)
        current_day = scheduled_local.date()
        candidates = assignments_by_date[current_day.isoformat()] + assignments_by_date[(current_day - timedelta(days=1)).isoformat()]
        for assignment in candidates:
            try:
                start, end = shift_window(assignment.work_date, assignment.shift_code)
            except ValueError:
                continue
            if start <= scheduled_local < end:
                by_zone[assignment.zone_id].append(assignment)
        covering_by_round[r.id] = {zid: tuple(rows) for zid, rows in by_zone.items()}

    tasks: list[ScopeTask] = []
    for r in rounds:
        due = utc(r.scheduled_at) <= now_utc
        if r.scope_mode == "SNAPSHOT":
            candidates = [
                (s.meter_id, s.meter_code_snapshot, s.meter_name_snapshot or s.meter_code_snapshot,
                 s.zone_id_snapshot, s.utility_type_snapshot or "UNKNOWN")
                for s in scopes_by_round.get(r.id, [])
            ]
        else:
            candidates = [
                (m.id, m.meter_code, m.name, m.zone_id, m.utility_type or "UNKNOWN")
                for m in active_meters
            ]
        for candidate_id, code, name, zid, utility in candidates:
            meter = meter_by_id.get(candidate_id) if candidate_id else None
            if meter_id and candidate_id != meter_id:
                continue
            if zone_id and zone_id != "ALL" and zid != zone_id:
                continue
            if utility_type and utility_type != "ALL" and utility != utility_type:
                continue
            if meter_type and meter_type != "ALL" and (not meter or meter.meter_type != meter_type):
                continue
            # Compatibility filter: a snapshot's operational zone is authoritative;
            # free-text asset location only narrows explicitly requested legacy views.
            zone_name = zones.get(zid, zid or "Chưa phân khu")
            if location and location != "ALL" and location != zone_name:
                if r.scope_mode == "SNAPSHOT" or not meter or meter.location != location:
                    continue
            tasks.append(ScopeTask(
                round=r, meter_id=candidate_id, meter_code=code, meter_name=name,
                meter_type=meter.meter_type if meter else "UNKNOWN", zone_id=zid,
                zone_name=zone_name, utility_type=utility, scope_mode=r.scope_mode,
                due=due, reading=reading_by_pair.get((r.id, candidate_id)),
                assignments=covering_by_round[r.id].get(zid, ()),
            ))
    return tasks


def operational_report(db: Session, start_date: str, end_date: str, **filters: str) -> dict:
    tasks = load_scope_tasks(db, start_date, end_date, **filters)
    due = [task for task in tasks if task.due]
    assigned = [task for task in due if task.assignments]
    missing = [task for task in due if task.status == "MISSING"]
    reviews = [task for task in due if task.status == "REVIEW"]
    users = {u.id: u.full_name for u in db.query(User).all()}

    def task_data(task: ScopeTask) -> dict:
        schedule = utc(task.round.scheduled_at).astimezone(LOCAL_TZ)
        expected = expected_shifts(task.round.scheduled_at)
        return {
            "round_id": task.round.id, "scheduled_at": utc(task.round.scheduled_at).isoformat(),
            "meter_id": task.meter_id, "meter_code": task.meter_code,
            "meter_name": task.meter_name, "zone_id": task.zone_id,
            "zone_name": task.zone_name, "utility_type": task.utility_type,
            "scope_mode": task.scope_mode, "status": task.status,
            "shift_code": "/".join(sorted({a.shift_code for a in task.assignments})) if task.assignments else "/".join(code for _, code in expected) or None,
            "work_date": next((a.work_date for a in task.assignments), expected[0][0] if expected else schedule.date().isoformat()),
            "assigned": [{"user_id": a.user_id, "name": users.get(a.user_id, a.user_id), "role": a.assignment_role}
                         for a in task.assignments],
            "reading_id": task.reading.id if task.reading else None,
            "executor_id": task.reading.user_id if task.reading else None,
            "executor_name": users.get(task.reading.user_id, task.reading.user_id) if task.reading else None,
        }

    group: dict[tuple[str, Optional[str]], list[ScopeTask]] = defaultdict(list)
    for task in tasks:
        group[(task.round.id, task.zone_id)].append(task)
    breakdown = []
    for (round_id, zid), rows in group.items():
        first = rows[0]
        breakdown.append({
            "round_id": round_id, "scheduled_at": utc(first.round.scheduled_at).isoformat(),
            "zone_id": zid, "zone_name": first.zone_name,
            "scope_mode": first.scope_mode,
            "scheduled": len(rows), "due": sum(t.due for t in rows),
            "confirmed": sum(t.status == "CONFIRMED" for t in rows),
            "review": sum(t.status == "REVIEW" for t in rows),
            "missing": sum(t.status == "MISSING" for t in rows),
            "assigned_due": sum(t.due and bool(t.assignments) for t in rows),
            "unassigned_due": sum(t.due and not t.assignments for t in rows),
            "shift_codes": sorted({code for t in rows for _, code in expected_shifts(t.round.scheduled_at)}),
        })
    # Category order is explicit. Within a category, the oldest schedule wins.
    integrity_actions: list[tuple[str, ScopeTask, Optional[str]]] = []
    for task in tasks:
        rd = task.reading
        if not rd:
            continue
        reason = None
        if rd.status == "CONFIRMED" and not task.due:
            reason = "Bản ghi xác nhận trước thời điểm lượt ghi"
        elif rd.status == "CONFIRMED" and rd.confirmation_source == "OCR_CONFIRMED" and (not rd.ocr_reading or rd.reading != rd.ocr_reading):
            reason = "Chỉ số xác nhận từ OCR không khớp chỉ số OCR gốc"
        elif rd.confirmation_source == "USER_CORRECTED" and not rd.ocr_reading:
            reason = "Hiệu chỉnh thiếu chỉ số OCR gốc"
        elif rd.confirmation_source == "MANUAL_ENTRY" and rd.ocr_reading is not None:
            reason = "Nhập thủ công có chỉ số OCR gốc"
        elif rd.server_timestamp and utc(rd.server_timestamp) < utc(task.round.scheduled_at):
            reason = "Thời gian ghi trước thời điểm lượt ghi"
        if reason:
            integrity_actions.append(("DATA_INTEGRITY", task, reason))
    actions = (
        [("UNASSIGNED_DUE", t, None) for t in due if not t.assignments]
        + [("OVERDUE_MISSING", t, None) for t in missing if t.assignments]
        + [("REVIEW", t, None) for t in reviews if t.assignments]
        + integrity_actions
    )
    actions.sort(key=lambda pair: (
        {"UNASSIGNED_DUE": 0, "OVERDUE_MISSING": 1, "REVIEW": 2, "DATA_INTEGRITY": 3}[pair[0]],
        utc(pair[1].round.scheduled_at), pair[1].meter_code,
    ))
    return {
        "date_range": {"start_date": start_date, "end_date": end_date},
        "summary": {
            "scheduled": len(tasks), "scheduled_rounds": len({t.round.id for t in tasks}),
            "due": len(due), "confirmed": sum(t.status == "CONFIRMED" for t in due),
            "review": len(reviews), "missing": len(missing),
            "assigned_due": len(assigned), "unassigned_due": len(due) - len(assigned),
            "coverage_percent": round(len(assigned) / len(due) * 100, 1) if due else 0.0,
            "completion_percent": round(sum(t.status == "CONFIRMED" for t in due) / len(due) * 100, 1) if due else 0.0,
            "unassigned_zone_count": len({t.zone_id for t in due if not t.assignments}),
            "legacy_dynamic_count": sum(t.scope_mode != "SNAPSHOT" for t in tasks),
        },
        "breakdown": sorted(breakdown, key=lambda row: (row["scheduled_at"], row["zone_name"])),
        "actions": [{"type": kind, "reason": reason, **task_data(task)} for kind, task, reason in actions],
        "tasks": [task_data(task) for task in tasks],
        "available_zones": [{"id": z.id, "name": z.name} for z in db.query(OperationalZone).order_by(OperationalZone.name).all()],
    }
