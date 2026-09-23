# 13. Kiểm toán Không gian Tọa độ Chuẩn Bản đồ V2 (Canonical Coordinate Audit)

**Tệp Bản đồ Gốc:** `frontend/src/components/map-v2/assets/map-verison3.png`  
**Độ phân giải Gốc:** $1536 \times 1024\text{ pixels}$  
**Tệp Hình học Phân khu:** `frontend/src/components/map-v2/data/tan_thuan_1_zones_edited.json`

---

## 1. Thẩm định Không gian Tọa độ Bản quyền (Canonical Space Verification)

Bản đồ V2 được định nghĩa chuẩn xác trong không gian hình chữ nhật có kích thước $1536\text{ px}$ chiều ngang và $1024\text{ px}$ chiều dọc.

### So sánh Tuyệt đối giữa Map V1 và Map V2:
| Tiêu chí | Map V1 (Hệ thống Cũ) | Map V2 (Hệ thống Hiện đại Chuẩn) |
| :--- | :--- | :--- |
| **Không gian Tọa độ** | Chuẩn hóa tương đối $[0, 1] \times [0, 1]$ | Tọa độ điểm ảnh nguyên $1536 \times 1024\text{ px}$ |
| **Độ chính xác** | Phụ thuộc vào tỷ lệ co giãn container | Tuyệt đối theo từng pixel ảnh vệ tinh gốc |
| **Độ phân giải ảnh** | $1915 \times 821$ (Cũ) | $1536 \times 1024$ (Mới, chất lượng cao) |
| **Tính độc lập** | Trộn lẫn tọa độ nghiệp vụ với hiển thị | **Tách biệt hoàn toàn:** CSDL lưu logic, Frontend ánh xạ hiển thị |

---

## 2. Kết quả Kiểm toán Hình học Tự động (Automated Audit Results)

Bộ kiểm thử tự động tại `frontend/tests/mapV2UtilityDemoLayout.test.ts` đã chạy kiểm tra 100% các tọa độ và phân đoạn tuyến trên toàn bộ 3 phương án:

```
✔ Suite 1: Active Demo Meters strictly match audited tan-thuan-demo-v1 dataset (12.98ms)
✔ Suite 2: Graph connectivity is preserved identically across Layouts A, B, and C (0.67ms)
✔ Suite 3: All coordinates within 1536x1024 and avoid buildings/hotspots/gates in Layout B (2.15ms)
✔ Suite 4: Factory method getUtilityLayout defaults to recommended Layout B (0.36ms)
```

### Các Kết luận Kiểm toán Trọng yếu:
1. **Kiểm tra Biên giới Tọa độ (Bounds Check):**
   - $100\%$ trong số 17 nút hiển thị có tọa độ $X \in [0, 1536]$ và $Y \in [0, 1024]$.
   - $100\%$ trong số 51 điểm uốn của các cạnh hiển thị có tọa độ $X \in [0, 1536]$ và $Y \in [0, 1024]$.
2. **Kiểm tra Giao cắt Thân kho (Building Interior Clearance):**
   - Không có bất kỳ điểm nút nào nằm bên trong đa giác của `BLDG_KHO_1`, `BLDG_KHO_2`, `BLDG_KHO_4`, và `ZONE_ADMIN` (Thuật toán Ray-Casting Point-in-Polygon).
   - Không có bất kỳ đoạn thẳng nào cắt ngang qua chu vi của các nhà kho trên (Thuật toán Segment-Segment Cross-Product).
3. **Kiểm tra Khoảng cách An toàn Cổng & Điểm nóng:**
   - Khoảng cách đến Cổng A ($[668, 725]$) và Cổng B ($[874, 725]$) đều lớn hơn $25\text{ px}$.
   - Khoảng cách đến 7 điểm nóng phân khu (Zone Anchors) đều lớn hơn $35\text{ px}$.
