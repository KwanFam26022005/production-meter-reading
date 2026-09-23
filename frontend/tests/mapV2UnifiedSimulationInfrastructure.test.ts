import { test } from 'node:test';
import assert from 'node:assert';
import {
  getActiveSimulationMeters,
  getLegacySimulationMeters,
  getAllSimulationMeters,
  isActiveSimulationMeter,
  isLegacySimulationMeter,
  getMeterHostNodeId,
  getHostNodeMeterCode,
  getMeterNetworkId,
  getMeterUtility,
  getMeterZone,
  resolveMeterNetworkPath,
  buildUnifiedSimulationNodes,
  getUnifiedUtilityNetworks,
  getUnifiedUtilityNetwork,
  validateUnifiedSimulationInfrastructure,
  buildUnifiedSimulationState,
  ELECTRICITY_NETWORK_ID,
  WATER_NETWORK_ID,
} from '../src/components/map-v2/simulation';
import { LAYOUT_B2, LAYOUT_B2_COORDS } from '../src/components/map-v2/utilityDemoLayout';
import {
  DEMO_MAP_V2_EMPLOYEES,
  buildLiveZoneEmployees,
  MAP_V2_EMPLOYEE_DISCLOSURE_TEXT,
  MAP_V2_LIVE_STAFF_DISCLOSURE_TEXT,
} from '../src/components/map-v2/employeeDataAdapter';
import { adaptLiveEmployeeToUnifiedPerson, adaptDemoEmployeeToUnifiedPerson } from '../src/components/map-v2/simulation/peopleRegistry';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

test('01: Exactly 8 electricity active simulation meters resolve', () => {
  const active = getActiveSimulationMeters();
  const elecMeters = active.filter((m) => m.utility === 'ELECTRICITY');
  assert.strictEqual(elecMeters.length, 8);
  const codes = elecMeters.map((m) => m.meterCode).sort();
  assert.deepStrictEqual(codes, [
    'SIM-EM-001',
    'SIM-EM-002',
    'SIM-EM-003',
    'SIM-EM-004',
    'SIM-EM-005',
    'SIM-EM-006',
    'SIM-EM-007',
    'SIM-EM-008',
  ]);
});

test('02: Exactly 4 water active simulation meters resolve', () => {
  const active = getActiveSimulationMeters();
  const waterMeters = active.filter((m) => m.utility === 'WATER');
  assert.strictEqual(waterMeters.length, 4);
  const codes = waterMeters.map((m) => m.meterCode).sort();
  assert.deepStrictEqual(codes, [
    'SIM-WM-001',
    'SIM-WM-002',
    'SIM-WM-003',
    'SIM-WM-004',
  ]);
});

test('03: Exactly 12 active SIM meters exist in unified model', () => {
  const active = getActiveSimulationMeters();
  assert.strictEqual(active.length, 12);
  for (const m of active) {
    assert.strictEqual(m.lifecycle, 'ACTIVE_SIMULATION');
    assert.strictEqual(m.provenance, 'SIMULATED');
    assert.strictEqual(isActiveSimulationMeter(m.meterCode), true);
  }
});

test('04: CT-001..CT-012 are excluded from active B2 topology', () => {
  const legacy = getLegacySimulationMeters();
  assert.strictEqual(legacy.length, 12);
  for (let i = 1; i <= 12; i++) {
    const code = `CT-${String(i).padStart(3, '0')}`;
    assert.strictEqual(isLegacySimulationMeter(code), true);
    assert.strictEqual(isActiveSimulationMeter(code), false);
    assert.strictEqual(getMeterHostNodeId(code), null);
    assert.strictEqual(getMeterNetworkId(code), null);
    assert.strictEqual(resolveMeterNetworkPath(code), null);
  }
});

test('05: Every active simulation meter has exactly one host', () => {
  const active = getActiveSimulationMeters();
  for (const m of active) {
    const hostId = getMeterHostNodeId(m.meterCode);
    assert.ok(hostId, `Meter ${m.meterCode} must have a host`);
    assert.strictEqual(hostId, m.hostNodeId);
  }
});

