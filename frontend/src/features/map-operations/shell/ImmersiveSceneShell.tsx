import React from 'react';
import type { AdminDashboardResponse, User } from '../../../types';
import type {
  MapMeterItem,
  MapOperationalZone,
  MapFilterOptions,
  MapViewportState,
} from '../types';
import type { OperatorShiftSummary } from '../utils/deriveOperatorShiftSummary';

import { SceneHeaderHUD } from './SceneHeaderHUD';
import { SceneTopControls } from './SceneTopControls';
import { SceneActionHUD } from './SceneActionHUD';
import { SceneSummaryHUD } from './SceneSummaryHUD';
import { SceneRoundHUD } from './SceneRoundHUD';
import { SceneControlHUD } from './SceneControlHUD';
import { OperationalListView } from './OperationalListView';

import { OperationalScene } from '../scene/OperationalScene';
import {
  ZoneDrawer,
  MeterQuickPopup,
  MeterDetailDrawer,
  OperatorShiftPopover,
  AnalyticsDrawer,
} from '../context';

interface ImmersiveSceneShellProps {
  // Data
  selectedDate: string;
  onDateChange: (date: string) => void;
  dashboardData: AdminDashboardResponse | null;
  mapMeters: MapMeterItem[];
  filteredMeters: MapMeterItem[];
  mapZones: MapOperationalZone[];
  availableOperators: User[];
  overallKpis: {
    total: number;
    confirmed: number;
    review: number;
    overdue: number;
    due: number;
    pending: number;
    percent: number;
    currentRoundTime?: string | null;
    currentRoundStatus?: string | null;
  };
  isLoading: boolean;
  onRefresh: () => void;
  onExportCsv: () => void;

  // View Mode: Map / List
  viewMode: 'map' | 'list';
  onViewModeChange: (mode: 'map' | 'list') => void;

  // Selection & Filters
  selectedRoundId?: string;
  onSelectRound: (roundId: string) => void;
  filters: MapFilterOptions;
  onApplyFilters: (filters: MapFilterOptions) => void;

  selection: {
    selectedZoneId: string | null;
    selectedMeterId: string | null;
    hoveredZoneId: string | null;
    hoveredMeterId: string | null;
  };
  selectedMeter?: MapMeterItem;
  selectedZone?: MapOperationalZone;
  selectedOperatorSummary?: OperatorShiftSummary | null;
  selectedOperatorShiftId?: string | null;

  onSelectZone: (zoneId: string) => void;
  onSelectMeter: (meterId: string) => void;
  onSelectOperator: (operatorId: string) => void;
  onHoverZone: (zoneId: string | null) => void;
  onHoverMeter: (meterId: string | null) => void;
  onClearSelection: () => void;
  onCloseOperatorPopover: () => void;

  // Viewport
  viewport: MapViewportState;
  onViewportChange: (viewport: MapViewportState) => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onResetView: () => void;

  // Alert Focus & Telemetry Focus
  exceptionFocus: boolean;
  onToggleExceptionFocus: () => void;
  activeFocusType: 'OVERDUE' | 'REVIEW' | 'PENDING' | null;
  onFocusTypeChange: (type: 'OVERDUE' | 'REVIEW' | 'PENDING' | null) => void;

  // Drawers
  detailOpen: boolean;
  onSetDetailOpen: (open: boolean) => void;
  analyticsOpen: boolean;
  onSetAnalyticsOpen: (open: boolean) => void;
  onInspectReading?: (readingId: string) => void;
  onReassignOperator?: (zoneId: string, userId: string, note?: string) => Promise<void>;
}

/**
 * ImmersiveSceneShell — Unified Spatial Operations Shell (Phase U0 → U4)
 *
 * Implements the 4-layer architecture:
 * LAYER A: Base App Shell integration (.sgp-map-first-root)
 * LAYER B: Immersive Map Scene (OperationalScene) or OperationalListView
 * LAYER C: Integrated Scene HUDs (Header, Top Controls, Actions, Summary, Round, Viewport)
 * LAYER D: Contextual Details (ZoneDrawer, MeterQuickPopup, MeterDetailDrawer, OperatorShiftPopover, AnalyticsDrawer)
 */
