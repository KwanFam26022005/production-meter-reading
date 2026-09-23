# 12. Đánh giá Mức độ Sẵn sàng Lên Map V2 (Map V2 Utility Readiness)

## 1. Tiêu chuẩn Phân loại Trạng thái Sẵn sàng

Kiểm toán áp dụng 6 trạng thái đánh giá mức độ sẵn sàng chuyển giao lên Map V2:

1. **`READY_VERIFIED`**: Thực thể thực tế, phân loại utility chuẩn, vị trí tọa độ đã xác minh trên Map V2, quan hệ mạng lưới đã xác minh. Sẵn sàng hiển thị chính thức.
2. **`READY_FOR_PLACEMENT_ONLY`**: Định danh tin cậy, vị trí xác minh được, nhưng quan hệ topology chưa xác minh. Chỉ cho phép chấm điểm marker, cấm vẽ dây cáp/đường ống.
3. **`NEEDS_COORDINATE_MAPPING`**: Thực thể tồn tại hợp lệ nhưng tọa độ thiếu hoặc đang nằm ở hệ quy chiếu cũ Map V1, cần đo đạc/chuyển đổi sang 1536×1024.
4. **`NEEDS_TOPOLOGY_VERIFICATION`**: Có tọa độ nhưng quan hệ chuỗi cấp nguồn chưa được bảo chứng.
5. **`SIMULATION_ONLY`**: Dữ liệu thuộc kịch bản demo/mô phỏng, chỉ được phép hiển thị khi bật chế độ "Chế độ Mô phỏng/Demo".
6. **`BLOCKED`**: Dữ liệu mâu thuẫn, thiếu thông tin cốt lõi, không thể xử lý.

---

## 2. Tổng kết Trạng thái Sẵn sàng của Toàn bộ Thực thể

| Loại Thực thể | `READY_VERIFIED` | `READY_FOR_PLACEMENT_ONLY` | `NEEDS_COORDINATE_MAPPING` | `NEEDS_TOPOLOGY_VERIFICATION` | `SIMULATION_ONLY` | `BLOCKED` | TỔNG CỘNG |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **Công tơ (`METERS`)** | 0 | 0 | 0 | 0 | **24 (100%)** | 0 | **24** |
| **Thiết bị (`ASSETS`)** | 0 | 0 | **20 (38.5%)** | 0 | **32 (61.5%)** | 0 | **52** |
| **TỔNG CỘNG** | **0** | **0** | **20** | **0** | **56** | **0** | **76** |

---

## 3. Định hướng Xử lý Kỹ thuật cho Map V2

1. **Đối với 24 Công tơ hiện hữu**:
   - Gắn nhãn hiển thị rõ ràng là `[MÔ PHỎNG DEMO]` nếu người dùng bật layer mô phỏng.
   - Tuyệt đối không cho phép hiển thị mặc định như là hạ tầng thực tế của Cảng Tân Thuận.
   - Để hiển thị trên Map V2, cần chuyển đổi tọa độ từ không gian Map V1 sang không gian 1536×1024 của Map V2.
2. **Đối với 20 Thiết bị Thực tế/Test**:
   - Hiện đang có tọa độ `NULL`, không thể hiển thị trên bản đồ nếu chưa được chấm tọa độ Map V2.
3. **Đối với Đồ thị Kết nối**:
   - Giữ nguyên trạng thái mô phỏng cho kịch bản `tan-thuan-demo-v1`.
   - Chuẩn bị cơ chế tách bạch giữa Layer Bản đồ Vận hành Thực tế (Production Reality Layer) và Layer Demo (Simulation Overlay).

*File dữ liệu xuất máy: `docs/implementation/map-v2-utility-network-audit/data/map_v2_utility_readiness.csv`.*
