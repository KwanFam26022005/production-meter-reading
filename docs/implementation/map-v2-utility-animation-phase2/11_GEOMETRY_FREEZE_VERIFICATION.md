# Báo cáo Thẩm tra Đóng Băng Hình học — Giai đoạn 2 (Geometry Freeze Verification)

> **Phân hệ**: Kiểm chứng Tính Toàn vẹn Hình học Baseline B2 (Geometric Invariant Audit)  
> **Tệp cấu hình**: `frontend/src/components/map-v2/utilityDemoLayout.ts`  
> **Mã băm chuẩn (Authoritative SHA-256 Hash)**: `7f3a8916b841e12525969128783eb835218bcdd07f645dc1ee4305bce5a5cc6a`

---

## 1. Kết quả Xác minh Mã băm SHA-256 (Hash Verification Result)

Trước khi tiến hành viết mã hoạt họa Phase 2 và sau khi hoàn tất toàn bộ logic tương tác, mã băm SHA-256 của khối cấu hình hình học Layout B2 (`LAYOUT_B2_COORDS` và `LAYOUT_B2.edges`) được tính toán độc lập bằng script `scripts/verify_b2_freeze_hash.mjs`:

```
================================================================================
BASELINE HASH (TRƯỚC TRIỂN KHAI):
7f3a8916b841e12525969128783eb835218bcdd07f645dc1ee4305bce5a5cc6a

CURRENT HASH (SAU TRIỂN KHAI HOÀN TẤT):
7f3a8916b841e12525969128783eb835218bcdd07f645dc1ee4305bce5a5cc6a

KẾT QUẢ SO SÁNH: KHỚP TUYỆT ĐỐI 100% (MATCH - ZERO DEVIATION)
================================================================================
```

Điều này khẳng định rằng **không có bất kỳ tọa độ hiển thị nào bị thay đổi** trong suốt quá trình triển khai Phase 2.

---

## 2. Kiểm toán Danh mục Tọa độ 17 Nút Kỹ thuật B2

Toàn bộ 17 nút đã được đối chiếu chi tiết:

| STT | Mã Nút (Node ID) | Hệ thống | Tọa độ chuẩn B2 $(X, Y)$ | Tọa độ hiện tại $(X, Y)$ | Sai lệch | Trạng thái |
| :---: | :--- | :---: | :---: | :---: | :---: | :---: |
| 1 | `SIM-EXT-GRID` | Điện | `(700, 755)` | `(700, 755)` | $0\text{ px}$ | Khớp 100% |
| 2 | `SIM-SS-01` | Điện | `(740, 680)` | `(740, 680)` | $0\text{ px}$ | Khớp 100% |
| 3 | `SIM-TR-01` | Điện | `(740, 625)` | `(740, 625)` | $0\text{ px}$ | Khớp 100% |
| 4 | `SIM-MDB-01` | Điện | `(740, 570)` | `(740, 570)` | $0\text{ px}$ | Khớp 100% |
| 5 | `SIM-FDR-TECH` | Điện | `(670, 570)` | `(670, 570)` | $0\text{ px}$ | Khớp 100% |
| 6 | `SIM-FDR-WEST` | Điện | `(470, 570)` | `(470, 570)` | $0\text{ px}$ | Khớp 100% |
| 7 | `SIM-YDB-W01` | Điện | `(140, 510)` | `(140, 510)` | $0\text{ px}$ | Khớp 100% |
| 8 | `SIM-FDR-BERTH`| Điện | `(520, 355)` | `(520, 355)` | $0\text{ px}$ | Khớp 100% |
| 9 | `SIM-FDR-CENTER`| Điện | `(990, 480)` | `(990, 480)` | $0\text{ px}$ | Khớp 100% |
| 10 | `SIM-YDB-C01` | Điện | `(1360, 410)` | `(1360, 410)` | $0\text{ px}$ | Khớp 100% |
| 11 | `SIM-FDR-CFS` | Điện | `(1160, 555)` | `(1160, 555)` | $0\text{ px}$ | Khớp 100% |
| 12 | `SIM-CITY-WATER`| Nước | `(815, 770)` | `(815, 770)` | $0\text{ px}$ | Khớp 100% |
| 13 | `SIM-WIN-01` | Nước | `(800, 690)` | `(800, 690)` | $0\text{ px}$ | Khớp 100% |
| 14 | `SIM-WJ-01` | Nước | `(800, 625)` | `(800, 625)` | $0\text{ px}$ | Khớp 100% |
| 15 | `SIM-FP-01` | Nước | `(840, 625)` | `(840, 625)` | $0\text{ px}$ | Khớp 100% |
| 16 | `SIM-WP-B01` | Nước | `(610, 375)` | `(610, 375)` | $0\text{ px}$ | Khớp 100% |
| 17 | `SIM-WP-CFS-01` | Nước | `(1160, 620)` | `(1160, 620)` | $0\text{ px}$ | Khớp 100% |

---

## 3. Kiểm toán 15 Tuyến Cáp / Tuyến Ống Kỹ thuật B2

- Toàn bộ 10 tuyến cáp điện (`E-B2-01` đến `E-B2-10`) và 5 tuyến ống nước (`W-B2-01` đến `W-B2-05`) bảo toàn nguyên vẹn tọa độ của từng điểm uốn (waypoints).
- Điểm giao cắt không gian duy nhất trên toàn bộ bản đồ tại tọa độ **`(740, 520)`** (nơi đường ống `W-B2-04` đi qua trục cáp $X=740$) được bảo vệ nghiêm ngặt và không bị dịch chuyển dù chỉ 1 pixel.
- Layout mặc định của hệ thống vẫn duy trì:
  ```typescript
  export const RECOMMENDED_LAYOUT_KEY: UtilityLayoutKey = 'B2';
  ```
