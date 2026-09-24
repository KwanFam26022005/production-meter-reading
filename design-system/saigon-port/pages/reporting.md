# Page Override: Technical Reports & Analytics Workspace (Báo cáo)
**Target Workspace:** `AdminReports.tsx`, `ReportingOperationsWorkspace.tsx`, `ReportingUsageWorkspace.tsx`  
**Governing Authority:** `design-system/saigon-port/MASTER.md`, `docs/contracts/reporting.md` (Thread 9D)

---

## 1. Mental Model & Navigation

Centralized reporting hub serving operational decision-making, consumption tracking, and audit compliance across 6 tabs:
1. `Điều hành` (`overview`): Real-time round progress, task fulfillment, unassigned workload.
2. `Tiêu thụ & dao động` (`usage`): Physical consumption deltas, baseline median deviation, heatmaps.
3. `Việc cần xử lý` (`data` / `actions`): Operational exception queue (unassigned due, overdue, OCR reviews).
4. `Chất lượng OCR` (`quality`): Direct confirmation rate, operator manual intervention analysis.
5. `Công tơ` (`meters`): Master meter inspection log and technical histories.
6. `Kiểm toán` (`audit`): Administrative immutable audit ledger.

---

## 2. Filter & Toolbar Ergonomics

### 2.1 Filter Grouping
- **Time Filter:** Period dropdown (Tháng này, 7 ngày qua, Tùy chọn) + Date Range.
- **Scope Filter:** Zone selector (Tất cả khu vực, Khu Cầu cảng, Khu Kỹ thuật...).
- **Utility Filter:** Segmented control (`Tất cả`, `Điện lực (kWh)`, `Cấp nước (m³)`).
- **Secondary Filters:** Collapsed behind `Bộ lọc nâng cao` (Shift, Reading Method, Confirmation Status).

---

## 3. Sub-Workspace Implementations

### 3.1 Điều hành (Operations Overview)
- **Primary Progress Banner:** Port-wide progress bar with percentage, completed/total count, and due count.
- **Supporting Metric Strip:**
  - `Đến hạn`: High-contrast neutral badge.
  - `Chưa phân công`: Warning amber pill with quick link to Phân ca.
  - `Cần kiểm tra (Review)`: Informational blue badge.
- **Detailed Drill-Down Table:** Expandable hierarchy grouping scheduled meters by Round -> Zone -> Shift -> Assigned Operator.

### 3.2 Tiêu thụ & Dao động (Usage & Deviation)
- **Data Readiness Assurance:**
  - If meters lack configured `measurement_unit` or `register_semantics` (e.g. `'UNKNOWN'`), display a **single unified Readiness Panel**:
    - Number of configured meters vs total.
    - Missing metadata gaps with link to Meter Master data registry.
    - Never display multiple repetitive empty error cards.
- **When Data Exists:**
  - Explicit separation between:
    1. **TIÊU THỤ THỰC TẾ (Delta):** Cumulative consumption difference between adjacent readings.
    2. **TỐC ĐỘ TRUNG BÌNH THEO KHOẢNG (Average Rate):** Calculated as `delta / hours` in kW or m³/h.  
       *Strict Rule:* Never label average interval rate as instantaneous demand.
    3. **CHỈ SỐ GỐC:** Verified field counter values with operator provenance.
- **Negative Deltas:** Highlighted with badge `RESET_OR_ROLLOVER_SUSPECTED` — never guess physical rollover without operator confirmation.

### 3.3 Việc cần xử lý (Action Queue)
- Replaces raw spreadsheet feel with a prioritized triage workflow:
  - Severity ranking: `UNASSIGNED_DUE` (Critical) -> `OVERDUE_MISSING` (Warning) -> `REVIEW` (Attention).
  - Clear attribution: Shows designated zone, assigned responsible operator vs actual executor.
  - Single primary action: `Xem ảnh đối chiếu` or `Phân công ngay`.

### 3.4 Chất lượng OCR (OCR Quality)
- Strictly preserve corporate metric terminology:
  - **`Tỷ lệ xác nhận trực tiếp từ OCR`** (Direct OCR Confirmation Rate).
  - *Prohibition:* Never rename this metric to "OCR Accuracy" or "Độ chính xác AI", because user corrections reflect human verification, not machine ground truth.
