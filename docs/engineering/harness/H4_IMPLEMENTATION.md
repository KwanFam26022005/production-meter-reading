# H4 Implementation Note — Thin Executable Lean SE Harness

## Purpose
`tools/harness.py` provides an executable CLI for impact-based planning and verification. It consumes declarative repository policy from `harness/` and compact domain truths from `docs/contracts/` without introducing a heavyweight orchestration framework.

## Key Design Decisions

### 1. Changed-File Strategy
- **Local working-tree mode (default)**: When `--base` is omitted, the runner discovers staged changes, unstaged changes, and untracked files relative to `HEAD`. If the tree is clean, it returns `NO_LOCAL_CHANGES` (exit code 2) rather than guessing a baseline commit.
- **Committed range mode (`--base <ref>`)**: The runner inspects `git diff --name-only <ref>...HEAD` and uncommitted changes. All path separators are normalized to `/` to ensure identical behavior on Windows and Linux.
- **Base-aware diff checking**: For `docs-diff-check`, the runner appends `--base` directly (`git diff --check <base>`), preventing false passes when checking committed changes.

### 2. Semantic Review & Explicit Impact
- Files declared in `harness/impact-map.yml` under `shared_files` (e.g. `models.py`, `main.py`, `types.ts`, `api.ts`) immediately trigger `SEMANTIC_REVIEW_REQUIRED`.
- The runner blocks verification (`BLOCKED_SEMANTIC_REVIEW`, exit code 2) unless the caller resolves the review by passing explicit affected domain(s) via `--impact <domain>`.
- Explicit impacts are validated against declared domains in `impact-map.yml`. Cross-domain expansions are supported without silent rejection.

### 3. Mode Resolution & Downgrade Prevention
- Modes follow `FAST < STANDARD < RELEASE`.
- The runner computes the derived minimum mode across all affected paths and domains.
- A user may escalate mode (`--mode STANDARD` or `--mode RELEASE`), but downgrades below the derived minimum are strictly rejected (`MODE_DOWNGRADE_REJECTED`, exit code 3).
- Full release qualification gates (`full_qualification_gates`) are only triggered when the user explicitly requests `--mode RELEASE`, keeping derived `deployment` changes focused on their affected gates.

### 4. Known-Failure Parsing & Limitation
- For `backend-full`, pytest failure node IDs are extracted via regex from output and compared against `harness/known-failures.json`.
- If the failed set exactly matches the 10 known historical failures, the gate qualifies as `QUALIFIED_WITH_KNOWN_FAILURES`. Any unrecorded failure produces `NEW_FAILURE` and gate failure (`FAIL`).
- **Limitation**: Text-based pytest output cannot reliably distinguish whether a known failing test failed for the exact same material reason or a new reason. The runner honestly records `reason_check: UNVERIFIED_REASON` rather than emitting fragile heuristics.

### 5. Manual Responsive Gates
- Responsive UI acceptance gates (`admin-responsive-small`, `admin-responsive-full`) have declarative status `automation_status: manual`.
- The runner outputs the required viewport matrix, zoom levels, and acceptance checklist, returning `MANUAL_REQUIRED` (exit code 2). It never fabricates an automated `PASS`.

### 6. Dependency Freshness & Isolation
- `bundle-separation` requires `user-build` and `operations-build`.
- The runner tracks gate success within the *current* `verify` execution. Pre-existing `frontend/dist/` artifacts do not satisfy freshness; if dependencies fail in the current run, dependents are marked `SKIPPED_DEPENDENCY_FAILURE`.

### 7. Process Exit Codes
- `0`: Plan ready / verification qualified.
- `1`: Verification regression or command execution failure.
- `2`: Incomplete or blocked (manual gate required, semantic review unresolved, input required).
- `3`: Configuration integrity error or invalid usage (mode downgrade, dependency cycle).

### 8. Isolated Dependencies
- The runner requires `PyYAML` to parse declarative policies. This dependency is isolated in `harness/requirements.txt` (`PyYAML>=6.0.0,<7.0.0`) to avoid polluting `backend/requirements.txt`.
