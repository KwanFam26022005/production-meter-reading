# 04 — Navigation Integration and Map V1 Isolation

## Executive Summary
This document details the sidebar navigation integration of **Bản đồ V2** within the Operations Portal, the deep-linking mechanisms, and the non-negotiable isolation barriers guaranteeing that Map V1 and the User Portal remain completely intact.

---

## 1. Sidebar Navigation Integration

### 1.1 Rail & Drawer Navigation in `AdminShell.tsx`
- **Label**: `Bản đồ V2`
- **Internal Tab ID**: `map_v2`
- **Icon**: `MapPinned` (Lucide React, 22px stroke), visually distinct from Map V1's `Map` icon while maintaining unified maritime styling.
- **Positioning**: Positioned immediately adjacent to the existing Map item (`dashboard`).
- **Drawer Counter**: Updated from `4 Workspaces` to `5 Workspaces`.
- **Legacy Compatibility**: Kept legacy `navItems` array intact for backward test invariants (`v13OperationalToolbarContextSurfaces.test.ts`).

### 1.2 Active State and Breadcrumb Resolution
- `isItemActive('map_v2')` evaluates strictly to `activeTab === 'map_v2'`.
- `getCurrentWorkspaceTitle()` returns `'Bản đồ V2'`.

### 1.3 URL Deep Linking & Session State
In `frontend/src/apps/operations/OperationsApp.tsx`:
- Accepts URL parameter `?tab=map_v2`.
- Persists tab selection in `sessionStorage.getItem('admin_active_tab')`.
- Handles browser navigation via `popstate` events, allowing forward and back navigation.

---

## 2. Map V1 Isolation Guarantees

The existing operational map (Map V1) remains 100% operational with zero regressions:
1. **Source Code Separation**: Map V1 components in `frontend/src/features/map-operations/` (`MapOperationsPage.tsx`, `OperationalMap.tsx`, `CanonicalBaseMap.tsx`) were completely untouched.
2. **Configuration Separation**: Map V1 calibration configurations, database seeds, and spatial baselines (`tan-thuan-spatial-baseline.freeze.json`) were not altered.
3. **API Integrity**: Zero modification to backend endpoints `/api/v1/admin/map/*` or `/publish`.
4. **Independent Lifecycle**: Switching from Map V1 (`dashboard`) to Map V2 (`map_v2`) cleanly unmounts `AdminDashboard` and mounts `MapV2Workspace`. Switching back fully restores Map V1 with operational meters and layers intact.

---

## 3. User Portal Isolation Guarantees

The User Portal (`apps/user`) remains strictly separated:
1. **Entry Point Separation**: Operations Portal builds from `operations.html` $\rightarrow$ `src/apps/operations/main.tsx`, while User Portal builds from `user.html` $\rightarrow$ `src/apps/user/main.tsx`.
2. **Bundle Verification**: The automated audit script `scripts/verify_bundle_separation.mjs` confirms that:
   - Zero Map V2 components, assets (`map-verison3.png`), or types are present in `dist/user/assets/*.js`.
   - The User Portal bundle size is completely unaffected.
