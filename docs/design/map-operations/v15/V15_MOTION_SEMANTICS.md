# V15 — Operational Motion Semantics & Attention Hierarchy

## 1. What Operational Motion Means
Operator and meter movements in V15 represent **simulated operational workflow progressions**:
- They convey which meter an operator is assigned to read next.
- They visualize the sequence of meter readings along internal port corridors.
- They provide visual clarity during shift execution and dispatch reviews.

---

## 2. What Operational Motion Does NOT Mean (Crucial Anti-Patterns)
- **NOT GPS Tracking**: The system does NOT track real-time physical coordinates via satellite or cellular GPS.
- **NOT Proof of Physical Presence**: Motion along corridors reflects dispatcher schedule and workflow progress, not biometric or physical location.
- **Forbidden UI Terminology**: The UI must NEVER display phrases such as *"Vị trí trực tiếp"*, *"Tọa độ GPS"*, or *"Đang đứng tại đây"*.
- **Authoritative Terminology**: The UI exclusively uses *"Tuyến ghi công tơ"*, *"Tiến trình tác nghiệp"*, or *"Mô phỏng tuyến tác nghiệp"*.

---

## 3. Motion Density & Attention Hierarchy
To preserve the calm, utilitarian aesthetic of the Saigon Port Command Center, motion density is strictly governed:

1. **Critical Alert / Overdue**: Slow heartbeat outer halo (1.8–2.2s period, core stable).
2. **Active Reading**: Rotating activity arc around target meter and operator ring.
3. **Approaching / Moving**: Subtle marker translation along corridor; finite 2-wave pulse at target meter.
4. **Selected Entity**: Cyan focus ring and one-shot focus expansion (200ms).
5. **Normal Pending & Completed**: **100% STATIC**. No continuous pulsating, glowing, or bouncing.

```
+-------------------------------------------------------+
| HIGHEST: Critical Alert / Overdue Meter               |
| HIGH:    Active Reading Arc (1.6s linear)             |
| MEDIUM:  Approaching Wave (finite 2x) / Moving Marker |
| NORMAL:  Selected Focus Ring (1-shot)                 |
| STATIC:  Pending & Completed Meters, Idle Operators   |
+-------------------------------------------------------+
```

---

## 4. Multi-Operator Calmness
Even when all 6 operators are logically active:
- Corridor route lines are rendered **ONLY** for the currently selected operator.
- Overview scenes remain calm, uncluttered, and free of decorative visual noise.