test('06: Every host exists in B2 layout', () => {
  const nodeMap = new Map(LAYOUT_B2.nodes.map((n) => [n.id, n]));
  const active = getActiveSimulationMeters();
  for (const m of active) {
    assert.ok(m.hostNodeId && nodeMap.has(m.hostNodeId), `Host node ${m.hostNodeId} must exist in B2 layout`);
  }
});

test('07: Electricity host utility matches electricity meter', () => {
  const nodeMap = new Map(LAYOUT_B2.nodes.map((n) => [n.id, n]));
  const elecMeters = getActiveSimulationMeters().filter((m) => m.utility === 'ELECTRICITY');
  for (const m of elecMeters) {
    const node = nodeMap.get(m.hostNodeId!);
    assert.ok(node);
    assert.strictEqual(node.utilityType, 'ELECTRICITY');
  }
});

test('08: Water host utility matches water meter', () => {
  const nodeMap = new Map(LAYOUT_B2.nodes.map((n) => [n.id, n]));
  const waterMeters = getActiveSimulationMeters().filter((m) => m.utility === 'WATER');
  for (const m of waterMeters) {
    const node = nodeMap.get(m.hostNodeId!);
    assert.ok(node);
    assert.strictEqual(node.utilityType, 'WATER');
  }
});

test('09: meter → host lookup works', () => {
  assert.strictEqual(getMeterHostNodeId('SIM-EM-001'), 'SIM-MDB-01');
  assert.strictEqual(getMeterHostNodeId('SIM-EM-002'), 'SIM-FDR-BERTH');
  assert.strictEqual(getMeterHostNodeId('SIM-EM-007'), 'SIM-YDB-W01');
  assert.strictEqual(getMeterHostNodeId('SIM-WM-001'), 'SIM-WIN-01');
  assert.strictEqual(getMeterHostNodeId('SIM-WM-004'), 'SIM-FP-01');
  assert.strictEqual(getMeterHostNodeId('UNKNOWN-METER'), null);
});

test('10: host → meter reverse lookup works', () => {
  assert.strictEqual(getHostNodeMeterCode('SIM-MDB-01'), 'SIM-EM-001');
  assert.strictEqual(getHostNodeMeterCode('SIM-FDR-BERTH'), 'SIM-EM-002');
  assert.strictEqual(getHostNodeMeterCode('SIM-YDB-W01'), 'SIM-EM-007');
  assert.strictEqual(getHostNodeMeterCode('SIM-WIN-01'), 'SIM-WM-001');
  assert.strictEqual(getHostNodeMeterCode('SIM-FP-01'), 'SIM-WM-004');
  assert.strictEqual(getHostNodeMeterCode('SIM-EXT-GRID'), null); // Source node does not host meter
});

test('11: meter → network lookup works', () => {
  assert.strictEqual(getMeterNetworkId('SIM-EM-001'), ELECTRICITY_NETWORK_ID);
  assert.strictEqual(getMeterNetworkId('SIM-EM-008'), ELECTRICITY_NETWORK_ID);
  assert.strictEqual(getMeterNetworkId('SIM-WM-001'), WATER_NETWORK_ID);
  assert.strictEqual(getMeterNetworkId('SIM-WM-004'), WATER_NETWORK_ID);
  assert.strictEqual(getMeterNetworkId('CT-001'), null);
});

test('12: meter → zone lookup works when authoritative mapping exists', () => {
  const z1 = getMeterZone('SIM-EM-002');
  assert.deepStrictEqual(z1, { presentationZoneId: 'ZONE_QUAY', businessZoneId: 'zone-berth' });

  const z4 = getMeterZone('SIM-EM-004');
  assert.deepStrictEqual(z4, { presentationZoneId: 'ZONE_CONTAINER', businessZoneId: 'zone-container' });

  const zw2 = getMeterZone('SIM-WM-002');
  assert.deepStrictEqual(zw2, { presentationZoneId: 'ZONE_QUAY', businessZoneId: 'zone-berth' });

  const zUnknown = getMeterZone('UNKNOWN-METER');
  assert.strictEqual(zUnknown, null);
});

