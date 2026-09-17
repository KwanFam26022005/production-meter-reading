# CURRENT COMPONENT MAP & SHARED STATE

## 1. Administrative Component Hierarchy

```
App.tsx
└── OperationalWorkspaceProvider (context: activeTab, focusedEntity, selectedDate, utilityFilter)
    └── AdminShell.tsx (navy sidebar rail: Bản đồ, Lịch ghi, Phân ca, Báo cáo, Nhật ký)
        ├── [activeTab === 'dashboard'] -> AdminDashboard.tsx
        │   └── [viewMode === 'map'] -> MapOperationsPage.tsx
        │       ├── OperationalWorkspaceHeader.tsx (Cockpit: Bản đồ, Mạng lưới, Sổ ca ghi, Kho Thiết bị, Trung tâm Đối soát)
        │       │   └── AdaptiveCommandBar.tsx (docked top controls)
        │       └── ImmersiveSceneShell.tsx
        │           ├── LAYER B: Canvas View
        │           │   ├── [viewMode === 'map'] -> OperationalScene.tsx (SVG Map + PresentationZones + MeterPins + AssetLayer)
        │           │   ├── [viewMode === 'network'] -> UtilityNetworkView.tsx (Layered DAG schematic + tracing)
        │           │   └── [viewMode === 'list'] -> OperationalListView.tsx (Shift reading task table)
        │           ├── LAYER C: HUD Overlays
        │           │   └── SceneControlHUD.tsx
        │           └── LAYER D: Single Context Surface (Invariant: max 1 active)
        │               ├── AssetContextSurface.tsx (when selectedAssetId is set)
        │               └── UnifiedContextSurface.tsx (zone-summary, zone-meters, meter-detail, operator-detail, workflow)
        │
        ├── [activeTab === 'assets'] -> AdminAssets.tsx
        │   ├── OperationalWorkspaceHeader.tsx (currentTab='assets')
        │   ├── FilterToolbar & AssetDataTable
        │   ├── Create/Edit Asset Modal
        │   ├── Link Meter Modal
        │   └── AssetDetailDrawer (internal slide-over)
        │
        ├── [activeTab === 'verification'] -> AdminVerification.tsx
        │   ├── OperationalWorkspaceHeader.tsx (currentTab='verification')
        │   ├── HubTabs (Thẩm định hạ tầng vs Đối soát ca ghi)
        │   ├── VerificationSummaryCards & DataTables
        │   ├── EvidenceAttachmentModal
        │   └── PositionCalibrationModal
        │
        └── [inspectingReadingId] -> AdminReadingInspection.tsx (Full screen crop inspector)
```

---

## 2. Shared Contexts & Hooks

| Shared Artifact | Defined In | Consumed By | Shared Responsibilities |
| :--- | :--- | :--- | :--- |
| `OperationalWorkspaceContext` | `frontend/src/context/` | `App`, `OperationalWorkspaceHeader`, `MapOperationsPage`, `AdminAssets`, `AdminVerification` | `activeTab`, `focusedEntity`, `locateOnMap()`, `openAssetDetails()`, `openVerification()`, `openReadingInspection()`, `utilityFilter` |
| `useMapOperations` | `frontend/src/features/map-operations/hooks/` | `MapOperationsPage` | Fetches `map/overview`, `admin/dashboard`, `map/operators`. Projects `mapMeters`, `mapZones`, `overallKpis` |
| `useMapStateMachine` | `frontend/src/features/map-operations/state/` | `MapOperationsPage` | Invariant enforcement: `selectedEntity` (`zone` \| `operator` \| `meter`), `mapMode` (`browse` \| `inspect` \| `details` \| `placement`) |
| `useMapCalibrationWorkspace`| `frontend/src/features/map-operations/calibration/`| `MapOperationsPage` | Manages `workspaceView` (`map` \| `network` \| `list` \| `calibration`), geometry drafts, publishing pipeline |
| `api.ts` | `frontend/src/services/` | All UI Components | 102 REST API wrapper functions communicating with FastAPI backend |
