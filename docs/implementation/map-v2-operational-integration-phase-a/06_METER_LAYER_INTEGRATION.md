# 06 — Real Meter Layer Integration & Measurement Unit Truthfulness

**Scope:** Rendering authentic meter spatial pins and honoring `MEASUREMENT_UNIT_DATA_GAP`.

---

## 1. Spatial Validation Invariant (`isValidMeterCoordinate`)

- Implemented in `frontend/src/components/map-v2/MapV2MeterLayer.tsx`:
  - Strictly rejects `null`, `undefined`, `NaN`, and `Infinity`.
  - Strictly rejects `(0, 0)` and coordinate noise (`mapX === 0 && mapY === 0`).
  - Strictly rejects out-of-bounds coordinates (`> 1536x1024`).
  - Supports both normalized `[0, 1]` and canonical pixel coordinates `[0, 1536] x [0, 1024]`.
  - Meters failing validation are NEVER placed at (0,0) or canvas center.

---

## 2. MEASUREMENT_UNIT_DATA_GAP Compliance

- **Audit Finding:** The database schema has no unit or multiplier column.
- **Rule:** Never hardcode `"kWh"` or `"m³"` next to numeric reading values.
- **Implementation:**
  - Meter pin and inspection hero display raw tabular figures formatted with utility icons:
    - ⚡ Electricity: `#FFB703` (Amber) / `#FCC959`
    - 💧 Water: `#0068FF` (Digital Blue)
  - Numeric typography adheres to `fontVariantNumeric: 'tabular-nums lining-nums'`.

---

## 3. Utility Classification vs Meter Technology Separation

- **Invariant:** Utility classification (`utility_type`) must never be conflated with meter measurement technology (`meter_type`).
- **Inspector Rows:**
  - `Loại năng lượng` (Utility): `⚡ Điện lực` or `💧 Nước sạch`.
  - `Công nghệ mặt số` (Technology): `Cơ khí / LCD / Điện tử`.

---

## 4. Semantic Halo Statuses

Pins on `MapV2MeterLayer` use semantic halo rings:
- Emerald `#10B981`: `CONFIRMED`
- Amber `#FCC959`: `REVIEW` (requiring post-verification)
- Coral `#B43A3A`: `OVERDUE` (missed round)
- Blue `#0068FF`: `DUE` (ready for reading)
- Muted Slate `#94A3B8`: `PENDING`
