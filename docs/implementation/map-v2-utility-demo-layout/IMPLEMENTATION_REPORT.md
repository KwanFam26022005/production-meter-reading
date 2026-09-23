# Báo cáo Triển khai Kỹ thuật Chi tiết (Implementation Report)

**Dự án:** Hệ thống Quản lý Chỉ số Đồng hồ & Hạ tầng Cảng Sài Gòn — Cảng Tân Thuận  
**Giai đoạn:** Phase 1 — Map V2 Utility Demo Layout Design  
**Thời gian hoàn thành:** 22/09/2026  
**Trạng thái Triển khai:** Hoàn tất $100\%$ — Sẵn sàng Vận hành Demo & Chuẩn bị Phase 2

---

## 1. Tóm tắt Các Tệp Mã Nguồn Đã Tạo & Chỉnh sửa

| Tệp Mã Nguồn | Loại Hành động | Nội dung Thực hiện |
| :--- | :---: | :--- |
| `frontend/src/components/map-v2/utilityDemoLayout.ts` | **Tạo mới** | Định nghĩa mô hình dữ liệu đồ thị, tọa độ 17 nút và 15 cạnh cho 3 phương án A, B, C; tính toán độ sâu `depth` và xuất hàm factory `getUtilityLayout()`. |
| `frontend/src/components/map-v2/MapV2UtilityLayer.tsx` | **Tạo mới** | Component SVG chuyên trách vẽ mạng lưới: đường viền đệm chống chìm nét, bộ lọc phát quang SVG Glow Filter, huy hiệu biểu tượng đồng hồ Hero, và tooltip danh tính. |
| `frontend/src/components/map-v2/MapV2Canvas.tsx` | **Chỉnh sửa** | Tích hợp lớp `MapV2UtilityLayer` vào cây phần tử SVG sau các lớp đường ranh và trước các lớp cổng/hotspot; tiếp nhận props `utilityMode` và `utilityLayoutKey`. |
| `frontend/src/components/map-v2/MapV2Workspace.tsx` | **Chỉnh sửa** | Bổ sung state `utilityMode` và `utilityLayout`, khởi tạo từ URL query; tích hợp cụm công tắc chuyển đổi `[Tắt lưới | Điện | Nước | Cả hai]` và chọn phương án `[PA A | PA B ★ | PA C]`; gắn huy hiệu cảnh báo mô phỏng. |
| `frontend/src/components/map-v2/MapV2Workspace.css` | **Chỉnh sửa** | Bổ sung các lớp CSS phong cách hàng hải cho nút bấm trạng thái Điện/Nước và huy hiệu cảnh báo `utility-disclosure-pill`. |
| `frontend/tests/mapV2UtilityDemoLayout.test.ts` | **Tạo mới** | 4 bộ kiểm thử tự động kiểm tra tính bất biến của dữ liệu demo, đồ thị logic, giới hạn tọa độ $1536 \times 1024$ và thuật toán né kho hàng. |
| `scripts/capture_map_v2_utility_layout.mjs` | **Tạo mới** | Kịch bản tự động hóa Playwright điều khiển trình duyệt Edge chụp đầy đủ 18 ảnh bằng chứng thị giác tại các độ phân giải $1280 \times 800$, $1366 \times 768$, và $1920 \times 1080$. |

---

## 2. Kết quả Kiểm thử Tự động (Automated Verification)

```
Running test suite: npx tsx --test tests/mapV2UtilityDemoLayout.test.ts
✔ Suite 1: Active Demo Meters strictly match audited tan-thuan-demo-v1 dataset (12.98ms)
✔ Suite 2: Graph connectivity is preserved identically across Layouts A, B, and C (0.67ms)
✔ Suite 3: All coordinates within 1536x1024 and avoid buildings/hotspots/gates in Layout B (2.15ms)
✔ Suite 4: Factory method getUtilityLayout defaults to recommended Layout B (0.36ms)
Result: 4 passed, 0 failed.

Running full suite: npm run test
Result: 382 passed, 0 failed, duration: 5.50s.
```

---

## 3. Danh mục 18 Ảnh Bằng chứng Thị giác Đã Thu thập (Visual Evidence Inventory)

Toàn bộ ảnh chụp thực tế được lưu trữ tại `docs/implementation/map-v2-utility-demo-layout/evidence/`:

1. `utility-off-map-v2.png` — Bản đồ đối chứng khi tắt mạng lưới (1256.1 KB)
2. `A-electricity-1366.png` — Phương án A: Lưới điện (1258.1 KB)
3. `A-water-1366.png` — Phương án A: Mạng nước (1257.6 KB)
4. `A-both-1366.png` — Phương án A: Cả hai mạng (1259.0 KB)
5. `B-electricity-1366.png` — Phương án B: Lưới điện (1258.0 KB)
6. `B-water-1366.png` — Phương án B: Mạng nước (1257.8 KB)
7. `B-both-1366.png` — Phương án B: Cả hai mạng (1258.8 KB)
8. `C-electricity-1366.png` — Phương án C: Lưới điện (1259.8 KB)
9. `C-water-1366.png` — Phương án C: Mạng nước (1257.5 KB)
10. `C-both-1366.png` — Phương án C: Cả hai mạng (1260.5 KB)
11. `recommended-electricity-1280.png` — Khuyến nghị B: Điện 1280x800 (1212.1 KB)
12. `recommended-water-1280.png` — Khuyến nghị B: Nước 1280x800 (1212.1 KB)
13. `recommended-both-1280.png` — Khuyến nghị B: Cả hai 1280x800 (1211.9 KB)
14. `recommended-electricity-1920.png` — Khuyến nghị B: Điện 1920x1080 (2125.5 KB)
15. `recommended-water-1920.png` — Khuyến nghị B: Nước 1920x1080 (2126.7 KB)
16. `recommended-both-1920.png` — Khuyến nghị B: Cả hai 1920x1080 (2125.1 KB)
17. `recommended-neon-electricity.png` — Khuyến nghị B: Neon Điện 1920x1080 (1674.4 KB)
18. `recommended-neon-water.png` — Khuyến nghị B: Neon Nước 1920x1080 (1677.5 KB)

---

## 4. Kiểm toán Đóng gói & Cách ly Bundle (Bundle Separation)

- Chạy `npm run build:operations`: Thành công trong $4.18\text{s}$, không phát sinh lỗi biên dịch TypeScript.
- Kiểm tra tính cách ly: Bundle của User Portal hoàn toàn không bị nhiễm bất kỳ thành phần nào của Bản đồ V2 hay các công cụ quản trị Admin.
