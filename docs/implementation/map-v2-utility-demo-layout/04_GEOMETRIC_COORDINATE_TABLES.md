# 04. Bảng Tọa độ Hình học Chi tiết (Geometric Coordinate Tables)

**Không gian Tọa độ Chuẩn:** Map V2 Canonical Space ($1536 \times 1024\text{ pixels}$)  
**Đơn vị tính:** Pixel nguyên (Integer pixels)  
**Quy tắc:** Tuyệt đối không nhầm lẫn với tọa độ chuẩn hóa $[0, 1]$ của Map V1 cũ.

---

## 1. Bảng Tọa độ 17 Nút Hiển thị (Display Nodes)

| ID Nút | Mã Đồng hồ | Tên Hiển thị | Vai trò | Phân khu V2 | PA A $(X, Y)$ | PA B $(X, Y)$ ★ | PA C $(X, Y)$ |
| :--- | :--- | :--- | :--- | :--- | :---: | :---: | :---: |
| **SIM-EXT-GRID** | — | Lưới 110kV EVN | Nguồn Điện | `ZONE_GENERAL` | $(740, 760)$ | **$(750, 760)$** | $(730, 760)$ |
| **SIM-SS-01** | — | Trạm biến áp SS-01 | Phân phối | `ZONE_GENERAL` | $(740, 680)$ | **$(750, 680)$** | $(730, 680)$ |
| **SIM-TR-01** | — | Máy biến áp TR-01 | Phân phối | `ZONE_GENERAL` | $(740, 625)$ | **$(750, 625)$** | $(730, 620)$ |
| **SIM-MDB-01** | SIM-EM-001 | Tủ tổng MDB-01 | Phân phối | `ZONE_GENERAL` | $(740, 575)$ | **$(750, 570)$** | $(730, 565)$ |
| **SIM-FDR-TECH** | SIM-EM-006 | Tủ Kỹ thuật FDR-TECH | Phân phối | `ZONE_GENERAL` | $(670, 575)$ | **$(680, 570)$** | $(670, 565)$ |
| **SIM-FDR-WEST** | SIM-EM-003 | Tủ Bãi Tây FDR-WEST | Phân phối | `ZONE_GENERAL` | $(480, 575)$ | **$(460, 570)$** | $(470, 565)$ |
| **SIM-YDB-W01** | SIM-EM-007 | Tủ nhánh Bãi Tây YDB-W01 | Nhánh | `ZONE_GENERAL` | $(140, 510)$ | **$(140, 510)$** | $(150, 515)$ |
| **SIM-FDR-BERTH**| SIM-EM-002 | Tủ Cầu cảng FDR-BERTH | Phân phối | `ZONE_QUAY` | $(520, 360)$ | **$(540, 360)$** | $(530, 350)$ |
| **SIM-FDR-CENTER**| SIM-EM-004 | Tủ Bãi Trung tâm FDR-CENTER| Phân phối | `ZONE_CONTAINER`| $(980, 485)$ | **$(960, 480)$** | $(970, 475)$ |
| **SIM-YDB-C01** | SIM-EM-008 | Tủ nhánh Bãi Container YDB-C01 | Nhánh | `ZONE_CONTAINER`| $(1360, 420)$| **$(1360, 420)$**| $(1350, 415)$|
| **SIM-FDR-CFS** | SIM-EM-005 | Tủ Kho CFS FDR-CFS | Phân phối | `ZONE_CONTAINER`| $(1160, 560)$| **$(1160, 560)$**| $(1150, 565)$|
| **SIM-CITY-WATER**| — | Nguồn nước Sawaco | Nguồn Nước | `ZONE_GENERAL` | $(790, 760)$ | **$(790, 760)$** | $(800, 760)$ |
| **SIM-WIN-01** | SIM-WM-001 | Đấu nối nước WIN-01 | Phân phối | `ZONE_GENERAL` | $(790, 690)$ | **$(790, 690)$** | $(800, 695)$ |
| **SIM-WJ-01** | — | Cụm van chia nước WJ-01 | Phân phối | `ZONE_GENERAL` | $(790, 620)$ | **$(790, 630)$** | $(800, 625)$ |
| **SIM-FP-01** | SIM-WM-004 | Trạm bơm PCCC FP-01 | Nhánh | `ZONE_GENERAL` | $(765, 600)$ | **$(760, 605)$** | $(770, 605)$ |
| **SIM-WP-B01** | SIM-WM-002 | Trụ nước Cầu tàu WP-B01 | Nhánh | `ZONE_QUAY` | $(600, 375)$ | **$(620, 375)$** | $(610, 370)$ |
| **SIM-WP-CFS-01**| SIM-WM-003 | Điểm nước Kho CFS | Nhánh | `ZONE_CONTAINER`| $(1160, 620)$| **$(1160, 620)$**| $(1150, 625)$|

