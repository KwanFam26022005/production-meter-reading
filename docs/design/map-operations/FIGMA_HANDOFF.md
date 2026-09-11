# Tan Thuan Port — Operational Meter Map: Figma Handoff

## Source of truth

Figma file:
https://www.figma.com/design/FP9oAWFaTuj6gf8HHhdzRb

File key:
`FP9oAWFaTuj6gf8HHhdzRb`

Primary frames:

- `2:2` — Tan Thuan Port — Map First / Default
- `2:104` — Tan Thuan Port — Map First / Critical Exceptions
- `2:363` — Tan Thuan Port — Zone Selected / Bãi Container
- `2:514` — Tan Thuan Port — Meter Selected / CT-007
- `9:8` — Tan Thuan Port — Zone Selected / Operator Popover

## Product direction

The Admin Meter Map is map-first and interaction-first.

Default state:
- full operational map
- no persistent sidebar
- no large KPI dashboard
- no permanent zone cards
- no permanent meter labels
- no 3D

Progressive disclosure:
1. Default map: physical context + zone name + meter status dots
2. Hover: identify zone/meter with minimal tooltip
3. Click zone: contextual zone drawer
4. Click meter: compact anchored popup
5. Explicit “Xem chi tiết”: full meter detail drawer
6. Click operator icon: operator information + personal progress popover

## Operator interaction

Do not show operator name permanently inside zone UI.

Represent the responsible operator as a small circular user/avatar icon.

Clicking the user icon opens a compact popover with:
- full name
- employee/role context
- zone name
- progress percentage
- completed meters / total assigned meters
- overdue count
- review count
- current reading round/time

Example:

Nguyễn Văn A
Nhân viên phụ trách · Bãi Container

TIẾN ĐỘ PHỤ TRÁCH
0% · 0/2 công tơ hoàn tất

2 Quá hạn
0 Cần kiểm tra

Lượt hiện tại · 11:00

The operator popover is contextual only and must not compete with zone or meter information.

## Visual hierarchy

Priority:
1. Exception status
2. Selected zone/meter
3. Zone identity
4. Normal meter marker
5. Physical context

Healthy state should be calm.
Strong red/amber visual emphasis is reserved for exception states.

## Spatial structure

Approximate Tan Thuan port schematic:
- Saigon River along the north edge
- long quay / berth line along the river
- cargo/warehouse areas inland
- container yard to the east / operational side
- technical/utilities near the lower/central area
- main access / Luu Trong Lu axis toward the south

This is an operational schematic, not survey/GIS-accurate geometry.

## Important implementation constraint

Do not export Figma as a bitmap and use it as the application UI.
Rebuild with the existing React/TypeScript/SVG/CSS architecture.

Use Figma only as the visual and interaction source of truth.

## Suggested project destination

Copy this file to:

`docs/design/map-operations/FIGMA_HANDOFF.md`

Optionally export the 5 Figma frames as PNG and place them under:

`docs/design/map-operations/reference/`

Recommended names:
- `01-map-default.png`
- `02-map-critical.png`
- `03-zone-selected.png`
- `04-meter-selected.png`
- `05-operator-popover.png`
