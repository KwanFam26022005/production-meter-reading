/**
 * Centralized Map Calibration Workspace Controller & State Management (V16)
 *
 * Implements:
 * - MapWorkspaceView normalization ('map' | 'list' | 'calibration')
 * - Backend authoritative Draft vs Published geometry state
 * - Optimistic concurrency via revision tracking & 409 Conflict handling
 * - SyncStatus state machine:
 *   'SYNCED' | 'MODIFIED' | 'SAVING' | 'SAVED' | 'CONFLICT' | 'READY_TO_PUBLISH' | 'INVALID'
 * - Server-side validation pipeline & atomic publish transaction
 * - Historical versioning & atomic rollback
 * - Legacy localStorage draft migration prompt
 * - Deterministic JSON export & import
 */

import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import {
  CANONICAL_GEOMETRY_V10,
  V10GeometryManifest,
  V10RawZone,
  CANONICAL_WIDTH,
  CANONICAL_HEIGHT,
} from '../geometry/tanThuanPresentationGeometryV10';
import {
  CalibrationLandmark,
  CANONICAL_V10_LANDMARKS,
} from '../geometry/canonicalLandmarks';
import {
  checkPolygonSimplicity,
  calculatePolygonArea,
  checkVerticesBounds,
  isPointInPolygon2D,
} from './calibrationGeometryUtils';
import { CANONICAL_12_METERS_AUDIT } from '../geometry/canonicalScene';
import type { MapWorkspaceView } from '../../../types';
import {
  getActiveMapConfig,
  getCurrentMapDraft,
  createMapDraft,
  updateDraftZone,
  validateMapVersion,
  publishMapVersion,
  rollbackMapVersion,
  deleteMapDraft,
  getMapVersions,
} from '../../../services/api';
import type {
  MapVersionOut,
  MapVersionSummary,
  MapValidationResponse,
} from '../../../types';

export const CALIBRATION_DRAFT_STORAGE_KEY = 'tan-thuan-map-calibration-draft:v10';

export type DraftSyncStatus =
  | 'SYNCED'
  | 'MODIFIED'
  | 'SAVING'
  | 'SAVED'
  | 'CONFLICT'
  | 'READY_TO_PUBLISH'
  | 'INVALID';

export interface PrePublishValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  zonesCount: number;
  simplePolygons: boolean;
  metersContained: number;
  totalMeters: number;
  anchorsValid: boolean;
  landmarksValid: boolean;
}

export function formatExportTimestamp(d = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  const yyyy = d.getFullYear();
  const mm = pad(d.getMonth() + 1);
  const dd = pad(d.getDate());
  const hh = pad(d.getHours());
  const min = pad(d.getMinutes());
  const ss = pad(d.getSeconds());
  return `${yyyy}${mm}${dd}-${hh}${min}${ss}`;
}

/**
 * Converts backend MapVersionOut to frontend V10GeometryManifest.
 */
export function mapVersionOutToManifest(mv: MapVersionOut): V10GeometryManifest {
  const allLandmarks: CalibrationLandmark[] = [];
  const seenLm = new Set<string>();

  const rawZones: V10RawZone[] = mv.zones.map((z) => {
    if (Array.isArray(z.landmarks)) {
      for (const lm of z.landmarks) {
        if (!seenLm.has(lm.id)) {
          seenLm.add(lm.id);
          allLandmarks.push(lm as unknown as CalibrationLandmark);
        }
      }
    }
    const validIcons: Record<string, V10RawZone['icon']> = {
      ship: 'ship',
      container: 'container',
      warehouse: 'warehouse',
      gear: 'gear',
      gate: 'gate',
    };
    const zoneIcon: V10RawZone['icon'] = validIcons[z.icon || ''] || 'container';

    return {
      id: z.zone_id,
      displayIndex: z.display_index,
      displayLabel: z.display_label,
      businessName: z.business_name || '',
      businessZoneIds: z.business_zone_id ? [z.business_zone_id] : [],
      presentationColor: z.presentation_color,
      icon: zoneIcon,
      polygonCanonical: z.polygon_canonical || [],
      labelAnchorCanonical: z.label_anchor_canonical,
      operatorAnchorCanonical: z.operator_anchor_canonical,
    };
  });

  return {
    schemaVersion: '1.0',
    mapVersion: mv.map_version,
    coordinateSystem: mv.coordinate_system,
    canonicalWidth: mv.canonical_width,
    canonicalHeight: mv.canonical_height,
    zones: rawZones,
    landmarks: allLandmarks.length > 0 ? allLandmarks : CANONICAL_V10_LANDMARKS,
  };
}

