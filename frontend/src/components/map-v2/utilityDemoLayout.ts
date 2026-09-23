/**
 * Map V2 Utility Demo Layout Model
 * Phase 1: Presentation-Only Geometry & Layout Design
 *
 * CANONICAL MAP COORDINATES: 1536 x 1024
 *
 * CRITICAL DESIGN RULES:
 * 1. Strictly separate NETWORK TOPOLOGY (DB authority: A -> B -> C) from DISPLAY GEOMETRY (waypoints).
 * 2. ONLY represents the 8 active electricity demo meters and 4 active water demo meters of tan-thuan-demo-v1.
 * 3. All legacy meters (CT-001..012) and test fixtures are strictly EXCLUDED.
 * 4. All nodes and paths are marked demoOnly: true.
 * 5. This model does NOT mutate or write back to any database.
 */

export type UtilityType = 'ELECTRICITY' | 'WATER';

export type UtilityNodeRole = 'SOURCE' | 'DISTRIBUTION' | 'BRANCH' | 'METER';

export interface UtilityDisplayNode {
  id: string;                    // Asset code, e.g. "SIM-EXT-GRID", "SIM-MDB-01"
  graphNodeId: string;           // Matches DB asset code
  meterCode?: string;            // Present if this node hosts an active demo meter, e.g. "SIM-EM-001"
  label: string;                 // Vietnamese display label
  utilityType: UtilityType;
  nodeRole: UtilityNodeRole;
  displayX: number;              // Canonical 1536x1024 coordinate X
  displayY: number;              // Canonical 1536x1024 coordinate Y
  zoneId: string;                // Canonical Map V2 zone association
  isSource: boolean;
  isMeter: boolean;
  isDistributionNode: boolean;
  depth: number;                 // Graph hierarchy depth (0 = source)
  demoOnly: true;
  provenance: string;            // Audit traceability note
}

export type RouteTier = 'TRUNK' | 'BRANCH' | 'SPUR';

export interface UtilityDisplayEdge {
  id: string;
  graphEdgeId: string;           // Traceability key
  sourceNodeId: string;
  targetNodeId: string;
  utilityType: UtilityType;
  displayPath: [number, number][]; // Ordered canonical 1536x1024 coordinates [[x1, y1], [x2, y2], ...]
  branchDepth: number;           // Hierarchy depth of target
  trunkId: string;               // Named trunk corridor
  routeTier?: RouteTier;         // Visual hierarchy level
  demoOnly: true;
}

export type UtilityLayoutKey = 'A' | 'B' | 'B2' | 'C';

export interface UtilityLayoutConfig {
  key: UtilityLayoutKey;
  name: string;
  strategy: string;
  description: string;
  nodes: UtilityDisplayNode[];
  edges: UtilityDisplayEdge[];
}

export interface UtilityLayoutMetrics {
  layoutName: string;
  totalRouteLength: number;
  totalBends: number;
  sharedTrunkLength: number;
  electricityCrossings: number;
  waterCrossings: number;
  crossUtilityCrossings: number;
  buildingIntersections: number;
  hotspotIntersections: number;
  gateIntersections: number;
  nodeCount: number;
  edgeCount: number;
}

// -----------------------------------------------------------------------------
// AUDITED ACTIVE DEMO METERS INVENTORY (Source of Truth: tan-thuan-demo-v1)
// -----------------------------------------------------------------------------
export const ACTIVE_DEMO_METERS = [
  // 8 Electricity Meters
  { meterCode: 'SIM-EM-001', name: 'Công tơ tổng MDB-01 Trạm kỹ thuật', utilityType: 'ELECTRICITY', hostAsset: 'SIM-MDB-01', pzone: 'pres-technical' },
  { meterCode: 'SIM-EM-002', name: 'Công tơ xuất tuyến Cầu cảng', utilityType: 'ELECTRICITY', hostAsset: 'SIM-FDR-BERTH', pzone: 'pres-berth' },
  { meterCode: 'SIM-EM-003', name: 'Công tơ xuất tuyến Bãi Tây', utilityType: 'ELECTRICITY', hostAsset: 'SIM-FDR-WEST', pzone: 'pres-container-west' },
  { meterCode: 'SIM-EM-004', name: 'Công tơ xuất tuyến Bãi Trung tâm', utilityType: 'ELECTRICITY', hostAsset: 'SIM-FDR-CENTER', pzone: 'pres-container-center' },
  { meterCode: 'SIM-EM-005', name: 'Công tơ xuất tuyến Kho CFS', utilityType: 'ELECTRICITY', hostAsset: 'SIM-FDR-CFS', pzone: 'pres-cfs-east' },
  { meterCode: 'SIM-EM-006', name: 'Công tơ phụ tải Xưởng Cơ điện', utilityType: 'ELECTRICITY', hostAsset: 'SIM-FDR-TECH', pzone: 'pres-technical' },
  { meterCode: 'SIM-EM-007', name: 'Công tơ nhánh Cẩu RTG-W01', utilityType: 'ELECTRICITY', hostAsset: 'SIM-YDB-W01', pzone: 'pres-container-west' },
  { meterCode: 'SIM-EM-008', name: 'Công tơ Giàn lạnh Container', utilityType: 'ELECTRICITY', hostAsset: 'SIM-YDB-C01', pzone: 'pres-container-center' },

  // 4 Water Meters
  { meterCode: 'SIM-WM-001', name: 'Đồng hồ nước tổng Cổng Cảng', utilityType: 'WATER', hostAsset: 'SIM-WIN-01', pzone: 'pres-technical' },
  { meterCode: 'SIM-WM-002', name: 'Đồng hồ nước cấp Cầu tàu', utilityType: 'WATER', hostAsset: 'SIM-WP-B01', pzone: 'pres-berth' },
  { meterCode: 'SIM-WM-003', name: 'Đồng hồ nước sinh hoạt Kho CFS', utilityType: 'WATER', hostAsset: 'SIM-WP-CFS-01', pzone: 'pres-cfs-east' },
  { meterCode: 'SIM-WM-004', name: 'Đồng hồ mạng cấp nước Cứu hỏa', utilityType: 'WATER', hostAsset: 'SIM-FP-01', pzone: 'pres-technical' },
] as const;

