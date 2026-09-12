# V10 Spatial Boundary Contract — Cảng Tân Thuận
## Khế ước Ranh giới Vật lý và Hình học Không gian Phân khu V10

Phiên bản: `tan-thuan-v10`  
Hệ tọa độ cơ sở: `tan-thuan-canonical-image-pixel-space-v1`  
Kích thước chuẩn: `1915 × 821` px  
Trạng thái hình học: `READY_FOR_HUMAN_GEOMETRY_SIGNOFF`

---

### 1. Tổng quan Kiến trúc Ranh giới V10

Kiến trúc hình học V10 giải quyết triệt để vấn đề ranh giới ước lệ (approximate bounding) ở các phiên bản tiền nhiệm bằng cách liên kết chặt chẽ từng đỉnh polygon (`vertex`) với các **địa danh vật lý có thể kiểm chứng trực quan** trên bản đồ ảnh gốc (`tan-thuan-canonical-base.png`).

Hệ thống duy trì mô hình phân tách 2 lớp:
- **6 Phân khu Trình diễn (Presentation Zones)**: Khớp sát thực địa hạ tầng cảng (Cầu cảng, Bãi Tây, Bãi Trung tâm, Kho CFS Đông, Khu Kỹ thuật, Khu Cổng).
- **4 Phân khu Nghiệp vụ (Business Zones)**: Đảm bảo tính toàn vẹn của hệ thống quản lý công tơ (`zone-berth`, `zone-container`, `zone-warehouse`, `zone-technical`).

---

### 2. Khế ước Chi tiết 6 Phân khu Trình diễn

#### 2.1. Phân khu 1: Cầu cảng Tân Thuận (`pres-berth`)
- **Tên nghiệp vụ**: `zone-berth` (Cầu tàu 1–3 & Bến 1–7)
- **Màu đại diện**: `#0284C7` (Sky/Blue)
- **Đặc điểm ranh giới**:
  - **Phía Bắc**: Bám sát mép nước cầu tàu (`quay-edge`), từ điểm neo phía Tây đến góc chuyển tiếp phía Đông.
  - **Phía Nam**: Dọc theo mép lề đường công vụ quayside ngăn cách ray cẩu giàn và bãi container.
  - **Phía Tây**: Ranh giới điểm đầu bến tiếp giáp hạ lưu sông Sài Gòn.
  - **Phía Đông**: Điểm kết thúc cầu tàu chuyển sang đê kè kho CFS.
- **Địa danh vật lý neo đậu**:
  - `berth-west-start` (72, 338)
  - `quay-west-bend` (386, 272)
  - `quay-central-break` (842, 272)
  - `east-crane-transition` (1485, 204)
  - `berth-east-end` (1596, 280)
  - `southern-service-road-center` (840, 360)
- **Công tơ trực thuộc**: `CT-003`, `CT-004`, `CT-008` (100% nằm trong polygon).

#### 2.2. Phân khu 2: Bãi Container Phía Tây (`pres-container-west`)
- **Tên nghiệp vụ**: `zone-container`
- **Màu đại diện**: `#0D9488` (Teal)
- **Đặc điểm ranh giới**:
  - **Phía Bắc**: Mép nam đường công vụ sau cầu cảng.
  - **Phía Nam**: Đường trục chính nội bộ cảng phân cách với khu kỹ thuật.
  - **Phía Tây**: Hàng rào ranh giới phía Tây cảng Tân Thuận.
  - **Phía Đông**: Tuyến đường xương cá nội bộ chia tách Bãi Tây và Bãi Trung tâm.
- **Địa danh vật lý neo đậu**:
  - `west-yard-nw-corner` (386, 362)
  - `west-yard-sw-corner` (386, 560)
  - `center-divide-road-south` (832, 560)
  - `center-divide-road-north` (836, 362)
- **Công tơ trực thuộc**: `CT-002`, `CT-005` (100% nằm trong polygon).

#### 2.3. Phân khu 3: Bãi Container Trung Tâm (`pres-container-center`)
- **Tên nghiệp vụ**: `zone-container`
- **Màu đại diện**: `#2563EB` (Cobalt Blue)
- **Đặc điểm ranh giới**:
  - **Phía Bắc**: Tiếp giáp đường công vụ bến bãi quayside.
  - **Phía Nam**: Trục đường chính kết nối Cổng vào và Khu kỹ thuật.
  - **Phía Tây**: Tiếp giáp tuyến đường phân cách Bãi Tây.
  - **Phía Đông**: Đường nội bộ trước dãy nhà kho CFS phía Đông.
