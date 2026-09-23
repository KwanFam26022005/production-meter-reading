# Map V2 Final Architecture Reconciliation — 12. Business Decisions Cleanup & Triage

**Thread:** 6 — Map V2 Final Architecture Reconciliation  
**Objective:** Deconstruct the 17 business decisions listed in Thread 5 (`14_BUSINESS_DECISIONS_REQUIRED.md`) by filtering out internal engineering concerns and UX conventions, isolating only the genuine Port policy decisions requiring leadership sign-off.

---

## 1. Triage Summary

Thread 5 asked Cảng Sài Gòn leadership to resolve 17 questions. However, requesting executive port approval for internal code patterns (e.g. which API endpoint to call, whether to gate buttons, or how to write an interface) creates artificial decision paralysis.

We classify all 17 items into three distinct domains:

```text
┌────────────────────────────────────────────────────────┐
│  A. TRUE PORT BUSINESS DECISIONS (6 items)             │
│     Operational policy, labor rules, and physical      │
│     infrastructure standards requiring Port approval   │
├────────────────────────────────────────────────────────┤
│  B. PRODUCT & UX DECISIONS (6 items)                   │
│     Interaction design, layout standards, and WCAG     │
│     heuristics handled by Product & UX Architects      │
├────────────────────────────────────────────────────────┤
│  C. ENGINEERING DECISIONS (5 items)                    │
│     Technical implementation details ALREADY RESOLVED  │
│     by existing code and APIs                          │
└────────────────────────────────────────────────────────┘
```

---

## 2. Category A: True Port Business Decisions

These **6 items** genuinely involve operational liability, labor accountability, and wharf physical standards. They MUST be submitted to Port management:

| Decision ID | Operational Question | Context & Trade-Off | Business Impact |
| :---: | :--- | :--- | :--- |
| **BD-04** | **Phân cấp bãi & kho**: Bãi tổng hợp (`ZONE_GENERAL`) có bao gồm sản lượng của Kho 1 (`BLDG_KHO_1`) và Kho 2 (`BLDG_KHO_2`) hay là vùng độc lập? | Frontend có polygon lồng nhau; Backend có bảng phẳng. Nếu gộp chung, rủi ro đếm trùng; nếu tách riêng, bãi hở ngoài trời được tính riêng. | Quyết định cách thức tính KPI sản lượng toàn khu. |
| **BD-05** | **Mẫu số tiến độ ghi chỉ số**: Mẫu số của khu vực là toàn bộ công tơ vật lý đang hoạt động (`total_active_meters`) hay chỉ các công tơ được lên lịch trong lượt (`scheduled_meters`)? | Nếu một công tơ chỉ đọc 1 lần/ngày vào ca sáng, ở lượt chiều nó có nằm trong mẫu số không? | Ảnh hưởng trực tiếp đến tỷ lệ hoàn thành % hiển thị trên bản đồ. |
| **BD-10** | **Mô hình trách nhiệm nhân sự**: Áp dụng phân công phụ trách cố định theo khu (Model A - Standing Assignee) hay điều độ linh hoạt theo ca trực (Model B - Shift Dispatch)? | Hiện tại SQLite có `ZoneAssignment` cố định, nhưng chưa có bảng `shift_zone_assignments` theo ngày. | Quyết định quy trình giao ca và phân công trách nhiệm khi xảy ra sự cố điện/nước. |
| **BD-15** | **Chính sách gỡ bỏ dữ liệu mô phỏng**: Khi nào chính thức gỡ bỏ 4 nhân viên demo di chuyển để thay thế bằng nhân sự phụ trách thực tế từ SQLite? | Demo marker di chuyển trông sinh động nhưng không phản ánh vị trí thực tế; marker thực tế sẽ đứng yên tại điểm neo khu vực. | Đảm bảo tính trung thực dữ liệu đối với ban giám đốc cảng. |
| **BD-17** | **Định vị tọa độ công tơ trên Bản đồ V2**: Cho phép kỹ thuật viên cảng chuẩn hóa tọa độ công tơ trực quan trên nền ảnh 1536×1024 px? | Tọa độ cũ trong SQLite chuẩn hóa theo nền 1915×821 px (Map V1). Cần phê duyệt việc cập nhật tọa độ công tơ theo tọa độ hiển thị mới. | Độ chính xác vị trí công tơ trên bản đồ số. |
| **NEW-01** | **Chuẩn hóa đơn vị đo đếm (Measurement Unit)**: Xác nhận chính thức Điện lực luôn là `kWh` và Cấp nước luôn là `m³`, cùng hệ số nhân (multiplier)? | Mô hình dữ liệu hiện tại có `MEASUREMENT_UNIT_DATA_GAP` (chưa có trường đơn vị trong bảng `meters`). | Cơ sở pháp lý tính cước và báo cáo tiêu thụ. |