// Base definition of the 17 graph nodes represented in the active demo prototype
const BASE_NODES_META: Omit<UtilityDisplayNode, 'displayX' | 'displayY' | 'demoOnly'>[] = [
  // Electricity (11 nodes)
  {
    id: 'SIM-EXT-GRID',
    graphNodeId: 'SIM-EXT-GRID',
    label: 'Lưới 110kV EVN',
    utilityType: 'ELECTRICITY',
    nodeRole: 'SOURCE',
    isSource: true,
    isMeter: false,
    isDistributionNode: false,
    zoneId: 'ZONE_GENERAL',
    depth: 0,
    provenance: 'tan-thuan-demo-v1 (Nguồn điện 110kV tiếp nhận từ EVN)',
  },
  {
    id: 'SIM-SS-01',
    graphNodeId: 'SIM-SS-01',
    label: 'Trạm biến áp SS-01',
    utilityType: 'ELECTRICITY',
    nodeRole: 'DISTRIBUTION',
    isSource: false,
    isMeter: false,
    isDistributionNode: true,
    zoneId: 'ZONE_GENERAL',
    depth: 1,
    provenance: 'tan-thuan-demo-v1 (Trạm biến áp trung tâm SS-01)',
  },
  {
    id: 'SIM-TR-01',
    graphNodeId: 'SIM-TR-01',
    label: 'Máy biến áp TR-01',
    utilityType: 'ELECTRICITY',
    nodeRole: 'DISTRIBUTION',
    isSource: false,
    isMeter: false,
    isDistributionNode: true,
    zoneId: 'ZONE_GENERAL',
    depth: 2,
    provenance: 'tan-thuan-demo-v1 (Máy biến áp tự dùng TR-01)',
  },
  {
    id: 'SIM-MDB-01',
    graphNodeId: 'SIM-MDB-01',
    meterCode: 'SIM-EM-001',
    label: 'Tủ tổng MDB-01',
    utilityType: 'ELECTRICITY',
    nodeRole: 'DISTRIBUTION',
    isSource: false,
    isMeter: true,
    isDistributionNode: true,
    zoneId: 'ZONE_GENERAL',
    depth: 3,
    provenance: 'tan-thuan-demo-v1 (Tủ phân phối tổng MDB-01, gắn SIM-EM-001)',
  },
  {
    id: 'SIM-FDR-BERTH',
    graphNodeId: 'SIM-FDR-BERTH',
    meterCode: 'SIM-EM-002',
    label: 'Tủ Cầu cảng FDR-BERTH',
    utilityType: 'ELECTRICITY',
    nodeRole: 'DISTRIBUTION',
    isSource: false,
    isMeter: true,
    isDistributionNode: true,
    zoneId: 'ZONE_QUAY',
    depth: 4,
    provenance: 'tan-thuan-demo-v1 (Tủ xuất tuyến Cầu cảng, gắn SIM-EM-002)',
  },
  {
    id: 'SIM-FDR-WEST',
    graphNodeId: 'SIM-FDR-WEST',
    meterCode: 'SIM-EM-003',
    label: 'Tủ Bãi Tây FDR-WEST',
    utilityType: 'ELECTRICITY',
    nodeRole: 'DISTRIBUTION',
    isSource: false,
    isMeter: true,
    isDistributionNode: true,
    zoneId: 'ZONE_GENERAL',
    depth: 4,
    provenance: 'tan-thuan-demo-v1 (Tủ xuất tuyến Bãi Tây, gắn SIM-EM-003)',
  },
  {
    id: 'SIM-FDR-CENTER',
    graphNodeId: 'SIM-FDR-CENTER',
    meterCode: 'SIM-EM-004',
    label: 'Tủ Bãi Trung tâm FDR-CENTER',
    utilityType: 'ELECTRICITY',
    nodeRole: 'DISTRIBUTION',
    isSource: false,
    isMeter: true,
    isDistributionNode: true,
    zoneId: 'ZONE_CONTAINER',
    depth: 4,
    provenance: 'tan-thuan-demo-v1 (Tủ xuất tuyến Bãi Trung tâm, gắn SIM-EM-004)',
  },
  {
    id: 'SIM-FDR-CFS',
    graphNodeId: 'SIM-FDR-CFS',
    meterCode: 'SIM-EM-005',
    label: 'Tủ Kho CFS FDR-CFS',
    utilityType: 'ELECTRICITY',
    nodeRole: 'DISTRIBUTION',
    isSource: false,
    isMeter: true,
    isDistributionNode: true,
    zoneId: 'ZONE_CONTAINER',
    depth: 4,
    provenance: 'tan-thuan-demo-v1 (Tủ xuất tuyến Kho CFS, gắn SIM-EM-005)',
  },
  {
    id: 'SIM-FDR-TECH',
    graphNodeId: 'SIM-FDR-TECH',
    meterCode: 'SIM-EM-006',
    label: 'Tủ Kỹ thuật FDR-TECH',
    utilityType: 'ELECTRICITY',
    nodeRole: 'DISTRIBUTION',
    isSource: false,
    isMeter: true,
    isDistributionNode: true,
    zoneId: 'ZONE_GENERAL',
    depth: 4,
    provenance: 'tan-thuan-demo-v1 (Tủ phụ tải Xưởng Cơ điện, gắn SIM-EM-006)',
  },
  {
    id: 'SIM-YDB-W01',
    graphNodeId: 'SIM-YDB-W01',
    meterCode: 'SIM-EM-007',
    label: 'Tủ nhánh Bãi Tây YDB-W01',
    utilityType: 'ELECTRICITY',
    nodeRole: 'BRANCH',
    isSource: false,
    isMeter: true,
    isDistributionNode: false,
    zoneId: 'ZONE_GENERAL',
    depth: 5,
    provenance: 'tan-thuan-demo-v1 (Tủ phân phối nhánh Cẩu RTG-W01, gắn SIM-EM-007)',
  },
  {
    id: 'SIM-YDB-C01',
    graphNodeId: 'SIM-YDB-C01',
    meterCode: 'SIM-EM-008',
    label: 'Tủ nhánh Bãi Trung tâm YDB-C01',
    utilityType: 'ELECTRICITY',
    nodeRole: 'BRANCH',
    isSource: false,
    isMeter: true,
    isDistributionNode: false,
    zoneId: 'ZONE_CONTAINER',
    depth: 5,
    provenance: 'tan-thuan-demo-v1 (Tủ cấp điện Giàn lạnh Container, gắn SIM-EM-008)',
  },

  // Water (6 nodes)
  {
    id: 'SIM-CITY-WATER',
    graphNodeId: 'SIM-CITY-WATER',
    label: 'Nguồn nước TP Sawaco',
    utilityType: 'WATER',
    nodeRole: 'SOURCE',
    isSource: true,
    isMeter: false,
    isDistributionNode: false,
    zoneId: 'ZONE_GENERAL',
    depth: 0,
    provenance: 'tan-thuan-demo-v1 (Điểm đấu nối cấp nước sạch Sawaco)',
  },
  {
    id: 'SIM-WIN-01',
    graphNodeId: 'SIM-WIN-01',
    meterCode: 'SIM-WM-001',
    label: 'Điểm đấu nối nước WIN-01',
    utilityType: 'WATER',
    nodeRole: 'DISTRIBUTION',
    isSource: false,
    isMeter: true,
    isDistributionNode: true,
    zoneId: 'ZONE_GENERAL',
    depth: 1,
    provenance: 'tan-thuan-demo-v1 (Đồng hồ nước tổng Cổng Cảng, gắn SIM-WM-001)',
  },
  {
    id: 'SIM-WJ-01',
    graphNodeId: 'SIM-WJ-01',
    label: 'Cụm van chia nước WJ-01',
    utilityType: 'WATER',
    nodeRole: 'DISTRIBUTION',
    isSource: false,
    isMeter: false,
    isDistributionNode: true,
    zoneId: 'ZONE_GENERAL',
    depth: 2,
    provenance: 'tan-thuan-demo-v1 (Cụm van phân phối nước trung tâm)',
  },
  {
    id: 'SIM-WP-B01',
    graphNodeId: 'SIM-WP-B01',
    meterCode: 'SIM-WM-002',
    label: 'Trụ nước Cầu tàu WP-B01',
    utilityType: 'WATER',
    nodeRole: 'BRANCH',
    isSource: false,
    isMeter: true,
    isDistributionNode: false,
    zoneId: 'ZONE_QUAY',
    depth: 3,
    provenance: 'tan-thuan-demo-v1 (Trụ cấp nước ngọt tàu biển Berths 1-2, gắn SIM-WM-002)',
  },
  {
    id: 'SIM-WP-CFS-01',
    graphNodeId: 'SIM-WP-CFS-01',
    meterCode: 'SIM-WM-003',
    label: 'Điểm nước Kho CFS WP-CFS-01',
    utilityType: 'WATER',
    nodeRole: 'BRANCH',
    isSource: false,
    isMeter: true,
    isDistributionNode: false,
    zoneId: 'ZONE_CONTAINER',
    depth: 3,
    provenance: 'tan-thuan-demo-v1 (Điểm cấp nước sinh hoạt Kho CFS, gắn SIM-WM-003)',
  },
  {
    id: 'SIM-FP-01',
    graphNodeId: 'SIM-FP-01',
    meterCode: 'SIM-WM-004',
    label: 'Trạm bơm PCCC FP-01',
    utilityType: 'WATER',
    nodeRole: 'BRANCH',
    isSource: false,
    isMeter: true,
    isDistributionNode: false,
    zoneId: 'ZONE_GENERAL',
    depth: 3,
    provenance: 'tan-thuan-demo-v1 (Trạm bơm PCCC & tăng áp, gắn SIM-WM-004)',
  },
];

