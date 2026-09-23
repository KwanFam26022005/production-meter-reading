import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Helper to load zone polygon data from canonical JSON
const jsonPath = path.resolve(
  __dirname,
  '../src/components/map-v2/data/tan_thuan_1_zones_edited.json'
);
const canonicalData = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));
const canonicalPolygons: Record<string, [number, number][]> = {};
for (const zone of canonicalData.polygons) {
  canonicalPolygons[zone.id] = zone.vertices;
}

// -----------------------------------------------------------------------------
// 1. Valid polygon containment
// -----------------------------------------------------------------------------
test('Requirement 1: Valid polygon containment — Waypoints computed by generateSafeMovementPath are strictly inside target polygons', async () => {
  const { isPointInPolygon, generateSafeMovementPath } = await import(
    '../src/components/map-v2/employeeMovement.js'
  ).catch(async () => import('../src/components/map-v2/employeeMovement.ts'));

  const zoneIds = Object.keys(canonicalPolygons);
  assert.ok(zoneIds.length >= 7, 'Must have at least 7 canonical zones');

  for (const zoneId of zoneIds) {
    const polygon = canonicalPolygons[zoneId];
    const pathConfig = generateSafeMovementPath({
      polygon,
      markerRadius: 14,
      clearanceMargin: 4,
      seed: zoneId,
    });

    assert.ok(
      isPointInPolygon(pathConfig.center, polygon),
      `Center for zone ${zoneId} must be strictly inside the zone polygon`
    );

    // Verify all 36 validation samples
    for (let i = 0; i < pathConfig.samplePoints.length; i++) {
      const pt = pathConfig.samplePoints[i];
      assert.ok(
        isPointInPolygon(pt, polygon),
        `Sample point ${i} for zone ${zoneId} must be strictly inside polygon`
      );
    }
  }
});

// -----------------------------------------------------------------------------
// 2. Concave polygon containment
// -----------------------------------------------------------------------------
test('Requirement 2: Concave polygon containment — Handles complex/concave polygons without cutting corners', async () => {
  const { isPointInPolygon, generateSafeMovementPath } = await import(
    '../src/components/map-v2/employeeMovement.js'
  ).catch(async () => import('../src/components/map-v2/employeeMovement.ts'));

  // Define a distinct concave U-shaped polygon
  const concavePolygon: [number, number][] = [
    [100, 100],
    [300, 100],
    [300, 300],
    [240, 300],
    [240, 180],
    [160, 180],
    [160, 300],
    [100, 300],
  ];

  // The center gap (200, 250) is OUTSIDE the concave U
  assert.equal(isPointInPolygon([200, 250], concavePolygon), false);

  const safePath = generateSafeMovementPath({
    polygon: concavePolygon,
    markerRadius: 10,
    clearanceMargin: 2,
    seed: 'concave-test',
  });

  // Verify that center and all samples stay strictly inside one of the safe arms
  assert.ok(isPointInPolygon(safePath.center, concavePolygon), 'Center must be inside concave polygon');
  for (const pt of safePath.samplePoints) {
    assert.ok(isPointInPolygon(pt, concavePolygon), 'All trajectory points must remain inside concave polygon');
  }
});

// -----------------------------------------------------------------------------
// 3. Narrow-zone stationary fallback
// -----------------------------------------------------------------------------
test('Requirement 3: Narrow-zone stationary fallback — Activates when clearance < markerRadius + margin', async () => {
  const { generateSafeMovementPath } = await import(
    '../src/components/map-v2/employeeMovement.js'
  ).catch(async () => import('../src/components/map-v2/employeeMovement.ts'));

  // Define a narrow corridor polygon: width = 20px (clearance to edge = 10px < 18px required)
  const narrowPolygon: [number, number][] = [
    [500, 500],
    [520, 500],
    [520, 600],
    [500, 600],
  ];

  const narrowPath = generateSafeMovementPath({
    polygon: narrowPolygon,
    markerRadius: 14,
    clearanceMargin: 4, // 18px total required
    seed: 'narrow',
  });

  assert.equal(narrowPath.isStationary, true, 'Narrow zone must trigger stationary fallback');
  assert.equal(narrowPath.reason, 'narrow_zone_clearance', 'Reason must be narrow_zone_clearance');
  assert.equal(narrowPath.radiusX, 0, 'Stationary marker must have radiusX = 0');
  assert.equal(narrowPath.radiusY, 0, 'Stationary marker must have radiusY = 0');
  // Center should match point evaluator at all progress steps
  assert.deepEqual(narrowPath.getPositionAt(0), narrowPath.center);
  assert.deepEqual(narrowPath.getPositionAt(0.5), narrowPath.center);
  assert.deepEqual(narrowPath.getPositionAt(1), narrowPath.center);
});

