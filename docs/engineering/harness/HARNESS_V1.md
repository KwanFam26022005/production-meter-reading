# Lean SE Harness V1 — Architecture & Freeze Record

## Status
`FROZEN / READY_FOR_GITLAB`

## Baselines
- **Product Baseline:** Thread 9C ([`c469814645253b16f8e9908633a9081bd2402856`](https://github.com/KwanFam26022005/production-meter-reading/commit/c469814645253b16f8e9908633a9081bd2402856))
- **Harness Baseline:** H5 Freeze Commit ([`infra/lean-se-harness-foundation`](https://github.com/KwanFam26022005/production-meter-reading/tree/infra/lean-se-harness-foundation))

---

## 1. System Architecture

The Lean SE Harness provides declarative policy and an executable runner that selects the smallest safe context and verification surface for engineering tasks.

```
                  AGENTS.md (Universal Safety & Skill Routing)
                                      │
              ┌───────────────────────┴───────────────────────┐
              ▼                                               ▼
    harness/ (Declarative Policy)                  docs/contracts/ (Compact Domain Truth)
    ├── commands.yml (19 commands)                 ├── reading-schedule.md (59 lines)
    ├── gates.yml (21 gates)                       ├── operational-assignment.md (62 lines)
    ├── impact-map.yml (13 domains)                ├── user-task-projection.md (72 lines)
    ├── known-failures.json (10 nodes)             └── map-v2.md (76 lines)
    └── context-index.yml (contexts & skills)
              │                                               │
              └───────────────────────┬───────────────────────┘
                                      ▼
                        tools/harness.py (Thin Runner)
                          ├── plan   (impact, mode, gates)
                          └── verify (dependencies, execute, assert)
```

---

## 2. Execution Modes

| Mode | Purpose | Policy & Gate Additions |
| :--- | :--- | :--- |
| **FAST** | Documentation, harness infrastructure, isolated UI fixes | Mode `always_gates` (`docs-integrity`) + domain primary gates. |
| **STANDARD** | Features, backend/API logic, permissions, shared semantics | Adds domain `standard_additions` (e.g. builds, focused suites). |
| **RELEASE** | Merge qualification, build boundary, release qualification | Adds `release_additions`. Explicit `--mode RELEASE` triggers `full_qualification_gates`. |

- **Escalation:** Requested modes may elevate (FAST → STANDARD → RELEASE).
- **Downgrade Safety:** Downgrades below the derived minimum are strictly rejected (`MODE_DOWNGRADE_REJECTED`, exit code 3).

---

## 3. Standard Operational Workflow

1. **Plan:** `python tools/harness.py plan [--base <ref>] [--impact <domain>]`
   - Discovers staged, unstaged, and untracked changes (or committed range against `--base`).
   - Resolves affected domains, minimum mode, required skills, and primary contexts.
2. **Context Inspection:** Inspect only the compact contracts and primary files identified in the plan. Never recursively dump historical dossiers.
3. **Implementation:** Modify only allowed files within scope.
4. **Verification:** `python tools/harness.py verify [--base <ref>] [--test-node <id>]`
   - Executes topologically ordered gates with dependency freshness.
   - Asserts exact B2 geometry SHA-256 and compares pytest failure sets against known baselines.

---

## 4. Old vs. New Workflow Comparison (Thread 9C Benchmark)

| Dimension | Historical 9C Process | Lean Harness V1 Equivalent | Measurable Delta |
| :--- | :--- | :--- | :--- |
| **Context Sources** | Full 9A, 9B, and 8B handoffs + dossiers loaded routinely (~250+ lines each) | Compact contracts only via [`context-index.yml`](../../harness/context-index.yml) | **0** historical handoffs loaded automatically |
| **Test/Gate Selection** | Ran 10 full test suites indiscriminately (484+ tests, ~45s) | Impact-based targeted gates (`backend-9c`, `user-suite`, `user-build`) | **6** unrelated test suites omitted |
| **Build Execution** | Built both User and Operations bundles regardless of changed surface | Only affected portal bundle built | **1** full Vite production build omitted |
| **Visual Evidence** | Required manual Playwright screenshot script capture (13+ PNGs) | Truthful `MANUAL_REQUIRED` checklist for affected viewports | Visual checklist without heavy headless browser runs |
| **Documentation** | 17 separate markdown phase files (~3,000+ lines) | Single compact implementation note or PR description | Vastly reduced ceremony |
| **Skill Loading** | Auto-loaded external skills (`ui-ux-pro-max`, etc.) | Tracked project skills only when routed (`saigon-port-ui`) | External skills remain optional; no data directory dumping |
| **Failure Attribution** | Manual manual comparison against pass/fail totals | Automatic exact set comparison against 10 baseline node IDs | Caught new regressions regardless of aggregate count |

---

## 5. Architectural Decisions

### 5.1 Shared `frontend/src/index.css` Decision: Option B
- **Decision:** Adopted **Option B** with declarative rule `review_can_narrow_mode: true`.
- **Rationale:** Physical file sharing previously forced all CSS edits to `STANDARD` mode, triggering unnecessary production builds for minor Admin modal adjustments. Under Option B, unreviewed CSS changes remain `BLOCKED_SEMANTIC_REVIEW` at `STANDARD`. Once an operator confirms selector isolation via `--impact admin-responsive`, mode derives from the declared domain (`FAST`), skipping the build while preserving `operations-suite` and `admin-responsive-small` verification.

### 5.2 Material Reason Verification Honesty
- Text-based pytest output matching cannot reliably verify that an assertion failure matches the historical material reason.
- Harness V1 honestly reports `reason_check: UNVERIFIED_REASON` for accounted known failures. Structured JUnit/XML parsing is deferred.

### 5.3 Windows Command Resolution Portability
- **Decision:** Use an explicit argv[0] executable resolver via `shutil.which` without enabling `shell=True`.
- **Rationale:** On Windows, `subprocess.run(shell=False)` with extensionless command names (e.g. `npm`, `npx`) fails with `WinError 2` because `CreateProcessW` does not resolve `.cmd` launcher shims from `PATHEXT`. The resolver maps tool names to launchable shims (`npm.cmd`) while rejecting `.ps1`, preserving argv-based isolation, exact error attribution, and POSIX compatibility.

---

## 6. Known Limitations & Deferred Work

1. **Manual Responsive Gates:** `admin-responsive-small` and `full` return `MANUAL_REQUIRED` (exit code 2) until visual headless testing is implemented.
2. **Semantic Review:** Still human-assisted via CLI `--impact <domain>`.
3. **Structured Failure Reasons:** Requires pytest JUnit XML reporting in future CI.
4. **GitLab CI/CD:** Native GitLab pipeline definitions (`.gitlab-ci.yml`) deferred to subsequent phases.