---

## 3. Category B: Product & UX Decisions

These **6 items** are resolved by the Product & UX team in accordance with Maritime Operational Minimalism (`saigon-port-ui`):

| Decision ID | Question | Architectural Resolution |
| :---: | :--- | :--- |
| **BD-06** | Map V2 có nên hiển thị Ngày và Lượt ghi? | **RESOLVED**: CÓ. Bắt buộc hiển thị trên thanh công cụ chính (`📅 23/09/2026 · Lượt 10:00 (Đang mở)`). |
| **BD-07** | Map V2 có cần ô tìm kiếm không? | **RESOLVED**: CÓ. Tích hợp thanh tìm kiếm nhanh khu vực, công tơ, mã nhân viên ở thanh công cụ chính. |
| **BD-08** | Nhấp vào khu vực/công tơ có liên kết sang Báo cáo không? | **RESOLVED**: CÓ. Nút CTA `[Xem Báo cáo khu vực]` và `[Xem lịch sử chỉ số]` trong dock inspector. |
| **BD-09** | Từ Báo cáo có thể định vị ngược về Bản đồ V2 không? | **RESOLVED**: CÓ. Tái sử dụng `locateOnMap(entity)` và chuyển hướng đến `tab = 'map_v2'`. |
| **BD-13** | Huy hiệu CANONICAL và thông số 1536×1024 có nên hiện thường trực? | **RESOLVED**: KHÔNG. Chuyển vào menu `⋯` (Tùy chọn/Thông tin bản đồ) để giải phóng diện tích cho nghiệp vụ. |
| **BD-16** | Phân biệt trạng thái `NO_DATA` với `0%` như thế nào? | **RESOLVED**: Bắt buộc phân tách. Chưa mở lượt hoặc 0 công tơ hiển thị `Chưa mở lượt` (viền xám). `0%` chỉ dùng khi đang mở lượt nhưng chưa có chỉ số. |

---

## 4. Category C: Engineering Decisions (Already Resolved)

These **5 items** were previously presented as open business blockers, but are **already resolved by existing software infrastructure**:

| Decision ID | Question | Engineering Reality & Resolution |
| :---: | :--- | :--- |
| **BD-01** | Map V2 có nên hiển thị tiến độ thời gian thực? | **ALREADY SUPPORTED**: `GET /api/v1/map/overview` đã tính sẵn tiến độ từng khu vực. Chỉ cần frontend gọi API. |
| **BD-02** | Endpoint nào phục vụ dữ liệu Map V2? | **ALREADY BUILT**: Sử dụng bộ endpoint `/api/v1/map/overview`, `/api/v1/map/zones`, `/api/v1/map/meters`, `/api/v1/map/operators`. |
| **BD-03** | Khớp nối ID phân khu Map V2 với OperationalZone? | **ALREADY ARCHITECTED**: Bảng `map_version_zones` và `GET /api/v1/map-config/active` đã có sẵn trường `business_zone_id`. |
| **BD-11** | Chế độ Kiểm tra kỹ thuật có cần phân quyền không? | **ALREADY ENFORCED**: Ràng buộc theo `currentUser.role === 'ADMIN'`. Chỉ admin mới thấy tùy chọn Kiểm tra hình học. |
| **BD-12** | Mạng lưới điện/nước mô phỏng có cần tách biệt không? | **ALREADY ISOLATED**: Chuyển thành 2 lớp bật/tắt trong Layer Manager, kèm badge cảnh báo mô phỏng bắt buộc. |
