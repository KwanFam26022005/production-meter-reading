# Map V2 Final Architecture Reconciliation — 04. Active Map Configuration & Mapping Architecture

**Thread:** 6 — Map V2 Final Architecture Reconciliation  
**Source Code Pointers:**  
- [`frontend/src/features/map-operations/providers/MapConfigurationProvider.tsx`](file:///D:/Projects/production-meter-reading/production-meter-reading/frontend/src/features/map-operations/providers/MapConfigurationProvider.tsx#L1-L160)  
- [`frontend/src/features/map-operations/types/activeMapConfiguration.ts`](file:///D:/Projects/production-meter-reading/production-meter-reading/frontend/src/features/map-operations/types/activeMapConfiguration.ts#L1-L60)  
- [`backend/app/map_config.py`](file:///D:/Projects/production-meter-reading/production-meter-reading/backend/app/map_config.py#L84-L123)  
- [`backend/app/models.py`](file:///D:/Projects/production-meter-reading/production-meter-reading/backend/app/models.py#L122-L171)  

---

## 1. The Presentation-to-Business Mapping Architecture

A central question raised in Thread 5 was whether a mapping architecture exists between Presentation Zones (the polygons shown on the map canvas) and Business/Operational Zones (the database entities holding meters, readings, and staff assignments).

The architecture **does exist and is already operational** in the codebase:

```text
┌────────────────────────────────────────────────────────┐
│              Presentation Zone (Canvas)                │
│    e.g. pres-berth / ZONE_QUAY                         │
└──────────────────────────┬─────────────────────────────┘
                           │ (zone_id / presentation_id)
                           ▼
┌────────────────────────────────────────────────────────┐
│            MapVersionZone (Database Model)             │
│  - id: UUID                                            │
│  - zone_id: "pres-berth"                               │
│  - business_zone_id: "zone-berth"                      │
│  - polygon_canonical: JSON                             │
│  - label_anchor_canonical: JSON                         │
│  - operator_anchor_canonical: JSON                     │
└──────────────────────────┬─────────────────────────────┘
                           │ (business_zone_id)
                           ▼
┌────────────────────────────────────────────────────────┐
│           OperationalZone (Domain Model)               │
│  - id: "zone-berth"                                    │
│  - code: "ZONE-BERTH"                                  │
│  - name: "Khu vực Cầu cảng (Berths 1 - 3)"             │
│  - meters: [Meter, Meter, ...]                         │
│  - assignments: [ZoneAssignment]                       │
└────────────────────────────────────────────────────────┘
```

---

## 2. Field-Level Contract Verification

In [`frontend/src/features/map-operations/types/activeMapConfiguration.ts`](file:///D:/Projects/production-meter-reading/production-meter-reading/frontend/src/features/map-operations/types/activeMapConfiguration.ts#L1-L60) and [`backend/app/schemas.py#L1130`](file:///D:/Projects/production-meter-reading/production-meter-reading/backend/app/schemas.py#L1130):

| Required Field | Exists in Backend? | Exists in Frontend? | Exact Property Name |
| :--- | :---: | :---: | :--- |
| `presentationId` | ✅ YES | ✅ YES | `MapVersionZoneOut.presentation_id` / `ActiveMapZone.presentationId` |
| `businessZoneId` | ✅ YES | ✅ YES | `MapVersionZoneOut.business_zone_id` / `ActiveMapZone.businessZoneId` |
| `polygonCanonical` | ✅ YES | ✅ YES | `MapVersionZoneOut.polygon_canonical` / `ActiveMapZone.polygonCanonical` |
| `labelAnchorCanonical` | ✅ YES | ✅ YES | `MapVersionZoneOut.label_anchor_canonical` / `ActiveMapZone.labelAnchorCanonical` |
| `operatorAnchorCanonical` | ✅ YES | ✅ YES | `MapVersionZoneOut.operator_anchor_canonical` / `ActiveMapZone.operatorAnchorCanonical` |
| `authoritative` | ✅ YES | ✅ YES | `ActiveMapConfigurationResponse.authoritative` (`True`) |
| `source` | ✅ YES | ✅ YES | `ActiveMapConfigurationResponse.source` (`"db"`) |

---

## 3. Critical Separation: Architecture vs. Database Records

In strict adherence to Section 9 of the mandate, we distinguish between:

### A. MAPPING ARCHITECTURE EXISTS — `ALREADY_AVAILABLE`
1. The database table `map_version_zones` has column `business_zone_id` ([`models.py#L154`](file:///D:/Projects/production-meter-reading/production-meter-reading/backend/app/models.py#L154)).
2. The endpoint `GET /api/v1/map-config/active` serializes `presentationId` and `businessZoneId` ([`map_config.py#L36-L53`](file:///D:/Projects/production-meter-reading/production-meter-reading/backend/app/map_config.py#L36)).
3. The frontend context [`MapConfigurationProvider.tsx#L69-L85`](file:///D:/Projects/production-meter-reading/production-meter-reading/frontend/src/features/map-operations/providers/MapConfigurationProvider.tsx#L69) normalizes these fields into memory.
4. The helper [`resolveToBusinessZoneId()`](file:///D:/Projects/production-meter-reading/production-meter-reading/frontend/src/features/map-operations/geometry/operationalGeometry.ts#L30) cleanly bridges presentation IDs to operational IDs.

### B. ACTUAL DATABASE MAPPING RECORDS — `MAPPING_RECORDS_UNVERIFIED` / `BUSINESS_RULE_REQUIRED`
1. The current SQLite database was seeded ([`db.py#L650-L704`](file:///D:/Projects/production-meter-reading/production-meter-reading/backend/app/db.py#L650)) with the **V16A-R2 / V10 baseline map version** (`canonicalWidth: 1915, canonicalHeight: 821`), containing presentation zones:
   - `pres-berth` ➔ `zone-berth`
   - `pres-container-west` ➔ `zone-container`
   - `pres-container-center` ➔ `zone-container`
   - `pres-cfs-east` ➔ `zone-warehouse`
   - `pres-technical` ➔ `zone-technical`
2. **Map V2's local 7 presentation zones** ([`tan_thuan_1_zones_edited.json`](file:///D:/Projects/production-meter-reading/production-meter-reading/frontend/src/components/map-v2/data/tan_thuan_1_zones_edited.json#L31-L36)):
   - `ZONE_QUAY` ("Khu cảng sà lan")
   - `ZONE_GENERAL` ("Bãi tổng hợp")
   - `ZONE_CONTAINER` ("Bãi container")
   - `BLDG_KHO_1` ("Kho 1")
   - `BLDG_KHO_2` ("Kho 2")
   - `BLDG_KHO_4` ("Kho 4")
   - `ZONE_ADMIN` ("Văn phòng hành chính")
   do **NOT** yet have corresponding records inserted in `map_version_zones`.
3. Therefore, while the mapping mechanism is 100% ready, **the Port business authority must confirm the exact mapping matrix** (e.g. `ZONE_QUAY` ➔ `zone-berth`, `ZONE_GENERAL` ➔ `zone-warehouse` or new zone) before records can be published.

### Classification Conclusion
- Architecture: **`ALREADY_AVAILABLE`**
- Data Schema: **`MAPPING_SCHEMA_AVAILABLE`**
- Specific V2 Records: **`MAPPING_RECORDS_UNVERIFIED` (Requires Business Confirmation BD-03)**
