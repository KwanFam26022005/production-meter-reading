# V16E-A0: Current Data Contradictions & Anomalies Audit

**Audit Timestamp:** 2026-09-16T02:18:45Z  
**Branch:** `feature/v10-landmark-calibration-minimal-hud`  
**Git Commit HEAD:** `e959b745ebda0d436ed43588d41224ec3a3e17ed`  
**Scope:** Identifying all spatial, relational, semantic, and topological contradictions in the production database.

---

## 1. Spatial Contradictions (Meter vs Presentation Geometry)

An automated point-in-polygon raycasting audit against the canonical coordinate space reveals that **5 of the 12 active meters (41.7%)** suffer from direct spatial contradictions between their database-assigned presentation zone and their physical coordinates.

### 1.1 Spatial Contradiction Matrix

| Meter Code | Meter Name | Assigned Zone | Physically Contained In | Distance to Nearest Zone Boundary | Contradiction Category | Operational Impact |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **CT-001** | Công tơ Trạm A | `pres-technical` | **NONE** | 30.67 px (south of `pres-technical`) | `NO_CONTAINING_ZONE` | Stranded in unassigned space on map |
| **CT-007** | Công tơ Trạm B | `pres-technical` | **NONE** | 51.65 px (south of `pres-technical`) | `NO_CONTAINING_ZONE` | Stranded in unassigned space on map |
| **CT-008** | Công tơ Cầu cảng 3 | `pres-berth` | **`pres-container-center`** | 0.00 px (inside center yard) | `OUTSIDE_ASSIGNED_ZONE` | Filter by Berth hides meter; filter by Yard displays it |
| **CT-009** | Công tơ Khu kỹ thuật 1 | `pres-technical` | **NONE** | 40.23 px (south of `pres-technical`) | `NO_CONTAINING_ZONE` | Stranded in unassigned space on map |
| **CT-010** | Công tơ Khu kỹ thuật 2 | `pres-gate` | **NONE** | 43.58 px (to `pres-technical`), 40.0 px (to `pres-gate`) | `NO_CONTAINING_ZONE` | Mismatch between name, zone, and location |

### 1.2 Detailed Analysis of Spatial Contradictions

#### A. The Southern Technical Substation Cluster (`CT-001`, `CT-007`, `CT-009`)
- **Root Cause:** The canonical boundary for `pres-technical` was drawn with a southern cutoff at $y = 650$. However, the physical substations Trạm A, Trạm B, and Trạm Kỹ thuật 1 sit along the southern perimeter road between $y = 681$ and $y = 720$.
- **Result:** These three meters are mathematically orphaned outside all contracted presentation zones despite operating as primary power distribution nodes.

#### B. The Berth 3 vs Center Yard Conflict (`CT-008`)
- **Root Cause:** `CT-008` is named "Công tơ Cầu cảng 3" and assigned to `pres-berth`, but its recorded coordinate `(1400.06, 248.02)` places it firmly inside the bounding polygon of `pres-container-center` ($[1024, 230, 1638, 500]$).
- **Result:** When an operator filters the map by "Cầu cảng", `CT-008` is hidden because spatial filtering groups it by presentation zone geometry.

#### C. The Gate Zone Misnomer (`CT-010`)
- **Root Cause:** `CT-010` is named "Công tơ Khu kỹ thuật 2" (referencing Technical Zone), yet its `presentation_zone_id` is set to `pres-gate`. Furthermore, its coordinates `(1640.01, 560.00)` are outside the tiny `pres-gate` polygon ($x \in [1680, 1743]$) and actually sit 43.58 px closer to the technical area.

---

## 2. Semantic & Attribute Contradictions

A deep inspection of table column attributes reveals significant semantic degradation where operational metadata is missing or contradictory.

### 2.1 Utility Type & Reading Method Vacuum

| Attribute | State in DB | Count | Contradiction Detail |
| :--- | :--- | :--- | :--- |
| **`meters.utility_type`** | `UNKNOWN` | **11 of 12 meters** | Only `CT-003` is marked `ELECTRICITY`. The remaining 11 meters measure transformers, switchboards, or pumps, but have `utility_type = UNKNOWN`. |
| **`meters.reading_method`** | `UNKNOWN` | **11 of 12 meters** | Only `CT-003` is marked `OCR`. The other 11 meters have active monthly OCR readings confirmed in production, yet their configuration says `UNKNOWN`. |
| **`meters.serial_number`** | Missing | **12 of 12 meters** | Zero meters have a hardware serial number recorded. All meters use solely logical codes (`CT-001` to `CT-012`). |

### 2.2 Relational Multiplication Anomaly (Test Data Contamination)

In a physical port infrastructure, a physical meter is physically installed in **one** enclosure or panelboard (`INSTALLED_AT`), and measures **one or a few** designated circuits or equipment loads (`MEASURES`).

In the current database:
- **`CT-001` (Công tơ Trạm A):** Has **57 active relations** (42 `INSTALLED_AT`, 15 `MEASURES`). A single meter cannot be physically bolted onto 42 different switchboards simultaneously across the terminal.
- **`CT-002` (Công tơ Kho B):** Has **23 active relations** (22 `INSTALLED_AT`, 1 `MEASURES`).
- **`CT-003` through `CT-012`:** Have **0 `INSTALLED_AT`** relations and exactly 1 candidate `MEASURES` relation each.

**Conclusion:** Automated discovery/test seeding scripts in earlier development sprints attached bulk candidate assets to `CT-001` and `CT-002`, leaving the relational layer contaminated with artificial edges.

---

## 3. Utility Network Topology Contradictions

An analysis of the directed graph formed by `asset_connections` for `utility_type = 'ELECTRICITY'` reveals a severe physical impossibility:

### 3.1 Directed Graph Cycle Detection
- **Detected Cycles:** **14 directed feedback loops** in the electrical distribution network.
- **Representative Cycle:**
  $$\text{AST-TOPO-SUB-4d8a} \xrightarrow{\text{SUPPLIES}} \text{AST-TOPO-SW-ac46} \xrightarrow{\text{SUPPLIES}} \text{AST-TOPO-CR-895f} \xrightarrow{\text{SUPPLIES}} \text{AST-TOPO-SUB-4d8a}$$
- **Physical Contradiction:** Substation $\rightarrow$ Switchboard $\rightarrow$ Gantry Crane $\rightarrow$ Substation. In reality, gantry cranes consume electricity; they do not supply power back into primary distribution substations.
- **Root Cause:** Symmetrical or circular supply relations were ingested during candidate graph generation without acyclic topology validation.
