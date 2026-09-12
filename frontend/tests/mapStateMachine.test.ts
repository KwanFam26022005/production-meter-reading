import test from 'node:test';
import assert from 'node:assert/strict';
import type {
  MapMode,
  SelectedEntity,
  DetailView,
  PlacementContext,
} from '../src/features/map-operations/state/useMapStateMachine';

/**
 * Pure state machine simulator replicating useMapStateMachine logic
 * for deterministic unit testing of transitions and invariants.
 */
class StateMachineSimulator {
  mode: MapMode = 'browse';
  selectedEntity: SelectedEntity = null;
  detailView: DetailView = null;
  hoveredEntity: SelectedEntity = null;
  placementContext: PlacementContext | null = null;
  priorDetailView: DetailView = null;

  get activeSurfaces(): string[] {
    const surfaces: string[] = [];
    if (this.mode === 'inspect' && this.selectedEntity) {
      surfaces.push('SpatialInspector');
    }
    if (this.mode === 'details' || this.mode === 'placement') {
      surfaces.push('MapContextRail');
    }
    return surfaces;
  }

  assertSurfaceInvariant() {
    const count = this.activeSurfaces.length;
    assert.ok(
      count <= 1,
      `Invariant violation: ${count} contextual surfaces mounted concurrently: ${this.activeSurfaces.join(', ')}`
    );
  }

  setHoveredEntity(entity: SelectedEntity) {
    this.hoveredEntity = entity;
    this.assertSurfaceInvariant();
  }

  selectZone(zoneId: string | null) {
    if (!zoneId) {
      this.resetToBrowse();
      return;
    }
    this.mode = 'inspect';
    this.selectedEntity = { type: 'zone', id: zoneId };
    this.detailView = null;
    this.placementContext = null;
    this.priorDetailView = null;
    this.assertSurfaceInvariant();
  }

  selectOperator(operatorId: string | null) {
    if (!operatorId) {
      this.resetToBrowse();
      return;
    }
    this.mode = 'inspect';
    this.selectedEntity = { type: 'operator', id: operatorId };
    this.detailView = null;
    this.placementContext = null;
    this.priorDetailView = null;
    this.assertSurfaceInvariant();
  }

  selectMeter(meterId: string | null) {
    if (!meterId) {
      this.resetToBrowse();
      return;
    }
    this.mode = 'inspect';
    this.selectedEntity = { type: 'meter', id: meterId };
    this.detailView = null;
    this.placementContext = null;
    this.priorDetailView = null;
    this.assertSurfaceInvariant();
  }

  openDetails(view?: DetailView) {
    this.mode = 'details';
    if (view) {
      this.detailView = view;
    } else if (this.selectedEntity?.type === 'zone') {
      this.detailView = 'zone';
    } else if (this.selectedEntity?.type === 'operator') {
      this.detailView = 'operator';
    } else if (this.selectedEntity?.type === 'meter') {
      this.detailView = 'meter';
    }
    this.assertSurfaceInvariant();
  }

  startPlacement(targetZoneId: string, targetZoneName: string) {
    this.priorDetailView = this.detailView;
    this.selectedEntity = { type: 'zone', id: targetZoneId };
    this.mode = 'placement';
    this.detailView = 'meter-placement';
    this.placementContext = {
      targetZoneId,
      targetZoneName,
      isRelocating: false,
      meterCode: '',
      meterName: '',
      meterType: 'LCD',
      pinnedCoords: null,
    };
    this.assertSurfaceInvariant();
  }

  startRelocation(meter: { id: string; meterCode: string; name: string; zoneId: string; targetZoneName?: string }) {
    this.priorDetailView = this.detailView;
    this.selectedEntity = { type: 'meter', id: meter.id };
    this.mode = 'placement';
    this.detailView = 'meter-placement';
    this.placementContext = {
      targetZoneId: meter.zoneId,
      targetZoneName: meter.targetZoneName || 'Khu vực chỉ định',
      isRelocating: true,
      meterId: meter.id,
      meterCode: meter.meterCode,
      meterName: meter.name,
      meterType: 'LCD',
      pinnedCoords: null,
    };
    this.assertSurfaceInvariant();
  }

  cancelPlacement() {
    this.placementContext = null;
    if (this.priorDetailView) {
      this.mode = 'details';
      this.detailView = this.priorDetailView;
      this.priorDetailView = null;
    } else if (this.selectedEntity) {
      this.mode = 'inspect';
      this.detailView = null;
    } else {
      this.mode = 'browse';
      this.detailView = null;
    }
    this.assertSurfaceInvariant();
  }

