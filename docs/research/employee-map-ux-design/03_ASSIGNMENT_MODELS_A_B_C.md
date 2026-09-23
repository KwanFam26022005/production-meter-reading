# 03 — Operating Models Analysis: Standing vs. Shift-Based vs. Round-Based Dispatch

**Document Reference:** `docs/research/employee-map-ux-design/03_ASSIGNMENT_MODELS_A_B_C.md`  
**Author:** Senior Product Designer, UX Researcher & Operations Software Architect  
**Project:** Production Meter Reading — Cảng Sài Gòn  
**Date:** 2026-09-23  
**Status:** PROPOSED DESIGN SPECIFICATION  

---

## 1. Executive Summary

The central architectural challenge of the Saigon Port platform is establishing how an administrator manages the chain of accountability:
```text
EMPLOYEE ───> SHIFT ───> ZONE ───> READING TASK ───> RESULT
```
As verified by the audit, this chain is currently broken: zone assignments are permanent standing records (`ZoneAssignment`), shifts are managed on a separate date matrix (`WorkSchedule`), and meter readings are pulled from an unassigned global pool.

This document analyzes three viable operating models (Models A, B, and C) and proposes an operational Hybrid Model. It evaluates each across eight dimensions to provide an objective basis for port leadership decisions.

---

## 2. Operating Model Definitions

```
+----------------------------------------------------------------------------------------------------+
|                                    OPERATING MODEL ARCHITECTURES                                   |
+----------------------------------------------------------------------------------------------------+
| MODEL A: Standing Zone Responsibility                                                              |
| Employee ──[Permanent Assignment]──> Zone ──[Contains]──> Meters                                   |
| Shifts determine attendance. When on shift, worker reads all meters in their standing zone.        |
+----------------------------------------------------------------------------------------------------+
| MODEL B: Shift-Based Zone Assignment                                                               |
| (Employee + Date + Shift) ──[Dynamic Assignment]──> Zone ──[Contains]──> Meters                    |
| Every shift (CA1, CA2, CA3), dispatcher assigns workers to specific zones. Cadence = 8 hours.      |
+----------------------------------------------------------------------------------------------------+
| MODEL C: Round-Based Task Dispatch                                                                 |
| Reading Round ──[Dispatches Specific Meters]──> Employee (Regardless of Zone/Shift)                |
| Personal worklists dispatched per round. Strict meter-to-person dispatch. Cadence = 1-4 hours.     |
+----------------------------------------------------------------------------------------------------+
| PROPOSED HYBRID MODEL: Standing Baseline + Shift Override + Zone Pool                             |
| Baseline standing zones (Model A) automatically populate shifts, with dispatcher overrides (Model  |
| B), and zone-bound work pools where reading tasks inherit the active shift operator.               |
+----------------------------------------------------------------------------------------------------+
```

---

## 3. Deep-Dive Comparative Analysis Across 8 Dimensions

### Dimension 1: What an Administrator Sees
- **Model A**: Map shows static operator names per zone (e.g., "Khu Bãi: NV001"). Roster shows shifts separately. Admin must mentally cross-reference who is actually working today.
- **Model B**: Map changes dynamically per shift! Selecting `CA1` shows Morning Operators; selecting `CA2` shows Afternoon Operators. Unassigned zones light up in amber per shift.
- **Model C**: Map displays personal task routes and clusters. Admin sees: "NV001 assigned 25 meters in Wharf 1; NV002 assigned 15 meters in Substation."
- **Proposed Hybrid**: Map defaults to today's active shift crew. If an operator called in sick, their zone turns amber. Admin can click "Gán ca này" (Assign this shift) with 1 click.

### Dimension 2: What a Field Employee Sees
- **Model A**: Employee's home screen always shows their fixed zone: "Khu vực của bạn: Bãi Container".
- **Model B**: Employee's home screen shows today's assigned shift zone: "Hôm nay bạn trực Ca 2 tại Khu cảng sà lan".
- **Model C**: Mobile app displays a personalized checklist: "Nhiệm vụ đợt 08:00: 22 công tơ được giao cho bạn".
- **Proposed Hybrid**: Displays assigned shift zone + zone meter checklist with progress indicator.

