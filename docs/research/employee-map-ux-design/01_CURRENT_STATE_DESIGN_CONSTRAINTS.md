# 01 — Current-State Design Constraints & Data Truthfulness

**Document Reference:** `docs/research/employee-map-ux-design/01_CURRENT_STATE_DESIGN_CONSTRAINTS.md`  
**Author:** Senior Product Designer, UX Researcher & Operations Software Architect  
**Project:** Production Meter Reading — Cảng Sài Gòn  
**Date:** 2026-09-23  
**Status:** PROPOSED DESIGN SPECIFICATION  

---

## 1. Executive Summary

A common failure mode in enterprise operations design is creating "dashboard fiction" — interfaces that depict seamless real-time tracking, personal accountability, and live geospatial dispatch when the underlying database engine lacks the relationships to support them.

This document synthesizes the code-verified findings from the **Thread 2 Architecture Audit** into concrete design constraints. It establishes what information can **truthfully** be displayed in the Saigon Port Operations Portal today, what must be labeled as unassigned or unavailable, and what requires new database models before it can appear in the UI.

---

## 2. Classification Taxonomy

Throughout this design suite, every data element, UI component, and interaction is strictly classified using the following four-tier taxonomy:

| Classification | Definition | Design Treatment |
| :--- | :--- | :--- |
| `VERIFIED_CURRENT_STATE` | Exists in current SQLite tables, REST APIs, or frontend components. Can be rendered immediately with live data. | Render as live operational data without caveats. |
| `BUSINESS_ASSUMPTION` | Logical operational requirement inferred from port workflow, but unverified in code. | Render with explicit fallback styling; annotate in spec. |
| `PROPOSED_DESIGN` | New UX layout, interaction pattern, or screen hierarchy created in this design phase. | Prototype visually; clearly mark as target-state. |
| `REQUIRES_PORT_CONFIRMATION` | Ambiguity that cannot be resolved without direct input from Saigon Port leadership. | Render with selectable decision toggles in prototype. |

---

## 3. Database Invariants & Their Hard UX Constraints