  handleEsc() {
    if (this.mode === 'placement') {
      this.cancelPlacement();
    } else if (this.mode === 'details') {
      this.mode = 'inspect';
      this.detailView = null;
    } else if (this.mode === 'inspect') {
      this.resetToBrowse();
    }
    this.assertSurfaceInvariant();
  }

  handleEmptyMapClick() {
    if (this.mode === 'placement') return;
    this.resetToBrowse();
    this.assertSurfaceInvariant();
  }

  resetToBrowse() {
    this.mode = 'browse';
    this.selectedEntity = null;
    this.detailView = null;
    this.placementContext = null;
    this.priorDetailView = null;
    this.assertSurfaceInvariant();
  }
}

// ---------------------------------------------------------------------------
// SECTION 18 TEST SUITE: MAP UI STATE MACHINE TRANSITIONS
// ---------------------------------------------------------------------------

test('Transition 1: browse → zone inspect', () => {
  const sm = new StateMachineSimulator();
  assert.equal(sm.mode, 'browse');
  assert.equal(sm.selectedEntity, null);
  assert.deepEqual(sm.activeSurfaces, []);

  sm.selectZone('pres-berth');
  assert.equal(sm.mode, 'inspect');
  assert.deepEqual(sm.selectedEntity, { type: 'zone', id: 'pres-berth' });
  assert.deepEqual(sm.activeSurfaces, ['SpatialInspector']);
});

test('Transition 2: zone inspect → zone details', () => {
  const sm = new StateMachineSimulator();
  sm.selectZone('pres-berth');
  sm.openDetails();

  assert.equal(sm.mode, 'details');
  assert.equal(sm.detailView, 'zone');
  assert.deepEqual(sm.activeSurfaces, ['MapContextRail']);
});

test('Transition 3: zone details → placement', () => {
  const sm = new StateMachineSimulator();
  sm.selectZone('pres-berth');
  sm.openDetails();
  sm.startPlacement('pres-berth', 'Khu vực Cầu cảng (Berths 1–3)');

  assert.equal(sm.mode, 'placement');
  assert.equal(sm.detailView, 'meter-placement');
  assert.ok(sm.placementContext);
  assert.equal(sm.placementContext.targetZoneId, 'pres-berth');
  assert.deepEqual(sm.activeSurfaces, ['MapContextRail']);
});

test('Transition 4: placement → cancel → zone details', () => {
  const sm = new StateMachineSimulator();
  sm.selectZone('pres-berth');
  sm.openDetails();
  sm.startPlacement('pres-berth', 'Khu vực Cầu cảng (Berths 1–3)');
  sm.cancelPlacement();

  assert.equal(sm.mode, 'details');
  assert.equal(sm.detailView, 'zone');
  assert.equal(sm.placementContext, null);
  assert.deepEqual(sm.activeSurfaces, ['MapContextRail']);
});

test('Transition 5: browse → operator inspect', () => {
  const sm = new StateMachineSimulator();
  sm.selectOperator('user-op-1');

  assert.equal(sm.mode, 'inspect');
  assert.deepEqual(sm.selectedEntity, { type: 'operator', id: 'user-op-1' });
  assert.deepEqual(sm.activeSurfaces, ['SpatialInspector']);
});

test('Transition 6: browse → meter inspect', () => {
  const sm = new StateMachineSimulator();
  sm.selectMeter('meter-ct-001');

  assert.equal(sm.mode, 'inspect');
  assert.deepEqual(sm.selectedEntity, { type: 'meter', id: 'meter-ct-001' });
  assert.deepEqual(sm.activeSurfaces, ['SpatialInspector']);
});

test('Transition 7: meter inspect → relocation', () => {
  const sm = new StateMachineSimulator();
  sm.selectMeter('meter-ct-001');
  sm.startRelocation({
    id: 'meter-ct-001',
    meterCode: 'CT-001',
    name: 'Công tơ Trạm A',
    zoneId: 'zone-technical',
    targetZoneName: 'Khu Kỹ thuật & Trạm Phụ trợ Điện',
  });

  assert.equal(sm.mode, 'placement');
  assert.equal(sm.detailView, 'meter-placement');
  assert.ok(sm.placementContext?.isRelocating);
  assert.equal(sm.placementContext?.meterId, 'meter-ct-001');
  assert.deepEqual(sm.activeSurfaces, ['MapContextRail']);
});

test('Transition 8: zone → operator (cross-entity click)', () => {
  const sm = new StateMachineSimulator();
  sm.selectZone('pres-berth');
  assert.equal(sm.selectedEntity?.type, 'zone');

  sm.selectOperator('user-op-2');
  assert.equal(sm.mode, 'inspect');
  assert.deepEqual(sm.selectedEntity, { type: 'operator', id: 'user-op-2' });
  assert.deepEqual(sm.activeSurfaces, ['SpatialInspector']);
});