/**
 * Validates a geometry manifest against the strict V12 pre-publish gate.
 */
export function validatePrePublishGeometry(
  manifest: V10GeometryManifest
): PrePublishValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // 1. Dimensions and metadata
  if (manifest.canonicalWidth !== 1915 || manifest.canonicalHeight !== 821) {
    errors.push(
      `Kích thước chuẩn phải là 1915x821 px (hiện tại: ${manifest.canonicalWidth}x${manifest.canonicalHeight})`
    );
  }
  if (manifest.coordinateSystem !== 'tan-thuan-canonical-image-pixel-space-v1') {
    errors.push(`Hệ tọa độ không khớp: ${manifest.coordinateSystem}`);
  }

  // 2. Exact 6 presentation zones
  const zones = manifest.zones || [];
  if (zones.length !== 6) {
    errors.push(`Số lượng phân vùng hiển thị phải đúng bằng 6 (hiện tại: ${zones.length})`);
  }

  const expectedZoneIds = [
    'pres-berth',
    'pres-container-west',
    'pres-container-center',
    'pres-cfs-east',
    'pres-technical',
    'pres-gate',
  ];
  for (const expId of expectedZoneIds) {
    if (!zones.some((z) => z.id === expId)) {
      errors.push(`Thiếu phân vùng bắt buộc: ${expId}`);
    }
  }

  // 3. Simple polygons, bounds, non-zero area, and anchors
  let allSimple = true;
  let allAnchorsValid = true;

  for (const zone of zones) {
    const poly = zone.polygonCanonical || [];
    if (poly.length < 3) {
      errors.push(`Phân vùng ${zone.id} có ít hơn 3 đỉnh (${poly.length})`);
      allSimple = false;
      continue;
    }

    const simplicity = checkPolygonSimplicity(poly);
    if (!simplicity.isSimple) {
      errors.push(
        `Phân vùng ${zone.id} (${zone.displayLabel}) tự cắt cạnh tại [${simplicity.intersection?.edge1}, ${simplicity.intersection?.edge2}]`
      );
      allSimple = false;
    }

    const inBounds = checkVerticesBounds(poly, CANONICAL_WIDTH, CANONICAL_HEIGHT);
    if (!inBounds) {
      errors.push(`Phân vùng ${zone.id} có đỉnh nằm ngoài giới hạn [0, 1915] x [0, 821]`);
    }

    const area = calculatePolygonArea(poly);
    if (area < 1000) {
      errors.push(`Phân vùng ${zone.id} có diện tích quá nhỏ (${Math.round(area)} px²)`);
    }

    // Label anchor
    if (!zone.labelAnchorCanonical) {
      errors.push(`Phân vùng ${zone.id} thiếu điểm neo nhãn (labelAnchorCanonical)`);
      allAnchorsValid = false;
    } else if (!isPointInPolygon2D(zone.labelAnchorCanonical, poly)) {
      errors.push(
        `Điểm neo nhãn của ${zone.id} (${zone.labelAnchorCanonical.x}, ${zone.labelAnchorCanonical.y}) nằm NGOÀI ranh giới phân vùng`
      );
      allAnchorsValid = false;
    }

    // Operator anchor
    if (!zone.operatorAnchorCanonical) {
      errors.push(`Phân vùng ${zone.id} thiếu điểm neo nhân sự (operatorAnchorCanonical)`);
      allAnchorsValid = false;
    } else if (!isPointInPolygon2D(zone.operatorAnchorCanonical, poly)) {
      errors.push(
        `Điểm neo nhân sự của ${zone.id} (${zone.operatorAnchorCanonical.x}, ${zone.operatorAnchorCanonical.y}) nằm NGOÀI ranh giới phân vùng`
      );
      allAnchorsValid = false;
    }
  }

  // 4. 12 Canonical Meters Containment
  let containedMetersCount = 0;
  const totalMeters = CANONICAL_12_METERS_AUDIT.length;

  for (const meter of CANONICAL_12_METERS_AUDIT) {
    const assignedZone = zones.find((z) => z.id === meter.presentationRegionId);
    if (!assignedZone) {
      errors.push(
        `Công tơ ${meter.code} (${meter.name}) chỉ định phân khu không tồn tại: ${meter.presentationRegionId}`
      );
      continue;
    }
    const isInside = isPointInPolygon2D(
      { x: meter.canonicalX, y: meter.canonicalY },
      assignedZone.polygonCanonical
    );
    if (isInside) {
      containedMetersCount++;
    } else {
      errors.push(
        `Công tơ ${meter.code} (${meter.name}) tại (${meter.canonicalX}, ${meter.canonicalY}) nằm NGOÀI phân khu ${assignedZone.id}`
      );
    }
  }

  // 5. Landmark references
  const lmPool = new Set((manifest.landmarks || []).map((lm) => lm.id));
  let landmarksValid = true;
  for (const zone of zones) {
    for (let i = 0; i < (zone.polygonCanonical || []).length; i++) {
      const v = zone.polygonCanonical[i];
      if (v.landmarkId && !lmPool.has(v.landmarkId)) {
        warnings.push(
          `Đỉnh [${i}] của ${zone.id} tham chiếu mốc không tồn tại trong danh mục: ${v.landmarkId}`
        );
        landmarksValid = false;
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    zonesCount: zones.length,
    simplePolygons: allSimple,
    metersContained: containedMetersCount,
    totalMeters,
    anchorsValid: allAnchorsValid,
    landmarksValid,
  };
}

/**
 * Validates imported JSON string before applying to draft state.
 */
export function validateImportJson(
  jsonStr: string
): { valid: boolean; data?: V10GeometryManifest; error?: string } {
  try {
    const parsed = JSON.parse(jsonStr);
    if (!parsed || typeof parsed !== 'object') {
      return { valid: false, error: 'Dữ liệu JSON không hợp lệ' };
    }
    if (parsed.canonicalWidth !== 1915 || parsed.canonicalHeight !== 821) {
      return {
        valid: false,
        error: `Kích thước chuẩn không hợp lệ: ${parsed.canonicalWidth}x${parsed.canonicalHeight} (yêu cầu 1915x821)`,
      };
    }
    if (!Array.isArray(parsed.zones) || parsed.zones.length !== 6) {
      return {
        valid: false,
        error: `Số lượng phân vùng không đúng: ${parsed.zones?.length || 0} (yêu cầu đúng 6 phân vùng)`,
      };
    }
    for (const z of parsed.zones) {
      if (!z.id || !Array.isArray(z.polygonCanonical) || z.polygonCanonical.length < 3) {
        return {
          valid: false,
          error: `Phân vùng ${z.id || 'không xác định'} có ranh giới polygon không hợp lệ`,
        };
      }
    }
    return { valid: true, data: parsed as V10GeometryManifest };
  } catch (err: any) {
    return { valid: false, error: `Lỗi đọc tệp JSON: ${err?.message || 'Cú pháp không hợp lệ'}` };
  }
}

/**
 * LocalStorage draft persistence helpers
 */
export function saveDraftToStorage(manifest: V10GeometryManifest): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(CALIBRATION_DRAFT_STORAGE_KEY, JSON.stringify(manifest));
  } catch (err) {
    console.warn('[MapOps-Calibration] Failed to save draft to localStorage:', err);
  }
}

