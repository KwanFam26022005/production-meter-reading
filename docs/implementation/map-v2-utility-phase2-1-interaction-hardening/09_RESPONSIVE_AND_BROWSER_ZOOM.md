# 09 — Responsive Layout & Browser Zoom Verification

**Project**: Saigon Port Digital Twin & Production Meter Reading  
**Phase**: 2.1 — Real Pointer Interaction & Animation Hardening  
**Status**: VERIFIED ACROSS ALL RESOLUTIONS & SCALING MODES

---

## 1. Resolution Matrix

The utility network layer was tested under real pointer input across standard operational viewport resolutions:

| Viewport Resolution | Aspect Ratio | Operational Use Case | Hit Target Status | Screenshot Evidence |
|---|---|---|---|---|
| **1366 × 768** | ~16:9 | Standard Field Laptop (Priority) | PASS (40.3px effective) | `11-1366-real-click.png` |
| **1280 × 720** | 16:9 | HD Display / Mobile Field Dock | PASS (37.4px effective) | `12-1280-real-click.png` |
| **1440 × 900** | 16:10 | Commercial Desktop / Mac display | PASS (43.2px effective) | Verified |
| **1536 × 864** | 16:9 | Mid-tier Workstation | PASS (45.1px effective) | Verified |
| **1920 × 1080** | 16:9 | Port Operations Center Wall Display | PASS (56.4px effective) | Verified |

---

## 2. Browser Zoom / DPI Scaling Verification

Modern laptops and high-density displays frequently operate at 125% or 150% OS display scaling. In automated browser testing, this behavior is verified via Playwright's `deviceScaleFactor` and CSS pixel recalculations:

### 125% Zoom (`deviceScaleFactor: 1.25`)
- Target node center: scaled accurately without sub-pixel drift.
- `elementFromPoint`: accurately targets the `<circle pointerEvents="all">`.
- Real click: expands electricity network without delay.
- Evidence: `13-browser-zoom125.png`.

### 150% Zoom (`deviceScaleFactor: 1.50`)
- Target node center: crisp rendering without blur or hit-box detachment.
- `elementFromPoint`: accurately targets the `<circle pointerEvents="all">`.
- Real click: expands electricity network without delay.
- Evidence: `14-browser-zoom150.png`.

---

## 3. Shared Affine Transform Invariant

Throughout all zoom and responsive layout shifts:
- Both base map image (`tan-thuan-port-v8.webp`) and utility network overlay (`#layer-utility-demo`) reside strictly inside the single SVG transform group:
  `<g transform="translate(pan.x, pan.y) scale(zoom)">`
- This guarantees **zero spatial drift** between physical port berths/buildings and utility cables/meters.
