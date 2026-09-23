# HỢP ĐỒNG HÌNH HỌC ĐÓNG BĂNG — PHƯƠNG ÁN B2 (UTILITY LAYOUT B2 FROZEN CONTRACT)

**Dự án:** production-meter-reading — Cảng Sài Gòn (Cảng Tân Thuận)  
**Tài liệu:** Bản hợp đồng thông số hình học đóng băng chính thức (Frozen Geometry Contract)  
**Phiên bản:** v1.0-frozen (Sẵn sàng 100% cho Giai đoạn 2 Expand / Trace / Retract)  
**Ngày phê duyệt:** 22/09/2026  
**Cấu hình mã nguồn:** `RECOMMENDED_LAYOUT_KEY = 'B2'` trong [`utilityDemoLayout.ts`](file:///D:/Projects/production-meter-reading/production-meter-reading/frontend/src/components/map-v2/utilityDemoLayout.ts)

---

## 1. Tọa độ Nút Đóng băng (Frozen Node Coordinates — 17 Nodes)

Tất cả các tọa độ dưới đây được xác định trên hệ quy chiếu chuẩn $1536 \times 1024\text{ px}$ của Bản đồ V2:

### A. Mạng Lưới Điện Mô phỏng (11 Nodes — 8 Active Demo Meters):
| Node ID | Vai trò (Role) | Mã Đồng hồ Ngậm | Tọa độ Đóng băng $[X, Y]$ | Phân khu Bản đồ V2 | Chức năng Kỹ thuật Thực tế |
| :--- | :--- | :--- | :---: | :--- | :--- |
| `SIM-EXT-GRID` | `SOURCE` | *(Nguồn cấp)* | **$[700, 755]$** | `ZONE_ADMIN` lân cận | Điểm tiếp nhận nguồn điện lưới trung thế ngoài cảng |
| `SIM-SS-01` | `DISTRIBUTION` | *(Trạm thuần)* | **$[740, 680]$** | `ZONE_ADMIN` / Dải kỹ thuật | Trạm biến áp hạ thế trung tâm số 1 |
| `SIM-TR-01` | `DISTRIBUTION` | *(Máy biến áp)* | **$[740, 625]$** | `ZONE_ADMIN` / Dải kỹ thuật | Máy biến áp phân phối phụ tải |
| `SIM-MDB-01` | `DISTRIBUTION` | **`SIM-EM-001`** | **$[740, 570]$** | `ZONE_BAI_TONG_HOP` | Tủ phân phối điện chính toàn cảng (Master Switchboard) |
| `SIM-FDR-TECH` | `BRANCH` | **`SIM-EM-005`** | **$[670, 570]$** | `ZONE_BAI_TONG_HOP` | Tủ phân phối nhánh xưởng kỹ thuật sửa chữa cơ giới |
| `SIM-FDR-WEST` | `BRANCH` | **`SIM-EM-002`** | **$[470, 570]$** | Giữa Kho 1 & Kho 2 | Tủ phân phối nhánh Bãi phía Tây |
| `SIM-YDB-W01` | `METER` | **`SIM-EM-006`** | **$[140, 510]$** | Cụm Bãi Tây ngoài cùng | Hộp cấp nguồn cần trục RTG bãi Tây |
| `SIM-FDR-BERTH` | `BRANCH` | **`SIM-EM-004`** | **$[520, 355]$** | `ZONE_CAU_CANG` | Tủ phân phối bến sà lan và cẩu bờ cầu cảng |
| `SIM-FDR-CENTER`| `BRANCH` | **`SIM-EM-003`** | **$[990, 480]$** | `ZONE_BAI_CONTAINER` | Tủ phân phối trung tâm bãi container xuất nhập |
| `SIM-YDB-C01` | `METER` | **`SIM-EM-007`** | **$[1360, 410]$** | Cụm Bãi Đông Container | Trạm cấp điện container lạnh (Reefer Rack Station) |
| `SIM-FDR-CFS` | `BRANCH` | **`SIM-EM-008`** | **$[1160, 555]$** | `BLDG_KHO_4` lân cận | Tủ phân phối kho đóng rút hàng CFS và bãi đệm |

### B. Mạng Cấp Nước Mô phỏng (6 Nodes — 4 Active Demo Meters):
| Node ID | Vai trò (Role) | Mã Đồng hồ Ngậm | Tọa độ Đóng băng $[X, Y]$ | Phân khu Bản đồ V2 | Chức năng Kỹ thuật Thực tế |
| :--- | :--- | :--- | :---: | :--- | :--- |
| `SIM-CITY-WATER`| `SOURCE` | *(Nguồn cấp)* | **$[815, 770]$** | `ZONE_ADMIN` lân cận | Điểm tiếp nhận tuyến ống nước sạch thành phố |
| `SIM-WIN-01` | `DISTRIBUTION` | **`SIM-WM-001`** | **$[800, 690]$** | `ZONE_ADMIN` / Dải kỹ thuật | Cụm đồng hồ tổng và van giảm áp đầu nguồn |
| `SIM-WJ-01` | `DISTRIBUTION` | *(Hố van thuần)* | **$[800, 625]$** | `ZONE_ADMIN` / Dải kỹ thuật | Hố van phân phối ngã ba trung tâm mạng nước |
| `SIM-FP-01` | `METER` | **`SIM-WM-004`** | **$[840, 625]$** | Phía Đông trục nước | Trạm bơm và bể chứa cấp nước PCCC cảng |
| `SIM-WP-B01` | `METER` | **`SIM-WM-002`** | **$[610, 375]$** | `ZONE_CAU_CANG` | Trụ cấp nước sinh hoạt cho tàu biển và sà lan |
| `SIM-WP-CFS-01` | `METER` | **`SIM-WM-003`** | **$[1160, 620]$** | `BLDG_KHO_4` lân cận | Họng nước cấp sinh hoạt kho CFS và khu rửa xe |

---

## 2. Chuỗi Tọa độ Tuyến Dẫn Đóng băng (Frozen Route Waypoints — 15 Edges)

### A. Mạng Lưới Điện (10 Tuyến):
| Mã Tuyến (Edge ID) | Nút Đầu $\to$ Nút Cuối | Cấp bậc (Tier) | Danh sách Điểm chuyển hướng (Ordered Waypoints) | Chiều dài |
| :--- | :--- | :---: | :--- | :---: |
| `E-B2-01` | `SIM-EXT-GRID` $\to$ `SIM-SS-01` | **TRUNK** | `[[700, 755], [740, 755], [740, 680]]` | $115\text{ px}$ |
| `E-B2-02` | `SIM-SS-01` $\to$ `SIM-TR-01` | **TRUNK** | `[[740, 680], [740, 625]]` | $55\text{ px}$ |
| `E-B2-03` | `SIM-TR-01` $\to$ `SIM-MDB-01` | **TRUNK** | `[[740, 625], [740, 570]]` | $55\text{ px}$ |
| `E-B2-04` | `SIM-MDB-01` $\to$ `SIM-FDR-TECH` | **BRANCH** | `[[740, 570], [670, 570]]` | $70\text{ px}$ |
| `E-B2-05` | `SIM-MDB-01` $\to$ `SIM-FDR-WEST` | **BRANCH** | `[[740, 570], [470, 570]]` | $270\text{ px}$ |
| `E-B2-06` | `SIM-FDR-WEST` $\to$ `SIM-YDB-W01` | **SPUR** | `[[470, 570], [140, 570], [140, 510]]` | $390\text{ px}$ |
| `E-B2-07` | `SIM-MDB-01` $\to$ `SIM-FDR-BERTH` | **BRANCH** | `[[740, 570], [740, 355], [520, 355]]` | $435\text{ px}$ |
| `E-B2-08` | `SIM-MDB-01` $\to$ `SIM-FDR-CENTER`| **BRANCH** | `[[740, 570], [740, 480], [990, 480]]` | $340\text{ px}$ |
| `E-B2-09` | `SIM-FDR-CENTER`$\to$ `SIM-YDB-C01` | **SPUR** | `[[990, 480], [1360, 480], [1360, 410]]` | $440\text{ px}$ |
| `E-B2-10` | `SIM-MDB-01` $\to$ `SIM-FDR-CFS` | **BRANCH** | `[[740, 570], [740, 480], [1160, 480], [1160, 555]]` | $585\text{ px}$ |
| **Tổng Chiều dài Mạng Điện:** | | | | **$2,755\text{ px}$** |

### B. Mạng Cấp Nước (5 Tuyến):
| Mã Tuyến (Edge ID) | Nút Đầu $\to$ Nút Cuối | Cấp bậc (Tier) | Danh sách Điểm chuyển hướng (Ordered Waypoints) | Chiều dài |
| :--- | :--- | :---: | :--- | :---: |
| `W-B2-01` | `SIM-CITY-WATER` $\to$ `SIM-WIN-01` | **TRUNK** | `[[815, 770], [800, 770], [800, 690]]` | $95\text{ px}$ |
| `W-B2-02` | `SIM-WIN-01` $\to$ `SIM-WJ-01` | **TRUNK** | `[[800, 690], [800, 625]]` | $65\text{ px}$ |
| `W-B2-03` | `SIM-WJ-01` $\to$ `SIM-FP-01` | **BRANCH** | `[[800, 625], [840, 625]]` | $40\text{ px}$ |
| `W-B2-04` | `SIM-WJ-01` $\to$ `SIM-WP-B01` | **BRANCH** | `[[800, 625], [800, 520], [705, 520], [705, 375], [610, 375]]` | $540\text{ px}$ |
| `W-B2-05` | `SIM-WJ-01` $\to$ `SIM-WP-CFS-01` | **BRANCH** | `[[800, 625], [860, 625], [860, 520], [1160, 520], [1160, 620]]` | $465\text{ px}$ |
| **Tổng Chiều dài Mạng Nước:** | | | | **$1,205\text{ px}$** |

---

## 3. Tọa độ Điểm Giao cắt Đóng băng Duy nhất (Single Frozen Crossing Point)

- **Tọa độ Không gian:** **$(X = 740, Y = 520)$**
- **Đường Nước Đi Dưới:** Đoạn ngang của tuyến `W-B2-04` từ $[800, 520]$ đến $[705, 520]$.
- **Đường Dây Điện Đi Phía Trên:** Đoạn đứng của trục điện xương sống $X = 740$ từ `SIM-MDB-01` $[740, 570]$ đi lên phía Bắc.
- **Góc Trực giao:** Đúng **$90^\circ$**.
- **Quy tắc Z-Ordering cho Hoạt họa Giai đoạn 2:** Lớp hoạt họa Điện vẽ sau (đè lên trên) lớp hoạt họa Nước.
