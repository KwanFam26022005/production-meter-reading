# V16E-A0: Field Verification Questionnaire for Terminal Meters

**Audit Timestamp:** 2026-09-16T02:18:45Z  
**Branch:** `feature/v10-landmark-calibration-minimal-hud`  
**Git Commit HEAD:** `e959b745ebda0d436ed43588d41224ec3a3e17ed`  
**Purpose:** Actionable field inspection checklist for port electrical technicians and survey engineers.

---

## 1. General Field Verification Protocol

For every meter inspection, the field surveyor must complete:
1. **Clear Nameplate Photo:** High-resolution photograph capturing brand, model, serial number, class, voltage, and CT ratio.
2. **Context Enclosure Photo:** Wide-angle photograph showing the meter inside its electrical panel/cabinet and physical room label.
3. **Breaker / Feeder Verification:** Trace outgoing cables to confirm exactly which equipment or distribution board is fed by this meter.

---

## 2. Meter-by-Meter Field Questionnaire

### CT-001 — Công tơ Trạm A
- **Current DB State:** Zone: `pres-technical` | Coordinates: `(1148.04, 686.03)` (Outside all zones by 30.7 px) | Utility: `UNKNOWN` | Relations: 57 test relations.
- [ ] **Q1.1 (Location):** Is this meter physically mounted inside Substation A (Trạm biến áp A)? Please record the exact room name and panel identifier.
- [ ] **Q1.2 (Coordinates):** Verify if the coordinates `(1148, 686)` correspond to the door of Substation A. Should `pres-technical` be expanded south to envelop this location?
- [ ] **Q1.3 (Hardware):** What is the exact manufacturer, model, and physical serial number?
- [ ] **Q1.4 (Utility & Method):** Confirm utility type (`ELECTRICITY`) and reading method (`OCR` vs `MANUAL`).
- [ ] **Q1.5 (True Relations):** Identify the single true physical switchboard where CT-001 is mounted (`INSTALLED_AT`), and the true main distribution bus or incoming transformer line it measures (`MEASURES`). Purge the 55 phantom test relations.

### CT-002 — Công tơ Kho B
- **Current DB State:** Zone: `pres-container-west` | Coordinates: `(507.09, 465.01)` (Inside West Yard) | Utility: `UNKNOWN` | Relations: 23 test relations.
- [ ] **Q2.1 (Location):** Is CT-002 installed inside Warehouse B (Kho B) or on an external feeder kiosk in Container Yard West?
- [ ] **Q2.2 (Hardware):** Record manufacturer, model, serial number, and pulse factor.
- [ ] **Q2.3 (True Relations):** What is the exact panelboard ID hosting this meter (`INSTALLED_AT`), and does it measure warehouse lighting, reefer sockets, or general warehouse power (`MEASURES`)?

### CT-003 — Công tơ Cầu cảng 1
- **Current DB State:** Zone: `pres-berth` | Coordinates: `(337.04, 316.00)` (Inside Berth 1) | Utility: `ELECTRICITY` | Reading Method: `OCR`.
- [ ] **Q3.1 (Location):** Confirm bollard or crane cable reel pit location near Berth 1 apron.
- [ ] **Q3.2 (Hardware):** Record meter serial number from mechanical register nameplate.
- [ ] **Q3.3 (Relations):** Which quay crane or shore power connection box does CT-003 feed?

### CT-004 — Công tơ Cầu cảng 2
- **Current DB State:** Zone: `pres-berth` | Coordinates: `(694.00, 315.02)` (Inside Berth 2) | Utility: `UNKNOWN`.
- [ ] **Q4.1 (Location):** Confirm physical location along Berth 2.
- [ ] **Q4.2 (Hardware):** Record manufacturer, model, and serial number.
- [ ] **Q4.3 (Utility & Relations):** Confirm utility is `ELECTRICITY`. Identify the shore power pit or gantry feeder measured.

### CT-005 — Công tơ Kho C
- **Current DB State:** Zone: `pres-container-west` | Coordinates: `(639.04, 475.03)` | Utility: `UNKNOWN`.
- [ ] **Q5.1 (Location):** Confirm whether meter is in Warehouse C electrical room or outside feeder pillar.
- [ ] **Q5.2 (Hardware):** Record serial number and CT transformation ratio.

