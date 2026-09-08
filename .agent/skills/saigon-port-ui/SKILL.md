# Saigon Port UI Skill

Use this skill whenever designing, reviewing, or implementing frontend/mobile UI for this repository.

## Mission

Create a **mobile-first Saigon Port operational tool** for field meter reading.

The product aesthetic is:

**Maritime Operational Minimalism**

The UI must feel trustworthy, operational, maritime, and human. AI is an invisible capability, not the visual theme.

## Authority

When this skill conflicts with generic frontend styles, this skill wins.

Priority:

1. Existing product/API behavior in the repository.
2. This skill.
3. `frontend/DESIGN_DNA.md`.
4. Accessibility/mobile usability.
5. Generic UI/frontend skills.
6. Framework defaults.

## Core task

V1 has one flow only:

```text
Capture -> Preview -> Processing -> Result
```

Do not add dashboard, login, history, analytics, map, account system, admin navigation, fleet modules or unrelated features unless explicitly requested.

## Visual direction

Use:

- light/off-white operational surfaces,
- restrained maritime blue,
- strong dark text,
- large clear numeric reading,
- concise Vietnamese copy,
- simple outlined icons,
- border-led hierarchy,
- high outdoor contrast,
- generous but practical spacing.

Do not use:

- cyberpunk HUD,
- neon/glow,
- purple gradients,
- glassmorphism-heavy layouts,
- decorative 3D containers/ships/shields,
- futuristic AI motifs,
- dark mode by default,
- world-map decoration,
- fake scanning beams,
- excessive dashboard cards,
- pill badges everywhere.

## Working color tokens

These are product working values, not claimed official Saigon Port corporate hex values.

```css
--sgp-brand-800: #073B5C;
--sgp-brand-700: #0B4F75;
--sgp-brand-600: #12658F;
--sgp-brand-100: #E8F1F5;
--sgp-brand-050: #F2F7F9;

--sgp-ink: #18242C;
--sgp-ink-secondary: #53636D;
--sgp-ink-muted: #74838C;
--sgp-surface: #FFFFFF;
--sgp-canvas: #F6F8F9;
--sgp-border: #D7E0E5;
--sgp-border-strong: #B8C6CE;

--sgp-success: #167A5A;
--sgp-success-bg: #EAF6F1;
--sgp-warning: #A86200;
--sgp-warning-bg: #FFF4DF;
--sgp-danger: #B43A3A;
--sgp-danger-bg: #FCECEC;
```

Use blue for brand/primary action, green for actual success, amber for review/caution, red for errors only.

## Typography

Preferred family:

```css
font-family: "Be Vietnam Pro", "Segoe UI", Arial, sans-serif;
```

Use tabular lining numbers for readings:

```css
font-variant-numeric: tabular-nums lining-nums;
font-feature-settings: "tnum" 1, "lnum" 1;
```

Do not use sci-fi monospace for meter values.

Recommended mobile sizes:

- title: 24–28 px / 700,
- body: 15–16 px,
- button: 16 px / 600,
- reading: 44–56 px / 700,
- metadata: 12–13 px.

## Spacing / shape

Use a 4 px rhythm:

`4, 8, 12, 16, 20, 24, 32, 40`

Mobile horizontal padding: 16–20 px normally.

Radii:

- controls: 8 px,
- standard surfaces: 12 px,
- media/result surfaces: 16 px,
- sheets: max 20 px.

Prefer subtle borders to heavy shadows.

## Field usability

- minimum touch target: 48 x 48 px,
- main action height: 54–58 px,
- one strong primary action per state,
- support one-handed mobile use,
- never communicate status with color alone,
- ensure high contrast in bright outdoor environments,
- do not require precise gestures.

## Screen behavior

### Capture

Must contain:

- compact Saigon Port identity area,
- title `Đọc chỉ số công tơ`,
- short instruction,
- dominant camera/capture area,
- primary `Chụp công tơ`,
- secondary `Chọn từ thư viện`.