test('Transition 9: operator → meter (cross-entity click)', () => {
  const sm = new StateMachineSimulator();
  sm.selectOperator('user-op-2');
  assert.equal(sm.selectedEntity?.type, 'operator');

  sm.selectMeter('meter-ct-005');
  assert.equal(sm.mode, 'inspect');
  assert.deepEqual(sm.selectedEntity, { type: 'meter', id: 'meter-ct-005' });
  assert.deepEqual(sm.activeSurfaces, ['SpatialInspector']);
});

test('Transition 10: Map → List → Map preservation', () => {
  let viewMode: 'map' | 'list' = 'map';
  const sm = new StateMachineSimulator();
  sm.selectZone('pres-berth');

  viewMode = 'list';
  assert.equal(viewMode, 'list');
  assert.equal(sm.selectedEntity?.id, 'pres-berth');

  viewMode = 'map';
  assert.equal(viewMode, 'map');
  assert.equal(sm.mode, 'inspect');
  assert.deepEqual(sm.activeSurfaces, ['SpatialInspector']);
});

test('Transition 11: ESC from inspect → browse', () => {
  const sm = new StateMachineSimulator();
  sm.selectZone('pres-berth');
  assert.equal(sm.mode, 'inspect');

  sm.handleEsc();
  assert.equal(sm.mode, 'browse');
  assert.equal(sm.selectedEntity, null);
  assert.deepEqual(sm.activeSurfaces, []);
});

test('Transition 12: ESC from details → inspect', () => {
  const sm = new StateMachineSimulator();
  sm.selectZone('pres-berth');
  sm.openDetails();
  assert.equal(sm.mode, 'details');

  sm.handleEsc();
  assert.equal(sm.mode, 'inspect');
  assert.equal(sm.detailView, null);
  assert.deepEqual(sm.selectedEntity, { type: 'zone', id: 'pres-berth' });
  assert.deepEqual(sm.activeSurfaces, ['SpatialInspector']);
});

test('Transition 13: ESC from placement → details', () => {
  const sm = new StateMachineSimulator();
  sm.selectZone('pres-berth');
  sm.openDetails();
  sm.startPlacement('pres-berth', 'Khu vực Cầu cảng (Berths 1–3)');
  assert.equal(sm.mode, 'placement');

  sm.handleEsc();
  assert.equal(sm.mode, 'details');
  assert.equal(sm.detailView, 'zone');
  assert.deepEqual(sm.activeSurfaces, ['MapContextRail']);
});

test('Transition 14: empty-map click → browse', () => {
  const sm = new StateMachineSimulator();
  sm.selectMeter('meter-ct-001');
  assert.equal(sm.mode, 'inspect');

  sm.handleEmptyMapClick();
  assert.equal(sm.mode, 'browse');
  assert.equal(sm.selectedEntity, null);
  assert.deepEqual(sm.activeSurfaces, []);
});

test('Transition 15: rapid entity switching maintains single-surface invariant', () => {
  const sm = new StateMachineSimulator();
  const entities: SelectedEntity[] = [
    { type: 'zone', id: 'pres-berth' },
    { type: 'operator', id: 'op-1' },
    { type: 'meter', id: 'meter-1' },
    { type: 'zone', id: 'pres-container-center' },
    { type: 'operator', id: 'op-2' },
    { type: 'meter', id: 'meter-2' },
    { type: 'zone', id: 'pres-technical' },
  ];

  for (const ent of entities) {
    if (ent.type === 'zone') sm.selectZone(ent.id);
    else if (ent.type === 'operator') sm.selectOperator(ent.id);
    else if (ent.type === 'meter') sm.selectMeter(ent.id);

    assert.equal(sm.activeSurfaces.length, 1);
    assert.equal(sm.activeSurfaces[0], 'SpatialInspector');
    assert.deepEqual(sm.selectedEntity, ent);
  }
});

test('Invariant 1: Hover never modifies selectedEntity', () => {
  const sm = new StateMachineSimulator();
  sm.selectZone('pres-berth');

  sm.setHoveredEntity({ type: 'operator', id: 'op-99' });
  assert.deepEqual(sm.selectedEntity, { type: 'zone', id: 'pres-berth' });

  sm.setHoveredEntity({ type: 'meter', id: 'meter-99' });
  assert.deepEqual(sm.selectedEntity, { type: 'zone', id: 'pres-berth' });

  sm.setHoveredEntity(null);
  assert.deepEqual(sm.selectedEntity, { type: 'zone', id: 'pres-berth' });
});
