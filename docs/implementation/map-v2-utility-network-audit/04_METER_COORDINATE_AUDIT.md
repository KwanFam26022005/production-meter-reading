# 04. Kiểm toán Tọa độ Bản đồ Công tơ (Meter Coordinate Audit)

## 1. Kết quả Phân tích Tọa độ Hiện hữu

| Thông số Phân tích | Giá trị đo đạc | Đánh giá |
| :--- | :--- | :--- |
| **Tổng số công tơ có tọa độ** | 24 / 24 (100%) | Đầy đủ trường dữ liệu |
| **Dải giá trị X (`map_x`)** | `[0.1760, 0.8773]` | Nằm trọn vẹn trong khoảng tỷ lệ `[0, 1]` |
| **Dải giá trị Y (`map_y`)** | `[0.3021, 0.8770]` | Nằm trọn vẹn trong khoảng tỷ lệ `[0, 1]` |
| **Tọa độ NULL / Âm / Vượt ngưỡng** | 0 bản ghi | Không có giá trị ngoại lai kỹ thuật |
| **Tọa độ mặc định (0, 0)** | 0 bản ghi | Không có công tơ bị dồn về gốc tọa độ |
| **Tọa độ trùng lặp (Duplicate)** | 0 cặp | Mỗi công tơ có một tọa độ riêng biệt |

---

## 2. Đối chiếu Hệ tọa độ Map V1 và Map V2

### A. Hệ quy chiếu Map V1 (Published trong Database)
- Bản đồ: `tan-thuan-sim-v1-5zone` (Trạng thái: `PUBLISHED`)
- Mã hệ tọa độ: `tan-thuan-canonical-image-pixel-space-v1`
- Kích thước ảnh gốc: **1915 × 821 pixels**
- Tỷ lệ khung hình (Aspect Ratio): **2.332 : 1** (Toàn cảnh trải dài theo luồng sông)

### B. Hệ quy chiếu Map V2 (Frontend Canonical)
- Bản đồ: `tan_thuan_1_zones_edited.json` (File ảnh: `e7559223-1522-4bee-a796-6465681c3ce9.png`)
- Mã hệ tọa độ: `port-zoning-image-pixels/v1` (`image-pixels`)
- Kích thước không gian chuẩn: **1536 × 1024 pixels**
- Tỷ lệ khung hình (Aspect Ratio): **1.500 : 1** (Góc chụp trực giao vuông hơn)

---

## 3. Kết luận Phân loại Tọa độ

> [!WARNING]
> **KẾT LUẬN KIỂM TOÁN**: Phân loại tọa độ là **NORMALIZED_COORDINATES (Tọa độ Chuẩn hóa Map V1)**.
> **TUYỆT ĐỐI KHÔNG THỂ DÙNG TRỰC TIẾP CHO MAP V2.**

### Bằng chứng:
1. Giá trị `map_x`, `map_y` trong cơ sở dữ liệu được số hóa dưới dạng phần trăm `[0.0, 1.0]` tương ứng với ảnh nền Map V1 cũ (1915 × 821).
2. Ảnh nền Map V2 (1536 × 1024) có góc cắt, độ phóng đại và tỷ lệ khung hình khác biệt hoàn toàn (sai lệch tỷ lệ co giãn trục: $2.332 / 1.500 \approx 1.55$, chênh lệch hình học 55%).
3. Nếu nhân trực tiếp `map_x * 1536` và `map_y * 1024`, các vị trí công tơ sẽ bị trôi lệch hoàn toàn ra ngoài luồng sông, đè lên nóc nhà kho hoặc sai phân khu cảng.
4. **Hành động bắt buộc**: Phải thực hiện tái định vị tọa độ (Coordinate Remapping / Georeferencing) cho Map V2 trước khi hiển thị.
