# Map V2 Business & Information Density Audit — 07. Zone Hierarchy & Progress Audit

## 1. Zone Inventory (Frontend — Static JSON)

Source: `frontend/src/components/map-v2/data/tan_thuan_1_zones_edited.json`

| Zone ID | Label | Category | Parent ID | Evidence |
| :--- | :--- | :--- | :--- | :--- |
| ZONE_QUAY | Khu cảng sà lan | operational_zone | null | tan_thuan_1_zones_edited.json |
| ZONE_GENERAL | Bãi tổng hợp | operational_zone | null | tan_thuan_1_zones_edited.json |
| ZONE_CONTAINER | Bãi container | operational_zone | null | tan_thuan_1_zones_edited.json |
| BLDG_KHO_1 | Kho 1 | warehouse | ZONE_GENERAL | tan_thuan_1_zones_edited.json |
| BLDG_KHO_2 | Kho 2 | warehouse | ZONE_GENERAL | tan_thuan_1_zones_edited.json |
| BLDG_KHO_4 | Kho 4 | warehouse | null | tan_thuan_1_zones_edited.json |
| ZONE_ADMIN | Văn phòng hành chính | administration | null | tan_thuan_1_zones_edited.json |

## 2. Parent-Child Relationship Analysis

### Frontend (Map V2 Static JSON)
Kho 1 and Kho 2 have `parent_id: 'ZONE_GENERAL'`. This means they are geometrically nested inside Bãi tổng hợp.

### Backend (OperationalZone Model)
The `OperationalZone` model in `models.py#L89` has **NO parent_id field**. The backend zone structure is **flat** — no hierarchy.

### Discrepancy
Frontend JSON has parent-child via `parent_id` field on polygons.
Backend database has no such relationship.
This means zone hierarchy exists only in the presentation layer, not in the operational database.

## 3. Double-Counting Risk Analysis

### Meter → Zone Assignment
Backend `Meter` model (models.py#L173) has a single `zone_id` FK. A meter belongs to exactly **one** OperationalZone.

### Risk Scenario
If a meter is assigned to `BLDG_KHO_1` in the database, and someone aggregates progress for `ZONE_GENERAL` (parent), should Kho 1's meters be included?

**Current state**: No aggregation exists because Map V2 has no backend data connection. The demo `zoneMeterSummary` strings are hardcoded.

**Future risk**: When real data flows, if `ZONE_GENERAL` and `BLDG_KHO_1` are both operational zones in the DB, and meters are assigned to the child only, then:
- ZONE_GENERAL progress would show 0 (no directly-assigned meters)
- BLDG_KHO_1 progress would show its meters
- A parent aggregate would need explicit business rules

### Click Target Conflict
Geometrically, clicking on Kho 1's polygon area could hit either Kho 1 or Bãi tổng hợp depending on z-order. 

Current behavior in MapV2Canvas.tsx: SVG elements are rendered in order, with child zones rendered after parents (higher z-order). Click events on child polygons should take priority via SVG stacking. UNVERIFIED — needs interactive testing.

## 4. Zone Anchor Display

Source: `zoneAnchors.ts`

7 anchors defined:
- ZONE_QUAY → Khu cảng sà lan (quay icon)
- ZONE_GENERAL → Bãi tổng hợp (yard icon)
- ZONE_CONTAINER → Bãi container (container icon)
- BLDG_KHO_1 → Kho 1 (warehouse icon)
- BLDG_KHO_2 → Kho 2 (warehouse icon)
- BLDG_KHO_4 → Kho 4 (warehouse icon)
- ZONE_ADMIN → Văn phòng hành chính (admin icon)

Kho 1 and Bãi tổng hợp anchors are close together (~400px apart), with Kho 1 marker overlapping the parent zone visually.

## 5. What's Missing for Zone Progress

| Feature | Current State | Readiness |
| :--- | :--- | :--- |
| Zone meter count | Not shown on map | NEEDS_BACKEND_DATA |
| Zone completion rate | Hardcoded in demo employee adapter | NEEDS_BACKEND_DATA |
| Zone exception count | Not available | NEEDS_BACKEND_DATA |
| Zone-level color coding by status | Not implemented | NEEDS_FRONTEND_INTEGRATION |
| Parent-child aggregation rules | Not defined | NEEDS_BUSINESS_CONFIRMATION |

## 6. Distinguishing Zone States

The audit requires distinguishing:
- **Khu không có công tơ**: Zone with 0 meters assigned → show 'Không có thiết bị'
- **Khu chưa có dữ liệu**: Zone exists but no reading round active → show 'Chưa mở lượt'
- **Khu có dữ liệu nhưng 0%**: Zone with meters but 0 confirmed → show '0/N' but indicate active round
- **Khu chưa đến hạn**: Zone not scheduled for this round → show 'Chưa đến hạn'

None of these states are currently distinguished on Map V2 (NEEDS_BACKEND_DATA + NEEDS_BUSINESS_CONFIRMATION).
