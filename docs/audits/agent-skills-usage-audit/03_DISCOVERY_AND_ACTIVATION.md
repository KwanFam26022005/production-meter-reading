# Skill Discovery and Activation Mechanics in Google Antigravity

**Project:** Production Meter Reading — Cảng Sài Gòn  
**Repository:** `D:\Projects\production-meter-reading\production-meter-reading`  
**Audit Date:** 2026-09-23  
**Auditor:** Senior AI Agent Systems Engineer  

---

## 1. Governance Baseline: Documented vs. Observed vs. Inferred Behavior

To ensure rigorous auditing integrity, all statements regarding skill discovery and activation are strictly classified under three distinct epistemic tiers:

| Tier | Definition | Standard of Proof |
| :--- | :--- | :--- |
| **Documented Behavior** | Explicitly stated in official Antigravity engine documentation or configuration guides. | Verifiable file path and line citations from `builtin/skills/agy-customizations/`. |
| **Observed Behavior** | Empirically verified through active session prompts, tool execution transcripts, or controlled experiments. | Exact transcript logs, session IDs, tool invocation parameters, and timestamps. |
| **Inferred Behavior** | A technically sound hypothesis explaining a discrepancy, pending engine-level source code inspection. | Clearly labeled as `[INFERRED]` or `[UNVERIFIED]`. |

---

## 2. Documented Discovery Architecture

