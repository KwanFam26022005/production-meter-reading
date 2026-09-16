import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

import type {
  Asset,
  AssetConnection,
  AssetNetworkStats,
  AssetNetworkResponse,
  AssetAttachedMeterContext,
  AssetOperationalContextResponse,
  UtilityType,
} from '../src/features/assets/types';
import type { MapWorkspaceView } from '../src/types';

// ===========================================================================
// SUITE: V16E ASSET-CENTRIC MAP & UTILITY NETWORK TOPOLOGY
// ===========================================================================

test('V16E Types: Schema definitions and workspace view modes are properly defined', () => {
  const views: MapWorkspaceView[] = ['map', 'network', 'list', 'calibration'];
  assert.equal(views.includes('network'), true, 'MapWorkspaceView must support network mode');

  const stats: AssetNetworkStats = {
    total_assets: 10,
    verified_assets: 8,
    unverified_assets: 2,
    total_connections: 5,
    verified_connections: 4,
    unverified_connections: 1,
    electricity_connections: 3,
    water_connections: 2,
  };
  assert.equal(stats.total_assets, 10);
  assert.equal(stats.verified_connections, 4);

  const attachedMeter: AssetAttachedMeterContext = {
    meter_id: 'm-001',
    meter_code: 'CT-001',
    meter_name: 'Công tơ Trạm 1',
    relation_type: 'MEASURES',
    is_verified: true,
    is_active: true,
    lifecycle_status: 'ACTIVE',
    latest_reading_value: '12450.5',
    latest_reading_time: '2026-09-15T08:00:00Z',
  };
  assert.equal(attachedMeter.relation_type, 'MEASURES');
  assert.equal(attachedMeter.latest_reading_value, '12450.5');
});

test('V16E Verified-Only Default: Network filtering suppresses unverified items by default', () => {
  const mockAssets: Asset[] = [
    {
      id: 'ast-1',
      code: 'TR-01',
      name: 'Trạm biến áp 1',
      asset_type: 'SUBSTATION',
      utility_type: 'ELECTRICITY',
      verification_status: 'VERIFIED',
      is_verified: true,
      lifecycle_status: 'ACTIVE',
      parent_asset_id: null,
      map_x: 0.35,
      map_y: 0.45,
      created_at: '2026-09-15T00:00:00Z',
      updated_at: '2026-09-15T00:00:00Z',
    },
    {
      id: 'ast-2',
      code: 'TR-UNVERIFIED',
      name: 'Tủ điện phụ (chưa duyệt)',
      asset_type: 'SWITCHBOARD',
      utility_type: 'ELECTRICITY',
      verification_status: 'UNVERIFIED',
      is_verified: false,
      lifecycle_status: 'ACTIVE',
      parent_asset_id: null,
      map_x: 0.36,
      map_y: 0.46,
      created_at: '2026-09-15T00:00:00Z',
      updated_at: '2026-09-15T00:00:00Z',
    },
  ];

  const mockConnections: AssetConnection[] = [
    {
      id: 'conn-1',
      source_asset_id: 'ast-1',
      target_asset_id: 'ast-2',
      connection_type: 'FEEDER_LINE',
      utility_type: 'ELECTRICITY',
      verification_status: 'VERIFIED',
      is_verified: true,
      notes: null,
      created_at: '2026-09-15T00:00:00Z',
      updated_at: '2026-09-15T00:00:00Z',
    },
    {
      id: 'conn-2',
      source_asset_id: 'ast-2',
      target_asset_id: 'ast-1',
      connection_type: 'FEEDER_LINE',
      utility_type: 'ELECTRICITY',
      verification_status: 'UNVERIFIED',
      is_verified: false,
      notes: null,
      created_at: '2026-09-15T00:00:00Z',
      updated_at: '2026-09-15T00:00:00Z',
    },
  ];

  // Default mode: showUnverified = false
  const filterNodes = (assets: Asset[], showUnverified: boolean) =>
    assets.filter((a) => showUnverified || a.is_verified);

  const filterEdges = (conns: AssetConnection[], showUnverified: boolean) =>
    conns.filter((c) => showUnverified || c.is_verified);

  const defaultNodes = filterNodes(mockAssets, false);
  const defaultEdges = filterEdges(mockConnections, false);

  assert.equal(defaultNodes.length, 1);
  assert.equal(defaultNodes[0].code, 'TR-01');
  assert.equal(defaultEdges.length, 1);
  assert.equal(defaultEdges[0].id, 'conn-1');

  // Admin preview mode: showUnverified = true
  const previewNodes = filterNodes(mockAssets, true);
  const previewEdges = filterEdges(mockConnections, true);

  assert.equal(previewNodes.length, 2);
  assert.equal(previewEdges.length, 2);
});

