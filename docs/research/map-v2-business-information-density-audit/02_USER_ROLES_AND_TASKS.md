# Map V2 Business & Information Density Audit — 02. User Roles & Tasks

## 1. Role Definitions

### A. Người quản lý Cảng (Port Manager)
- Wants port-wide situational awareness
- Needs to identify problem areas at a glance
- Wants period/zone-based reporting access

### B. Điều phối viên / Operations Admin
- Tracks reading rounds and progress
- Monitors per-zone completion
- Identifies unread or problematic meters
- Views employee assignments (from verified data)
- Navigates to Lịch ghi (Schedules) or Phân ca (Staff Roster)

### C. Quản trị bản đồ / Kỹ thuật (Map Admin / Technical)
- Inspects coordinates and geometry
- Views topology
- Checks geometry calibration
- Manages technical layers (requires elevated permissions)

## 2. Task × Role Matrix

| ROLE | BUSINESS_QUESTION | REQUIRED_DATA | DECISION_OR_ACTION | EXPECTED_FREQUENCY | FREQUENCY_EVIDENCE | BEST_UI_LOCATION | SOURCE_EVIDENCE |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| Port Manager | Tình hình ghi chỉ số toàn Cảng hôm nay? | Zone-level progress aggregate | Drill into problem zone report | Daily | HYPOTHESIS | Map overview + HUD | No data source on Map V2 — NEEDS_BACKEND_DATA |
| Port Manager | Năng suất nhân viên hôm nay thế nào? | Aggregate completion stats | Review summary reports | Weekly | HYPOTHESIS | Reports / Dashboard | NEEDS_BACKEND_DATA |
| Port Manager | Có sự cố gì ở mạng lưới điện nước không? | Utility network alerts/status | Inform technical team | Ad-hoc | HYPOTHESIS | Map overview technical layers | utilityNetworkStateMachine.ts (DEMO ONLY) |
| Port Manager | Tiến độ ghi các khu vực trọng điểm? | Zone reading status | Escalate if delayed | Daily | HYPOTHESIS | Map overview zone color/badge | NEEDS_BACKEND_DATA |
| Port Manager | Tổng số nhân viên đang làm việc trên hiện trường? | Attendance & Active Shifts | Resource planning | Daily | HYPOTHESIS | Map overview HUD summary | NEEDS_BACKEND_DATA |
| Operations Admin | Khu vực nào chưa hoàn thành? | Per-zone completion rates | Send inspector or reassign | 2-4× daily | HYPOTHESIS | Map overview zone color/badge | No data source — NEEDS_BACKEND_DATA |
| Operations Admin | Ai đang phụ trách khu nào? | ZoneAssignment + Attendance | Verify coverage | Daily | HYPOTHESIS | Employee markers on map | Currently DEMO_ONLY (employeeDataAdapter.ts) |
| Operations Admin | Nhân viên X đang ở đâu? | Real-time / Last known location | Direct communication / Task dispatch | Ad-hoc | HYPOTHESIS | Hover preview / Inspector | employeeMovement.ts (DEMO ONLY) |
| Operations Admin | Lịch ghi hôm nay đã được phân bổ hết chưa? | WorkSchedule & ZoneAssignments | Complete roster | Daily | HYPOTHESIS | Phân ca (Staff Roster) | AdminShell.tsx links |
| Operations Admin | Có đồng hồ nào bị lỗi/bỏ sót không? | MeterReading anomalies | Re-dispatch reader | Daily | HYPOTHESIS | Map alerts / Lịch ghi | NEEDS_BACKEND_DATA |
| Operations Admin | Tiến độ của nhân viên Y là bao nhiêu? | Employee quota vs completed | Adjust workload | 2-4× daily | HYPOTHESIS | Hover / Selected Inspector | MapV2InspectionPanel.tsx |
| Operations Admin | Làm sao liên hệ nhân viên đang trực chốt Z? | Contact info + Assignment | Make call / Send message | Ad-hoc | HYPOTHESIS | Inspector Panel | MapV2InspectionPanel.tsx |
| Operations Admin | Những khu vực nào cần ưu tiên ghi trước? | Zone priorities | Adjust schedules | Weekly | HYPOTHESIS | Map zones / Lịch ghi | NEEDS_BACKEND_DATA |
| Operations Admin | Chuyển ca cho nhân viên có được cập nhật trên bản đồ không? | Live Shift/Attendance updates | Monitor transitions | Daily | HYPOTHESIS | Map overview | NEEDS_BACKEND_DATA |
| Map Admin | Tọa độ điểm neo của khu vực có chính xác không? | Zone geometry & Anchors | Adjust geometry | Monthly | HYPOTHESIS | Technical Inspector | zoneAnchors.ts |
| Map Admin | Cấu trúc mạng lưới lưới điện/nước hiển thị đúng không? | Utility topology data | Update network graph | Quarterly | HYPOTHESIS | Technical Network Mode | utilityNetworkGraph.ts |
| Map Admin | Ranh giới giữa các phân khu có bị chồng lấn? | Polygon data | Edit polygons in source | Ad-hoc | HYPOTHESIS | Technical Layers | MapV2Layers.tsx / tan_thuan_1_zones_edited.json |
| Map Admin | Các lớp kỹ thuật hiển thị như thế nào? | Layer visibility state | Toggle layers for testing | Weekly | HYPOTHESIS | Layer Manager | MapV2Layers.tsx |
| Map Admin | Kích thước hiển thị tối ưu cho các màn hình khác nhau? | Responsive canvas data | Adjust view bounds | Monthly | HYPOTHESIS | Map overview (Fit/Width) | MapV2Workspace.tsx |
| Map Admin | Có lỗi console nào khi mô phỏng chuyển động không? | Animation logs | Debug movement engine | Ad-hoc | HYPOTHESIS | DevTools / HUD | employeeMovement.ts |

## 3. Feature Allocation

| Feature / UI Element | Map Overview | Hover Preview | Persistent Inspector | Lịch ghi (Schedules) | Phân ca (Roster) | Báo cáo (Reports) | Technical Tools |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| Zone Progress Badge | X | | | | | | |
| Employee Location/Status | X | X | | | | | |
| Employee Contact Details | | | X | | X | | |
| Geometry Coordinate Copy | | | X | | | | X |
| Network Topology Toggle | X | | | | | | X |
| Full Reading Round List | | | | X | | | |
| Staff Assignment Editing | | | | | X | | |
| Aggregate Performance | | | | | | X | |
| Layer Visibility Toggles | X | | | | | | X |
| Viewport Adjustments | X | | | | | | X |
