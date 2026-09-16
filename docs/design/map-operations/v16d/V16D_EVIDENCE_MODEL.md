# V16D — Evidence Model & Taxonomy

## 1. Schema Definition
The `verification_evidences` table records every evidentiary justification for entity verification.

```sql
CREATE TABLE verification_evidences (
    id VARCHAR(36) PRIMARY KEY,
    entity_type VARCHAR(50) NOT NULL,
    entity_id VARCHAR(36) NOT NULL,
    evidence_type VARCHAR(50) NOT NULL,
    evidence_reference VARCHAR(255) NOT NULL,
    notes TEXT,
    verified_by VARCHAR(36) REFERENCES users(id),
    verified_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL
);
```

---

## 2. Entity Types Supported
- `ASSET`: Verification of an asset entity's existence, naming, and classification.
- `METER_ASSET_RELATION`: Verification that a meter measures or is installed at an asset.
- `ASSET_CONNECTION`: Verification of an electrical/fluid pipe connection between assets.
- `ASSET_POSITION`: Verification of normalized spatial coordinates `(map_x, map_y)`.

---

## 3. Evidence Types Taxonomy

| Code | Label (VN) | Required Reference Format | Example |
| :--- | :--- | :--- | :--- |
| `FIELD_INSPECTION` | Kiểm tra thực địa | Inspection report code / Logbook entry | `BB-KT-2026-03` |
| `PHYSICAL_INSPECTION` | Khảo sát trực tiếp | Survey docket number | `KS-TT-01` |
| `PORT_DOCUMENT` | Hồ sơ kỹ thuật cảng | Document registration code | `HS-TB-CSG-2025` |
| `EQUIPMENT_NAMEPLATE` | Nhãn máy / Nameplate | Serial number / Model tag | `SN-ABB-99214` |
| `METER_PHOTO` | Ảnh chụp thực tế | Photo index / File identifier | `IMG-MTR-004-TAG` |
| `ELECTRICAL_DRAWING` | Sơ đồ điện / Đấu nối | Drawing sheet number | `DWG-ELEC-SGP-04` |
| `ELECTRICAL_DIAGRAM` | Sơ đồ nguyên lý điện | Schematic code | `SCH-ELEC-TBA2` |
| `WATER_DRAWING` | Sơ đồ cấp thoát nước | Hydraulic drawing number | `DWG-WATER-B1-02` |
| `SINGLE_LINE_DIAGRAM` | Sơ đồ đơn tuyến | SLD revision number | `SLD-2026-PORT-01` |
| `SCADA_CONFIG` | Cấu hình SCADA | Modbus tag address / Node ID | `MODBUS-ADDR-40012` |
| `OTHER` | Căn cứ khác | Descriptive justification | `Biên bản bàn giao 2024` |