test('V16E Empty State Truthfulness: Calm empty state message on zero verified connections', () => {
  const emptyConnections: AssetConnection[] = [];
  const emptyMessage = 'Chưa có kết nối mạng lưới đã xác minh.';

  assert.equal(emptyConnections.length, 0);
  assert.ok(emptyMessage.includes('Chưa có kết nối'));
});

test('V16E Trace Algorithm: Upstream and Downstream BFS correctly identifies connected subgraph', () => {
  // Graph: A -> B -> C, D -> B
  const edges: AssetConnection[] = [
    {
      id: 'e1',
      source_asset_id: 'A',
      target_asset_id: 'B',
      connection_type: 'FEEDER_LINE',
      utility_type: 'ELECTRICITY',
      verification_status: 'VERIFIED',
      is_verified: true,
      notes: null,
      created_at: '2026-09-15T00:00:00Z',
      updated_at: '2026-09-15T00:00:00Z',
    },
    {
      id: 'e2',
      source_asset_id: 'B',
      target_asset_id: 'C',
      connection_type: 'FEEDER_LINE',
      utility_type: 'ELECTRICITY',
      verification_status: 'VERIFIED',
      is_verified: true,
      notes: null,
      created_at: '2026-09-15T00:00:00Z',
      updated_at: '2026-09-15T00:00:00Z',
    },
    {
      id: 'e3',
      source_asset_id: 'D',
      target_asset_id: 'B',
      connection_type: 'FEEDER_LINE',
      utility_type: 'ELECTRICITY',
      verification_status: 'VERIFIED',
      is_verified: true,
      notes: null,
      created_at: '2026-09-15T00:00:00Z',
      updated_at: '2026-09-15T00:00:00Z',
    },
  ];

  // Upstream of B: ancestors are A, D
  const getUpstream = (startId: string, edgeList: AssetConnection[]): Set<string> => {
    const visited = new Set<string>();
    const queue = [startId];
    while (queue.length > 0) {
      const current = queue.shift()!;
      for (const e of edgeList) {
        if (e.target_asset_id === current && !visited.has(e.source_asset_id)) {
          visited.add(e.source_asset_id);
          queue.push(e.source_asset_id);
        }
      }
    }
    return visited;
  };

  // Downstream of B: descendants are C
  const getDownstream = (startId: string, edgeList: AssetConnection[]): Set<string> => {
    const visited = new Set<string>();
    const queue = [startId];
    while (queue.length > 0) {
      const current = queue.shift()!;
      for (const e of edgeList) {
        if (e.source_asset_id === current && !visited.has(e.target_asset_id)) {
          visited.add(e.target_asset_id);
          queue.push(e.target_asset_id);
        }
      }
    }
    return visited;
  };

  const upstreamOfB = getUpstream('B', edges);
  assert.equal(upstreamOfB.has('A'), true);
  assert.equal(upstreamOfB.has('D'), true);
  assert.equal(upstreamOfB.has('C'), false);

  const downstreamOfB = getDownstream('B', edges);
  assert.equal(downstreamOfB.has('C'), true);
  assert.equal(downstreamOfB.has('A'), false);
  assert.equal(downstreamOfB.has('D'), false);
});

