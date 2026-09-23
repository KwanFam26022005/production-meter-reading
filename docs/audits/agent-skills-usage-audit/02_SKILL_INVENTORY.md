# Skill Inventory: Comprehensive Audit of `.agent` and `.agents`

**Project:** Production Meter Reading — Cảng Sài Gòn  
**Repository Root:** `D:\Projects\production-meter-reading\production-meter-reading`  
**Audit Timestamp:** 2026-09-23  
**Auditor:** Senior AI Agent Systems Engineer  

---

## 1. Directory Structure and Architectural Separation

The repository contains two distinct directory paths with similar naming but completely separate lifecycles, contents, and Git tracking states:
- **`D:\Projects\production-meter-reading\production-meter-reading\.agent`** (Singular)
- **`D:\Projects\production-meter-reading\production-meter-reading\.agents`** (Plural)

These directories are **not interchangeable** and serve diametrically opposed roles in the project's governance.

### 1.1 Physical Directory Overview

| Directory Path | File Count | Total Size (Bytes) | Human-Readable Size | Git Tracking Status | Origin & Primary Purpose |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `.agent` | 1 | 16,407 | 16.0 KB | **100% Tracked** in Git | Project domain specification (`saigon-port-ui`) tailored to Saigon Port operations |
| `.agents` | 172 | 4,258,404 | 4.16 MB | **100% Ignored** by `.gitignore:59` | Generic third-party creative/UX design intelligence suite |
| **Combined** | **173** | **4,274,811** | **4.18 MB** | **0.58% Tracked / 99.42% Ignored** | Entire local skill ecosystem |

### 1.2 Symlink, Junction, and External Reference Analysis
- **Filesystem Junctions / Symlinks:** A recursive check across both `.agent` and `.agents` confirmed that **zero directory symlinks or Windows NTFS junctions** exist. All 173 files are standard physical files on disk.
- **External References:** `banner-design` references non-existent external skills (`frontend-design`, `ai-artist`, `ai-multimodal`), which are not installed locally.

---

## 2. Inventory of Discovered Skills

A total of **8 skills** (defined by the presence of a `SKILL.md` entry point) were discovered across both directories:
1. `saigon-port-ui` (in `.agent/skills/`)
2. `banner-design` (in `.agents/skills/`)
3. `brand` (in `.agents/skills/`)
4. `design` (in `.agents/skills/`)
5. `design-system` (in `.agents/skills/`)
6. `slides` (in `.agents/skills/`)
7. `ui-styling` (in `.agents/skills/`)
8. `ui-ux-pro-max` (in `.agents/skills/`)

### Summary Table of All 8 Discovered Skills

