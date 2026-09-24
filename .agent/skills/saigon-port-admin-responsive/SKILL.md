---
name: saigon-port-admin-responsive
description: >-
  Adaptive layout and responsive ergonomics for the Saigon Port Operations/Admin
  portal. Use for Admin pages, schedules, dialogs, tables, sidebars, drawers,
  or zoom/reflow work; not for backend, User Portal mobile, or Map topology.
---

# Operations/Admin responsive UI

Use with [`saigon-port-ui`](../saigon-port-ui/SKILL.md) for shared product identity. This skill owns how dense Admin work remains usable as available width and height change. [`frontend/DESIGN_DNA.md`](../../../frontend/DESIGN_DNA.md) owns measurable design values; do not define a second brand palette or type scale here. Domain semantics and Map topology are outside this skill.

## Read the available space in two dimensions

Use these width classes to reason about composition, not as rigid device-specific CSS breakpoints:

| Width class | Viewport width | Typical adaptation |
| --- | --- | --- |
| TABLET | 768–1023 px | Simplify navigation; prefer stacked or drawer-based detail. |
| COMPACT | 1024–1279 px | Reduce simultaneous panels; keep actions visible. |
| LAPTOP | 1280–1599 px | Dense workspace with bounded dialogs and responsive tables. |
| WIDE | 1600–1919 px | Additional columns only when the content area supports them. |
| LARGE | ≥1920 px | Use available space without excessive line length or detached controls. |

Height density is independent:

| Height class | Viewport height | Implication |
| --- | --- | --- |
| CONSTRAINED | <720 px | Prioritize reachable actions and internal scrolling. |
| COMPACT | 720–899 px | Limit tall dialogs and stacked chrome. |
| COMFORTABLE | ≥900 px | More simultaneous detail is possible. |

A 1918×867 window is **WIDE + COMPACT**. A wide external monitor or browser window does not guarantee vertical room. Prefer container-aware decisions when a sidebar or inspector changes the actual component width. Browser zoom can turn a nominal desktop viewport into a compact workspace.

## Layout invariants

- Prevent page-level horizontal overflow. Let flex/grid content children shrink with `min-width: 0` where needed; contain wide tables and long labels deliberately.
- Keep required controls and the primary action reachable without shrinking text to an unreadable size or using `transform: scale()` to force fit.
- Adapt sidebars before they consume the content width needed by the task. At tablet sizes, a drawer or near-fullscreen detail view can be clearer than a squeezed multi-panel desktop layout.
- Use progressive disclosure in tables: prioritize identifiers, status, and actions; reveal secondary fields in expandable rows, detail panels, or controlled horizontal table regions. Do not crush every column into the viewport.
- Preserve keyboard order, visible focus, labels, and escape/close behavior as panels move or collapse. Reflow must remain usable at browser zoom.

## Dialogs and dense forms

- Constrain a dialog to the usable viewport height as well as width. It must not render required controls or actions beyond the reachable window.
- Use a header, a scrollable body, and persistent actions/footer. The body, not the whole dialog or document, absorbs long form content; bound long lists inside it when appropriate.
- Keep focus in the active dialog and restore it on close. Ensure keyboard users can reach every field and action after reflow.
- Avoid document scroll created solely by an open modal. Account for short laptop windows, browser chrome, zoom, and on-screen keyboards where applicable.
- Check validation messages, expanded options, and long Vietnamese labels; these can increase height after the dialog first opens.

## Acceptance boundary

[`harness/gates.yml`](../../../harness/gates.yml) owns the exact `admin-responsive-small` and `admin-responsive-full` viewport/zoom matrices and assertions. This skill supplies the layout judgment behind them. H4 will automate the gates; use the selected gate as a review checklist until then. Do not embed another test matrix here.
