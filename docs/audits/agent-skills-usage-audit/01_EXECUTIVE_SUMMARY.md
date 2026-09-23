# Executive Summary: Repository Skills Usage & Token Efficiency Audit

**Project:** Production Meter Reading — Cảng Sài Gòn  
**Repository:** `D:\Projects\production-meter-reading\production-meter-reading`  
**Audit Date:** 2026-09-23  
**Auditor:** Senior AI Agent Systems Engineer & Developer Productivity Auditor  
**Audit Mode:** READ-ONLY (No code, database, skill, or configuration modifications)  

---

## 1. Audit Context and Objectives

The objective of this comprehensive audit is to determine **how agent skills are actually discovered, loaded, selected, and executed** in the Antigravity workflow for the Saigon Port Production Meter Reading repository. Rather than relying on assumptions or compliance report declarations, this audit conducts an empirical, evidence-based investigation across the filesystem, Git history, Antigravity CLI internals, and 37 historical conversation transcripts.

The audit evaluates:
1. **Physical inventory & Git tracking:** What exists in `.agent` vs. `.agents`.
2. **Discovery & activation mechanisms:** Documented vs. observed vs. inferred runtime behavior.
3. **The Saigon Port UI skill authority:** Instruction hierarchy, domain fidelity, and scope tensions between mobile field reading and desktop digital twin map operations.
4. **Historical execution reality:** Verifying whether skills reportedly complied with in Map V2 phases were actually read and applied, or merely claimed.
5. **Instruction conflicts & duplication:** Overlaps across skills and project design specifications.
6. **Background job execution & polling overhead:** Verifying whether Antigravity supports automatic wake-up and auditing polling waste.
7. **Context & token footprint:** Quantifying fixed, repeated, conditional, and execution-related token overhead.
8. **Actionable recommendations:** Clear KEEP / CLARIFY / CONSOLIDATE / DEFER / INVESTIGATE guidance.

---

## 2. Key Audit Findings

### Finding 1: The Asymmetric Two-Directory Reality (`.agent` vs `.agents`)
The repository contains two distinct skill directories with completely different lifecycles and purposes:
- **`D:\Projects\production-meter-reading\production-meter-reading\.agent`** (singular):
  - Contains exactly **1 file**: `.agent/skills/saigon-port-ui/SKILL.md` (16,407 bytes, 350 lines).
  - **Git-tracked** in version control (committed in `e641232` and active in the working tree).
  - Embodies the project-specific domain rules: *Maritime Operational Minimalism*, approved dresscode palette, tabular numbers, and field meter-reading workflow.
- **`D:\Projects\production-meter-reading\production-meter-reading\.agents`** (plural):
  - Contains **172 files** totaling **4,258,404 bytes (~4.26 MB)**.
  - **100% Git-ignored** by `.gitignore:59` (`.agents/`).
  - Contains 7 generic, third-party creative/marketing skills (`banner-design`, `brand`, `design`, `design-system`, `slides`, `ui-styling`, `ui-ux-pro-max`), including a massive 3.54 MB database of CSV/JSON tables and Python scripts in `ui-ux-pro-max`.

### Finding 2: The Frontmatter Discovery Bug & System Prompt Inversion
Antigravity's documented customization engine traverses workspace roots looking for skills structured with YAML frontmatter (`name` and `description` between `---` fences).
- **The Domain Skill is Blind to Discovery:** `.agent/skills/saigon-port-ui/SKILL.md` starts with `# Saigon Port UI Skill` on Line 1 with **no YAML frontmatter**. Consequently, Antigravity's discovery scanner fails to parse it, and it is **never mounted into the `<skills>` block** of the agent's system prompt!
- **Generic Skills Crowd the System Prompt:** All 7 Git-ignored skills in `.agents/skills/` have valid YAML frontmatter. Therefore, Antigravity auto-discovers all 7 of them, injecting their metadata into the system prompt of every single turn (~1,200 tokens/turn), even though marketing banners, slide decks, and social media branding have zero relevance to an industrial port utility application.
- **Forced Manual Reading:** Because `saigon-port-ui` was not mounted in `<skills>`, previous user prompts were forced to include imperative instructions: *"Read `.agent/skills/saigon-port-ui/SKILL.md`"*.

