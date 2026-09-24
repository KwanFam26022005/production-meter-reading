# Saigon Port — repository agent routing

**Project:** Production Meter Reading — Cảng Sài Gòn. The product serves field meter readers, Operations staff, and the Map V2 workspace. Keep product behavior and frozen domain meanings intact unless the task explicitly changes them.

## Plan from the harness

1. Classify changed paths with [`harness/impact-map.yml`](harness/impact-map.yml). Review the meaning of shared files before declaring affected domains. An unknown source path requires explicit impact review; a clearly documentation-only change can stay FAST.
2. Use [`harness/context-index.yml`](harness/context-index.yml) to read the smallest current authoritative context. Do not recursively dump `.agent/`, `.agents/`, `docs/`, `frontend/`, or `backend/`; inspect targeted files and expand only when evidence conflicts.
3. Select FAST, STANDARD, or RELEASE and the affected gates from [`harness/gates.yml`](harness/gates.yml). [`harness/commands.yml`](harness/commands.yml) owns command IDs and working directories. A user may request a stricter mode, not a mode below the derived minimum.
4. For current known backend failures, use exact node IDs and material reasons in [`harness/known-failures.json`](harness/known-failures.json). Historic pass/fail totals are evidence, not a substitute for a current gate result.

Use `python tools/harness.py plan` and `python tools/harness.py verify` for executable planning and verification with the recorded commands and gate dependencies.

## Skill routing

| Impact | Load only when relevant |
| --- | --- |
| Backend/API/database | No UI skill. Read affected source, tests, and routed domain context. |
| User Portal UI | `.agent/skills/saigon-port-ui/SKILL.md`. |
| Operations UI | Shared `saigon-port-ui`; add `saigon-port-admin-responsive` for adaptive Admin layout work. |
| Map V2 or simulation UI | Shared `saigon-port-ui` plus `saigon-port-map-v2`. |

`frontend/DESIGN_DNA.md` owns measurable colors, typography, spacing, component sizes, and contrast values; read relevant sections when design values matter. Project skills own UI judgment. Normal product semantic context comes from compact contracts in `docs/contracts/` through `harness/context-index.yml`.

External `ui-ux-pro-max` is optional for difficult UX/accessibility cases. External `banner-design`, `brand`, `design`, and `slides` are optional for requested marketing or presentation work. Do not auto-load, copy, or require external skills for ordinary engineering. Never dump their data directories.

## Universal safety and execution

- Check the required branch, full HEAD SHA, and clean worktree before branch-sensitive work. If a checkpoint differs, stop; do not reset, switch branches, stash, clean, or discard work to force a match.
- Keep edits within the task's allowed files. Do not alter product behavior, frozen geometry, data, or historical evidence as a side effect of instruction work. Explain and justify any destructive or irreversible action before taking it.
- Let short commands finish synchronously where practical. For long background work, continue independent work or yield; do not busy-poll status or use shell sleep loops as orchestration.
- Preserve user-specified scope and verification limits. Run the selected gates once, honor dependencies, and report what actually ran. A documentation-only change does not need product tests or builds.
- If source/tests, handoffs, design guidance, or harness policy disagree, identify the owner of that concern and investigate. Do not silently resolve a product-semantic conflict in a skill or design document.
- Give concise evidence: changed files, selected mode/gates, results or why a gate was not run, known-failure delta when relevant, and remaining limits. Do not produce a separate ceremonial list of every unread skill.
