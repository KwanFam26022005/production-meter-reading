# 07 — People Subsystem: Real vs Demo

## 1. Distinction of Roles & Provenance

The unified simulation domain strictly segregates real administrative personnel from demo simulated personnel:

```text
┌────────────────────────────────────────────────────────┐
│                    PEOPLE SUBSYSTEM                    │
├──────────────────────────┬─────────────────────────────┤
│   REAL ZONE ASSIGNEE     │   DEMO ANIMATED EMPLOYEE    │
├──────────────────────────┼─────────────────────────────┤
│ Provenance:              │ Provenance:                 │
│ AUTHORITATIVE / DERIVED  │ SIMULATED                   │
│                          │                             │
│ Behavior:                │ Behavior:                   │
│ Stationary               │ Simulated Zone Movement     │
│ Anchored to zone center  │ Multi-waypoint animation    │
│                          │                             │
│ Positioning:             │ Positioning:                │
│ Operator Anchor (NOT GPS)│ Simulated Waypoints(NOT GPS)│
│                          │                             │
│ Purpose:                 │ Purpose:                    │
│ Authoritative duty roster│ UX visual animation demo    │
│                          │                             │
│ Layer Name:              │ Layer Name:                 │
│ Người phụ trách          │ Nhân sự di chuyển [DEMO]    │
└──────────────────────────┴─────────────────────────────┘
```

## 2. No Misleading GPS Claims

In accordance with Section 28 of Thread 8B and `saigon-port-ui`:
- No personnel coordinate is ever represented as a live GNSS/GPS fix.
- Stationary assignees are derived from `AdminStaffRoster` assignments and positioned strictly at the pre-calculated `operatorAnchorCanonical` of their assigned presentation zone.
- Demo moving employees are purely cosmetic simulations running along predefined spline paths inside container/quay yards.
- Layer toggles and inspector panels explicitly label demo personnel as `[DEMO]` to ensure full disclosure for port auditors and shift managers.
