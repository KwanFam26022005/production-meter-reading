# 05. INTERACTION STATE MACHINE & CONTEXT SURFACES
## Cảng Tân Thuận — Spatial Operations Redesign V7

---

### 1. Centralized Entity Hierarchy (Section 26 & 27)

At most **one** primary contextual entity is active at any time. Selecting an entity of one hierarchy level automatically transitions and closes non-compatible surfaces:

```
                      ┌───────────────┐
                      │   IDLE MAP    │
                      └───────┬───────┘
                              │
         ┌────────────────────┼────────────────────┐
         │ Click Zone         │ Click Operator     │ Click Meter
         ▼                    ▼                    ▼
┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
│  ZONE SELECTED  │  │OPERATOR SELECTED│  │ METER SELECTED  │
│(ZoneContextPanel│  │(OperatorShift-  │  │(MeterQuickPopup │
│  + 2D framing)  │  │    Popover)     │  │   + Halo plate) │
└────────┬────────┘  └────────┬────────┘  └────────┬────────┘
         │                    │                    │
         │ "Thêm công tơ"     │                    │ "Chỉnh vị trí"
         ▼                    │                    ▼
┌───────────────────────────────────────────────────────────┐
│                     PLACEMENT MODE                        │
│ (Active Matrix Grid, Zone Boundary Validation, Candidate) │
└───────────────────────────────────────────────────────────┘
```

---

### 2. State Exclusivity Matrix

| Active Surface / Mode | Zone Drawer / Context | Operator Popover | Meter Quick Popup | Placement Grid Overlay | Analytics Drawer | Filter Popover |
|---|---|---|---|---|---|---|
| **Default Scene** | Closed | Closed | Closed | Inactive | Closed | Allowed |
| **Zone Selected** | **OPEN** | Closed | Closed | Inactive | Closed | Allowed |
| **Operator Selected**| Closed | **OPEN** | Closed | Inactive | Closed | Allowed |
| **Meter Selected** | Closed | Closed | **OPEN** | Inactive | Closed | Allowed |
| **Placement Mode** | Subdued | Closed | Closed | **ACTIVE (VISIBLE)**| Closed | Closed |
| **Analytics Mode** | Closed | Closed | Closed | Inactive | **OPEN** | Closed |

---

### 3. Escape Key & Click-Outside Hierarchy

Pressing `Escape` or clicking the empty map backdrop safely steps backwards down the hierarchy:
1. If `PlacementMode` is active: prompt to discard candidate and return to normal mode.
2. Else if `AnalyticsDrawer` is open: close analytics drawer.
3. Else if `ZoneDrawer` or `ZoneContextPanel` is open: close zone panel and restore full port view.
4. Else if `OperatorShiftPopover` is open: close operator popover.
5. Else if `MeterQuickPopup` is open: close meter popup and deselect meter.
6. Else if filters/search active: clear search/filter input.
