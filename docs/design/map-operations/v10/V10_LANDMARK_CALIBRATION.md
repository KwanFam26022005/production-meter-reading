# V10 Landmark Calibration Guide — Cảng Tân Thuận
## Mô hình Hiệu chỉnh Địa danh & Công cụ Tác quyền Hình học

Phiên bản: `tan-thuan-v10`  
Mã nguồn runtime: `frontend/src/features/map-operations/geometry/canonicalLandmarks.ts`  
Tệp cấu hình chuẩn: `frontend/src/features/map-operations/geometry/tanThuanPresentationGeometry.v10.json`

---

### 1. Mô hình Địa danh Vật lý (Physical Landmark Model)

Để ranh giới không bị ước lệ hoặc méo mó qua các phiên bản, V10 định nghĩa danh mục các **Điểm chuẩn Địa danh Cảng** (`CalibrationLandmark`) dựa trên ảnh không gian chuẩn $1915 \times 821$:

```typescript
export type CalibrationLandmarkCategory =
  | 'quay-edge'          // Mép nước cầu tàu, bến bãi
  | 'service-road'       // Tuyến đường công vụ sau cầu cảng
  | 'internal-road'      // Tuyến đường phân luồng nội bộ giữa các bãi
  | 'perimeter-road'     // Tuyến đường vành đai bao quanh cảng
  | 'fence'              // Hàng rào chu vi cảng
  | 'warehouse-edge'     // Mép góc cụm kho bãi CFS
  | 'yard-edge'          // Góc ranh giới bãi container
  | 'gate'               // Cổng kiểm soát ra vào
  | 'security'           // Chốt bảo vệ an ninh
  | 'weigh-station'      // Trạm cân xe
  | 'intersection'       // Nút giao cắt đường nội bộ
  | 'other';

export interface CalibrationLandmark {
  id: string;
  zoneId: string;
  label: string;
  category: CalibrationLandmarkCategory;
  canonical: {
    x: number; // Tọa độ pixel trên ảnh gốc [0, 1915]
    y: number; // Tọa độ pixel trên ảnh gốc [0, 821]
  };
}
```

### 2. Danh mục Địa danh Chuẩn V10

Tệp dữ liệu `tanThuanPresentationGeometry.v10.json` lưu trữ trực tiếp các điểm mốc cơ sở:
1. `berth-west-start` (72, 338): Mép nước bến 1 phía Tây.
2. `quay-west-bend` (386, 272): Điểm gãy khúc bến số 3.
3. `quay-central-break` (842, 272): Điểm tiếp nối giữa bến 3 và bến 4.
4. `east-crane-transition` (1485, 204): Điểm kết thúc ray cẩu giàn phía Đông.
5. `berth-east-end` (1596, 280): Điểm cuối bến quayside Tân Thuận.
6. `west-yard-nw-corner` (386, 362): Góc Tây Bắc bãi container số 1.
7. `center-divide-road-north` (844, 360): Ngã ba đường phân cách trung tâm.
8. `main-east-west-axis-mid` (1482, 552): Giao lộ trục chính Đông-Tây cảng.
9. `tech-zone-nw` (832, 574): Góc Tây Bắc trạm biến áp & nhà xưởng kỹ thuật.
10. `gate-south-exit` (1876, 755): Trạm barrier xuất cảng Tân Thuận.

Mỗi đỉnh polygon của 6 phân khu trình diễn có thể gán `landmarkId` tương ứng để đảm bảo khi một điểm mốc dịch chuyển, ranh giới gắn kết sẽ được căn chỉnh đồng bộ.

---

### 3. Bộ công cụ Hiệu chỉnh Tương tác (Interactive Calibration Tooling)

Trong môi trường DEV, công cụ hiệu chỉnh được kích hoạt thông qua tham số URL:
```
http://localhost:5173/?mapCalibration=1
```
Hoặc thiết lập cờ `sessionStorage.setItem('mapCalibration', '1')`.

#### Các tính năng chính của Bộ công cụ:
1. **Chuyển đổi 2 Tab Tác quyền**:
   - **Đỉnh Polygon (Vertices)**: Kéo thả các đỉnh polygon theo thời gian thực; Click vào mép cạnh để chèn thêm đỉnh mới; Nhấn `Delete` hoặc `Alt + Click` để xóa đỉnh thừa.
   - **Địa danh Vật lý (Landmarks)**: Xem và điều chỉnh vị trí các ghim địa danh vật lý, gán phân loại và tên nhãn.
2. **Ngăn xếp Hoàn tác (Undo Stack)**:
   - Lưu trữ lịch sử thao tác (`historyRef`), cho phép phục hồi từng bước hiệu chỉnh trước đó thông qua nút **Hoàn tác** hoặc tổ hợp phím `Ctrl + Z`.
3. **Lớp Đối chiếu Trực quan (Reference Overlay)**:
   - Bật/Tắt ảnh quy hoạch chuẩn `tan-thuan-approved-zoning.png` phủ mờ lên ảnh chụp vệ tinh thực địa, điều chỉnh độ mờ linh hoạt từ 0% đến 100%.
4. **Kiểm toán Hình học Trực tiếp (Real-time Geometric Auditing)**:
   - Kiểm tra liên tục:
     - Tính đơn giản của polygon (không tự cắt cạnh).
     - 100% 12 công tơ nằm trong ranh giới phân khu (`12/12 PASS`).
     - Tọa độ đỉnh nằm trong phạm vi canvas $[0, 1915] \times [0, 821]$.
5. **Xuất Tệp Dữ liệu Chuẩn (Deterministic JSON Export)**:
   - Nút **Sao chép V10 JSON** sao chép trực tiếp nội dung vào Clipboard.
   - Nút **Tải tệp JSON** tạo và tải tệp `tanThuanPresentationGeometry.v10.json` về máy.

---

### 4. Quy trình Nghiệm thu Thực địa (Human Sign-off Protocol)

Mặc dù hệ thống kiểm thử tự động đạt 100% các tiêu chí toán học, trạng thái không gian vẫn được duy trì ở mức:
```
READY_FOR_HUMAN_GEOMETRY_SIGNOFF
```
Các bước chuyên gia vận hành cảng thực hiện nghiệm thu:
1. Bật chế độ hiệu chỉnh `?mapCalibration=1`.
2. Kiểm tra trực quan từng phân khu trên nền ảnh vệ tinh 1915 × 821.
3. Đối chiếu ranh giới phân khu với luồng di chuyển thực tế của xe nâng và công nhân ghi số.
4. Nhấn **Sao chép V10 JSON** và cập nhật vào repository khi hoàn tất.
