# Evidence-Backed Skill Compliance & Verification Model

**Project:** Production Meter Reading — Cảng Sài Gòn  
**Repository:** `D:\Projects\production-meter-reading\production-meter-reading`  
**Governing Standard:** `AGENTS.md` (Project Root)  
**Date:** 2026-09-23  

---

## 1. Problem Statement: Ceremonial Compliance Reports

Historical Map V2 engineering phases produced standardized 4.5 KB markdown documents titled `SKILL_COMPLIANCE_REPORT.md`. An audit of 37 conversation transcripts revealed that:
1. Skills like `banner-design`, `brand`, `design`, and `slides` were certified as "fully complied with" despite **zero tool invocations (`view_file`)** ever touching their text.
2. The reports were synthesized purely by repeating skill descriptions already injected into the system prompt's metadata.
3. This practice created a false sense of architectural compliance, wasted ~1,200 output tokens per phase, and degraded developer trust in automated auditing.

---

## 2. Epistemic Status Taxonomy

Future task summaries must categorize every customization or skill using a strict, unambiguous 7-tier status taxonomy:

| Status Code | Rigorous Definition | Required Evidentiary Standard |
| :--- | :--- | :--- |
| **`DISCOVERED`** | Skill entry point was successfully parsed and registered in the engine's system prompt metadata (`<skills>`). | Must be verifiable in runtime logs or subagent `<skills>` listing. |
| **`READ`** | Skill entry point (`SKILL.md`) was explicitly opened and read during the session. | Must cite tool transcript invocation: `view_file` on exact path. |
| **`APPLIED`** | Specific instructions or design constraints from the skill directly shaped code, schemas, or configurations. | Must cite specific file changes and corresponding lines of code. |
| **`VERIFIED`** | Implementation compliance was empirically proven via automated test suites, build outputs, or visual captures. | Must cite passing test suite output, build exit code `0`, or image artifact. |
| **`NOT_APPLICABLE`** | Skill was inspected or recognized but falls outside the assigned task's functional scope. | Must provide explicit reason for non-applicability. |
| **`NOT_READ`** | Skill was available in `<skills>` but was intentionally omitted under the progressive disclosure policy. | Recorded as intentionally skipped to preserve context budget. |
| **`UNVERIFIED`** | Guidance was applied, but no automated test or inspection artifact exists to prove adherence. | Must be explicitly labeled to prevent false claims. |

---

## 3. Standardized Reporting Format

Whenever delivering engineering phase reports, replace multi-page narrative boilerplate with the following concise evidence matrix:

| Skill Identifier | Status | Authoritative Source / Path | Concrete Evidence & Verification |
| :--- | :--- | :--- | :--- |
| `saigon-port-ui` | `VERIFIED` | `.agent/skills/saigon-port-ui/SKILL.md` | Scoped operating profiles applied; 40/40 tests passing in `task-118`; Operations Portal built in `task-122`. |
| `ui-ux-pro-max` | `NOT_READ` | `.agents/skills/ui-ux-pro-max/SKILL.md` | Intentionally not read; general UX standards satisfied by existing `saigon-port-ui` rules. |
| `design-system` | `NOT_READ` | `.agents/skills/design-system/SKILL.md` | Token hierarchy already canonically embodied in `frontend/DESIGN_DNA.md`. |
| `ui-styling` | `NOT_READ` | `.agents/skills/ui-styling/SKILL.md` | No new Tailwind classes introduced. |
| `banner-design` | `NOT_APPLICABLE` | `.agents/skills/banner-design/SKILL.md` | Marketing banner generator; irrelevant to core software engineering. |
| `brand` | `NOT_APPLICABLE` | `.agents/skills/brand/SKILL.md` | PR messaging; irrelevant to internal port operations. |
| `design` | `NOT_APPLICABLE` | `.agents/skills/design/SKILL.md` | Graphic identity & logo generation; irrelevant to code optimization. |
| `slides` | `NOT_APPLICABLE` | `.agents/skills/slides/SKILL.md` | Presentation deck generator; irrelevant to application logic. |

---

## 4. Invariants for AI Agents

1. **Never claim compliance with an unread skill:** If `view_file` was not invoked on `SKILL.md`, the status MUST be `NOT_READ` or `NOT_APPLICABLE`.
2. **Metadata presence is not application:** The appearance of a skill name in `<skills>` indicates only that it was `DISCOVERED`, not that it influenced code.
3. **Link to authoritative verification:** All claims of `VERIFIED` must link directly to tool exit codes, test outputs, or generated file artifacts.