// Helper to build node list with layout-specific coordinates
function buildNodes(coords: Record<string, [number, number]>): UtilityDisplayNode[] {
  return BASE_NODES_META.map((meta) => ({
    ...meta,
    demoOnly: true as const,
    displayX: coords[meta.id][0],
    displayY: coords[meta.id][1],
  }));
}

// -----------------------------------------------------------------------------
// LAYOUT OPTION A: PERIMETER / ROAD-CORRIDOR ROUTING
// -----------------------------------------------------------------------------
const LAYOUT_A_COORDS: Record<string, [number, number]> = {
  'SIM-EXT-GRID': [740, 760],
  'SIM-SS-01': [740, 680],
  'SIM-TR-01': [740, 625],
  'SIM-MDB-01': [740, 575],
  'SIM-FDR-TECH': [670, 575],
  'SIM-FDR-WEST': [480, 575],
  'SIM-YDB-W01': [140, 510],
  'SIM-FDR-BERTH': [520, 360],
  'SIM-FDR-CENTER': [980, 485],
  'SIM-YDB-C01': [1360, 420],
  'SIM-FDR-CFS': [1160, 560],

  'SIM-CITY-WATER': [790, 760],
  'SIM-WIN-01': [790, 690],
  'SIM-WJ-01': [790, 620],
  'SIM-FP-01': [765, 600],
  'SIM-WP-B01': [600, 375],
  'SIM-WP-CFS-01': [1160, 620],
};

