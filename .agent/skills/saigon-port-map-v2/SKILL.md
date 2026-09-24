---
name: saigon-port-map-v2
description: >-
  Map V2 GIS and digital-twin UI guidance for the Saigon Port Operations portal.
  Use for map canvas, utility network presentation, layers, selection, and
  simulation disclosure; not for generic Admin layouts or backend domain logic.
---

# Saigon Port Map V2 UI

Use with [`saigon-port-ui`](../saigon-port-ui/SKILL.md) for shared identity. This skill owns Map visual and interaction judgment, not topology or operational assignment truth. [`frontend/DESIGN_DNA.md`](../../../frontend/DESIGN_DNA.md) owns approved colors, contrast, typography, and measurable tokens.

## Modes and visual hierarchy

- **Technical Light** is the default operational presentation: a legible daytime GIS workspace where infrastructure, labels, and controls remain readable at working zoom levels.
- **Neon Digital Twin** is a restrained presentation mode only where the product explicitly supports it. Use controlled emphasis to distinguish active utility traces; do not carry glow, dark treatment, or spectacle into ordinary Operations or User screens.
- Show the utility network as an engineering hierarchy from source/substation through feeders or trunks to meter points. Distinguish electricity and water consistently using the approved design system and existing Map conventions; do not redefine their token values here.
- Preserve linework, labels, and topology comprehension at different map zooms and panel widths. Avoid ornamental particles, continuous decorative animation, gaming HUDs, and visual effects that hide network relationships.

## Map interaction

- Make layers and their visibility explicit. Selected, hovered, focused, and disabled states should be distinguishable without relying on color alone.
- Keep the selected network element and its inspector connected visually and semantically. Show where a meter or connection belongs in the displayed hierarchy without implying unverified physical provenance.
- Provide readable selection/focus cues and keyboard-reachable controls. Keep Map labels and overlays legible over both presentation modes.
- Mark simulated topology clearly in the UI. A badge or watermark must keep the simulated nature of a view visible while a user inspects or shares it; visual disclosure does not establish data provenance.

## Product truth boundary

Frozen B2 geometry, its SHA-256, simulation provenance, and legacy-versus-operational assignment meaning are not defined here. Resolve them through [`harness/context-index.yml`](../../../harness/context-index.yml) and current source/tests and Map handoffs. H3 will provide `docs/contracts/map-v2.md`; use it when it exists. Do not reinterpret `ReadingRound`, `OperationalAssignment`, `UserTaskProjection`, or `MeterReading.user_id` in Map styling guidance.

[`harness/gates.yml`](../../../harness/gates.yml) owns the B2 freeze and applicable Map verification gates. This skill does not duplicate their hash or command matrix.
