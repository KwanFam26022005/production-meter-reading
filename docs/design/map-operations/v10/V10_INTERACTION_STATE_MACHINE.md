# V10 Interaction State Machine — Cảng Tân Thuận
## Máy trạng thái Không gian 4 cấp độ & Nguyên lý Tiết lộ Thông tin Lũy tiến

Phiên bản: `tan-thuan-v10`  
Mã nguồn: `frontend/src/features/map-operations/state/useMapStateMachine.ts`  

---

### 1. 4 Trạng thái Không gian Rõ ràng (Explicit Workspace States)

Thay vì để các panel giao diện mở chồng chéo không kiểm soát, V10 quy chuẩn toàn bộ hành vi không gian vào **4 trạng thái duy nhất**:

```
 ┌─────────────┐   Select Zone    ┌──────────────┐   Select Meter   ┌──────────────┐
 │             │ ───────────────> │              │ ───────────────> │              │
 │  OVERVIEW   │                  │  ZONE_FOCUS  │                  │ ENTITY_FOCUS │
 │             │ <─────────────── │              │ <─────────────── │              │
 └─────────────┘   Click Canvas   └──────────────┘      ESC / Back  └──────────────┘
        ▲                                                                  │
        │                               Start Action (Ghi số/Điều chuyển)  │
        │                                                                  ▼
        │                         ESC / Hoàn thành                  ┌──────────────┐
        └────────────────────────────────────────────────────────── │   WORKFLOW   │
                                                                    └──────────────┘
```

#### 1.1. Trạng thái OVERVIEW (Toàn cảnh Cảng)
- **Mục tiêu**: Cung cấp bức tranh tổng thể về tình trạng vận hành của toàn bộ Cảng Tân Thuận mà không làm che khuất mặt bằng ảnh vệ tinh.
- **Camera**: Zoom chuẩn `1.0`, Pan `(0, 0)`.
- **Giao diện hiển thị**:
  - Thanh lệnh đỉnh siêu gọn (`46–54px`): Logo + Tên cảng + Cụm thời gian gộp (`05/08/2026 · Ca 1 — 17:00`) + Chuyển chế độ [Bản đồ | Danh sách] + Chip tài khoản `[ P ]`.
  - Công cụ truy vấn dạng Icon: Tìm kiếm thu gọn dạng icon $\ge 44\text{px}$, Bộ lọc dạng icon kèm huy hiệu số đếm.
  - Dải thông số vận hành mức thấp: `✓ Bình thường  11/12 hoàn tất  1 quá hạn  [icon phân tích]`.
  - Viên thuốc tiến độ ca trực thu gọn: `17:00 · 92%` (click/hover mới bung ra timeline).
  - Nút Chú giải bản đồ dạng icon tròn (không chiếm diện tích ngang).
- **Mức độ chi tiết (LOD)**:
  - Công tơ: Chấm tròn tinh gọn `10–12px` (giảm nhiễu thị giác tối đa).
  - Phân khu: Đường biên 1.6px, độ mờ nền cực nhẹ 4.5%, nhãn cartographic thanh lịch.
- **Ràng buộc bất biến**: Không có bất kỳ drawer, dialog, form tìm kiếm mở sẵn nào trong trạng thái này.

#### 1.2. Trạng thái ZONE_FOCUS (Tập trung Phân khu)
- **Mục tiêu**: Nghiên cứu sâu tình hình phân bổ tài sản, tiến độ và bất thường trong một phân khu cụ thể.
- **Kích hoạt**: Người dùng click vào polygon phân khu hoặc chọn từ danh sách.
- **Camera**: Tự động lia và zoom mượt mà đến phân khu mục tiêu (Zoom `1.25` đến `1.65`, Pan căn giữa phân khu theo thuật toán `calculateZoneCameraFraming`).
- **Thị giác bản đồ**:
  - Phân khu được chọn: Nền sáng 16%, viền phát quang đôi (halo 4.8px, edge 2.0px).
  - Các phân khu còn lại: Độ mờ giảm sâu xuống 2.0%, viền mờ 0.28 để tôn vinh khu vực trọng tâm.
  - Công tơ trong phân khu: Nâng cấp LOD lên kích thước `16–18px` kèm mã hiệu rút gọn.
- **Bề mặt ngữ cảnh**: Drawer phân khu (`ZoneDrawer`) trượt vào từ cạnh phải, trình bày danh sách công tơ, tỷ lệ hoàn tất và nhân sự phụ trách.

#### 1.3. Trạng thái ENTITY_FOCUS (Tập trung Thực thể Công tơ/Nhân sự)
- **Mục tiêu**: Kiểm tra chi tiết kỹ thuật số liệu đọc, ảnh chụp OCR, lịch sử bảo trì hoặc lộ trình của một nhân viên.
- **Kích hoạt**: Click vào một công tơ hoặc huy hiệu nhân sự.
- **Camera**: Phóng to trực diện thực thể (Zoom `1.45` đến `1.85`).
- **Thị giác bản đồ**:
  - Công tơ mục tiêu: Nâng cấp LOD tối đa `20–24px`, vòng hào quang xung nhịp (`pulse animation`), đường kết nối logic tới trạm biến áp/người phụ trách.
  - Thực thể khác: Giảm nhẹ độ tương phản.
- **Bề mặt ngữ cảnh**: Drawer công tơ chuyên sâu (`MeterDetailDrawer`) hiển thị đầy đủ thông số phụ tải, ảnh camera công tơ gần nhất và cảnh báo bất thường.

#### 1.4. Trạng thái WORKFLOW (Thực thi Tác vụ Chuyên sâu)
- **Mục tiêu**: Người dùng thực hiện hành động ghi chỉ số, định vị lại vị trí công tơ, hoặc xác nhận biên bản sự cố.
- **Kích hoạt**: Nhấn "Ghi số ngay", "Điều chuyển vị trí", hoặc "Báo cáo sự cố".
- **Giao diện**:
  - Khóa tương tác nền bản đồ (ngăn chặn click nhầm thay đổi camera).
  - Bảng điều khiển tác vụ hoặc drawer nhập liệu chiếm tiêu điểm (`focus trap`).
  - Nút Hủy và Lưu rõ ràng, hỗ trợ hoàn tác.
  - Khi hoàn tất hoặc bấm Hủy: Quay trở lại mượt mà trạng thái `ENTITY_FOCUS` hoặc `OVERVIEW`.

---

### 2. Quy tắc Điều hướng & Phím tắt Bất biến

| Thao tác | Trạng thái hiện tại | Trạng thái đích | Hành vi Camera & Giao diện |
| :--- | :--- | :--- | :--- |
| Click vào vùng trống bản đồ | `ZONE_FOCUS` / `ENTITY_FOCUS` | `OVERVIEW` | Reset zoom về 1.0, đóng toàn bộ drawer |
| Phím `Escape` | `WORKFLOW` | `ENTITY_FOCUS` | Hủy quy trình hiện tại, giữ nguyên thực thể |
| Phím `Escape` | `ENTITY_FOCUS` | `ZONE_FOCUS` | Đóng drawer công tơ, chuyển tiêu điểm về phân khu cha |
| Phím `Escape` | `ZONE_FOCUS` | `OVERVIEW` | Reset camera toàn cảng |
| Chuyển Tab Bản đồ $\leftrightarrow$ Danh sách | Bất kỳ | Giữ nguyên thực thể | Trạng thái công tơ/phân khu được chọn không bị mất |
| Click công tơ khác khi đang mở drawer | `ENTITY_FOCUS` | `ENTITY_FOCUS` | Tráo đổi nội dung tại chỗ, không mở thêm drawer phụ |