The database engine (`SQLite` with WAL mode and foreign keys enforced) imposes specific structural invariants documented in [`docs/research/employee-shift-map-audit/08_CURRENT_STATE_RELATIONSHIPS.md`](file:///D:/Projects/production-meter-reading/production-meter-reading/docs/research/employee-shift-map-audit/08_CURRENT_STATE_RELATIONSHIPS.md).

```
+----------------------------------------------------------------------------------------------------+
|                               DATABASE INVARIANT TO UX CONSTRAINT MAPPING                          |
+-----------------------------------+----------------------------------------------------------------+
| Database Invariant                | Hard UX Design Constraint                                      |
+-----------------------------------+----------------------------------------------------------------+
| uq_user_work_date                 | An employee can only be scheduled for ONE shift per date.      |
| (user_id, work_date)              | The UI must NOT allow assigning split or double shifts without |
|                                   | a schema migration.                                            |
+-----------------------------------+----------------------------------------------------------------+
| Fallback Shift Synthesis          | If no DB record exists, API returns CA1 (Mon-Sat) or OFF (Sun).|
| (work_schedule.py L140)           | The UI must visually distinguish PERSISTED schedules from      |
|                                   | UNCONFIRMED DEFAULTS so dispatchers are not misled.            |
+-----------------------------------+----------------------------------------------------------------+
| Continuous ZoneAssignment         | Zone assignments have effective_from/to, but NO shift or date. |
| (models.py L108-L125)             | The map must NOT claim "Worker X is on shift in Zone A" unless |
|                                   | corroborated by active attendance and roster data.             |
+-----------------------------------+----------------------------------------------------------------+
| Absence of ReadingTask table      | Meter readings belong to an unassigned global round pool.      |
| (meter_logbook.py L90)            | The UI must NOT show personal progress denominators (e.g.      |
|                                   | "12/25 meters") because individual quotas do NOT exist.        |
+-----------------------------------+----------------------------------------------------------------+
| Recorded By != Assigned To        | MeterReading.user_id records submitter provenance only.        |
| (models.py L235)                  | Unfinished work has recorded_by=None. The UI must NOT blame    |
|                                   | missing meters on whoever happens to be assigned to the zone.  |
+-----------------------------------+----------------------------------------------------------------+
| CA3 Overnight Check-Out Bug       | Check-out at 06:00 fails with HTTP 409 Conflict across midnight|
| (attendance.py L206)              | The UI must provide a clear status indicator for overnight     |
|                                   | shifts pending check-out reconciliation.                       |
+-----------------------------------+----------------------------------------------------------------+
```

---

## 4. The "Data Truthfulness" Rulebook for Operations UX

To ensure the Operations Portal maintains complete integrity and prevents operational errors:

### Rule 1: Never Fabricate a Personal Progress Denominator
- **The Violation**: Showing a badge on an employee marker stating `18/25 (72%)` when the system only knows that 18 meters were read in Zone A and the zone has 25 meters total.
- **The Truthful UX**: Show zone-level progress (`Zone A: 18/25`). Display the employee as `Assigned Operator (Standing)`. If the worker submitted 10 readings personally, display `Submitted by NV001: 10 readings` without an unverified personal denominator.

### Rule 2: Explicit "Unknown" & "Unassigned" States
- When a zone has no active assignment in `zone_assignments`, the UI must **never inject hardcoded fallback names** (such as the legacy "Nguyễn Văn Hải" mock).
- The zone must display an unambiguous amber warning badge: `Chưa phân công ca trực` (Unassigned Shift Duty).

### Rule 3: Do Not Conflate Attendance with Physical Location
- An employee who checked in at 06:02 via selfie has proven **presence at the port**, but has **not proven physical presence in Zone B**.
- The map must not place a live avatar inside a specific warehouse polygon based solely on attendance check-in. Markers must be anchored to the **Zone Operations Anchor Point** with an explicit label: `Phân công khu vực` (Assigned Zone), not `Vị trí GPS thời gian thực` (Real-Time GPS Location).

### Rule 4: Explicit Presentation of Map V2 Simulation Layers
- The electrical feeder lines (22kV trunk, substations) and water piping rendered in Map V2 are **simulated demo topologies** (`data_origin="SIMULATED"`).
- The Operations Portal must provide a persistent mode switch:
  - **Chế độ Tác nghiệp (Operational Mode)**: Focuses strictly on verified zones, meters, assignments, and reading status.
  - **Chế độ Mạng lưới Kỹ thuật (Technical Network Mode)**: Displays utility trunks and distribution lines, with a permanent disclosure banner: `Mô phỏng mạng lưới kỹ thuật (Demo)`.

---

## 5. Viewport & Environmental Target Constraints

The desktop Operations Portal is used by dispatchers and managers under specific ergonomic constraints:

| Viewport Resolution | Target Devices | Design Accommodation |
| :--- | :--- | :--- |
| **1280 × 800 (WXGA)** | Standard port ruggedized laptops, field toughbooks | Maximize canvas area; auto-collapse inspector into overlay drawer; avoid fixed sidebars > 280px. |
| **1440 × 900 (WXGA+)** | Standard operations desk monitors | Optimal baseline; right-side inspector dock (360px) + full map viewbox. |
| **1920 × 1080 (FHD)** | Central dispatch video wall / supervisor multi-monitors | Expanded contextual inspector (440px) with split telemetry and detailed reading exception lists. |

- **Lighting**: Office desk lighting to ambient control room lighting. Default to high-contrast **Technical Light** mode (`#FCFCFC` porcelain canvas, `#003875` deep maritime navy text/accents).
- **Control Input**: Full support for standard mouse click/drag, trackpad pinch-zoom, and 100% keyboard navigation (Tab, Arrow keys, Enter, Esc).
