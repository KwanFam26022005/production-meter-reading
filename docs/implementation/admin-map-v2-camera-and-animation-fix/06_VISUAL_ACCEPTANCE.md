# Visual Acceptance & Multi-Viewport Evidence Report

## 1. Overview & Verification Summary

Visual verification was conducted in an automated real browser environment (Chromium / Playwright) against the live Operations Portal running on `http://127.0.0.1:5174/operations`.

Every requirement from the user specification has been visually validated:
1. **Issue A (Camera Framing)**:
   Map V2 opens directly with full-canvas width framing matching the user's second reference screenshot. Berths, yards, warehouses, Gate A, Gate B, and the Administrative Office are elevated cleanly into view, with balanced Saigon River context.
2. **Issue B (Growing Rectangle)**:
   Selecting `ZONE_ADMIN` produces zero dark focus outlines or expanding rectangular frames. The polygon highlight remains crisp, stable, and perfectly anchored at 0s, 1s, 5s, and 10s.
3. **Issue C (Floating Circles)**:
   All unselected map areas (river water, yards, quays) are completely free of stray pulsating circles. Only the selected zone displays a refined, properly centered pulse effect.

---

## 2. Multi-Viewport Framing Evidence

Visual evidence captured across 8 desktop and laptop viewports:

| Viewport | Dimensions | Aspect Ratio | Evidence File | Operational Entities Visible | River Context Margin | Bottom Safety Margin |
|:---|:---|:---|:---|:---|:---|:---|
| **Compact Laptop** | $1280 \times 720$ | 16:9 | [1280x720 Screenshot](evidence/viewports/1280x720-initial-framing.png) | Quay, General, Container, Admin, Gate A, Gate B | $70\text{px}$ | $+158\text{px}$ |
| **Standard Laptop** | $1366 \times 768$ | 16:9 | [1366x768 Screenshot](evidence/viewports/1366x768-initial-framing.png) | Quay, General, Container, Admin, Gate A, Gate B | $74\text{px}$ | $+170\text{px}$ |
| **Compact 1370** | $1370 \times 768$ | 16:9 | [1370x768 Screenshot](evidence/viewports/1370x768-compact-initial-framing.png) | Quay, General, Container, Admin, Gate A, Gate B | $74\text{px}$ | $+169\text{px}$ |
| **Wide 1390** | $1390 \times 768$ | 16:9 | [1390x768 Screenshot](evidence/viewports/1390x768-wide-initial-framing.png) | Quay, General, Container, Admin, Gate A, Gate B | $72\text{px}$ | $+164\text{px}$ |
| **MacBook 14"** | $1440 \times 900$ | 16:10 | [1440x900 Screenshot](evidence/viewports/1440x900-initial-framing.png) | Quay, General, Container, Admin, Gate A, Gate B | $85\text{px}$ | $+236\text{px}$ |
| **HiDPI Laptop** | $1536 \times 864$ | 16:9 | [1536x864 Screenshot](evidence/viewports/1536x864-initial-framing.png) | Quay, General, Container, Admin, Gate A, Gate B | $83\text{px}$ | $+189\text{px}$ |
| **FHD 1080p** | $1920 \times 1080$| 16:9 | [1920x1080 Screenshot](evidence/viewports/1920x1080-initial-framing.png) | Quay, General, Container, Admin, Gate A, Gate B | $85\text{px}$ | $+265\text{px}$ |
| **QHD 1440p** | $2560 \times 1440$| 16:9 | [2560x1440 Screenshot](evidence/viewports/2560x1440-initial-framing.png) | Quay, General, Container, Admin, Gate A, Gate B | $85\text{px}$ | $+392\text{px}$ |

---

## 3. Targeted Functional Acceptance Screenshots

