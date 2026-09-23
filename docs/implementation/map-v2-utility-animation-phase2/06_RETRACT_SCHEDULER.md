# Bộ Lập Lịch Thu Hồi Theo Đồ Thị — Giai đoạn 2 (Retract Scheduler Specification)

> **Phân hệ**: Giải thuật Lập lịch Thu hồi Nghịch Đồ thị (Reverse Depth Scheduler)  
> **Tệp mã nguồn**: `frontend/src/components/map-v2/utilityNetworkGraph.ts` (`buildRetractSchedule()`)  
> **Hành vi**: Rút lui tuần tự từ đầu mút đo đếm về nút nguồn trung tâm

---

## 1. Nguyên lý Lập lịch Thu hồi Nghịch (Reverse Scheduling Principle)

Quá trình thu hồi mạng lưới (`buildRetractSchedule`) thực hiện thu gọn theo chiều nghịch hoàn toàn so với quá trình mở rộng:

1. **Thứ tự ưu tiên theo độ sâu (Descending Depth Order)**:
   - Các nhánh phụ và đồng hồ mút (Depth 5) bắt đầu rút lui trước tiên.
   - Khi các nhánh phụ rút xong, các nút phân phối nhánh (Depth 4) biến mất và các tuyến nhánh (Depth 4) bắt đầu rút về nút cha.
   - Tiếp tục thu hồi tuyến trung gian (Depth 3, 2, 1).
   - Cuối cùng, tuyến cấp nguồn từ nút nguồn (Depth 1) thu hồi về nút nguồn gốc (Depth 0).
2. **Bảo tồn Nút Nguồn Gốc (Root Source Preservation)**:
   - Nút nguồn gốc (`SIM-EXT-GRID` và `SIM-CITY-WATER`) **không bao giờ biến mất**; nó được giữ lại trên bản đồ để đóng vai trò điểm neo tương tác ban đầu (`collapsed`).
3. **Thời gian thu hồi ngắn gọn hơn mở rộng**:
   - Nhằm tạo cảm giác dứt khoát và đáp ứng thao tác nhanh của nhân viên điều hành, tổng thời gian thu hồi được tối ưu ngắn hơn chu trình mở rộng khoảng 30%:
     - Thu hồi Điện: **$1020\text{ ms}$** (so với mở rộng 1465ms).
     - Thu hồi Nước: **$620\text{ ms}$** (so với mở rộng 884ms).

---

## 2. Bảng Thời gian Lập lịch Thu hồi Mạng Điện (Electricity Retract Timeline)

Tổng thời gian: **$1020\text{ ms}$**.

| Giai đoạn | Cạnh / Nút xử lý | Độ sâu | Thời điểm bắt đầu ($t_{start}$) | Hoàn tất ($t_{end}$) | Hành vi đồ họa |
| :--- | :--- | :---: | :---: | :---: | :--- |
| **Giai đoạn 1** | `SIM-YDB-W01`, `SIM-YDB-C01` | 5 | **0 ms** | **0 ms** | Nút đầu mút biến mất tức thì khi bắt đầu thu hồi |
| | `E-B2-06`, `E-B2-09` | 5 | **0 ms** | **250 ms** | Cáp nhánh phụ rút từ bãi container về tủ phân phối |
| **Giai đoạn 2** | `SIM-FDR-WEST`, `SIM-FDR-CENTER` | 4 | **250 ms** | **250 ms** | Nút tủ phân phối bãi biến mất |
| | `SIM-FDR-BERTH`, `SIM-FDR-CFS`, `SIM-FDR-TECH` | 4 | **250 ms** | **250 ms** | Các nút nhánh cấp 4 biến mất |
| | `E-B2-04`, `E-B2-05`, `E-B2-07`, `E-B2-08`, `E-B2-10` | 4 | **250 ms** | **520 ms** | 5 tuyến nhánh đồng loạt rút về tủ tổng `SIM-MDB-01` |
| **Giai đoạn 3** | `SIM-MDB-01` | 3 | **520 ms** | **520 ms** | Tủ tổng `SIM-MDB-01` biến mất |
| | `E-B2-03` | 3 | **520 ms** | **700 ms** | Trục chính rút từ `SIM-MDB-01` về máy biến áp |
| **Giai đoạn 4** | `SIM-TR-01` | 2 | **700 ms** | **700 ms** | Máy biến áp biến mất |
| | `E-B2-02` | 2 | **700 ms** | **860 ms** | Đoạn cáp rút từ máy biến áp về trạm SS-01 |
| **Giai đoạn 5** | `SIM-SS-01` | 1 | **860 ms** | **860 ms** | Trạm SS-01 biến mất |
| | `E-B2-01` | 1 | **860 ms** | **1020 ms** | Tuyến cáp nguồn 110kV rút về nút nguồn EVN |
| **Kết thúc** | `SIM-EXT-GRID` | 0 | **1020 ms** | — | **Nút nguồn giữ nguyên, chuyển về `collapsed`** |

---

## 3. Bảng Thời gian Lập lịch Thu hồi Mạng Nước (Water Retract Timeline)

Tổng thời gian: **$620\text{ ms}$**.

| Giai đoạn | Cạnh / Nút xử lý | Độ sâu | Thời điểm bắt đầu ($t_{start}$) | Hoàn tất ($t_{end}$) | Hành vi đồ họa |
| :--- | :--- | :---: | :---: | :---: | :--- |
| **Giai đoạn 1** | `SIM-FP-01`, `SIM-WP-B01`, `SIM-WP-CFS-01` | 3 | **0 ms** | **0 ms** | Các điểm dùng nước đầu mút biến mất tức thì |
| | `W-B2-03`, `W-B2-04`, `W-B2-05` | 3 | **0 ms** | **250 ms** | 3 tuyến ống phân nhánh đồng loạt rút về van chia |
| **Giai đoạn 2** | `SIM-WJ-01` | 2 | **250 ms** | **250 ms** | Cụm van chia nước `SIM-WJ-01` biến mất |
| | `W-B2-02` | 2 | **250 ms** | **440 ms** | Tuyến ống chính rút từ van về điểm đấu nối |
| **Giai đoạn 3** | `SIM-WIN-01` | 1 | **440 ms** | **440 ms** | Điểm đấu nối `SIM-WIN-01` biến mất |
| | `W-B2-01` | 1 | **440 ms** | **620 ms** | Tuyến cấp nước chính rút về nguồn thành phố |
| **Kết thúc** | `SIM-CITY-WATER` | 0 | **620 ms** | — | **Nút nguồn giữ nguyên, chuyển về `collapsed`** |
