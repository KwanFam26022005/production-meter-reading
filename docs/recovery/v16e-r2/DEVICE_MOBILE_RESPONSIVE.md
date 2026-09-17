# V16E-R2 Device Mobile Responsive Repair

## 1. Problem Overview
In phase V16E-R1, the human review noted:
- Primary navigation and desktop maps were approved.
- However, the mobile presentation of **Thiết bị → Hạ tầng** and **Thiết bị → Công tơ** was blocked.
- Specifically, the desktop 9-column Asset table and 7-column Meter table were squished into narrow mobile viewports (e.g. 390×844 and 360×800), causing severe horizontal scrolling, broken table cell wrapping, and truncated actions.

## 2. Architecture & Design Strategy
To resolve this without altering desktop layouts (> 768px):
1. **Zero Redesign for Desktop**:
   - The desktop table views and filters are preserved 100% identically to R1 using `.admin-assets-desktop-*` and `.admin-meters-desktop-*` wrappers.
   - For viewports > 768px, mobile elements are hidden via `display: none`.
2. **Dedicated Mobile Card Architecture (<= 768px)**:
   - On viewports <= 768px, desktop tables and filter grids are suppressed via `display: none !important`.
   - Dedicated mobile card views (`.admin-asset-mobile-card` and `.admin-meter-mobile-card`) render compact, thumb-friendly items.
   - **Asset Card Information Hierarchy**:
     - Line 1: Asset Code (`font-mono font-bold`) + Asset Type Badge (`SWITCHBOARD`, `FEEDER`, etc.).
     - Line 2: Human-readable Asset Name.
     - Line 3: Operational Zone (`MapPin`) + Attached Meters count (`Gauge`).
     - Line 4: Lifecycle status pill + Verification status badge + Locate on Map button (if spatial coordinates exist) + Chevron `›`.
     - Interaction: Tapping the card opens the full asset detail slide-over drawer (`handleSelectAsset`).
   - **Meter Card Information Hierarchy**:
     - Line 1: Meter Code (`font-mono font-bold`) + Utility Type Badge (`⚡ Điện` / `💧 Nước`).
     - Line 2: Human-readable Meter Name.
     - Line 3: Location (`MapPin`).
     - Line 4: Latest reading with proper utility units (`kWh` or `m³`) + formatted reading timestamp + Status dot (`Đang dùng` / `Ngừng`) + Chevron `›`.
     - Interaction: Tapping the card opens the meter edit/inspection slide-over drawer (`handleOpenEdit`).
3. **Mobile Header & Filter Disclosure**:
   - Replaced heavy multi-select horizontal grids with a compact mobile header.
   - Compact inline search bar + `[ Bộ lọc ]` toggle button.
   - Tapping `[ Bộ lọc ]` toggles a cleanly stacked filter panel without horizontal crowding.
4. **Shell & Viewport Containment**:
   - Scoped CSS rules in `frontend/src/index.css` (only 95 lines added, well within the <= 250 line budget).
   - Hid rail sidebar on mobile for devices shell (`.admin-shell-layout:has(.sgp-devices-shell) .admin-sidebar { display: none !important; }`), opening only when the user explicitly triggers the mobile menu.
   - Guaranteed full 100% viewport width without artificial margins or drop shadows.

## 3. Containment Verification Results
Automated audit using Playwright with real Microsoft Edge verified `document.documentElement.scrollWidth <= window.innerWidth + 1` across all mobile states:

| Test Case | Viewport | `innerWidth` | `docScrollWidth` | `bodyScrollWidth` | `shellScrollWidth` | Status |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| `03-mobile-assets-default` | 390×844 | 390px | 390px | 390px | 390px | **PASS** |
| `04-mobile-assets-filter` | 390×844 | 390px | 390px | 390px | 390px | **PASS** |
| `05-mobile-asset-detail` | 390×844 | 390px | 390px | 390px | 390px | **PASS** |
| `06-mobile-meters-default` | 390×844 | 390px | 390px | 390px | 390px | **PASS** |
| `07-mobile-meters-filter` | 390×844 | 390px | 390px | 390px | 390px | **PASS** |
| `08-mobile-meter-detail` | 390×844 | 390px | 390px | 390px | 390px | **PASS** |
| `09-mobile-assets-360` | 360×800 | 360px | 360px | 360px | 360px | **PASS** |
| `10-mobile-meters-360` | 360×800 | 360px | 360px | 360px | 360px | **PASS** |

Horizontal overflow difference is 0px across all tests.
No desktop regression: 1920x1080 views for Assets and Meters remain identical to baseline.
Unit tests: 249/249 pass. Production build: Clean build with zero errors.
