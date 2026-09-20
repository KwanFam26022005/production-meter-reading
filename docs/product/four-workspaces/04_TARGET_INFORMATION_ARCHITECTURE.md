# KIẾN TRÚC THÔNG TIN MỤC TIÊU: 4 WORKSPACES (TARGET IA)

**Tài liệu**: `docs/product/four-workspaces/04_TARGET_INFORMATION_ARCHITECTURE.md`  
**Dự án**: Cảng Tân Thuận Operations Dashboard — V16E Four-Workspace Consolidation  
**Phiên bản**: 1.0  
**Tác giả**: Senior Product Engineer & UX Architect  

---

## 1. Tuyên Ngôn Kiến Trúc Cốt Lõi

> **Nguyên tắc bất biến**: Toàn bộ ứng dụng điều hành Cảng Tân Thuận trên cả Desktop và Mobile **CHỈ CÓ ĐÚNG 4 MỤC ĐIỀU HƯỚNG CẤP CAO**:
>
> 1. **Bản đồ** (Spatial Operations)
> 2. **Lịch ghi** (Reading Operations)
> 3. **Phân ca** (Workforce Operations)
> 4. **Báo cáo** (Operational Insights)
>
> **Không có mục điều hướng cấp cao thứ năm.**

Mọi chức năng quản trị, kỹ thuật, mạng lưới, sổ ca, tra cứu thiết bị và đối soát hiện có đều được hội tụ hợp lý vào bên trong 4 workspace này hoặc qua các bề mặt tương tác ngữ cảnh (drawer, modal, detail surface, popover). Tuyệt đối không xóa bỏ bất kỳ workflow hay API nghiệp vụ nào.

---

## 2. Bản Đồ Kiến Trúc Thông Tin Toàn Cục

