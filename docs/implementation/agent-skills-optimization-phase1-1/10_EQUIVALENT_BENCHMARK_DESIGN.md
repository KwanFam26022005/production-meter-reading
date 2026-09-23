# Equivalent Benchmark Design & Comparison Methodology

**Project:** Production Meter Reading — Cảng Sài Gòn  
**Repository:** `D:\Projects\production-meter-reading\production-meter-reading`  
**Date:** 2026-09-23  
**Auditor Role:** Developer Productivity Benchmark Engineer  

---

## 1. Correction of the Phase 1 Methodology Flaw (Section 17)

In the Phase 1 implementation report ([`07_BEFORE_AFTER_MEASUREMENTS.md`](file:///D:/Projects/production-meter-reading/production-meter-reading/docs/implementation/agent-skills-optimization-phase1/07_BEFORE_AFTER_MEASUREMENTS.md)), the following figures were compared:
- **Historical Baseline:** ~180 model turns and 565 tool calls across a complete multi-day feature implementation phase (Phase 2 Animation).
- **Optimized Execution:** 4 model turns and 5 tool calls for a focused regression and build task.

### Why This Comparison Was Methodologically Invalid:
1. **Divergent Task Scope:** A full feature phase involves open-ended code design, iterative component prototyping, manual visual inspection, and test authoring. A regression benchmark involves executing fixed, existing test and build scripts.
2. **Unsupported Claims:** Treating the difference between 180 turns and 4 turns as a "measured optimization gain" is mathematically unsound and misleading.
3. **Phase 1.1 Remediation:** That historical comparison is formally reclassified as **`NON-EQUIVALENT`**. No percentage savings claims may be derived from contrasting a full development phase with a script execution workload.

---

## 2. Specification of the Reproducible Benchmark Workload (Section 18)

To establish an empirically defensible benchmark, we define a standardized, repeatable engineering workload: **`BM-MAPV2-REGRESSION-BUILD-V1`**.

### The 5-Step Benchmark Sequence:
```text
Step 1 (Targeted Domain Read):
  Inspect frontend/src/components/map-v2/MapV2Workspace.tsx (Lines 1–100)
    ↓
Step 2 (Regression Suite Execution):
  Execute: npx tsx --test tests/mapV2UtilityDemoLayout.test.ts tests/mapV2UtilityPhase2_1InteractionHardening.test.ts
    ↓
Step 3 (Production Build Execution):
  Execute: npm run build:operations
    ↓
Step 4 (Artifact Verification):
  Verify dist/operations/index.html and bundle hashes
    ↓
Step 5 (Evidence Reporting):
  Produce a concise evidence-backed summary table
```

---

## 3. Controlled Experimental Invariants (Section 18 & 19)

For a benchmark comparison to be scientifically valid, both workflows must operate under identical environmental constraints:
- **Repository HEAD:** Exactly `5d37047`.
- **Working Tree State:** Same 18 modified files preserved without changes.
- **Model Engine:** Gemini 3.8 Flash (High) via Antigravity CLI (`agy.exe`).
- **Operating Environment:** Windows 11 Build 26100, PowerShell 7.5.0.
- **Hardware Resources:** Same workstation host; benchmarks executed sequentially to prevent CPU/memory contention.
- **Test Selection:** Exactly the same 40 test assertions in the Map V2 demo layout and interaction hardening test files.
- **Build Configuration:** Identical `vite.config.operations.ts` compiling to `dist/operations`.

---

## 4. Telemetry Rules (Section 20)

1. **Billed Token Telemetry:** Because server-side API billing data is not written to local client logs, token telemetry is reported strictly as **`TOKEN_USAGE_UNAVAILABLE`**.
2. **Character Count Heuristics:** Character counts (~4 chars/token) are reported solely as descriptive engineered estimates and are explicitly disclaimed as API invoices.
3. **No Savings Percentage without Equivalent Telemetry:** Without an equivalent pre-optimization run under identical telemetry logging, no overall token savings percentage will be asserted.