// -----------------------------------------------------------------------------
// 4. Marker-radius boundary clearance
// -----------------------------------------------------------------------------
test('Requirement 4: Marker-radius boundary clearance — Every sample maintains required clearance margin', async () => {
  const { distanceToPolygonBoundary, generateSafeMovementPath } = await import(
    '../src/components/map-v2/employeeMovement.js'
  ).catch(async () => import('../src/components/map-v2/employeeMovement.ts'));

  const requiredClearance = 14 + 4; // 18px
  const largeZone = canonicalPolygons['ZONE_GENERAL'];

  const safePath = generateSafeMovementPath({
    polygon: largeZone,
    markerRadius: 14,
    clearanceMargin: 4,
    desiredRadius: 20,
    seed: 'clearance_test',
  });

  assert.equal(safePath.isStationary, false, 'Large zone should accommodate safe movement');
  for (let i = 0; i < safePath.samplePoints.length; i++) {
    const pt = safePath.samplePoints[i];
    const dist = distanceToPolygonBoundary(pt, largeZone);
    assert.ok(
      dist >= requiredClearance - 0.001,
      `Sample ${i} clearance ${dist.toFixed(2)} must be >= required ${requiredClearance}px`
    );
  }
});

// -----------------------------------------------------------------------------
// 5. Entire movement-path containment (36 samples)
// -----------------------------------------------------------------------------
test('Requirement 5: Entire movement-path containment — Exactly 36 verified validation samples per path', async () => {
  const { generateSafeMovementPath } = await import(
    '../src/components/map-v2/employeeMovement.js'
  ).catch(async () => import('../src/components/map-v2/employeeMovement.ts'));

  const quayZone = canonicalPolygons['ZONE_QUAY'];
  const safePath = generateSafeMovementPath({
    polygon: quayZone,
    markerRadius: 14,
    clearanceMargin: 4,
    seed: 'sample_count',
  });

  if (!safePath.isStationary) {
    assert.equal(safePath.samplePoints.length, 36, 'Must generate exactly 36 validation samples');
    // Test continuous sampling at arbitrary t
    for (let step = 0; step < 72; step++) {
      const t = step / 72;
      const pos = safePath.getPositionAt(t);
      assert.ok(Number.isFinite(pos[0]) && Number.isFinite(pos[1]), 'Positions must be finite numbers');
    }
  }
});

// -----------------------------------------------------------------------------
// 6. Deterministic waypoint generation
// -----------------------------------------------------------------------------
test('Requirement 6: Deterministic waypoint generation — Identical parameters produce identical paths', async () => {
  const { generateSafeMovementPath } = await import(
    '../src/components/map-v2/employeeMovement.js'
  ).catch(async () => import('../src/components/map-v2/employeeMovement.ts'));

  const containerZone = canonicalPolygons['ZONE_CONTAINER'];

  const pathA = generateSafeMovementPath({
    polygon: containerZone,
    markerRadius: 14,
    clearanceMargin: 4,
    desiredRadius: 20,
    seed: 'deterministic_seed_1',
  });

  const pathB = generateSafeMovementPath({
    polygon: containerZone,
    markerRadius: 14,
    clearanceMargin: 4,
    desiredRadius: 20,
    seed: 'deterministic_seed_1',
  });

  assert.deepEqual(pathA.center, pathB.center, 'Centers must be identical');
  assert.equal(pathA.radiusX, pathB.radiusX, 'RadiusX must be identical');
  assert.equal(pathA.radiusY, pathB.radiusY, 'RadiusY must be identical');
  assert.deepEqual(pathA.getPositionAt(0.33), pathB.getPositionAt(0.33), 'Position at t=0.33 must match exactly');
  assert.deepEqual(pathA.samplePoints, pathB.samplePoints, 'Sample arrays must match exactly');
});

