# 10. Kiểm toán Độ phủ Bằng chứng Xác minh (Verification Coverage Audit)

## 1. Kiểm tra Bảng `verification_evidences`

Bảng `verification_evidences` trong cơ sở dữ liệu runtime ghi nhận **CHỈ DUY NHẤT 1 BẢN GHI**:

```json
{
  "id": "0993fda7-c8b1-43e5-bacb-269927f26ffe",
  "entity_type": "METER_ASSET_RELATION",
  "entity_id": "6595fff9-043d-4773-b1f3-dbddda504fa2",
  "evidence_type": "PORT_DOCUMENT",
  "evidence_reference": "Phê duyệt liên kết công tơ V16C",
  "notes": null,
  "verified_by": "e2a6702f-fac9-44fe-8702-5c0fc43b5d5b",
  "verified_at": "2026-09-16 08:34:07.482689",
  "created_at": "2026-09-16 08:34:07.482689"
}
```

### Bất thường Kỹ thuật Phát hiện:
- Bản ghi bằng chứng này trỏ tới `entity_id = '6595fff9-043d-4773-b1f3-dbddda504fa2'`.
- Kiểm tra truy vấn bảng `meter_asset_relations`: **KHÔNG TỒN TẠI** bản ghi nào có ID này!
- **Đánh giá**: Đây là một **Khóa ngoại mồ côi logic (Orphan Evidence Reference)** còn sót lại sau một đợt chạy script test hoặc reset dữ liệu trước đây.

---

## 2. Thống kê Độ phủ Bằng chứng theo Phân nhóm

| Loại Thực thể Nghiệp vụ | Tổng số Thực thể | Số lượng có Bằng chứng Xác thực | Tỷ lệ Độ phủ Bằng chứng Thực tế |
| :--- | :---: | :---: | :---: |
| **Vị trí Công tơ (Meter Locations)** | 24 | 0 | **0.0%** |
| **Liên kết Công tơ ↔ Thiết bị (`METER_ASSET_RELATION`)** | 24 | 0 | **0.0%** |
| **Vị trí Thiết bị Hạ tầng (Asset Locations)** | 52 | 0 | **0.0%** |
| **Đường truyền Điện năng (`ELECTRICITY_CONNECTION`)** | 32 | 0 | **0.0%** |
| **Tuyến ống Cấp nước (`WATER_CONNECTION`)** | 9 | 0 | **0.0%** |
| **Nút Nguồn Cung cấp (Source Nodes)** | 15 | 0 | **0.0%** |

---

## 3. Thống kê theo Các Loại Bằng chứng Quy định

| Loại Bằng chứng (`evidence_type`) | Số lượng Bản ghi Lưu trong DB | Đánh giá Giá trị Thực địa |
| :--- | :---: | :--- |
| `FIELD_INSPECTION` (Biên bản kiểm tra hiện trường) | 0 | Chưa có biên bản khảo sát thực tế nào được nạp |
| `MENTOR_CONFIRMATION` (Xác nhận của chuyên gia cảng) | 0 | Chưa ghi nhận |
| `PORT_DOCUMENT` (Văn bản phê duyệt của Cảng) | 1 (Dangling ID) | Bản ghi mồ côi, không liên kết được thực thể |
| `EQUIPMENT_NAMEPLATE` (Ảnh chụp biển thông số thiết bị) | 0 | Chưa có |
| `METER_PHOTO` (Ảnh chụp hiện trường công tơ) | 0 | Chưa có |
| `ELECTRICAL_DRAWING` (Bản vẽ hoàn công mạng điện) | 0 | **Khoảng trống cốt lõi cần thu thập** |
| `WATER_DRAWING` (Bản vẽ hoàn công mạng cấp nước) | 0 | **Khoảng trống cốt lõi cần thu thập** |
| `SCADA_CONFIG` (Cấu hình hệ thống giám sát SCADA) | 0 | Chưa tích hợp |
| `OTHER` (Khác) | 0 | Chưa có |

**Kết luận**: Toàn bộ dữ liệu mạng lưới hiện có trong hệ thống hoàn toàn thiếu bằng chứng tài liệu kỹ thuật bảo chứng từ phía ban quản lý Cảng Sài Gòn.
