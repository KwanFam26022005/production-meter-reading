# Human Review Dossier — V16E-RECOVERY-R1

## 1. Executive Summary

Phase `V16E-RECOVERY-R1` resolves the primary navigation duplication and mobile navigation defects identified during the human review of `V16E-RECOVERY-R0`.

- **Visual baseline**: Pre-S2 visual language restored in R0 is strictly preserved.
- **Map & Network surfaces**: Untouched.
- **Domain datasets & database schema**: Untouched.
- **CSS lines added**: 38 lines in `frontend/src/index.css` (budget: < 150 lines).

---

## 2. Issues Addressed & Factual Comparison

| Dimension | V16E-RECOVERY-R0 (Previous) | V16E-RECOVERY-R1 (Current) | Status |
|---|---|---|---|
| **Top Workspace Header** | Included 5 tabs: Bản đồ, Mạng lưới, Sổ ca, **Kho Thiết bị**, **Trung tâm Đối soát** + divider. | Displays **only** internal map view modes: `[Bản đồ]`, `[Mạng lưới]`, `[Sổ ca ghi]`. Zero primary workspace duplication. | RESOLVED |
| **Authoritative Primary Nav** | Left Rail had Bản đồ, Thiết bị, Công cụ, but Top Header duplicated them. | Left Rail is the single authoritative primary workspace switcher. | RESOLVED |
| **Mobile Topbar Title** | Statically displayed "Quản trị Vận hành". | Dynamically displays current workspace: `Bản đồ`, `Thiết bị`, or active secondary tool (`Lịch ghi`, etc.). | RESOLVED |
| **Mobile Map Internal Switcher** | Stretched across mobile screen causing button crowding. | Dedicated compact 42px segmented switcher: `[Bản đồ] [Mạng lưới] [Sổ ca]`. | RESOLVED |
| **Mobile Drawer Groups** | Drawer header had legacy label `KHÔNG GIAN & HẠ TẦNG`. | Drawer headers organized as: `HẠ TẦNG & VẬN HÀNH` [Trọng tâm] and `CÔNG CỤ QUẢN TRỊ` [Hỗ trợ]. | RESOLVED |
| **Mobile Thiết bị Screenshot Bug** | `10-mobile-devices-390.png` captured Sổ ca due to V13 redirect and session storage precedence. | Root cause eliminated. `10-mobile-devices-assets.png` captures actual Thiết bị table; `11-mobile-devices-meters.png` captures actual Công tơ table. | RESOLVED |
| **Deep Links** | `?tab=meters` redirected to `dashboard`. | `?tab=assets` and `?tab=meters` directly open `AdminDevicesWorkspace` with correct subtab active. | RESOLVED |

---

## 3. Visual Verification Artifacts (12 Screenshots)

All 12 screenshots are available in `docs/recovery/v16e-r1/screenshots/`:

| # | Filename | Viewport | Target Surface | Verified Factual Content |
|---|---|---|---|---|
| 1 | `01-map-1920-nav-clean.png` | 1920x1080 | Map Operations | Left Rail has Bản đồ active; Top Header has only Bản đồ, Mạng lưới, Sổ ca. |
| 2 | `02-map-1366-nav-clean.png` | 1366x768 | Map Operations | Clean navigation layout at 1366px laptop resolution. |
| 3 | `03-map-1280-nav-clean.png` | 1280x720 | Map Operations | Clean navigation layout at 1280px compact resolution. |
| 4 | `04-devices-assets-nav.png` | 1920x1080 | Thiết bị (Hạ tầng) | Left Rail has Thiết bị active, Bản đồ inactive. Subtab "Hạ tầng" active with 32 assets. |
| 5 | `05-devices-meters-nav.png` | 1920x1080 | Thiết bị (Công tơ) | Left Rail has Thiết bị active, Bản đồ inactive. Subtab "Công tơ" active with 12 meters. |
| 6 | `06-tools-popover.png` | 1920x1080 | Secondary Tools | Popover docked beside Left Rail with Lịch ghi, Phân ca, Báo cáo, Nhật ký, Thẩm định. |
| 7 | `07-mobile-map.png` | 390x844 | Mobile Map | Mobile topbar shows "Bản đồ"; compact 3-button switcher underneath. |
| 8 | `08-mobile-map-menu.png` | 390x844 | Mobile Drawer | Slide-over drawer showing "HẠ TẦNG & VẬN HÀNH" and "CÔNG CỤ QUẢN TRỊ". |
| 9 | `09-mobile-map-sorca.png` | 390x844 | Mobile Sổ ca | Sổ ca shift logbook displayed inside Map operations on mobile. |
| 10 | `10-mobile-devices-assets.png` | 390x844 | Mobile Thiết bị | Topbar shows "Thiết bị". Subtab "Hạ tầng" active with asset table. NOT Sổ ca. |
| 11 | `11-mobile-devices-meters.png` | 390x844 | Mobile Công tơ | Topbar shows "Thiết bị". Subtab "Công tơ" active with meter table. NOT Sổ ca. |
| 12 | `12-mobile-tools-menu.png` | 390x844 | Mobile Tool | Topbar shows "Lịch ghi"; schedules tool rendered cleanly. |

---

## 4. Automated Verification Results

- **Unit / Regression Tests**: `npm test -- --watchAll=false`
  - Total tests: 249
  - Passing: 249
  - Failing: 0
- **TypeScript Strict Compilation**: `npx tsc --noEmit`
  - Exit code: 0
  - Errors: 0
- **Production Build**: `npm run build`
  - Exit code: 0
  - Output bundle generated cleanly with Vite.

---

## 5. Modified Files Inventory

1. `frontend/src/features/workspace/OperationalWorkspaceHeader.tsx`:
   - Removed `Kho Thiết bị` and `Trung tâm Đối soát` buttons and the divider.
   - Restored center navigation strictly as Map internal view switcher.
2. `frontend/src/components/admin/AdminShell.tsx`:
   - Added `getCurrentWorkspaceTitle` to render dynamic mobile topbar title.
   - Updated drawer header text to `HẠ TẦNG & VẬN HÀNH`.
3. `frontend/src/App.tsx`:
   - Prioritized URL query parameters (`?tab=`) over cached `sessionStorage`.
   - Removed obsolete V13 redirect where `tab === 'meters'` forced `dashboard` with `list` view.
   - Added URL synchronization via `history.replaceState` and `popstate` listener.
4. `frontend/src/context/OperationalWorkspaceContext.tsx`:
   - Synchronized `deviceSegment` and `activeTab` with `initialTab` prop changes.
5. `frontend/src/index.css`:
   - Added 38 lines of mobile responsive CSS under `@media (max-width: 768px)` for `.sgp-unified-workspace-header`.
6. `frontend/tests/v13OperationalToolbarContextSurfaces.test.ts`:
   - Updated Test 2 to reflect V16E-R1 Devices Workspace contract for `meters`.
7. `scripts/audit/capture_v16e_r1_screenshots.mjs`:
   - Audit script capturing all 12 review screenshots using Chromium/Edge.