// -----------------------------------------------------------------------------
// 7. Stable marker identity across rerenders
// -----------------------------------------------------------------------------
test('Requirement 7: Stable marker identity — Markers are keyed by stable employee id', async () => {
  const { DEMO_MAP_V2_EMPLOYEES } = await import(
    '../src/components/map-v2/employeeDataAdapter.js'
  ).catch(async () => import('../src/components/map-v2/employeeDataAdapter.ts'));

  const layerFileContent = fs.readFileSync(
    path.resolve(__dirname, '../src/components/map-v2/MapV2EmployeeLayer.tsx'),
    'utf-8'
  );

  assert.ok(
    layerFileContent.includes('key={emp.id}'),
    'MapV2EmployeeLayer must key each marker by stable employee ID (emp.id)'
  );

  const markerFileContent = fs.readFileSync(
    path.resolve(__dirname, '../src/components/map-v2/MapV2EmployeeMarker.tsx'),
    'utf-8'
  );

  assert.ok(
    markerFileContent.includes('data-employee-id={employee.id}'),
    'MapV2EmployeeMarker must include data-employee-id attribute for identity stability'
  );

  // Check unique IDs in demo dataset
  const ids = new Set(DEMO_MAP_V2_EMPLOYEES.map((e) => e.id));
  assert.equal(ids.size, DEMO_MAP_V2_EMPLOYEES.length, 'All employee IDs must be strictly unique');
});

// -----------------------------------------------------------------------------
// 8. Hover pause and resume
// -----------------------------------------------------------------------------
test('Requirement 8: Hover pause and resume — Hover pauses animation and resumes without reset', async () => {
  const hookFileContent = fs.readFileSync(
    path.resolve(__dirname, '../src/components/map-v2/useEmployeeAnimation.ts'),
    'utf-8'
  );

  assert.ok(
    hookFileContent.includes("isHovered") && hookFileContent.includes("pauseReason: 'hovered'"),
    'Hook must support isHovered condition and map to pauseReason: hovered'
  );

  assert.ok(
    hookFileContent.includes('progressRef.current = (progressRef.current + deltaProgress) % 1'),
    'Hook must preserve progress in progressRef without restarting from 0'
  );

  const markerFileContent = fs.readFileSync(
    path.resolve(__dirname, '../src/components/map-v2/MapV2EmployeeMarker.tsx'),
    'utf-8'
  );

  assert.ok(
    markerFileContent.includes('onMouseEnter={() => setIsHovered(true)}') &&
      markerFileContent.includes('onMouseLeave={() => setIsHovered(false)}'),
    'Marker must bind mouseEnter and mouseLeave to hover state'
  );
});

// -----------------------------------------------------------------------------
// 9. Keyboard focus pause
// -----------------------------------------------------------------------------
test('Requirement 9: Keyboard focus pause — Focus pauses animation with accessibility attrs', async () => {
  const hookFileContent = fs.readFileSync(
    path.resolve(__dirname, '../src/components/map-v2/useEmployeeAnimation.ts'),
    'utf-8'
  );
  assert.ok(
    hookFileContent.includes("isFocused") && hookFileContent.includes("pauseReason: 'focused'"),
    'Hook must support isFocused condition and map to pauseReason: focused'
  );

  const markerFileContent = fs.readFileSync(
    path.resolve(__dirname, '../src/components/map-v2/MapV2EmployeeMarker.tsx'),
    'utf-8'
  );
  assert.ok(
    markerFileContent.includes('tabIndex={0}'),
    'Marker must have tabIndex={0} for keyboard accessibility'
  );
  assert.ok(
    markerFileContent.includes('role="button"'),
    'Marker must have role="button"'
  );
  assert.ok(
    markerFileContent.includes('onFocus={() => setIsFocused(true)}') &&
      markerFileContent.includes('onBlur={() => setIsFocused(false)}'),
    'Marker must bind onFocus and onBlur'
  );
});

// -----------------------------------------------------------------------------
// 10. Selection freeze and resume after deselection
// -----------------------------------------------------------------------------
test('Requirement 10: Selection freeze and resume — Selection freezes marker and coordinates zone highlight', async () => {
  const hookFileContent = fs.readFileSync(
    path.resolve(__dirname, '../src/components/map-v2/useEmployeeAnimation.ts'),
    'utf-8'
  );
  assert.ok(
    hookFileContent.includes("isSelected") && hookFileContent.includes("pauseReason: 'selected'"),
    'Hook must map isSelected to pauseReason: selected'
  );

  const canvasFileContent = fs.readFileSync(
    path.resolve(__dirname, '../src/components/map-v2/MapV2Canvas.tsx'),
    'utf-8'
  );
  // Canvas highlights zone when employee is selected
  assert.ok(
    canvasFileContent.includes("selectedEntity.data.zoneId === entityId") ||
      canvasFileContent.includes("selectedEntity.data.zoneId"),
    'Canvas must highlight zone when associated employee is selected'
  );
});

