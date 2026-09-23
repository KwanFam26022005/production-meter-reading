# 05 — Employee Map Marker Variants & Comparative Evaluation

**Document Reference:** `docs/research/employee-map-ux-design/05_MAP_MARKER_VARIANTS.md`  
**Author:** Senior Product Designer, UX Researcher & Operations Software Architect  
**Project:** Production Meter Reading — Cảng Sài Gòn  
**Date:** 2026-09-23  
**Status:** PROPOSED DESIGN SPECIFICATION  

---

## 1. Executive Summary

This document specifies and evaluates three distinct design variants for representing field personnel on Map V2. It adheres strictly to the **Data Truthfulness Principle**: a marker must never imply real-time GPS tracking when only static zone assignment is known, and must never display a fabricated individual progress fraction.

---

## 2. Specification of the Three Marker Variants

```
+----------------------------------------------------------------------------------------------------+
|                                    MARKER VARIANT SPECIFICATIONS                                   |
+------------------------------------+-----------------------------------+---------------------------+
| VARIANT A: Minimal Marker          | VARIANT B: Status Marker          | VARIANT C: Contextual     |
| (Icon Only)                        | (Icon + Verified Duty Dot)        | Progress Marker           |
+------------------------------------+-----------------------------------+---------------------------+
|               [ 32px ]             |              [ 32px ]             |          [ 40px ]         |
|               +------+             |              +------+             |          .-------.        |
|               |  👤  |             |              |  👤  | 🟢          |         /  +---+  \       |
|               +------+             |              +------+             |        |   | 👤|   | (78%) |
|                                    |               (Duty Dot)          |         \  +---+  /       |
|                                    |                                   |          '-------'        |
|                                    |                                   |       (Progress Ring)     |
+------------------------------------+-----------------------------------+---------------------------+
| - Dimension: 32 x 32px             | - Dimension: 32 x 32px + 8px dot  | - Dimension: 40 x 40px    |
| - Base: Maritime Navy (#003875)    | - Status Dot Colors:              | - Micro Progress Ring:    |
| - Icon: 1.75px User outline        |   * Green (#16A34A): On-Duty & In |   * Teal (#0284C7): %     |
| - Role: Spatial anchor only        |   * Amber (#D97706): Unverified   |   * Slate (#94A3B8): Track|
| - Zero status claims               |   * Red (#DC2626): Absent/Uncovrd | * STRICT REQUIREMENT: Only|
|                                    | - Verified via attendance join    |   when denominator exists!|
+------------------------------------+-----------------------------------+---------------------------+
```

### Variant A — Minimal Marker
- **Visual Structure**: 32×32px circle, porcelain white border (2px), maritime navy background (`#003875`), centered 18px user silhouette SVG.
- **Semantic Meaning**: "This zone has an assigned operator."
- **Data Dependency**: Requires only `zone_assignments.user_id`.
- **Limitation**: Conveys zero operational health (does not show if the person is present, absent, or working).

### Variant B — Status Marker (Recommended Operational Baseline)
- **Visual Structure**: 32×32px avatar circle identical to Variant A, augmented by an 8px semantic status indicator at the top-right corner.
  - **Verified On-Duty (Green `#16A34A`)**: Employee has an active schedule for the current shift AND has verified check-in via `attendance_events`.
  - **Duty Pending / Unverified (Amber `#D97706`)**: Scheduled for this shift, but no check-in event logged yet.
  - **Unstaffed / Absent (Red `#DC2626`)**: Shift scheduled but marked absent, or no assignment exists for this zone.
- **Semantic Meaning**: "This is the assigned operator, and their current shift/attendance status is verified."
- **Data Dependency**: Joins `zone_assignments` + `work_schedules` + `attendance_events`.

### Variant C — Contextual Progress Marker
- **Visual Structure**: 40×40px composite avatar encircled by a high-precision SVG micro progress ring (stroke 2.5px), indicating completion percentage.
- **Semantic Meaning**: "This operator has completed X% of their personal task quota."
- **Strict Data Truthfulness Constraint**:
  > [!CAUTION]
  > Under the current SQLite schema, **Variant C MUST NOT be rendered with an individual denominator** because personal task dispatch does not exist. If Variant C is displayed today, it must either indicate the **entire Zone's progress** (`Zone A: 18/25`), or fall back gracefully to Variant B. Fabricating a personal percentage is strictly prohibited.

---

## 3. Comparative Evaluation Across 8 Criteria

| Evaluation Criterion | Variant A (Minimal) | Variant B (Status) [RECOMMENDED] | Variant C (Progress) |
| :--- | :---: | :---: | :---: |
| **1. Map Clutter** | **Lowest** (Cleanest) | Low (Very compact) | Moderate (Visual noise) |
| **2. Scanability** | Low (All look identical) | **Highest** (Color alerts stand out) | High (Busy rings) |
| **3. Readability at Zoom** | High (Simple silhouette) | **High** (Status dot visible at 0.7x) | Moderate (Ring blurs at 0.6x) |
| **4. Semantic Accuracy** | Low (Omits status) | **Highest** (Truthful presence) | Low today (No personal quota) |
| **5. Click-Target Overlap** | **Best** (32px easy click) | **Best** (32px hitbox) | Good (40px hitbox) |
| **6. Zoom Scaling Behavior** | Scales cleanly | Scales cleanly | Requires SVG viewBox scale |
| **7. Keyboard Accessibility**| Standard focus ring | Standard focus ring + ARIA status | Complex ARIA live progress |
| **8. Information Density** | Minimal (Too sparse) | **Optimal** (Status without clutter)| Overloaded for map canvas |

---

## 4. Final Recommendation & Hybrid Progression

1. **Default Production Baseline**: Deploy **Variant B (Status Marker)** as the standard operational map marker. It provides immediate situational awareness (who is working, who hasn't checked in) without introducing false progress metrics.
2. **Contextual Expansion**: When the user hovers or clicks Variant B, the **Contextual Inspector (Level 3)** opens, displaying the full zone progress ring and meter details in the side panel where complex telemetry belongs.
3. **Future Target State (Post-Model C Migration)**: If Saigon Port management officially approves Model C (Individual Task Dispatch), Variant C can be activated selectively for field supervisors.
