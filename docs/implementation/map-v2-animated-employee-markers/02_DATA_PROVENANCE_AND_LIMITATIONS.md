# Map V2 Animated Employee Markers — 02. Data Provenance & Limitations

**Project:** Production Meter Reading — Cảng Sài Gòn  
**Repository:** `D:\Projects\production-meter-reading\production-meter-reading`  
**Adapter Module:** `frontend/src/components/map-v2/employeeDataAdapter.ts`  

---

## 1. Current Data State vs Production Truth

Based on the current architecture audit (`docs/research/employee-shift-map-audit/`):
- **Current Backend Reality:** The local backend manages user authentication and attendance check-in records (`attendance.py`, `models.py`), but does not expose a live, shift-synchronized endpoint linking individual employee IDs to Map V2 spatial zone polygons in real-time.
- **Frontend Presentation Reality:** Map V2 is an operational digital twin operating in 1536×1024 SVG coordinate space.
- **Data Integrity Gate Contract:** To avoid presenting misleading or fabricated workforce tracking to port management, the system strictly isolates demo assignments through an explicit adapter contract (`DEMO_MAP_V2_EMPLOYEES`).

---

## 2. Truthful Field Semantics

| Attribute | Presentation Label | Operational Meaning |
| :--- | :--- | :--- |
| **Role Title** | `Người phụ trách phân khu` | Staff member assigned to oversee meter reading within the zone. |
| **Duty Status** | `Phân công theo dõi khu vực (Minh họa)` | Illustrative assignment indicator; clarifies this is not unverified shift duty. |
| **Zone Progress** | `Khu vực: 34/42 công tơ (81%)` | Aggregate zone meter progress. Denominators strictly belong to zones, never individual workers. |
| **Motion Nature** | Mandatory Disclosure Banner | `"Chuyển động minh họa khu vực phân công — không phải vị trí GPS."` |

---

## 3. Mandatory Disclosure Requirements

1. **Persistent Top Bar Banner:** When Layer 7 (Nhân sự phân khu) is active in standard operational mode, the top bar displays a calm pill badge: `Chuyển động minh họa (Demo)` with full tooltip text.
2. **Inspector Panel Disclaimer:** Whenever an employee is selected, a dedicated information callout renders at the base of `MapV2InspectionPanel`:
   > *"Chuyển động minh họa: Biểu tượng nhân sự di chuyển mô phỏng phạm vi phân công theo dõi — không phải tọa độ GPS thời gian thực."*
3. **Hover Tooltip Disclaimer:** The Level 2 vector preview tooltip includes italicized disclosure text to prevent misinterpretation during quick inspection.

---

## 4. Production API Migration Checklist

When the backend exposes authoritative zone-assignment endpoints, the adapter (`employeeDataAdapter.ts`) is designed for seamless drop-in replacement:
- Replace static `DEMO_MAP_V2_EMPLOYEES` array with `fetchZoneAssignments(date, shift)` API call.
- Toggle `isDemo: false` when connected to live backend records.
- Preserve the spatial containment and animation primitives unchanged.
