# Map V2 Business & Information Density Audit — 12. Map ↔ Reports, Schedules & Staff Navigation

## 1. Current Cross-Screen Navigation

### Sidebar Tabs (AdminShell.tsx)
| Tab Key | Label | Component | Evidence |
| :--- | :--- | :--- | :--- |
| dashboard | Bản đồ | Map V1 (MapOperationsPage) | AdminShell.tsx#L64 |
| map_v2 | Bản đồ V2 | MapV2Workspace | AdminShell.tsx#L67 |
| schedules | Lịch ghi | Schedules component | AdminShell.tsx |
| staff_roster | Phân ca | Staff Roster component | AdminShell.tsx |
| reports | Báo cáo | Reports component | AdminShell.tsx |

### Tab Navigation Mechanism
- `handleSelectAdminTab` updates `activeTab` state
- URL parameter `?tab=` persists active tab
- sessionStorage used for state persistence
- Source: AdminShell.tsx#L178-198, App.tsx#L231-244

## 2. Navigation Flow Analysis

### A. Phân khu trên Map → Báo cáo khu vực
| Property | Current State |
| :--- | :--- |
| ENTRY_POINT | Click zone anchor on Map V2 |
| CURRENT_BEHAVIOR | Opens floating card with zone info |
| TARGET_BEHAVIOR | Card should have 'Xem Báo cáo khu vực' link |
| SHARED_IDENTIFIERS | Zone ID (ZONE_QUAY, etc.) but Map V2 IDs ≠ backend zone IDs |
| FILTERS_TO_PRESERVE | Date/round context |
| PERMISSION | None (view-only) |
| EMPTY_OR_ERROR_STATE | No reports module connected |
| BACK_NAVIGATION | Browser back or sidebar tab |
| DATA_GAPS | Map V2 zone IDs are presentation IDs, not DB zone IDs |
| EVIDENCE | MapV2Workspace.tsx — no report link exists |
| STATUS | **MISSING** |

### B. Công tơ trên Map → Lịch sử/Báo cáo công tơ
| Property | Current State |
| :--- | :--- |
| ENTRY_POINT | Hover utility node |
| CURRENT_BEHAVIOR | Shows SVG tooltip with simulated code |
| TARGET_BEHAVIOR | Click should navigate to meter history |
| SHARED_IDENTIFIERS | Meter code — but utility demo uses SIM-* codes |
| STATUS | **MISSING** — simulated meters have no DB records |

### C. Ngoại lệ trên Map → Bản ghi cần kiểm tra
| Property | Current State |
| :--- | :--- |
| CURRENT_BEHAVIOR | No exception indicators on Map V2 |
| STATUS | **MISSING** — no exception data source |

### D. Nhân viên trên Map → Phân ca/hồ sơ
| Property | Current State |
| :--- | :--- |
| ENTRY_POINT | Click employee marker |
| CURRENT_BEHAVIOR | Opens employee inspector with demo data |
| TARGET_BEHAVIOR | Inspector should have link to Phân ca tab |
| SHARED_IDENTIFIERS | Employee code (NV001, etc.) — demo codes, not DB user IDs |
| STATUS | **MISSING** |

### E. Báo cáo → Định vị khu/công tơ trên Map
| Property | Current State |
| :--- | :--- |
| STATUS | **MISSING** — Báo cáo has no deep link back to Map V2 |

### F. Lịch ghi → Map đúng ngày và lượt ghi
| Property | Current State |
| :--- | :--- |
| STATUS | **MISSING** — Map V2 does not consume date/round context from App.tsx |

## 3. Shared Context Analysis

| Context | Map V2 | Reports | Schedules | Staff Roster |
| :--- | :--- | :--- | :--- | :--- |
| Date/Period | NOT CONSUMED | Uses selectedBatch | Uses date filter | Uses date filter |
| Reading Round | NOT CONSUMED | Uses selectedRound | Uses round filter | N/A |
| Zone ID | Presentation IDs | Business zone IDs | N/A | N/A |
| Meter ID | Simulated SIM-* codes | Real meter codes | Real meter codes | N/A |
| User/Employee ID | Demo DEMO_NV* | Real user IDs | Real user IDs | Real user IDs |
| Utility type | Display filter | Filter parameter | N/A | N/A |
| Data origin | All DEMO/SIMULATED | REAL + SIMULATED | REAL | REAL |
| Last updated | No timestamp | Server timestamp | Server timestamp | Server timestamp |

### Key Gap
Map V2 operates in a completely isolated data world. It does not share any state with the other tabs.
The presentation zone IDs (ZONE_QUAY) have no guaranteed mapping to backend OperationalZone IDs.

## 4. Navigation Readiness

| Flow | Status | Readiness |
| :--- | :--- | :--- |
| Map → Zone Report | MISSING | NEEDS_FRONTEND_INTEGRATION + ID mapping |
| Map → Meter History | MISSING | NEEDS_BACKEND_DATA (real meters) |
| Map → Exception Detail | MISSING | NEEDS_BACKEND_DATA |
| Map → Staff Profile | MISSING | NEEDS_FRONTEND_INTEGRATION + ID mapping |
| Report → Map Location | MISSING | NEEDS_FRONTEND_INTEGRATION |
| Schedule → Map Date | MISSING | NEEDS_FRONTEND_INTEGRATION |

## 5. Cross-Screen KPI Consistency

When comparing KPIs between Map and Reports, the following must be verified:
- Same time period (date/batch)
- Same zone scope (identical zone ID mapping)
- Same denominator (total meters)
- Same data source (real vs demo)

Currently: Map V2 uses demo data, Reports use real data → KPIs CANNOT be compared.
