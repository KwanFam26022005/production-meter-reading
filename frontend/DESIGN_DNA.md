# SAIGON PORT MOBILE UI DESIGN DNA v1

Status: **working digital design system for the meter-reading mobile web baseline**.

This document is not an official Saigon Port corporate brand manual. Public Saigon Port sources communicate the company mission, maritime/logistics scope, customer-service direction, and smart/green-port ambition, but do not publish a complete UI token specification with official hex values, typography, spacing, or component rules. The tokens below are therefore a controlled digital working palette for this product and must be replaced if an approved internal brand guideline is provided later.

## 1. Brand context used for this design

Current official Saigon Port messaging emphasizes:

- "Kết nối con người, kết nối thế giới, đưa Việt Nam thịnh vượng từ biển."
- "Dẫn đầu Việt Nam — Vươn tầm châu lục."
- Port operation and logistics as the core business direction.
- Safety, speed, operational efficiency and end-to-end logistics.
- Improving customer experience.
- Development toward green ports and smart ports.

For this product, those ideas translate into four product qualities:

1. **Trustworthy** — the reading is clear, calm and verifiable.
2. **Operational** — the UI helps a field task complete quickly.
3. **Maritime** — visual identity feels connected to Saigon Port without becoming decorative nautical imagery.
4. **Human** — the interface serves an operator first; AI stays in the background.

## 2. Named aesthetic direction

### Maritime Operational Minimalism

A light, practical, high-contrast interface with restrained maritime-blue identity, large functional controls, strong numeric typography and minimal decoration.

The interface should feel like a modern Saigon Port operational tool, **not** a generic SaaS dashboard and **not** a futuristic command center.

### Visual thesis

If the logo were removed, the UI should still be recognizable by:

- a calm maritime-blue hierarchy,
- strong white/off-white operational surfaces,
- a precise camera framing motif,
- large, highly legible meter readings,
- compact status language,
- very limited use of accent colors.

## 3. Non-goals / anti-style

Do not use:

- cyberpunk / HUD visual language,
- neon cyan glow,
- purple SaaS gradients,
- glassmorphism-heavy cards,
- 3D containers, ships, shields or decorative industrial renders,
- dark navy on every screen,
- world maps as decorative backgrounds,
- fake AI scanning beams,
- animated circuit patterns,
- excessive dashboard cards,
- unnecessary KPI widgets,
- pill badges everywhere,
- decorative micro-animation spam,
- stock "AI logistics" illustrations.

The product has one main field task: **capture -> read -> confirm**.

## 4. Color system

These are **working product colors, not claimed official corporate hex values**.

```css
:root {
  /* Saigon Port-inspired working digital brand */
  --sgp-brand-800: #073B5C;
  --sgp-brand-700: #0B4F75;
  --sgp-brand-600: #12658F;
  --sgp-brand-100: #E8F1F5;
  --sgp-brand-050: #F2F7F9;

  /* Neutral operational surfaces */
  --sgp-ink: #18242C;
  --sgp-ink-secondary: #53636D;
  --sgp-ink-muted: #74838C;
  --sgp-surface: #FFFFFF;
  --sgp-canvas: #F6F8F9;
  --sgp-border: #D7E0E5;
  --sgp-border-strong: #B8C6CE;

  /* Semantic states */
  --sgp-success: #167A5A;
  --sgp-success-bg: #EAF6F1;
  --sgp-warning: #A86200;
  --sgp-warning-bg: #FFF4DF;
  --sgp-danger: #B43A3A;
  --sgp-danger-bg: #FCECEC;

  /* Camera / media */
  --sgp-camera-mask: rgba(10, 24, 34, 0.54);
}
```

### Color rules

- Primary blue is for app identity, main actions, focus and selected state.
- White/off-white carries most of the UI.
- Success green appears only for successful task completion.
- Amber is for caution/review guidance, not branding.
- Red is reserved for actual error/destructive state.
- Never use semantic colors as decoration.
- Never place large areas of high-saturation blue behind dense text.

If an approved Saigon Port logo/brand manual becomes available, update the `--sgp-brand-*` ramp while keeping the semantic and neutral structure stable.

## 5. Typography

### Primary UI family

Preferred: **Be Vietnam Pro**.

Why:

- native-feeling Vietnamese diacritics,
- modern corporate character,
- clear on mobile,
- less generic than default system UI fonts,
- works well for both labels and large numeric values.

Fallback:

```css
font-family: "Be Vietnam Pro", "Segoe UI", Arial, sans-serif;
```

### Numeric reading

The detected reading is the most important content on the result screen.

Use:

