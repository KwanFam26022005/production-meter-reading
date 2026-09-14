# Asset Discovery & Metering Attribute Investigation (Phase V16A)

> **IMPORTANT: RESEARCH & DOMAIN DISCOVERY ONLY**  
> The artifacts in this directory are static research documents for business domain modeling.  
> They are **NOT** imported by backend or frontend runtime code.  
> **NO `assets` database table** or foreign key modifications have been introduced in Phase V16A.

---

## 1. Purpose & Scope

In legacy phases, meters were treated as standalone spatial entities directly associated with general zones (`cau_tau`, `bai_container`, etc.). However, industrial maritime operations require distinguishing between:
1. **The Physical/Operational Asset**: The machinery, facility, or infrastructure consuming energy or resources (e.g., *RTG-01 Crane*, *Substation Transformer 2*, *Fire Pump System*).
2. **The Metering Device**: The physical sensor, register, or digital counter capturing resource consumption (e.g., *MTR-003*, *MTR-006*).

Phase V16A prepares the preliminary registry of candidate assets and metering discovery questions without altering the database schema or breaking the existing production meter-reading workflows.

---

## 2. Discovery Artifacts

| File | Purpose | Verification Status |
| :--- | :--- | :--- |
| `ASSET_CANDIDATE_REGISTRY.v0.json` | Candidate assets inferred from current meter designations and port zones. | `UNVERIFIED` (All entries) |
| `METERING_DISCOVERY.v0.json` | Detailed inspection ledger for physical attributes, utility types, and telemetry protocols. | `UNKNOWN` (All unverified fields) |

---

## 3. Strict Boundary Rules

1. **No Inferred Utility Types**:
   - Naming conventions like *"Cụm Bơm Nước Chữa Cháy"* (Fire Pump System) do **not** imply the meter is a water flow meter.
   - It may measure electrical kilowatt-hours to the high-pressure pump motor, fuel for a diesel auxiliary engine, or volumetric water flow.
   - All unverified utility fields are strictly marked `UNKNOWN`.
2. **No Fabricated Data**:
   - Any unknown telemetry, communication protocol, or physical mounting location remains `UNKNOWN` until physical on-site audit signoff.
3. **Decoupled from Runtime**:
   - Neither FastAPI nor React components may import or rely on these JSON registries during V16A.

---

## 4. Key Unresolved Mentor & Field Questions

Before advancing to Phase V16B (Asset Schema & Meter-Asset Association), the following field questions must be answered by port operational supervisors:

1. **Physical Quantity Measured**:
   - What exact physical quantity does each meter measure (Active kWh, Reactive kVARh, $m^3$ water, Liters diesel)?
2. **Physical Mounting & Installation**:
   - Where is the meter mounted (on the asset chassis, in an outdoor kiosk, on a warehouse sub-panel, or in a locked substation)?
3. **Cardinality & Relationships**:
   - Can one operational asset possess multiple meters (e.g., separate peak/off-peak meters, or power + water)?
   - Can a meter be reassigned or moved between assets over its operational lifetime?
4. **Mobility & Dynamic Localization**:
   - Which assets are fixed infrastructure (Berths, Substations, Gates) vs mobile heavy equipment (RTG cranes)?
   - Do mobile assets possess onboard GPS/RTLS telemetry, or are they stationed within fixed container yard bays during reading rounds?
5. **Reading & Telemetry Interfaces**:
   - What is the primary reading method (manual operator inspection, OCR snapshot, handheld optical probe)?
   - Do any meters feature active or dormant communication interfaces (Modbus RTU, RS-485, Pulse Output, LoRaWAN, SCADA)?

---

## 5. Next Phase Roadmap (V16B Preview)

- **Phase V16A** (Current): Stabilize spatial map authority from backend database; isolate legacy geometry; formulate asset discovery ledger.
- **Phase V16B**: Formalize `assets` table schema, Alembic migrations, admin CRUD for asset registry, and multi-meter association contracts following field verification.
