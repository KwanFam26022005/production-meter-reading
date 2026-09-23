# 08 — Operational Search & Exception Discovery

**Scope:** Quick search implementation and port-wide exception triage.

---

## 1. Quick Operational Search

- **Hotkeys:** Focus input via `Ctrl+K` or `/`.
- **Search Universe:**
  1. **Presentation & Business Zones:** Matches canonical name and code (`ZONE_QUAY`, `Cầu Cảng`, `zone-berth`).
  2. **Live Meters:** Matches `meter_code`, `name`, `location`.
  3. **Zone Assignees:** Matches `employee_code`, `full_name`.
- **Selection Action:**
  - Selecting a zone: Centers camera on zone centroid/anchor, opens Zone Operational Inspector.
  - Selecting an assignee: Centers camera on operator anchor, opens Assignee Inspector.
  - Selecting a meter with valid coordinates: Centers camera on meter coordinate, opens Meter Inspector.
  - Selecting a meter WITHOUT valid coordinates:
    - Opens docked Meter Inspector with complete administrative attributes.
    - Does NOT plot a pin on the canvas.
    - Emits a non-blocking toast: `"Công tơ [CODE] chưa xác định vị trí trên Map V2"`.

---

## 2. Exception Discovery Mode

- **Primary Trigger:** `⚠️ [N] ngoại lệ` chip on primary toolbar.
- **Filtering Semantics (`exceptionsOnly`):**
  - Evaluates `OVERDUE` (missed round slots) and `REVIEW` (OCR verification required).
  - Canvas dimming: Normal pins fade to muted opacity (`0.15`), while exception pins retain full opacity with high-contrast attention halos (`#FCC959` amber and `#B43A3A` coral).
  - Anchor badges render warning markers (`!` and `?`) indicating which zones harbor active exceptions.