export const LAYOUT_A: UtilityLayoutConfig = {
  key: 'A',
  name: 'Phương án A (Perimeter / Road-Corridor)',
  strategy: 'Định tuyến bám sát hành lang đường nội bộ và biên bãi',
  description: 'Các tuyến trục chính chạy bám theo đường nội bộ phía sau bãi (Y=575) và đường tiếp cận trung tâm, mở các nhánh vuông góc rẽ vào thiết bị.',
  nodes: buildNodes(LAYOUT_A_COORDS),
  edges: [
    { id: 'E-A-01', graphEdgeId: 'E-01', sourceNodeId: 'SIM-EXT-GRID', targetNodeId: 'SIM-SS-01', utilityType: 'ELECTRICITY', trunkId: 'TRUNK-E-FEED', branchDepth: 1, demoOnly: true, displayPath: [[740, 760], [740, 680]] },
    { id: 'E-A-02', graphEdgeId: 'E-02', sourceNodeId: 'SIM-SS-01', targetNodeId: 'SIM-TR-01', utilityType: 'ELECTRICITY', trunkId: 'TRUNK-E-FEED', branchDepth: 2, demoOnly: true, displayPath: [[740, 680], [740, 625]] },
    { id: 'E-A-03', graphEdgeId: 'E-03', sourceNodeId: 'SIM-TR-01', targetNodeId: 'SIM-MDB-01', utilityType: 'ELECTRICITY', trunkId: 'TRUNK-E-FEED', branchDepth: 3, demoOnly: true, displayPath: [[740, 625], [740, 575]] },
    { id: 'E-A-04', graphEdgeId: 'E-04', sourceNodeId: 'SIM-MDB-01', targetNodeId: 'SIM-FDR-TECH', utilityType: 'ELECTRICITY', trunkId: 'TRUNK-E-SOUTH', branchDepth: 4, demoOnly: true, displayPath: [[740, 575], [670, 575]] },
    { id: 'E-A-05', graphEdgeId: 'E-05', sourceNodeId: 'SIM-MDB-01', targetNodeId: 'SIM-FDR-WEST', utilityType: 'ELECTRICITY', trunkId: 'TRUNK-E-SOUTH', branchDepth: 4, demoOnly: true, displayPath: [[740, 575], [480, 575]] },
    { id: 'E-A-06', graphEdgeId: 'E-06', sourceNodeId: 'SIM-FDR-WEST', targetNodeId: 'SIM-YDB-W01', utilityType: 'ELECTRICITY', trunkId: 'BRANCH-E-WEST', branchDepth: 5, demoOnly: true, displayPath: [[480, 575], [140, 575], [140, 510]] },
    { id: 'E-A-07', graphEdgeId: 'E-07', sourceNodeId: 'SIM-MDB-01', targetNodeId: 'SIM-FDR-BERTH', utilityType: 'ELECTRICITY', trunkId: 'TRUNK-E-QUAY', branchDepth: 4, demoOnly: true, displayPath: [[740, 575], [740, 360], [520, 360]] },
    { id: 'E-A-08', graphEdgeId: 'E-08', sourceNodeId: 'SIM-MDB-01', targetNodeId: 'SIM-FDR-CENTER', utilityType: 'ELECTRICITY', trunkId: 'TRUNK-E-CENTER', branchDepth: 4, demoOnly: true, displayPath: [[740, 575], [740, 485], [980, 485]] },
    { id: 'E-A-09', graphEdgeId: 'E-09', sourceNodeId: 'SIM-FDR-CENTER', targetNodeId: 'SIM-YDB-C01', utilityType: 'ELECTRICITY', trunkId: 'BRANCH-E-REEFER', branchDepth: 5, demoOnly: true, displayPath: [[980, 485], [1360, 485], [1360, 420]] },
    { id: 'E-A-10', graphEdgeId: 'E-10', sourceNodeId: 'SIM-MDB-01', targetNodeId: 'SIM-FDR-CFS', utilityType: 'ELECTRICITY', trunkId: 'TRUNK-E-CFS', branchDepth: 4, demoOnly: true, displayPath: [[740, 575], [740, 485], [1160, 485], [1160, 560]] },

    { id: 'W-A-01', graphEdgeId: 'W-01', sourceNodeId: 'SIM-CITY-WATER', targetNodeId: 'SIM-WIN-01', utilityType: 'WATER', trunkId: 'TRUNK-W-FEED', branchDepth: 1, demoOnly: true, displayPath: [[790, 760], [790, 690]] },
    { id: 'W-A-02', graphEdgeId: 'W-02', sourceNodeId: 'SIM-WIN-01', targetNodeId: 'SIM-WJ-01', utilityType: 'WATER', trunkId: 'TRUNK-W-FEED', branchDepth: 2, demoOnly: true, displayPath: [[790, 690], [790, 620]] },
    { id: 'W-A-03', graphEdgeId: 'W-03', sourceNodeId: 'SIM-WJ-01', targetNodeId: 'SIM-FP-01', utilityType: 'WATER', trunkId: 'BRANCH-W-PUMP', branchDepth: 3, demoOnly: true, displayPath: [[790, 620], [765, 620], [765, 600]] },
    { id: 'W-A-04', graphEdgeId: 'W-04', sourceNodeId: 'SIM-WJ-01', targetNodeId: 'SIM-WP-B01', utilityType: 'WATER', trunkId: 'TRUNK-W-QUAY', branchDepth: 3, demoOnly: true, displayPath: [[790, 620], [790, 375], [600, 375]] },
    { id: 'W-A-05', graphEdgeId: 'W-05', sourceNodeId: 'SIM-WJ-01', targetNodeId: 'SIM-WP-CFS-01', utilityType: 'WATER', trunkId: 'TRUNK-W-CFS', branchDepth: 3, demoOnly: true, displayPath: [[790, 620], [860, 620], [860, 515], [1160, 515], [1160, 620]] },
  ],
};

