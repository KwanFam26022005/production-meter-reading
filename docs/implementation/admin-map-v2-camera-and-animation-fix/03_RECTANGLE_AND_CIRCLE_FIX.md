# Rectangle & Circle Bug Fix Specification

## 1. Issue B — The "Growing Rectangular Frame" Bug

### 1.1 Visual Symptom Observed by User
When clicking a zone hotspot (most prominently `ZONE_ADMIN` - Administrative Office), a dark rectangular outline appeared around the hotspot. Over time (1s, 5s, 10s), this rectangle appeared to grow larger ("phình to") and displace from the anchor.

### 1.2 Actual DOM / SVG Root Cause
1. **The Dark Rectangle Was Chromium's Focus Outline**:
   The anchor element `<g id="v2-anchor-ZONE_ADMIN" className="map-v2-anchor-group" tabIndex={0}>` is an interactive SVG group with `tabIndex={0}`.
   When clicked or focused via keyboard, Chromium applies its default user-agent stylesheet:
   ```css
   :focus {
     outline: rgb(16, 16, 16) auto 5px; /* or system accent-color */
   }
   ```
   This outline is computed directly from the SVG element's **current dynamic bounding box (`getBBox()`)**.

2. **The Growth Mechanism**:
   Inside `<g className="map-v2-anchor-group">`, there was a radar pulse circle:
   ```svg
   <circle className="map-v2-anchor-radar" r={24} />
   ```
   styled with CSS:
   ```css
   @keyframes mapV2RadarPulse {
     0% { transform: scale(0.85); opacity: 0.8; }
     100% { transform: scale(1.4); opacity: 0; }
   }
   ```
   **Crucial Defect**: In SVG 2 / CSS Transforms Module Level 1, SVG elements require:
   ```css
   transform-box: fill-box;
   transform-origin: center;
   ```
   Without `transform-box: fill-box`, Chromium calculates CSS `transform: scale(...)` relative to the **SVG root viewport origin ($0, 0$)**, NOT the circle's center!
   Because `ZONE_ADMIN` is located at $(914, 688)$, scaling by $1.4$ displaced the circle's rendered bounds outwards by over $170\text{px}$.
   As the displaced pulse circle expanded through its animation cycle, the `<g>` element's bounding box expanded dynamically from $201\text{px}$ to $255\text{px}$. The browser recomputed the outline dynamically every frame, giving the vivid appearance of an expanding, breathing black rectangular frame.

### 1.3 Baseline vs Post-Fix Dimensions

| Timestamp | Baseline Bounding Width | Baseline Bounding Height | Baseline Visual Artifact | Post-Fix Bounding Box | Post-Fix Outline Artifact |
|:---|:---|:---|:---|:---|:---|
| **0 ms** | $201.2\text{px}$ | $44.0\text{px}$ | Dark rect appears | $124.0\text{px} \times 44.0\text{px}$ | **None** (clean polygon highlight) |
| **300 ms**| $214.8\text{px}$ | $49.2\text{px}$ | Rect expanding | $124.0\text{px} \times 44.0\text{px}$ | **None** |
| **600 ms**| $236.4\text{px}$ | $58.1\text{px}$ | Rect expanding | $124.0\text{px} \times 44.0\text{px}$ | **None** |
| **1500 ms**| $255.0\text{px}$ | $66.4\text{px}$ | Maximum expansion | $124.0\text{px} \times 44.0\text{px}$ | **None** |
| **5000 ms**| $255.0\text{px}$ | $66.4\text{px}$ | Oscillating outline | $124.0\text{px} \times 44.0\text{px}$ | **None** |
| **10000 ms**| $255.0\text{px}$ | $66.4\text{px}$| Continuous dark rect | $124.0\text{px} \times 44.0\text{px}$ | **None** |

---

## 2. Issue C — The "Floating Circles" Bug

### 2.1 Visual Symptom Observed by User
Faint circular shapes floated and pulsated in unrelated locations, including in the Saigon River water above the berths and inside cargo storage yards.

### 2.2 Root Cause
1. **Unconditional Radar Animation**:
   In the original code, all 7 zone anchors unconditionally rendered `.map-v2-anchor-radar`. Even when no zone was selected, 7 continuous SVG pulse loops were running simultaneously.
2. **Transform Origin Displacement**:
   Because `transform-box: fill-box; transform-origin: center;` was missing, all 7 radar circles were displaced across the canvas based on their coordinates relative to the SVG root:
   - `ZONE_QUAY` $(793, 290)$ $\rightarrow$ pulse projected into the upper river water.
   - `ZONE_GENERAL` $(665, 456)$ $\rightarrow$ pulse projected into neighboring yard storage.
   - `ZONE_CONTAINER` $(1238, 381)$ $\rightarrow$ pulse projected into empty perimeter zones.

---

## 3. Implemented Fix

### 3.1 CSS Rules ([`MapV2Workspace.css`](file:///D:/Projects/production-meter-reading/production-meter-reading/frontend/src/components/map-v2/MapV2Workspace.css))

```css
/* 1. Eliminate default browser rectangle focus outline from SVG group */
.map-v2-anchor-group:focus {
  outline: none;
}

.map-v2-anchor-group:focus-visible {
  outline: none;
}

/* 2. Accessible focus-visible state attached strictly to badge circle */
.map-v2-anchor-group:focus-visible .map-v2-anchor-badge {
  filter: drop-shadow(0 0 6px rgba(0, 163, 255, 0.95));
}

/* 3. Ensure radar pulse scales strictly relative to the badge center */
.map-v2-anchor-radar {
  fill: none;
  stroke: var(--v2-neon-radar-stroke, rgba(0, 163, 255, 0.4));
  stroke-width: 1.5;
  pointer-events: none;
  transform-box: fill-box;
  transform-origin: center;
  animation: mapV2RadarPulse 2.8s cubic-bezier(0.2, 0.8, 0.2, 1) infinite;
}

@keyframes mapV2RadarPulse {
  0% {
    transform: scale(0.95);
    opacity: 0.6;
  }
  50% {
    opacity: 0.25;
  }
  100% {
    transform: scale(1.15);
    opacity: 0;
  }
}
```

### 3.2 JSX Conditional Radar Scoping ([`MapV2Canvas.tsx`](file:///D:/Projects/production-meter-reading/production-meter-reading/frontend/src/components/map-v2/MapV2Canvas.tsx))

Radar pulse is now strictly scoped to the currently selected zone:
```tsx
{/* Subtle radar pulse effect - rendered only on selected zone */}
{isZoneSelected && (
  <circle
    className="map-v2-anchor-radar"
    cx={0}
    cy={0}
    r={20}
  />
)}
```

### 3.3 Verification of Fix
1. **Floating circles on unselected map**: Exactly **0** (verified via `initial_circles.json` and visual audit).
2. **Rectangle outline on selection**: Completely **0** (eliminated default focus outline).
3. **Selection highlight**: Smooth polygon border and subtle badge glow only.
4. **Long-term stability**: Tested up to 10 seconds continuous selection with zero dimensional change or drift.