| Test Item | Description | Evidence Link | Outcome |
|:---|:---|:---|:---|
| **01** | Initial Map V2 framing on default viewport (1366x768) | [01-initial-map-v2-framing.png](evidence/screenshots/01-initial-map-v2-framing.png) | **ACCEPTED**: Matches reference screenshot 2 framing |
| **02** | Map after free manual pan | [02-map-after-manual-pan.png](evidence/screenshots/02-map-after-manual-pan.png) | **ACCEPTED**: Smooth unconstrained panning |
| **03** | Map after free manual zoom | [03-map-after-manual-zoom.png](evidence/screenshots/03-map-after-manual-zoom.png) | **ACCEPTED**: Clean zoom without reset |
| **04** | Map after "Đặt lại góc nhìn" (Reset View) | [04-map-after-reset-view.png](evidence/screenshots/04-map-after-reset-view.png) | **ACCEPTED**: Restores initial operational framing exactly |
| **05** | Administrative Office (`ZONE_ADMIN`) selected | [05-administrative-office-selected.png](evidence/screenshots/05-administrative-office-selected.png) | **ACCEPTED**: Clean polygon highlight; zero dark rectangle |
| **06** | Selected zone stability after 1 second | [06-selected-frame-after-1s.png](evidence/screenshots/06-selected-frame-after-1s.png) | **ACCEPTED**: No dimensional change |
| **07** | Selected zone stability after 5 seconds | [07-selected-frame-after-5s.png](evidence/screenshots/07-selected-frame-after-5s.png) | **ACCEPTED**: No dimensional change or drift |
| **08** | Selected zone stability after 10 seconds | [08-selected-frame-after-10s.png](evidence/screenshots/08-selected-frame-after-10s.png) | **ACCEPTED**: Completely stable at 10s |
| **09** | General Cargo Yard (`ZONE_GENERAL`) selected | [09-general-yard-selected.png](evidence/screenshots/09-general-yard-selected.png) | **ACCEPTED**: Exact polygon outline, no stray circles |
| **10** | Container Yard (`ZONE_CONTAINER`) selected | [10-container-yard-selected.png](evidence/screenshots/10-container-yard-selected.png) | **ACCEPTED**: Exact polygon outline, no stray circles |
| **11** | Neon Tone Mode active | [11-neon-mode.png](evidence/screenshots/11-neon-mode.png) | **ACCEPTED**: High-contrast dark neon GIS theme verified |
| **12a**| Technical Inspector drawer open | [12a-inspector-open.png](evidence/screenshots/12a-inspector-open.png) | **ACCEPTED**: Inspector panel smoothly overlaying right |
| **12b**| Technical Inspector drawer closed | [12b-inspector-closed.png](evidence/screenshots/12b-inspector-closed.png) | **ACCEPTED**: Canvas reclaims full viewport |
| **13** | Rapid zone switching final state | [13-rapid-zone-switching-final-state.png](evidence/screenshots/13-rapid-zone-switching-final-state.png) | **ACCEPTED**: Zero ghost elements or duplicate outlines |

---

## 4. End-to-End Acceptance Walkthrough Video

The complete automated verification walkthrough was captured in high-definition video:
- **Video Path**: [`docs/implementation/admin-map-v2-camera-and-animation-fix/evidence/videos/map-v2-walkthrough.webm`](file:///D:/Projects/production-meter-reading/production-meter-reading/docs/implementation/admin-map-v2-camera-and-animation-fix/evidence/videos/map-v2-walkthrough.webm)
- **File Size**: `4.10 MB`
- **Scenarios Captured**:
  1. Login as Admin (`52300119`) and direct transition to Map V2.
  2. Initial camera framing validation (3 seconds static view showing full operational corridor).
  3. Administrative Office selection and 10-second continuous duration validation proving zero rectangle growth.
  4. Zone switching: General Yard and Container Yard inspection.
  5. Interactive zoom and pan gestures.
  6. Deterministic "Đặt lại góc nhìn" (Reset View).
  7. Switching between Technical Light and Neon tone modes.
  8. Technical Inspector open and close lifecycle.