// -----------------------------------------------------------------------------
// LAYOUT OPTION B: CENTRAL BACKBONE ROUTING (RECOMMENDED)
// -----------------------------------------------------------------------------
const LAYOUT_B_COORDS: Record<string, [number, number]> = {
  'SIM-EXT-GRID': [750, 760],
  'SIM-SS-01': [750, 690],
  'SIM-TR-01': [750, 630],
  'SIM-MDB-01': [750, 575],
  'SIM-FDR-TECH': [680, 575],
  'SIM-FDR-WEST': [500, 575],
  'SIM-YDB-W01': [140, 510],
  'SIM-FDR-BERTH': [520, 355],
  'SIM-FDR-CENTER': [990, 480],
  'SIM-YDB-C01': [1360, 410],
  'SIM-FDR-CFS': [1160, 555],

  'SIM-CITY-WATER': [790, 760],
  'SIM-WIN-01': [790, 690],
  'SIM-WJ-01': [790, 620],
  'SIM-FP-01': [765, 600],
  'SIM-WP-B01': [610, 375],
  'SIM-WP-CFS-01': [1160, 620],
};

export const LAYOUT_B: UtilityLayoutConfig = {
  key: 'B',
  name: 'Phương án B (Trục xương sống Trung tâm - Khuyến nghị)',
  strategy: 'Trục xương sống trung tâm phân nhánh chữ T trực giao',
  description: 'Thiết lập hai trục xương sống thẳng đứng song song (Điện X=750, Nước X=790). Phân cấp rõ rệt Nguồn -> Trục chính -> Nhánh phân khu, tối ưu độ dài và hạn chế gấp khúc.',
  nodes: buildNodes(LAYOUT_B_COORDS),
  edges: [
    { id: 'E-B-01', graphEdgeId: 'E-01', sourceNodeId: 'SIM-EXT-GRID', targetNodeId: 'SIM-SS-01', utilityType: 'ELECTRICITY', trunkId: 'TRUNK-E-SPINE', branchDepth: 1, demoOnly: true, displayPath: [[750, 760], [750, 690]] },
    { id: 'E-B-02', graphEdgeId: 'E-02', sourceNodeId: 'SIM-SS-01', targetNodeId: 'SIM-TR-01', utilityType: 'ELECTRICITY', trunkId: 'TRUNK-E-SPINE', branchDepth: 2, demoOnly: true, displayPath: [[750, 690], [750, 630]] },
    { id: 'E-B-03', graphEdgeId: 'E-03', sourceNodeId: 'SIM-TR-01', targetNodeId: 'SIM-MDB-01', utilityType: 'ELECTRICITY', trunkId: 'TRUNK-E-SPINE', branchDepth: 3, demoOnly: true, displayPath: [[750, 630], [750, 575]] },
    { id: 'E-B-04', graphEdgeId: 'E-04', sourceNodeId: 'SIM-MDB-01', targetNodeId: 'SIM-FDR-TECH', utilityType: 'ELECTRICITY', trunkId: 'BRANCH-E-TECH', branchDepth: 4, demoOnly: true, displayPath: [[750, 575], [680, 575]] },
    { id: 'E-B-05', graphEdgeId: 'E-05', sourceNodeId: 'SIM-MDB-01', targetNodeId: 'SIM-FDR-WEST', utilityType: 'ELECTRICITY', trunkId: 'BRANCH-E-WEST', branchDepth: 4, demoOnly: true, displayPath: [[750, 575], [500, 575]] },
    { id: 'E-B-06', graphEdgeId: 'E-06', sourceNodeId: 'SIM-FDR-WEST', targetNodeId: 'SIM-YDB-W01', utilityType: 'ELECTRICITY', trunkId: 'BRANCH-E-WEST-EXT', branchDepth: 5, demoOnly: true, displayPath: [[500, 575], [140, 575], [140, 510]] },
    { id: 'E-B-07', graphEdgeId: 'E-07', sourceNodeId: 'SIM-MDB-01', targetNodeId: 'SIM-FDR-BERTH', utilityType: 'ELECTRICITY', trunkId: 'TRUNK-E-QUAY', branchDepth: 4, demoOnly: true, displayPath: [[750, 575], [750, 355], [520, 355]] },
    { id: 'E-B-08', graphEdgeId: 'E-08', sourceNodeId: 'SIM-MDB-01', targetNodeId: 'SIM-FDR-CENTER', utilityType: 'ELECTRICITY', trunkId: 'BRANCH-E-CENTER', branchDepth: 4, demoOnly: true, displayPath: [[750, 575], [750, 480], [990, 480]] },
    { id: 'E-B-09', graphEdgeId: 'E-09', sourceNodeId: 'SIM-FDR-CENTER', targetNodeId: 'SIM-YDB-C01', utilityType: 'ELECTRICITY', trunkId: 'BRANCH-E-REEFER', branchDepth: 5, demoOnly: true, displayPath: [[990, 480], [1360, 480], [1360, 410]] },
    { id: 'E-B-10', graphEdgeId: 'E-10', sourceNodeId: 'SIM-MDB-01', targetNodeId: 'SIM-FDR-CFS', utilityType: 'ELECTRICITY', trunkId: 'BRANCH-E-CFS', branchDepth: 4, demoOnly: true, displayPath: [[750, 575], [750, 480], [1160, 480], [1160, 555]] },

    { id: 'W-B-01', graphEdgeId: 'W-01', sourceNodeId: 'SIM-CITY-WATER', targetNodeId: 'SIM-WIN-01', utilityType: 'WATER', trunkId: 'TRUNK-W-SPINE', branchDepth: 1, demoOnly: true, displayPath: [[790, 760], [790, 690]] },
    { id: 'W-B-02', graphEdgeId: 'W-02', sourceNodeId: 'SIM-WIN-01', targetNodeId: 'SIM-WJ-01', utilityType: 'WATER', trunkId: 'TRUNK-W-SPINE', branchDepth: 2, demoOnly: true, displayPath: [[790, 690], [790, 620]] },
    { id: 'W-B-03', graphEdgeId: 'W-03', sourceNodeId: 'SIM-WJ-01', targetNodeId: 'SIM-FP-01', utilityType: 'WATER', trunkId: 'BRANCH-W-PUMP', branchDepth: 3, demoOnly: true, displayPath: [[790, 620], [765, 620], [765, 600]] },
    { id: 'W-B-04', graphEdgeId: 'W-04', sourceNodeId: 'SIM-WJ-01', targetNodeId: 'SIM-WP-B01', utilityType: 'WATER', trunkId: 'TRUNK-W-QUAY', branchDepth: 3, demoOnly: true, displayPath: [[790, 620], [790, 375], [610, 375]] },
    { id: 'W-B-05', graphEdgeId: 'W-05', sourceNodeId: 'SIM-WJ-01', targetNodeId: 'SIM-WP-CFS-01', utilityType: 'WATER', trunkId: 'BRANCH-W-CFS', branchDepth: 3, demoOnly: true, displayPath: [[790, 620], [860, 620], [860, 515], [1160, 515], [1160, 620]] },
  ],
};

