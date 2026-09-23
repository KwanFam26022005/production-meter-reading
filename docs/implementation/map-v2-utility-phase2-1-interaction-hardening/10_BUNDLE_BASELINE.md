# 10 — Operations Bundle Baseline (Phase 2.1)

**Project**: Saigon Port Digital Twin & Production Meter Reading  
**Phase**: 2.1 — Real Pointer Interaction & Animation Hardening  
**Command**: `npm run build:operations`  
**Vite Config**: `vite.config.operations.ts`  
**Target Bundle**: `dist/operations/`

---

## 1. Production Bundle Metrics

| Asset / Chunk | Raw Size | Gzip Size | Type | Notes |
|---|---|---|---|---|
| `dist/operations/index.html` | 1.09 kB | 0.56 kB | HTML Entry | Standalone Admin / Operations shell |
| `dist/operations/assets/operations-g61aVbgT.js` | 920.79 kB | 229.15 kB | JavaScript | Full Operations Workspace, Map V2, FSM |
| `dist/operations/assets/operations-DX70Z7fw.css` | 385.48 kB | 60.71 kB | Stylesheet | Maritime tokens, cyber neon, layouts |
| `dist/operations/assets/map-verison3-D9DzEGx3.png` | 2,382.48 kB | N/A | Raster Image | High-res background port asset |
| `dist/operations/assets/tan-thuan-port-v8-cfaZ-ZJs.webp` | 496.99 kB | N/A | WebP Image | Optimized base map raster asset |
| `dist/operations/assets/auth-loading-port-BWRuCCDI.webp` | 130.48 kB | N/A | WebP Image | Operational loading graphic |
| `dist/operations/assets/auth-login-port-hEED9HAp.webp` | 119.94 kB | N/A | WebP Image | Login banner |

---

## 2. Comparison with Phase 2 Baseline

| Metric | Phase 2 Baseline | Phase 2.1 Baseline | Delta | Assessment |
|---|---|---|---|---|
| **JS Bundle (Raw)** | 920.60 kB | 920.79 kB | +0.19 kB (+0.02%) | Negligible; added `mouseIsDownRef` and `pointerEvents` attributes |
| **JS Bundle (Gzip)** | 229.15 kB | 229.15 kB | 0.00 kB (0.00%) | **Zero Gzip increase** |
| **CSS Bundle (Raw)** | 385.48 kB | 385.48 kB | 0.00 kB (0.00%) | Unchanged |
| **Build Time** | 4.08s | 4.61s | +0.53s | Normal variance |
| **Build Exit Status** | Exit Code 0 | Exit Code 0 | None | Clean build |

---

## 3. Bundle Integrity & Isolation Summary

- **Map V1 Isolation**: Map V1 components remain untouched and do not bundle Phase 2.1 utility logic.
- **User Portal Isolation**: `user.html` and `vite.config.user.ts` remain separate entry points with zero leakage.
- **Production Readiness**: Build passes with clean TypeScript typing (`tsc`) and zero compilation errors.