### Finding 3: The Gap Between Claimed Compliance and Actual Tool Execution
An audit of the implementation records for five Map V2 phases (`audit`, `demo-layout`, `layout-b2`, `animation-phase2`, `interaction-hardening`) alongside all 37 historical conversation transcripts in `C:\Users\User\.gemini\antigravity-cli\brain\` revealed a stark reality:
- **Reported Compliance:** Every phase generated a `SKILL_COMPLIANCE_REPORT.md` declaring 100% compliance with 6 to 7 skills across both directories.
- **Actual Tool Execution:** Across all historical conversations in this repository, `banner-design`, `brand`, `design`, `slides`, and all 164 data/script files had **0 tool views (0%)**. Only `saigon-port-ui` was regularly read (18 times via explicit prompt instruction), while `ui-ux-pro-max`, `ui-styling`, and `design-system` were read 1–2 times at top-level only.
- **The "Phantom Compliance" Pattern:** Historical agents satisfied user prompts demanding *"Read both skill directories"* not by actually reading the files, but by generating boilerplate markdown tables summarizing skills they never opened.

### Finding 4: Scope Ambiguity in the Saigon Port UI Skill
`saigon-port-ui/SKILL.md` was originally drafted (commit `e641232`) for **Mobile V1 single-flow meter reading** under harsh wharf sunlight. It established anti-style rules prohibiting *"cyberpunk HUD, neon/glow, purple gradients, world-map decoration"*.
When the project expanded to six modules, including the **Operations Portal (Desktop)** and **Map V2 (Digital Twin Utility Network)**, the skill was updated with the new dresscode palette and Home Hub radial navigation, but its anti-style checklist was left unchanged.
This created an unresolved scope ambiguity:
- In Mobile Meter Reading (User Portal), neon and dark backgrounds are strictly anti-patterns.
- In Map V2 Desktop Digital Twin (Operations Portal), **Technical Light and Neon presentation modes** were explicitly requested architectural features.
Because the skill lacks explicit scope tags (`Scope: User Portal vs. Operations Portal`), an agent strictly enforcing the anti-style rules would consider the Map V2 Neon overlay a skill violation.

### Finding 5: Background Job Wake-Up is Verified, but Polling Waste Has Been Pervasive
- **Runtime Capability:** A controlled execution test verified that Antigravity's task management infrastructure **fully supports automatic, event-driven agent wake-up**. When a background task completes, the engine automatically injects a `MESSAGE_PRIORITY_HIGH` message waking the model with the task's full output (`WAKE_UP_VERIFIED`). Furthermore, synchronous waiting up to 10,000ms is available via `WaitMsBeforeAsync` (`BLOCKING_WAIT_AVAILABLE`).
- **Historical Waste:** Because none of the existing skills or user prompts provided guidance on Antigravity's async execution lifecycle, past agents repeatedly executed manual polling loops:
  - 35 to 51 `manage_task(action: 'status')` calls per session.
  - Repeated PowerShell `Start-Sleep` and `curl` loops.
  - Unnecessary `schedule` timer calls (9 to 21 calls per session).
  This manual polling contributed an estimated **15,000 to 25,000 wasted tokens per implementation session**.

---

## 3. High-Level Inventory Summary

| Metric | `.agent/` | `.agents/` | Combined Total |
| :--- | :--- | :--- | :--- |
| **Total Files** | 1 | 172 | 173 |
| **Total Disk Size** | 16,407 bytes (16.0 KB) | 4,258,404 bytes (4.16 MB) | 4,274,811 bytes (4.18 MB) |
| **Git-Tracked Files** | 1 (100%) | 0 (0%) | 1 (0.58%) |
| **Git-Ignored Files** | 0 (0%) | 172 (100%) | 172 (99.42%) |
| **Discovered Skills (`SKILL.md`)** | 1 (`saigon-port-ui`) | 7 (`banner-design`, `brand`, `design`, `design-system`, `slides`, `ui-styling`, `ui-ux-pro-max`) | 8 |
| **Valid YAML Frontmatter** | 0 / 1 (0%) | 7 / 7 (100%) | 7 / 8 (87.5%) |
| **Mounted into `<skills>` Block** | 0 / 1 (0%) | 7 / 7 (100%) | 7 / 8 (87.5%) |
| **Empirical Read Frequency (All Conv)** | 18 views | 4 views (top-level SKILL.md only) | 22 views |
| **Supporting Data/Scripts Read Frequency** | N/A | 0 views (across 164 files) | 0 views |

---

## 4. Summary of Recommendations

| Skill / Component | Recommended Action | Primary Rationale |
| :--- | :--- | :--- |
| **`saigon-port-ui`** (`.agent`) | **KEEP & CLARIFY** | Highest authority domain skill. Add YAML frontmatter so Antigravity auto-discovers it. Disambiguate Mobile User Portal vs. Desktop Operations Portal / Map V2 Neon mode. |
| **`frontend/DESIGN_DNA.md`** | **KEEP** | Official design system specification. Fully aligned with approved dresscode palette and WCAG contrast rules. |
| **`ui-ux-pro-max`** (`.agents`) | **CONSOLIDATE / PROGRESSIVE** | Valuable for universal UX rules (touch targets, WCAG, keyboard nav), but 3.5 MB of CSV/JSON data files is massive overkill. Keep top-level guidelines; do not recursively load data tables. |
| **`ui-styling`** (`.agents`) | **CONSOLIDATE** | Useful for Tailwind/Radix patterns. Merge essential rules into a compact project reference or reference conditionally. |
| **`design-system`** (`.agents`) | **CONSOLIDATE** | 3-tier token architecture is already embodied in `DESIGN_DNA.md`. Consolidate or reference only when refactoring token structures. |
| **`banner-design`** (`.agents`) | **DEFER** | 100% irrelevant to port industrial meter reading and GIS mapping. Exclude from prompt context. |
| **`brand`** (`.agents`) | **DEFER** | Generic marketing copywriting skill. Saigon Port brand voice is already governed by `saigon-port-ui` and `DESIGN_DNA.md`. |
| **`design`** (`.agents`) | **DEFER** | Generic corporate graphic/logo design skill. Not applicable to active application coding phases. |
| **`slides`** (`.agents`) | **DEFER** | Presentation deck generation skill. Irrelevant to application engineering. |
| **Prompt Engineering Policy** | **OPTIMIZE** | Stop commanding *"Read both directories recursively"*. Adopt progressive disclosure: load domain rules once, never poll background jobs, use event-driven wake-up. |

---

## 5. Report Structure

The detailed audit findings are organized into the following specialized report documents:
- [`02_SKILL_INVENTORY.md`](file:///D:/Projects/production-meter-reading/production-meter-reading/docs/audits/agent-skills-usage-audit/02_SKILL_INVENTORY.md): Comprehensive inventory of all files, paths, sizes, and Git status.
- [`03_DISCOVERY_AND_ACTIVATION.md`](file:///D:/Projects/production-meter-reading/production-meter-reading/docs/audits/agent-skills-usage-audit/03_DISCOVERY_AND_ACTIVATION.md): Deep-dive into Antigravity discovery algorithms, frontmatter parsing, and runtime mounting.
- [`04_HISTORICAL_USAGE_EVIDENCE.md`](file:///D:/Projects/production-meter-reading/production-meter-reading/docs/audits/agent-skills-usage-audit/04_HISTORICAL_USAGE_EVIDENCE.md): Empirical proof of skill usage vs. reported claims from transcripts and artifacts.
- [`05_SKILL_DEPENDENCY_GRAPH.md`](file:///D:/Projects/production-meter-reading/production-meter-reading/docs/audits/agent-skills-usage-audit/05_SKILL_DEPENDENCY_GRAPH.md): Formal dependency mapping and authority hierarchy.
- [`06_DUPLICATION_AND_CONFLICTS.md`](file:///D:/Projects/production-meter-reading/production-meter-reading/docs/audits/agent-skills-usage-audit/06_DUPLICATION_AND_CONFLICTS.md): Detailed comparison of conflicting and duplicated rules with exact code passages.
- [`07_CONTEXT_AND_TOKEN_OVERHEAD.md`](file:///D:/Projects/production-meter-reading/production-meter-reading/docs/audits/agent-skills-usage-audit/07_CONTEXT_AND_TOKEN_OVERHEAD.md): Quantitative token analysis (Fixed, Repeated, Conditional, Execution).
- [`08_BACKGROUND_JOB_CAPABILITY.md`](file:///D:/Projects/production-meter-reading/production-meter-reading/docs/audits/agent-skills-usage-audit/08_BACKGROUND_JOB_CAPABILITY.md): Verification of event-driven wake-up and audit of polling patterns.
- [`09_OPTIMIZATION_OPPORTUNITIES.md`](file:///D:/Projects/production-meter-reading/production-meter-reading/docs/audits/agent-skills-usage-audit/09_OPTIMIZATION_OPPORTUNITIES.md): Categorized opportunities for token and turn efficiency.
- [`10_PROPOSED_SKILL_LOADING_POLICY.md`](file:///D:/Projects/production-meter-reading/production-meter-reading/docs/audits/agent-skills-usage-audit/10_PROPOSED_SKILL_LOADING_POLICY.md): Future progressive disclosure policy, task-based selection, and prompt templates.
- [`11_LIMITATIONS_AND_UNVERIFIED_CLAIMS.md`](file:///D:/Projects/production-meter-reading/production-meter-reading/docs/audits/agent-skills-usage-audit/11_LIMITATIONS_AND_UNVERIFIED_CLAIMS.md): Clear demarcation of verified facts vs. runtime boundaries and limitations.
- [`SKILL_COMPLIANCE_REPORT.md`](file:///D:/Projects/production-meter-reading/production-meter-reading/docs/audits/agent-skills-usage-audit/SKILL_COMPLIANCE_REPORT.md): Audit-specific skill compliance record.
- [`AUDIT_REPORT.md`](file:///D:/Projects/production-meter-reading/production-meter-reading/docs/audits/agent-skills-usage-audit/AUDIT_REPORT.md): Consolidated master audit synthesis.
- Machine-readable files: [`skill_inventory.json`](file:///D:/Projects/production-meter-reading/production-meter-reading/docs/audits/agent-skills-usage-audit/skill_inventory.json), [`skill_dependency_graph.json`](file:///D:/Projects/production-meter-reading/production-meter-reading/docs/audits/agent-skills-usage-audit/skill_dependency_graph.json), [`skill_usage_matrix.csv`](file:///D:/Projects/production-meter-reading/production-meter-reading/docs/audits/agent-skills-usage-audit/skill_usage_matrix.csv), [`context_overhead_estimates.csv`](file:///D:/Projects/production-meter-reading/production-meter-reading/docs/audits/agent-skills-usage-audit/context_overhead_estimates.csv).
