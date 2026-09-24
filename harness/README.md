# Lean engineering harness

This directory is the declarative execution contract for repository work. It selects the smallest useful context and verification set from changed paths and reviewed semantic impact. It does not execute commands today; the planned H4 runner will consume these files. Future GitLab CI should use the same command IDs and gate rules.

## File ownership

| File | Owns |
| --- | --- |
| `commands.yml` | Canonical commands, repository-relative working directories, and command categories. |
| `impact-map.yml` | Path routing, impact domains, skill routing, minimum modes, and candidate gates. |
| `gates.yml` | FAST/STANDARD/RELEASE policy, gate dependencies, assertions, and escalation. |
| `known-failures.json` | Exact historical backend failure nodes and material reasons. |
| `context-index.yml` | Smallest current authoritative context per impact; planned H2/H3 replacements. |
| `README.md` | How to interpret the declarations and their authority boundaries. |

No file here owns product features, design tokens, frozen domain semantics, a task database, or CI implementation.

## Authority boundaries

- **Product truth:** current source and tests, then frozen domain contracts. Current 9A–9C handoffs stand in for planned H3 contracts. A source/test contradiction requires investigation; do not silently treat a handoff as live behavior.
- **Design truth:** `frontend/DESIGN_DNA.md` owns measurable design values; scoped skills own interaction and visual guidance.
- **Execution policy:** `AGENTS.md` universal safety and this harness's portable impact/mode routing.
- **Verification policy:** `gates.yml`, with command definitions in `commands.yml` and exact failure history in `known-failures.json`.

Only load skills routed by `impact-map.yml`. The tracked `saigon-port-ui` skill applies to UI impacts, not backend-only work. H2 Admin and Map skills are explicitly planned, not present. External UX/marketing skills are optional and must not be assumed installed on another machine.

## Choose a mode

1. Match changed files using the specific rules in `impact-map.yml`. Review the semantic effect of shared files before declaring their affected domains.
2. Combine all affected domains and use the strongest minimum mode: `FAST < STANDARD < RELEASE`. Unknown source paths require STANDARD and semantic review. Clearly documentation-only unknown paths can remain FAST with no product gates.
3. A requested mode may raise the level but cannot lower it below the derived minimum. Auth, permissions, schema/migrations, API contracts, and cross-domain behavior require at least STANDARD. Integration/release qualification or build-boundary changes require RELEASE.
4. Resolve gates from the affected domains and mode. Add conditional gates when their documented semantic trigger applies. Respect gate dependencies before execution. Do not run every historical test merely because it exists.

`FAST` covers documentation and isolated low-risk UI work with focused or affected evidence. `STANDARD` covers features, backend/API changes, permissions, and shared semantics with affected suites/builds. `RELEASE` covers integration or release qualification with full backend known-failure comparison, both frontend suites/builds, bundle separation, and applicable Map/spatial/simulation gates. Visual checks still depend on the changed surface.

For this H1 configuration-only change, `FAST` and `docs-integrity` are enough. Product tests and builds are not part of its gate.

## Evidence and failure baseline

Full backend regression is a release/integration gate, not a default daily action. Its known failures are compared by exact pytest node ID and material reason, never by aggregate count. A new failed node is a regression; a known node with a changed reason needs review; a formerly failing node that passes is a baseline improvement. Never make a suite fail just to preserve ten historical failures.

`map-b2-freeze` must compare the printed SHA-256 with the declared expected hash; the script's exit code alone is insufficient. `bundle-separation` must follow successful **fresh** User and Operations builds, because its script inspects `dist` artifacts.

The future runner's smallest useful surface is `plan` (paths, impacts, context, skills, mode, gates) and `verify` (run selected commands, assert outputs, compare known failures, report briefly). This directory is data for that runner and for future GitLab translation; no daemon, database, workflow engine, or plugin layer is needed.
