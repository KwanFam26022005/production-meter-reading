# 06 — Meter Reading Allocation & Execution Workflow Audit

**Document Reference:** `docs/research/employee-shift-map-audit/06_METER_READING_ALLOCATION.md`  
**Audit Date:** 2026-09-23  
**Auditor Role:** Senior Business Analyst, Software Architect, Database Auditor & Full-Stack Engineer  
**Audit Mode:** Read-Only Source & Architecture Audit  

---

## 1. Executive Summary

This document audits the operational workflow through which meter readings are scheduled, dispatched, captured by field personnel, and reconciled across [`backend/app/meter_logbook.py`](file:///D:/Projects/production-meter-reading/production-meter-reading/backend/app/meter_logbook.py), [`backend/app/admin.py`](file:///D:/Projects/production-meter-reading/production-meter-reading/backend/app/admin.py), and the mobile field interface ([`frontend/src/components/ReadingBatchView.tsx`](file:///D:/Projects/production-meter-reading/production-meter-reading/frontend/src/components/ReadingBatchView.tsx) and [`HomeHub.tsx`](file:///D:/Projects/production-meter-reading/production-meter-reading/frontend/src/components/HomeHub.tsx)).

**Key Findings:**
1. **Unassigned Global Work Pool**: Meter-reading tasks are **never dispatched to individual employees**. All active meters in an open round are visible to all employees.
2. **No Zone Boundary Enforcement**: Any authenticated employee can submit a reading for any meter in any zone, regardless of their `ZoneAssignment`.
3. **`user_id` as Provenance, Not Task Owner**: `MeterReading.user_id` records who pressed submit, not who was tasked with the duty.
4. **Complete Lack of Accountability for Unfinished Work**: When a round concludes with missing meter readings, the audit and reconciliation engine marks them as `MISSING` (`recorded_by=None`), with **no mechanism to identify which operator failed to perform the reading**.

---

## 2. The Meter Reading Pipeline Data Model

The pipeline flows from macro billing cycles down to individual meter submissions:

```
+---------------------------------------------------------------------------------+
| ReadingBatch (models.py L127-L140)                                             |
| - id: Integer (PK)                                                              |
| - code: "2026-08" (Monthly or inspection period)                                |
| - status: "OPEN" | "CLOSED"                                                    |
+---------------------------------------+-----------------------------------------+
                                        | 1:N
                                        v
+---------------------------------------------------------------------------------+
| ReadingRound (models.py L142-L167)                                             |
| - id: Integer (PK)                                                              |
| - batch_id: FK -> reading_batches.id                                            |
| - round_time: "08:00" | "14:00" | "20:00"                                       |
| - scheduled_date: "2026-09-23"                                                  |
| - status: "PENDING" | "IN_PROGRESS" | "COMPLETED" | "OVERDUE"                   |
+---------------------------------------+-----------------------------------------+
                                        | 1:N
                                        v
+---------------------------------------------------------------------------------+
| MeterReading (models.py L230-L260)                                             |
| - id: Integer (PK)                                                              |
| - round_id: FK -> reading_rounds.id                                             |
| - meter_id: FK -> meters.id                                                     |
| - user_id: FK -> users.id (RECORDER PROVENANCE ONLY)                            |
| - reading_value: Float                                                          |
| - photo_url: String (Image evidence)                                            |
| - status: "PENDING" | "CONFIRMED" | "FLAGGED"                                   |
| - exception_state: String ("NORMAL", "MISSING", "OBSTRUCTED")                   |
|                                                                                 |
| Constraint: UniqueConstraint("round_id", "meter_id", name="uq_round_meter")     |
+---------------------------------------------------------------------------------+
```

---

## 3. How Work Becomes Available & How Meters Are Selected

### 3.1 Round Opening
- Administrators create batches and rounds via [`backend/app/admin.py`](file:///D:/Projects/production-meter-reading/production-meter-reading/backend/app/admin.py) or automated cron jobs.
- When `ReadingRound.status` is set to `IN_PROGRESS` (or `PENDING`), the round becomes accessible to mobile users.

### 3.2 Field User Selection Experience ([`ReadingBatchView.tsx`](file:///D:/Projects/production-meter-reading/production-meter-reading/frontend/src/components/ReadingBatchView.tsx))
1. The field worker logs into `user.html` and opens the Meter Reading screen.
2. The UI queries `GET /api/v1/meter-logbook/rounds/{round_id}/meters`.
3. The response contains **all active meters in the port**, regardless of who is logged in.
4. The worker can filter the list by zone using a client-side dropdown (`zoneFilter`), but this is purely a visual UI filter.

### 3.3 Zero Server-Side Zone Restriction
Inspection of [`backend/app/meter_logbook.py`](file:///D:/Projects/production-meter-reading/production-meter-reading/backend/app/meter_logbook.py#L90-L135) reveals:
- The submission endpoint `POST /api/v1/meter-logbook/readings` takes `(round_id, meter_id, reading_value, photo)`.
- It verifies `round.status == "IN_PROGRESS"` and verifies that `meter_id` exists.
- **It NEVER checks `ZoneAssignment`**:
  ```python
  # Code does NOT perform:
  # assignment = db.query(ZoneAssignment).filter(user_id=current_user.id, zone_id=meter.zone_id).first()
  ```
- Any field employee can submit readings for meters in Zone A, Zone B, or Zone C indiscriminately.

---

## 4. Concurrency, Race Conditions & Duplicate Submissions

### 4.1 Unique Constraint Protection
The database table `meter_readings` enforces:
```python
UniqueConstraint("round_id", "meter_id", name="uq_round_meter")
```
- **Scenario**: Two workers in the field simultaneously inspect meter `M-01` during the 08:00 round.
- Worker 1 submits at 08:15:10 -> Success (`201 Created`).
- Worker 2 submits at 08:15:12 -> Database triggers unique constraint failure. FastAPI intercepts and returns `HTTP 409 Conflict` ("Reading already recorded for this meter in this round").
- Worker 2's submission is rejected, and the uploaded photo becomes orphan storage.

---

## 5. The Accountability Void for Unfinished Work

A critical deficiency in port operational governance is how unread meters are handled when a round closes.

### 5.1 Reconciliation Implementation in [`backend/app/admin.py`](file:///D:/Projects/production-meter-reading/production-meter-reading/backend/app/admin.py#L1657-L1673)

```python
# During round reconciliation / audit:
active_meters = db.query(Meter).filter(Meter.is_active == True).all()
readings_map = {r.meter_id: r for r in existing_readings}

for meter in active_meters:
    if meter.id not in readings_map:
        exceptions.append({
            "meter_code": meter.code,
            "meter_name": meter.name,
            "zone_code": meter.zone_code,
            "exception_state": "MISSING",
            "exception_label": "Chua ghi",
            "recorded_by": None,           # NO RESPONSIBLE OPERATOR
            "status": "UNRESOLVED"
        })
```

### 5.2 Business & Labor Impact
1. **No Individual Responsibility**: Because meters are never assigned to individual workers or shift teams, when 15 meters in Zone B are missed, the system cannot report which employee failed their shift duty.
2. **Zone Assignment Irrelevance**: Even though `zone_assignments` links a user to Zone B, the reconciliation engine does not join `zone_assignments` to the missing meter records. The report simply lists `recorded_by=None`.
3. **Free-Rider Problem**: In field operations, diligent workers may read extra meters while others read none, with no administrative visibility into who performed their fair share of work.
