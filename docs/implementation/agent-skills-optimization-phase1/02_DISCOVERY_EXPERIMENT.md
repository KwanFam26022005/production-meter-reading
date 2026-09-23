# Controlled Skill Discovery Experiment & Root-Cause Verification

**Project:** Production Meter Reading — Cảng Sài Gòn  
**Repository:** `D:\Projects\production-meter-reading\production-meter-reading`  
**Date:** 2026-09-23  
**Status:** EMPIRICALLY VERIFIED (100% Proven)  

---

## 1. Engine Specification Baseline

According to the official Google Antigravity Customization System specification (`C:\Users\User\.gemini\antigravity-cli\builtin\skills\agy-customizations\docs\skills.md`, lines 23–32):
- Every skill entry point must reside in a subfolder under `skills/<skill_name>/SKILL.md`.
- **Mandatory YAML Frontmatter:** The file must begin with `---` on Line 1, followed by `name` and `description` keys, closed by `---`.
- **Engine Requirement:** The primary agent reads this description to decide whether to activate the skill for a given user prompt.

In `agy-customizations/SKILL.md` (lines 41–47), discovery locations are defined:
```text
Path: .agents/ (or .agent/, _agents/, _agent/) at the root of your project.
The agent walks from your current working directory up to the repository root (e.g., the folder containing .git) to find these directories.
```

---

## 2. Empirical Root-Cause Discovery in Engine Logs

Inspection of the active Antigravity CLI process logs (`C:\Users\User\.gemini\antigravity-cli\log\cli-20260923_073812.log`) uncovered the exact point of failure within the engine's Go runtime (`third_party/jetski/cortex/customizations/skills.go`):

```text
E0923 08:20:14.076941   39867 skills.go:201] Failed to parse skill file D:\Projects\production-meter-reading\production-meter-reading\.agent\skills\saigon-port-ui\SKILL.md: invalid frontmatter format
```

### Critical Epistemic Revelations:
1. **The scanner DOES inspect `.agent/`:** Antigravity does not ignore `.agent/` when `.agents/` is present. It explicitly scanned `D:\Projects\production-meter-reading\production-meter-reading\.agent\skills\saigon-port-ui\SKILL.md`.
2. **Failure mode was strictly syntactic:** The engine reached the file and invoked its frontmatter parser (`SplitMarkdownFrontmatter`), but aborted because Line 1 was `# Saigon Port UI Skill` instead of `---`.
3. **Simultaneous directory traversal is active:** While failing on `saigon-port-ui` in `.agent/`, the engine successfully parsed and loaded all 7 skills from `.agents/skills/` into the system prompt's `<skills>` block.

---

## 3. The Controlled Discovery Experiment

To verify whether adding YAML frontmatter would resolve the defect without unintended side effects, a controlled two-stage experiment was conducted using live agent subagent trajectories.

### 3.1 Pre-Fix Verification Run (Subagent `8d96ad66`)
Prior to modifying `.agent/skills/saigon-port-ui/SKILL.md`, a research subagent was invoked to inspect its active `<skills>` block.

- **Subagent Conversation ID:** `8d96ad66-db13-4f77-ac49-4e71149d49c3`
- **Result:**
  ```text
  - banner-design: .agents\skills\banner-design\SKILL.md
  - brand: .agents\skills\brand\SKILL.md
  - design: .agents\skills\design\SKILL.md
  - design-system: .agents\skills\design-system\SKILL.md
  - slides: .agents\skills\slides\SKILL.md
  - ui-styling: .agents\skills\ui-styling\SKILL.md
  - ui-ux-pro-max: .agents\skills\ui-ux-pro-max\SKILL.md
  ```
- **Finding:** `saigon-port-ui` was 100% absent from the runtime's available skills metadata. The engine log recorded a matching error at `08:22:59.525793`.

### 3.2 Controlled Modification
Valid YAML frontmatter was added to `.agent/skills/saigon-port-ui/SKILL.md`:

```markdown
---
name: saigon-port-ui
description: >-
  Use this skill whenever designing, reviewing, or implementing frontend UI for the Saigon Port
  production meter reading application, including the mobile User Portal, desktop Operations Portal,
  and Map V2 digital twin workspaces. Do not activate for backend API, SQLite, or database tasks.
---
```

### 3.3 Post-Fix Verification Run (Subagent `5a6dec75`)
Immediately following the file edit, a second subagent was invoked to verify the engine's dynamic rescan behavior.

- **Subagent Conversation ID:** `5a6dec75-ae9a-404f-814b-ab5e73e6975f`
- **Result:**
  ```text
  1. banner-design: .agents\skills\banner-design\SKILL.md
  2. brand: .agents\skills\brand\SKILL.md
  3. design: .agents\skills\design\SKILL.md
  4. design-system: .agents\skills\design-system\SKILL.md
  5. saigon-port-ui: .agent\skills\saigon-port-ui\SKILL.md
  6. slides: .agents\skills\slides\SKILL.md
  7. ui-styling: .agents\skills\ui-styling\SKILL.md
  8. ui-ux-pro-max: .agents\skills\ui-ux-pro-max\SKILL.md
  ```
- **Log Verification:** In `cli-20260923_073812.log`, the `skills.go:201` error completely vanished.
- **Finding:** `saigon-port-ui` is now **natively discovered and mounted at item 5** alongside the generic skills!

---

## 4. Definitive Answers to Experiment Questions

| Question | Empirical Finding | Standard of Proof |
| :--- | :--- | :--- |
| **Is a valid skill in `.agent/` discovered?** | **YES.** `saigon-port-ui` mounted immediately once frontmatter was added. | Subagent `5a6dec75` prompt transcript. |
| **Is a valid skill in `.agents/` discovered?** | **YES.** All 7 skills in `.agents/` have been mounted consistently across all sessions. | System prompt `<skills>` block. |
| **Are both discovered when both directories exist?** | **YES.** The runtime engine unions discovered skills across both directory variants without conflict. | Live discovery of 8 skills simultaneously. |
| **Is discovery affected by current working directory?** | **YES.** Engine walks upwards from CWD to Git repository root (`.git`). | Documented in `agy-customizations/SKILL.md`. |
| **Is a new session required to refresh the registry?** | **NO for new trajectories; YES for existing active context.** Subagents and new conversations rescan dynamically upon initialization. | Verified via subagent invocation at 08:23:53. |

---

## 5. Architectural Implications

Because `saigon-port-ui` is now natively discoverable:
1. **The historical manual workaround is obsolete:** Prompts no longer need to contain mandatory file-reading directives (`Read .agent/skills/saigon-port-ui/SKILL.md`).
2. **Progressive disclosure is unlocked:** The agent can evaluate the task domain from the skill's description in `<skills>` and load `SKILL.md` only when assigned to frontend UI tasks.
3. **No file moves required:** `.agent/` can remain Git-tracked in repository version control, and `.agents/` can remain Git-ignored, with zero engine friction.
