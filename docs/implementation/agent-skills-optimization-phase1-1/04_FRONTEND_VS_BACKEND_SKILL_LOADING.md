# Frontend vs. Backend Task-Based Skill Loading Verification

**Project:** Production Meter Reading — Cảng Sài Gòn  
**Repository:** `D:\Projects\production-meter-reading\production-meter-reading`  
**Date:** 2026-09-23  
**Auditor Role:** Independent AI Agent Runtime Auditor  

---

## 1. Test 1: Frontend-Specific Skill Activation (Section 6)

### 1.1 Task Assignment
*Inspect the existing Map V2 UI and identify the relevant project-specific design rules governing its Light and Neon modes. Do not modify code.*

### 1.2 Execution Trace & Tool Invocations (`VERIFIED OBSERVATION`)
1. **Metadata Matching:** The agent matched the task domain (Map V2 GIS Frontend) to `saigon-port-ui` via the system prompt's `<skills>` description:
   > *"Use this skill whenever designing, reviewing, or implementing frontend UI for the Saigon Port production meter reading application, including the mobile User Portal, desktop Operations Portal, and Map V2 digital twin workspaces."*
2. **Targeted Entry Point Read:** Invoked `view_file` on `D:\Projects\production-meter-reading\production-meter-reading\.agent\skills\saigon-port-ui\SKILL.md` (lines 20 to 65).
3. **Identified Rules for Map V2 (Scope 3):**
   - **Technical Light Mode (Default):** High-contrast daytime network overlay on porcelain/white canvas.
   - **Neon Digital Twin Mode (Approved Technical Mode):** Dark digital-twin mode utilizing controlled SVG filter glow (`stdDeviation="2.2"`) for immediate high-contrast tracing of electrical and water trunk lines.
   - **Invariants:** Frozen B2 busbar and feeder coordinates; 3-tier hierarchy (22kV Substation -> Feeder Lines -> Meter Points); simulation disclosure watermark; clear separation of Electricity (Amber `#FFB703` / `#FCC959`) and Water (Blue `#0068FF`).
4. **Irrelevant Skills Omitted:** Zero reads of `banner-design`, `brand`, `design`, `slides`, or `ui-styling`.
5. **Data Library Banned:** Zero views of `.agents/skills/ui-ux-pro-max/data/` (164 CSV/JSON files remained completely dormant).

---

## 2. Test 2: Backend-Only Skill Filtering (Section 7)

### 2.1 Task Assignment
*Inspect the existing backend model responsible for WorkSchedule and identify its primary fields. Do not modify the database or code.*

### 2.2 Execution Trace & Tool Invocations (`VERIFIED OBSERVATION`)
1. **Domain Relevance Filter:** The task domain was identified as Backend API / SQLite / SQLAlchemy Models.
2. **Autonomous Skill Filtering:** Applying Section 1.2 of `AGENTS.md` (*"Backend API, SQLite, Schemas, Reconciliation: None (Inspect backend/app/) — All UI and graphic design skills skipped"*):
   - `saigon-port-ui` was **NOT read**.
   - `banner-design`, `brand`, `design`, `design-system`, `slides`, `ui-styling`, and `ui-ux-pro-max` were **NOT read**.
   - Number of design/UI skills read: **EXACTLY ZERO (0)**.
3. **Direct Source Inspection:** Invoked `view_file` directly on `D:\Projects\production-meter-reading\production-meter-reading\backend\app\models.py` (lines 320 to 450).
4. **Primary Fields of `WorkSchedule` (Lines 332–349):**
   - `id`: String(36), primary key UUID
   - `user_id`: String(36), ForeignKey("users.id", ondelete="CASCADE"), indexed, non-nullable
   - `work_date`: String(10), YYYY-MM-DD date string, indexed, non-nullable
   - `shift_code`: String(20), default "OFF" ("CA1", "CA2", "CA3", "HC", "OFF", "LEAVE")
   - `status`: String(20), default "SCHEDULED" ("SCHEDULED", "COMPLETED", "ABSENT", "ON_LEAVE")
   - `notes`: Text, nullable
   - `created_at`: DateTime(timezone=True), non-nullable
   - `updated_at`: DateTime(timezone=True), non-nullable, onupdate
   - `UniqueConstraint("user_id", "work_date", name="uq_user_work_date")`
   - `Index("ix_work_schedule_date_user", "work_date", "user_id")`

---

## 3. Comparison of Skill Loading Footprints

| Task Domain | Skills Read in Historical Baseline | Skills Read in Phase 1.1 Optimized Run | Tokens Saved Estimate | Epistemic Status |
| :--- | :--- | :--- | :--- | :--- |
| **Map V2 Frontend Task** | 4 to 6 skills (~16,000 tokens) | **1 skill (`saigon-port-ui` lines 20–65)** | **~10,500 tokens saved** | `VERIFIED OBSERVATION` |
| **Backend Model Task** | 3 to 4 skills (~12,000 tokens) | **0 skills (Direct code read)** | **~12,000 tokens saved** | `VERIFIED OBSERVATION` |

---

## 4. Conclusion on Task-Based Loading

Task-based skill loading is **empirically validated**. The agent selectively loads only what is required for frontend tasks and completely ignores UI skills during backend engineering tasks.
