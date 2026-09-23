# 10. Phương án Bố cục Khuyến nghị Chính thức (Proposed Recommended Layout — Option B)

**Phương án đề xuất:** **Phương án B — Trục Xương sống Trung tâm (Central Backbone Routing)**  
**Trạng thái:** Đã kiểm thử, phê duyệt kỹ thuật và thiết lập làm cấu hình mặc định (`RECOMMENDED_LAYOUT_KEY = 'B'`).

---

## 1. Bản thiết kế Kiến trúc Phương án B (Architectural Blueprint)

Phương án B tổ chức mạng lưới kỹ thuật dựa trên hai trục xương sống song song chạy dọc theo dải kỹ thuật trung tâm của Cảng Tân Thuận:
- **Trục Điện (Electricity Backbone):** Chạy dọc tọa độ đứng $X = 750$.
- **Trục Nước (Water Backbone):** Chạy dọc tọa độ đứng $X = 790$.
- **Hành lang cách ly an toàn:** $40\text{ px}$ xuyên suốt từ Cổng Nam lên Cầu cảng Bắc.

```mermaid
graph TD
    subgraph SouthernIngress["1. Cụm Tiếp nhận Phía Nam (South Ingress)"]
        S1["SIM-EXT-GRID (750, 760)"] --> S2["SIM-SS-01 (750, 680)"]
        S2 --> S3["SIM-TR-01 (750, 625)"]
        S3 --> S4["SIM-MDB-01 (750, 570)"]
        W1["SIM-CITY-WATER (790, 760)"] --> W2["SIM-WIN-01 (790, 690)"]
        W2 --> W3["SIM-WJ-01 (790, 630)"]
    end

    subgraph CentralSpine["2. Trục Kỹ thuật Đôi & Phân nhánh Trực giao"]
        S4 -->|Phân nhánh Tây Y=570| W_YARD["SIM-FDR-WEST (460, 570) & SIM-YDB-W01 (140, 510)"]
        S4 -->|Phân nhánh Đông Y=480| E_YARD["SIM-FDR-CENTER (960, 480), SIM-YDB-C01 (1360, 420) & SIM-FDR-CFS (1160, 560)"]
        S4 -->|Trục vươn Bắc Y=360| N_QUAY["SIM-FDR-BERTH (540, 360)"]
        W3 -->|Nhánh PCCC Y=630| FP["SIM-FP-01 (760, 605)"]
        W3 -->|Trục cấp Cầu cảng Y=375| BERTH_W["SIM-WP-B01 (620, 375)"]
        W3 -->|Nhánh vòng Đông Y=520| CFS_W["SIM-WP-CFS-01 (1160, 620)"]
    end
```

---

## 2. Bằng chứng Trực quan Thực tế (Visual Evidence Screenshots)

Dưới đây là các ảnh chụp màn hình kiểm thử thực tế từ trình duyệt Chromium/Edge tại các độ phân giải và chế độ hiển thị:

### A. Chế độ Chuẩn Kỹ thuật (Technical Mode — Viewport 1366x768):

![B-electricity-1366](evidence/B-electricity-1366.png)
*Hình 1: Phương án B — Lưới điện mô phỏng (8 đồng hồ điện, trục vàng hổ phách X=750)*

![B-water-1366](evidence/B-water-1366.png)
*Hình 2: Phương án B — Mạng cấp nước mô phỏng (4 đồng hồ nước, trục xanh biển X=790)*

![B-both-1366](evidence/B-both-1366.png)
*Hình 3: Phương án B — Hiển thị đồng thời cả Điện và Nước (Phân tầng rõ ràng, 3 giao cắt trực giao)*

---

### B. Chế độ Neon Số (Neon Digital Twin Mode — Viewport 1920x1080):

![recommended-neon-electricity](evidence/recommended-neon-electricity.png)
*Hình 4: Phương án B — Lưới điện Neon Digital Twin với bộ lọc phát quang SVG (Glow Filter)*

![recommended-neon-water](evidence/recommended-neon-water.png)
*Hình 5: Phương án B — Mạng cấp nước Neon Digital Twin trên nền Dark Navy Cảng Sài Gòn*

---

## 3. Lý do Phương án B Đạt Điểm Tuyệt đối

1. **Hiệu suất Hình học Tối ưu:** Chiều dài ngắn nhất ($3,925\text{ px}$), ít góc gãy nhất (11 điểm), 0 giao cắt cùng loại, 0 va chạm kho hàng.
2. **Khả năng Nhận diện Tức thì:** Trục đứng phản ánh đúng luồng giao thông và hạ tầng chính của Cảng Tân Thuận.
3. **Sẵn sàng Hoàn hảo cho Phase 2:** Khi bắt đầu hiệu ứng kích hoạt dòng chảy (Propagation Wave), hiệu ứng sẽ chạy từ cổng theo trục đứng rồi tỏa ngang hai bên, tạo trải nghiệm thị giác vô cùng chuyên nghiệp và ấn tượng.