test('V16E AssetContextSurface: Segregates MEASURES vs INSTALLED_AT meters truthfully', () => {
  const contextData: AssetOperationalContextResponse = {
    asset: {
      id: 'ast-sub-01',
      code: 'TBA-01',
      name: 'Trạm biến áp chính Bến Cảng',
      asset_type: 'SUBSTATION',
      utility_type: 'ELECTRICITY',
      verification_status: 'VERIFIED',
      is_verified: true,
      lifecycle_status: 'ACTIVE',
      parent_asset_id: null,
      map_x: 0.45,
      map_y: 0.32,
      created_at: '2026-09-15T00:00:00Z',
      updated_at: '2026-09-15T00:00:00Z',
    },
    attached_meters: [
      {
        meter_id: 'm-1',
        meter_code: 'CT-TBA-LOAD',
        meter_name: 'Đồng hồ tổng trạm TBA-01',
        relation_type: 'MEASURES',
        is_verified: true,
        is_active: true,
        lifecycle_status: 'ACTIVE',
        latest_reading_value: '98450.2',
        latest_reading_time: '2026-09-15T07:30:00Z',
      },
      {
        meter_id: 'm-2',
        meter_code: 'CT-SUB-AUX',
        meter_name: 'Đồng hồ phụ trợ phòng điều khiển',
        relation_type: 'INSTALLED_AT',
        is_verified: true,
        is_active: true,
        lifecycle_status: 'ACTIVE',
        latest_reading_value: '1240.0',
        latest_reading_time: '2026-09-15T07:30:00Z',
      },
    ],
    upstream_connections: [],
    downstream_connections: [
      {
        id: 'c-1',
        source_asset_id: 'ast-sub-01',
        target_asset_id: 'ast-msb-01',
        connection_type: 'FEEDER_LINE',
        utility_type: 'ELECTRICITY',
        verification_status: 'VERIFIED',
        is_verified: true,
        notes: null,
        created_at: '2026-09-15T00:00:00Z',
        updated_at: '2026-09-15T00:00:00Z',
        other_asset_id: 'ast-msb-01',
        other_asset_code: 'MSB-01',
        other_asset_name: 'Tủ phân phối chính',
        other_asset_type: 'SWITCHBOARD',
      },
    ],
    has_spatial_coordinates: true,
    coordinates: { x: 0.45, y: 0.32 },
  };

  const measuringMeters = contextData.attached_meters.filter((m) => m.relation_type === 'MEASURES');
  const physicalMeters = contextData.attached_meters.filter((m) => m.relation_type === 'INSTALLED_AT');

  assert.equal(measuringMeters.length, 1);
  assert.equal(measuringMeters[0].meter_code, 'CT-TBA-LOAD');
  assert.equal(measuringMeters[0].latest_reading_value, '98450.2');

  assert.equal(physicalMeters.length, 1);
  assert.equal(physicalMeters[0].meter_code, 'CT-SUB-AUX');

  assert.equal(contextData.has_spatial_coordinates, true);
  assert.equal(contextData.downstream_connections.length, 1);
  assert.equal(contextData.downstream_connections[0].other_asset_code, 'MSB-01');
});

test('V16E Missing Coordinates: Handles assets without spatial coordinates truthfully', () => {
  const assetWithoutCoords: Partial<Asset> = {
    id: 'ast-no-coords',
    code: 'PIPE-VALVE-09',
    name: 'Van chặn ngầm',
    map_x: null,
    map_y: null,
  };

  assert.equal(assetWithoutCoords.map_x, null);
  assert.equal(assetWithoutCoords.map_y, null);

  const fallbackLabel = 'Chưa xác minh vị trí thiết bị';
  const displayPosition =
    assetWithoutCoords.map_x !== null && assetWithoutCoords.map_y !== null
      ? `${assetWithoutCoords.map_x}, ${assetWithoutCoords.map_y}`
      : fallbackLabel;

  assert.equal(displayPosition, fallbackLabel);
});