export const ImmersiveSceneShell: React.FC<ImmersiveSceneShellProps> = ({
  selectedDate,
  onDateChange,
  dashboardData,
  mapMeters,
  filteredMeters,
  mapZones,
  availableOperators,
  overallKpis,
  isLoading,
  onRefresh,
  onExportCsv,

  viewMode,
  onViewModeChange,

  selectedRoundId,
  onSelectRound,
  filters,
  onApplyFilters,

  selection,
  selectedMeter,
  selectedZone,
  selectedOperatorSummary,
  selectedOperatorShiftId,

  onSelectZone,
  onSelectMeter,
  onSelectOperator,
  onHoverZone,
  onHoverMeter,
  onClearSelection,
  onCloseOperatorPopover,

  viewport,
  onViewportChange,
  onZoomIn,
  onZoomOut,
  onResetView,

  exceptionFocus,
  onToggleExceptionFocus,
  activeFocusType,
  onFocusTypeChange,

  detailOpen,
  onSetDetailOpen,
  analyticsOpen,
  onSetAnalyticsOpen,
  onInspectReading,
  onReassignOperator,
}) => {
  const issueCount = overallKpis.overdue + overallKpis.review;
  const rounds = dashboardData?.round_progress || [];

  return (
    <div className="sgp-map-first-root" role="main" aria-label="Trung tâm tác nghiệp công tơ Cảng Tân Thuận">
      {/* IMMERSIVE FULL-BLEED WORKSPACE CONTAINER */}
      <main
        className="sgp-map-first-workspace"
        style={{ position: 'relative', width: '100%', height: '100%', overflow: 'hidden' }}
      >
        {/* ============================================================ */}
        {/* LAYER B: PRIMARY CENTER CANVAS (MAP OR LIST)                */}
        {/* ============================================================ */}
        {viewMode === 'map' ? (
          <OperationalScene
            zones={mapZones}
            meters={filteredMeters}
            selectedZoneId={selection.selectedZoneId}
            selectedMeterId={selection.selectedMeterId}
            hoveredZoneId={selection.hoveredZoneId}
            hoveredMeterId={selection.hoveredMeterId}
            activeLayer="STATUS"
            exceptionsOnly={false}
            exceptionFocus={exceptionFocus || Boolean(activeFocusType)}
            selectedOperatorId={filters.operatorId === 'ALL' ? undefined : filters.operatorId}
            selectedOperatorShiftId={selectedOperatorShiftId}
            currentRoundTime={overallKpis.currentRoundTime || undefined}
            viewport={viewport}
            onSelectZone={onSelectZone}
            onSelectMeter={onSelectMeter}
            onSelectOperator={onSelectOperator}
            onHoverZone={onHoverZone}
            onHoverMeter={onHoverMeter}
            onClearSelection={onClearSelection}
            onViewportChange={onViewportChange}
          />
        ) : (
          <OperationalListView
            meters={filteredMeters}
            selectedMeterId={selection.selectedMeterId}
            onSelectMeter={onSelectMeter}
            onInspectReading={onInspectReading}
            onSwitchToMap={() => onViewModeChange('map')}
          />
        )}

        {/* ============================================================ */}
        {/* LAYER C: INTEGRATED SCENE HUD OVERLAYS                       */}
        {/* ============================================================ */}
        <div className="sgp-scene-hud-container" style={{ pointerEvents: 'none' }}>
          {/* TOP BAR CLUSTER */}
          <div className="sgp-hud-top-bar" style={{ pointerEvents: 'none' }}>
            <div style={{ pointerEvents: 'auto' }}>
              <SceneHeaderHUD />
            </div>

            <div style={{ pointerEvents: 'auto' }}>
              <SceneTopControls
                selectedDate={selectedDate}
                onDateChange={onDateChange}
                rounds={rounds}
                currentRoundTime={overallKpis.currentRoundTime}
                currentRoundStatus={overallKpis.currentRoundStatus}
                selectedRoundId={selectedRoundId}
                onSelectRound={onSelectRound}
                viewMode={viewMode}
                onViewModeChange={onViewModeChange}
                onRefresh={onRefresh}
                isLoading={isLoading}
                onExportCsv={onExportCsv}
                onOpenAnalytics={() => onSetAnalyticsOpen(true)}
              />
            </div>
          </div>

          {/* LEFT ACTIONS HUD (Search & Filter) */}
          <div className="sgp-hud-left-actions" style={{ pointerEvents: 'auto' }}>
            <SceneActionHUD
              meters={mapMeters}
              zones={mapZones}
              operators={availableOperators}
              filters={filters}
              onApplyFilters={onApplyFilters}
              onSelectMeter={onSelectMeter}
              onSelectZone={onSelectZone}
              onSelectOperator={onSelectOperator}
            />
          </div>

          {/* RIGHT SUMMARY & TELEMETRY HUD */}
          <div className="sgp-hud-right-summary" style={{ pointerEvents: 'auto' }}>
            <SceneSummaryHUD
              totalMeters={overallKpis.total}
              confirmedCount={overallKpis.confirmed}
              overdueCount={overallKpis.overdue}
              reviewCount={overallKpis.review}
              pendingCount={overallKpis.pending}
              issueCount={issueCount}
              exceptionFocus={exceptionFocus}
              activeFocusType={activeFocusType}
              onToggleExceptionFocus={onToggleExceptionFocus}
              onFocusTypeChange={onFocusTypeChange}
              onOpenAnalytics={() => onSetAnalyticsOpen(true)}
            />
          </div>

          {/* BOTTOM LEFT: COMPACT ROUND HUD */}
          <div className="sgp-hud-bottom-left" style={{ pointerEvents: 'auto' }}>
            <SceneRoundHUD
              rounds={rounds}
              currentRoundTime={overallKpis.currentRoundTime || undefined}
              selectedRoundId={selectedRoundId}
              completionPercent={overallKpis.percent}
              onSelectRound={onSelectRound}
            />
          </div>

          {/* BOTTOM RIGHT: VIEWPORT CONTROLS & LEGEND */}
          {viewMode === 'map' && (
            <div className="sgp-hud-bottom-right" style={{ pointerEvents: 'auto' }}>
              <SceneControlHUD
                zoom={viewport.zoom}
                activeLayer="STATUS"
                onZoomIn={onZoomIn}
                onZoomOut={onZoomOut}
                onResetView={onResetView}
              />
            </div>
          )}
        </div>

        {/* ============================================================ */}
        {/* LAYER D: CONTEXTUAL DETAILS & DRAWERS                        */}
        {/* ============================================================ */}

        {/* Level 2: Compact Anchored Meter Quick Popup */}
        {selectedMeter && !detailOpen && viewMode === 'map' && (
          <MeterQuickPopup
            meter={selectedMeter}
            viewport={viewport}
            onDetails={() => onSetDetailOpen(true)}
            onClose={onClearSelection}
          />
        )}

        {/* Level 2: Spatial Operator Shift Progress Popover */}
        {selectedOperatorSummary && !selectedMeter && !selectedZone && !detailOpen && viewMode === 'map' && (
          <OperatorShiftPopover
            summary={selectedOperatorSummary}
            onClose={onCloseOperatorPopover}
            onSelectZone={onSelectZone}
          />
        )}

        {/* Level 2: Contextual Zone Drawer */}
        {selectedZone && !selectedMeter && !analyticsOpen && (
          <ZoneDrawer
            zone={selectedZone}
            allMeters={mapMeters}
            currentRoundTime={overallKpis.currentRoundTime || undefined}
            availableOperators={availableOperators}
            onClose={onClearSelection}
            onSelectMeter={onSelectMeter}
            onReassignOperator={onReassignOperator}
          />
        )}

        {/* Level 3: Full Detail Meter Detail Drawer */}
        {selectedMeter && detailOpen && (
          <MeterDetailDrawer
            meter={selectedMeter}
            onClose={onClearSelection}
            onInspectReading={onInspectReading}
          />
        )}

        {/* Level 3: Analytics Quality & Progress Drawer */}
        {analyticsOpen && !detailOpen && (
          <AnalyticsDrawer
            dashboardData={dashboardData}
            zones={mapZones}
            onClose={() => onSetAnalyticsOpen(false)}
            onInspectReading={onInspectReading}
            onSelectZone={(zoneId) => {
              onSetAnalyticsOpen(false);
              onSelectZone(zoneId);
            }}
          />
        )}
      </main>
    </div>
  );
};
