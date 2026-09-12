# V8 Map Source Contract — Cảng Tân Thuận

## Authoritative Source Specification

The spatial visualization of Saigon Port (Cảng Tân Thuận) is strictly bound to a single authoritative visual truth:

| Property | Value |
| :--- | :--- |
| **Authoritative File** | `docs/design/map-operations/reference/tan-thuan-canonical-base.png` |
| **Role** | ONLY authoritative runtime geographical and background image |
| **Pixel Dimensions** | `1915 × 821` pixels |
| **Aspect Ratio** | `1915 / 821` (≈ 2.33252132) |
| **SHA-256 Checksum** | `38f3ae3c98bf7732242780381bf1124a394f4479b623c31e48082bfa19e35b61` |
| **Coordinate System ID** | `tan-thuan-canonical-image-pixel-space-v1` |
| **Runtime Background Policy** | `canonical-base-only` |

## Design Reference Hierarchy (Non-Runtime)

The following reference assets provide design guidance only and are strictly forbidden from serving as runtime map imagery:
- `tan-thuan-approved-zoning.png`: Reference only for the 6 visual presentation regions (1672×941).
- `tan-thuan-interaction-reference.png`: Reference only for operator/meter visual grammar (1672×941).
- `tan-thuan-report-storyboard.png`: Reference only for interaction and placement workflows (1672×941).

## Machine-Readable Manifest

The authoritative manifest is version-controlled at:
`docs/design/map-operations/reference/map-source.manifest.json`

## Runtime Asset Derivation Chain

The runtime asset is compiled exclusively from the canonical base:
- **Source**: `docs/design/map-operations/reference/tan-thuan-canonical-base.png`
- **Derived WebP**: `frontend/src/assets/maps/tan-thuan-port-v8.webp` (496,992 bytes, SHA-256 `13e48d4fb09e288c27cd9db0e3345514f3af7e53812c42652f23b937681bd4d6`)
- **Dimensions**: Strictly preserved at 1915×821 with zero cropping or re-scaling.

## Code Consumption Standard

Map components must never import raw image files. All spatial scenes import from:
`frontend/src/features/map-operations/config/tanThuanMapSource.ts` via `TanThuanMapSource`.