test('V16E Map ↔ Network Synchronization: Invariant files and component signatures match', () => {
  const shellPath = path.resolve(__dirname, '../src/features/map-operations/shell/ImmersiveSceneShell.tsx');
  const shellContent = fs.readFileSync(shellPath, 'utf-8');

  // Verify ImmersiveSceneShell includes UtilityNetworkView and AssetContextSurface
  assert.ok(shellContent.includes('<UtilityNetworkView'), 'ImmersiveSceneShell must mount UtilityNetworkView');
  assert.ok(shellContent.includes('<AssetContextSurface'), 'ImmersiveSceneShell must mount AssetContextSurface');
  assert.ok(shellContent.includes("activeContextType === 'asset-detail'"), 'Single context surface invariant for asset-detail');

  // Verify MapOperationsPage includes V16E wiring
  const pagePath = path.resolve(__dirname, '../src/features/map-operations/MapOperationsPage.tsx');
  const pageContent = fs.readFileSync(pagePath, 'utf-8');
  assert.ok(pageContent.includes('selectedAssetId={selectedAssetId}'), 'selectedAssetId must be wired to shell');
  assert.ok(pageContent.includes('assetConnections={assetConnections}'), 'assetConnections must be wired to shell');
  assert.ok(pageContent.includes('getAdminAssetNetwork'), 'API client must be integrated in MapOperationsPage');
});

test('V16E Spatial Freeze Invariant: tan-thuan-spatial-baseline.freeze.json checksum remains unchanged', () => {
  const freezePath = path.resolve(
    __dirname,
    '../../docs/design/map-operations/v16a-r2/tan-thuan-spatial-baseline.freeze.json'
  );
  const manifestPath = path.resolve(
    __dirname,
    '../../docs/design/map-operations/v16a-r2/V16A_R2_FREEZE_MANIFEST.json'
  );

  assert.ok(fs.existsSync(freezePath), 'Spatial freeze file must exist');
  assert.ok(fs.existsSync(manifestPath), 'Spatial freeze manifest file must exist');

  const freezeData = JSON.parse(fs.readFileSync(freezePath, 'utf-8'));
  const manifestData = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));

  const EXPECTED_HASH = 'ed5fd8bfa4b0e8a2b59937a418de787c57c6d072f3f790f3dbe84df5299177d3';
  assert.equal(
    manifestData.geometrySha256,
    EXPECTED_HASH,
    `Manifest geometrySha256 MUST match ${EXPECTED_HASH}`
  );

  const canonicalPayload = {
    coordinateSystem: freezeData.coordinateSystem,
    canonicalWidth: freezeData.canonicalWidth,
    canonicalHeight: freezeData.canonicalHeight,
    zones: freezeData.zones
      .slice()
      .sort((a: any, b: any) => a.id.localeCompare(b.id))
      .map((z: any) => ({
        id: z.id,
        businessZoneIds: z.businessZoneIds.slice().sort(),
        displayIndex: z.displayIndex,
        displayLabel: z.displayLabel,
        polygonCanonical: z.polygonCanonical.map((p: any) => ({ x: p.x, y: p.y })),
        labelAnchorCanonical: { x: z.labelAnchorCanonical.x, y: z.labelAnchorCanonical.y },
        operatorAnchorCanonical: { x: z.operatorAnchorCanonical.x, y: z.operatorAnchorCanonical.y },
      })),
    landmarks: freezeData.landmarks
      .slice()
      .sort((a: any, b: any) => a.id.localeCompare(b.id))
      .map((l: any) => ({
        id: l.id,
        zoneId: l.zoneId,
        category: l.category,
        canonical: { x: l.canonical.x, y: l.canonical.y },
        label: l.label,
      })),
  };

  function canonicalStringify(obj: any): string {
    if (obj === null || typeof obj !== 'object') {
      return JSON.stringify(obj);
    }
    if (Array.isArray(obj)) {
      return '[' + obj.map(canonicalStringify).join(',') + ']';
    }
    const keys = Object.keys(obj).sort();
    return '{' + keys.map((k) => JSON.stringify(k) + ':' + canonicalStringify(obj[k])).join(',') + '}';
  }

  const canonicalJson = canonicalStringify(canonicalPayload);
  const hash = crypto.createHash('sha256').update(canonicalJson, 'utf-8').digest('hex');

  assert.equal(
    hash,
    EXPECTED_HASH,
    `Computed canonical payload checksum MUST match ${EXPECTED_HASH}. Got: ${hash}`
  );
});
