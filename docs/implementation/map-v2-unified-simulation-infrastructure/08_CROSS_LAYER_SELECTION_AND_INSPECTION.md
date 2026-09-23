# 08 — Cross-Layer Selection & Inspection

## 1. Bidirectional Interaction Flow

The Unified Simulation Infrastructure bridges the physical meters and the utility network via a seamless bidirectional interaction loop:

```mermaid
sequenceDiagram
    participant User
    participant MeterLayer as MapV2MeterLayer
    participant UtilityLayer as MapV2UtilityLayer
    participant Inspector as MapV2InspectionPanel
    participant Workspace as MapV2Workspace

    Note over User, Workspace: Direction 1: Meter -> Host Node Highlight & Trace
    User->>MeterLayer: Click SIM-EM-001
    MeterLayer->>Workspace: onSelect(meter)
    Workspace->>Inspector: Render meter details + Simulation card
    Workspace->>UtilityLayer: Pass selectedMeterCode="SIM-EM-001"
    UtilityLayer->>UtilityLayer: Highlight host SIM-EM-HOST-1 with amber pulsing focus ring
    User->>Inspector: Click "Truy vết tuyến nguồn"
    Inspector->>Workspace: onTraceMeter("SIM-EM-001")
    Workspace->>UtilityLayer: Enable electricity layer + pass externalTracedMeterCode
    UtilityLayer->>UtilityLayer: Render highlighted upstream path to SIM-EXT-GRID

    Note over User, Workspace: Direction 2: Host Node -> Meter Inspection
    User->>UtilityLayer: Click host node SIM-EM-HOST-1
    UtilityLayer->>Workspace: onSelectMeterHost("SIM-EM-HOST-1", "SIM-EM-001")
    Workspace->>Inspector: Open Inspector for SIM-EM-001
    Workspace->>MeterLayer: Highlight SIM-EM-001 pin on canvas
```

## 2. Inspector Disclosure Card

When a simulation meter is selected, `MapV2InspectionPanel` injects an operational simulation metadata card:
- **Hạ tầng mạng**: `SIM-ELECTRICITY-B2` (Điện hạ thế) or `SIM-WATER-B2` (Cấp nước sạch)
- **Điểm đấu nối (Host Node)**: e.g. `SIM-EM-HOST-1`
- **Khu vực kỹ thuật**: e.g. `Cầu cảng chính (ZONE_QUAY)`
- **Nguồn dữ liệu**: `Mô phỏng B2 (Chưa khảo sát thực địa)`
- **Hành động**: Button `Truy vết tuyến nguồn` (Traces upstream network to feeder substation / booster pump).

When a legacy meter (`CT-001..012`) is selected:
- Displays `Dữ liệu kế thừa (Đã ngừng hoạt động)`
- Informs the operator that the meter is preserved for historical baseline comparisons and has no active connection to the B2 distribution network.
