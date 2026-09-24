# Saigon Port — Thread 9C Known Limitations and Edge Cases

---

## 1. Known Architectural Boundaries

1. **Legacy DYNAMIC_LEGACY Scope Mode:**
   - Rounds created without `SNAPSHOT` scope (legacy fixtures) lack `zone_id_snapshot`.
   - The projector falls back gracefully to `Meter.zone_id` current values. If zero operational assignments exist across the entire database, legacy open mode allows unrestricted reading to avoid regressing historical test suites.
2. **Administrative Override Audit:**
   - When an administrator confirms a reading on a meter outside their personal assignment (or without any shift assignment), the forensic recorder writes `MeterReading.user_id = admin.id`.
   - Thread 9D reporting will account for administrative overrides distinct from standard shift assignees.
3. **Overlapping Shift Categories (e.g. HC and CA1):**
   - The projector preserves all truthful covering assignments. If an administrator assigns an employee to both HC and CA1, the employee's operational tasks represent the union of assigned zones across those windows.
