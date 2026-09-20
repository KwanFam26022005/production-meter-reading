# SỔ THEO DÕI RỦI RO & BIỆN PHÁP KIỂM SOÁT (RISK REGISTER)

**Tài liệu**: `docs/product/four-workspaces/03_RISK_REGISTER.md`  
**Dự án**: Cảng Tân Thuận Operations Dashboard — V16E Four-Workspace Consolidation  
**Phiên bản**: 1.0  

---

## Danh Mục Rủi Ro Kỹ Thuật & Nghiệp Vụ

| Mã | Tên rủi ro | Mức độ | Nguyên nhân | Tác động | Biện pháp kiểm soát & Giảm thiểu | Trạng thái |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **R-01** | **Gãy Deep Link cũ** | CAO | Người dùng hoặc tài liệu cũ truy cập `?tab=assets`, `?tab=meters`, `?tab=verification`, `?tab=audit` khi các tab này không còn trên rail chính. | Màn hình trắng hoặc rơi vào fallback không mong muốn, mất bookmark của quản trị viên. | Cài đặt **Route Compatibility Mapper** trong `App.tsx`: Khi gặp `?tab=assets` hoặc `?tab=meters`, tự động kích hoạt `Bản đồ` đồng thời mở drawer/thẻ tra cứu thiết bị; `?tab=verification` định tuyến vào chế độ thẩm định trong Báo cáo/Bản đồ; `?tab=audit` định tuyến vào tab Nhật ký trong Báo cáo. Không redirect mù quáng về trang chủ. | ĐÃ CÓ PHƯƠNG ÁN |
| **R-02** | **Thất lạc Thiết bị không có tọa độ** | CAO | `SIM-EXT-GRID` và `SIM-CITY-WATER` có `map_x = null, map_y = null` nên không xuất hiện dưới dạng marker trên bản đồ. Nếu chỉ cho phép click marker thì không thể mở hồ sơ của chúng. | Không thể xem thông tin điểm cấp điện/nước nguồn ngoài cảng; vi phạm yêu cầu nghiệp vụ B2. | Cung cấp danh sách tra cứu thiết bị tích hợp trong thanh Command Bar của Bản đồ. Thiết bị chưa có tọa độ hiển thị huy hiệu "Chưa định vị" và nút "Hiệu chỉnh vị trí" (relocate) để gắn tọa độ khi cần. | ĐÃ CÓ PHƯƠNG ÁN |
| **R-03** | **Xung đột nhiều bề mặt chi tiết (Multiple Overlapping Surfaces)** | TRUNG BÌNH | Mở đồng thời nhiều modal, popover hoặc thẻ chi tiết khi chuyển đổi giữa các đối tượng. | Che khuất bản đồ, giao diện chắp vá, vi phạm quy tắc "Single-Surface Rule" của DESIGN_DNA. | Áp dụng cơ chế đóng bề mặt cũ trước khi mở bề mặt mới trong `OperationalWorkspaceContext`. Mỗi thực thể chỉ có đúng 1 bề mặt chi tiết chính (`EntityDetailSurface`). Phím Escape đóng bề mặt trên cùng. | ĐÃ CÓ PHƯƠNG ÁN |
| **R-04** | **Gộp lẫn lộn các trạng thái ngữ nghĩa** | CAO | Nhầm lẫn giữa Trạng thái thiết bị (`lifecycle_status`: ACTIVE / INACTIVE / RETIRED), Trạng thái nhiệm vụ đọc (`reading_status`: PENDING / CONFIRMED / REVIEW), và Trạng thái thẩm định (`verification_status`: UNVERIFIED / VERIFIED). | Báo cáo sai lệch, nhân viên hiểu lầm công tơ hỏng là công tơ chưa đọc, hoặc công tơ chưa thẩm định là công tơ lỗi. | Tách biệt tuyệt đối 3 trường này trên UI; sử dụng màu sắc và huy hiệu riêng biệt tuân thủ `DESIGN_DNA.md`. Tuyệt đối không dùng chung một badge text hay màu đại diện. | ĐÃ CÓ PHƯƠNG ÁN |
| **R-05** | **Nhầm lẫn chỉ số tích lũy với sản lượng tiêu thụ** | TRUNG BÌNH | Báo cáo hiển thị giá trị số đo công tơ (kWh hoặc m³ tích lũy) như thể đó là lượng tiêu thụ trong kỳ. | Số liệu sản lượng bị phóng đại gấp hàng trăm lần, gây sai sót quyết toán năng lượng cảng. | Phân biệt rõ ràng nhãn: "Chỉ số ghi nhận (Chỉ số lũy kế)" vs "Sản lượng tiêu thụ trong kỳ (Delta)". Báo cáo luôn hiển thị công thức và mốc thời gian so sánh. | ĐÃ CÓ PHƯƠNG ÁN |
| **R-06** | **Rò rỉ dữ liệu thử nghiệm cũ (Legacy Test Data) vào ca thực** | CAO | Bảng `reading_rounds` chứa các round legacy (`is_legacy = 1`) hoặc dữ liệu test `data_origin = 'LEGACY_SIMULATION'`. | Hiển thị công tơ rác hoặc ca rác trong danh sách ca trực hiện tại. | Mọi query truy vấn danh sách ca đọc và công tơ trong phạm vi vận hành đều áp dụng bộ lọc: `Meter.is_active == True` và `ReadingRound.is_legacy == False`. | ĐÃ CÓ PHƯƠNG ÁN |
| **R-07** | **Mất ngữ cảnh khi điều hướng xuyên màn hình** | TRUNG BÌNH | Người dùng bấm "Xem trên bản đồ" từ Lịch ghi, sau đó muốn quay lại tiếp tục ca ghi nhưng bị mất ngày/lượt đang chọn. | Gián đoạn luồng làm việc của cán bộ điều hành, phải chọn lại ngày và lượt từ đầu. | `OperationalWorkspaceContext` lưu trữ bền vững `selectedDate` và `selectedRoundId` trong suốt phiên làm việc. Khi từ Bản đồ quay lại Lịch ghi, khôi phục chính xác trạng thái ngày và lượt đã chọn. | ĐÃ CÓ PHƯƠNG ÁN |
| **R-08** | **Sai lệch giao diện Responsive trên Mobile (390×844)** | TRUNG BÌNH | Ma trận phân ca hoặc bảng báo cáo tràn ngang, thanh điều hướng 4 tab bị rớt dòng (overflow). | Trải nghiệm thao tác trên thiết bị di động của cán bộ hiện trường bị hỏng. | Giữ nguyên thứ tự và tên gọi ngắn gọn của 4 tab: `Bản đồ | Lịch ghi | Phân ca | Báo cáo`. Dùng flexbox với flex: 1 và icon tối ưu cho màn hình hẹp. Kiểm tra trực quan bắt buộc ở viewport 390×844. | ĐÃ CÓ PHƯƠNG ÁN |
| **R-09** | **Phá vỡ kiểm thử hồi quy hiện có (`tabLifecycle.test.ts`)** | THẤP | Test suite kiểm tra các chuỗi ký tự code cụ thể trong `App.tsx` (như `adminActiveTab === 'meters' &&`). | Test runner báo fail dù chức năng người dùng hoạt động bình thường. | Bảo toàn các khối điều kiện tương thích trong `App.tsx` để render các component liên quan khi cần, đồng thời bảo đảm chỉ 4 tab cấp cao xuất hiện trên giao diện điều hướng. | ĐÃ CÓ PHƯƠNG ÁN |

---

## 2. Kế Hoạch Kiểm Soát & Giám Sát
1. Trước khi tiến hành Phase C (Triển khai code), cấu trúc điều hướng mới phải được chốt đầy đủ trong các tài liệu Phase B (04, 05, 06).
2. Toàn bộ 9 rủi ro trên sẽ được dùng làm checklist kiểm tra nghiệm thu trong Phase D (Kiểm tra trực quan và luồng người dùng).
