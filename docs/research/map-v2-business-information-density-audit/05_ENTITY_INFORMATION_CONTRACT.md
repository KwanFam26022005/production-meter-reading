# Map V2 Business & Information Density Audit — 05. Entity Information Contract

This document defines the four-level information disclosure hierarchy for each entity type on Map V2.

## Information Levels
- **LEVEL 0 — OVERVIEW**: Visible at all times without interaction
- **LEVEL 1 — MARKER / ZONE LABEL**: Minimal identification label
- **LEVEL 2 — HOVER / KEYBOARD FOCUS**: Quick preview tooltip
- **LEVEL 3 — CLICK / INSPECTOR**: Full details with actions

## Entity A — Nhân viên (Employee)

### LEVEL 0 — Overview
| FIELD | BUSINESS_MEANING | SOURCE_MODEL_OR_API | DATA_PROVENANCE | DISPLAY_LEVEL | DISPLAY_CONDITION | MISSING_DATA_BEHAVIOR | PERMISSION | ACTION | EVIDENCE |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| Avatar marker | Employee presence in zone | DEMO_MAP_V2_EMPLOYEES | DEMO_ONLY | L0 | Employee layer ON, Operational mode | Hide layer | None | — | employeeDataAdapter.ts#L36 |
| Motion animation | Illustrative zone coverage | employeeMovement.ts | DEMO_ONLY | L0 | Not paused, not reduced-motion | Stationary fallback | None | — | useEmployeeAnimation.ts |

### LEVEL 1 — Marker Label
Currently: Avatar initials only (HẢI, NAM, TUẤN, BẢO)
No persistent name or code label on marker.

### LEVEL 2 — Hover / Focus
| FIELD | BUSINESS_MEANING | SOURCE | PROVENANCE | CONDITION | MISSING | EVIDENCE |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| Employee code + name | Identity | DEMO data | DEMO_ONLY | Always on hover | N/A | MapV2EmployeeMarker.tsx |
| Zone label | Assignment | DEMO data | DEMO_ONLY | Always | N/A | formatEmployeeTooltip |
| Disclosure text | GPS disclaimer | Constant | VERIFIED | Always | N/A | MAP_V2_EMPLOYEE_DISCLOSURE_TEXT |
| Click guidance | Interaction hint | Static text | N/A | Always | N/A | MapV2EmployeeMarker.tsx |

### LEVEL 3 — Inspector
| FIELD | BUSINESS_MEANING | SOURCE | PROVENANCE | EVIDENCE |
| :--- | :--- | :--- | :--- | :--- |
| MÃ NHÂN VIÊN (code badge) | Identity | DEMO | DEMO_ONLY | MapV2InspectionPanel.tsx#L36 |
| HỌ VÀ TÊN | Full name | DEMO | DEMO_ONLY | MapV2InspectionPanel.tsx |
| PHÂN KHU PHỤ TRÁCH | Zone assignment | DEMO (zoneLabel + zoneId) | DEMO_ONLY | MapV2InspectionPanel.tsx |
| VAI TRÒ | Role title | DEMO ('Người phụ trách phân khu') | DEMO_ONLY | MapV2InspectionPanel.tsx |
| TRẠNG THÁI | Duty status | DEMO ('Phân công theo dõi khu vực (Minh họa)') | DEMO_ONLY | MapV2InspectionPanel.tsx |
| TIẾN ĐỘ KHU VỰC | Zone meter progress | DEMO hardcoded string | DEMO_ONLY | employeeDataAdapter.ts#L49 |
| Disclosure card | Animation disclaimer | Constant | VERIFIED | MapV2InspectionPanel.tsx |

### Missing Fields — Should be in Hover (L2)
- Verified shift status (NEEDS_BACKEND_DATA)
- Verified attendance check-in (NEEDS_BACKEND_DATA)

### Missing Fields — Should be in Inspector (L3)
- Verified schedule / shift code (NEEDS_BACKEND_DATA)
- Attendance timestamp (NEEDS_BACKEND_DATA)
- Link to Phân ca (MISSING — no deep link)
- Reading activity (NEEDS_BACKEND_DATA)

## Entity B — Phân khu / Kho / Bãi (Zone)

Currently the zone entity has TWO different display paths:
1. **Operational Mode**: Floating contextual card near anchor (max 340px)
2. **Technical Mode**: Full inspection panel with coordinates

