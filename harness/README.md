# Lean engineering harness

This directory is the declarative execution contract for repository work. It selects the smallest useful context and verification set from changed paths and reviewed semantic impact. The executable runner `tools/harness.py` consumes these files. Future GitLab CI should use the same command IDs and gate rules.

## File ownership

| File | Owns |
| --- | --- |
| `commands.yml` | Canonical commands, repository-relative working directories, and command categories. |
| `impact-map.yml` | Path routing, impact domains, skill routing, minimum modes, and candidate gates. |
| `gates.yml` | FAST/STANDARD/RELEASE policy, gate dependencies, assertions, and escalation. |
| `known-failures.json` | Exact historical backend failure nodes and material reasons. |
| `context-index.yml` | Smallest current authoritative context per impact domain. |
| `requirements.txt` | Isolated Python dependencies for harness execution (`PyYAML`). |
| `README.md` | How to interpret the declarations and use the runner. |

No file here owns product features, design tokens, frozen domain semantics, a task database, or CI implementation.

## Authority boundaries

- **Product truth:** current source and tests, then frozen domain contracts. Compact frozen domain contracts (`docs/contracts/`) define current domain truths; historical handoffs remain available as background evidence. A source/test contradiction requires investigation; do not silently treat a contract or handoff as live behavior without evidence.
- **Design truth:** `frontend/DESIGN_DNA.md` owns measurable design values; scoped skills own interaction and visual guidance.
- **Execution policy:** `AGENTS.md` universal safety and this harness's portable impact/mode routing.
- **Verification policy:** `gates.yml`, with command definitions in `commands.yml` and exact failure history in `known-failures.json`.

Only load skills routed by `impact-map.yml`. The tracked project skills (`saigon-port-ui`, `saigon-port-admin-responsive`, and `saigon-port-map-v2`) apply to their routed UI impacts, not backend-only work. External UX/marketing skills are optional and must not be assumed installed on another machine.

## Choose a mode

1. Match changed files using the specific rules in `impact-map.yml`. Review the semantic effect of shared files before declaring their affected domains.
2. Combine all affected domains and use the strongest minimum mode: `FAST < STANDARD < RELEASE`. Unknown source paths require STANDARD and semantic review. Clearly documentation-only unknown paths can remain FAST with no product gates.
3. A requested mode may raise the level but cannot lower it below the derived minimum. Auth, permissions, schema/migrations, API contracts, and cross-domain behavior require at least STANDARD. Integration/release qualification or build-boundary changes require RELEASE.
4. Resolve gates from the affected domains and mode. Add conditional gates when their documented semantic trigger applies. Respect gate dependencies before execution. Do not run every historical test merely because it exists.

`FAST` covers documentation, harness infrastructure, and isolated low-risk UI work with focused evidence. `STANDARD` covers features, backend/API changes, permissions, and shared semantics with affected suites/builds. `RELEASE` covers integration or release qualification with full backend known-failure comparison, both frontend suites/builds, bundle separation, and applicable Map/spatial/simulation gates. Visual checks still depend on the changed surface.

## Evidence and failure baseline

Full backend regression is a release/integration gate, not a default daily action. Its known failures are compared by exact pytest node ID and material reason, never by aggregate count. A new failed node is a regression; a known node with a changed reason needs review; a formerly failing node that passes is a baseline improvement. Never make a suite fail just to preserve ten historical failures.

`map-b2-freeze` must compare the printed SHA-256 with the declared expected hash; the script's exit code alone is insufficient. `bundle-separation` must follow successful **fresh** User and Operations builds, because its script inspects `dist` artifacts.

## Runner usage

Install isolated dependencies:
```bash
pip install -r harness/requirements.txt
```

### Commands

- `python tools/harness.py plan`: Discover changes, resolve impact domains, mode, context, skills, and gates.
- `python tools/harness.py verify`: Execute resolved gates and assert results.

### Options

- `--base <ref>`: Plan/verify a committed git range (`<ref>...HEAD`) plus local changes. When omitted, plans local staged/unstaged/untracked changes against `HEAD`.
- `--mode FAST|STANDARD|RELEASE`: Request a mode. Escalation is permitted; downgrades below derived minimum are rejected.
- `--impact <domain>`: Declare explicit impact domain(s) for shared semantic files or unmatched paths (repeatable).
- `--include-gate <gate-id>`: Explicitly activate a reviewed conditional gate (repeatable).
- `--test-node <node-id>`: Supply required pytest node IDs when `backend-focused` is selected (repeatable).
- `--json`: Output machine-readable JSON for CI integration.
- `--dry-run`: (verify only) Simulate execution without running commands.

### Exit codes

- `0`: Plan ready / verification passed (including accounted known failures).
- `1`: Verification regression or command execution failure.
- `2`: Incomplete or blocked (manual gate required, semantic review unresolved, input required).
- `3`: Configuration integrity error or invalid usage (mode downgrade, dependency cycle).

### Manual gates

Gates marked `automation_status: manual` (such as `admin-responsive-small` and `admin-responsive-full`) output their required viewport matrix and checklist, returning status `MANUAL_REQUIRED` (exit code 2). They never fabricate automatic `PASS`.
