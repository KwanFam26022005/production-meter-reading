# Remaining Limitations, Engine Boundaries, and Deferred Improvements

**Project:** Production Meter Reading — Cảng Sài Gòn  
**Repository:** `D:\Projects\production-meter-reading\production-meter-reading`  
**Date:** 2026-09-23  

---

## 1. Epistemic Transparency and Scope Boundaries

In accordance with strict auditing standards, this document articulates the specific technical boundaries, unalterable engine mechanics, and deferred optimizations remaining after the completion of Phase 1.

---

## 2. Identified Remaining Limitations

### 2.1 The System Prompt Fixed Footprint Tax
- **The Condition:** All 7 generic skills in `.agents/skills/` (`banner-design`, `brand`, `design`, `design-system`, `slides`, `ui-styling`, `ui-ux-pro-max`) possess valid YAML frontmatter.
- **The Invariant:** Per Section 3 instructions: *"Do not delete, move or archive any existing skill."* No skill folders were relocated or pruned.
- **The Consequence:** Because Antigravity's discovery scanner scans `.agents/skills/` automatically, the descriptions of these 7 skills (~4,800 characters or ~1,200 tokens) are injected into the system prompt's `<skills>` block on **every model turn**.
- **Impact:** Over a 50-turn session, approximately **~39,000 tokens** remain dedicated to describing irrelevant marketing banners, slide decks, and corporate logos.
- **Future Remediation (Phase 2):** When explicitly permitted, moving dormant creative skills to a non-scanned archive directory (e.g., `tools/creative-skills/` or `.agents_archive/`) will permanently eliminate this fixed prompt overhead.

### 2.2 Active Parent Session Context Immutability
- **The Condition:** When an Antigravity conversation starts (e.g., `ab8fb3c0`), its initial system prompt is serialized in-memory.
- **The Finding:** While subagents and new trajectories dynamically reload skills in real time (as proven by subagent `5a6dec75` discovering `saigon-port-ui` immediately after the edit), the running parent conversation does not dynamically hot-reload its own already-serialized system prompt.
- **Resolution:** Full auto-discovery in parent context is active for all subsequent conversations and subagent invocations.

### 2.3 Server-Side Billed Token Telemetry
- **The Condition:** Exact BPE token counts billed by backend model provider endpoints (Gemini API) are tracked server-side and are not exposed in local client logs or tool step returns.
- **Epistemic Classification:** Billed token usage is strictly recorded as **`TOKEN_USAGE_UNAVAILABLE`**.
- **Remediation Standard:** All token figures reported in audit and optimization deliverables are **Engineered Token Estimates (`est_tokens`)** derived from UTF-8 character length heuristics (~4 chars/token for English/code, ~2.8 chars/token for Vietnamese diacritics).

### 2.4 Hardened System Protection Boundary
- Attempting to inspect `C:\Users\User\.gemini\antigravity-cli\settings.json` returned:
  ```text
  permission check failed for read_file: Permission denied. Matches hardcoded system protection boundary rule.
  ```
- Engine-level configuration files remain protected by the platform's security sandbox.

### 2.5 Deferred Design Token Consolidation
- **Accomplished in Phase 1:** Duplicate CSS definitions were removed from `.agent/skills/saigon-port-ui/SKILL.md` and canonically hyperlinked to `frontend/DESIGN_DNA.md#4-color-system`, saving ~850 tokens per reading.
- **Deferred:** Refactoring CSS custom property naming schemes or consolidating duplicate classes across `frontend/src/index.css` (25,000+ lines) was deferred to avoid touching production CSS during an agent-workflow optimization phase.