### LEVEL 0 — Overview
| FIELD | MEANING | SOURCE | PROVENANCE | EVIDENCE |
| :--- | :--- | :--- | :--- | :--- |
| Zone icon + label | Zone identity | zoneAnchors.ts | Static JSON | zoneAnchors.ts#L8 |
| Polygon outline (dashed) | Zone boundary | tan_thuan_1_zones_edited.json | Static JSON | MapV2Canvas.tsx |

Currently MISSING at L0:
- Progress indicator (completion rate badge on zone)
- Exception flag (anomaly indicator)
- Employee count in zone

### LEVEL 1 — Zone Label
Zone name from anchor: 'Khu cảng sà lan', 'Bãi tổng hợp', etc.

### LEVEL 2 — Hover
Currently: Native SVG `<title>` tag only — browser default tooltip with zone label.
No custom hover tooltip for zones.

MISSING: Structured hover preview with:
- Zone name + code
- Meter count
- Readings due / completed
- Assigned personnel
- Exception count

### LEVEL 3 — Inspector (Operational Card)
| FIELD | MEANING | SOURCE | EVIDENCE |
| :--- | :--- | :--- | :--- |
| Zone Code/ID | Identity | Static JSON | MapV2Workspace.tsx#L600 |
| Label | Display name | Static JSON | MapV2Workspace.tsx |
| Description or Category + Vertices | Technical info | Static JSON | MapV2Workspace.tsx |
| 'Xem chi tiết kỹ thuật' button | Switch to technical mode | Action | MapV2Workspace.tsx |

MISSING from Inspector:
- Meter count and list
- Progress (completed/total readings)
- Assigned employees
- Exception summary
- Link to zone report
- Link to zone schedule

### LEVEL 3 — Inspector (Technical / Geometry)
| FIELD | MEANING | SOURCE | EVIDENCE |
| :--- | :--- | :--- | :--- |
| ID | Polygon identifier | Static JSON | MapV2InspectionPanel.tsx#L113 |
| Label | Display name | Static JSON | MapV2InspectionPanel.tsx |
| Category | Zone category | Static JSON | MapV2InspectionPanel.tsx |
| Parent ID | Parent zone reference | Static JSON | MapV2InspectionPanel.tsx |
| Closed flag | Polyline closure | Static JSON | MapV2InspectionPanel.tsx |
| Coordinate table | Pixel X/Y + Normalized | Static JSON | MapV2InspectionPanel.tsx |
| Copy button | Clipboard export | Action | MapV2InspectionPanel.tsx |
| Read-only invariant notice | Geometry freeze | Static text | MapV2InspectionPanel.tsx |

## Entity C — Công tơ Điện / Nước (Meter)

Currently on Map V2, meters are NOT individual markers on the operational map. They exist only as part of the utility network demo simulation.

### LEVEL 0 — Overview
| FIELD | MEANING | SOURCE | PROVENANCE | EVIDENCE |
| :--- | :--- | :--- | :--- | :--- |
| Utility node icon | Network topology point | utilityDemoLayout.ts | SIMULATED | MapV2UtilityLayer.tsx |
| Color coding | Electricity (amber) vs Water (blue) | Style constants | Static | MapV2UtilityLayer.tsx |

### LEVEL 2 — Hover (Utility Tooltip)
| FIELD | MEANING | SOURCE | EVIDENCE |
| :--- | :--- | :--- | :--- |
| Meter Code | Node identity | Demo layout | MapV2UtilityLayer.tsx#L743 |
| Label | Display name | Demo layout | MapV2UtilityLayer.tsx |
| Type | Source/Meter/Distribution | Demo layout | MapV2UtilityLayer.tsx |
| Simulation disclaimer | Data provenance | Static text | MapV2UtilityLayer.tsx |

### LEVEL 3 — Inspector
No dedicated meter inspector panel exists. Only the in-canvas SVG tooltip.

MISSING:
- Meter reading status (last read, confirmed, review)
- Reading value with unit (kWh for electric, m³ for water)
- Reader identity
- Confirmation source
- Photo evidence link
- Reading history
- Link to meter report
- Exception status

## Entity D — Tài sản & Mạng kỹ thuật (Technical Network)

Utility network is SIMULATED topology. Source nodes, feeders, and meters displayed are demo data.

### LEVEL 0
Network lines and nodes visible only when utility mode is not 'off'.
Electricity: Amber/orange lines. Water: Blue/cyan lines.

### LEVEL 2 — Hover
SVG tooltip with node code, label, type, and simulation disclaimer.

### LEVEL 3
No inspector. Click on network node in Technical mode may trigger geometry inspector.

All network data has provenance: SIMULATED.
Disclosure: 'Mạng mô phỏng (Nhấp nguồn để mở)' label visible on technical mode.
