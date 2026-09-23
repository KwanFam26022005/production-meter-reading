# 06 — Zone Operational Data Mapping

## 1. Zone Structure & Duality

Map V2 operates on a two-tier zone architecture:
1. **Presentation Zones (Physical / SVG)**: Fine-grained spatial polygons reflecting geographic port infrastructure:
   - `ZONE_QUAY`: Cầu cảng chính (Berth area)
   - `ZONE_CONTAINER`: Bãi container (Container yard)
   - `ZONE_GENERAL`: Khu hàng tổng hợp (General cargo)
   - `ZONE_ADMIN`: Khu văn phòng / điều hành cảng
   - `BLDG_KHO_1`, `BLDG_KHO_2`, `BLDG_KHO_4`: Nhà kho chuyên dụng
2. **Business Zones (Operational / Backend)**: Four core operational domains:
   - `zone-berth` ↔ `ZONE_QUAY`
   - `zone-container` ↔ `ZONE_CONTAINER`
   - `zone-warehouse` ↔ `ZONE_GENERAL`, `BLDG_KHO_1`, `BLDG_KHO_2`, `BLDG_KHO_4`
   - `zone-technical` ↔ `ZONE_ADMIN`

## 2. Operational Metrics Aggregation

The unified simulation infrastructure dynamically maps operational overview telemetry across presentation zones:
- Total meters per zone (Active vs Retired)
- Reading completion rates (Recorded / Total)
- Anomaly counts (Active alerts)
- Responsible zone assignee (Stationary personnel)
- Utility infrastructure passing through the zone (Electricity feeders, water mains)