```text
CẢNG TÂN THUẬN — HỆ THỐNG ĐIỀU HÀNH VẬN HÀNH HỢP NHẤT
│
├── [TAB 1] BẢN ĐỒ (Spatial Operations)
│   ├── Chế độ xem Bản đồ GIS (Satellite Base + 6 Presentation Zones + Markers)
│   │   ├── Marker Công tơ (12 bộ đo hoạt động: 8 điện, 4 nước)
│   │   ├── Marker Thiết bị hạ tầng (30 trạm, trạm biến áp, cẩu, xưởng, máy bơm)
│   │   └── Marker Nhân sự phụ trách phân khu (Avatar điều độ)
│   ├── Chế độ xem Lớp phủ Mạng lưới (Digital Twin Network Overlay)
│   │   ├── Sơ đồ đơn tuyến điện (24 kết nối có hướng: 110kV -> Substation -> MDB -> Crane/RTG)
│   │   ├── Sơ đồ mạng cấp nước (7 tuyến ống & van: Sawaco -> Pumping Station -> Cầu cảng)
│   │   └── Bộ lọc loại năng lượng (Tất cả / Điện / Nước) & Lọc đã thẩm định
│   ├── Thanh tra cứu & Điều hành hợp nhất (Command Bar)
│   │   ├── Tìm kiếm đối tượng (Công tơ, Thiết bị kể cả 2 nguồn ngoài không có tọa độ)
│   │   ├── Bộ lọc phân khu (Berth, Container, Warehouse, Technical)
│   │   └── Xem chỉ số nhanh (Telemetry strip: Điện, Nước, Công tơ, Ngoại lệ)
│   └── Hồ sơ đối tượng duy nhất (Single-Surface EntityDetailSurface)
│       ├── Tab Tổng quan: Mã, tên, loại, thông số, chỉ số gần nhất
│       ├── Tab Quan hệ: Mạng lưới cấp nguồn, công tơ đo đếm, thiết bị cha/con
│       ├── Thao tác quản trị theo quyền: Sửa thông tin, Hiệu chỉnh vị trí (Relocate),
│       │   Ngừng hoạt động / Kích hoạt lại, Thẩm định hồ sơ
│       └── Hiệu chỉnh không gian (Calibration Workspace) theo quyền Admin
│
├── [TAB 2] LỊCH GHI (Reading Operations)
│   ├── Quản lý Lịch trình ca đọc (Schedules by Date)
│   │   ├── Bộ chọn ngày (VnDatePicker) & Thống kê lượt đọc trong ngày
│   │   ├── Danh sách các ca/lượt đọc theo giờ (Thời gian, Trạng thái, Tiến độ, Ngoại lệ)
│   │   └── Tạo lịch đọc mới (Modal với thuật toán kiểm tra xung đột thời gian)
│   ├── Sổ ca ghi chi tiết (Logbook View per Round)
│   │   ├── Danh sách công tơ cần ghi trong ca (Mã, Tên, Vị trí, Loại)
│   │   ├── Phân biệt rạch ròi 5 trạng thái ngữ nghĩa:
│   │   │   * Chỉ số gần nhất (Previous Reading)
│   │   │   * Chỉ số lượt hiện tại (Current Reading)
│   │   │   * Trạng thái thiết bị (Lifecycle: ACTIVE / INACTIVE / RETIRED)
│   │   │   * Trạng thái nhiệm vụ (Task: PENDING / CONFIRMED / REVIEW)
│   │   │   * Trạng thái thẩm định (Verification: UNVERIFIED / VERIFIED)
│   │   └── Hành động: "Ghi chỉ số" (Camera AI), "Xem trên bản đồ" (Locate on Map)
│   ├── Tác nghiệp ghi chỉ số hiện trường (Field Reading Workflow)
│   │   ├── Chụp ảnh công tơ / Chọn ảnh từ thư viện
│   │   ├── AI OCR nhận diện số đo & cắt khung ROI
│   │   └── Xác nhận số đo hoặc Nhập tay điều chỉnh (Manual Correction)
│   └── Đối soát & Kiểm tra ngoại lệ ca (Reading Inspection)
│       ├── Bấm vào pill "Cần kiểm tra" của ca đọc
│       ├── Xem ảnh gốc, ảnh ROI crop, độ tin cậy AI
│       └── Phê duyệt hoặc đính chính số đo tại chỗ
│
├── [TAB 3] PHÂN CA (Workforce Operations)
│   ├── Ma trận điều độ nhân sự (Roster Matrix View)
│   │   ├── Lưới phân ca Tháng / Tuần (Be Vietnam Pro, tối ưu bảng số)
│   │   ├── Các mã ca vận hành chuẩn: CA1 (Sáng), CA2 (Chiều), CA3 (Đêm), HC, OFF, LEAVE
│   │   ├── Gán ca trực trực tiếp qua ô lịch (RosterCellPopover)
│   │   ├── Áp dụng chu kỳ ca tự động (AutoPatternDialog: 3 ca 4 kíp, luân phiên)
│   │   └── Bảng phân tích cảnh báo xung đột (Conflict Panel: làm quá giờ, thiếu nghỉ)
│   ├── Quản lý đơn xin nghỉ phép (Leave Requests Panel)
│   │   ├── Danh sách đơn phép theo trạng thái (Chờ duyệt, Đã duyệt, Từ chối)
│   │   ├── Phân loại: Phép năm, Nghỉ bù, Việc riêng, Nghỉ ốm
│   │   └── Thao tác phê duyệt / từ chối của cán bộ quản trị
│   └── Xuất dữ liệu phân ca (Export CSV)
│
└── [TAB 4] BÁO CÁO (Operational Insights)
    ├── Báo cáo Tổng quan Sản lượng & Tiến độ (Technical Overview)
    │   ├── Thẻ tổng hợp sản lượng điện (kWh) và nước (m³)
    │   ├── Tỷ lệ hoàn thành ca và phân bổ tỷ lệ xác nhận tự động OCR vs Nhập tay
    │   └── Biểu đồ tiêu thụ và cơ cấu ngoại lệ
    ├── Đánh giá Chất lượng Nhận diện AI (Quality Assessment)
    │   ├── Tỷ lệ độ tin cậy theo phân giải ảnh
    │   └── Báo cáo mẫu hiệu chỉnh cần huấn luyện lại
    ├── Báo cáo Kỹ thuật theo Công tơ (Meter Technical Report)
    │   └── Thống kê số lần đọc, tỷ lệ bất thường và độ lệch tải theo từng vị trí
    ├── Bảng Tra cứu Dữ liệu Gốc & Bằng chứng (Raw Data & Reading Audit)
    │   ├── Bộ lọc nâng cao: Khoảng ngày, Phân khu, Loại công tơ, Nguồn xác nhận
    │   ├── Xem bằng chứng ảnh trực tiếp (Reading Inspection Modal)
    │   └── Xuất báo cáo kỹ thuật định dạng CSV
    └── Nhật ký Kiểm toán Hệ thống (System Audit Logs)
        └── Tra cứu toàn bộ lịch sử tạo, sửa, đổi vị trí, xóa thiết bị và ca đọc
```

---

## 3. Quy Tắc Trình Bày & Không Khí Giao Diện (Design DNA)

1. **Thanh Rail Điều Hướng Desktop (80px Collapsed / 320px Drawer)**:
   * Hiển thị đúng 4 icon + nhãn:
     * `Map` -> **Bản đồ**
     * `Calendar` -> **Lịch ghi**
     * `Users` -> **Phân ca**
     * `BarChart3` -> **Báo cáo**
   * Active indicator: Dải màu xanh thương cảng `--sgp-brand-600` với viền trái nổi bật.
2. **Thanh Điều Hướng Mobile (390×844)**:
   * Top bar cố định với logo Cảng Sài Gòn, tên workspace hiện tại và huy hiệu mô phỏng.
   * Drawer hoặc Segmented Tab Bar hiển thị đúng 4 mục với nhãn đồng nhất, kích thước touch target tối thiểu 48×48px.
3. **Quy Tắc Chống Trùng Lặp Mặt Bằng (Single-Surface Invariant)**:
   * Tuyệt đối không mở đồng thời 2 card chi tiết cùng lúc.
   * Khi người dùng xem hồ sơ một thiết bị trên Bản đồ, thẻ `EntityDetailSurface` duy nhất xuất hiện trượt từ bên phải vào, không phủ bàn cờ lên toàn màn hình.
