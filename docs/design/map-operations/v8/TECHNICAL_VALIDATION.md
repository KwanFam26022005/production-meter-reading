# V8 Technical Validation & Verification Suite — Cảng Tân Thuận

## Verification Philosophy

Per Gate 17 instructions:
- ZERO screenshot QA or visual galleries.
- 100% deterministic, automated technical assertions.

## Test Suite Summary

Total Tests: **68 Passing** (59 baseline regression + 9 spatial calibration)

### 1. SOURCE TEST
- Confirms runtime asset originates from authoritative canonical base.
- Verifies SHA-256 matches manifest (`38f3ae3c98bf...`).
- Asserts deprecated assets (`tan-thuan-canonical-v2.webp`, `tan-thuan-canonical.png`, `tan-thuan-canonical.webp`) are not referenced.

### 2. SOURCE DIMENSION TEST
- Verifies aspect ratio $1915 / 821 pprox 2.332521$.
- Confirms viewBox equals `"0 0 1915 821"`.

### 3. COORDINATE ROUNDTRIP TEST
- Verifies $	ext{normalized} 	o 	ext{canonical} 	o 	ext{normalized}$ roundtrip error $< 10^{-4}$.

### 4. POLYGON TEST
- Asserts all presentation zone vertices reside within $[0, 1915] 	imes [0, 821]$.
- Validates label anchors and operator anchors are within canonical boundaries.

### 5. METER TEST
- Asserts 100% of 12 production meters are contained inside their assigned presentation zone polygon.
- Confirms out-of-bounds coordinates return `INVALID_SPATIAL_ASSIGNMENT`.

### 6. PLACEMENT TEST
- Mathematical roundtrip between screen pixels and canonical pixels matches with zero drift ($\le 1	ext{px}$).

### 7. RESIZE INVARIANCE TEST
- Validates canonical coordinates of all entities across 1920×1080, 1440×900, 1366×768, 1024×768 viewports.

### 8. CAMERA TEST
- Verifies safe viewport padding across browse, inspect, and details modes.

### 9. STATE TEST
- Verifies single-surface invariant (inspector and context rail never simultaneously mounted).
