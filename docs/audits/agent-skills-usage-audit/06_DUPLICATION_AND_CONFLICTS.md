# Duplication and Conflict Analysis Across Skills and Specifications

**Project:** Production Meter Reading — Cảng Sài Gòn  
**Repository:** `D:\Projects\production-meter-reading\production-meter-reading`  
**Audit Date:** 2026-09-23  
**Auditor:** Senior AI Agent Systems Engineer  

---

## 1. Conflict Classification Taxonomy

Every potential discrepancy identified during the audit is categorized under one of five rigorous classifications:

| Category | Definition | Resolution Strategy |
| :--- | :--- | :--- |
| **`SCOPE_DIFFERENCE`** | Guidance that appears contradictory only because it applies to different modules, devices, or workspaces. | Add clear scope scoping headers (e.g., `User Portal (Mobile)` vs. `Operations Portal (Desktop)`). |
| **`GENUINE_CONTRADICTION`** | Direct, irreconcilable conflicts where two active instructions mandate opposing actions within the same scope. | Apply the Authority Hierarchy; eliminate the lower-ranked rule. |
| **`DUPLICATE_INSTRUCTION`** | Identical or nearly identical rules repeated verbatim across multiple documents, consuming unnecessary tokens. | Consolidate into a single canonical source of truth and reference via hyperlink. |
| **`OUTDATED_INSTRUCTION`** | Relic instructions from earlier project milestones (e.g., V1 single-flow) left behind after architectural expansion. | Deprecate or delete the obsolete clause. |
| **`AMBIGUOUS_INSTRUCTION`** | Vaguely phrased rules lacking clear boundaries, leading agents to over-apply restrictions. | Clarify exact conditions, exemptions, and constraints. |

---

## 2. Detailed Findings Matrix

| Finding ID | Domain / Area | Source 1 Passage | Source 2 Passage | Classification | Analysis & Impact |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **CF-01** | **Neon & Presentation Mode** | `.agent/skills/saigon-port-ui/SKILL.md` (L69, L343): *"Do not use: Giao diện cyberpunk HUD hoặc viền dạ quang neon/glow... Reject if purple/cyber/neon visual language"* | `frontend/src/components/map-v2/MapV2Workspace.tsx` (L157-164): *Presentation Mode toggle: Technical Light vs. Neon Digital Twin overlay (`glowFilter`, `stdDeviation="2.2"`)* | **`SCOPE_DIFFERENCE` / `AMBIGUOUS_INSTRUCTION`** | Prohibiting neon was written for the mobile operator reading meters under bright sun. For the desktop Operations Portal GIS map, Neon is an explicitly required technical mode. The skill lacks a scope qualifier, causing false compliance failures. |
| **CF-02** | **V1 Single-Flow vs. Multi-Module Architecture** | `.agent/skills/saigon-port-ui/SKILL.md` (commit `e641232` L33-36): *"Do not add dashboard, login, history, analytics, map, account system, admin navigation..."* | `saigon-port-ui/SKILL.md` (Current L28-38): *"The application serves field personnel and administrative operations across six core modules: 1. Login, 2. Home Hub, 3. Meter Reading, 4. Attendance, 5. Schedule, 6. Admin Workspace / Map"* | **`OUTDATED_INSTRUCTION`** | The working tree update added the 6 core modules, but the anti-style list retained traces of the V1 single-flow mindset (e.g., *"unnecessary generic SaaS dashboard template introduced"*). |
| **CF-03** | **Palette & Token Specification** | `.agent/skills/saigon-port-ui/SKILL.md` (L80-148): *Dresscode source palette (`#003875`, `#415C94`, `#FCC959`, `#F39200`, `#FCFCFC`) and derived tokens* | `frontend/DESIGN_DNA.md` (L62-150): *Verbatim identical CSS color declarations and descriptions* | **`DUPLICATE_INSTRUCTION`** | Exact copy-paste of 70 lines of CSS token definitions across both files. Consumes ~1,500 tokens of duplicate context whenever an agent loads both files. |
| **CF-04** | **Minimum Touch Target Sizing** | `.agent/skills/saigon-port-ui/SKILL.md` (L65, L239): *"Khoảng cách chạm tối thiểu 48x48px cho môi trường sử dụng găng tay/thực địa"* | `.agents/skills/ui-ux-pro-max/SKILL.md` (L180) & `frontend/tests/mapV2UtilityPhase2_1InteractionHardening.test.ts`: *"Clickable targets >= 44x44px"* | **`SCOPE_DIFFERENCE`** | 48x48px is calibrated for mobile field workers wearing work gloves. 44x44px is the desktop/mouse WCAG 2.1 AA baseline. Both are valid in their respective portals, but need clear labeling. |
| **CF-05** | **Dark Mode Policy** | `.agent/skills/saigon-port-ui/SKILL.md` (L74): *"Do not use: Chế độ nền tối mặc định (dark mode default)"* | `.agents/skills/ui-ux-pro-max/data/styles.csv` (L8): *Recommends "Dark Mode (OLED) ... high contrast, eye-friendly, midnight blue"* | **`GENUINE_CONTRADICTION` (Resolved by Hierarchy)** | `ui-ux-pro-max` promotes generic dark mode. `saigon-port-ui` bans default dark mode because field devices are used in direct sunlight. By the Authority Hierarchy, `saigon-port-ui` wins; dark mode by default is prohibited. |
| **CF-06** | **Background Execution Guidance** | Antigravity Engine Tool Contract (`run_command`): *"IMPORTANT: Do NOT poll or loop on status to wait for completion. The system will automatically notify you..."* | Historical Prompts & Test Scripts: *Commands repeatedly invoking `manage_task(action: 'status')` and `Start-Sleep`* | **`GENUINE_CONTRADICTION`** | Historical prompt engineering contradicted the runtime tool contract, teaching agents to poll continuously rather than leveraging event-driven wake-up. |