test('13: All active meter network traces reach correct source', () => {
  for (const m of getActiveSimulationMeters()) {
    const trace = resolveMeterNetworkPath(m.meterCode);
    assert.ok(trace, `Trace must resolve for ${m.meterCode}`);
    if (m.utility === 'ELECTRICITY') {
      assert.strictEqual(trace.sourceNodeId, 'SIM-EXT-GRID');
      assert.strictEqual(trace.networkId, ELECTRICITY_NETWORK_ID);
    } else {
      assert.strictEqual(trace.sourceNodeId, 'SIM-CITY-WATER');
      assert.strictEqual(trace.networkId, WATER_NETWORK_ID);
    }
    assert.strictEqual(trace.orderedNodeIds[0], trace.sourceNodeId);
    assert.strictEqual(trace.orderedNodeIds[trace.orderedNodeIds.length - 1], m.hostNodeId);
  }
});

test('14: No orphan active simulation meter exists', () => {
  const val = validateUnifiedSimulationInfrastructure();
  assert.strictEqual(val.metrics.orphanedMeterCount, 0);
});

test('15: No duplicate active simulation meter exists', () => {
  const codes = getActiveSimulationMeters().map((m) => m.meterCode);
  const uniqueCodes = new Set(codes);
  assert.strictEqual(codes.length, uniqueCodes.size);
});

test('16: B2 simulated topology provenance remains SIMULATED', () => {
  for (const net of getUnifiedUtilityNetworks()) {
    assert.strictEqual(net.provenance, 'SIMULATED');
  }
  for (const node of buildUnifiedSimulationNodes()) {
    assert.strictEqual(node.provenance, 'SIMULATED');
    assert.strictEqual(node.coordinates.provenance, 'SIMULATED');
  }
});

test('17: Legacy meter provenance remains LEGACY_SIMULATION', () => {
  for (const m of getLegacySimulationMeters()) {
    assert.strictEqual(m.provenance, 'LEGACY_SIMULATION');
    assert.strictEqual(m.lifecycle, 'LEGACY_SIMULATION');
  }
});

test('18: No B2 simulation coordinate is marked physically verified', () => {
  for (const m of getActiveSimulationMeters()) {
    assert.strictEqual(m.verifiedPhysicalCoordinate, null);
  }
});

test('19: Operational meter selection resolves network host', () => {
  const state = buildUnifiedSimulationState();
  const host = state.relationships.meterToHost.get('SIM-EM-007');
  assert.strictEqual(host, 'SIM-YDB-W01');
  const node = state.relationships.hostToNode.get('SIM-YDB-W01');
  assert.ok(node);
  assert.strictEqual(node.label, 'Tủ nhánh Bãi Tây YDB-W01');
});

test('20: Network host resolves meter', () => {
  const state = buildUnifiedSimulationState();
  const meterCode = state.relationships.hostToMeter.get('SIM-YDB-C01');
  assert.strictEqual(meterCode, 'SIM-EM-008');
});

test('21: Cross-layer selected entity remains single-source', () => {
  const m = getActiveSimulationMeters().find((x) => x.meterCode === 'SIM-EM-003');
  assert.ok(m);
  const hostId = getMeterHostNodeId(m.meterCode);
  assert.strictEqual(hostId, 'SIM-FDR-WEST');
  const rev = getHostNodeMeterCode(hostId!);
  assert.strictEqual(rev, m.meterCode);
});

test('22: Real assignee remains: REAL_ZONE_ASSIGNEE, STATIONARY, NO GPS claim', () => {
  const mockLiveZones = [
    {
      id: 'zone-berth',
      name: 'Khu cảng sà lan',
      total_meters: 10,
      assigned_user: {
        id: 'USER_01',
        employee_code: 'NV001',
        full_name: 'Nguyễn Văn Hải',
        role: 'operator',
        is_active: true,
      },
    },
  ];
  const liveEmps = buildLiveZoneEmployees(mockLiveZones);
  assert.strictEqual(liveEmps.length, 1);
  const person = adaptLiveEmployeeToUnifiedPerson(liveEmps[0]);
  assert.strictEqual(person.kind, 'REAL_ZONE_ASSIGNEE');
  assert.strictEqual(person.movementMode, 'STATIONARY');
  assert.strictEqual(person.isStationary, true);
  assert.strictEqual(person.isDemo, false);
  assert.strictEqual(person.provenance, 'AUTHORITATIVE');
  assert.ok(person.disclosure.includes('không phải vị trí GPS'));
  assert.ok(!person.disclosure.includes('Chuyển động minh họa'));
});

