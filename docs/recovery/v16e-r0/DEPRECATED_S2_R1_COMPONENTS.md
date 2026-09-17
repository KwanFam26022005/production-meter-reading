# Deprecated S2/R1 Experimental Components

Date: 2026-09-17  
Authoritative Baseline Anchor: `d0165a90753bf812f5d2cb551a8aa4116e31d5e6`  
Status: **DEPRECATED / ZERO ACTIVE PRODUCTION IMPORTS**

---

## 1. Summary

During the S2/R1 redesign cycle, several experimental components were created that introduced uninstalled Tailwind utility classes, hardcoded presentation zone lists, synthetic table layouts, or conflated reading statuses.

As part of `V16E-RECOVERY-R0`, these components are **removed from the active production render path**. They are retained temporarily in the codebase as historical evidence of the S2/R1 experiment, but have **zero imports** in active production code.

---

## 2. Inactive Component Register

### 1. `frontend/src/features/devices/DevicesWorkspacePage.tsx`
- **File Status**: Inactive / Deprecated
- **Reason for Removal**:
  - Blends visual redesign with synthetic CRUD merging.
  - Hardcodes presentation zones (`zone-container`, `zone-wharf`, `zone-cfs`, `zone-substation`, `zone-admin`) violating dynamic scenario isolation.
  - Conflates numeric reading values with status strings (`readingValue = "Đã ghi"`).
  - Employs extensive uninstalled Tailwind utility classes (`space-y-4`, `flex-1`, `rounded-xl`, `bg-slate-50`).
- **Production Replacement**:
  - `frontend/src/components/admin/AdminDevicesWorkspace.tsx`, which wraps the existing stable `AdminAssets` and `AdminMeters` views under an operational `[ Hạ tầng ] [ Công tơ ]` tab switch.
- **Active Imports**: `0`

---

### 2. `frontend/src/features/devices/EntityDetailSurface.tsx`
- **File Status**: Inactive / Deprecated
- **Reason for Removal**:
  - Tightly coupled to `DevicesWorkspacePage.tsx`.
  - Duplicates detail modal/drawer functionality already present in `AdminAssets.tsx` and `AdminMeters.tsx`.
  - Relies on uninstalled utility classes.
- **Production Replacement**:
  - Existing stable detail inspection surfaces in `AdminAssets.tsx`, `AdminMeters.tsx`, and `AssetContextSurface.tsx`.
- **Active Imports**: `0`

---

### 3. `frontend/src/features/map-operations/components/ShiftMeterPanel.tsx`
- **File Status**: Inactive / Deprecated
- **Reason for Removal**:
  - Unapproved R1 slide-over redesign that replaced the stable pre-S2 round list view.
  - Introduced utility classes and synthetic card styling that departs from Maritime Operational Minimalism.
- **Production Replacement**:
  - Restored pre-S2 "Sổ ca ghi" list view (`viewMode === 'list'`) mounted inside `ImmersiveSceneShell`.
- **Active Imports**: `0`

---

### 4. `frontend/src/components/ui/SgpPrimitives.tsx`
- **File Status**: Inactive / Deprecated
- **Reason for Removal**:
  - Created during R1 as a wrapper primitive layer coupled to uninstalled Tailwind and custom layout assumptions.
  - Not part of the authoritative Saigon Port UI skill or pre-S2 design system.
- **Production Replacement**:
  - Standard pre-S2 semantic CSS classes defined in `frontend/src/index.css`.
- **Active Imports**: `0`
