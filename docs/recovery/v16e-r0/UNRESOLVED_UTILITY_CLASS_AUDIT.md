# Unresolved Utility Class Audit (V16E-R0)

Date: 2026-09-17  
Baseline Anchor: `d0165a90753bf812f5d2cb551a8aa4116e31d5e6`  
Status: **PASSED — ZERO UNEXPLAINED UTILITY CLASSES IN ACTIVE PRODUCTION CODE**

---

## 1. Context & Objective

The project **does not have Tailwind CSS installed**. During the S2/R1 redesign, several experimental components introduced Tailwind-style utility classes that resulted in broken layouts, missing styling, and architectural fragmentation.

This audit inspects all active components in the **Bản đồ** and **Thiết bị** recovery paths to verify that:
1. S2/R1 experimental components using raw utility classes (`DevicesWorkspacePage`, `EntityDetailSurface`, `ShiftMeterPanel`, `SgpPrimitives`) have been removed from the active render path.
2. All CSS class occurrences in active production components are either:
   - Built-in semantic project classes (e.g. `sgp-*`, `admin-*`),
   - Scoped legacy administrative CSS explicitly defined in `index.css`, OR
   - Explicitly defined helper utility classes in `index.css`.
3. There are **zero unexplained utility dependencies** in the active production render path.

---

## 2. Active Component Audit

### A. `frontend/src/App.tsx`
- **Active Navigation & Layout Classes**:
  - `AdminShell`, `AdminWorkspaceApp`
  - Zero Tailwind classes. Replaced `DevicesWorkspacePage` with `AdminDevicesWorkspace`.

### B. `frontend/src/components/admin/AdminShell.tsx`
- **Class Usage**:
  - `admin-portal-root`, `admin-mobile-topbar`, `admin-sidebar-toggle-btn`, `admin-mobile-brand`, `admin-mobile-title`, `admin-mobile-user`, `sgp-sim-badge`, `admin-badge-tag`, `admin-shell-layout`, `admin-sidebar rail-mode`, `admin-sidebar-backdrop`, `admin-sidebar-brand`, `admin-sidebar-rail-menu-btn`, `admin-rail-brand-icon`, `admin-nav-list`, `admin-nav-item`, `admin-nav-icon`, `admin-nav-label`, `admin-rail-group-divider`, `sgp-secondary-tools-popover`, `sgp-popover-header`, `sgp-popover-list`, `sgp-popover-item`, `sgp-popover-icon`, `sgp-popover-title`, `sgp-popover-desc`, `admin-sidebar-footer`, `admin-sidebar-rail-footer`, `admin-rail-port-title`, `admin-rail-version`, `admin-rail-user-actions`, `admin-rail-avatar-btn`, `admin-rail-avatar`, `admin-rail-logout-btn`, `admin-sidebar-expanded-drawer`, `admin-drawer-brand`, `admin-drawer-brand-info`, `admin-drawer-brand-logo`, `admin-drawer-brand-text`, `admin-drawer-brand-corp`, `admin-drawer-brand-sub`, `admin-drawer-close-btn`, `admin-drawer-nav-list`, `admin-drawer-nav-header`, `admin-drawer-nav-badge`, `admin-drawer-nav-item`, `admin-drawer-nav-icon`, `admin-drawer-nav-label`, `admin-drawer-active-dot`, `admin-drawer-footer`, `admin-drawer-user-card`, `admin-avatar`, `admin-user-details`, `admin-user-name`, `admin-role-line`, `admin-role-icon`, `admin-user-role`, `admin-logout-btn`, `admin-drawer-version-tag`, `admin-main-viewport`.
- **Determination**:
  - All classes are explicit semantic CSS rules declared in `frontend/src/index.css`.
  - Replaced legacy utility `relative` with inline style `style={{ position: 'relative' }}`.
  - Replaced `mt-4` with inline style `style={{ marginTop: 16 }}`.
  - **Unexplained Utilities**: `0`.

### C. `frontend/src/components/admin/AdminDevicesWorkspace.tsx`
- **Class Usage**:
  - `sgp-devices-shell`, `sgp-devices-header`, `sgp-devices-header-title`, `sgp-devices-tab-switch`, `sgp-devices-tab-btn`, `sgp-devices-tab-btn.active`, `sgp-devices-body`.
- **Determination**:
  - All classes are defined in `frontend/src/index.css` using authoritative `--sgp-brand-*` and `--sgp-ink*` tokens.
  - **Unexplained Utilities**: `0`.

