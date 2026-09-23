# 09. Dung sai Kỹ thuật & Giới hạn Thiết kế (Technical Tolerance & Limitations)

Báo cáo này làm rõ các chỉ số dung sai hình học và những giới hạn hiện tại của mô hình bố cục mạng hạ tầng trong Phase 1.

---

## 1. Các Chỉ số Dung sai Kỹ thuật (Technical Tolerances)

| Hạng mục Dung sai | Giá trị Chuẩn hóa | Kiểm tra Thực tế | Đánh giá Tuân thủ |
| :--- | :---: | :---: | :--- |
| **Không gian Tọa độ Chuẩn** | $1536 \times 1024\text{ px}$ | $100\%$ điểm nằm trong $[0, 1536] \times [0, 1024]$ | **Đạt tuyệt đối** |
| **Khoảng cách Đệm Kho hàng** | $\ge 15\text{ px}$ | Tuyến thấp nhất cách mép kho $25\text{ px}$ ($Y=570$ so với kho $Y=545-550$) | **Đạt xuất sắc** |
| **Khoảng cách Đệm Cổng Cảng** | $\ge 20\text{ px}$ | Trục kỹ thuật cách Gate B $84\text{ px}$ ($X=790$ so với Gate B $X=874$) | **Đạt xuất sắc** |
| **Khoảng cách Đệm Zone Anchors** | $\ge 25\text{ px}$ | Điểm gần nhất cách tâm anchor $> 35\text{ px}$ | **Đạt xuất sắc** |
| **Hành lang Cách ly Tuyến Đôi** | $\ge 30\text{ px}$ | Trục Điện ($X=750$) cách Trục Nước ($X=790$) đúng $40\text{ px}$ | **Đạt xuất sắc** |
| **Góc Bẻ Tuyến (Bends)** | $90^\circ \pm 0^\circ$ | $100\%$ các góc ngoặt là góc vuông trực giao | **Đạt tuyệt đối** |
| **Góc Giao cắt Điện - Nước** | $90^\circ \pm 0^\circ$ | $100\%$ điểm giao chéo vuông góc, 0 giao xiên | **Đạt tuyệt đối** |

---

## 2. Các Giới hạn Hiện tại của Phase 1 (Known Limitations)

Mặc dù bố cục đạt độ hoàn thiện cao về mặt đồ họa và trải nghiệm người dùng, các giới hạn sau cần được lưu ý trước khi chuyển sang Phase 2:

1. **Chưa có dữ liệu trắc địa ngầm thực tế (No Ground-Survey Cadastre):**
   - Các tuyến dây và ống nước trong bố cục này hoàn toàn dựa trên kịch bản mô phỏng `tan-thuan-demo-v1`. Khi cảng tiến hành số hóa hồ sơ hoàn công ngầm thực tế, tọa độ các tuyến này sẽ cần được hiệu chỉnh lại theo bản vẽ trắc địa.
2. **Chưa có luồng dữ liệu chỉ số thời gian thực (No Live Telemetry Stream):**
   - Hiện tại các nút đồng hồ hiển thị trạng thái danh tính tĩnh. Chưa gắn luồng dữ liệu telemetry kWh/$m^3$ trực tiếp từ MQTT hay Modbus RTU lên bản đồ.
3. **Chưa triển khai hiệu ứng truyền năng lượng (No Propagation Waves):**
   - Để bảo đảm an toàn và tuân thủ chặt chẽ phạm vi Phase 1 (Layout Design Only), các hiệu ứng bung tuyến (Expand), dò tuyến (Trace), và thu gọn (Retract) chưa được kích hoạt.
4. **Độ phân giải màn hình tối thiểu:**
   - Để hiển thị đầy đủ cả thanh công cụ, các bộ nút chuyển đổi phương án và bản đồ không bị co cụm, độ phân giải khuyến nghị tối thiểu là $1280 \times 800\text{ px}$. Trên các màn hình nhỏ hơn $1380\text{ px}$, hệ thống tự động co cụm các tùy chọn vào popover **Tùy chọn bản đồ** để bảo vệ không gian làm việc.
