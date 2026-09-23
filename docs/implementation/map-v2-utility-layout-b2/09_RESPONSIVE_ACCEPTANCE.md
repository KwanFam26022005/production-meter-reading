# 09. Nghiệm thu Khả năng Thích ứng Màn hình (Responsive Acceptance)

Hệ thống giao diện Bản đồ V2 được thiết kế để vận hành trơn tru trên toàn bộ dải thiết bị màn hình tại Cảng Sài Gòn — Cảng Tân Thuận, từ máy trạm di động nhỏ gọn ($1280 \times 800$), máy tính văn phòng phổ thông ($1366 \times 768$), màn hình doanh nghiệp tiêu chuẩn ($1920 \times 1080$), đến màn hình giám sát trung tâm điều hành ($2560 \times 1440$).

---

## 1. Kết quả Kiểm thử Ma trận Độ phân giải (Resolution Matrix)

Dưới đây là kết quả kiểm thử thực tế từ 5 cấu hình độ phân giải với bằng chứng chụp màn hình trong thư mục [`evidence/`](file:///D:/Projects/production-meter-reading/production-meter-reading/docs/implementation/map-v2-utility-layout-b2/evidence/):

| Độ phân giải Viewport | Tỷ lệ Màn hình | Chế độ Thanh công cụ | Tỷ lệ Scale Bản đồ (`Zoom`) | Trạng thái Hiển thị B2 | Tệp Bằng chứng |
| :---: | :---: | :---: | :---: | :--- | :--- |
| **$1280 \times 800$** | $16:10$ | **Thu gọn (Popover)** | $\approx 0.78$ | Ôn định, không tràn viền, nhãn tự ẩn | [`B2-both-1280.png`](evidence/B2-both-1280.png) |
| **$1366 \times 768$** | $16:9$ (Chuẩn cảng) | **Thu gọn (Popover)** | $\approx 0.84$ | Bố cục hoàn hảo, sắc nét, không gãy nhãn | [`B2-both-1366.png`](evidence/B2-both-1366.png) |
| **$1440 \times 900$** | $16:10$ | **Mở rộng (Toolbar)** | $\approx 0.90$ | Đầy đủ nút và nhãn thống kê | [`B2-both-1440.png`](evidence/B2-both-1440.png) |
| **$1920 \times 1080$** | $16:9$ (Full HD) | **Mở rộng (Toolbar)** | $\approx 1.20$ | Rộng rãi, đường nét phân cấp 3 tầng rõ nét | [`B2-both-1920.png`](evidence/B2-both-1920.png) |
| **$2560 \times 1440$** | $16:9$ (2K QHD) | **Mở rộng (Toolbar)** | $\approx 1.60$ | Độ phân giải cao, hiển thị trọn vẹn chi tiết | [`B2-both-2560.png`](evidence/B2-both-2560.png) |

---

## 2. Cơ chế Thích ứng Ngưỡng Thu gọn (Breakpoint Threshold: $1380\text{ px}$)

- **Khi chiều rộng Container $\ge 1380\text{ px}$ (Chế độ Rộng):**
  - Thanh công cụ hiển thị đầy đủ: Các nút chế độ nhìn (`Fit toàn bộ`, `Tràn chiều rộng`), nhóm nút chuyển tông màu (`Chuẩn kỹ thuật`, `Neon số`), nhóm nút bật lớp mạng (`Tắt lưới`, `Điện`, `Nước`, `Cả hai`), huy hiệu cảnh báo mô phỏng (`Mạng mô phỏng Demo`), và nút `Lớp hiển thị`.
  - Bộ chọn phương án (`PA A / PA B ★ / PA C`) đã được loại bỏ hoàn toàn khỏi thanh công cụ chính để tối đa hóa không gian thao tác.
- **Khi chiều rộng Container $< 1380\text{ px}$ (Chế độ Gọn):**
  - Các nút tùy chọn nâng cao được gom gọn vào nút **"Tùy chọn"** duy nhất với biểu tượng bánh răng.
  - Khi nhấp vào "Tùy chọn", popover trượt mở cung cấp đầy đủ các điều khiển mà không chiếm dụng thanh tiêu đề ngang.
  - Phím `Escape` hỗ trợ đóng nhanh popover theo chuẩn trợ năng WAI-ARIA.

---

## 3. Khả năng Giữ Vững Tọa độ Hình học (Vector Coordinate Integrity)

Nhờ kỹ thuật SVG vector dựa trên hệ tọa độ chuẩn $1536 \times 1024\text{ px}$:
1. Khi bản đồ thu phóng (`zoom`) hoặc trượt (`pan`), toàn bộ các điểm nút, đường trục, và huy hiệu đồng hồ tự động co giãn đồng dạng tuyệt đối với ảnh nền bản đồ vệ tinh.
2. Không xảy ra hiện tượng "lệch tim tuyến" (drift) hay lệch vị trí đồng hồ so với trạm biến áp hoặc mặt đường nội bộ.
