# Optimization Opportunities: Token Reduction and Workflow Streamlining

**Project:** Production Meter Reading — Cảng Sài Gòn  
**Repository:** `D:\Projects\production-meter-reading\production-meter-reading`  
**Audit Date:** 2026-09-23  
**Auditor:** Senior AI Agent Systems Engineer & Developer Productivity Auditor  

---

## 1. Executive Opportunity Matrix

The audit has uncovered seven concrete, measurable optimization opportunities. Each opportunity is evaluated across four operational criteria:
- **Token Reduction Impact:** Estimated savings in tokens per turn, session, or phase.
- **Engineering Quality & Safety Impact:** Risk to codebase stability, architectural invariants, or QA.
- **Implementation Effort:** Complexity of introducing the change in a subsequent phase.
- **Priority Tier:** Recommended implementation sequence.

| Opp ID | Opportunity Name | Token Impact | Safety / Quality Impact | Effort | Priority Tier |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **OPT-01** | **Fix YAML Frontmatter in `saigon-port-ui`** | Eliminates manual prompt loading; enables native Antigravity discovery | **Positive:** Restores standard platform architecture | Minimal (< 5 min) | **Tier 1 (Immediate)** |
| **OPT-02** | **Enforce Event-Driven Background Execution (Eliminate Polling)** | **Saves 15,000 – 25,000 tokens & 30–50 turns per session** | **Positive:** Eliminates race conditions & unmonitored sleep loops | Low (Prompt & policy update) | **Tier 1 (Immediate)** |
| **OPT-03** | **Clarify Mobile vs. Desktop Scope in `saigon-port-ui`** | Eliminates false compliance failures & prompt re-explanations | **Positive:** Aligns skill with Map V2 Neon & Admin Workspace | Low (Textual refinement) | **Tier 1 (Immediate)** |
| **OPT-04** | **Prune Dormant Marketing Skills from `.agents/`** | **Saves ~780 tokens on EVERY model turn (~39,000 tokens/session)** | **Neutral:** Irrelevant skills (`banner-design`, `slides`, etc.) removed | Low (Move to archive or ignore) | **Tier 2 (High Value)** |
| **OPT-05** | **Deduplicate Color Tokens with `DESIGN_DNA.md`** | Saves ~1,500 tokens whenever both files are loaded | **Positive:** Establishes single source of truth for dresscode | Low (Replace with hyperlink) | **Tier 2 (High Value)** |
| **OPT-06** | **Eliminate Recursive Inspection Boilerplate from Prompts** | Saves ~400 tokens per prompt; stops phantom compliance loops | **Positive:** Refocuses agent turns on core deliverables | Minimal (Prompt template edit) | **Tier 2 (High Value)** |
| **OPT-07** | **Replace Ceremonial Compliance Reports with Test Assertions** | Saves ~1,000 tokens per phase artifact | **Positive:** Shifts verification from claims to automated tests | Low (Template update) | **Tier 3 (Process Polish)** |

---

## 2. Deep-Dive Opportunity Profiles

### 2.1 OPT-01: Fix YAML Frontmatter in `saigon-port-ui`
- **Current Problem:** `.agent/skills/saigon-port-ui/SKILL.md` begins on Line 1 with `# Saigon Port UI Skill`. Because it lacks standard YAML frontmatter (`---`), Antigravity's discovery scanner skips mounting it into the system prompt's `<skills>` block. Every prompt author must manually inject explicit read instructions.
- **Proposed Solution:** Add valid YAML frontmatter at the top of the file:
  ```markdown
  ---
  name: saigon-port-ui
  description: >-
    Official Saigon Port UI skill. Use whenever designing, reviewing, or implementing 
    frontend interfaces, mobile meter reading, photo attendance, schedule/leave, 
    or desktop Admin Workspace & Map V2 digital twin layouts.
  ---
  ```
- **Expected Benefit:** Native discovery; agent automatically activates skill when relevant; eliminates manual prompt instructions.
- **Risk:** Zero risk. Preserves 100% of existing instructions.

---

### 2.2 OPT-02: Enforce Event-Driven Background Execution (Eliminate Polling)
- **Current Problem:** Historical sessions wasted 35 to 51 turns calling `manage_task(action: 'status')`, `schedule`, and PowerShell `Start-Sleep` loops while waiting for builds or test scripts.
- **Proposed Solution:** Establish clear background job invariants in project instructions:
  1. Always provide `WaitMsBeforeAsync: 10000` for commands expected to finish quickly.
  2. If a command goes to the background, **do not poll status**. End the turn cleanly.
  3. Rely on Antigravity's verified `MESSAGE_PRIORITY_HIGH` automatic wake-up.
