# 13 — Visual Acceptance Evidence Catalog (Phase 2.1)

**Project**: Saigon Port Digital Twin & Production Meter Reading  
**Phase**: 2.1 — Real Pointer Interaction & Animation Hardening  
**Target Directory**: `docs/implementation/map-v2-utility-phase2-1-interaction-hardening/evidence/`  
**Browser Engine**: Chromium / Microsoft Edge 140  
**Interaction Mode**: 100% Real Pointer & Native Keyboard (Zero synthetic dispatchEvent)

---

## 1. Screenshot Deliverables (15 Required Files)

| File Name | Viewport / Tone | Description & Verified State |
|---|---|---|
| `01-electric-source-hit-target-debug.png` | 1366×768 / Technical Light | Collapsed electric source `SIM-EXT-GRID` hit area inspection via `elementFromPoint`. Confirms `<circle r={24} pointerEvents="all">`. |
| `02-water-source-hit-target-debug.png` | 1366×768 / Technical Light | Collapsed water source `SIM-CITY-WATER` hit area inspection. Confirms isolated hit-target without collision. |
| `03-electric-source-focused.png` | 1366×768 / Technical Light | Keyboard focus state on `SIM-EXT-GRID` showing high-contrast maritime navy focus ring (`#002B5B`). |
| `04-water-source-focused.png` | 1366×768 / Technical Light | Keyboard focus state on `SIM-CITY-WATER` source diamond. |
| `05-meter-focused-light.png` | 1366×768 / Technical Light | Tab-focused meter node in Technical Light mode displaying clear outer ring and active tooltip. |
| `06-meter-focused-neon.png` | 1366×768 / Tone Neon | Focused meter node under Digital Twin Cyber Neon styling displaying Electric Cyan glow ring (`#00F0FF`). |
| `07-electric-expanded-real-click.png` | 1366×768 / Technical Light | Electricity network fully expanded following native mouse click on `SIM-EXT-GRID`. 11 nodes, 10 branches visible. |
| `08-water-expanded-real-click.png` | 1366×768 / Technical Light | Water network fully expanded following native mouse click on `SIM-CITY-WATER`. 6 nodes, 5 pipe runs visible. |
| `09-meter-trace-real-click.png` | 1366×768 / Technical Light | Active upstream trace from `SIM-EXT-GRID` through `SIM-TR-01` -> `SIM-MDB-01` -> `SIM-FDR-CENTER` (`SIM-EM-004`) triggered by native click. |
| `10-tooltip-nonblocking-click.png` | 1366×768 / Technical Light | Hover tooltip active over `SIM-MDB-01` while click event passes directly through to activate meter trace without obstruction. |
| `11-1366-real-click.png` | 1366×768 / Auto-Fit | Field standard laptop resolution (1366×768) proving native mouse click on source and meter. |
| `12-1280-real-click.png` | 1280×720 / Auto-Fit | Compact HD resolution (1280×720) proving responsive hit-target ergonomics and zero overlap. |
| `13-browser-zoom125.png` | 1366×768 / 1.25x Scale | 125% DPI display scaling proving precise pointer hit-testing without sub-pixel coordinate drift. |
| `14-browser-zoom150.png` | 1366×768 / 1.50x Scale | 150% DPI display scaling proving crisp rendering and reliable native interaction. |
| `15-utility-off-regression.png` | 1366×768 / Technical Light | Full utility network reset to "Tắt" mode; zero ghost paths, focus safely returned to toolbar. |

---

## 2. Video Deliverables (2 WebM Recordings)

### 1. `phase2-1-real-click-walkthrough.webm` (1366×768)
- **Duration**: ~20 seconds
- **Demonstration**:
  1. Navigate to Bản đồ V2.
  2. Select "Điện".
  3. Real mouse click on `SIM-EXT-GRID` -> network expands with staggered depth-ordered animation.
  4. Real mouse click on `SIM-FDR-CENTER` (`SIM-EM-004`) -> trace path illuminates, non-traced nodes dim to 35%.
  5. Keyboard `Tab` to next meter -> `Enter` -> trace switches cleanly.
  6. Real mouse click on `SIM-EXT-GRID` -> network retracts in reverse depth order to source.
  7. Select "Nước".
  8. Real mouse click on `SIM-CITY-WATER` -> water network expands.
  9. Keyboard focus on `SIM-WP-CFS-01` (`SIM-WM-003`) -> `Space` -> water trace activates.
  10. Switch to Tone Neon -> glowing cyber aesthetics.
  11. Switch to "Cả hai" -> simultaneous electricity and water view with single crossing preserved at `(740, 520)`.
  12. Select "Tắt" -> clean unmount.

### 2. `phase2-1-real-click-stress.webm` (1366×768)
- **Duration**: ~15 seconds
- **Demonstration**:
  1. Rapid double-clicking on source node -> FSM interrupts expansion cleanly and restarts without state corruption.
  2. Rapid clicking across multiple meters -> traces switch instantly without orphaned glow lines.
  3. Map drag/pan interspersed between node clicks -> verifies >4px movement threshold does not accidentally trigger node selection, and clicking nodes never starts an unwanted canvas drag.
  4. Utility mode toggled off during active transition -> clean generational token cancellation (`currentGen`).
