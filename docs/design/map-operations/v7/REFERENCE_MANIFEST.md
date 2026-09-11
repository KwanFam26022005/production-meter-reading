# Reference Manifest — Tan Thuan Spatial Operations V7

Authoritative Approved Design Package locked on 2026-09-11.

| File | Dimensions | Aspect Ratio | Size (Bytes) | SHA-256 | Role | Allowed Usage | Forbidden Usage |
|---|---|---|---|---|---|---|---|
| tan-thuan-canonical-base.png | 1915x821 | 1915:821 (2.3325) | 2804488 | 38f3ae3c98bf7732242780381bf1124a394f4479b623c31e48082bfa19e35b61 | **CANONICAL_PHYSICAL_V2** | Runtime physical map source | Overlay baked into image, unapproved color changes, resizing with altered aspect ratio |
| tan-thuan-approved-zoning.png | 1672x941 | 1672:941 (1.7768) | 2667698 | cde3fd3d309acf457e79e7ee541c06887174c773e005fdbdd3b427d1cbc1469b | **ZONING_REFERENCE** | Trace/reference polygons, visual relationships, labels | Runtime background, baked assets |
| tan-thuan-interaction-reference.png | 1672x941 | 1672:941 (1.7768) | 2524067 | ccfc68520433df36f102b011f57a465e09cba30ab6a6c748c0cf816c31d1354c | **INTERACTION_REFERENCE** | Interaction state reference, selected-zone focus, non-selected dimming, user and meter markers, context popover hierarchy | Runtime base map |
| tan-thuan-report-storyboard.png | 1672x941 | 1672:941 (1.7768) | 2672103 | ac0c0c176af4413a8c0b5a85e336aee23655dbc31f04e484cd06a132e5a27076 | **STORYBOARD_REFERENCE** | Workflow reference, report screenshot narrative | Runtime map |

## Legacy Map Audit Note

- rontend/src/assets/maps/tan-thuan-canonical.webp (1664x932) is classified as **LEGACY_CANONICAL_V1**.
- It is strictly preserved for rollback and MUST NOT be used as the V7 physical truth.
- All V7 geometry and runtime views are calibrated solely against 	an-thuan-canonical-base.png (1915x821).