```css
font-variant-numeric: tabular-nums lining-nums;
font-feature-settings: "tnum" 1, "lnum" 1;
```

Do not use a sci-fi monospace font. The reading should look authoritative, not machine-themed.

### Mobile type scale

- Screen title: 24–28 px / 700
- Section title: 18–20 px / 650–700
- Body: 15–16 px / 400–500
- Supporting label: 13–14 px / 500
- Button: 16 px / 600
- Meter reading: 44–56 px / 700
- Compact metadata: 12–13 px / 500

Avoid all-caps body copy. Uppercase is acceptable only for short operational eyebrow labels.

## 6. Spacing and density

Use a 4 px base rhythm.

Preferred spacing values:

```text
4  / 8  / 12  / 16  / 20  / 24  / 32  / 40
```

Mobile page horizontal padding:

- 16 px minimum,
- 20 px preferred on standard phones,
- 24 px on wider devices.

The interface should be **airy but not luxury-minimal**. Field users should immediately understand what is actionable.

## 7. Shape language

Use restrained radii:

- small controls: 8 px,
- standard card/input: 12 px,
- large media/result container: 16 px,
- bottom sheet/modal: 20 px max.

Avoid fully rounded pill buttons for primary actions unless the native control requires it.

Borders should usually be more important than shadows.

Preferred shadow:

```css
box-shadow: 0 6px 20px rgba(24, 36, 44, 0.07);
```

Use it sparingly.

## 8. Touch and field-operation rules

The product is mobile-first and may be used during field work.

- Minimum touch target: **48 x 48 px**.
- Preferred main action height: **54–58 px**.
- Keep important controls within comfortable thumb reach.
- Do not put the primary action in a tiny top-right icon.
- Do not require precision drag gestures.
- Never communicate state using color alone.
- Critical copy must remain readable in bright outdoor conditions.
- Maintain WCAG-oriented contrast for text and controls.

## 9. Core information architecture

V1 should remain extremely small.

```text
Capture
  -> Preview
  -> Processing
  -> Result
       -> success: Confirm / Read another
       -> review: Retake
```

No dashboard is required for the meter-reading baseline.

Do not add navigation drawers, tab bars, history, charts, notifications, account settings or fleet modules unless a later product requirement explicitly needs them.

## 10. Screen rules

### A. Capture screen

Purpose: get one usable meter photo quickly.

Structure:

```text
[Saigon Port identity]

Đọc chỉ số công tơ
Short instruction

[ camera / capture area ]

Primary: Chụp công tơ
Secondary: Chọn từ thư viện
```

Camera treatment:

- use a clean rectangular viewfinder,
- use four restrained corner markers rather than a full HUD grid,
- no scanning laser animation,
- darken outside the recommended capture frame only when helpful,
- instruction copy should be short: "Đặt dãy số công tơ rõ trong khung".

### B. Preview screen

Purpose: allow a fast visual check before inference.

- image dominates the screen,
- primary action: **Đọc chỉ số**,
- secondary action: **Chụp lại**,
- no technical model metadata.

### C. Processing state

Purpose: signal real work without pretending precision.

Use:

- subtle progress indicator or spinner,
- copy such as `Đang đọc chỉ số...`,
- optional secondary copy `Giữ ứng dụng mở trong giây lát.`

Do not show fake percentages.
Do not show "AI is thinking" or model names.

### D. Success result

The visual hierarchy must be:

```text
ĐÃ NHẬN DIỆN

0035785.4
kWh

[optional compact meter type]

Primary: Xác nhận
Secondary: Đọc công tơ khác
```

The number is the hero. Avoid placing it inside a cluttered dashboard card.

Technical confidence values may exist in a collapsible developer/inspection area, but should not compete with the reading in the normal operator UI.

### E. Review result

Copy:

**Không thể đọc chắc chắn chỉ số.**

Secondary:

`Vui lòng chụp lại, giữ dãy số rõ nét và hạn chế phản sáng.`

Primary action:

**Chụp lại**

Do not frame REVIEW as a catastrophic system error.

## 11. Components

### PrimaryButton

- brand blue background,
- white label,
- 54–58 px high,
- 12 px radius,
- full width on narrow phones,
- strong focus state.

### SecondaryButton

- white or transparent,
- 1 px `--sgp-border-strong`,
- brand/ink label,
- equal touch height to primary.

### StatusNotice

Use only when a state needs explanation.

- success: subtle green surface,
- review: subtle amber surface,
- error: subtle red surface.

No giant icon + giant colored card unless needed for accessibility.

### ImagePreview

- neutral border,
- radius 16 px,
- preserve aspect ratio,
- avoid clipping important meter details,
- provide replace/retake action nearby.