### CT-006 — Công tơ Kho D
- **Current DB State:** Zone: `pres-cfs-east` | Coordinates: `(1680.03, 380.04)` | Utility: `UNKNOWN`.
- [ ] **Q6.1 (Location):** Confirm installation inside CFS Warehouse East (Kho D).
- [ ] **Q6.2 (Hardware):** Record serial number and physical nameplate ratings.

### CT-007 — Công tơ Trạm B
- **Current DB State:** Zone: `pres-technical` | Coordinates: `(1068.00, 720.02)` (Outside all zones by 51.7 px) | Utility: `UNKNOWN`.
- [ ] **Q7.1 (Location & Boundary):** CT-007 is located at canonical $y = 720$. Confirm this is Substation B (Trạm biến áp B). Confirm physical distance from main port workshop.
- [ ] **Q7.2 (Hardware):** Record manufacturer, model, serial number, and primary incoming feeder code.

### CT-008 — Công tơ Cầu cảng 3 (Critical Spatial Conflict)
- **Current DB State:** Zone: `pres-berth` | Coordinates: `(1400.06, 248.02)` (Geographically inside `pres-container-center`) | Utility: `UNKNOWN`.
- [ ] **Q8.1 (True Physical Location):** Is CT-008 physically installed on the waterfront quay apron (Berth 3), or is it installed inland inside Container Yard Center?
- [ ] **Q8.2 (Target of Measurement):** If it measures Quay Crane 3, why are its coordinates at $y = 248, x = 1400$? Should its coordinates be relocated to the berth apron ($y \approx 310$), or should its assigned zone be reclassified to `pres-container-center`?
- [ ] **Q8.3 (Hardware):** Record serial number and nameplate specifications.

### CT-009 — Công tơ Khu kỹ thuật 1
- **Current DB State:** Zone: `pres-technical` | Coordinates: `(1229.05, 681.02)` (Outside all zones by 40.2 px) | Utility: `UNKNOWN`.
- [ ] **Q9.1 (Location):** Confirm physical building (Maintenance Workshop / Cơ điện / Technical Office).
- [ ] **Q9.2 (Hardware):** Record serial number and confirm reading method (`OCR` vs `MANUAL`).

### CT-010 — Công tơ Khu kỹ thuật 2 / Cổng chính (Critical Identity Conflict)
- **Current DB State:** Zone: `pres-gate` | Name: "Công tơ Khu kỹ thuật 2" | Coordinates: `(1640.01, 560.00)` (Outside all zones by 43.6 px).
- [ ] **Q10.1 (True Identity):** Is CT-010 the main security gate / weighbridge meter (Trạm cân Cổng chính), or is it an auxiliary technical services meter (Khu kỹ thuật 2)?
- [ ] **Q10.2 (Physical Location):** Does the meter sit in the Main Gate Security Booth ($x \approx 1710, y \approx 575$), or in the East Auxiliary Technical Enclosure ($x = 1640, y = 560$)?
- [ ] **Q10.3 (Zone Reassignment):** If `pres-gate` is removed in V16E, should CT-010 be reassigned to `pres-technical` or `pres-cfs-east`?

### CT-011 — Công tơ Bãi Container 1
- **Current DB State:** Zone: `pres-container-center` | Coordinates: `(1171.02, 437.02)` | Utility: `UNKNOWN`.
- [ ] **Q11.1 (Equipment Fed):** Does CT-011 supply Container Yard 1 reefer racks (Giàn lạnh) or high-mast lighting tower ML-01?
- [ ] **Q11.2 (Hardware):** Record serial number and CT ratio.

### CT-012 — Công tơ Bãi Container 2
- **Current DB State:** Zone: `pres-container-center` | Coordinates: `(1401.97, 423.96)` | Utility: `UNKNOWN`.
- [ ] **Q12.1 (Equipment Fed):** Confirm reefer distribution block or high-mast tower ML-02.
- [ ] **Q12.2 (Hardware):** Record manufacturer, model, and serial number.
