# V16C Port Asset Taxonomy & Classification

## 1. Supported Asset Taxonomy

The taxonomy reflects industrial maritime and port terminal assets:

| Asset Type | Category | Description | Mobility Default |
| :--- | :--- | :--- | :--- |
| `SUBSTATION` | Electrical Infrastructure | High/medium voltage transformer building or kiosk | FIXED |
| `TRANSFORMER` | Electrical Infrastructure | Step-down power distribution transformer unit | FIXED |
| `FEEDER` | Electrical Infrastructure | Medium/low voltage feeder line branch | FIXED |
| `SWITCHBOARD` | Electrical Infrastructure | Main or sub-distribution board (MDB/DB) | FIXED |
| `QUAY_CRANE` | Heavy Equipment | Ship-to-shore container gantry crane | FIXED / RAIL |
| `RTG` | Heavy Equipment | Rubber-tired gantry container crane | MOBILE |
| `VEHICLE` | Port Equipment | Terminal tractor, forklift, reach stacker | MOBILE |
| `PUMP` | Mechanical Equipment | Fire pump skid, stormwater booster pump | FIXED |
| `COMPRESSOR` | Mechanical Equipment | Workshop air compressor and receiver | FIXED |
| `MACHINE` | Industrial Machinery | Workshop lathe, barrier motor, conveyor | FIXED |
| `WAREHOUSE` | Facility | Covered cargo storage warehouse structure | FIXED |
| `WORKSHOP` | Facility | Engineering, maintenance, and repair workshop | FIXED |
| `OFFICE` | Facility | Operations building, security gatehouse | FIXED |
| `WATER_POINT` | Utility Point | Fresh water bunkering hydrants or taps | FIXED |
| `FIRE_WATER_POINT` | Utility Point | Firefighting water intake or hydrant | FIXED |
| `SHORE_POWER_POINT` | Utility Point | Cold ironing vessel shore connection station | FIXED |
| `OTHER` | Miscellaneous | Miscellaneous unclassified asset | FIXED |

---

## 2. Mobility & Position Source Models

- `AssetMobilityType`: `FIXED` | `MOBILE`.
  - `FIXED`: Physically stationary facilities and equipment.
  - `MOBILE`: Heavy yard equipment that moves operationally (e.g. RTG cranes). V16C captures physical mobility nature only; live GPS tracking is deferred.
- `AssetPositionSource`: `STATIC_MAP` | `ASSIGNED` | `LAST_KNOWN` | `GPS` | `UNKNOWN`.
