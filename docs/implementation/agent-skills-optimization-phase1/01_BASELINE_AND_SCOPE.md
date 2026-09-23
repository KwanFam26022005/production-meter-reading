# Baseline State, Mission Scope, and Boundary Conditions

**Project:** Production Meter Reading — Cảng Sài Gòn  
**Repository:** `D:\Projects\production-meter-reading\production-meter-reading`  
**Current Branch:** `feature/v16e-network-map-overlay-r1`  
**Base Commit (HEAD):** `5d37047 feat(v16e-r1): handoff desktop UX r1 - admin schedules, reports, logbook & QA capture script`  
**Date:** 2026-09-23  
**Implementation Phase:** Phase 1 — Skills & Agent Execution Optimization  

---

## 1. Executive Summary and Mission Objective

This optimization phase implements the concrete findings established in the repository skills audit (`docs/audits/agent-skills-usage-audit/`). The overarching objective is to eliminate repetitive skill loading, unnecessary agent turns, manual polling loops, and context overhead across AI engineering sessions **without compromising engineering safety, product functionality, or architectural rigor**.

### What This Phase IS:
- An **agent workflow, governance, and skill discovery optimization**.
- A non-destructive remediation of the missing YAML frontmatter defect in `.agent/skills/saigon-port-ui/SKILL.md`.
- A formal disambiguation of visual scopes (Mobile User Portal vs. Desktop Operations Portal vs. Map V2 Digital Twin).
- The establishment of persistent project-level execution rules in `AGENTS.md`.
- An empirical demonstration of event-driven background job waiting.

### What This Phase IS NOT:
- **NOT** a product-feature phase.
- Does **NOT** modify OCR inference pipelines, attendance logic, meter-reading workflows, or database models.
- Does **NOT** alter Map V1 or frozen Map V2 B2 geometry.
- Does **NOT** modify or delete existing skills in `.agents/skills/`.
- Does **NOT** perform Git resets, clean checkouts, commits, pushes, or deployments.

---

## 2. Git Safety and Baseline Working-Tree State

Prior to executing any modifications, repository status and working tree modifications were authoritatively recorded:

```powershell
git status --short --branch
git log -5 --oneline --decorate
git diff --stat
git diff --cached --stat
```

### 2.1 Branch and Commit Tracking
- **Active Branch:** `feature/v16e-network-map-overlay-r1`
- **Tracked Origin:** `origin/feature/v16e-network-map-overlay-r1`
- **Recent Commit History:**
  - `5d37047` feat(v16e-r1): handoff desktop UX r1 - admin schedules, reports, logbook & QA capture script
  - `1f0d3eb` feat(v16e): consolidate information architecture to four workspaces
  - `b5ebd58` style(network): correct on-map utility network overlay with Saigon Port maritime palette
  - `0e4500a` feat(network): implement V16E map-native digital twin utility network overlay
  - `a17335a` docs(recovery): capture r2 mobile device review evidence

### 2.2 Working-Tree Invariants
The repository contained 18 uncommitted modified files in progress across backend, frontend, and existing audit documentation. **All 18 modified files and untracked assets were strictly preserved without reverts, resets, or stashes**. Staged changes remained at exactly zero throughout.

---

## 3. Discovered Inventory and Architectural Asymmetry

The repository exhibits an asymmetric two-directory structure for AI customizations:

| Directory | Files | Size | Version Control | Scope |
| :--- | :--- | :--- | :--- | :--- |
| **`.agent/skills/`** | 1 file | 16.4 KB | **Git-Tracked** (Committed in `e641232`) | Domain operating rules (`saigon-port-ui`) |
| **`.agents/skills/`** | 172 files | 4.26 MB | **Git-Ignored** (`.gitignore:59`) | 7 generic design/creative skills |

### The Local Skills Inventory (Reconciled Count: Exactly 8 Local Skills)
1. `saigon-port-ui` (`.agent/skills/saigon-port-ui/SKILL.md`): Domain UI specification.
2. `banner-design` (`.agents/skills/banner-design/SKILL.md`): Marketing banner design.
3. `brand` (`.agents/skills/brand/SKILL.md`): Brand voice & copywriting.
4. `design` (`.agents/skills/design/SKILL.md`): Corporate identity & Gemini AI logos.
5. `design-system` (`.agents/skills/design-system/SKILL.md`): 3-tier design token model.
6. `slides` (`.agents/skills/slides/SKILL.md`): HTML presentation decks.
7. `ui-styling` (`.agents/skills/ui-styling/SKILL.md`): Tailwind & shadcn components.
8. `ui-ux-pro-max` (`.agents/skills/ui-ux-pro-max/SKILL.md`): UI/UX intelligence database (including 164 data/script files).

*Built-in engine skills mounted separately:* `agy-customizations`, `antigravity-guide`.

---

## 4. Key Bottlenecks Identified for Optimization

1. **Discovery Failure of Primary Domain Skill:** `saigon-port-ui` lacked YAML frontmatter fences, causing the Antigravity scanner (`skills.go:201`) to emit a parse error and fail to mount it into `<skills>`, forcing developers into repetitive manual path reading prompts.
2. **Instructional Ambiguity in Visual Scope:** `saigon-port-ui` banned neon/glow across the entire application without distinguishing the harsh-sunlight mobile User Portal from the technical GIS digital twin in Map V2.
3. **Pervasive Historical Polling Pathology:** Transcripts recorded 35–51 status polling calls and repeated PowerShell sleep commands per session, burning 15,000 to 25,000 tokens per session.
4. **Phantom Compliance Ceremonies:** Past prompts forced multi-page boilerplate compliance reports for skills that were never opened.
