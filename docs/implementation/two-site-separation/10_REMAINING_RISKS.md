# Phase 9: Remaining Risks & Open Architectural Decisions

**Dự án:** `production-meter-reading` (Cảng Sài Gòn)  
**Tài liệu:** `10_REMAINING_RISKS.md`  
**Mục tiêu:** Nhận diện minh bạch các rủi ro kỹ thuật còn tồn đọng, các điểm chưa rõ từ hạ tầng cảng và các quyết định mở cần thống nhất trước khi cutover sản xuất.

---

## 1. Bảng Đánh giá Rủi ro Kỹ thuật (Risk Matrix)

| STT | Rủi ro nhận diện | Mức độ | Khả năng | Biện pháp giảm thiểu đã thực hiện / Khuyến nghị |
| :---: | :--- | :---: | :---: | :--- |
| **R1** | **Xung đột tiến trình trên cổng 80 & 443** | Cao | Cao | *Hiện trạng:* Cổng 80 & 443 đang bị chiếm dụng bởi tiến trình `httpd.exe` (PID 4636).<br>*Giảm thiểu:* Staging sử dụng cổng 8080 & 8081 (hoặc 5173 & 5174). Không can thiệp cổng 80/443 khi chưa có biên bản bàn giao từ Ban CNTT Cảng. |
| **R2** | **Cấp phát Tên miền & Bản ghi DNS chính thức** | Trung bình | Cao | *Hiện trạng:* Chưa có FQDN chính thức được Ban CNTT phê duyệt cho User Portal và Operations Portal.<br>*Giảm thiểu:* Cấu hình sử dụng placeholder và biến môi trường (`APP_DOMAIN`, `USER_DOMAIN`, `OPERATIONS_DOMAIN`), sẵn sàng trỏ ngay khi DNS được tạo. |
| **R3** | **Chứng chỉ SSL/TLS & Hạ tầng Biên (Edge Proxy)** | Trung bình | Trung bình | *Hiện trạng:* Chưa xác định hạ tầng mạng Cảng có sử dụng Cloudflare / WAF / F5 hay cấp phát chứng chỉ nội bộ.<br>*Giảm thiểu:* Cấu hình Caddy hỗ trợ cả ACME tự động lẫn Custom SSL certificate; giữ nguyên cookie `Secure` chỉ kích hoạt trên HTTPS. |
| **R4** | **Ghim bộ nhớ đệm PWA trên thiết bị nhân viên (Stale Cache)** | Thấp | Trung bình | *Hiện trạng:* Nhân viên đã cài đặt PWA phiên bản cũ có thể giữ file shell trong Cache Storage.<br>*Giảm thiểu:* `sw.js` đã áp dụng chính sách **Network-First** cho các yêu cầu điều hướng (`navigate`). Khuyến nghị tăng chu kỳ `CACHE_NAME` lên `csg-meter-reading-shell-v3` khi đưa vào sản xuất. |
| **R5** | **Nhánh làm việc dở dang `feature/v16e-...`** | Thấp | Thấp | *Hiện trạng:* Working copy có 16 file uncommitted từ tính năng bản đồ mạng lưới.<br>*Giảm thiểu:* Tuân thủ nghiêm ngặt nguyên tắc Non-Destructive. Không xóa, không stash, không force move; giữ nguyên 100% mã nguồn và test hiện hữu. |

---

## 2. Các Quyết định Mở Cần Phê duyệt (Open Decisions)

1. **Quyết định 1: Định danh Tên miền Hai Cổng**
   - *Lựa chọn đề xuất:*
     - Cổng Nhân viên: `https://meter.saigonport.vn` (hoặc `https://user.meter.saigonport.vn`)
     - Cổng Điều hành: `https://ops.meter.saigonport.vn` (hoặc `https://admin.meter.saigonport.vn`)
   - *Cơ quan duyệt:* Ban CNTT Cảng Sài Gòn.

2. **Quyết định 2: Điểm kết thúc TLS (TLS Termination Point)**
   - *Phương án A:* Kết thúc SSL tại Caddy Web Server trên máy chủ chạy dịch vụ.
   - *Phương án B:* Kết thúc SSL tại Edge Firewall / Reverse Proxy của Data Center Cảng Sài Gòn, chuyển tiếp HTTP nội bộ về máy chủ ứng dụng.

3. **Quyết định 3: Thời lượng Cửa sổ Chuyển dịch (Transition Window)**
   - Khuyến nghị giữ song song cổng cũ tối thiểu 14 ngày làm việc để toàn bộ 100% nhân viên hiện trường hoàn tất cập nhật.
