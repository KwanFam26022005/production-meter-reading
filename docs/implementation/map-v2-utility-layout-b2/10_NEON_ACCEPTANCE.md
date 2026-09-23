# 10. Nghiệm thu Chế độ Phát quang Neon Số (Neon Digital Twin Acceptance)

Chế độ **Neon Số (Neon Digital Twin)** được thiết kế riêng cho các trung tâm điều hành cảng (Operations Control Center - OCC) hoạt động trong điều kiện ánh sáng yếu hoặc trên các màn hình ghép giám sát ban đêm.

---

## 1. Thiết kế Bộ lọc Phát quang SVG Tiết chế (Restrained Glow Filters)

Khác với các hiệu ứng neon cường điệu thường gây lóa mắt và làm mờ các chi tiết ranh giới cảng, bộ lọc SVG trong Phương án B2 được tinh chỉnh với các chỉ số tiết chế chuẩn mực:

```xml
<!-- Bộ lọc Phát quang Mạng Điện (Gold / Amber Glow) -->
<filter id="utility-glow-elec" x="-20%" y="-20%" width="140%" height="140%">
  <feGaussianBlur in="SourceGraphic" stdDeviation="2.2" result="blur" />
  <feMerge>
    <feMergeNode in="blur" />
    <feMergeNode in="SourceGraphic" />
  </feMerge>
</filter>

<!-- Bộ lọc Phát quang Mạng Nước (Azure / Digital Blue Glow) -->
<filter id="utility-glow-water" x="-20%" y="-20%" width="140%" height="140%">
  <feGaussianBlur in="SourceGraphic" stdDeviation="2.2" result="blur" />
  <feMerge>
    <feMergeNode in="blur" />
    <feMergeNode in="SourceGraphic" />
  </feMerge>
</filter>
```

### Tiêu chuẩn Kỹ thuật Tuân thủ:
1. **Độ lệch Chuẩn Gaussian (`stdDeviation = "2.2"`):** Tạo quầng sáng mềm mại bao quanh đường nét, giữ cho tim tuyến luôn sắc nét, không bị nhòe thành mảng mờ.
2. **Khung Giới hạn Hẹp (`-20%..140%`):** Giới hạn vùng tính toán của bộ lọc GPU, tránh hao tổn tài nguyên render trên các máy trạm cấu hình văn phòng.
3. **Không Nhấp nháy Vô tận (Zero Infinite Cycles):** Tuyệt đối không dùng animation nhấp nháy liên tục ở trạng thái tĩnh; chỉ phát quang ổn định để người trực ban không bị mỏi mắt sau ca trực 8-12 tiếng.

---

## 2. Bảng Đối chiếu Màu sắc Nhận diện Chuyên ngành trong Chế độ Neon

| Phần tử Mạng | Màu sắc Chế độ Chuẩn (Technical) | Màu sắc Chế độ Neon (Digital Twin) | Mục đích Thị giác & Độ Tương phản |
| :--- | :--- | :--- | :--- |
| **Đường dây Lưới Điện** | `#d97706` (Hổ phách đậm) | `#ffb703` (Vàng Neon sáng) + Quầng sáng vàng | Tương phản cực cao trên nền biển đêm `#06132b` |
| **Đường ống Cấp Nước** | `#0284c7` (Xanh biển Azure) | `#00d4ff` (Cyan phát quang) + Quầng sáng xanh | Nhận diện tức thì dòng chảy nước làm mát và PCCC |
| **Đệm Đáy Dây dẫn** | `#FFFFFF` (Trắng đệm, alpha 0.85) | `#050f24` (Xanh đêm sâu) | Tách biệt với các vùng sáng khác của bản đồ |
| **Thân Tủ Phân phối** | `#FFFFFF` viền `#003875` | `#06132b` viền `#00f0ff` | Đồng bộ với ngôn ngữ giao diện Digital Twin |
| **Thẻ Nhãn Đồng hồ** | Nền trắng `#FFFFFF`, chữ `#003875` | Nền `#06132b`, viền `#00f0ff`, chữ `#00f0ff` | Đọc rõ ràng trong bóng tối |

---

## 3. Thư viện Bằng chứng Chụp màn hình Chế độ Neon

1. **Lưới Điện Neon (`B2-neon-electricity.png`):**
   - Xem tệp: [`B2-neon-electricity.png`](evidence/B2-neon-electricity.png)
   - Thể hiện 8 đồng hồ điện, trục vàng hổ phách phát quang nổi bật từ trạm nguồn đến các tủ phân phối bãi.
2. **Mạng Cấp Nước Neon (`B2-neon-water.png`):**
   - Xem tệp: [`B2-neon-water.png`](evidence/B2-neon-water.png)
   - Thể hiện 4 đồng hồ nước, trục xanh biển phát quang phân phối đến cầu cảng, trạm bơm PCCC và nhà kho CFS.
3. **Hiển thị Cả Hai Mạng Neon (`B2-neon-both.png`):**
   - Xem tệp: [`B2-neon-both.png`](evidence/B2-neon-both.png)
   - Sự hòa quyện hoàn hảo giữa hai dải màu Vàng Neon và Cyan Neon trên nền tối của Cảng Tân Thuận, với đúng 1 điểm giao cắt trực giao duy nhất tại $(740, 520)$.
