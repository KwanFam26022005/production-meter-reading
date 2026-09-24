---
name: saigon-port-ui
description: >-
  Shared UI judgment for the Saigon Port meter-reading User and Operations portals.
  Use for frontend design, implementation, or review; pair with the Admin responsive
  or Map V2 skill only when that workspace is affected. Do not use for backend-only work.
---

# Saigon Port shared UI

## Purpose and authority

Create a trustworthy operational workspace with **Maritime Operational Minimalism**: restrained maritime identity, clear hierarchy, real status, and human-centered controls. AI/OCR supports the operator without becoming the visual theme.

This skill owns shared visual and interaction judgment. [`frontend/DESIGN_DNA.md`](../../../frontend/DESIGN_DNA.md) owns approved colors, derived and semantic tokens, contrast pairs, typography, spacing, radii, component dimensions, and motion timings. Use its values rather than copying HEX or size tables here. [`harness/gates.yml`](../../../harness/gates.yml) owns verification, not this skill.

Current source and tests own product behavior. Use [`harness/context-index.yml`](../../../harness/context-index.yml) and compact domain contracts ([`docs/contracts/`](../../../docs/contracts/)) when progress, task assignment, Map data, or other product meaning matters. Do not settle a domain conflict by changing UI prose.

## Shared interface judgment

- Make the current task and primary action obvious. Use operational status and provenance that users can understand and verify; do not invent live data or fake AI progress.
- Use the Saigon Port light, high-contrast identity and subtle borders. Avoid generic SaaS decoration, purple gradients, heavy glass, gratuitous 3D maritime objects, sci-fi HUDs, and decorative animation.
- Keep Vietnamese labels short and action-oriented. Use familiar terms such as `Chụp công tơ`, `Đọc chỉ số`, `Chụp lại`, and `Xác nhận`. Keep model names, inference jargon, and confidence thresholds out of normal operator copy.
- Make state understandable without color alone. Maintain readable contrast, visible keyboard focus, meaningful labels, and a logical focus/reading order. Consult DESIGN_DNA for measured contrast; optional external UX guidance is only supplementary.
- Prefer one strong primary action per state. Keep supporting actions available without competing for attention. Preserve existing behavior while improving presentation.

## User Portal profile

Field reading, camera capture, and attendance happen under bright outdoor light and sometimes with one hand or gloves. Favor strong contrast, generous touch areas, simple sequential actions, and direct recovery from errors. Keep camera and result controls clear; the Home Hub navigation must not obscure the capture/review workflow.

For OCR interaction, guide the operator through capture, preview, processing, and result/review. Use a plain rectangular camera guide, preserve image detail for comparison, and show truthful processing state. The reading is visually prominent; uncertain results offer a clear retake action and manual entry when available. Do not show fabricated progress or futuristic scan effects.

The Home Hub can show progress and insights, but their denominator, assignment meaning, and data source are product/domain truths. Consult the compact contract ([`docs/contracts/user-task-projection.md`](../../../docs/contracts/user-task-projection.md)) and current source. Do not turn global progress into personal progress or the reverse through UI copy alone.

## Operations Portal profile

Support data-dense inspection, schedules, inventory, filters, and audit work with clear table hierarchy and keyboard operation. Favor readable information density over decorative KPI tiles. For layout adaptation, dialogs, tables, sidebars, drawers, and zoom behavior, load [`saigon-port-admin-responsive`](../saigon-port-admin-responsive/SKILL.md). For GIS/network work, load [`saigon-port-map-v2`](../saigon-port-map-v2/SKILL.md).

Neon Digital Twin styling is a Map-only exception governed by the Map skill; it does not apply to the field User Portal or ordinary Operations screens. The core skill does not define Map topology, B2 geometry, or simulation provenance.