// -----------------------------------------------------------------------------
// LAYOUT OPTION B2: REFINED CENTRAL BACKBONE (FROZEN PHASE 2 BASELINE)
// -----------------------------------------------------------------------------
export const LAYOUT_B2_COORDS: Record<string, [number, number]> = {
  'SIM-EXT-GRID': [700, 755],     // Staggered SW, separated from SIM-CITY-WATER by 115.8px
  'SIM-SS-01': [740, 680],        // Substation on X=740 spine
  'SIM-TR-01': [740, 625],        // Transformer on X=740 spine
  'SIM-MDB-01': [740, 570],       // Master distribution cabinet (hosts SIM-EM-001)
  'SIM-FDR-TECH': [670, 570],      // Technical feeder
  'SIM-FDR-WEST': [470, 570],      // West yard feeder
  'SIM-YDB-W01': [140, 510],      // West yard terminal RTG spur
  'SIM-FDR-BERTH': [520, 355],     // Berth feeder
  'SIM-FDR-CENTER': [990, 480],    // Center container yard feeder
  'SIM-YDB-C01': [1360, 410],     // Container reefer terminal spur
  'SIM-FDR-CFS': [1160, 555],     // CFS warehouse feeder

  'SIM-CITY-WATER': [815, 770],    // Staggered SE, separated from SIM-EXT-GRID by 115.8px, safe from Gate B
  'SIM-WIN-01': [800, 690],       // Port intake meter point (hosts SIM-WM-001)
  'SIM-WJ-01': [800, 625],        // Water junction valve
  'SIM-FP-01': [840, 625],        // Fire pump (hosts SIM-WM-004) - East side branch (0 crossings)
  'SIM-WP-B01': [610, 375],       // Quay water hydrant (hosts SIM-WM-002)
  'SIM-WP-CFS-01': [1160, 620],   // CFS water branch (hosts SIM-WM-003)
};

