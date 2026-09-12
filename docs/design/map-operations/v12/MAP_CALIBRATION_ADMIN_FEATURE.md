# V12 — Promote Map Calibration into a First-Class Admin Feature + Geometry Draft/Publish Workflow

**Location:** Tan Thuan Port Map Operations  
**Map Version:** `tan-thuan-v10`  
**Coordinate System:** `tan-thuan-canonical-image-pixel-space-v1` ($1915 \times 821$)  
**Baseline Artifact:** `tanThuanPresentationGeometry.v10.json`  

---

## 1. Executive Summary & Objective

In V10, landmark-calibrated spatial geometry was established for Tan Thuan Port with high geometric precision. However, accessing calibration required developer knowledge of the query parameter `?mapCalibration=1`.

**V12 elevates map calibration into a permanent, first-class administrative feature** inside the standard Map Operations workspace while:
1. **Preserving 100% of canonical geometry** ($1915 \times 821$, 6 presentation zones, 12 meters).
2. **Implementing strict Role-Based Access Control (RBAC)**: Only `ADMIN` and `MANAGER` roles can access calibration.
3. **Establishing a Draft/Publish Workflow**: Draft edits are completely isolated from active runtime geometry until validated and applied.
4. **Enforcing Pre-Publish Validation Gating**: Prevents self-intersecting polygons, anchor drifts, and meter assignment regressions.
5. **Guaranteeing Deterministic Import/Export**: Versioned, timestamped JSON manifests with schema pre-flight validation.

---

## 2. Role-Based Access Control (RBAC) & Admin Entry Point

Ordinary field operators reading meters should never see spatial calibration tools or clutter.

### 2.1 Permission Function
Defined in `src/types.ts`:
```typescript
export function canAdministerMapConfiguration(user?: User | null): boolean {
  if (!user || !user.role) return false;
  const normalized = user.role.trim().toUpperCase();
  return (
    normalized === 'ADMIN' ||
    normalized === 'ROLE_ADMIN' ||
    normalized === 'MANAGER' ||
    normalized === 'ROLE_MANAGER'
  );
}
```

### 2.2 UI Entry Point
- **Segmented View Switcher**: Remains uncluttered with only `[Bản đồ]` and `[Danh sách]`.
- **Top Overflow Menu (`MoreVertical`)**:
  - When `canAdministerMapConfiguration(user)` is `true`, an administrative section appears containing **"Hiệu chỉnh bản đồ"** with a `Compass` icon.
  - When `false` (ordinary operators, supervisors, staff), this item is omitted entirely.
- **Backward Compatibility**: Visiting `?mapCalibration=1` automatically calls `openMapCalibration()` for existing developer workflows.

---

## 3. Workspace Architecture & View Normalization

The Map Operations workspace view mode is normalized into a three-state union:
```typescript
export type MapWorkspaceView = 'map' | 'list' | 'calibration';
```

### 3.1 Lifecycle & State Invariants
- **Entering Calibration (`openMapCalibration`)**:
  - Automatically collapses and closes all contextual drawers (Analytics drawer, Zone drawer, Operator drawer).
  - Resets map inspection to `browse` mode.
  - Preserves previous view (`'map'`) for clean return.
  - Hides normal runtime dashboard chrome (telemetry strips, alert counters, search bar).
- **Exiting Calibration (`closeMapCalibration`)**:
  - Prominently accessible via `← Trở lại bản đồ` in the top bar.
  - If `isGeometryDirty` is `true`, prompts confirmation modal:
    - **[Hủy thay đổi]**: Discards unsaved edits, restores published geometry, and returns to Map.
    - **[Tiếp tục chỉnh]**: Closes the modal and remains in the editor.
    - **[Lưu bản nháp]**: Persists draft to browser `localStorage` and returns to Map.
  - Clears `?mapCalibration=1` query parameter from the browser URL without page reload.

---

## 4. Draft vs Published Geometry Isolation

```
+-------------------------------------------------------------------+
|                     V10 Canonical Baseline                        |
|              (tanThuanPresentationGeometry.v10.json)              |
+-------------------------------------------------------------------+
                                  │
                                  ▼
+---------------------------------+---------------------------------+
|                                                                   |
| [Runtime Published Geometry]          [Admin Draft Geometry]      |
| - Used by 'map' & 'list' views        - Active only in editor     |
| - Pure read-only session state         - Mutated by vertex drags   |
| - Never altered during editing        - Dirty state tracked       |
|                                       - Persisted in localStorage |
+---------------------------------+---------------------------------+
                                  │
                       Pre-Publish Gate Check
                                  │
                                  ▼
                   [Áp dụng geometry / JSON Export]
```