Camera frame:

- simple rectangle,
- four restrained corner markers,
- no HUD grid/scanner effect,
- instruction: `Đặt dãy số công tơ rõ trong khung`.

### Preview

- image is dominant,
- primary `Đọc chỉ số`,
- secondary `Chụp lại`,
- no model details.

### Processing

Use real but non-quantified progress:

- `Đang đọc chỉ số...`
- optional `Giữ ứng dụng mở trong giây lát.`

No fake percentage.
No `AI is thinking` language.

### Success

Hierarchy:

```text
ĐÃ NHẬN DIỆN
0035785.4
kWh
[optional meter type]
Xác nhận
Đọc công tơ khác
```

The number is the hero.
Confidence/model metadata is secondary and should not compete visually.

### Review

Use:

**Không thể đọc chắc chắn chỉ số.**

`Vui lòng chụp lại, giữ dãy số rõ nét và hạn chế phản sáng.`

Primary action: **Chụp lại**.

REVIEW is a normal operational state, not a catastrophic error.

## Components

### Primary button

- full-width on narrow screens,
- brand blue,
- white text,
- 54–58 px height,
- 12 px radius,
- visible focus state.

### Secondary button

- same touch height,
- white/transparent surface,
- visible neutral border,
- dark/brand label.

### Reading display

- 44–56 px,
- strongest contrast,
- tabular numbers,
- unit clearly attached but secondary.

### Status notice

Use subtle semantic surface only when explanation is needed.
Do not create oversized decorative alert cards.

### Image preview

- radius 16 px,
- preserve relevant image detail,
- clear replace/retake action nearby.

## Iconography

Use one outline icon family with consistent 1.75–2 px stroke and rounded joins.

Prefer familiar camera, gallery, retry, check, warning icons.

Do not use ships, containers, cranes or shields as repeated decoration.

## Motion

Allowed:

- opacity,
- small 4–8 px translation,
- button press feedback,
- subtle result reveal.

Timing:

- interaction 120–180 ms,
- transition 180–240 ms,
- result reveal <= 280 ms.

Avoid continuous animation, parallax, scanning, 3D motion and ornamental choreography.

## Copy style

Vietnamese copy must be short, operational and non-technical.

Preferred:

- `Chụp công tơ`
- `Chọn từ thư viện`
- `Đọc chỉ số`
- `Chụp lại`
- `Xác nhận`
- `Đang đọc chỉ số...`

Avoid exposing YOLO, PaddleOCR, confidence thresholds, AI model names or inference terminology in the normal operator UI.

## Implementation instructions for agents

Before writing UI code:

1. Read `frontend/DESIGN_DNA.md`.
2. Inspect existing frontend files; preserve working product behavior.
3. State the visual direction as `Maritime Operational Minimalism` in the implementation plan.
4. Build the smallest flow that satisfies the current product requirement.
5. Use design tokens rather than scattered raw colors.
6. Reuse components only when it reduces inconsistency; do not build a giant design-system abstraction for V1.
7. Test narrow mobile viewport first, then tablet/desktop responsiveness.
8. Review every screen against the anti-style rules before completion.

## Review checklist

Reject a UI implementation if any of these are true:

- unclear primary action,
- touch targets < 48 px,
- meter image is visually secondary on capture/preview,
- result number is visually secondary on success,
- multiple competing primary buttons,
- fake AI progress,
- purple/cyber/neon visual language,
- generic template dashboard introduced,
- technical AI vocabulary shown to operators,
- excessive glass/gradient/3D decoration,
- REVIEW state lacks a direct retake action,
- text contrast is weak for outdoor use.

## Brand calibration rule

If approved internal Saigon Port brand guidance is later supplied, do not rebuild interaction patterns unnecessarily. Update exact brand tokens, logo rules and corporate typography while preserving field usability and workflow simplicity.
