# Master Audit Report: Repository Skills Usage & Token Efficiency

**Project:** Production Meter Reading — Cảng Sài Gòn  
**Repository:** `D:\Projects\production-meter-reading\production-meter-reading`  
**Current Branch:** `feature/v16e-network-map-overlay-r1`  
**Audit Date:** 2026-09-23  
**Auditor:** Senior AI Agent Systems Engineer, Repository Auditor & Developer Productivity Auditor  
**Audit Mode:** READ-ONLY (Strictly non-modifying)  

---

## 1. Scope, Mission, and Safety Boundaries

This audit investigated the entire skill ecosystem and runtime agent workflow in the `production-meter-reading` repository to establish an empirical baseline before introducing any prompt, skill, or background-job optimization.

### Safety Invariants Upheld:
- **Baseline Git State Preserved:** All 18 uncommitted files in the working tree (including `.agent/skills/saigon-port-ui/SKILL.md`, `frontend/DESIGN_DNA.md`, `backend/app/attendance.py`, `App.tsx`, etc.) were strictly preserved.
- **Zero Modifications Outside Audit Directory:** No code, documentation, schema, or configuration files outside `docs/audits/agent-skills-usage-audit/` were created or altered.
- **Zero Process or Database Disruptions:** No backend servers were restarted, no migrations run, and no seed data modified.
- **Zero Blind Script Execution:** No uninspected third-party scripts in `.agents/skills/` were run.

---

## 2. Inventory of Skills and Directory Architecture

The repository exhibits an asymmetric two-directory structure:
- **`D:\Projects\production-meter-reading\production-meter-reading\.agent`** (Singular):
  - **1 file:** `.agent/skills/saigon-port-ui/SKILL.md` (16,407 bytes, 350 lines).
  - **Git-tracked** in repository version control (added in commit `e641232`).
  - Represents the domain-specific operating rules of Saigon Port.
- **`D:\Projects\production-meter-reading\production-meter-reading\.agents`** (Plural):
  - **172 files** totaling **4,258,404 bytes (~4.26 MB)**.
  - **100% Git-ignored** by `.gitignore:59` (`.agents/`).
  - Contains 7 generic design/creative/marketing skills (`banner-design`, `brand`, `design`, `design-system`, `slides`, `ui-styling`, `ui-ux-pro-max`), including a 3.54 MB database of CSV/JSON files and Python scripts in `ui-ux-pro-max`.

### Full Skills Inventory Table

| Skill ID | Location | Scope | Git Status | Entry Point | Frontmatter Valid? | Auto-Mounted in `<skills>`? | Disk Size | Est. Tokens |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **`saigon-port-ui`** | `.agent/skills/saigon-port-ui/SKILL.md` | Maritime Domain UI / Field & Admin | **Git-Tracked** | `SKILL.md` | **NO** (Lacks `---` fences) | **NO** (Missing from `<skills>`) | 16,407 B / 350 L | ~4,100 |
| **`banner-design`** | `.agents/skills/banner-design/SKILL.md` | Marketing Banners & Social Ads | Git-Ignored | `SKILL.md` | **YES** | **YES** | 8,326 B / 196 L | ~2,080 |
| **`brand`** | `.agents/skills/brand/SKILL.md` | Marketing Voice & Brand Guidelines | Git-Ignored | `SKILL.md` | **YES** | **YES** | 2,939 B / 97 L | ~735 |
| **`design`** | `.agents/skills/design/SKILL.md` | Corporate Identity / Logo / Mockups | Git-Ignored | `SKILL.md` | **YES** | **YES** | 12,322 B / 313 L | ~3,080 |
| **`design-system`** | `.agents/skills/design-system/SKILL.md` | Generic 3-Tier Design Tokens | Git-Ignored | `SKILL.md` | **YES** | **YES** | 6,875 B / 244 L | ~1,720 |
| **`slides`** | `.agents/skills/slides/SKILL.md` | HTML Presentation Decks (Chart.js) | Git-Ignored | `SKILL.md` | **YES** | **YES** | 1,137 B / 40 L | ~285 |
| **`ui-styling`** | `.agents/skills/ui-styling/SKILL.md` | Tailwind CSS & shadcn/ui Components | Git-Ignored | `SKILL.md` | **YES** | **YES** | 10,045 B / 324 L | ~2,510 |
| **`ui-ux-pro-max`** | `.agents/skills/ui-ux-pro-max/SKILL.md` | Universal UI/UX Design Intelligence | Git-Ignored | `SKILL.md` | **YES** | **YES** | 28,032 B / 425 L | ~7,000 |

