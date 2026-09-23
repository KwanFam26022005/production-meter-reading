# Bộ Lập Lịch Mở Rộng Theo Đồ Thị — Giai đoạn 2 (Expand Scheduler Specification)

> **Phân hệ**: Giải thuật Lập lịch Hoạt họa Mở rộng Tiến (Forward Scheduling Engine)  
> **Tệp mã nguồn**: `frontend/src/components/map-v2/utilityNetworkGraph.ts` (`buildExpandSchedule()`)  
> **Kỹ thuật hiển thị**: SVG `stroke-dashoffset` theo chiều dài Euclidean thực tế

---

## 1. Nguyên lý Lập lịch Hoạt họa Tiến (Forward Scheduling Principle)

Bộ lập lịch mở rộng (`buildExpandSchedule`) duyệt đồ thị phân cấp từ nút nguồn gốc (Depth 0) lan tỏa dần tới các lá (Depth 5 đối với Điện, Depth 3 đối với Nước).

1. **Thời điểm bắt đầu của cạnh ($t_{start}$)**:
   - Đối với cạnh xuất phát từ nguồn: $t_{start} = 0\text{ ms}$.
   - Đối với các cạnh tiếp theo: $t_{start}$ bằng đúng thời điểm kết thúc ($t_{end}$) của cạnh cấp nguồn trực tiếp dẫn tới nút cha của nó.
2. **Thời gian vẽ của cạnh ($d$)**:
   - Được tính toán dựa trên chiều dài Euclidean thực tế của tuyến (tổng khoảng cách giữa các đỉnh polyline) kết hợp với phân hạng tuyến (`TRUNK`, `BRANCH`, `SPUR`):
     - Tuyến Trục (`TRUNK`): $220\text{ ms} - 350\text{ ms}$
     - Tuyến Nhánh (`BRANCH`): $240\text{ ms} - 380\text{ ms}$
     - Tuyến Nhánh phụ (`SPUR`): $250\text{ ms} - 380\text{ ms}$
3. **Thời điểm hiển thị của nút ($t_{reveal}$)**:
   - Nút con $v$ chỉ xuất hiện trên bản đồ khi cạnh cấp nguồn $E_{uv}$ đạt $t_{end} = t_{start} + d$.
4. **Bảo toàn Đồng bộ Tuyến Nhánh Cùng Cấp (Sibling Branch Concurrency)**:
   - Khi tủ tổng `SIM-MDB-01` xuất hiện tại $740\text{ ms}$, toàn bộ các nhánh con (`E-B2-04`, `E-B2-05`, `E-B2-07`, `E-B2-08`, `E-B2-10`) đều bắt đầu vẽ đồng thời tại đúng mốc $740\text{ ms}$.

---

## 2. Bảng Thời gian Lập lịch Mở rộng Mạng Điện (Electricity Timeline)

Tổng thời gian chu trình mở rộng Điện: **$1465\text{ ms}$** (Nằm hoàn hảo trong ngưỡng yêu cầu $1.2\text{s} - 2.0\text{s}$).

