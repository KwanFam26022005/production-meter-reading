# Saigon Port — Thread 9C Task Mutation Authority and Security

**Enforcement Gate:** `validate_meter_user_task_authority()` in `backend/app/user_tasks.py`  
**Intercept Points:** `confirm_meter_reading()` and `mark_meter_review()` in `backend/app/meter_logbook.py`  

---

## 1. Security & Operational Authority Rules

### 1.1 Field Employee Enforcement
When an employee (`role != 'ADMIN'`) attempts to submit a reading or report an exception on a meter:
1. The system verifies if `round.scope_mode == 'SNAPSHOT'`.
2. The system checks if the employee possesses an active `OperationalAssignment` (`status == 'ASSIGNED'`) covering:
   - The round's scheduled timestamp (`round.scheduled_at`).
   - The meter's snapshot zone (`round_meter.zone_id_snapshot`).
3. If no covering assignment exists, the API rejects the mutation immediately with **HTTP 403 Forbidden**:
   ```json
   {
     "detail": "Bạn không có quyền ghi chỉ số công tơ này: khu vực không thuộc phân công ca tác nghiệp của bạn."
   }
   ```

### 1.2 Administrative Wharf-Wide Override
Administrators (`role == 'ADMIN'`) bypass task authority checks and may confirm readings or record reviews across all operational zones and meters at any time.

### 1.3 Validation Order Invariant
To prevent information leakage or confusing error codes:
1. Validate round exists & is OPEN.
2. Validate batch exists & is OPEN.
3. Validate round scheduled time has arrived.
4. Validate meter exists & is ACTIVE (HTTP 400 for inactive/retired).
5. Validate reading numeric format.
6. **Validate user task authority (HTTP 403)**.
7. Validate reading conflict (HTTP 409).