export const LAYOUT_B2: UtilityLayoutConfig = {
  key: 'B2',
  name: 'Phương án B2 (Trục xương sống Tinh chỉnh — Chuẩn Băng thông)',
  strategy: 'Trục xương sống kép tinh chỉnh phân tán nguồn và tối ưu giao cắt',
  description: 'Tách biệt hai nút nguồn > 115px, chuyển nhánh PCCC sang phía Đông và tuyến nước Cầu cảng lách trực giao tại Y=520, giảm triệt để số điểm giao cắt xuống còn đúng 1 điểm vuông góc duy nhất.',
  nodes: buildNodes(LAYOUT_B2_COORDS),
  edges: [
    // Electricity (10 edges)
    { id: 'E-B2-01', graphEdgeId: 'E-01', sourceNodeId: 'SIM-EXT-GRID', targetNodeId: 'SIM-SS-01', utilityType: 'ELECTRICITY', trunkId: 'TRUNK-E-FEED', branchDepth: 1, routeTier: 'TRUNK', demoOnly: true, displayPath: [[700, 755], [740, 755], [740, 680]] },
    { id: 'E-B2-02', graphEdgeId: 'E-02', sourceNodeId: 'SIM-SS-01', targetNodeId: 'SIM-TR-01', utilityType: 'ELECTRICITY', trunkId: 'TRUNK-E-SPINE', branchDepth: 2, routeTier: 'TRUNK', demoOnly: true, displayPath: [[740, 680], [740, 625]] },
    { id: 'E-B2-03', graphEdgeId: 'E-03', sourceNodeId: 'SIM-TR-01', targetNodeId: 'SIM-MDB-01', utilityType: 'ELECTRICITY', trunkId: 'TRUNK-E-SPINE', branchDepth: 3, routeTier: 'TRUNK', demoOnly: true, displayPath: [[740, 625], [740, 570]] },
    { id: 'E-B2-04', graphEdgeId: 'E-04', sourceNodeId: 'SIM-MDB-01', targetNodeId: 'SIM-FDR-TECH', utilityType: 'ELECTRICITY', trunkId: 'BRANCH-E-TECH', branchDepth: 4, routeTier: 'BRANCH', demoOnly: true, displayPath: [[740, 570], [670, 570]] },
    { id: 'E-B2-05', graphEdgeId: 'E-05', sourceNodeId: 'SIM-MDB-01', targetNodeId: 'SIM-FDR-WEST', utilityType: 'ELECTRICITY', trunkId: 'BRANCH-E-WEST', branchDepth: 4, routeTier: 'BRANCH', demoOnly: true, displayPath: [[740, 570], [470, 570]] },
    { id: 'E-B2-06', graphEdgeId: 'E-06', sourceNodeId: 'SIM-FDR-WEST', targetNodeId: 'SIM-YDB-W01', utilityType: 'ELECTRICITY', trunkId: 'SPUR-E-RTG', branchDepth: 5, routeTier: 'SPUR', demoOnly: true, displayPath: [[470, 570], [140, 570], [140, 510]] },
    { id: 'E-B2-07', graphEdgeId: 'E-07', sourceNodeId: 'SIM-MDB-01', targetNodeId: 'SIM-FDR-BERTH', utilityType: 'ELECTRICITY', trunkId: 'BRANCH-E-QUAY', branchDepth: 4, routeTier: 'BRANCH', demoOnly: true, displayPath: [[740, 570], [740, 355], [520, 355]] },
    { id: 'E-B2-08', graphEdgeId: 'E-08', sourceNodeId: 'SIM-MDB-01', targetNodeId: 'SIM-FDR-CENTER', utilityType: 'ELECTRICITY', trunkId: 'BRANCH-E-CENTER', branchDepth: 4, routeTier: 'BRANCH', demoOnly: true, displayPath: [[740, 570], [740, 480], [990, 480]] },
    { id: 'E-B2-09', graphEdgeId: 'E-09', sourceNodeId: 'SIM-FDR-CENTER', targetNodeId: 'SIM-YDB-C01', utilityType: 'ELECTRICITY', trunkId: 'SPUR-E-REEFER', branchDepth: 5, routeTier: 'SPUR', demoOnly: true, displayPath: [[990, 480], [1360, 480], [1360, 410]] },
    { id: 'E-B2-10', graphEdgeId: 'E-10', sourceNodeId: 'SIM-MDB-01', targetNodeId: 'SIM-FDR-CFS', utilityType: 'ELECTRICITY', trunkId: 'BRANCH-E-CFS', branchDepth: 4, routeTier: 'BRANCH', demoOnly: true, displayPath: [[740, 570], [740, 480], [1160, 480], [1160, 555]] },

    // Water (5 edges)
    { id: 'W-B2-01', graphEdgeId: 'W-01', sourceNodeId: 'SIM-CITY-WATER', targetNodeId: 'SIM-WIN-01', utilityType: 'WATER', trunkId: 'TRUNK-W-FEED', branchDepth: 1, routeTier: 'TRUNK', demoOnly: true, displayPath: [[815, 770], [800, 770], [800, 690]] },
    { id: 'W-B2-02', graphEdgeId: 'W-02', sourceNodeId: 'SIM-WIN-01', targetNodeId: 'SIM-WJ-01', utilityType: 'WATER', trunkId: 'TRUNK-W-SPINE', branchDepth: 2, routeTier: 'TRUNK', demoOnly: true, displayPath: [[800, 690], [800, 625]] },
    { id: 'W-B2-03', graphEdgeId: 'W-03', sourceNodeId: 'SIM-WJ-01', targetNodeId: 'SIM-FP-01', utilityType: 'WATER', trunkId: 'BRANCH-W-PUMP', branchDepth: 3, routeTier: 'BRANCH', demoOnly: true, displayPath: [[800, 625], [840, 625]] },
    { id: 'W-B2-04', graphEdgeId: 'W-04', sourceNodeId: 'SIM-WJ-01', targetNodeId: 'SIM-WP-B01', utilityType: 'WATER', trunkId: 'BRANCH-W-QUAY', branchDepth: 3, routeTier: 'BRANCH', demoOnly: true, displayPath: [[800, 625], [800, 520], [705, 520], [705, 375], [610, 375]] },
    { id: 'W-B2-05', graphEdgeId: 'W-05', sourceNodeId: 'SIM-WJ-01', targetNodeId: 'SIM-WP-CFS-01', utilityType: 'WATER', trunkId: 'BRANCH-W-CFS', branchDepth: 3, routeTier: 'BRANCH', demoOnly: true, displayPath: [[800, 625], [860, 625], [860, 520], [1160, 520], [1160, 620]] },
  ],
};

// -----------------------------------------------------------------------------
// LAYOUT OPTION C: ZONE-BASED DISTRIBUTION
// -----------------------------------------------------------------------------
const LAYOUT_C_COORDS: Record<string, [number, number]> = {
  'SIM-EXT-GRID': [730, 760],
  'SIM-SS-01': [730, 680],
  'SIM-TR-01': [730, 620],
  'SIM-MDB-01': [730, 565],
  'SIM-FDR-TECH': [670, 565],
  'SIM-FDR-WEST': [470, 565],
  'SIM-YDB-W01': [150, 515],
  'SIM-FDR-BERTH': [530, 350],
  'SIM-FDR-CENTER': [970, 475],
  'SIM-YDB-C01': [1350, 415],
  'SIM-FDR-CFS': [1150, 565],

  'SIM-CITY-WATER': [800, 760],
  'SIM-WIN-01': [800, 695],
  'SIM-WJ-01': [800, 625],
  'SIM-FP-01': [770, 605],
  'SIM-WP-B01': [610, 370],
  'SIM-WP-CFS-01': [1150, 625],
};

