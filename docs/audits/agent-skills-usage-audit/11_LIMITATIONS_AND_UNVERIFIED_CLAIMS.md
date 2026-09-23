# Limitations, Boundary Conditions, and Unverified Claims

**Project:** Production Meter Reading — Cảng Sài Gòn  
**Repository:** `D:\Projects\production-meter-reading\production-meter-reading`  
**Audit Date:** 2026-09-23  
**Auditor:** Senior AI Agent Systems Engineer  

---

## 1. Purpose of this Document

In engineering audits of agentic AI systems, distinguishing between **empirically proven facts**, **reasonable inferences**, and **unverifiable internal engine behaviors** is essential. This document explicitly identifies the boundaries, constraints, and limitations of this audit.

---

## 2. Epistemic Classification of Findings

### 2.1 Fact: Empirically Verified (100% Proven)
The following findings are directly proven through filesystem inspection, Git records, live execution tests, and raw JSONL transcript logs:
1. **Directory Contents & Git Tracking:** `.agent` contains 1 Git-tracked file (`saigon-port-ui/SKILL.md`). `.agents` contains 172 Git-ignored files (4.26 MB).
2. **Missing YAML Frontmatter:** Line 1 of `.agent/skills/saigon-port-ui/SKILL.md` is `# Saigon Port UI Skill` without YAML fences.
3. **Absence from System Prompt:** `saigon-port-ui` is not present in the `<skills>` block of the agent's system prompt.
4. **Auto-Discovery of Generic Skills:** All 7 skills in `.agents/skills/` have valid YAML frontmatter and are mounted into `<skills>` on every turn.
5. **Historical Tool Invocations:** Across 37 transcripts, `banner-design`, `brand`, `design`, `slides`, and all 164 data/script files were never viewed (0 views). `saigon-port-ui` was viewed 18 times; `ui-ux-pro-max` 2 times; `ui-styling` 1 time; `design-system` 1 time.
6. **Automatic Background Wake-Up:** The Antigravity engine automatically resumes model execution via `MESSAGE_PRIORITY_HIGH` upon background task exit, without manual polling.
7. **Pervasive Historical Polling:** Historical transcripts contain 35 to 51 manual `manage_task(action: 'status')` calls and repeated PowerShell `Start-Sleep` loops per session.

---

### 2.2 Inferred Behavior (Highly Probable, Pending Engine Source Inspection)
1. **Frontmatter as the Sole Mounting Criterion:** We infer that adding `--- \n name: saigon-port-ui \n description: ... \n ---` will cause Antigravity to mount `saigon-port-ui` into the `<skills>` block. This inference is backed by official documentation in `agy-customizations/docs/skills.md`, but cannot be 100% confirmed without modifying the file (which is strictly forbidden in this read-only audit).
2. **Directory Fallback Precedence:** The documentation lists `Path: .agents/ (or .agent/, _agents/, _agent/)`. It is inferred that if `.agents/` exists, the engine might either prioritize `.agents/` or union the directories. Since `saigon-port-ui` lacked frontmatter, we cannot observe whether a valid `.agent/` skill would be merged alongside `.agents/`.

---

### 2.3 Unverified / Protected Engine Boundaries
1. **`settings.json` Internal Configuration:** Attempting to view `C:\Users\User\.gemini\antigravity-cli\settings.json` returned:
   ```text
   permission check failed for read_file: Permission denied. Matches hardcoded system protection boundary rule.
   ```
   Internal engine configuration settings cannot be read directly due to security boundaries. This finding is classified as **`SYSTEM_PROTECTED`**.
2. **Actual Billed Token Usage:** Exact BPE token counts billed by backend model providers (e.g., Google DeepMind Gemini API endpoints) are tracked server-side and are not written to local client logs. All token numbers in this audit are **engineered estimates** based on standard character-to-token heuristics. They are marked **`ESTIMATED_MODEL`**.
3. **Conversations from Other Workstations:** The transcript analysis is limited to the 37 conversations stored locally in `C:\Users\User\.gemini\antigravity-cli\brain/`. Any sessions executed on other machines or deleted from local cache are unavailable.

---

## 3. Disclaimed Claims (What this Audit Does NOT Assert)

1. **No Assertion of External Token Claims:** We do not assert that implementing these recommendations will yield an arbitrary "30% reduction" based on third-party blog posts. We report concrete estimates: ~1,200 tokens/turn of system prompt footprint, ~1,500 tokens of duplicate CSS, and ~15,000–25,000 tokens of polling waste per session.
2. **No Claim of Flawed Product Code:** The Map V2 Digital Twin utility network, busbar geometry, and camera framing code in `frontend/src/components/map-v2/` are technically sound, highly performant, and visually verified. The deficiencies identified in this audit reside exclusively in the **skill governance and agent prompt layers**, not in the application code.
3. **No Modification Outside Audit Scope:** In accordance with the mandate, zero code, skill files, database tables, or runtime configurations were altered. All audit deliverables are strictly confined to `docs/audits/agent-skills-usage-audit/`.