- **Địa danh vật lý neo đậu**:
  - `center-divide-road-north` (844, 360)
  - `center-divide-road-south` (844, 558)
  - `main-east-west-axis-mid` (1482, 552)
  - `east-yard-junction` (1480, 290)
- **Công tơ trực thuộc**: `CT-011`, `CT-012` (100% nằm trong polygon).

#### 2.4. Phân khu 4: Khu Kho CFS Phía Đông (`pres-cfs-east`)
- **Tên nghiệp vụ**: `zone-warehouse`
- **Màu đại diện**: `#D97706` (Amber/Orange)
- **Đặc điểm ranh giới**:
  - **Phía Bắc**: Vệt bờ sông phía Đông tiếp giáp khúc cong cảng.
  - **Phía Nam**: Đường tiếp cận khu vực cổng phụ và tường rào Đông Nam.
  - **Phía Tây**: Mép đông bãi container trung tâm.
  - **Phía Đông**: Tường rào ranh giới phía Đông cảng.
- **Địa danh vật lý neo đậu**:
  - `cfs-north-quay-transition` (1488, 206)
  - `cfs-ne-perimeter` (1876, 295)
  - `cfs-se-corner` (1876, 482)
  - `cfs-south-road-junction` (1492, 482)
- **Công tơ trực thuộc**: `CT-006` (100% nằm trong polygon).

#### 2.5. Phân khu 5: Khu Kỹ Thuật & Cơ Điện (`pres-technical`)
- **Tên nghiệp vụ**: `zone-technical`
- **Màu đại diện**: `#7C3AED` (Purple/Indigo)
- **Đặc điểm ranh giới**:
  - **Phía Bắc**: Trục đường chính nội bộ phía Nam bãi container.
  - **Phía Nam**: Tường rào phân định ranh giới phía Nam cảng Tân Thuận.
  - **Phía Tây**: Tiếp giáp khu văn phòng/xưởng sửa chữa cơ điện.
  - **Phía Đông**: Trạm điện biến áp trung thế và tuyến cáp ngầm.
- **Địa danh vật lý neo đậu**:
  - `tech-zone-nw` (832, 574)
  - `tech-zone-sw` (832, 792)
  - `tech-zone-se` (1440, 792)
  - `tech-zone-ne` (1440, 574)
- **Công tơ trực thuộc**: `CT-001`, `CT-007`, `CT-009` (100% nằm trong polygon).

#### 2.6. Phân khu 6: Khu Cổng Chính & Kiểm Soát (`pres-gate`)
- **Tên nghiệp vụ**: `zone-container` (Kiểm soát vào/ra bãi)
- **Màu đại diện**: `#475569` (Slate/Steel)
- **Đặc điểm ranh giới**:
  - **Phía Bắc**: Điểm nối từ đường kho CFS ra cổng.
  - **Phía Nam**: Cổng chính kiểm soát phương tiện vào cảng.
  - **Phía Tây**: Giáp tuyến đường phân luồng trước trạm cân.
  - **Phía Đông**: Hàng rào an ninh cổng phía Đông.
- **Địa danh vật lý neo đậu**:
  - `gate-north-approach` (1492, 502)
  - `gate-east-perimeter` (1876, 502)
  - `gate-south-exit` (1876, 755)
  - `gate-west-checkpoint` (1492, 755)
- **Công tơ trực thuộc**: `CT-010` (100% nằm trong polygon).

---

### 3. Quy chuẩn Hình học & Kiểm toán Ranh giới

1. **Bảo toàn Tọa độ Không gian**:
   - Tất cả các đỉnh ($x, y$) đều nằm nghiêm ngặt trong miền $[0, 1915] \times [0, 821]$.
   - Các đỉnh polygon liên kết trực tiếp tới `landmarkId` đảm bảo tính giải trình thực địa.
2. **Tính Đơn giản của Polygon (Simplicity Invariant)**:
   - 100% các phân khu là polygon đơn (simple polygon), hoàn toàn không có cạnh tự cắt (`self-intersecting edge`).
3. **Diện tích Tối thiểu**:
   - Mọi phân khu đều có diện tích $> 10,000\text{ px}^2$, đảm bảo bề mặt trực quan rõ ràng, không bị co cụm điểm ảnh.
4. **Không chồng lấn nhãn và neo**:
   - Nhãn phân khu (`labelAnchorCanonical`) và vị trí người vận hành (`operatorAnchorCanonical`) đều nằm sâu trong polygon và cách công tơ gần nhất $\ge 24\text{px}$.
