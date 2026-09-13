# V15C — Operator Workflow Route Animation Specification

## 1. Operator Workflow State Machine
Operator workflow motion is governed by a finite state machine managed centrally by `OperationalMotionController`:

```
          ┌──────────────┐
          │     IDLE     │◄───────────────────┐
          └──────┬───────┘                    │
                 │ (startMovementToMeter)     │
                 ▼                            │
          ┌──────────────┐                    │ (no more pending)
     ┌───►│    MOVING    │                    │
     │    └──────┬───────┘                    │
     │           │ (progress >= 1.0)          │
     │           ▼                            │
     │    ┌──────────────┐                    │
     │    │   ARRIVING   │                    │
     │    └──────┬───────┘                    │
     │           │ (settle >= 200ms)          │
     │           ▼                            │
     │    ┌──────────────┐                    │
     │    │   READING    │                    │
     │    └──────┬───────┘                    │
     │           │ (domain completion)        │
     │           ▼                            │
     │    ┌──────────────┐                    │
     └───-│  COMPLETED   │────────────────────┘
   (next) └──────────────┘
```

Any active state (`MOVING`, `READING`) can transition cleanly into `PAUSED` when the browser tab is hidden, when Map switches to List view, or when calibration mode is activated.

---

## 2. Motion Clock Architecture
A single global RAF timing clock (`MotionClock`) drives all map animations:
- Prevents frame timer proliferation (zero per-operator RAF loops).
- Listens to `document.visibilityState`: pauses automatically when the tab is hidden and resets timestamps on tab activation to eliminate time jumps.
- Dispatches decoupled frame ticks and state notifications so React does not trigger whole-map state updates on every 16ms animation frame.

---

## 3. Movement Duration, Speed & Easing Policy
- **Visual Speed**: Nominal speed is 120 px/sec.
- **Duration Clamping**:
  $$\text{duration} = \text{clamp}\left(\frac{\text{distance}}{120} \times 1000, 1600\text{ms}, 5000\text{ms}\right)$$
- **S-Curve Easing**: Cubic Hermite interpolation ($$f(t) = 3t^2 - 2t^3$$) provides a gentle 200ms ease-in and 250ms ease-out without overshoot or spring bounce.

---

## 4. Target Meter Coordination
- **MOVING**: Target meter receives the V15A `approaching` finite 2-wave pulse (expanding from 10px to 22px).
- **ARRIVING / READING**: Target meter displays the V15A brighter cyan core (`#00E5FF`) and rotating circular activity arc (1.6s linear).
- **COMPLETED**: Target meter triggers the 380ms emerald sweep revealing the check glyph (`#10B981`), while the operator progress ring stroke-dashoffset animates to its new percentage.

---

## 5. Operational Mode vs. Demo Mode
- **Operational Mode (Default)**: Motion strictly mirrors real domain lifecycle events. The operator remains in `READING` until the server/dispatcher confirms the reading.
- **Demo Mode (`?demo=1`)**: Uses deterministic scripted intervals (2.0s reading duration, 400ms dwell) to visualize shift workflows. The UI displays a discreet badge: `MÔ PHỎNG TÁC NGHIỆP`.
