# V16E-S1: Deterministic Reading Generation & Load Profiles

## 1. Generation Parameters

All simulated meter readings are generated deterministically to ensure reproducible test suites and consistent UI demonstrations across restarts:
- **PRNG Seed**: `16092026`
- **Anchor Date**: `2026-09-16`
- **Time Horizon**: 14 Days (2026-09-02 00:00 to 2026-09-15 23:59)
- **Time Granularity**: Hourly readings (24 readings per day per meter)
- **Total Historical Readings**: 12 meters × 24 hours × 14 days = **4,032 readings**
- **Active Operational Round**: Date `2026-09-16`, 0 / 12 completed (all meters `DUE` or `PENDING` for current operator shift).

---

## 2. Realistic Load Curves & Diurnal Patterns

Meters exhibit domain-realistic consumption profiles tailored to their port operational role:

### Electricity Meters (8 Meters)
1. **`SIM-EM-001` (Trạm biến áp chính S1 - Tổng Cảng)**:
   - Base load: 800 - 1,200 kWh/h.
   - Peak hours (08:00 - 17:00): 1,800 - 2,400 kWh/h when quay cranes and yard equipment operate concurrently.
2. **`SIM-EM-002` (Trạm biến áp S2 - Bãi Container)**:
   - Continuous reefer container refrigeration draw (300 - 500 kWh/h).
   - RTG crane operation spikes during cargo handling shifts.
3. **`SIM-EM-003` (Trạm biến áp S3 - Kho CFS & Xưởng)**:
   - Daytime industrial work, forklift charging stations, workshop machinery.
4. **`SIM-EM-004` (Tủ điện Cầu tàu 1-2 & Cần cẩu bờ QC-01)**:
   - High pulse load during vessel berthing and container loading operations.
5. **`SIM-EM-005` (Tủ điện Cầu tàu 3-4 & Cần cẩu bờ QC-02)**:
   - Ship shore power supply (Cold Ironing) and heavy lift crane loads.
6. **`SIM-EM-006` (Giàn cắm Container Lạnh Reefer 01)**:
   - Thermostatically controlled cooling compressors; steady baseline with ambient heat correlation.
7. **`SIM-EM-007` (Kho CFS-01 & Chiếu sáng bãi Đông)**:
   - Warehouse operations during shift hours; evening high-mast floodlight activation (18:00 - 06:00).
8. **`SIM-EM-008` (Tòa nhà Điều hành & Trung tâm Dữ liệu)**:
   - IT server room constant baseline (40 - 60 kWh/h) + office HVAC daytime load.

### Water Meters (4 Meters)
1. **`SIM-WM-001` (Đồng hồ tổng SAWACO)**:
   - Port-wide municipal intake: 30 - 80 m³/h.
2. **`SIM-WM-002` (Trạm cấp nước Cầu tàu 1-4)**:
   - Freshwater bunkering for commercial cargo vessels and tugboats during ship calls.
3. **`SIM-WM-003` (Cụm PCCC & Bể ngầm Kỹ thuật)**:
   - Reserve tank maintenance and automated weekly valve test cycles.
4. **`SIM-WM-004` (Khu Điều hành & Căn tin Cảng)**:
   - Domestic kitchen and sanitary water consumption peaks at 07:00, 11:30, and 18:00.

---

## 3. Mathematical Properties

- **Monotonic Accumulation**: Cumulative registers $R_t = R_{t-1} + \Delta E_t$, where $\Delta E_t \ge 0$.
- **No Negative Deltas**: Zero reverse flow or meter rollback errors.
- **Realistic OCR Confidence**: Synthetic confidence scores between $0.92$ and $0.99$.
