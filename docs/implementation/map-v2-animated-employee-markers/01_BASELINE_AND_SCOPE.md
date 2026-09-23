# Map V2 Animated Employee Markers — 01. Baseline and Scope

**Project:** Production Meter Reading — Cảng Sài Gòn  
**Repository:** `D:\Projects\production-meter-reading\production-meter-reading`  
**Target Surface:** Operations Portal — Map V2 (`frontend/src/components/map-v2/`)  
**Status:** IMPLEMENTED & VERIFIED  

---

## 1. Technical Baseline

- **Base Git Branch:** `feature/v16e-network-map-overlay-r1`
- **Base Commit HEAD:** `5d370474112fb978105f87e7498cdc9d339471a0`
- **Frozen B2 Config SHA-256:** `7f3a8916b841e12525969128783eb835218bcdd07f645dc1ee4305bce5a5cc6a` (Verified 100% intact)
- **Canonical Coordinate Space:** 1536 × 1024 SVG image pixels (origin top-left)
- **Geometry Manifest:** `tan_thuan_1_zones_edited.json` (7 canonical polygons: `ZONE_QUAY`, `ZONE_GENERAL`, `ZONE_CONTAINER`, `BLDG_KHO_1`, `BLDG_KHO_2`, `BLDG_KHO_4`, `ZONE_ADMIN`)

---

## 2. Scope Boundaries & Non-Goals

### 2.1 Strictly Within Scope
1. **Illustrative Ambient Movement:** Subtle, closed-loop SVG movement within assigned zone polygons.
2. **Interaction State Machine:**
   - **Default:** Slow ambient movement (8–12s loop).
   - **Hover / Keyboard Focus:** Instant pause at current position with Level 2 non-interactive contextual preview card.
   - **Selected:** Movement freeze, associated zone polygon highlight reveal, and opening of docked/drawer contextual `MapV2InspectionPanel`.
3. **Geometry Safety Guarantees:** Ray-casting polygon containment (`isPointInPolygon`), minimum 18px boundary clearance (`markerRadius = 14px` + `buffer = 4px`), automatic stationary fallback for narrow corridors.
4. **Data Integrity & Disclosure:** Explicit disclaimer: `"Chuyển động minh họa khu vực phân công — không phải vị trí GPS."`, role title `"Người phụ trách phân khu"`, zero fabricated live GPS or personal progress denominators.
5. **Mode Isolation:** Suppressed in Technical Network Simulation Mode (`utilityMode !== 'off'`) to prevent engineering clutter.
6. **Accessibility & Controls:** Keyboard navigation (`tabIndex={0}`, `role="button"`, `Enter`/`Space`), HUD Play/Pause toggle, `prefers-reduced-motion` compliance.

### 2.2 Strictly Excluded (Non-Goals)
- Zero database schema migrations or changes to SQLite backend.
- Zero changes to User Portal (`user.html`), camera capture, or meter verification flows.
- Zero alteration to Map V1 (`AdminMap.tsx`).
- Zero changes to the frozen B2 network layout topology or hash.
- Zero claim of real-time GPS tracking or automatic live workforce dispatch.