---

## 3. Discovery and Activation Mechanics

### 3.1 The Frontmatter Discovery Defect
According to official engine documentation in `C:\Users\User\.gemini\antigravity-cli\builtin\skills\agy-customizations\docs\skills.md`, Antigravity requires a YAML frontmatter block at the top of `SKILL.md` with `name` and `description` fields to register a skill.
- `.agent/skills/saigon-port-ui/SKILL.md` begins on Line 1 with `# Saigon Port UI Skill` without YAML fences.
- As an observed fact, Antigravity's scanner ignores it. It is **never injected into the `<skills>` block** of the system prompt.
- Consequently, past prompt authors were forced to use explicit manual loading commands: *"Read `.agent/skills/saigon-port-ui/SKILL.md`"*.

### 3.2 The System Prompt Overhead
In contrast, all 7 generic skills in `.agents/skills/` have valid YAML frontmatter. Therefore, Antigravity automatically injects their names and descriptions (~4,800 characters or ~1,200 tokens) into the system prompt of **every single model turn**, creating ~60,000 tokens of fixed overhead per 50-turn session, mostly spent describing irrelevant marketing banners, slide decks, and logos.

---

## 4. Empirical Historical Usage Audit (Transcripts vs. Reports)

An audit of implementation records for five Map V2 phases (`audit`, `demo-layout`, `layout-b2`, `animation-phase2`, `interaction-hardening`) alongside **37 historical conversation transcripts** in `C:\Users\User\.gemini\antigravity-cli\brain/` established the following facts:

### 4.1 Frequency of Skill Reads via `view_file`
- `saigon-port-ui/SKILL.md`: **Viewed 18 times** (Driven by explicit prompt directives).
- `ui-ux-pro-max/SKILL.md`: **Viewed 2 times** (Top-level UX principles).
- `ui-styling/SKILL.md`: **Viewed 1 time**.
- `design-system/SKILL.md`: **Viewed 1 time**.
- `banner-design`, `brand`, `design`, `slides`: **Viewed ZERO times (0%)**.
- All 164 data/script files in `.agents/`: **Viewed ZERO times (0%)**.

### 4.2 The "Phantom Compliance" Pathology
Every phase artifact directory contained a `SKILL_COMPLIANCE_REPORT.md` declaring full compliance with 6 to 7 skills. In reality, the agents never opened 5 of those skills; they simply generated ceremonial tables summarizing skill names present in their system prompt.

---

## 5. Scope Ambiguities and Instruction Conflicts

### 5.1 Map V2 Neon Overlay vs. Anti-Style Rules (CF-01)
- **The Conflict:** `saigon-port-ui/SKILL.md` (lines 69 & 343) mandates: *"Do not use: cyberpunk HUD hoặc viền dạ quang neon/glow... Reject if purple/cyber/neon visual language"*.
- **The Architecture:** In `frontend/src/components/map-v2/MapV2Workspace.tsx`, an explicitly requested feature is the **Neon Digital Twin presentation mode** with restrained SVG glow (`stdDeviation="2.2"`).
- **Root Cause:** The prohibition was written for outdoor mobile meter reading under harsh wharf sunlight. It was never intended to ban technical desktop GIS overlays in the Operations Portal.
- **Resolution:** Add explicit scope tags to `saigon-port-ui`:
  - *User Portal (Mobile):* Neon/glow is strictly forbidden.
  - *Operations Portal (Map V2 Desktop):* Technical Light is default; restrained Neon Digital Twin is an approved technical GIS mode.

### 5.2 Token Duplication between Skill and Design DNA (CF-03)
- Over 70 lines of identical CSS token declarations are duplicated verbatim across `.agent/skills/saigon-port-ui/SKILL.md` and `frontend/DESIGN_DNA.md`.
- Reading both files injects ~1,500 redundant tokens per session and creates synchronization risk.
- **Resolution:** Designate `DESIGN_DNA.md` as the official source of truth for CSS tokens; `saigon-port-ui` should link to it rather than duplicating code.

---

## 6. Background Job Execution & Polling Audit

