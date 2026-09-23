# 03 — Provenance & Auditability Taxonomy

## 1. Provenance Classification Taxonomy

To prevent data ambiguity and uphold truthfulness in maritime operations, all entities within Map V2 are tagged with an explicit provenance classification:

| Provenance Level | Description | Field Verified | Map Placement Authoritative |
| :--- | :--- | :--- | :--- |
| `AUTHORITATIVE` | High-precision survey, certified RTK GNSS, or physical as-built plans. | YES | YES |
| `SIMULATED` | Deterministically generated engineering demo data adhering to frozen topological layouts. | NO | NO (Logical / Scheme only) |
| `LEGACY_SIMULATION` | Historical test data from pre-B2 development cycles; retired from active topology. | NO | NO |
| `INTERPOLATED` | Algorithmic estimation based on bounding boxes or polygon centroids. | NO | APPROXIMATE |

## 2. Invariants on Coordinate Claims

1. **Simulated Coordinates Are Not Physical Truth**: Even when `map_x` and `map_y` are numerically valid within `[0, 1536] × [0, 1024]`, their provenance remains `SIMULATED`.
2. **`verifiedPhysicalCoordinate` is NULL**: All 12 active simulation meters must return `null` for `verifiedPhysicalCoordinate`. They must NEVER be marked as field-verified until a certified physical survey is completed.
3. **Disclosure in UI**:
   - Network layers are explicitly labeled `⚡ Mạng điện [MÔ PHỎNG]` and `💧 Mạng nước [MÔ PHỎNG]`.
   - Demo personnel animation is explicitly labeled `Nhân sự di chuyển [DEMO]`.
   - Inspector metadata cards display `Nguồn dữ liệu: Mô phỏng B2 (Chưa khảo sát thực địa)`.
   - Legacy meters display `Dữ liệu kế thừa (Đã ngừng hoạt động)`.