export function loadDraftFromStorage(): V10GeometryManifest | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(CALIBRATION_DRAFT_STORAGE_KEY);
    if (!raw) return null;
    const res = validateImportJson(raw);
    return res.valid && res.data ? res.data : null;
  } catch {
    return null;
  }
}

export function clearDraftFromStorage(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(CALIBRATION_DRAFT_STORAGE_KEY);
  } catch (err) {
    console.warn('[MapOps-Calibration] Failed to clear draft from localStorage:', err);
  }
}

/**
 * Check if ?mapCalibration=1 is present in URL
 */
export function hasCalibrationQueryParam(): boolean {
  if (typeof window === 'undefined') return false;
  const params = new URLSearchParams(window.location.search);
  return params.get('mapCalibration') === '1' || sessionStorage.getItem('mapCalibration') === '1';
}

/**
 * Primary Reusable Hook: useMapCalibrationWorkspace (V16)
 */
export interface MapCalibrationWorkspace {
  workspaceView: MapWorkspaceView;
  setWorkspaceView: (view: MapWorkspaceView) => void;
  publishedGeometry: V10GeometryManifest;
  draftGeometry: V10GeometryManifest;
  setDraftGeometry: React.Dispatch<React.SetStateAction<V10GeometryManifest>>;
  isGeometryDirty: boolean;
  hasSavedDraft: boolean;
  showUnsavedModal: boolean;
  setShowUnsavedModal: (show: boolean) => void;
  validationGate: PrePublishValidationResult;
  openMapCalibration: () => void;
  closeMapCalibration: (force?: boolean) => void;
  saveDraft: () => void;
  discardDraft: () => void;
  applyGeometry: () => { success: boolean; filename?: string; errors?: string[] };
  importGeometry: (jsonStr: string) => { success: boolean; error?: string };
  resetToPublished: () => void;