### 6.1 Capability Verification
A controlled experiment during this audit (`task-36` and `task-107`) confirmed that Antigravity provides **event-driven automatic agent wake-up** (`WAKE_UP_VERIFIED`):
- When a command exceeds 10,000ms (`WaitMsBeforeAsync`), it transitions to a background task.
- When the task completes, the engine automatically injects a `MESSAGE_PRIORITY_HIGH` message containing the command's full output, resuming model execution.
- **Blocking Wait Available:** `WaitMsBeforeAsync` supports synchronous waiting up to 10,000ms (`BLOCKING_WAIT_AVAILABLE`).

### 6.2 Historical Polling Waste
Because existing skills contain zero background-job guidance, historical sessions repeatedly executed manual polling loops:
- 35 to 51 calls to `manage_task(action: 'status')` per session.
- Repeated PowerShell `Start-Sleep` loops and `schedule` timer calls.
- **Total waste:** **15,000 to 25,000 tokens and 30 to 50 agent turns per session**.

---

## 7. Direct Answers to the 14 Audit Questions

### Q1: How many skills actually exist locally?
**Answer:** Exactly **8 skills** exist locally (1 in `.agent/skills/` and 7 in `.agents/skills/`), plus 2 built-in skills mounted by the Antigravity engine (`agy-customizations`, `antigravity-guide`).

### Q2: How many are Git-tracked versus local-only?
**Answer:** Exactly **1 skill is Git-tracked** (`.agent/skills/saigon-port-ui/SKILL.md`). The remaining **7 skills are local-only / Git-ignored** by `.gitignore:59` (`.agents/`).

### Q3: What is the purpose of each skill?
**Answer:**
1. `saigon-port-ui`: Domain UI specification for Saigon Port field meter reading and Operations Portal Admin Workspace (*Maritime Operational Minimalism*).
2. `banner-design`: Social media, ad, and website hero banner design across external ad networks.
3. `brand`: Marketing brand voice, copywriting frameworks, and asset consistency.
4. `design`: Comprehensive corporate identity, Gemini AI logo generation, CIP mockups, and slides.
5. `design-system`: 3-tier design token architecture and component specifications.
6. `slides`: HTML presentation decks with Chart.js.
7. `ui-styling`: Tailwind CSS utility styling and shadcn/ui component integration.
8. `ui-ux-pro-max`: Universal UI/UX design intelligence database (styles, UX guidelines, stacks).

### Q4: How does Antigravity discover them?
**Answer:** Antigravity traverses from the current working directory up to the repository root looking for `.agents/` or `.agent/`. Within `skills/<name>/`, it reads `SKILL.md` and parses the YAML frontmatter block (`--- \n name: ... \n description: ... \n ---`).

### Q5: Are skills automatically activated or explicitly read?
**Answer:** The discovery engine automatically injects skill names and descriptions into the system prompt's `<skills>` block. However, **the full content of `SKILL.md` is never loaded automatically**; the agent must explicitly invoke `view_file` on `SKILL.md` to load it (progressive disclosure). `saigon-port-ui` was never auto-discovered due to missing frontmatter; it was read exclusively via explicit user prompt directives.

### Q6: Which skills were demonstrably used in previous Map V2 phases?
**Answer:**
- `saigon-port-ui` was demonstrably read (18 times) and directly influenced colors, domain copy, and operational minimalism.
- `ui-ux-pro-max`, `ui-styling`, and `design-system` were read 1–2 times at top-level for general UX invariants (contrast, click targets, reduced motion).
- `banner-design`, `brand`, `design`, and `slides` were **never read or used (0 views)**.

### Q7: Are there duplicated or conflicting instructions?
**Answer:** Yes:
- **Conflict:** `saigon-port-ui` prohibits neon/glow across the entire product, conflicting with the explicitly requested Map V2 Digital Twin Neon Mode in the Operations Portal.
- **Duplication:** 70 lines of CSS color tokens in `saigon-port-ui` are duplicated verbatim in `frontend/DESIGN_DNA.md`.

### Q8: Are large reference documents loaded unnecessarily?
**Answer:** In historical tool runs, agents did not load the 3.5 MB database in `.agents/skills/ui-ux-pro-max/data/`. However, prompts commanding agents to *"inspect both directories recursively"* created high risk of context exhaustion, leading agents to emit unverified compliance boilerplate instead.