---

## 3. Deep Dive: The Map V2 Neon & World Map Ambiguity (CF-01)

### The Exact Passages

In `.agent/skills/saigon-port-ui/SKILL.md`:
```markdown
## Visual direction
Do not use:
- Giao diện cyberpunk HUD hoặc viền dạ quang neon/glow,
- Bản đồ thế giới trang trí nền,
...
## Review checklist
Reject a UI implementation if any of these are true:
- purple/cyber/neon visual language,
```

In `frontend/src/components/map-v2/MapV2Workspace.tsx`:
```tsx
// Mode toggle explicitly requested for Map V2 Digital Twin
<button 
  className={viewMode === 'neon' ? 'active' : ''} 
  onClick={() => setViewMode('neon')}
>
  Chế độ Neon Digital Twin
</button>
```

In `frontend/src/components/map-v2/MapV2UtilityLayer.tsx`:
```tsx
<filter id="neon-glow-electric" x="-20%" y="-20%" width="140%" height="140%">
  <feGaussianBlur stdDeviation="2.2" result="blur" />
  <feMerge>
    <feMergeNode in="blur" />
    <feMergeNode in="SourceGraphic" />
  </feMerge>
</filter>
```

### Analysis
1. **Origin of the Ban:** In August 2026 (commit `e641232`), V1 was exclusively an outdoor smartphone app for photographing water and electric meters. Sci-fi neon glows and world-map wallpapers degraded outdoor readability and gave the impression of a fake demo rather than an operational port tool.
2. **Current Reality:** In September 2026, the project added Module 6: *Không gian Quản trị (Admin Workspace)* featuring a technical digital twin map of Tan Thuan port's utility lines. In engineering control rooms, a high-contrast dark/neon technical overlay for electrical lines is standard industrial GIS practice.
3. **The Problem:** The author of the skill updated the modules on lines 28–38, but did not update the negative constraints on lines 67–77. As a result, an AI agent reviewing Map V2 against `saigon-port-ui` would falsely report that Map V2 violates the skill's anti-style rules.
4. **Required Action:** The skill must be **clarified** by scoping the anti-style rules:
   - *User Portal (Mobile Meter Reading & Field Apps):* Neon/glow, dark mode default, and sci-fi motifs remain strictly prohibited.
   - *Operations Portal (Map V2 Desktop GIS):* Technical Light is the default; Neon Presentation Mode is an approved, restrained technical visualization mode for electrical and water utility overlays.

---

## 4. Deep Dive: Token Duplication between Skill and Design DNA (CF-03)

### The Overlap
The exact same CSS custom property declarations appear in both:
- `.agent/skills/saigon-port-ui/SKILL.md` (lines 85–148, 64 lines)
- `frontend/DESIGN_DNA.md` (lines 68–150, 83 lines)

Both files define:
```css
--sgp-corporate-navy: #003875;
--sgp-corporate-blue: #415C94;
--sgp-corporate-yellow: #FCC959;
--sgp-corporate-orange: #F39200;
--sgp-corporate-digital-blue: #0068FF;
--sgp-corporate-white: #FFFFFF;
--sgp-corporate-porcelain: #FCFCFC;
--sgp-corporate-black: #181818;
--sgp-corporate-charcoal: #252525;
--sgp-corporate-gray: #5E5B5B;
```
Along with the complete derived token set (`--sgp-navy-hover`, `--sgp-blue-subtle`, `--sgp-yellow-border`, etc.) and functional semantic tier (`--sgp-success`, `--sgp-warning`, `--sgp-danger`).

### Evaluation
- When an agent is instructed to read **both** files in a single prompt, it receives approximately **1,500 tokens of redundant CSS code**.
- Furthermore, having two files with identical color definitions introduces maintenance drift risk if one file is updated and the other is neglected.
- **Canonical Source:** `frontend/DESIGN_DNA.md` is designated as the *Official Design System Specification*. `saigon-port-ui` should retain high-level visual principles and link directly to `DESIGN_DNA.md` for the full CSS token table rather than duplicating it.