### Dimension 3: Required Data Relationships (Schema Changes)
- **Model A**: Matches current `zone_assignments` table (`user_id`, `zone_id`, `effective_from`, `effective_to`). *Schema change: None.*
- **Model B**: Requires composite schedule assignment: `shift_zone_assignments (id, user_id, zone_id, work_date, shift_code, status)`. *Schema change: Medium.*
- **Model C**: Requires discrete task table: `reading_tasks (id, round_id, meter_id, assigned_user_id, status, dispatched_at)`. *Schema change: High.*
- **Proposed Hybrid**: Add `shift_zone_assignments` table, while allowing `zone_assignments` to act as default fallback template.

### Dimension 4: CRUD Actions Required
- **Model A**: Rare updates (only when an employee transfers departments or resigns). Very low administrative overhead.
- **Model B**: Daily or weekly scheduling by dispatcher (assigning workers to zones for each shift). Medium administrative overhead.
- **Model C**: High-frequency dispatching for every round (every 2-6 hours). Extremely high administrative burden unless 100% automated.
- **Proposed Hybrid**: Zero daily overhead if auto-populated from templates; dispatcher only intervenes for exceptions or substitutions.

### Dimension 5: Handover and Substitution Behavior
- **Model A**: Broken during sick leave. When Worker A is absent, Worker B covers their shift, but the system still shows Worker A as the zone owner.
- **Model B**: Elegant. When leave is approved with a substitute, the substitute automatically takes over the zone assignment for that specific shift.
- **Model C**: Dispatcher must manually reassign the unread meter tasks to another worker.
- **Proposed Hybrid**: Seamless handover: shift substitution automatically re-keys the zone assignment for that shift period.

### Dimension 6: Incomplete-Work Accountability
- **Model A**: Ambiguous. If Zone A has 5 missed meters, did Worker A miss them or did someone else?
- **Model B**: Clear shift-level accountability: "Zone A had 5 missed meters during Ca 1; the assigned operator on duty was NV002."
- **Model C**: Granular personal accountability: "Meter M-04 was assigned to NV001 and was not read by 10:00."
- **Proposed Hybrid**: Zone-level duty accountability attributed directly to the active on-duty shift operator.

### Dimension 7: Information Shown on Map V2
- **Model A**: Permanent static zone tags. Fictional shift badges.
- **Model B**: Real-time shift roster overlay: shows who is on duty *right now* based on current wall-clock shift.
- **Model C**: Dense meter-by-meter assignment markers with individual route lines.
- **Proposed Hybrid**: Clean zone progress rings + verified on-duty operator chip + unassigned shift warning indicators.

### Dimension 8: Complexity & Operational Trade-Offs
- **Model A**: Simplest to maintain, but fails to model real 24/7 port operations with rotating shifts.
- **Model B**: Best balance of enterprise operational realism and dispatcher ergonomics.
- **Model C**: Over-engineered for standard port meter reading; creates excessive micro-management friction.
- **Proposed Hybrid**: Pragmatic, backward-compatible, and future-proof.

---

## 4. Comprehensive Decision Matrix

| Evaluation Criteria | Model A (Standing) | Model B (Shift-Based) | Model C (Round Dispatch) | Proposed Hybrid |
| :--- | :---: | :---: | :---: | :---: |
| **Operational Realism (Port 24/7)** | Low | **High** | High | **High** |
| **Daily Admin Overhead** | **Very Low** | Moderate | Very High (Unacceptable) | **Low** |
| **Clarity of Accountability** | Low | **High** | Very High | **High** |
| **Map V2 Visual Cleanliness** | High | **High** | Poor (Cluttered) | **High** |
| **Mobile Worker Clarity** | Moderate | **High** | **High** | **High** |
| **Backend Implementation Effort** | None | Low (1 table) | High (New dispatch engine) | Low-Medium |
| **Risk of Labor Disputes** | High (Unfair blame) | Low | Low | Low |

---

## 5. Recommendation for Port Leadership

> [!IMPORTANT]
> **Primary Recommendation:** Adopt the **Proposed Hybrid Model (Shift-Based Duty with Standing Templates)**.
> - Workers maintain a **Primary Home Zone** (Model A).
> - When generating weekly rosters, the system automatically assigns their shifts to their home zones (Model B).
> - Dispatchers only adjust exceptions (sick leave, dock maintenance, emergency surges).
> - Field workers see clear, unambiguous zone-level worklists without micro-dispatch clutter.