### D. `frontend/src/features/workspace/OperationalWorkspaceHeader.tsx`
- **Class Usage**:
  - `sgp-unified-workspace-header`, `sgp-uwh-col-left`, `sgp-uwh-identity`, `sgp-uwh-dot-badge`, `sgp-uwh-dot`, `sgp-uwh-title-wrap`, `sgp-uwh-title`, `sgp-uwh-title-full`, `sgp-uwh-title-compact`, `sgp-uwh-scenario-tag`, `sgp-uwh-col-center`, `sgp-uwh-mode-nav`, `sgp-uwh-mode-btn`, `sgp-uwh-tab-full`, `sgp-uwh-tab-compact`, `sgp-uwh-mode-count`, `sgp-uwh-nav-divider`, `sgp-uwh-col-right`, `sgp-uwh-telemetry`, `sgp-uwh-chip`, `sgp-uwh-chip-val`, `sgp-uwh-chip-txt`, `sgp-text-amber`, `sgp-text-cyan`, `sgp-text-emerald`, `sgp-text-blue`, `sgp-count-highlight`.
- **Determination**:
  - 100% semantic Saigon Port classes restored from anchor `d0165a9`.
  - **Unexplained Utilities**: `0`.

### E. `frontend/src/features/map-operations/command/AdaptiveCommandBar.tsx`
- **Class Usage & Project CSS Mapping**:
  - `sgp-hud-top-bar`, `sgp-adaptive-command-bar`, `sgp-cmd-*` (BEM semantic classes in `index.css`).
  - `.font-tabular` -> Defined in `index.css` (`font-variant-numeric: tabular-nums lining-nums;`).
  - `.shrink-0` -> Explicitly defined in `index.css` (`flex-shrink: 0;`).
  - `.truncate` -> Explicitly defined in `index.css` (`overflow: hidden; text-overflow: ellipsis; white-space: nowrap;`).
  - `.text-slate-400`, `.text-slate-300`, `.text-slate-200` -> Explicitly defined in `index.css`.
  - `.text-amber-400`, `.text-amber-300`, `.text-cyan-400`, `.text-emerald-400`, `.text-emerald-300` -> Explicitly defined in `index.css`.
- **Determination**:
  - Every single class is mapped to an explicit declaration in `index.css`.
  - **Unexplained Utilities**: `0`.

### F. `frontend/src/features/map-operations/network/UtilityNetworkView.tsx`
- **Class Usage**:
  - Restored to anchor `d0165a9`. Uses SVG elements, Canvas paths, and scoped CSS classes (`sgp-network-container`, `sgp-network-toolbar`, `sgp-network-legend`, `sgp-network-node`).
- **Determination**:
  - **Unexplained Utilities**: `0`.

### G. `frontend/src/components/admin/AdminAssets.tsx`
- **Class Usage & Scoped Definitions**:
  - Scoped within `.admin-assets-page` in `frontend/src/index.css`:
    - `.admin-assets-page .flex { display: flex; }`
    - `.admin-assets-page .flex-col { flex-direction: column; }`
    - `.admin-assets-page .items-center { align-items: center; }`
    - `.admin-assets-page .justify-between { justify-content: space-between; }`
    - `.admin-assets-page .bg-white { background: #fff; }`
    - `.admin-assets-page .rounded-xl { border-radius: 12px; }`
    - `.admin-assets-page .rounded-lg { border-radius: 8px; }`
    - `.admin-assets-page .border-slate-200 { border-color: #e2e8f0; }`
  - Replaced outer wrapper `flex flex-col w-full min-h-screen bg-slate-50` with semantic `.admin-assets-wrapper`.
- **Determination**:
  - All classes are explicitly styled via scoped rules in `index.css`.
  - **Unexplained Utilities**: `0`.

### H. `frontend/src/components/admin/AdminMeters.tsx`
- **Class Usage**:
  - `.admin-page-container`, `.admin-page-header`, `.admin-page-title`, `.admin-table-container`, `.admin-table`, `.sgp-view-mode-toggle`, `.sgp-mode-btn`.
- **Determination**:
  - All classes are explicit rules in `index.css`.
  - **Unexplained Utilities**: `0`.

---

## 3. Inactive S2/R1 Experimental Components

The following components contained uninstalled Tailwind classes and have been **completely removed from the active render path**:
- `frontend/src/features/devices/DevicesWorkspacePage.tsx`
- `frontend/src/features/devices/EntityDetailSurface.tsx`
- `frontend/src/features/map-operations/components/ShiftMeterPanel.tsx`
- `frontend/src/components/ui/SgpPrimitives.tsx`

---

## 4. Audit Conclusion

- Total active production recovery files inspected: 9
- Total unexplained utility classes found: **0**
- Gate 22 status: **PASS**
