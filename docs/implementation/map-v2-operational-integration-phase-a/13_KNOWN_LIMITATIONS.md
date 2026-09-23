# 13 — Known Limitations & Scope Deferrals

**Scope:** Documenting deferred business decisions and technical boundaries of Phase A.

---

## 1. Deferred Business Decisions

1. **BD-04: Zone Hierarchy & Parent-Child Aggregation:**
   - Tan Thuan presentation map contains 7 zones (including warehouses Kho 1, Kho 2, Kho 4).
   - In SQLite database, warehouses map to a single operational business zone `zone-warehouse`.
   - Silent rollup/aggregation of child warehouse progress into parent or vice versa was **explicitly deferred** to prevent misleading counts. Each presentation zone currently reflects its mapped business zone metrics.

2. **BD-05: Port Business Meaning of Round Progress Denominator:**
   - The technical formula `confirmed / total_meters` is technically verified.
   - Whether `total_meters` represents "all active port meters" or "meters scheduled for this specific round" requires business committee sign-off.
   - Phase A avoids the phrase `"81% hoàn thành công việc"` and renders explicit single-round text: `"Đã ghi 34 / 42 công tơ trong lượt"`.

---

## 2. Technical Limitations in Phase A

1. **Spatial Coordinates Seeding:**
   - In the current SQLite database, only canonical meters have seeded spatial coordinates.
   - Meters created administratively without spatial coordinates will trigger the `"Chưa xác định vị trí trên Map V2"` non-blocking notice.

2. **Multi-User Assignment per Zone:**
   - Current backend API returns a single `assigned_user` per zone in `OperationalZoneOut`.
   - Multi-shift handoffs and concurrent worker representation are deferred to Phase B.

3. **GPS Field Tracking:**
   - As mandated by the truthfulness rules, the system does not support real-time GPS tracking of field staff. Staff markers represent stationary zone responsibility.
