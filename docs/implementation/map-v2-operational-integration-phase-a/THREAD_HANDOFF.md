# Thread Handoff — Thread 7 (Phase A) to Thread 8 (Phase B)

**Project:** Production Meter Reading — Cảng Sài Gòn  
**Subject:** Map V2 Operational Integration Handoff  
**Date:** 2026-09-23  

---

## 1. What Thread 7 Completed

1. **Context Integration:** Connected Map V2 to single authoritative `OperationalWorkspaceContext`.
2. **Backend API Integration:** Implemented live consumption of `getMapOverview(date, roundId)` and `getAdminSchedules(date)` with non-blocking degraded mode.
3. **Zone Operational State:** Built `computeZoneOperationalStatus` supporting 5 states (`NORMAL`, `REVIEW`, `OVERDUE`, `NOT_DUE`, `NO_DATA`) without false 0% or false overdue indications.
4. **Real Assignee Layer:** Created stationary assignee model at operator anchors (`isStationary: true`, zero GPS claim, explicit disclosure).
5. **Real Meter Layer:** Built `MapV2MeterLayer` with coordinate validation, halo status indicators, utility classification vs technology separation, and strict compliance with `MEASUREMENT_UNIT_DATA_GAP`.
6. **Three-Axis Toolbar Architecture:** Streamlined 14 conflicting controls into a cohesive 3-axis operational toolbar.
7. **Quick Search & Exceptions:** Added `Ctrl+K` operational search with missing coordinate detection and toast notification, plus instant exception discovery filtering.
8. **Safe Navigation & Backward Compatibility:** Protected legacy Map V1 workflows by defaulting `locateOnMap` to `'dashboard'` and introducing additive `locateOnMapV2`.
9. **Full Verification:** 428 automated frontend tests passing; 15 visual acceptance screenshots captured.

---

## 2. Recommended Scope for Thread 8 (Phase B)

1. **Database Spatial Seeding (Backend/Data Task):**
   - Seed spatial coordinates (`map_x`, `map_y`) in the SQLite database for administrative meters that currently display the `"Chưa xác định vị trí trên Map V2"` notice.
2. **Measurement Unit Column (Schema Task - BD-02):**
   - If port business confirms unit variations (kWh, kvarh, m³), add an authoritative `unit` column to `meters` table instead of relying on frontend heuristics.
3. **Business Meaning of Round Denominator (BD-05 Resolution):**
   - Resolve business definition for the round denominator with port management.
4. **Multi-Shift Handover & Multiple Zone Assignees:**
   - Extend `OperationalZoneOut` backend response to support multiple assignees per zone across shift transitions.
