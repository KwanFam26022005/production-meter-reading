# 02. DOMAIN AND SPATIAL MODEL
## Cảng Tân Thuận — Spatial Operations Redesign V7

---

### 1. Current Domain Source Matrix

| Domain Entity | Primary Source of Truth | Backend Model / Field | API Endpoint | Presentation / UI Projection |
|---|---|---|---|---|
| **Meter Identity** | Database `meters` table | `Meter.id`, `Meter.meter_code`, `Meter.name`, `Meter.meter_type`, `Meter.is_active` | `GET /api/v1/map/meters`, `GET /api/v1/admin/meters` | `MapMeterItem.id`, `meterCode`, `name`, `meterType`, `isActive` |
| **Meter Zone Assignment** | Foreign key in `meters` | `Meter.zone_id` -> `OperationalZone.id` | `GET /api/v1/map/meters` (`zone_id`, `zone_code`, `zone_name`) | `MapMeterItem.zoneId`, `zoneName` |
| **Meter Coordinates** | Normalized coordinates in `meters` | `Meter.map_x` (Float), `Meter.map_y` (Float), range [0.0, 1.0] | `GET /api/v1/map/meters` | `normalizedToCanonicalScene(coord)` -> SVG pixel coordinates `(x, y)` in `[0, 1664] x [0, 932]` |
| **Operator Assignment** | Database `zone_assignments` table | `ZoneAssignment.zone_id`, `ZoneAssignment.user_id`, `is_active=True`, `effective_from` | `GET /api/v1/map/zones`, `GET /api/v1/map/operators` | `MapOperationalZone.assignedUser`, `deriveOperatorShiftSummary` |
| **Reading Round** | `reading_rounds` & `reading_batches` | `ReadingRound.id`, `ReadingRound.scheduled_at`, `ReadingRound.status`, `is_legacy` | `GET /api/v1/admin/dashboard`, `GET /api/v1/map/overview` | `selectedRoundId`, `currentRoundTime`, `round_progress` in temporal HUD |
| **Meter State** | Derived from latest `MeterReading` for target round | `MeterReading.status` ('CONFIRMED' / 'REVIEW'), target round timing state | `GET /api/v1/map/meters` (`semantic_state`, `latest_reading_value`, `latest_reading_time`) | `MapMeterItem.semanticState`: `CONFIRMED`, `DUE`, `REVIEW`, `OVERDUE`, `PENDING`, `INACTIVE` |
| **Overdue Logic** | Operational round evaluation | Target round is `PAST` and no valid reading exists | `MapMeterOut.semantic_state = "OVERDUE"` | Red accent badge & pulsing indicator |
| **Review Logic** | Quality / OCR check | `MeterReading.status == "REVIEW"` | `MapMeterOut.semantic_state = "REVIEW"` | Amber accent badge & warning icon |
| **Completion** | Calculated metric | Count of `CONFIRMED` meters / Total active meters | `MapOverviewResponse.completion_percent` | Radial circular progress & top telemetry chips |

---

### 2. Frozen Domain Invariants (Guaranteed Untouched)

The following backend logic is strictly frozen in V7:
- OCR and inference pipeline (`MeterReader`, `YOLO`, `PaddleOCR`).
- Reading approval, attendance verification, and session authentication.
- Reading-round semantics and shift schedule business rules.
- Existing audit logging system (`log_admin_action` tracking `METER_CREATED`, `METER_UPDATED`).
- Meter database schema (`map_x`, `map_y`, `zone_id` columns remain authoritative).

---

### 3. Coordinate Pipeline Contract

All spatial operations adhere to a single unified coordinate conversion pipeline:

```
Screen Pointer Event (MouseEvent / TouchEvent)
       │
       ▼ getBoundingClientRect()
SVG Canvas Screen Coordinates (px)
       │
       ▼ Screen-to-Scene transform (accounting for responsive scale & letterboxing)
Canonical Scene Coordinates: X ∈ [0, 1664], Y ∈ [0, 932]
       │
       ▼ Division by CANONICAL_SCENE_WIDTH (1664) and CANONICAL_SCENE_HEIGHT (932)
Normalized Coordinates: x ∈ [0.0, 1.0], y ∈ [0.0, 1.0] (rounded to 4 decimals)
       │
       ▼ HTTP POST/PATCH /api/v1/admin/meters
Database Record: Meter.map_x, Meter.map_y
```

Reverse projection for rendering:
```
Database: Meter.map_x, Meter.map_y
       │
       ▼
Normalized Point: { x, y }
       │
       ▼ normalizedToCanonicalScene({ x, y })
Canonical SVG Point: { x: Math.round(x * 1664), y: Math.round(y * 932) }
       │
       ▼ SVG <g transform="translate(x, y)">
Physical Scene Marker on Canonical Base Map
```