### Q9: Are mandatory skill-reading prompts creating repeated context?
**Answer:** Yes. Re-injecting directory inspection boilerplate, repeated color token definitions, and generating ceremonial 4 KB compliance reports added approximately **2,400 repeated tokens per implementation phase**.

### Q10: Does the runtime support automatic background-job wake-up?
**Answer:** **YES (`WAKE_UP_VERIFIED`).** Antigravity's task execution engine automatically injects a `MESSAGE_PRIORITY_HIGH` message resuming model execution when a background command exits.

### Q11: Is polling overhead actually observed?
**Answer:** **YES.** Historical transcripts show 35 to 51 calls to `manage_task(action: 'status')` and repeated `Start-Sleep` loops per session, burning an estimated 15,000 to 25,000 tokens per session.

### Q12: What optimizations could reduce token consumption?
**Answer:**
1. Eliminate manual polling and rely on reactive wake-up (saves 15k–25k tokens/session).
2. Prune dormant marketing skills from `.agents/` (saves ~39k tokens/session of fixed prompt tax).
3. Deduplicate CSS tokens between `saigon-port-ui` and `DESIGN_DNA.md` (saves ~1,500 tokens/read).
4. Replace ceremonial compliance reports with test assertions (saves ~1,000 tokens/phase).

### Q13: Which optimizations are safe to implement first?
**Answer:**
1. Adding YAML frontmatter to `saigon-port-ui` (enables auto-discovery without touching code).
2. Clarifying Mobile vs. Desktop/Map V2 scope in `saigon-port-ui` (resolves Neon conflict).
3. Updating prompt guidelines to mandate event-driven background waiting and prohibit polling.

### Q14: What information remains unverified?
**Answer:**
1. Whether Antigravity's internal discovery scanner checks `.agents` before `.agent` if both have valid frontmatter (requires a live test in a future phase).
2. Server-side billed API token counts (modeled via engineering heuristics, as API invoices are not logged locally).
3. Internal CLI engine configurations in protected files (`settings.json`).

---

## 8. Final Consolidated Recommendations

| Component / Instruction Group | Strategic Action | Immediate Guidance |
| :--- | :--- | :--- |
| **`saigon-port-ui`** (`.agent`) | **KEEP & CLARIFY** | **Keep as supreme UI authority.** Add YAML frontmatter to enable native auto-discovery. Add explicit scope headers disambiguating Mobile User Portal (No neon, outdoor porcelain) from Desktop Operations Portal / Map V2 (Technical Light default, restrained Neon Digital Twin approved). |
| **`frontend/DESIGN_DNA.md`** | **KEEP** | **Keep as official design system specification.** Maintain as the canonical source for CSS custom properties and WCAG contrast validation. |
| **`ui-ux-pro-max`** (`.agents`) | **CONSOLIDATE / PROGRESSIVE** | **Retain top-level guidelines; isolate database.** Use top-level `SKILL.md` for general accessibility (WCAG AA/AAA, hit targets, reduced motion). Do not recursively inspect the 3.5 MB `data/` folder. |
| **`ui-styling`** (`.agents`) | **CONSOLIDATE** | Consolidate key Tailwind/Radix component rules into project guidelines; reference conditionally. |
| **`design-system`** (`.agents`) | **CONSOLIDATE** | Its 3-tier token model is already embodied in `DESIGN_DNA.md`. Consolidate or reference only during token refactors. |
| **`banner-design`** (`.agents`) | **DEFER** | Defer / archive. Completely irrelevant to industrial port utility reading and GIS mapping. |
| **`brand`** (`.agents`) | **DEFER** | Defer / archive. Marketing messaging is irrelevant to internal port operations. |
| **`design`** (`.agents`) | **DEFER** | Defer / archive. Corporate graphic design and Gemini logo generation are not needed for active coding phases. |
| **`slides`** (`.agents`) | **DEFER** | Defer / archive. HTML slide generation has zero relevance to product development. |
| **Background Job Execution** | **CLARIFY & ENFORCE** | Enforce event-driven wake-up. Prohibit `manage_task(action: 'status')` loops and shell `Start-Sleep` commands. |
| **Prompt Engineering Policy** | **OPTIMIZE** | Eliminate *"Inspect both directories recursively"*. Adopt task-based progressive disclosure and evidence-backed test verification. |