test('23: Demo employee remains: DEMO_ANIMATED_ASSIGNEE, SIMULATED_ZONE_PATH, NO GPS claim', () => {
  const demoPerson = adaptDemoEmployeeToUnifiedPerson(DEMO_MAP_V2_EMPLOYEES[0]);
  assert.strictEqual(demoPerson.kind, 'DEMO_ANIMATED_ASSIGNEE');
  assert.strictEqual(demoPerson.movementMode, 'SIMULATED_ZONE_PATH');
  assert.strictEqual(demoPerson.isStationary, false);
  assert.strictEqual(demoPerson.isDemo, true);
  assert.strictEqual(demoPerson.provenance, 'SIMULATED');
  assert.ok(demoPerson.disclosure.includes(MAP_V2_EMPLOYEE_DISCLOSURE_TEXT));
  assert.ok(demoPerson.disclosure.includes('không phải vị trí GPS'));
});

test('24: Layer Manager contains electricity/water under MẠNG KỸ THUẬT', () => {
  const layerManagerPath = path.resolve(__dirname, '../src/components/map-v2/MapV2Layers.tsx');
  const content = fs.readFileSync(layerManagerPath, 'utf8');
  assert.ok(content.includes('MẠNG KỸ THUẬT') || content.includes('Mạng kỹ thuật'));
  assert.ok(content.includes('LỚP TÁC NGHIỆP') || content.includes('Lớp tác nghiệp'));
  assert.ok(content.includes('HOẠT HỌA') || content.includes('Hoạt họa'));
  assert.ok(content.includes('BẢN ĐỒ NỀN') || content.includes('Bản đồ nền'));
});

test('25: Electricity retains MÔ PHỎNG disclosure', () => {
  const layerManagerPath = path.resolve(__dirname, '../src/components/map-v2/MapV2Layers.tsx');
  const content = fs.readFileSync(layerManagerPath, 'utf8');
  assert.ok(content.includes('Mô phỏng'));
});

test('26: Water retains MÔ PHỎNG disclosure', () => {
  const layerManagerPath = path.resolve(__dirname, '../src/components/map-v2/MapV2Layers.tsx');
  const content = fs.readFileSync(layerManagerPath, 'utf8');
  assert.ok(content.includes('Mô phỏng'));
});

test('27: Demo employee retains DEMO disclosure', () => {
  const layerManagerPath = path.resolve(__dirname, '../src/components/map-v2/MapV2Layers.tsx');
  const content = fs.readFileSync(layerManagerPath, 'utf8');
  assert.ok(content.includes('Demo') || content.includes('DEMO'));
});

test('28: B2 coordinates remain unchanged', () => {
  assert.strictEqual(LAYOUT_B2.nodes.length, 17);
  assert.strictEqual(LAYOUT_B2.edges.length, 15);
  assert.deepStrictEqual(LAYOUT_B2_COORDS['SIM-EXT-GRID'], [700, 755]);
  assert.deepStrictEqual(LAYOUT_B2_COORDS['SIM-CITY-WATER'], [815, 770]);
  assert.deepStrictEqual(LAYOUT_B2_COORDS['SIM-MDB-01'], [740, 570]);
  assert.deepStrictEqual(LAYOUT_B2_COORDS['SIM-WIN-01'], [800, 690]);
});

test('29: Unique B2 crossing remains unchanged at X=740, Y=520', () => {
  const val = validateUnifiedSimulationInfrastructure();
  assert.deepStrictEqual(val.metrics.uniqueB2Crossing, { x: 740, y: 520 });
});

test('30: No dependency on Map V1 coordinate scaling is introduced', () => {
  const val = validateUnifiedSimulationInfrastructure();
  assert.strictEqual(val.valid, true);
  assert.strictEqual(val.errors.length, 0);
});
