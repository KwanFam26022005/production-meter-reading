# Port Asset & Meter Field Verification Checklist (Phase V16C)

> **PURPOSE**: Operational inspection and verification protocol for port engineering teams.  
> **RULE**: All answers must be physically inspected on-site by qualified port electrical / mechanical supervisors.  
> **STATUS**: UNVERIFIED (Awaiting field sign-off). Do NOT fabricate data.

---

## 1. Verification Protocol Instructions

For each asset and associated meter, inspectors must verify the eleven core dimensions below:
1. **Asset Code & Name**: Verify physical nameplate tag on the equipment.
2. **Taxonomy & Nature**: Fixed infrastructure vs mobile equipment.
3. **Physical Installation Point (`INSTALLED_AT`)**: Exact enclosure, pedestal, kiosk, or chassis location.
4. **Physical Load Measured (`MEASURES`)**: Physical circuit or machinery consuming the metered utility.
5. **Utility Medium**: Electricity (Active kWh, Reactive kVARh), Water ($m^3$), Diesel / Fuel (Liters), Compressed Air.
6. **Telemetry & Reading Interface**: Optical dial, digital LCD, pulse output, RS-485 Modbus RTU, LoRaWAN, SCADA PLC.
7. **Upstream Supply Source**: Substation, feeder, or parent switchboard supplying this asset.
8. **Downstream Consumers**: Connected loads or sub-panels fed by this asset.
9. **Physical Safety & Access Requirements**: High-voltage safety clearance, locked substation key, crane operator ladder access.
10. **Inspector Name & Date**: Sign-off credential.

---

## 2. Field Audit Ledger (12 Candidate Units)

| ID | Candidate Asset Code | Associated Meter | Proposed Load | Field Verification Questions & Audit Status | Sign-off (Name / Date) |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **01** | `AST-CAND-001` | `MTR-001` | Berth 1 North Station | - Measures: Electricity, water, or vessel shore power?<br>- Installed at: Berth pedestal or terminal building?<br>- Telemetry: Mechanical dial face or pulse?<br>- **Status: PENDING AUDIT** | `___________________` |
| **02** | `AST-CAND-002` | `MTR-002` | Berth 2 Auxiliary Wharf | - Measures: Perimeter lighting or barge shore connection?<br>- Installed at: Wharf edge box or distribution post?<br>- **Status: PENDING AUDIT** | `___________________` |
| **03** | `AST-CAND-003` | `MTR-003` | Gantry Crane RTG-01 | - Fixed or Mobile: Mobile RTG machinery.<br>- Installed at: Mounted on crane chassis or yard pit plug?<br>- Measures: Main drive electrical kWh or diesel auxiliary?<br>- Does asset relocate across container yard bays?<br>- **Status: PENDING AUDIT** | `___________________` |
| **04** | `AST-CAND-004` | `MTR-004` | Gantry Crane RTG-02 | - Fixed or Mobile: Mobile RTG machinery.<br>- Installed at: Crane frame or yard supply kiosk?<br>- Telemetry: Electronic LCD face direct view?<br>- **Status: PENDING AUDIT** | `___________________` |
| **05** | `AST-CAND-005` | `MTR-005` | Warehouse 1 Main Board | - Asset type: Main Low-Voltage Switchboard (MDB).<br>- Installed at: Warehouse 1 electrical room.<br>- Downstream loads: Lighting, cold room, conveyors?<br>- **Status: PENDING AUDIT** | `___________________` |
| **06** | `AST-CAND-006` | `MTR-006` | Fire Pump System | - CRITICAL: Does meter measure pump motor electrical kWh or water flow m3?<br>- Installed at: Pump station interior wall or motor terminal box?<br>- Consumption: Continuous or emergency drill testing?<br>- **Status: PENDING AUDIT** | `___________________` |
| **07** | `AST-CAND-007` | `MTR-007` | Main Gate Barrier 1 | - Measures: Barrier boom drive motor, lighting, or weighbridge?<br>- Installed at: Booth pedestal or central gate cabinet?<br>- **Status: PENDING AUDIT** | `___________________` |
| **08** | `AST-CAND-008` | `MTR-008` | Gate Operations Office | - Asset type: Permanent building vs modular kiosk.<br>- Measures: Office lighting and HVAC consumption.<br>- **Status: PENDING AUDIT** | `___________________` |
| **09** | `AST-CAND-009` | `MTR-009` | Substation 1 MV Feeder | - Measures: 22kV Medium Voltage feeder branch.<br>- Installed at: Substation 1 MV switchgear cubicle.<br>- High-voltage safety clearance required for inspection?<br>- **Status: PENDING AUDIT** | `___________________` |
| **10** | `AST-CAND-010` | `MTR-010` | Substation 2 Transformer 2 | - Measures: Transformer secondary 0.4kV busbar.<br>- What transformation CT/PT ratio is applied?<br>- Downstream circuits supplied by Transformer 2?<br>- **Status: PENDING AUDIT** | `___________________` |
| **11** | `AST-CAND-011` | `MTR-011` | Workshop Machining Panel | - Asset type: Machinery power feeder panel.<br>- Connected loads: Heavy industrial lathes, milling machines.<br>- **Status: PENDING AUDIT** | `___________________` |
| **12** | `AST-CAND-012` | `MTR-012` | Workshop Compressed Air | - Measures: Compressor motor electric power or air volume/pressure?<br>- Installed at: Compressor room skid frame.<br>- Shared with maintenance berth repair tools?<br>- **Status: PENDING AUDIT** | `___________________` |

---

## 3. Review Sign-Off Section

- **Port Electrical Supervisor**: `_________________________________`
- **Port Operations Lead**: `_____________________________________`
- **Field Inspection Date**: `____ / ____ / 2026`
- **Verification Authority Verdict**: `[ ] APPROVED FOR RUNTIME INGESTION` / `[ ] CORRECTIONS REQUIRED`