### ReadingDisplay

- reading centered or left-aligned depending on surrounding layout,
- 44–56 px,
- tabular numbers,
- maximum contrast,
- unit secondary but visually attached.

## 12. Iconography

Preferred characteristics:

- simple outlined icons,
- consistent 1.75–2 px stroke,
- rounded line joins,
- familiar camera / image / retry / check semantics.

Do not use:

- container/ship icons as decoration on every card,
- shield icons unless the function is actually security,
- 3D icons,
- mixed filled/outline icon families.

## 13. Photography and imagery

Real Saigon Port / meter photography should be preferred over generated logistics imagery when visual context is needed.

For this meter-reading application:

- operational photographs are secondary,
- the user's meter image is the primary visual content,
- do not place a hero photo behind the camera task,
- avoid decorative cranes/ships competing with the capture flow.

## 14. Motion

Motion should support state change only.

Timing guideline:

- interaction: 120–180 ms,
- panel/state transition: 180–240 ms,
- result reveal: <= 280 ms.

Preferred effects:

- opacity,
- small translate (`4–8 px`),
- button press feedback,
- restrained result reveal.

Avoid:

- parallax,
- continuous floating animation,
- 3D transforms,
- decorative scanning animation,
- long page entrance choreography.

## 15. Copy style

Vietnamese should be:

- short,
- operational,
- respectful,
- non-technical,
- action-oriented.

Preferred:

- `Chụp công tơ`
- `Đọc chỉ số`
- `Chụp lại`
- `Xác nhận`
- `Đang đọc chỉ số...`
- `Không thể đọc chắc chắn chỉ số.`

Avoid:

- `Khởi chạy AI`
- `AI detection complete`
- `Model confidence threshold exceeded`
- verbose technical explanations.

## 16. Reference patterns studied

These references are for **interaction and information-architecture lessons only**, not for visual copying.

### Saigon Port official sources

- https://saigonport.vn/
- https://saigonport.vn/dich-vu/dich-vu-khac/
- https://saigonport.vn/quan-he-co-dong/bao-cao-thuong-nien-vi/

Relevant official themes: connection, port/logistics operations, safety/efficiency, customer experience, smart/green port direction.

### Logistics / maritime repositories

- `jwald3/react-logistics` — useful for logistics entity hierarchy, tables, map/detail relationships.
- `colbychapman3/maritime-dashboard` — useful for maritime operational status and detail-page hierarchy.
- `Anuj-er/cargo-tracker-webapp` — useful for responsive shipment status and mobile/desktop adaptation.

Do **not** import their dashboard density into this one-task meter-reading V1.

### UI skills / design references

- `bergside/typeui` / `typeui-fundamentals` — spacing, typography, contrast and hierarchy discipline.
- `S3ctr4l/antigravity` / `frontend-design` — avoids generic AI-generated UI and requires a coherent aesthetic direction.
- `ui-ux-pro-max` — useful as a pattern/search reference for mobile UX and accessibility; it must not override this project-specific design DNA.

## 17. Priority order for Antigravity

When guidance conflicts, apply this order:

1. Product behavior/API contract already defined by this repository.
2. `.agent/skills/saigon-port-ui/SKILL.md`.
3. This `frontend/DESIGN_DNA.md`.
4. Accessibility and mobile usability fundamentals.
5. Generic frontend-design / UI skills.
6. Framework defaults and component-library aesthetics.

Project identity must never be replaced by a generic template style.

## 18. Acceptance checklist before implementation is approved

- [ ] User can understand the primary action within 3 seconds.
- [ ] One clear primary action per state.
- [ ] Main touch targets >= 48 px.
- [ ] Camera/preview is visually dominant before inference.
- [ ] Reading is visually dominant after inference.
- [ ] REVIEW has a clear retake action.
- [ ] No fake AI progress.
- [ ] No decorative 3D/logistics imagery.
- [ ] No purple SaaS gradient.
- [ ] No excessive glass cards.
- [ ] No unnecessary dashboard or navigation.
- [ ] Vietnamese copy is concise.
- [ ] Technical confidence metadata is secondary.
- [ ] Brand blue is restrained rather than flooding the screen.
- [ ] Contrast remains usable outdoors.
- [ ] The experience still feels coherent with the logo hidden.

## 19. Future brand calibration

When an approved internal Saigon Port brand asset/manual is available:

1. confirm the exact primary/secondary corporate colors,
2. confirm logo clear-space/minimum-size requirements,
3. confirm approved corporate fonts,
4. replace only identity tokens and logo rules,
5. keep the interaction, accessibility and field-operation system stable unless the official guideline requires otherwise.