| Cạnh ID | Tuyến kết nối | Phân hạng | Chiều dài (px) | Thời gian vẽ (ms) | Bắt đầu ($t_{start}$) | Hoàn tất ($t_{end}$) | Nút đích hiển thị |
| :--- | :--- | :--- | :---: | :---: | :---: | :---: | :--- |
| `E-B2-01` | `SIM-EXT-GRID` $\to$ `SIM-SS-01` | TRUNK | 115.0 px | 260 ms | **0 ms** | **260 ms** | `SIM-SS-01` (260ms) |
| `E-B2-02` | `SIM-SS-01` $\to$ `SIM-TR-01` | TRUNK | 55.0 px | 230 ms | **260 ms** | **490 ms** | `SIM-TR-01` (490ms) |
| `E-B2-03` | `SIM-TR-01` $\to$ `SIM-MDB-01` | TRUNK | 55.0 px | 250 ms | **490 ms** | **740 ms** | `SIM-MDB-01` (740ms) |
| `E-B2-04` | `SIM-MDB-01` $\to$ `SIM-FDR-TECH` | BRANCH | 70.0 px | 255 ms | **740 ms** | **995 ms** | `SIM-FDR-TECH` (995ms) |
| `E-B2-05` | `SIM-MDB-01` $\to$ `SIM-FDR-WEST` | BRANCH | 270.0 px | 345 ms | **740 ms** | **1085 ms** | `SIM-FDR-WEST` (1085ms) |
| `E-B2-07` | `SIM-MDB-01` $\to$ `SIM-FDR-BERTH` | BRANCH | 435.0 px | 380 ms | **740 ms** | **1120 ms** | `SIM-FDR-BERTH` (1120ms)|
| `E-B2-08` | `SIM-MDB-01` $\to$ `SIM-FDR-CENTER`| BRANCH | 340.0 px | 365 ms | **740 ms** | **1105 ms** | `SIM-FDR-CENTER` (1105ms)|
| `E-B2-10` | `SIM-MDB-01` $\to$ `SIM-FDR-CFS` | BRANCH | 585.0 px | 380 ms | **740 ms** | **1120 ms** | `SIM-FDR-CFS` (1120ms) |
| `E-B2-06` | `SIM-FDR-WEST` $\to$ `SIM-YDB-W01` | SPUR | 390.0 px | 380 ms | **1085 ms** | **1465 ms** | `SIM-YDB-W01` (1465ms) |
| `E-B2-09` | `SIM-FDR-CENTER` $\to$ `SIM-YDB-C01`| SPUR | 440.0 px | 360 ms | **1105 ms** | **1465 ms** | `SIM-YDB-C01` (1465ms) |

---

## 3. Bảng Thời gian Lập lịch Mở rộng Mạng Nước (Water Timeline)

Tổng thời gian chu trình mở rộng Nước: **$884\text{ ms}$**.

| Cạnh ID | Tuyến kết nối | Phân hạng | Chiều dài (px) | Thời gian vẽ (ms) | Bắt đầu ($t_{start}$) | Hoàn tất ($t_{end}$) | Nút đích hiển thị |
| :--- | :--- | :--- | :---: | :---: | :---: | :---: | :--- |
| `W-B2-01` | `SIM-CITY-WATER` $\to$ `SIM-WIN-01` | TRUNK | 95.0 px | 240 ms | **0 ms** | **240 ms** | `SIM-WIN-01` (240ms) |
| `W-B2-02` | `SIM-WIN-01` $\to$ `SIM-WJ-01` | TRUNK | 65.0 px | 260 ms | **240 ms** | **500 ms** | `SIM-WJ-01` (500ms) |
| `W-B2-03` | `SIM-WJ-01` $\to$ `SIM-FP-01` | BRANCH | 40.0 px | 250 ms | **500 ms** | **750 ms** | `SIM-FP-01` (750ms) |
| `W-B2-04` | `SIM-WJ-01` $\to$ `SIM-WP-B01` | BRANCH | 440.0 px | 384 ms | **500 ms** | **884 ms** | `SIM-WP-B01` (884ms) |
| `W-B2-05` | `SIM-WJ-01` $\to$ `SIM-WP-CFS-01` | BRANCH | 520.0 px | 380 ms | **500 ms** | **880 ms** | `SIM-WP-CFS-01` (880ms)|

---

## 4. Công thức Hoạt họa `stroke-dashoffset`

Với mỗi cạnh có tổng chiều dài Euclidean $L$:
$$\text{strokeDasharray} = [L, L]$$
$$\text{strokeDashoffset}(t) = L \cdot (1 - \text{progress}(t))$$
Trong đó:
$$\text{progress}(t) = \text{clamp}\left(\frac{t - t_{start}}{d}, 0, 1\right)$$

Khi $t \le t_{start}$, $\text{offset} = L$ (toàn bộ nét bị ẩn).  
Khi $t \ge t_{end}$, $\text{offset} = 0$ (toàn bộ nét hiển thị trọn vẹn).  
Khi $t_{start} < t < t_{end}$, nét vẽ xuất hiện chuyển động mượt mà từ đầu nguồn hướng tới đích theo đúng đường đi thực địa.
