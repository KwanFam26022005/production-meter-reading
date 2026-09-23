# 09 — Layer Manager Information Architecture

## 1. Structural Reorganization

To prevent cognitive overload and clearly separate operational truths from simulated visual aids, the Map V2 Layer Manager (`MapV2Layers.tsx`) was reorganized into four distinct canonical groups:

```text
┌────────────────────────────────────────────────────────┐
│                   QUẢN LÝ LỚP BẢN ĐỒ                  │
├────────────────────────────────────────────────────────┤
│ ▼ LỚP TÁC NGHIỆP (OPERATIONAL)                         │
│   ☑ Ranh giới & nhãn khu vực                           │
│   ☑ Điểm đo công tơ                                    │
│   ☑ Người phụ trách (Cố định - Không GPS)              │
│   ☑ Cảnh báo bất thường                                │
├────────────────────────────────────────────────────────┤
│ ▼ MẠNG KỸ THUẬT (SIMULATED NETWORKS)                   │
│   ☐ ⚡ Mạng điện [MÔ PHỎNG]                            │
│   ☐ 💧 Mạng nước [MÔ PHỎNG]                            │
├────────────────────────────────────────────────────────┤
│ ▼ HOẠT HỌA (ANIMATION)                                 │
│   ☐ Nhân sự di chuyển [DEMO]                           │
├────────────────────────────────────────────────────────┤
│ ▼ BẢN ĐỒ NỀN (BASEMAP)                                 │
│   ☑ Mặt bằng công trình & bến bãi                      │
│   ☑ Cổng ra vào & luồng xe                             │
└────────────────────────────────────────────────────────┘
```

## 2. Default Visibility Policy

- **Operational Defaults**: Active by default (Zones, Meters, Stationary Assignees, Anomalies, Basemap).
- **Simulated Networks**: Disabled by default; toggled on demand by the shift engineer or automatically activated when triggering a meter trace.
- **Cosmetic Animation**: Disabled by default (`demoEmployees: false`) to honor Maritime Operational Minimalism and conserve GPU/CPU cycles on rugged port terminals.