1. **Isolation**: Dragging polygon vertices or moving anchors in calibration mode mutates `draftGeometry` ONLY. `publishedGeometry` remains immutable during editing.
2. **Dirty Tracking (`isGeometryDirty`)**: Dynamically computes deep structural equality between `draftGeometry` and `publishedGeometry`.
3. **Local Draft Persistence**:
   - Stored in browser `localStorage` under key `tan-thuan-map-calibration-draft:v10`.
   - Allows administrators to safely close the tab and resume calibration later without losing unsaved changes.

---

## 5. Pre-Publish Validation Gate

Before geometry can be applied or published, it must pass all 5 structural gates in `validatePrePublishGeometry()`:

| Gate Check | Requirement | Severity |
| :--- | :--- | :--- |
| **Dimensions** | Strictly $1915 \times 821$ pixels | Error (blocks apply) |
| **Coordinate System** | `tan-thuan-canonical-image-pixel-space-v1` | Error (blocks apply) |
| **Zone Count** | Exactly 6 presentation zones (`pres-berth`, `pres-container-west`, `pres-container-center`, `pres-cfs-east`, `pres-technical`, `pres-gate`) | Error (blocks apply) |
| **Simple Polygons** | No self-intersecting edges (checked via 2D segment intersection sweep) | Error (blocks apply) |
| **Polygon Area** | Non-degenerate area ($\ge 1000\text{ px}^2$) | Error (blocks apply) |
| **Anchor Containment** | `labelAnchorCanonical` and `operatorAnchorCanonical` strictly inside polygon | Error (blocks apply) |
| **Meter Containment** | 100% of 12 canonical meters strictly contained within assigned zones | Error (blocks apply) |
| **Landmark Integrity** | All vertex landmark references exist in the landmark catalog | Warning |

---

## 6. Import / Export Specification

### 6.1 JSON Export
- **File Naming Format**:
  $$\text{tanThuanPresentationGeometry.v10.}YYYYMMDD-HHmmss\text{.json}$$
  *Example:* `tanThuanPresentationGeometry.v10.20260912-143045.json`
- **Payload**: Formatted JSON containing `schemaVersion`, `mapVersion`, `canonicalWidth`, `canonicalHeight`, `zones`, and `landmarks`.

### 6.2 JSON Import
- Administrator can upload a geometry JSON file or paste JSON directly.
- **Pre-flight Validation (`validateImportJson`)**:
  - Verifies valid JSON syntax.
  - Verifies $1915 \times 821$ canvas bounds.
  - Verifies exactly 6 presentation zones.
  - Verifies polygon vertex arrays have $\ge 3$ points.
  - Safely displays error messages without crashing the application.

---

## 7. Authoritative Deployment Model

In a static client-side web application without a backend geometry database API:
1. **Session Publish ("Áp dụng geometry")**:
   - Updates `publishedGeometry` in active memory for the current browser session.
   - Clears the draft in `localStorage`.
   - Prompts download of the canonical artifact `tanThuanPresentationGeometry.v10.<timestamp>.json`.
2. **Git Deployment Authority**:
   - The file `frontend/src/features/map-operations/geometry/tanThuanPresentationGeometry.v10.json` is the sole source of truth in version control.
   - To make calibrated geometry permanent across all operators and deployments, the administrator/engineer commits the validated JSON file to Git.

---

## 8. Anchor & Landmark Audit Findings

Comprehensive runtime audit of `tanThuanPresentationGeometry.v10.json`:

| Zone ID | Label Anchor | Operator Anchor | Label Inside? | Op Inside? | Min Clearance |
| :--- | :---: | :---: | :---: | :---: | :---: |
| `pres-berth` | (435, 110) | (520, 160) | **YES** | **YES** | 98.6 px |
| `pres-container-west` | (785, 335) | (755, 415) | **YES** | **YES** | 85.4 px |
| `pres-container-center` | (1220, 340) | (1180, 420) | **YES** | **YES** | 89.4 px |
| `pres-cfs-east` | (1750, 335) | (1838, 445) | **YES** | **YES** | 140.7 px |
| `pres-technical` | (1145, 575) | (1100, 740) | **YES** | **YES** | 171.0 px |
| `pres-gate` | (1742, 550) | (1790, 580) | **YES** | **YES** | 56.6 px |

- **Landmarks**: 44 vertex landmarks synchronized with canonical landmark coordinates ($0\text{ px}$ discrepancy).
- **Meters**: 12/12 canonical meters strictly contained inside assigned presentation zones.

---

## 9. Verification & Test Coverage

11 automated tests in `frontend/tests/v12CalibrationAdminFeature.test.ts` (111 total tests across suite, 100% passing):
- RBAC authorization and rejection.
- V10 baseline dimensions and zone preservation.
- Pre-publish structural validation gating (positive & negative cases).
- 100% anchor containment audit across all 6 zones.
- JSON import validation & error handling.
- Deterministic timestamped export file formatting.
- Draft isolation & dirty state tracking.
- `localStorage` persistence and corruption resilience.
- Query-param `?mapCalibration=1` backward compatibility.
- 10x repeated workspace view transitions maintaining single-surface invariants.
