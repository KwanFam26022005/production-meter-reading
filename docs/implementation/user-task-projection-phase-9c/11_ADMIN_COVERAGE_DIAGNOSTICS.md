# Saigon Port — Thread 9C Admin Coverage Diagnostics

**Diagnostic Endpoint:** `GET /api/v1/admin/reading-rounds/{round_id}/coverage-diagnostics`  
**Purpose:** Pre-flight and live shift coverage validation for dispatchers and port administrators.  

---

## 1. Diagnostic Capabilities

The coverage diagnostics endpoint evaluates whether all physical zones containing scheduled meters in a given reading round have adequate personnel coverage:

1. **Shift Windows Identified:**
   - Detects all covering shift codes (`CA1`, `CA2`, `CA3`, `HC`) that span the round's scheduled timestamp.
2. **Zone-by-Zone Evaluation:**
   - For every distinct `zone_id_snapshot` present in `ReadingRoundMeter`:
     - Counts the number of meters scheduled in that zone.
     - Locates the active `PRIMARY` assignee (if assigned).
     - Gathers all active `SUPPORT` assignees.
     - Flags whether the zone is covered (`is_covered = true` if either PRIMARY or SUPPORT exists).
3. **Unassigned Zones Identification:**
   - Immediately reports any zone with $>0$ scheduled meters that has zero covering assignments, allowing dispatchers to reassign staff before the round begins.