- **Expected Benefit:** **15,000 to 25,000 tokens saved per session**; eliminates 30 to 50 unnecessary agent roundtrips.
- **Risk:** Zero risk. Antigravity's wake-up behavior was empirically proven during this audit (`task-36` and `task-107`).

---

### 2.3 OPT-03: Clarify Mobile vs. Desktop Scope in `saigon-port-ui`
- **Current Problem:** Lines 67–77 contain anti-style rules prohibiting *"neon/glow"* and *"world-map decoration"*, written originally for outdoor smartphone meter reading. When applied to the desktop Operations Portal Map V2 (which includes an approved Technical Neon Digital Twin overlay), this creates artificial compliance violations.
- **Proposed Solution:** Introduce clear architectural scope divisions in the skill:
  - **Scope A: User Portal (Field Operations - Mobile):** Outdoor high-contrast porcelain/navy aesthetic; neon and dark mode strictly forbidden.
  - **Scope B: Operations Portal & Map V2 (Administration - Desktop):** Technical Light is default; restrained Neon mode (`stdDeviation="2.2"`) is an approved GIS overlay for electrical/water digital twins.
- **Expected Benefit:** Eliminates false negatives during code review; aligns skill with current production architecture.
- **Risk:** Zero risk. Reflects existing implemented code.

---

### 2.4 OPT-04: Prune Dormant Marketing Skills from `.agents/`
- **Current Problem:** `.agents/skills/` contains 5 skills (`banner-design`, `brand`, `design`, `slides`, and massive data tables in `ui-ux-pro-max`) that have had **0 tool views across all 37 historical sessions**. Yet their descriptions are injected into every turn's system prompt (~780 tokens/turn).
- **Proposed Solution:** Move marketing/slide skills to an archive folder (e.g., `.agents_archive/`) or exclude them so Antigravity only mounts engineering-relevant skills.
- **Expected Benefit:** **Saves ~39,000 tokens per 50-turn session** of fixed system prompt overhead.
- **Risk:** Zero risk to application development.

---

### 2.5 OPT-05: Deduplicate Color Tokens with `DESIGN_DNA.md`
- **Current Problem:** 70+ lines of CSS variable declarations are duplicated verbatim across `.agent/skills/saigon-port-ui/SKILL.md` and `frontend/DESIGN_DNA.md`, consuming ~1,500 redundant tokens per read event and creating maintenance divergence risk.
- **Proposed Solution:** Designate `frontend/DESIGN_DNA.md` as the sole canonical source of CSS token definitions. In `saigon-port-ui/SKILL.md`, summarize the key source HEX codes and link to `DESIGN_DNA.md` for the derived CSS properties.
- **Expected Benefit:** Saves ~1,500 tokens per read; eliminates drift risk.
- **Risk:** Zero risk.

---

### 2.6 OPT-06: Eliminate Recursive Inspection Boilerplate from Prompts
- **Current Problem:** Prompts repeatedly instruct: *"In accordance with Section 0, inspect both directories recursively"*. This causes agents to run unneeded `Get-ChildItem` commands or generate ceremonial reports.
- **Proposed Solution:** Remove the recursive directory command. Instruct the agent to rely on Antigravity's progressive disclosure.
- **Expected Benefit:** Saves ~400 tokens in prompt context; prevents unneeded directory dumps.
- **Risk:** Zero risk.

---

### 2.7 OPT-07: Replace Ceremonial Compliance Reports with Test Assertions
- **Current Problem:** Multi-page `SKILL_COMPLIANCE_REPORT.md` artifacts are generated claiming compliance with skills the agent never read.
- **Proposed Solution:** Replace the ceremonial report with a 10-line automated compliance assertion block in the `IMPLEMENTATION_REPORT.md`, referencing actual automated test outputs (e.g., `playwright`, `vitest`, contrast checks).
- **Expected Benefit:** Saves ~1,000 output tokens per phase; shifts verification from unverified text claims to automated test evidence.
- **Risk:** Zero risk; strictly improves QA rigor.

---

## 3. Strict Boundary Reminder

> [!IMPORTANT]
> In accordance with the mandatory safety boundaries of this audit prompt, **none of the above optimizations are implemented in this phase**. They are documented here solely as an engineering assessment for subsequent evaluation.
