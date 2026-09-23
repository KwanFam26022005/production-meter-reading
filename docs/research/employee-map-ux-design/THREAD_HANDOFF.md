# Thread Handoff — UX Design & Target-State Architecture Baseline

**Target Audience:** Frontend Engineers, Full-Stack Developers & Implementation Thread Leads  
**Repository:** `D:\Projects\production-meter-reading\production-meter-reading`  
**Git Baseline:** Branch `feature/v16e-network-map-overlay-r1` @ commit `5d370474112fb978105f87e7498cdc9d339471a0`  
**Handoff Date:** 2026-09-23  

---

## 1. Context & Purpose of this Handoff

This document concludes **Thread 3 (Employee × Shift × Map V2 UX & Business Design)**. Following the read-only audit in Thread 2, this thread delivered a complete design system, information architecture, interaction model, and standalone interactive prototype for integrating Employees, Shifts, Zones, and Meter Readings on Map V2.

**Execution Integrity**: Zero production files were modified, zero migrations were executed, and all design assets are isolated within `docs/research/employee-map-ux-design/`.

---

## 2. Core Design Invariants for Implementation

| Design Decision | Approved Specification | Reference Document |
| :--- | :--- | :--- |
| **Operating Model** | **Hybrid Model (Shift-Duty with Standing Templates)**: Baseline standing zones auto-populate shifts; dispatchers override exceptions; zone-bound reading pools. | [03_ASSIGNMENT_MODELS_A_B_C.md](file:///D:/Projects/production-meter-reading/production-meter-reading/docs/research/employee-map-ux-design/03_ASSIGNMENT_MODELS_A_B_C.md) |
| **Map Marker Baseline** | **Variant B (Status Marker)**: 32×32px avatar with semantic status dot (`🟢 On-Duty`, `🟡 Shift Pending`, `🔴 Unassigned`). Suppress Variant C (progress ring) until personal quotas exist. | [05_MAP_MARKER_VARIANTS.md](file:///D:/Projects/production-meter-reading/production-meter-reading/docs/research/employee-map-ux-design/05_MAP_MARKER_VARIANTS.md) |
| **Interaction Hierarchy** | **Three-Tier Progressive Disclosure**: L1 At-a-glance (Zero sidebars) -> L2 Hover/Focus Preview (Non-interactive) -> L3 Contextual Inspector (400px Dock). | [06_HOVER_AND_INSPECTOR_SPEC.md](file:///D:/Projects/production-meter-reading/production-meter-reading/docs/research/employee-map-ux-design/06_HOVER_AND_INSPECTOR_SPEC.md) |
| **Operations Layout** | **Map-First Architecture**: 92%+ horizontal space dedicated to Map V2; responsive at 1280×800, 1440×900, 1920×1080. | [07_OPERATIONS_OVERVIEW_LAYOUT.md](file:///D:/Projects/production-meter-reading/production-meter-reading/docs/research/employee-map-ux-design/07_OPERATIONS_OVERVIEW_LAYOUT.md) |
| **Mode Separation** | **Operational Mode (Default)** vs **Technical Network Mode (Demo)**: Utility trunks hidden by default and watermarked when active. | [07_OPERATIONS_OVERVIEW_LAYOUT.md](file:///D:/Projects/production-meter-reading/production-meter-reading/docs/research/employee-map-ux-design/07_OPERATIONS_OVERVIEW_LAYOUT.md) |
| **Data Truthfulness** | Never fabricate personal progress denominators; display truthful zone-level metrics; label unassigned zones explicitly. | [01_CURRENT_STATE_DESIGN_CONSTRAINTS.md](file:///D:/Projects/production-meter-reading/production-meter-reading/docs/research/employee-map-ux-design/01_CURRENT_STATE_DESIGN_CONSTRAINTS.md) |

---

## 3. Two-Phase Implementation Roadmap

The incoming engineering team should execute the work in two distinct phases:

### Phase 1: Build Immediately (Using Verified Current-State Data)
1. Implement the **Map-First Operations Overview layout** in `operations.html`.
2. Connect Map V2 to current SQLite endpoints: fetch live zones from `/api/v1/map/zones` and active operators from `/api/v1/map/operators`.
3. Render **Variant B Status Markers** by cross-referencing attendance check-ins.
4. Render the **Level 3 Contextual Inspector** with zone-level meter reading progress.
5. Provide the mode toggle separating Operational View from Technical Network View.

### Phase 2: Target-State Enhancements (Requires Schema & Port Approval)
1. Add `shift_zone_assignments` table to SQLite to support shift-specific zone handovers (Model B/Hybrid).
2. Fix the CA3 overnight attendance bug in `attendance.py` by anchoring to shift start dates.
3. Build complete REST API and Admin UI for Employee Management.
4. Implement offline IndexedDB queueing in the mobile User Portal (`user.html`).
5. Fully retire legacy Map V1 and standardize all coordinates on Map V2.

---

## 4. Interactive Prototype Verification

The design specification is validated by an interactive standalone prototype:
- **Location**: [`docs/research/employee-map-ux-design/prototype/index.html`](file:///D:/Projects/production-meter-reading/production-meter-reading/docs/research/employee-map-ux-design/prototype/index.html)
- **Features**: Demonstrates all 8 operational scenarios, marker variants A/B/C, hover/inspector interaction, mode switching, and keyboard accessibility.

*Implementation teams can proceed with development following the exact tokens and layout specifications detailed herein.*
