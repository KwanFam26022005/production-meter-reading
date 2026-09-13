# V16 Spatial Route Integrity & Operational Motion Suppression

## 1. Context & Motivation

The V15 operational motion language introduced dynamic operator route animations traversing zone corridors from operator responsibility anchors to meter access nodes. These paths depend strictly upon:
- Meter canonical locations `(map_x, map_y)`
- Presentation zone boundaries
- Pre-computed topological corridor graphs

When spatial administration operations occur (relocating a meter, changing a zone boundary, or reassigning a meter to a new zone), the underlying route assumptions may be invalidated. If an operator were to blindly animate along a stale route, they would walk through buildings or end up at the wrong coordinate.

---

## 2. Route Review State Machine

```
[ Meter Relocated / Zone Geometry Mutated ]
                     │
                     ▼
       Set route_status = 'REVIEW_REQUIRED'
                     │
         ┌───────────┴───────────┐
         ▼                       ▼
[ Operational Motion Engine ]   [ Map UI Indicators ]
         │                               │
         ▼                               ▼
Suppresses operator movement      Displays Amber Warning Badge
Holds operator at anchor          "Cần rà soát lộ trình"
Zero phantom animations           Alerts manager to audit path
```

---

## 3. Operational Motion Suppression Hook

In `frontend/src/features/map-operations/motion/useOperationalMotion.ts`:

```typescript
const startOperatorMovement = (operatorId: string, meterId: string): boolean => {
  // Phase F: Operational Route Integrity Hook
  // If meter has route_status === 'REVIEW_REQUIRED', safely suppress route animation and hold operator
  const targetMeter = _meters.find((m) => m.id === meterId || m.meterCode === meterId);
  if (targetMeter && targetMeter.routeStatus === 'REVIEW_REQUIRED') {
    return false; // Safely suppressed
  }
  return controller.startMovementToMeter(operatorId, meterId);
};
```

### Safety Guarantees:
1. **No Phantom Movement**: Operators do not move toward unverified locations.
2. **Anchor Stability**: When movement is suppressed, the operator marker remains parked at their assigned responsibility anchor.
3. **Data Integrity**: Domain data (meter readings, assignments) continues to function normally; only dynamic route motion is paused pending verification.
