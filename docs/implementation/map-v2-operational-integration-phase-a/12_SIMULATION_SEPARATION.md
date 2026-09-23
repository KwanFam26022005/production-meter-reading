# 12 — Simulation Separation & Demo Disclosure

**Scope:** Preserving demo/simulation capabilities without mixing them with live operational data.

---

## 1. Simulation Isolation Axiom

```text
SIMULATED NETWORK ≠ VERIFIED PHYSICAL INFRASTRUCTURE
DEMO EMPLOYEES   ≠ REAL ASSIGNED PERSONNEL
```

---

## 2. Partitioning in Layer Manager

In `MapV2Layers.tsx`, layers are partitioned into three explicitly separated groups:

1. **Nhóm 1: Tác nghiệp thực tế (Live Operational):**
   - Active by default.
   - Consumes live SQLite database and `/api/v1/map/overview`.
   - Real assignees remain stationary at operator anchors.

2. **Nhóm 2: Mô phỏng hạ tầng (Simulated Infrastructure):**
   - Inactive by default.
   - Labeled with purple indicator and `[MÔ PHỎNG]` badge.
   - Includes:
     - `powerNetwork`: Simulated 22kV / 0.4kV B2 topology.
     - `waterNetwork`: Simulated water trunk.
     - `demoEmployees`: Illustrative animated Lissajous markers.

3. **Nhóm 3: Bản đồ nền & Hạ tầng cơ sở:**
   - Technical background, buildings, roads, gates, zone anchors.

---

## 3. Clear Disclosures on Canvas

- When demo employee simulation is active:
  - Prominent banner: `"📍 Hoạt họa nhân sự (Demo) — Chuyển động minh họa phục vụ trình diễn, không phản ánh vị trí thực tế của nhân viên cảng."`
- When live real assignee layer is active:
  - Discreet banner: `"📍 Người phụ trách phân khu — Vị trí cố định tại điểm neo, không phải vị trí GPS."`
