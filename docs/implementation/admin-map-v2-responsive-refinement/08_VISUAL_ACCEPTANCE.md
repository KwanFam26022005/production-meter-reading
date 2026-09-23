# 08 — Bằng chứng Nghiệm thu Thị giác (Visual Acceptance)

> **Dự án**: Cảng Tân Thuận — Production Meter Reading & Operations Portal  
> **Phân hệ**: Bản đồ Kỹ thuật V2 (Map V2)  
> **Thư mục lưu trữ**:  
> - Kho lưu trữ cục bộ: [docs/implementation/admin-map-v2-responsive-refinement/evidence/](file:///D:/Projects/production-meter-reading/production-meter-reading/docs/implementation/admin-map-v2-responsive-refinement/evidence/)  
> - Thư mục Artifact: [brain/evidence/](file:///C:/Users/User/.gemini/antigravity-cli/brain/bc871c02-2f4c-4232-9fc9-83018eaf8d95/evidence/)

---

## 1. Video Toàn cảnh Tương tác (Interaction Walkthrough Video)

Tệp video ghi lại toàn bộ chuỗi hành vi tương tác trên trình duyệt thực tế (Microsoft Edge engine, độ phân giải 1366 × 768 thích ứng lên 1600 × 900):

- **Đường dẫn cục bộ**: [map-v2-responsive-interaction.webm](file:///D:/Projects/production-meter-reading/production-meter-reading/docs/implementation/admin-map-v2-responsive-refinement/evidence/videos/map-v2-responsive-interaction.webm)  
- **Đường dẫn Artifact**: [map-v2-responsive-interaction.webm](file:///C:/Users/User/.gemini/antigravity-cli/brain/bc871c02-2f4c-4232-9fc9-83018eaf8d95/evidence/videos/map-v2-responsive-interaction.webm)  
- **Dung lượng**: 3.44 MB  
- **Kịch bản ghi hình**:
  1. *Khởi tạo*: Mở bản đồ ở chế độ Vận hành mặc định (chỉ hiển thị 7 điểm neo và ranh giới đường).
  2. *Zone Reveal*: Click chọn "Bãi hàng tổng hợp" $\rightarrow$ Sóng radial 450ms lan tỏa và giới hạn hoàn hảo trong đa giác, thẻ thông tin neo sát vị trí.
  3. *Overlay Drawer*: Mở bảng kiểm tra hình học $\rightarrow$ Drawer trượt ra từ bên phải kèm lớp nền mờ, bản đồ không bị co giật.
  4. *Resize mượt mà*: Kích thước màn hình mở rộng lên 1600 × 900 $\rightarrow$ Header tự động bung ra dạng Wide, Drawer chuyển thành Docked panel.
  5. *Đổi đối tượng*: Click chọn "Bãi Container" $\rightarrow$ Thẻ thông tin di chuyển theo điểm neo mới, không che lấn HUD góc phải.
  6. *Neon Digital Twin*: Chuyển sang theme Neon $\rightarrow$ Chữ sáng rõ nét 12.4:1, linework cyan/magenta điện tử.
  7. *Technical Mode*: Bật chế độ Kỹ thuật $\rightarrow$ Hiển thị đầy đủ 7 đa giác, 6 polyline, 2 cổng và bảng tọa độ.

---

## 2. Ma trận 19 Ảnh Chụp Màn hình Nghiệm thu (19 Acceptance Screenshots)

| STT | Khung nhìn / Tỷ lệ | Chế độ hiển thị | Bảng Inspector | Đường dẫn tệp ảnh | Mô tả chi tiết |
| :-: | :---: | :---: | :---: | :--- | :--- |
| **01** | **1280 × 720** | Vận hành (Sáng) | Đóng | [01-1280x720-operational-default.png](file:///D:/Projects/production-meter-reading/production-meter-reading/docs/implementation/admin-map-v2-responsive-refinement/evidence/screenshots/01-1280x720-operational-default.png) | Header 1 dòng duy nhất (56px), nhãn phân khu thu gọn mã ngắn tránh che khuất. |
| **02** | **1280 × 720** | Vận hành (Sáng) | Đóng | [02-1280x720-options-popover-open.png](file:///D:/Projects/production-meter-reading/production-meter-reading/docs/implementation/admin-map-v2-responsive-refinement/evidence/screenshots/02-1280x720-options-popover-open.png) | Menu Popover "Tùy chọn" mở, chứa view mode, 6 lớp hiển thị và thông số metadata. |
| **03** | **1280 × 720** | Vận hành (Sáng) | Đóng | [03-1280x720-general-yard-revealed.png](file:///D:/Projects/production-meter-reading/production-meter-reading/docs/implementation/admin-map-v2-responsive-refinement/evidence/screenshots/03-1280x720-general-yard-revealed.png) | Reveal Bãi tổng hợp; Thẻ thông tin neo gần điểm neo, giới hạn trong lề an toàn. |
| **04** | **1280 × 720** | Vận hành (Sáng) | **Drawer mở** | [04-1280x720-inspector-drawer-open.png](file:///D:/Projects/production-meter-reading/production-meter-reading/docs/implementation/admin-map-v2-responsive-refinement/evidence/screenshots/04-1280x720-inspector-drawer-open.png) | Drawer nổi với backdrop, canvas không bị co ép, tỷ lệ bản đồ giữ nguyên 100%. |
| **05** | **1280 × 720** | Vận hành (Neon) | Đóng | [05-1280x720-neon-operational.png](file:///D:/Projects/production-meter-reading/production-meter-reading/docs/implementation/admin-map-v2-responsive-refinement/evidence/screenshots/05-1280x720-neon-operational.png) | Theme Neon số công nghệ cao trên màn hình 720p, các điểm neo cyan phát quang. |
| **06** | **1280 × 720** | Kỹ thuật (Neon) | **Drawer mở** | [06-1280x720-neon-technical-drawer.png](file:///D:/Projects/production-meter-reading/production-meter-reading/docs/implementation/admin-map-v2-responsive-refinement/evidence/screenshots/06-1280x720-neon-technical-drawer.png) | Bảng tọa độ và thuộc tính Neon tương phản cao, chữ màu Slate-50 đọc sắc nét. |
| **07** | **1366 × 768** | Vận hành (Sáng) | Đóng | [07-1366x768-operational-default.png](file:///D:/Projects/production-meter-reading/production-meter-reading/docs/implementation/admin-map-v2-responsive-refinement/evidence/screenshots/07-1366x768-operational-default.png) | Màn hình chuẩn laptop doanh nghiệp, tỷ lệ fit 65%, bố cục cân đối và thoáng. |
| **08** | **1366 × 768** | Vận hành (Sáng) | Đóng | [08-1366x768-container-yard-revealed.png](file:///D:/Projects/production-meter-reading/production-meter-reading/docs/implementation/admin-map-v2-responsive-refinement/evidence/screenshots/08-1366x768-container-yard-revealed.png) | Reveal Bãi Container, thẻ thông tin tự động dịch chuyển né HUD zoom góc phải. |
| **09** | **1366 × 768** | Vận hành (Sáng) | **Drawer mở** | [09-1366x768-inspector-drawer-open.png](file:///D:/Projects/production-meter-reading/production-meter-reading/docs/implementation/admin-map-v2-responsive-refinement/evidence/screenshots/09-1366x768-inspector-drawer-open.png) | Inspector dạng Drawer hiển thị trơn tru, không làm thay đổi tâm bản đồ. |
| **10** | **1536 × 864** | Vận hành (Sáng) | Đóng | [10-1536x864-operational-default.png](file:///D:/Projects/production-meter-reading/production-meter-reading/docs/implementation/admin-map-v2-responsive-refinement/evidence/screenshots/10-1536x864-operational-default.png) | Màn hình 1536px kích hoạt Wide Layout, thanh toolbar hiển thị đầy đủ các nút trực tiếp. |
| **11** | **1536 × 864** | Vận hành (Sáng) | **Docked mở** | [11-1536x864-inspector-docked.png](file:///D:/Projects/production-meter-reading/production-meter-reading/docs/implementation/admin-map-v2-responsive-refinement/evidence/screenshots/11-1536x864-inspector-docked.png) | Inspector hiển thị dạng Docked Panel bên phải (360px), bảo toàn tiêu điểm. |
| **12** | **1536 × 864** | Tràn chiều rộng | Đóng | [12-1536x864-width-mode.png](file:///D:/Projects/production-meter-reading/production-meter-reading/docs/implementation/admin-map-v2-responsive-refinement/evidence/screenshots/12-1536x864-width-mode.png) | Chế độ Tràn chiều rộng (Fit-Width), bản đồ mở rộng toàn bộ bề ngang canvas. |
| **13** | **1920 × 1080**| Vận hành (Sáng) | Đóng | [13-1920x1080-operational-default.png](file:///D:/Projects/production-meter-reading/production-meter-reading/docs/implementation/admin-map-v2-responsive-refinement/evidence/screenshots/13-1920x1080-operational-default.png) | Độ phân giải Full HD chuẩn, không gian làm việc rộng rãi, tỷ lệ scale đạt 99%. |
| **14** | **1920 × 1080**| Kỹ thuật (Sáng) | **Docked mở** | [14-1920x1080-inspector-docked-road-backland.png](file:///D:/Projects/production-meter-reading/production-meter-reading/docs/implementation/admin-map-v2-responsive-refinement/evidence/screenshots/14-1920x1080-inspector-docked-road-backland.png) | Chọn kiểm tra tuyến đường hậu phương cảng, danh sách tọa độ hiển thị sắc nét. |
| **15** | **1920 × 1080**| Kỹ thuật (Neon) | **Docked mở** | [15-1920x1080-neon-technical-view.png](file:///D:/Projects/production-meter-reading/production-meter-reading/docs/implementation/admin-map-v2-responsive-refinement/evidence/screenshots/15-1920x1080-neon-technical-view.png) | Neon Digital Twin hoàn chỉnh trên màn hình 1080p với linework cyan/magenta. |
| **16** | **2560 × 1440**| Vận hành (Sáng) | Đóng | [16-2560x1440-operational-default.png](file:///D:/Projects/production-meter-reading/production-meter-reading/docs/implementation/admin-map-v2-responsive-refinement/evidence/screenshots/16-2560x1440-operational-default.png) | Màn hình 2K siêu nét, tỷ lệ scale tự động đạt 135%, không bị vỡ hạt hay lệch tâm. |
| **17** | **2560 × 1440**| Kỹ thuật (Sáng) | **Docked mở** | [17-2560x1440-inspector-docked.png](file:///D:/Projects/production-meter-reading/production-meter-reading/docs/implementation/admin-map-v2-responsive-refinement/evidence/screenshots/17-2560x1440-inspector-docked.png) | Docked Inspector trên 2K, không gian hiển thị rộng lớn cho trung tâm điều hành. |
| **18** | **1536 × 864** | Browser Zoom 125%| Đóng | [18-zoom125-1536x864.png](file:///D:/Projects/production-meter-reading/production-meter-reading/docs/implementation/admin-map-v2-responsive-refinement/evidence/screenshots/18-zoom125-1536x864.png) | Trình duyệt phóng to 125% (viewport co lại thành ~1228px CSS): Header chuyển sang Compact tự động, không tràn ngang. |
| **19** | **1536 × 864** | Browser Zoom 150%| Đóng | [19-zoom150-1536x864.png](file:///D:/Projects/production-meter-reading/production-meter-reading/docs/implementation/admin-map-v2-responsive-refinement/evidence/screenshots/19-zoom150-1536x864.png) | Trình duyệt phóng to 150% (viewport co lại thành ~1024px CSS): Bố cục bền vững, không thanh cuộn dọc ngoài ý muốn. |