  // V16 Persistent Server Extensions
  backendDraftId: string | null;
  draftRevision: number;
  syncStatus: DraftSyncStatus;
  isBackendSaving: boolean;
  isPublishing: boolean;
  isValidating: boolean;
  lastValidationResult: MapValidationResponse | null;
  hasLegacyLocalDraft: boolean;
  versionHistory: MapVersionSummary[];
  saveDraftToBackend: () => Promise<{ success: boolean; conflict?: boolean; error?: string }>;
  validateDraftOnServer: () => Promise<MapValidationResponse | null>;
  publishDraft: () => Promise<{ success: boolean; message?: string; errors?: string[] }>;
  rollbackVersion: (versionId: string, reason?: string) => Promise<{ success: boolean; message?: string; error?: string }>;
  loadVersionHistory: () => Promise<void>;
  migrateLegacyDraft: () => Promise<void>;
  discardLegacyDraft: () => void;
}

export function useMapCalibrationWorkspace(
  initialView: MapWorkspaceView = 'map',
  onCloseContextSurfaces?: () => void
): MapCalibrationWorkspace {
  const [workspaceView, setWorkspaceViewState] = useState<MapWorkspaceView>(() => {
    if (hasCalibrationQueryParam()) return 'calibration';
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('view') === 'list' || sessionStorage.getItem('map_workspace_view') === 'list') {
        return 'list';
      }
    }
    return initialView;
  });

  const previousViewRef = useRef<MapWorkspaceView>('map');

  // 1. Published geometry (authoritative baseline)
  const [publishedGeometry, setPublishedGeometry] = useState<V10GeometryManifest>(() =>
    JSON.parse(JSON.stringify(CANONICAL_GEOMETRY_V10))
  );

  // 2. Draft geometry (editable working copy)
  const [draftGeometry, setDraftGeometry] = useState<V10GeometryManifest>(() => {
    const savedDraft = loadDraftFromStorage();
    if (savedDraft) return savedDraft;
    return JSON.parse(JSON.stringify(CANONICAL_GEOMETRY_V10));
  });

  // V16 Server Synchronization State
  const [backendDraftId, setBackendDraftId] = useState<string | null>(null);
  const [draftRevision, setDraftRevision] = useState<number>(1);
  const [syncStatus, setSyncStatus] = useState<DraftSyncStatus>('SYNCED');
  const [isBackendSaving, setIsBackendSaving] = useState<boolean>(false);
  const [isPublishing, setIsPublishing] = useState<boolean>(false);
  const [isValidating, setIsValidating] = useState<boolean>(false);
  const [lastValidationResult, setLastValidationResult] = useState<MapValidationResponse | null>(null);
  const [hasLegacyLocalDraft, setHasLegacyLocalDraft] = useState<boolean>(() => !!loadDraftFromStorage());
  const [versionHistory, setVersionHistory] = useState<MapVersionSummary[]>([]);

  const [hasSavedDraft, setHasSavedDraft] = useState<boolean>(() => !!loadDraftFromStorage());
  const [showUnsavedModal, setShowUnsavedModal] = useState<boolean>(false);

  // 3. Dirty state calculation
  const isGeometryDirty = useMemo(() => {
    const pubStr = JSON.stringify(publishedGeometry.zones);
    const draftStr = JSON.stringify(draftGeometry.zones);
    const pubLmStr = JSON.stringify(publishedGeometry.landmarks || []);
    const draftLmStr = JSON.stringify(draftGeometry.landmarks || []);
    return pubStr !== draftStr || pubLmStr !== draftLmStr;
  }, [publishedGeometry, draftGeometry]);

  // Update sync status to MODIFIED when user changes geometry
  const initialLoadDone = useRef(false);
  useEffect(() => {
    if (!initialLoadDone.current) {
      initialLoadDone.current = true;
      return;
    }
    if (isGeometryDirty && syncStatus === 'SYNCED') {
      setSyncStatus('MODIFIED');
    }
  }, [isGeometryDirty, syncStatus]);

  // 4. Live Pre-Publish Validation Gate
  const validationGate = useMemo(() => {
    return validatePrePublishGeometry(draftGeometry);
  }, [draftGeometry]);

  // 5. Load Authoritative Active Map Configuration from backend on mount
  const loadActiveConfig = useCallback(async () => {
    try {
      const activeConf = await getActiveMapConfig();
      if (activeConf && activeConf.zones?.length === 6) {
        const manifest = mapVersionOutToManifest(activeConf);
        setPublishedGeometry(manifest);
      }
    } catch {
      // Fall back to CANONICAL_GEOMETRY_V10 gracefully
    }
  }, []);

  useEffect(() => {
    loadActiveConfig();
  }, [loadActiveConfig]);

  // 6. Centralized Entry Point: openMapCalibration()
  const openMapCalibration = useCallback(async () => {
    if (workspaceView !== 'calibration') {
      previousViewRef.current = workspaceView;
    }
    onCloseContextSurfaces?.();

    // Check backend for an existing open draft
    try {
      const currentDraft = await getCurrentMapDraft();
      if (currentDraft && currentDraft.zones?.length === 6) {
        const draftManifest = mapVersionOutToManifest(currentDraft);
        setDraftGeometry(draftManifest);
        setBackendDraftId(currentDraft.id);
        setDraftRevision(currentDraft.revision);
        setSyncStatus('SYNCED');
        setHasSavedDraft(true);
      } else {
        // Check if legacy localStorage draft exists
        const legacy = loadDraftFromStorage();
        if (legacy) {
          setHasLegacyLocalDraft(true);
          setDraftGeometry(legacy);
        } else {
          // Initialize fresh draft on backend
          try {
            const newDraft = await createMapDraft();
            setDraftGeometry(mapVersionOutToManifest(newDraft));
            setBackendDraftId(newDraft.id);
            setDraftRevision(newDraft.revision);
            setSyncStatus('SYNCED');
          } catch {
            // Fallback to local draft
            setDraftGeometry(JSON.parse(JSON.stringify(publishedGeometry)));
          }
        }
      }
    } catch {
      // Offline fallback
      const saved = loadDraftFromStorage();
      if (saved) {
        setDraftGeometry(saved);
        setHasSavedDraft(true);
      }
    }

    setWorkspaceViewState('calibration');
  }, [workspaceView, onCloseContextSurfaces, publishedGeometry]);

  // 7. Centralized Exit Point: closeMapCalibration()
  const closeMapCalibration = useCallback(
    (force = false) => {
      if (isGeometryDirty && !force) {
        setShowUnsavedModal(true);
        return;
      }

      setShowUnsavedModal(false);
      if (typeof window !== 'undefined') {
        sessionStorage.removeItem('mapCalibration');
        const url = new URL(window.location.href);
        if (url.searchParams.has('mapCalibration')) {
          url.searchParams.delete('mapCalibration');
          window.history.replaceState({}, '', url.toString());
        }
      }

      const targetView = previousViewRef.current === 'calibration' ? 'map' : previousViewRef.current;
      setWorkspaceViewState(targetView || 'map');
    },
    [isGeometryDirty]
  );

  const setWorkspaceView = useCallback(
    (view: MapWorkspaceView) => {
      if (view === 'calibration') {
        openMapCalibration();
      } else {
        if (workspaceView === 'calibration') {
          closeMapCalibration();
        } else {
          setWorkspaceViewState(view);
          if (typeof window !== 'undefined') {
            sessionStorage.setItem('map_workspace_view', view);
          }
        }
      }
    },
    [workspaceView, openMapCalibration, closeMapCalibration]
  );

  // 8. Save Draft Action (Saves to backend with optimistic concurrency)
  const saveDraftToBackend = useCallback(async (): Promise<{ success: boolean; conflict?: boolean; error?: string }> => {
    setIsBackendSaving(true);
    setSyncStatus('SAVING');
    try {
      let draftId = backendDraftId;
      let rev = draftRevision;

      // If no draft on server yet, create one
      if (!draftId) {
        const created = await createMapDraft();
        draftId = created.id;
        rev = created.revision;
        setBackendDraftId(draftId);
      }

      // Update all zones in draft
      for (const zone of draftGeometry.zones) {
        const updated = await updateDraftZone(draftId, zone.id, {
          polygon_canonical: zone.polygonCanonical,
          label_anchor_canonical: zone.labelAnchorCanonical,
          operator_anchor_canonical: zone.operatorAnchorCanonical,
          revision: rev,
        });
        rev = updated.revision;
      }

      setDraftRevision(rev);
      setSyncStatus('SAVED');
      setHasSavedDraft(true);
      // Also cache in localStorage for safety
      saveDraftToStorage(draftGeometry);
      setIsBackendSaving(false);
      return { success: true };
    } catch (err: any) {
      setIsBackendSaving(false);
      if (err?.status === 409 || err?.message?.includes('409') || err?.message?.includes('xung đột')) {
        setSyncStatus('CONFLICT');
        return { success: false, conflict: true, error: 'Xung đột phiên bản: Bản nháp đã được chỉnh sửa bởi quản trị viên khác.' };
      }
      setSyncStatus('MODIFIED');
      return { success: false, error: err?.message || 'Không thể lưu bản nháp lên máy chủ.' };
    }
  }, [backendDraftId, draftRevision, draftGeometry]);

  const saveDraft = useCallback(() => {
    saveDraftToStorage(draftGeometry);
    setHasSavedDraft(true);
    saveDraftToBackend();
  }, [draftGeometry, saveDraftToBackend]);

  // 8.5 Validate Draft on Server
  const validateDraftOnServer = useCallback(async (): Promise<MapValidationResponse | null> => {
    let draftId = backendDraftId;
    if (!draftId) {
      const saveRes = await saveDraftToBackend();
      if (!saveRes.success) return null;
      draftId = backendDraftId;
    }
    if (!draftId) return null;
    setIsValidating(true);
    try {
      const res = await validateMapVersion(draftId);
      setLastValidationResult(res);
      setIsValidating(false);
      if (res.valid) {
        setSyncStatus('READY_TO_PUBLISH');
      } else {
        setSyncStatus('INVALID');
      }
      return res;
    } catch {
      setIsValidating(false);
      return null;
    }
  }, [backendDraftId, saveDraftToBackend]);

  // 9. Publish Draft Action (Server Validation Gate -> Atomic Publish Transaction)
  const publishDraft = useCallback(async (): Promise<{ success: boolean; message?: string; errors?: string[] }> => {
    setIsPublishing(true);
    try {
      let draftId = backendDraftId;
      if (!draftId) {
        // Save to backend first
        const saveRes = await saveDraftToBackend();
        if (!saveRes.success) {
          setIsPublishing(false);
          return { success: false, errors: [saveRes.error || 'Lỗi lưu bản nháp trước khi xuất bản'] };
        }
      }
      draftId = backendDraftId!;

      // 1. Server validation gate
      setIsValidating(true);
      const valRes = await validateMapVersion(draftId);
      setIsValidating(false);

      if (!valRes.valid) {
        setSyncStatus('INVALID');
        setIsPublishing(false);
        return { success: false, errors: valRes.errors };
      }

      // 2. Publish
      const pubRes = await publishMapVersion(draftId);
      setSyncStatus('SYNCED');
      setPublishedGeometry(JSON.parse(JSON.stringify(draftGeometry)));
      setBackendDraftId(null);
      clearDraftFromStorage();
      setHasSavedDraft(false);
      setIsPublishing(false);

      // Reload active config across session
      await loadActiveConfig();

      return { success: true, message: pubRes.message };
    } catch (err: any) {
      setIsPublishing(false);
      setIsValidating(false);
      return { success: false, errors: [err?.message || 'Lỗi xuất bản bản đồ'] };
    }
  }, [backendDraftId, draftGeometry, saveDraftToBackend, loadActiveConfig]);

  // 10. Discard Draft Action
  const discardDraft = useCallback(async () => {
    if (backendDraftId) {
      try {
        await deleteMapDraft(backendDraftId);
      } catch {
        // ignore delete failure
      }
      setBackendDraftId(null);
    }
    clearDraftFromStorage();
    setDraftGeometry(JSON.parse(JSON.stringify(publishedGeometry)));
    setHasSavedDraft(false);
    setHasLegacyLocalDraft(false);
    setSyncStatus('SYNCED');
    setShowUnsavedModal(false);
    closeMapCalibration(true);
  }, [backendDraftId, publishedGeometry, closeMapCalibration]);

  // 11. Rollback Action
  const rollbackVersion = useCallback(async (versionId: string, reason?: string) => {
    try {
      const res = await rollbackMapVersion(versionId, reason);
      await loadActiveConfig();
      const currentDraft = await getCurrentMapDraft();
      if (currentDraft) {
        setDraftGeometry(mapVersionOutToManifest(currentDraft));
        setBackendDraftId(currentDraft.id);
        setDraftRevision(currentDraft.revision);
      } else {
        setDraftGeometry(JSON.parse(JSON.stringify(publishedGeometry)));
      }
      return { success: true, message: res.message };
    } catch (err: any) {
      return { success: false, error: err?.message || 'Không thể hoàn tác phiên bản.' };
    }
  }, [loadActiveConfig, publishedGeometry]);

  // 12. Version History
  const loadVersionHistory = useCallback(async () => {
    try {
      const res = await getMapVersions();
      setVersionHistory(res.versions || []);
    } catch {
      setVersionHistory([]);
    }
  }, []);

  // 13. Legacy Draft Migration
  const migrateLegacyDraft = useCallback(async () => {
    await saveDraftToBackend();
    setHasLegacyLocalDraft(false);
    clearDraftFromStorage();
  }, [saveDraftToBackend]);

  const discardLegacyDraft = useCallback(() => {
    clearDraftFromStorage();
    setHasLegacyLocalDraft(false);
    setDraftGeometry(JSON.parse(JSON.stringify(publishedGeometry)));
  }, [publishedGeometry]);

  // 14. Reset to published
  const resetToPublished = useCallback(() => {
    setDraftGeometry(JSON.parse(JSON.stringify(publishedGeometry)));
    setSyncStatus('MODIFIED');
  }, [publishedGeometry]);

  // 15. Apply Geometry Action (Local JSON download fallback)
  const applyGeometry = useCallback(() => {
    const gate = validatePrePublishGeometry(draftGeometry);
    if (!gate.valid) {
      return { success: false, errors: gate.errors };
    }

    const appliedManifest = JSON.parse(JSON.stringify(draftGeometry));
    setPublishedGeometry(appliedManifest);
    clearDraftFromStorage();
    setHasSavedDraft(false);

    const timestamp = formatExportTimestamp();
    const filename = `tanThuanPresentationGeometry.v10.${timestamp}.json`;
    const jsonStr = JSON.stringify(appliedManifest, null, 2);

    if (typeof window !== 'undefined') {
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
    }

    return { success: true, filename };
  }, [draftGeometry]);

  // 16. Import Geometry Action
  const importGeometry = useCallback((jsonStr: string) => {
    const res = validateImportJson(jsonStr);
    if (!res.valid || !res.data) {
      return { success: false, error: res.error || 'Dữ liệu không hợp lệ' };
    }
    setDraftGeometry(res.data);
    setSyncStatus('MODIFIED');
    return { success: true };
  }, []);

  // Backward compatibility: ?mapCalibration=1 on initial mount
  useEffect(() => {
    if (hasCalibrationQueryParam() && workspaceView !== 'calibration') {
      openMapCalibration();
    }
  }, [openMapCalibration, workspaceView]);

  return {
    workspaceView,
    setWorkspaceView,
    publishedGeometry,
    draftGeometry,
    setDraftGeometry,
    isGeometryDirty,
    hasSavedDraft,
    showUnsavedModal,
    setShowUnsavedModal,
    validationGate,
    openMapCalibration,
    closeMapCalibration,
    saveDraft,
    discardDraft,
    applyGeometry,
    importGeometry,
    resetToPublished,

    // V16 Persistent Server Extensions
    backendDraftId,
    draftRevision,
    syncStatus,
    isBackendSaving,
    isPublishing,
    isValidating,
    lastValidationResult,
    hasLegacyLocalDraft,
    versionHistory,
    saveDraftToBackend,
    validateDraftOnServer,
    publishDraft,
    rollbackVersion,
    loadVersionHistory,
    migrateLegacyDraft,
    discardLegacyDraft,
  };
}