// -----------------------------------------------------------------------------
// 11. Reduced-motion behavior
// -----------------------------------------------------------------------------
test('Requirement 11: Reduced-motion behavior — Detects prefers-reduced-motion media query', async () => {
  const hookFileContent = fs.readFileSync(
    path.resolve(__dirname, '../src/components/map-v2/useEmployeeAnimation.ts'),
    'utf-8'
  );
  assert.ok(
    hookFileContent.includes("prefers-reduced-motion: reduce"),
    'Hook must query prefers-reduced-motion: reduce media query'
  );
  assert.ok(
    hookFileContent.includes("pauseReason: 'reduced_motion'"),
    'Hook must set pauseReason: reduced_motion when enabled'
  );
});

// -----------------------------------------------------------------------------
// 12. Manual pause/resume
// -----------------------------------------------------------------------------
test('Requirement 12: Manual pause/resume — Canvas provides HUD Play/Pause toggle', async () => {
  const canvasFileContent = fs.readFileSync(
    path.resolve(__dirname, '../src/components/map-v2/MapV2Canvas.tsx'),
    'utf-8'
  );
  assert.ok(
    canvasFileContent.includes('map-v2-motion-toggle'),
    'Canvas must render HUD play/pause toggle button (.map-v2-motion-toggle)'
  );
  assert.ok(
    canvasFileContent.includes('Tạm dừng hoạt họa nhân sự') &&
      canvasFileContent.includes('Tiếp tục hoạt họa nhân sự'),
    'HUD toggle must provide descriptive pause and resume labels'
  );
});

// -----------------------------------------------------------------------------
// 13. Operational vs technical mode visibility
// -----------------------------------------------------------------------------
test('Requirement 13: Operational vs technical mode visibility — Markers hidden in technical view modes', async () => {
  const layerFileContent = fs.readFileSync(
    path.resolve(__dirname, '../src/components/map-v2/MapV2EmployeeLayer.tsx'),
    'utf-8'
  );
  assert.ok(
    layerFileContent.includes('!isLayerVisible || isTechnicalMode') && layerFileContent.includes('return null'),
    'MapV2EmployeeLayer must return null when layer is disabled or technical mode is active'
  );

  const canvasFileContent = fs.readFileSync(
    path.resolve(__dirname, '../src/components/map-v2/MapV2Canvas.tsx'),
    'utf-8'
  );
  assert.ok(
    canvasFileContent.includes("isTechnicalMode={utilityMode !== 'off'}"),
    'Canvas must set isTechnicalMode=true when utility mode is active'
  );
});

// -----------------------------------------------------------------------------
// 14. Unknown/missing assignment data handling
// -----------------------------------------------------------------------------
test('Requirement 14: Unknown/missing assignment data handling — Graceful fallback for empty or missing zones', async () => {
  const { getEmployeesForZone } = await import(
    '../src/components/map-v2/employeeDataAdapter.js'
  ).catch(async () => import('../src/components/map-v2/employeeDataAdapter.ts'));

  const { generateSafeMovementPath } = await import(
    '../src/components/map-v2/employeeMovement.js'
  ).catch(async () => import('../src/components/map-v2/employeeMovement.ts'));

  // Test empty zone returns empty array without throwing
  const emptyResult = getEmployeesForZone('NON_EXISTENT_ZONE');
  assert.deepEqual(emptyResult, [], 'Missing zone must return empty array cleanly');

  // Test empty polygon coordinates
  const emptyPolyPath = generateSafeMovementPath({
    polygon: [],
    preferredAnchor: [100, 100],
    seed: 'empty',
  });
  assert.equal(emptyPolyPath.isStationary, true, 'Empty polygon must be stationary');
  assert.equal(emptyPolyPath.reason, 'empty_polygon', 'Reason must be empty_polygon');
  assert.deepEqual(emptyPolyPath.center, [100, 100], 'Fallback center must match anchor');
});

// -----------------------------------------------------------------------------
// 15. No fabricated personal progress
// -----------------------------------------------------------------------------
test('Requirement 15: No fabricated personal progress — Enforces data truthfulness rules', async () => {
  const {
    MAP_V2_EMPLOYEE_DISCLOSURE_TEXT,
    DEMO_MAP_V2_EMPLOYEES,
  } = await import(
    '../src/components/map-v2/employeeDataAdapter.js'
  ).catch(async () => import('../src/components/map-v2/employeeDataAdapter.ts'));

  // Disclosure text verification
  assert.equal(
    MAP_V2_EMPLOYEE_DISCLOSURE_TEXT,
    'Chuyển động minh họa khu vực phân công — không phải vị trí GPS.'
  );

  // All demo employees must be labeled as isDemo=true
  for (const emp of DEMO_MAP_V2_EMPLOYEES) {
    assert.equal(emp.isDemo, true, 'All demo employees must have isDemo: true');
    assert.ok(
      emp.roleTitle.includes('Người phụ trách'),
      'Role title must be Người phụ trách phân khu / kho'
    );
    assert.ok(
      !emp.zoneMeterSummary || emp.zoneMeterSummary.includes('Khu vực') || emp.zoneMeterSummary.includes('Cụm thiết bị'),
      'Progress summary must belong to zone or equipment cluster, not individual worker'
    );
  }

  // Canvas must display persistent disclosure banner
  const canvasFileContent = fs.readFileSync(
    path.resolve(__dirname, '../src/components/map-v2/MapV2Canvas.tsx'),
    'utf-8'
  );
  assert.ok(
    canvasFileContent.includes('MAP_V2_EMPLOYEE_DISCLOSURE_TEXT'),
    'MapV2Canvas must render MAP_V2_EMPLOYEE_DISCLOSURE_TEXT in disclosure banner'
  );
});

