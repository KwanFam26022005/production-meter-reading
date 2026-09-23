# 07. Hệ thống Phân cấp Độ dày Tuyến Kỹ thuật (Route Visual Hierarchy)

Để phản ánh trực quan công suất tải và tầm quan trọng kỹ thuật của từng đường dây/ống dẫn trên mặt bằng cảng, Phương án B2 phân tách các đoạn tuyến thành **3 tầng phân cấp độ dày (3-Tier Route Hierarchy)**.

---

## 1. Bảng Thông số Phân cấp 3 Tầng Tuyến Dẫn

| Cấp bậc Tuyến (Route Tier) | Ý nghĩa Kỹ thuật | Đối tượng áp dụng | Bề rộng Lõi (`coreWidth`) | Bề rộng Viền đệm (`casingWidth`) | Kiểu nét (`strokeDasharray`) | Độ mờ (`opacity`) |
| :--- | :--- | :--- | :---: | :---: | :---: | :---: |
| **Cấp 1: TRUNK** *(Đường trục chính)* | Tuyến truyền tải công suất lớn từ nguồn vào trạm trung tâm và trục xương sống | `TRUNK-E-FEED`, `TRUNK-E-SPINE`, `TRUNK-W-FEED`, `TRUNK-W-SPINE` | **$4.0\text{ px}$** | $6.8\text{ px}$ | Nét liền (`none`) | $1.00$ |
| **Cấp 2: BRANCH** *(Nhánh phân phối)* | Tuyến cấp điện/nước từ tủ chính ra các phân khu, bãi, kho và cầu cảng | `BRANCH-E-TECH`, `BRANCH-E-WEST`, `BRANCH-E-QUAY`, `BRANCH-E-CENTER`, `BRANCH-E-CFS`, `BRANCH-W-PUMP`, `BRANCH-W-QUAY`, `BRANCH-W-CFS` | **$2.7\text{ px}$** | $4.8\text{ px}$ | Nét liền (Điện) / `7, 4` (Nước) | $0.96$ |
| **Cấp 3: SPUR** *(Nhánh rẽ thiết bị)* | Nhánh cụt cuối cùng kết nối trực tiếp vào đồng hồ đo đếm đầu cuối | `SPUR-E-RTG` (cần cẩu RTG), `SPUR-E-REEFER` (bãi container lạnh) | **$1.8\text{ px}$** | $3.4\text{ px}$ | Nét liền bo tròn | $0.88$ |

---

## 2. Kỹ thuật Đường Viền Đệm (Stroke Casing)

Mỗi đoạn tuyến được vẽ bằng kỹ thuật 2 lớp đường đè (Dual-Layer Path):

```mermaid
graph BT
    L1["1. Lớp Đệm Đáy (Stroke Casing)<br>Bề rộng: coreWidth + 2.8px<br>Màu: #FFFFFF (Technical) hoặc #050f24 (Neon)<br>Độ mờ: 85%"] --> L2["2. Lớp Lõi Mạng (Core Stroke)<br>Bề rộng: 4.0px (Trunk) / 2.7px (Branch) / 1.8px (Spur)<br>Màu: #d97706 (Điện) / #0284c7 (Nước)"]
```

### Ưu điểm Kỹ thuật:
1. **Chống Hòa lẫn Màu sắc:** Lớp viền đệm trắng/tối bên dưới giúp tách biệt hoàn toàn đường vẽ với nền bê tông xám của bãi, màu xanh của bãi container hoặc các vạch kẻ đường nội bộ.
2. **Điểm Giao cắt Tự nhiên:** Khi đường điện đè lên đường nước tại $(740, 520)$, lớp viền đệm của đường điện sẽ tự động che phủ nhẹ mép đường nước bên dưới, tạo cảm giác trực quan về một cầu vượt cáp kỹ thuật (overhead cable tray) đi phía trên đường ống ngầm.

---

## 3. Bản đồ Phân bổ Cấp bậc Tuyến trong Phương án B2

```mermaid
flowchart TD
    subgraph TrunkTier["Cấp 1: TRUNK (4.0px)"]
        E01["E-B2-01: SIM-EXT-GRID -> SIM-SS-01"]
        E02["E-B2-02: SIM-SS-01 -> SIM-TR-01"]
        E03["E-B2-03: SIM-TR-01 -> SIM-MDB-01"]
        W01["W-B2-01: SIM-CITY-WATER -> SIM-WIN-01"]
        W02["W-B2-02: SIM-WIN-01 -> SIM-WJ-01"]
    end

    subgraph BranchTier["Cấp 2: BRANCH (2.7px)"]
        E04["E-B2-04: SIM-MDB-01 -> SIM-FDR-TECH"]
        E05["E-B2-05: SIM-MDB-01 -> SIM-FDR-WEST"]
        E07["E-B2-07: SIM-MDB-01 -> SIM-FDR-BERTH"]
        E08["E-B2-08: SIM-MDB-01 -> SIM-FDR-CENTER"]
        E10["E-B2-10: SIM-MDB-01 -> SIM-FDR-CFS"]
        W03["W-B2-03: SIM-WJ-01 -> SIM-FP-01"]
        W04["W-B2-04: SIM-WJ-01 -> SIM-WP-B01"]
        W05["W-B2-05: SIM-WJ-01 -> SIM-WP-CFS-01"]
    end

    subgraph SpurTier["Cấp 3: SPUR (1.8px)"]
        E06["E-B2-06: SIM-FDR-WEST -> SIM-YDB-W01"]
        E09["E-B2-09: SIM-FDR-CENTER -> SIM-YDB-C01"]
    end
```
