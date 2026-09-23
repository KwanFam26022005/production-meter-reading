# 01 — Source Asset Audit

## Executive Summary
This document provides the authoritative audit of the canonical base map image and the user-edited zoning geometry provided for the implementation of **Map V2 (Bản đồ V2)** in the Operations Portal of Cảng Sài Gòn (Cảng Tân Thuận 1).

---

## 1. Authoritative Input Files

### 1.1 Base Map Image
- **Original Source File Path**: `D:\Users\map-verison3.png`
- **Typo Invariant**: The filename `map-verison3.png` is preserved intentionally (not renamed to `map-version3.png`).
- **File Size**: `2,382,481` bytes
- **File Format**: `PNG` (Portable Network Graphics), Color Mode: `RGB` (8-bit per channel)
- **Pixel Dimensions**: `1536 × 1024` pixels (Width: 1536 px, Height: 1024 px)
- **Aspect Ratio**: `3:2` (1.500)
- **SHA-256 Checksum**:
  ```
  0c9305fa156e48de5e742f260d3f3b6902623bef3c27a0be32d084e8cc9fc522
  ```

### 1.2 User-Edited Geometry Manifest
- **Original Source File Path**: `D:\Users\tan_thuan_1_zones_edited (1).json`
- **Whitespace & Special Characters**: File path contains whitespace and parentheses; handled natively with exact path resolution.
- **File Size**: `29,746` bytes
- **Encoding**: UTF-8 (no BOM)
- **Schema Identifier**: `"port-zoning-image-pixels/v1"`
- **Manifest Title**: `"Tân Thuận 1 - polygon và polyline phân khu"`
- **Internal Referenced Image Metadata**:
  - `file_name`: `"e7559223-1522-4bee-a796-6465681c3ce9.png"`
  - `width`: `1536`
  - `height`: `1024`
  - `coordinate_system`: `"image-pixels"`
  - `origin`: `"top-left"`
  - `x_direction`: `"right"`
  - `y_direction`: `"down"`
- **SHA-256 Checksum**:
  ```
  ae4085172e730591975fc0e8b7795bf84ca8a18b2363c0a8acb1a259f64dc02e
  ```

---

## 2. Project-Managed Ingestion Copies

To adhere to the frontend Vite modular bundling architecture and prevent asset leakage into the User Portal (PWA), project-managed copies were placed in the dedicated Map V2 component directory:

| Original Source File | Project Managed Destination Path | SHA-256 Verified Match |
| :--- | :--- | :---: |
| `D:\Users\map-verison3.png` | `frontend/src/components/map-v2/assets/map-verison3.png` | **MATCH (Identical)** |
| `D:\Users\tan_thuan_1_zones_edited (1).json` | `frontend/src/components/map-v2/data/tan_thuan_1_zones_edited.json` | **MATCH (Identical)** |

---

## 3. Spatial Alignment Verification

- **Dimensional Parity**: The base map image dimensions (`1536 × 1024`) exactly equal the JSON manifest dimensions (`1536 × 1024`).
- **Scale Factor**: 1.0 (no scaling, cropping, translation, or rotation required).
- **Coordinate Bounds**: All 167 vertex coordinates in the JSON manifest fall strictly within $[0, 1536] \times [0, 1024]$.
- **Zero Shift Guarantee**: The base map and geometry share an identical origin at top-left $(0, 0)$.