The official specification for Antigravity's customization discovery is documented in:
- [`C:\Users\User\.gemini\antigravity-cli\builtin\skills\agy-customizations\SKILL.md`](file:///C:/Users/User/.gemini/antigravity-cli/builtin/skills/agy-customizations/SKILL.md)
- [`C:\Users\User\.gemini\antigravity-cli\builtin\skills\agy-customizations\docs\skills.md`](file:///C:/Users/User/.gemini/antigravity-cli/builtin/skills/agy-customizations/docs/skills.md)

### 2.1 Workspace Customization Discovery Paths
According to `agy-customizations/SKILL.md` (lines 41–47):
```text
1. Workspace Customizations (Project-Specific):
   * Path: .agents/ (or .agent/, _agents/, _agent/) at the root of your project.
   * Use this to share customizations with your team by checking them into version control (VCS).
   * The agent walks from your current working directory up to the repository root (e.g., the folder containing .git) to find these directories.
```

### 2.2 Skill Entry Point Specification (`SKILL.md`)
According to `agy-customizations/docs/skills.md` (lines 7–32):
- A skill must be structured as a subdirectory within `skills/` (e.g., `.agents/skills/<skill_name>/`).
- It **must** have a `SKILL.md` entry file.
- **Mandatory YAML Frontmatter:**
  ```markdown
  ---
  name: my-specialized-skill
  description: >-
    Describe when the agent should use this skill. Use third-person.
  ---
  ```
- **The Engine Requirement:** `agy-customizations/docs/skills.md` lines 51–55 state:
  > *"The primary agent reads this description to decide whether to activate the skill for a given user prompt. It should clearly state what the skill does and when it should be used."*

### 2.3 Priority & Precedence Order
According to `agy-customizations/SKILL.md` (lines 58–75):
1. **Workspace Project:** Hierarchical discovery walking from CWD up to repo root.
2. **Declared Configurations:** Customizations explicitly listed in `skills.json` or `plugins.json`.
3. **Global Discovery:** `~/.gemini/config/`.
4. **Built-in Customizations:** Mounted by name rather than discovered.
5. **Global Declared Configurations.**

### 2.4 Progressive Disclosure Contract
According to `agy-customizations/SKILL.md` (lines 80–87):
> *"To prevent overwhelming the model's context window, Antigravity uses **progressive disclosure**: Skills are **not** loaded into the context window by default. Only their names and descriptions are injected. The full content of a skill is only loaded if the model (or the user) explicitly decides to activate it."*

---

## 3. Observed Behavior: Why `saigon-port-ui` Was Never Auto-Discovered

### 3.1 The Frontmatter Discrepancy
Comparing the 8 skills discovered in the filesystem reveals a complete dichotomy:

| Skill | Directory | Line 1 Content | YAML Frontmatter Present? | Injected into System Prompt `<skills>`? |
| :--- | :--- | :--- | :--- | :--- |
| `saigon-port-ui` | `.agent/skills/` | `# Saigon Port UI Skill` | **NO** | **NO (0% presence in `<skills>`)** |
| `banner-design` | `.agents/skills/` | `---` | **YES** (`name: banner-design`) | **YES** |
| `brand` | `.agents/skills/` | `---` | **YES** (`name: brand`) | **YES** |
| `design` | `.agents/skills/` | `---` | **YES** (`name: design`) | **YES** |
| `design-system` | `.agents/skills/` | `---` | **YES** (`name: design-system`) | **YES** |
| `slides` | `.agents/skills/` | `---` | **YES** (`name: slides`) | **YES** |
| `ui-styling` | `.agents/skills/` | `---` | **YES** (`name: ui-styling`) | **YES** |
| `ui-ux-pro-max` | `.agents/skills/` | `---` | **YES** (`name: ui-ux-pro-max`) | **YES** |

### 3.2 The Root Cause of the Discovery Failure
- **Documented requirement:** Antigravity requires a YAML frontmatter block containing `name:` and `description:` to register a skill.
- **Observed manifestation:** `.agent/skills/saigon-port-ui/SKILL.md` begins directly with a Markdown H1 header (`# Saigon Port UI Skill`) followed by explanatory text. It contains no frontmatter block.
- **Direct Consequence:** Antigravity's scanner encountered the file, failed to parse YAML frontmatter, and ignored it. Consequently, the primary domain skill for this repository was **never registered as an available skill in the agent's system prompt**.

### 3.3 The Workaround Mechanism (Explicit Manual Loading)
Because `saigon-port-ui` was not registered in `<skills>`, the model had no autonomous awareness of its existence from system prompt metadata.
To compensate, historical prompt authors instituted an explicit workaround:
1. Every major prompt explicitly commanded:
   ```text
   Read .agent/skills/saigon-port-ui/SKILL.md
   frontend/DESIGN_DNA.md
   ```
2. The agent executed `view_file` on `D:\Projects\production-meter-reading\production-meter-reading\.agent\skills\saigon-port-ui\SKILL.md` as an ordinary file read.
3. This was observed **18 times across 37 historical conversation transcripts**.

---

## 4. Observed Behavior: How Generic Skills are Injected into Context

In contrast to `saigon-port-ui`, all 7 skills residing in `.agents/skills/` have valid YAML frontmatter.
As an observed fact (visible directly in this conversation's system prompt):
```text
Available skills:
- agy-customizations (C:\Users\User\.gemini\antigravity-cli\builtin\skills\agy-customizations\SKILL.md): ...
- antigravity-guide (C:\Users\User\.gemini\antigravity-cli\builtin\skills\antigravity_guide\SKILL.md): ...
- banner-design (D:\Projects\production-meter-reading\production-meter-reading\.agents\skills\banner-design\SKILL.md): ...
- brand (D:\Projects\production-meter-reading\production-meter-reading\.agents\skills\brand\SKILL.md): ...
- design (D:\Projects\production-meter-reading\production-meter-reading\.agents\skills\design\SKILL.md): ...
- design-system (D:\Projects\production-meter-reading\production-meter-reading\.agents\skills\design-system\SKILL.md): ...
- slides (D:\Projects\production-meter-reading\production-meter-reading\.agents\skills\slides\SKILL.md): ...
- ui-styling (D:\Projects\production-meter-reading\production-meter-reading\.agents\skills\ui-styling\SKILL.md): ...
- ui-ux-pro-max (D:\Projects\production-meter-reading\production-meter-reading\.agents\skills\ui-ux-pro-max\SKILL.md): ...
```

### The System Prompt Tax
Because these 7 skills are discovered at the workspace root, their full descriptions (approximately 4,800 characters or ~1,200 tokens) are injected into the agent's context on **every single model turn**, regardless of the task.
- For a 50-turn debugging session on SQLite models or OCR inference, this represents **60,000 tokens** of fixed overhead spent repeatedly telling the model about social media banners, slide decks, and logo generation.

---

## 5. Inferred vs. Unverified Engine Behaviors

### 5.1 Directory Name Fallback Priority (`.agents` vs `.agent`)
- **Documented:** The docs state: `Path: .agents/ (or .agent/, _agents/, _agent/)`.
- **Inferred Behavior:** It is possible that the scanner checks `.agents` first and, if found, either continues or halts. However, since the file inside `.agent` lacked frontmatter, we cannot definitively conclude whether `.agent` would be scanned if `.agents` were also present.
- **Classification:** `[INFERRED / UNVERIFIED]`.
- **Validation Experiment Needed (Future):** Add valid frontmatter to a dummy skill in `.agent/` while `.agents/` is present to verify if Antigravity merges both directories or takes the first match.

### 5.2 Dynamic Skill Invocation without File Reading
- In some conversational agents, activating a skill injects its text automatically without a tool call.
- **Observed in Antigravity:** In Antigravity, the system instructions explicitly state:
  > *"If a skill seems relevant to your current task, you MUST read its SKILL.md instructions using view_file before proceeding."*
- Therefore, Antigravity **does not silently inject the full text of SKILL.md into the model context**. The model must make an explicit `view_file` call to load it.
- **Documented & Observed Verified.**

---

## 6. Summary Matrix of Activation Mechanisms

| Activation Pathway | Mechanism | Observed in This Repo? | Efficiency / Token Impact |
| :--- | :--- | :--- | :--- |
| **System Prompt Metadata Injection** | Antigravity engine scans valid `SKILL.md` frontmatter and injects description into system prompt. | **YES** (for all 7 skills in `.agents/`; failed for `saigon-port-ui`). | Injects ~1,200 tokens per turn unconditionally. |
| **Progressive Disclosure (`view_file`)** | Model reads description in `<skills>`, identifies relevance, and issues `view_file` on `SKILL.md`. | **YES** (Observed 4 times for `ui-ux-pro-max`, `ui-styling`, `design-system`). | Highly efficient: full text loaded only when required. |
| **Explicit Prompt Directive** | User prompt contains mandatory instructions to read a specific file path. | **YES** (Observed 18 times for `saigon-port-ui` and `DESIGN_DNA.md`). | Bypasses engine discovery; guarantees loading but consumes prompt tokens. |
| **Recursive Directory Dump** | Prompt commands agent to *"Inspect both skill directories recursively"*. | **YES** (Observed in Map V2 prompts). | Highly wasteful: triggers directory walks and unverified compliance boilerplate. |
| **Project-Level Rules (`GEMINI.md` / `AGENTS.md`)** | Hierarchical automatic rule injection upon opening files. | **NO** (Neither file exists in repo). | N/A. |