---

## 2. Bảng Đường đi Hình học Tuyến (Display Edge Waypoints) — Phương án B (Khuyến nghị)

| Mã Tuyến | Nút Bắt đầu | Nút Đích | Loại Hạ tầng | Danh sách Tọa độ Điểm uốn (Ordered Waypoints) | Chiều dài |
| :--- | :--- | :--- | :--- | :--- | :---: |
| **E-01** | `SIM-EXT-GRID` | `SIM-SS-01` | ĐIỆN | $[[750, 760], [750, 680]]$ | $80\text{ px}$ |
| **E-02** | `SIM-SS-01` | `SIM-TR-01` | ĐIỆN | $[[750, 680], [750, 625]]$ | $55\text{ px}$ |
| **E-03** | `SIM-TR-01` | `SIM-MDB-01` | ĐIỆN | $[[750, 625], [750, 570]]$ | $55\text{ px}$ |
| **E-04** | `SIM-MDB-01` | `SIM-FDR-TECH` | ĐIỆN | $[[750, 570], [680, 570]]$ | $70\text{ px}$ |
| **E-05** | `SIM-MDB-01` | `SIM-FDR-WEST` | ĐIỆN | $[[750, 570], [460, 570]]$ | $290\text{ px}$ |
| **E-06** | `SIM-FDR-WEST` | `SIM-YDB-W01` | ĐIỆN | $[[460, 570], [140, 570], [140, 510]]$ | $380\text{ px}$ |
| **E-07** | `SIM-MDB-01` | `SIM-FDR-BERTH`| ĐIỆN | $[[750, 570], [750, 360], [540, 360]]$ | $420\text{ px}$ |
| **E-08** | `SIM-MDB-01` | `SIM-FDR-CENTER`| ĐIỆN | $[[750, 570], [750, 480], [960, 480]]$ | $300\text{ px}$ |
| **E-09** | `SIM-FDR-CENTER`| `SIM-YDB-C01` | ĐIỆN | $[[960, 480], [1360, 480], [1360, 420]]$ | $460\text{ px}$ |
| **E-10** | `SIM-FDR-CENTER`| `SIM-FDR-CFS` | ĐIỆN | $[[960, 480], [1160, 480], [1160, 560]]$ | $280\text{ px}$ |
| **W-01** | `SIM-CITY-WATER`| `SIM-WIN-01` | NƯỚC | $[[790, 760], [790, 690]]$ | $70\text{ px}$ |
| **W-02** | `SIM-WIN-01` | `SIM-WJ-01` | NƯỚC | $[[790, 690], [790, 630]]$ | $60\text{ px}$ |
| **W-03** | `SIM-WJ-01` | `SIM-FP-01` | NƯỚC | $[[790, 630], [760, 630], [760, 605]]$ | $55\text{ px}$ |
| **W-04** | `SIM-WJ-01` | `SIM-WP-B01` | NƯỚC | $[[790, 630], [790, 375], [620, 375]]$ | $425\text{ px}$ |
| **W-05** | `SIM-WJ-01` | `SIM-WP-CFS-01`| NƯỚC | $[[790, 630], [860, 630], [860, 520], [1160, 520], [1160, 620]]$ | $525\text{ px}$ |