| Skill ID | Exact Path | Scope | Source | Entry Point | Frontmatter Valid? | Auto-Mounted in `<skills>`? | Disk Footprint | Est. Tokens |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **`saigon-port-ui`** | [`.agent/skills/saigon-port-ui/SKILL.md`](file:///D:/Projects/production-meter-reading/production-meter-reading/.agent/skills/saigon-port-ui/SKILL.md) | Domain UI / Maritime Field & Admin | Git-Tracked | `SKILL.md` | **No** (Lacks `---` YAML) | **No** (Hidden from `<skills>`) | 16,407 B / 350 L | ~4,100 |
| **`banner-design`** | [`.agents/skills/banner-design/SKILL.md`](file:///D:/Projects/production-meter-reading/production-meter-reading/.agents/skills/banner-design/SKILL.md) | Marketing / Creative Banners & Ads | Git-Ignored | `SKILL.md` | **Yes** | **Yes** | 8,326 B / 196 L | ~2,080 |
| **`brand`** | [`.agents/skills/brand/SKILL.md`](file:///D:/Projects/production-meter-reading/production-meter-reading/.agents/skills/brand/SKILL.md) | Marketing / Brand Voice & Asset Guide | Git-Ignored | `SKILL.md` | **Yes** | **Yes** | 2,939 B / 97 L | ~735 |
| **`design`** | [`.agents/skills/design/SKILL.md`](file:///D:/Projects/production-meter-reading/production-meter-reading/.agents/skills/design/SKILL.md) | Corporate Identity / Logo / Mockups | Git-Ignored | `SKILL.md` | **Yes** | **Yes** | 12,322 B / 313 L | ~3,080 |
| **`design-system`** | [`.agents/skills/design-system/SKILL.md`](file:///D:/Projects/production-meter-reading/production-meter-reading/.agents/skills/design-system/SKILL.md) | Generic 3-Tier Design Tokens | Git-Ignored | `SKILL.md` | **Yes** | **Yes** | 6,875 B / 244 L | ~1,720 |
| **`slides`** | [`.agents/skills/slides/SKILL.md`](file:///D:/Projects/production-meter-reading/production-meter-reading/.agents/skills/slides/SKILL.md) | HTML Presentations / Chart.js | Git-Ignored | `SKILL.md` | **Yes** | **Yes** | 1,137 B / 40 L | ~285 |
| **`ui-styling`** | [`.agents/skills/ui-styling/SKILL.md`](file:///D:/Projects/production-meter-reading/production-meter-reading/.agents/skills/ui-styling/SKILL.md) | Tailwind CSS & shadcn/ui Components | Git-Ignored | `SKILL.md` | **Yes** | **Yes** | 10,045 B / 324 L | ~2,510 |
| **`ui-ux-pro-max`** | [`.agents/skills/ui-ux-pro-max/SKILL.md`](file:///D:/Projects/production-meter-reading/production-meter-reading/.agents/skills/ui-ux-pro-max/SKILL.md) | Universal UI/UX Design Intelligence | Git-Ignored | `SKILL.md` | **Yes** | **Yes** | 28,032 B / 425 L | ~7,000 |

---

## 3. Deep-Dive Profiles for Each Discovered Skill

### 3.1 Skill: `saigon-port-ui`
- **Skill ID:** `saigon-port-ui`
- **Location:** `D:\Projects\production-meter-reading\production-meter-reading\.agent\skills\saigon-port-ui\SKILL.md`
- **Scope:** Domain-specific UI/UX for Saigon Port: Mobile field meter reading, OCR camera frame, photo attendance, schedule/leave, and Operations Portal Admin Workspace.
- **Source:** **Git-tracked**. Added in commit `e641232` (2026-08-26); currently has uncommitted working tree modifications reflecting the approved corporate dresscode palette and Home Hub redesign.
- **Entry Point:** `.agent/skills/saigon-port-ui/SKILL.md` (no subdirectories exist in `.agent/skills/saigon-port-ui/`).
- **Dependencies:**
  - `frontend/DESIGN_DNA.md` (Official Design System specification).
  - Existing API endpoints: `getTodayOperations`, `getTodayAttendance`, `getUserMonthlySchedule`.
- **Activation:** **Manual / Explicit prompt instruction**. Because this file starts on line 1 with `# Saigon Port UI Skill` without YAML frontmatter (`---`), Antigravity's discovery scanner skips mounting it into the system prompt's `<skills>` block. The agent only reads it when the user prompt explicitly orders: *"Read `.agent/skills/saigon-port-ui/SKILL.md`"*.
- **Applicability:** Required whenever creating, modifying, reviewing, or styling any user-facing screen across User Portal (Mobile) or Operations Portal (Desktop).
- **Context Footprint:**
  - File Size: 16,407 bytes
  - Line Count: 350 lines
  - Character Count: 14,120 characters
  - Estimated Tokens: ~4,100 tokens (mix of Vietnamese and code blocks).
- **Evidence & Key Line Ranges:**
  - Mission & Aesthetic: [Lines 5–13](file:///D:/Projects/production-meter-reading/production-meter-reading/.agent/skills/saigon-port-ui/SKILL.md#L5-L13) (*Maritime Operational Minimalism*).
  - Authority Hierarchy: [Lines 15–27](file:///D:/Projects/production-meter-reading/production-meter-reading/.agent/skills/saigon-port-ui/SKILL.md#L15-L27) (Product behavior > This skill > `DESIGN_DNA.md` > Accessibility > Generic skills).
  - Six Core Modules: [Lines 28–38](file:///D:/Projects/production-meter-reading/production-meter-reading/.agent/skills/saigon-port-ui/SKILL.md#L28-L38).
  - OCR Workflow Constraints: [Lines 39–52](file:///D:/Projects/production-meter-reading/production-meter-reading/.agent/skills/saigon-port-ui/SKILL.md#L39-L52).
  - Prohibited Anti-Style: [Lines 67–77](file:///D:/Projects/production-meter-reading/production-meter-reading/.agent/skills/saigon-port-ui/SKILL.md#L67-L77).
  - Approved Dresscode Source Palette: [Lines 80–106](file:///D:/Projects/production-meter-reading/production-meter-reading/.agent/skills/saigon-port-ui/SKILL.md#L80-L106).
  - Review Checklist: [Lines 333–350](file:///D:/Projects/production-meter-reading/production-meter-reading/.agent/skills/saigon-port-ui/SKILL.md#L333-L350).

---

### 3.2 Skill: `ui-ux-pro-max`
- **Skill ID:** `ui-ux-pro-max`
- **Location:** `D:\Projects\production-meter-reading\production-meter-reading\.agents\skills\ui-ux-pro-max\SKILL.md`
- **Scope:** Universal UI/UX design intelligence across web, mobile, and desktop stacks.
- **Source:** **Git-ignored** by `.gitignore:59` (`.agents/`).
- **Entry Point:** `.agents/skills/ui-ux-pro-max/SKILL.md`
- **Subdirectories & Files:**
  - Total files: 68 files.
  - Subdirectories: `data/` (50 CSV and JSON files, 3.32 MB), `scripts/` (16 Python files, 190 KB).
  - Total directory size: **3,539,312 bytes (~3.54 MB)**.
- **Dependencies:**
  - Relies on local Python CLI scripts (`scripts/core.py`, `scripts/design_system.py`, `scripts/search.py`) and large datasets (`styles.csv`, `colors.csv`, `typography.csv`, `ux-guidelines.csv`, `stacks/*.csv`).
- **Activation:** **Auto-discovered** into the system prompt `<skills>` block. Progressive disclosure allows the agent to read `SKILL.md` or execute search scripts on demand.
- **Applicability:** General web styling, accessibility contrast verification, responsive breakpoints, touch target minimums.
- **Context Footprint:**
  - `SKILL.md` Entry Point: 28,032 bytes / 425 lines (~7,000 tokens).
  - Supporting Database: 3.51 MB (~875,000 tokens if read).
- **Evidence & Key Line Ranges:**
  - YAML Frontmatter: [Lines 1–8](file:///D:/Projects/production-meter-reading/production-meter-reading/.agents/skills/ui-ux-pro-max/SKILL.md#L1-L8).
  - Search Script Reference: [Lines 35–50](file:///D:/Projects/production-meter-reading/production-meter-reading/.agents/skills/ui-ux-pro-max/SKILL.md#L35-L50).

---

### 3.3 Skill: `ui-styling`
- **Skill ID:** `ui-styling`
- **Location:** `D:\Projects\production-meter-reading\production-meter-reading\.agents\skills\ui-styling\SKILL.md`
- **Scope:** Component-level UI implementation with shadcn/ui (Radix UI) and Tailwind CSS.
- **Source:** **Git-ignored** by `.gitignore:59`.
- **Entry Point:** `.agents/skills/ui-styling/SKILL.md`
- **Subdirectories & Files:** 16 files total (170,925 bytes). Subdirs: `references/` (6 markdown files), `scripts/` (8 Python/bash files).
- **Dependencies:** References `design-system` and Tailwind CSS configurations.
- **Activation:** Auto-discovered into system prompt `<skills>`.
- **Applicability:** Implementing dialogs, dropdowns, forms, data tables, and accessible component behaviors in React.
- **Context Footprint:** 10,045 bytes / 324 lines (~2,510 tokens). References add 160 KB (~40,000 tokens).

---

### 3.4 Skill: `design-system`
- **Skill ID:** `design-system`
- **Location:** `D:\Projects\production-meter-reading\production-meter-reading\.agents\skills\design-system\SKILL.md`
- **Scope:** Token architecture (3-tier: primitive -> semantic -> component) and component specifications.
- **Source:** **Git-ignored** by `.gitignore:59`.
- **Entry Point:** `.agents/skills/design-system/SKILL.md`
- **Subdirectories & Files:** 27 files total (179,018 bytes). Subdirs: `data/` (1 file), `references/` (18 files), `scripts/` (3 files), `templates/` (3 files).
- **Dependencies:** References `brand`, `design`, `ui-styling`, `slides`.
- **Activation:** Auto-discovered into system prompt `<skills>`.
- **Applicability:** Defining design tokens and systematic component token inheritance. (Largely redundant with `DESIGN_DNA.md`).
- **Context Footprint:** 6,875 bytes / 244 lines (~1,720 tokens). Supporting files add 172 KB (~43,000 tokens).

---

### 3.5 Skill: `design`
- **Skill ID:** `design`
- **Location:** `D:\Projects\production-meter-reading\production-meter-reading\.agents\skills\design\SKILL.md`
- **Scope:** Comprehensive corporate design: brand identity, logo generation (Gemini AI), CIP mockups, HTML presentations, social banners, icon design.
- **Source:** **Git-ignored** by `.gitignore:59`.
- **Entry Point:** `.agents/skills/design/SKILL.md`
- **Subdirectories & Files:** 35 files total (241,945 bytes). Subdirs: `data/` (2 files), `references/` (25 files), `scripts/` (6 files).
- **Dependencies:** Interlinks with `brand`, `design-system`, `slides`, `ui-styling`, `ui-ux-pro-max`.
- **Activation:** Auto-discovered into system prompt `<skills>`.
- **Applicability:** Corporate visual identity generation, pitch presentations, marketing graphics. (Irrelevant to utility meter reading).
- **Context Footprint:** 12,322 bytes / 313 lines (~3,080 tokens). Supporting files add 229 KB (~57,000 tokens).

---

### 3.6 Skill: `brand`
- **Skill ID:** `brand`
- **Location:** `D:\Projects\production-meter-reading\production-meter-reading\.agents\skills\brand\SKILL.md`
- **Scope:** Brand voice, marketing messaging frameworks, social media asset guidelines.
- **Source:** **Git-ignored** by `.gitignore:59`.
- **Entry Point:** `.agents/skills/brand/SKILL.md`
- **Subdirectories & Files:** 18 files total (88,892 bytes). Subdirs: `references/` (11 files), `scripts/` (1 file), `templates/` (4 files).
- **Dependencies:** References `design`.
- **Activation:** Auto-discovered into system prompt `<skills>`.
- **Applicability:** Marketing copywriting, PR messaging. (Irrelevant to port field operations).
- **Context Footprint:** 2,939 bytes / 97 lines (~735 tokens). Supporting files add 86 KB (~21,500 tokens).

---

### 3.7 Skill: `banner-design`
- **Skill ID:** `banner-design`
- **Location:** `D:\Projects\production-meter-reading\production-meter-reading\.agents\skills\banner-design\SKILL.md`
- **Scope:** Designing social media, ad, and website hero banners.
- **Source:** **Git-ignored** by `.gitignore:59`.
- **Entry Point:** `.agents/skills/banner-design/SKILL.md`
- **Subdirectories & Files:** 2 files total (13,319 bytes). Subdirs: `references/` (1 file).
- **Dependencies:** References `ui-ux-pro-max`, `frontend-design`, `ai-artist`, `ai-multimodal`.
- **Activation:** Auto-discovered into system prompt `<skills>`.
- **Applicability:** Social media advertising banners (Facebook, Instagram, LinkedIn, Google Display). (100% irrelevant to project).
- **Context Footprint:** 8,326 bytes / 196 lines (~2,080 tokens).

---

### 3.8 Skill: `slides`
- **Skill ID:** `slides`
- **Location:** `D:\Projects\production-meter-reading\production-meter-reading\.agents\skills\slides\SKILL.md`
- **Scope:** Creating strategic HTML presentation slides with Chart.js.
- **Source:** **Git-ignored** by `.gitignore:59`.
- **Entry Point:** `.agents/skills/slides/SKILL.md`
- **Subdirectories & Files:** 6 files total (19,304 bytes). Subdirs: `references/` (4 files).
- **Dependencies:** References `design`.
- **Activation:** Auto-discovered into system prompt `<skills>`.
- **Applicability:** Building executive pitch slide decks. (Irrelevant to project).
- **Context Footprint:** 1,137 bytes / 40 lines (~285 tokens).

---

## 4. Supporting File Breakdown in `.agents/`

The 172 files in `.agents/` break down by extension as follows:

| Extension | File Count | Total Size (Bytes) | Size (KB) | Typical Role |
| :--- | :--- | :--- | :--- | :--- |
| **`.csv`** | 53 | 1,895,474 | 1,851.0 KB | UX guidelines, color palettes, UI reasoning tables, framework stacks |
| **`.json`** | 17 | 1,474,077 | 1,439.5 KB | Benchmark fixtures, font datasets, animation presets |
| **`.py`** | 35 | 506,687 | 494.8 KB | Data search scripts, design token validators, automated tests |
| **`.md`** | 57 | 312,433 | 305.1 KB | Skill entry points (`SKILL.md`) and reference documentation |
| **`.cjs`** | 7 | 52,191 | 51.0 KB | JavaScript helper utilities |
| **`.txt`** | 3 | 11,853 | 11.6 KB | Plain text configuration and notes |
| **Total** | **172** | **4,258,404** | **4,159.0 KB** | Entire third-party skill payload |

---

## 5. Architectural Findings & Key Takeaways

1. **Physical Asymmetry:** `.agent` contains 1 single domain file (16 KB), which is Git-tracked. `.agents` contains a sprawling 4.26 MB package (172 files) of generic design skills, all ignored by Git.
2. **Missing In-Project Configs:** Neither directory contains rule files (`.agents/rules` or `GEMINI.md`), explicit manifest files (`skills.json`, `plugins.json`), or hook configs (`hooks.json`).
3. **The Discovery Paradox:** The only skill specifically written for this project (`saigon-port-ui`) is **the only skill not discovered by Antigravity's system prompt** because it lacks YAML frontmatter. Meanwhile, all 7 generic, uncommitted skills are mounted into the agent's prompt on every turn.
