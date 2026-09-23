# 03 — Map V2 Architecture & Component Hierarchy

## Executive Summary
This document details the frontend architecture, state boundaries, component hierarchy, and data flow of **Map V2 (Bản đồ V2)** within the Saigon Port Operations Portal (`apps/operations`).

---

## 1. System Architecture & Boundaries

Map V2 is designed as an autonomous, self-contained GIS visualization module isolated from operational meter mutation logic:

```
apps/operations/OperationsApp.tsx
   └── AdminShell.tsx (Navigation & Rail Sidebar)
         └── MapV2Workspace.tsx (Workspace Shell & State Coordinator)
               ├── Header & Metadata Pill (Title, Resolution, Quick Counts)
               ├── MapV2Canvas.tsx (SVG Single Shared Viewport & Canvas Renderer)
               │     ├── Layer 1: Base Map Image (<image href="...png" />)
               │     ├── Layer 2: Operational Zones (<polygon id="v2-poly-*" />)
               │     ├── Layer 3: Warehouses & Admin (<polygon id="v2-poly-*" />)
               │     ├── Layer 4: Boundary & Roads (<polyline / polygon id="v2-line-*" />)
               │     ├── Layer 5: Gate Markers (<g id="v2-marker-*" />)
               │     └── Floating HUD (Zoom In, Zoom Out, Fit to Screen)
               ├── MapV2Layers.tsx (Layer Visibility Control Modal/Popover)
               └── MapV2InspectionPanel.tsx (Read-only Geometry Inspector & Vertex Table)
```

---

## 2. Component Specifications

### 2.1 `MapV2Workspace.tsx`
- **Location**: `frontend/src/components/map-v2/MapV2Workspace.tsx`
- **Role**: Root container mounted when `adminActiveTab === 'map_v2'`.
- **Responsibilities**:
  - Ingests canonical JSON manifest (`tan_thuan_1_zones_edited.json`).
  - Executes runtime structural validation (`validateMapV2Manifest`).
  - Coordinates top-level state: `layerVisibility`, `layersOpen`, `selectedEntity`.
  - Enforces Saigon Port design language (calm maritime navy `#0c1524`, crisp borders `#1e293b`, Be Vietnam Pro typography).

### 2.2 `MapV2Canvas.tsx`
- **Location**: `frontend/src/components/map-v2/MapV2Canvas.tsx`
- **Role**: Mathematical single shared SVG coordinate space renderer.
- **Coordinate Envelope**: `1536 × 1024` pixels.
- **Transformation Model**:
  $$\begin{bmatrix} x' \\ y' \end{bmatrix} = \begin{bmatrix} \text{scale} & 0 \\ 0 & \text{scale} \end{bmatrix} \begin{bmatrix} x \\ y \end{bmatrix} + \begin{bmatrix} \text{panX} \\ \text{panY} \end{bmatrix}$$
  Applied simultaneously to the base image and all vector layers in a single `<g transform="...">` block.
- **Interactions**:
  - **Focal-point wheel zoom**: Zooms centered on cursor coordinate without spatial jump.
  - **Click-drag panning**: Pan freely across canvas with grab/grabbing cursor states.
  - **Fit-to-screen**: Calculates scale factor $\min\left(\frac{W_{\text{viewport}}-40}{1536}, \frac{H_{\text{viewport}}-40}{1024}\right)$ and centers image.

### 2.3 `MapV2Layers.tsx`
- **Location**: `frontend/src/components/map-v2/MapV2Layers.tsx`
- **Role**: Multi-layer toggle popover.
- **Managed Layers**:
  1. Base Map Technical Image (`baseMap`)
  2. Operational Zones (`zones`)
  3. Warehouses & Administration (`buildings`)
  4. Boundary & Internal Roads (`roadsAndBoundaries`)
  5. Gate Control Points (`gates`)

### 2.4 `MapV2InspectionPanel.tsx`
- **Location**: `frontend/src/components/map-v2/MapV2InspectionPanel.tsx`
- **Role**: Read-only vertex inspector and coordinate exporter.
- **Display Fields**: Entity ID, Label, Category, Parent ID, Closed status, total vertex count, and coordinate table with pixel coordinates $[X, Y]$ and normalized $[n_x, n_y]$.
- **Exporting**: One-click JSON copy of vertex array.
- **Safety Invariant**: Strictly read-only; prevents any mutation of source JSON or database records.

---

## 3. Data Flow & Zero-Mutation Invariant

1. Canonical source assets are bundled locally under `frontend/src/components/map-v2/`.
2. Map V2 components perform **zero network mutations**, **zero database writes**, and **zero map publication API requests**.
3. All interactions are contained strictly within React client state.
