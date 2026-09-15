# V16B — HISTORY PRESERVATION & AUDIT INTEGRITY

## 1. Relational Integrity Risk & Safeguard
In the production schema:
- `meter_readings.meter_id REFERENCES meters(id) ON DELETE CASCADE`
- `meter_training_samples.meter_id REFERENCES meters(id) ON DELETE CASCADE`

Prior to V16B, invoking `DELETE /api/v1/admin/meters/{id}` would trigger a catastrophic SQLite cascade delete, wiping all historical meter readings, OCR confirmation sources, operator timestamps, and model calibration evidence.

### V16B Hard Delete Safeguard (Section 2.3)
Hard delete is strictly guarded in `backend/app/admin.py`:
```python
reading_count = db.query(MeterReading).filter(MeterReading.meter_id == meter.id).count()
sample_count = db.query(MeterTrainingSample).filter(MeterTrainingSample.meter_id == meter.id).count()

if reading_count > 0 or sample_count > 0:
    raise HTTPException(
        status_code=status.HTTP_409_CONFLICT,
        detail="Không được phép xóa vĩnh viễn công tơ đã có chỉ số đo lường trong lịch sử. Vui lòng chuyển sang trạng thái 'Ngừng sử dụng' (RETIRED) để bảo lưu dữ liệu kiểm toán.",
    )
```
- Hard delete is permitted **only** for pristine, newly created test records that possess 0 historical readings and 0 training samples.
- Legitimate decommissioning of production meters must always go through non-destructive retirement (`POST /api/v1/admin/meters/{id}/retire`).

---

## 2. Reading & Historical Lookup Accessibility
1. **Zero Reading Loss**: All historical readings belonging to a retired meter remain untouched and queryable via reporting APIs (`/api/v1/reports/meters/{id}`, `/api/v1/meters/{id}/readings`).
2. **Contextual Inspection**: When inspecting a retired meter via the context rail or technical reports, `Kiểm tra bản ghi` (Inspect Reading) remains enabled and functional.
3. **Audit Provenance**: Retiring a meter records:
   - `retired_at`: ISO timestamp of retirement.
   - `retired_by`: User ID of the authorizing admin.
   - `retirement_reason`: Free-text justification entered by the admin.
   - `AdminAuditLog` record with action `METER_RETIRED` capturing pre- and post-retirement states.

---

## 3. Spatial History Preservation
- The spatial coordinates (`map_x`, `map_y`) and presentation zone (`presentation_zone_id`) remain preserved in the meter record.
- Spatial baseline freeze artifact `docs/design/map-operations/v16a-r2/tan-thuan-spatial-baseline.freeze.json` (SHA-256 `ed5fd8bfa4b0e8a2b59937a418de787c57c6d072f3f790f3dbe84df5299177d3`) remains completely untouched and byte-identical.
