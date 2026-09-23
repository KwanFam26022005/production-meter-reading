# Map V2 Business & Information Density Audit — 03. Current Toolbar Inventory

## Toolbar Inventory

| CONTROL_ID | CURRENT_LABEL | COMPONENT_FILE | HANDLER_OR_STATE | ACTUAL_BEHAVIOR | BUSINESS_PURPOSE | PRIMARY_ROLE | VISIBLE_IN_MODES | READ_ONLY_OR_MUTATING | DUPLICATED_WITH | DISCOVERABILITY | ACCESSIBILITY | PERMISSION | RISK_IF_HIDDEN | EVIDENCE |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| 1 | Bản đồ V2 Title + CANONICAL badge | MapV2Workspace.tsx | N/A | Displays static metadata | Context setting | All | All | READ_ONLY | None | High | High | NONE | Low | Source |
| 2 | VIEW_FIT_ALL | MapV2Workspace.tsx | setViewMode('contain') | Scales to fit container | View optimization | All | Wide screens | READ_ONLY | COMPACT_OPTIONS | High | High | NONE | Low | Source |
| 3 | VIEW_FIT_WIDTH | MapV2Workspace.tsx | setViewMode('width') | Stretches to width | View optimization | All | Wide screens | READ_ONLY | COMPACT_OPTIONS | High | High | NONE | Low | Source |
| 4 | MODE_OPERATIONAL | MapV2Workspace.tsx | setInteractionMode('operational') | Switches to operational context | Focus on operations | Ops Admin | All | READ_ONLY | None | High | High | NONE | High | Source |
| 5 | MODE_TECHNICAL | MapV2Workspace.tsx | setInteractionMode('technical') | Switches to tech context | Focus on tech inspection | Map Admin | All | READ_ONLY | None | High | High | NONE | High | Source |
| 6 | TONE_STANDARD | MapV2Workspace.tsx | setToneMode('technical') | Standard visual theme | Accessibility | All | All | READ_ONLY | None | High | High | NONE | Low | Source |
| 7 | TONE_NEON | MapV2Workspace.tsx | setToneMode('neon') | Neon visual theme | High contrast view | All | All | READ_ONLY | None | High | High | NONE | Low | Source |
| 8 | UTILITY_OFF | MapV2Workspace.tsx | setUtilityMode('off') | Hides utility network | De-clutter | All | All | READ_ONLY | None | High | High | NONE | Low | Source |
| 9 | UTILITY_ELEC | MapV2Workspace.tsx | setUtilityMode('electricity') | Shows electricity network | Inspect utility | Map Admin | All | READ_ONLY | None | High | High | NONE | Medium | Source |
| 10 | UTILITY_WATER | MapV2Workspace.tsx | setUtilityMode('water') | Shows water network | Inspect utility | Map Admin | All | READ_ONLY | None | High | High | NONE | Medium | Source |
| 11 | UTILITY_BOTH | MapV2Workspace.tsx | setUtilityMode('both') | Shows both utility networks | Inspect utility | Map Admin | All | READ_ONLY | None | High | High | NONE | Medium | Source |
| 12 | DEMO_BADGE | MapV2Workspace.tsx | N/A | Shows demo warning | Transparency | All | Employee Layer On | READ_ONLY | None | Medium | Medium | NONE | High | Source |
| 13 | LAYERS_TOGGLE | MapV2Workspace.tsx | toggles layer popover | Opens layer panel | Layer management | All | Wide screens | READ_ONLY | COMPACT_OPTIONS | High | High | NONE | High | Source |
| 14 | COMPACT_OPTIONS | MapV2Workspace.tsx | combined options popover | Opens unified menu | Responsive UI | All | Compact screens | READ_ONLY | Various | Medium | High | NONE | High | Source |
| 15 | DESELECT_ENTITY | MapV2Workspace.tsx | clears selection | Closes inspector/selection | Navigation | All | Entity Selected | READ_ONLY | INSPECTOR_CLOSE | High | High | NONE | High | Source |
| 16-22 | Layer toggles (1-7) | MapV2Layers.tsx | toggles layer visibility | Show/hide specific layers | Customization | All | Layer Popover | READ_ONLY | None | Medium | Medium | NONE | High | Source |
| 23 | HUD_ZOOM_IN | MapV2Canvas.tsx | zoom × 1.25 | Zooms map in | View control | All | All | READ_ONLY | Scroll/Pinch | High | High | NONE | Low | Source |
| 24 | HUD_ZOOM_OUT | MapV2Canvas.tsx | zoom ÷ 1.25 | Zooms map out | View control | All | All | READ_ONLY | Scroll/Pinch | High | High | NONE | Low | Source |
| 25 | HUD_RESET_VIEW | MapV2Canvas.tsx | resets view | Resets map zoom/pan | View control | All | All | READ_ONLY | None | High | High | NONE | Medium | Source |
| 26 | HUD_MOTION_TOGGLE | MapV2Canvas.tsx | toggle animation | Pauses/resumes demo motion | Accessibility/Inspect | All | Employee + No Utility | READ_ONLY | None | Medium | Medium | NONE | Medium | Source |
| 27 | ZOOM_PERCENTAGE | MapV2Canvas.tsx | N/A | Displays current zoom level | Information | All | All | READ_ONLY | None | High | High | NONE | Low | Source |
| 28 | Bản đồ (Map V1) | AdminShell.tsx | navigation | Routes to Map V1 | Navigation | All | Sidebar | READ_ONLY | None | High | High | NONE | High | Source |
| 29 | Bản đồ V2 | AdminShell.tsx | navigation | Routes to Map V2 | Navigation | All | Sidebar | READ_ONLY | None | High | High | NONE | High | Source |
| 30 | Lịch ghi | AdminShell.tsx | navigation | Routes to Schedules | Navigation | Ops Admin | Sidebar | READ_ONLY | None | High | High | NONE | High | Source |
| 31 | Phân ca | AdminShell.tsx | navigation | Routes to Roster | Navigation | Ops Admin | Sidebar | READ_ONLY | None | High | High | NONE | High | Source |
| 32 | Báo cáo | AdminShell.tsx | navigation | Routes to Reports | Navigation | All | Sidebar | READ_ONLY | None | High | High | NONE | High | Source |
| 33 | OP_CARD_CLOSE | MapV2Canvas.tsx | clears selection | Closes zone card | Navigation | All | Zone Selected | READ_ONLY | DESELECT_ENTITY | High | High | NONE | High | Source |
| 34 | OP_CARD_INSPECT | MapV2Canvas.tsx | switches to tech mode | Enters technical view | Inspection | Map Admin | Zone Selected | READ_ONLY | MODE_TECHNICAL | Medium | Medium | NONE | Medium | Source |
| 35 | INSPECTOR_CLOSE | MapV2InspectionPanel.tsx| clears selection | Closes side panel | Navigation | All | Entity Selected | READ_ONLY | DESELECT_ENTITY | High | High | NONE | High | Source |
| 36 | INSPECTOR_COPY | MapV2InspectionPanel.tsx| copy to clipboard | Copies coordinates | Technical operation | Map Admin | Tech Mode + Selection | READ_ONLY | None | Medium | High | NONE | Low | Source |
