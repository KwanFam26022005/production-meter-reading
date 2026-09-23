# 06 — Comprehensive Test Results and Regression Audit

## Executive Summary
This document records the automated verification and regression testing executed for the implementation of **Map V2 (Bản đồ V2)** in the Saigon Port production meter reading system.

---

## 1. Test Suite Summary

| Test Suite | Total Tests | Passed | Failed | Skipped | Status |
| :--- | :---: | :---: | :---: | :---: | :---: |
| **Map V2 Workspace & Geometry Invariants** (`tests/mapV2IndependentWorkspace.test.ts`) | 14 | 14 | 0 | 0 | **PASS** |
| **Operations Portal Regression Suite** (`npm run test:operations`) | 244 | 244 | 0 | 0 | **PASS** |
| **User Portal Regression Suite** (`npm run test:user`) | 74 | 74 | 0 | 0 | **PASS** |
| **Two-Site Bundle Isolation Audit** (`scripts/verify_bundle_separation.mjs`) | 10 | 10 | 0 | 0 | **PASS** |
| **Total Automated Tests** | **342** | **342** | **0** | **0** | **100% PASS** |

---

## 2. Map V2 Specific Acceptance Scenarios (18 Invariants)

1. **Sidebar Presence**: Tab `map_v2` with label `"Bản đồ V2"` and icon `MapPinned` is integrated into `primaryNavItems` in `AdminShell.tsx`. (*PASS*)
2. **Independent Workspace Activation**: Clicking `"Bản đồ V2"` activates `activeTab = 'map_v2'` and unmounts all other workspaces cleanly. (*PASS*)
3. **Map V1 Accessibility**: Tab `dashboard` with label `"Bản đồ"` remains accessible and functional. (*PASS*)
4. **Map V1 Asset Preservation**: `MapOperationsPage.tsx`, `OperationalMap.tsx`, and `tan-thuan-spatial-baseline.freeze.json` are completely untouched. (*PASS*)
5. **Canonical PNG Ingestion**: `map-verison3.png` loaded and SHA-256 matches authoritative source `0c9305fa156e48de5e742f260d3f3b6902623bef3c27a0be32d084e8cc9fc522`. (*PASS*)
6. **Canonical JSON Manifest Ingestion**: `tan_thuan_1_zones_edited.json` loaded and SHA-256 matches authoritative source `ae4085172e730591975fc0e8b7795bf84ca8a18b2363c0a8acb1a259f64dc02e`. (*PASS*)
7. **Seven Polygons Verified**: `ZONE_QUAY` (28 vtx), `ZONE_GENERAL` (21 vtx), `ZONE_CONTAINER` (24 vtx), `BLDG_KHO_1` (4 vtx), `BLDG_KHO_2` (4 vtx), `BLDG_KHO_4` (4 vtx), `ZONE_ADMIN` (5 vtx). (*PASS*)
8. **Six Polylines Verified**: `PORT_BOUNDARY` (36 vtx, closed: true), `DIVIDER_QUAY_BACKLAND` (12 vtx), `DIVIDER_GENERAL_CONTAINER` (4 vtx), `ROAD_BACKLAND` (11 vtx), `ROAD_CENTRAL_ACCESS` (6 vtx), `ROAD_EAST_ACCESS` (6 vtx). (*PASS*)
9. **Gate Coordinates Verified**: `GATE_A` at `[1450, 569]`, `GATE_B` at `[874, 725]`. (*PASS*)
10. **Kho 1 & Kho 2 Hierarchy Verified**: Both have `parent_id === 'ZONE_GENERAL'` and retain 4 vertices. (*PASS*)
11. **Kho 4 & Admin Office Hierarchy Verified**: `BLDG_KHO_4` and `ZONE_ADMIN` retain `parent_id === null`. (*PASS*)
12. **Shared Coordinate Space Locking**: Both base map and vector layers rendered inside single `<g transform="translate(panX, panY) scale(zoom)">` within 1536x1024 viewBox. (*PASS*)
13. **Zoom & Pan Stability**: Affine transform preserves geometric lock without pixel drift across all scale factors. (*PASS*)
14. **Layer Visibility Toggling**: Independent visibility controls verified for all 5 functional layers. (*PASS*)
15. **Zero Backend API Calls**: Verification confirms Map V2 components do not call `/api/v1/admin/map/*` or `/publish`. (*PASS*)
16. **User Portal Isolation**: `UserApp.tsx` and `dist/user/` bundle contain zero Map V2 references or assets. (*PASS*)
17. **Production Build Success**: Both `npm run build:operations` and `npm run build:user` build with zero TypeScript and zero bundle errors. (*PASS*)
18. **Bundle Separation Audit**: `scripts/verify_bundle_separation.mjs` exits with code 0, confirming strict isolation between user and admin bundles. (*PASS*)
