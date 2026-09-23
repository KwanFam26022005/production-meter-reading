# Map V2 Business & Information Density Audit — 11. Inspector & Interaction Audit

## 1. Current Interaction Model

### Three Entity Types with Different Interaction Patterns

| Entity Type | Operational Mode Click | Technical Mode Click | Hover |
| :--- | :--- | :--- | :--- |
| Zone anchor | Floating contextual card | Geometry inspector panel | Native SVG title |
| Employee marker | Employee inspector panel | HIDDEN (no interaction) | Custom SVG preview |
| Utility node | N/A (utility must be active) | Geometry inspector | SVG tooltip |

### Selection States
1. **Nothing selected**: Default state, all markers animate
2. **Zone selected (Operational)**: Floating card near anchor, polygon highlighted
3. **Zone selected (Technical)**: Side panel with coordinates, polygon highlighted
4. **Employee selected**: Side panel with employee data, zone polygon highlighted, marker frozen
5. **Utility node selected (Technical)**: Side panel with node coordinates

### Deselection Methods
- Click inspector close button (×)
- Click toolbar 'Bỏ chọn' button
- Click empty canvas area
- Press Escape key
- Click backdrop (compact/drawer mode)

## 2. Inspector Panel Behavior

### Responsive Layout
- **Wide screens (≥1380px)**: Panel docks on right side, map adjusts
- **Compact screens (<1380px)**: Panel overlays as bottom drawer with backdrop

### Panel Content by Entity Type

#### Employee Inspector
Fields: Code, Name, Zone, Role, Status, Zone Progress, Disclosure
Actions: Close
Missing: Links to Phân ca, verified shift data, reading activity

#### Zone Operational Card
Fields: Code/ID, Label, Description/Category
Actions: Close, 'Xem chi tiết kỹ thuật'
Missing: Meter count, progress, employees, exceptions, report link

#### Geometry Inspector (Technical)
Fields: ID, Label, Category, Parent ID, Closed, Coordinate table
Actions: Close, Copy coordinates
Appropriate: This is a technical tool, content is correct for the purpose

## 3. Hover/Tooltip Assessment

### Zones
**Current**: Browser-native SVG `<title>` tooltip only.
**Problem**: No structured preview. User sees plain text zone name.
**Recommendation**: Custom tooltip with zone name, meter count, progress (when available).

### Employees
**Current**: Custom SVG ForeignObject preview card.
**Content**: Code + name, zone, disclosure, click hint.
**Assessment**: Good structure, appropriate content for L2.
**Missing**: Shift/attendance status (when available).

### Utility Nodes
**Current**: SVG tooltip group.
**Content**: Code, label, type, simulation disclaimer.
**Assessment**: Appropriate for demo data.

## 4. Keyboard Accessibility

| Feature | Status | Evidence |
| :--- | :--- | :--- |
| Employee markers focusable | Yes (tabIndex={0}) | MapV2EmployeeMarker.tsx |
| Employee markers activatable | Yes (Enter/Space) | MapV2EmployeeMarker.tsx |
| Utility nodes focusable | Yes (tabIndex={0}) | MapV2UtilityLayer.tsx |
| Utility nodes activatable | Yes (Enter/Space) | MapV2UtilityLayer.tsx |
| Inspector close via Escape | Yes | MapV2Workspace.tsx |
| Focus pause on markers | Yes | useEmployeeAnimation.ts |
| Zone anchors focusable | UNVERIFIED | Need to check MapV2Canvas.tsx |
| Tab order logical | UNVERIFIED | Need interactive testing |
| ARIA labels present | Yes on markers | role='button', aria-label |
| Screen reader announcements | UNVERIFIED | — |

## 5. Panel Occlusion Analysis

### At 1920×1080
- Employee inspector (~280px) occludes ~15% of map width
- No blur/dim behind docked panel
- Selected marker may be near right edge — still visible
- Zone labels behind panel are hidden

### At 1280×800
- Panel becomes drawer (overlays from bottom or side)
- Backdrop may dim map — UNVERIFIED exact behavior
- Map zoom may auto-adjust — UNVERIFIED

### Recommendations
- Operational inspector: Keep current compact layout. No blur needed.
- Geometry inspector: Consider allowing resize for coordinate tables.
- Add 'scroll-to-selected' behavior when inspector opens to ensure selected entity is visible.