// -----------------------------------------------------------------------------
// 16. Multiple markers within one zone (spacing offset)
// -----------------------------------------------------------------------------
test('Requirement 16: Multiple markers within one zone — Multi-worker spacing offset prevents collision', async () => {
  const { isPointInPolygon, generateSafeMovementPath } = await import(
    '../src/components/map-v2/employeeMovement.js'
  ).catch(async () => import('../src/components/map-v2/employeeMovement.ts'));

  const generalZone = canonicalPolygons['ZONE_GENERAL'];

  // Simulate two workers assigned to the same zone
  const worker1Path = generateSafeMovementPath({
    polygon: generalZone,
    markerRadius: 14,
    clearanceMargin: 4,
    seed: 'DEMO_NV003_index_0',
  });

  // Second worker gets an offset anchor and distinct seed
  const offsetAnchor: [number, number] = [
    worker1Path.center[0] + 35,
    worker1Path.center[1] + 25,
  ];

  const worker2Path = generateSafeMovementPath({
    polygon: generalZone,
    preferredAnchor: offsetAnchor,
    markerRadius: 14,
    clearanceMargin: 4,
    seed: 'DEMO_NV005_index_1',
  });

  assert.ok(isPointInPolygon(worker1Path.center, generalZone), 'Worker 1 center inside zone');
  assert.ok(isPointInPolygon(worker2Path.center, generalZone), 'Worker 2 center inside zone');

  const distBetweenCenters = Math.hypot(
    worker2Path.center[0] - worker1Path.center[0],
    worker2Path.center[1] - worker1Path.center[1]
  );
  assert.ok(
    distBetweenCenters > 15,
    `Multi-worker spacing distance ${distBetweenCenters.toFixed(2)}px must prevent direct overlap`
  );
});

// -----------------------------------------------------------------------------
// 17. Inspector opening without selection loss
// -----------------------------------------------------------------------------
test('Requirement 17: Inspector opening without selection loss — InspectionPanel supports employee entity', async () => {
  const panelFileContent = fs.readFileSync(
    path.resolve(__dirname, '../src/components/map-v2/MapV2InspectionPanel.tsx'),
    'utf-8'
  );

  assert.ok(
    panelFileContent.includes("type === 'employee'") || panelFileContent.includes("selected.type === 'employee'"),
    'MapV2InspectionPanel must have dedicated branch for selectedEntity.type === employee'
  );

  assert.ok(
    panelFileContent.includes('Nhân sự phân khu') || panelFileContent.includes('Nhân sự phụ trách'),
    'Inspector must label header truthfully as Nhân sự phân khu'
  );

  assert.ok(
    panelFileContent.includes('Chuyển động minh họa'),
    'Inspector must render illustrative disclosure tag'
  );

  const workspaceFileContent = fs.readFileSync(
    path.resolve(__dirname, '../src/components/map-v2/MapV2Workspace.tsx'),
    'utf-8'
  );
  assert.ok(
    workspaceFileContent.includes("selectedEntity.type === 'employee'") || workspaceFileContent.includes("type === 'employee'"),
    'Workspace must support selecting entity of type employee'
  );
});

// -----------------------------------------------------------------------------
// 18. Animation cleanup on unmount
// -----------------------------------------------------------------------------
test('Requirement 18: Animation cleanup on unmount — Cancels animation frames on unmount', async () => {
  const hookFileContent = fs.readFileSync(
    path.resolve(__dirname, '../src/components/map-v2/useEmployeeAnimation.ts'),
    'utf-8'
  );

  assert.ok(
    hookFileContent.includes('cancelAnimationFrame(animFrameIdRef.current)'),
    'Hook must call cancelAnimationFrame on unmount and pause'
  );

  assert.ok(
    hookFileContent.includes('mediaQuery.removeEventListener'),
    'Hook must remove window.matchMedia listener on cleanup'
  );
});