export const LAYOUT_C: UtilityLayoutConfig = {
  key: 'C',
  name: 'Phương án C (Zone-Based Distribution)',
  strategy: 'Phân phối tập trung theo cụm phân khu vận hành',
  description: 'Các tuyến xuất từ MDB-01 gom theo từng phân khu lớn (Cụm Bãi tổng hợp, Cụm Cầu cảng, Cụm Container & CFS) tạo cảm giác phân vùng độc lập.',
  nodes: buildNodes(LAYOUT_C_COORDS),
  edges: [
    { id: 'E-C-01', graphEdgeId: 'E-01', sourceNodeId: 'SIM-EXT-GRID', targetNodeId: 'SIM-SS-01', utilityType: 'ELECTRICITY', trunkId: 'HUB-MAIN', branchDepth: 1, demoOnly: true, displayPath: [[730, 760], [730, 680]] },
    { id: 'E-C-02', graphEdgeId: 'E-02', sourceNodeId: 'SIM-SS-01', targetNodeId: 'SIM-TR-01', utilityType: 'ELECTRICITY', trunkId: 'HUB-MAIN', branchDepth: 2, demoOnly: true, displayPath: [[730, 680], [730, 620]] },
    { id: 'E-C-03', graphEdgeId: 'E-03', sourceNodeId: 'SIM-TR-01', targetNodeId: 'SIM-MDB-01', utilityType: 'ELECTRICITY', trunkId: 'HUB-MAIN', branchDepth: 3, demoOnly: true, displayPath: [[730, 620], [730, 565]] },
    { id: 'E-C-04', graphEdgeId: 'E-04', sourceNodeId: 'SIM-MDB-01', targetNodeId: 'SIM-FDR-TECH', utilityType: 'ELECTRICITY', trunkId: 'HUB-TECH', branchDepth: 4, demoOnly: true, displayPath: [[730, 565], [670, 565]] },
    { id: 'E-C-05', graphEdgeId: 'E-05', sourceNodeId: 'SIM-MDB-01', targetNodeId: 'SIM-FDR-WEST', utilityType: 'ELECTRICITY', trunkId: 'HUB-GENERAL', branchDepth: 4, demoOnly: true, displayPath: [[730, 565], [470, 565]] },
    { id: 'E-C-06', graphEdgeId: 'E-06', sourceNodeId: 'SIM-FDR-WEST', targetNodeId: 'SIM-YDB-W01', utilityType: 'ELECTRICITY', trunkId: 'HUB-GENERAL-EXT', branchDepth: 5, demoOnly: true, displayPath: [[470, 565], [150, 565], [150, 515]] },
    { id: 'E-C-07', graphEdgeId: 'E-07', sourceNodeId: 'SIM-MDB-01', targetNodeId: 'SIM-FDR-BERTH', utilityType: 'ELECTRICITY', trunkId: 'HUB-QUAY', branchDepth: 4, demoOnly: true, displayPath: [[730, 565], [730, 350], [530, 350]] },
    { id: 'E-C-08', graphEdgeId: 'E-08', sourceNodeId: 'SIM-MDB-01', targetNodeId: 'SIM-FDR-CENTER', utilityType: 'ELECTRICITY', trunkId: 'HUB-CONTAINER', branchDepth: 4, demoOnly: true, displayPath: [[730, 565], [730, 475], [970, 475]] },
    { id: 'E-C-09', graphEdgeId: 'E-09', sourceNodeId: 'SIM-FDR-CENTER', targetNodeId: 'SIM-YDB-C01', utilityType: 'ELECTRICITY', trunkId: 'HUB-CONTAINER-EXT', branchDepth: 5, demoOnly: true, displayPath: [[970, 475], [1350, 475], [1350, 415]] },
    { id: 'E-C-10', graphEdgeId: 'E-10', sourceNodeId: 'SIM-MDB-01', targetNodeId: 'SIM-FDR-CFS', utilityType: 'ELECTRICITY', trunkId: 'HUB-CFS', branchDepth: 4, demoOnly: true, displayPath: [[730, 565], [730, 475], [1150, 475], [1150, 565]] },

    { id: 'W-C-01', graphEdgeId: 'W-01', sourceNodeId: 'SIM-CITY-WATER', targetNodeId: 'SIM-WIN-01', utilityType: 'WATER', trunkId: 'HUB-WATER-FEED', branchDepth: 1, demoOnly: true, displayPath: [[800, 760], [800, 695]] },
    { id: 'W-C-02', graphEdgeId: 'W-02', sourceNodeId: 'SIM-WIN-01', targetNodeId: 'SIM-WJ-01', utilityType: 'WATER', trunkId: 'HUB-WATER-FEED', branchDepth: 2, demoOnly: true, displayPath: [[800, 695], [800, 625]] },
    { id: 'W-C-03', graphEdgeId: 'W-03', sourceNodeId: 'SIM-WJ-01', targetNodeId: 'SIM-FP-01', utilityType: 'WATER', trunkId: 'HUB-WATER-TECH', branchDepth: 3, demoOnly: true, displayPath: [[800, 625], [770, 625], [770, 605]] },
    { id: 'W-C-04', graphEdgeId: 'W-04', sourceNodeId: 'SIM-WJ-01', targetNodeId: 'SIM-WP-B01', utilityType: 'WATER', trunkId: 'HUB-WATER-QUAY', branchDepth: 3, demoOnly: true, displayPath: [[800, 625], [800, 370], [610, 370]] },
    { id: 'W-C-05', graphEdgeId: 'W-05', sourceNodeId: 'SIM-WJ-01', targetNodeId: 'SIM-WP-CFS-01', utilityType: 'WATER', trunkId: 'HUB-WATER-CFS', branchDepth: 3, demoOnly: true, displayPath: [[800, 625], [870, 625], [870, 520], [1150, 520], [1150, 625]] },
  ],
};

export const UTILITY_LAYOUTS: Record<UtilityLayoutKey, UtilityLayoutConfig> = {
  A: LAYOUT_A,
  B: LAYOUT_B,
  B2: LAYOUT_B2,
  C: LAYOUT_C,
};

export const RECOMMENDED_LAYOUT_KEY: UtilityLayoutKey = 'B2';

export function getUtilityLayout(key: UtilityLayoutKey = RECOMMENDED_LAYOUT_KEY): UtilityLayoutConfig {
  return UTILITY_LAYOUTS[key] || LAYOUT_B2;
}
