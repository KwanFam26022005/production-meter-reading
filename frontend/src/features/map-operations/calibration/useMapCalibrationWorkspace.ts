/**
 * Centralized Map Calibration Workspace Controller & State Management (V12)
 *
 * Implements:
 * - MapWorkspaceView normalization ('map' | 'list' | 'calibration')
 * - Draft vs Published geometry state isolation
 * - isGeometryDirty tracking
 * - Local draft persistence (tan-thuan-map-calibration-draft:v10)
 * - Deterministic JSON export (tanThuanPresentationGeometry.v10.<timestamp>.json)
 * - Pre-publish structural validation gate (6 zones, 1915x821, simple polygons, meter containment, anchors)
 * - Safe JSON import with pre-validation
 * - Single source of truth for openMapCalibration() and closeMapCalibration()
 */

import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import {
  CANONICAL_GEOMETRY_V10,
  V10GeometryManifest,
  CANONICAL_WIDTH,
  CANONICAL_HEIGHT,
} from '../geometry/tanThuanPresentationGeometryV10';
import {
  checkPolygonSimplicity,
  calculatePolygonArea,
  checkVerticesBounds,
  isPointInPolygon2D,
} from './calibrationGeometryUtils';
import { CANONICAL_12_METERS_AUDIT } from '../geometry/canonicalScene';
import type { MapWorkspaceView } from '../../../types';

export const CALIBRATION_DRAFT_STORAGE_KEY = 'tan-thuan-map-calibration-draft:v10';

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
 * Validates a geometry manifest against the strict V12 pre-publish gate (Section 14).
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
  if (!manifest.mapVersion || !manifest.mapVersion.startsWith('tan-thuan-v10')) {
    warnings.push(`Phiên bản bản đồ dự kiến tan-thuan-v10: ${manifest.mapVersion}`);
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
 * LocalStorage draft persistence helpers (Section 11)
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
 * Primary Reusable Hook: useMapCalibrationWorkspace (Section 8)
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
}

export function useMapCalibrationWorkspace(
  initialView: MapWorkspaceView = 'map',
  onCloseContextSurfaces?: () => void
): MapCalibrationWorkspace {
  const [workspaceView, setWorkspaceViewState] = useState<MapWorkspaceView>(() => {
    if (hasCalibrationQueryParam()) return 'calibration';
    return initialView;
  });

  const previousViewRef = useRef<MapWorkspaceView>('map');

  // 1. Published geometry (current session baseline)
  const [publishedGeometry, setPublishedGeometry] = useState<V10GeometryManifest>(() =>
    JSON.parse(JSON.stringify(CANONICAL_GEOMETRY_V10))
  );

  // 2. Draft geometry (editable working copy)
  const [draftGeometry, setDraftGeometry] = useState<V10GeometryManifest>(() => {
    const savedDraft = loadDraftFromStorage();
    if (savedDraft) return savedDraft;
    return JSON.parse(JSON.stringify(CANONICAL_GEOMETRY_V10));
  });

  const [hasSavedDraft, setHasSavedDraft] = useState<boolean>(() => !!loadDraftFromStorage());
  const [showUnsavedModal, setShowUnsavedModal] = useState<boolean>(false);

  // 3. Dirty state calculation (Section 10)
  const isGeometryDirty = useMemo(() => {
    const pubStr = JSON.stringify(publishedGeometry.zones);
    const draftStr = JSON.stringify(draftGeometry.zones);
    const pubLmStr = JSON.stringify(publishedGeometry.landmarks || []);
    const draftLmStr = JSON.stringify(draftGeometry.landmarks || []);
    return pubStr !== draftStr || pubLmStr !== draftLmStr;
  }, [publishedGeometry, draftGeometry]);

  // 4. Live Pre-Publish Validation Gate (Section 14)
  const validationGate = useMemo(() => {
    return validatePrePublishGeometry(draftGeometry);
  }, [draftGeometry]);

  // 5. Reusable Centralized Entry Point: openMapCalibration() (Section 5, 8)
  const openMapCalibration = useCallback(() => {
    if (workspaceView !== 'calibration') {
      previousViewRef.current = workspaceView;
    }
    // Close open contextual surfaces
    onCloseContextSurfaces?.();

    // Check if there is a saved draft in localStorage
    const saved = loadDraftFromStorage();
    if (saved) {
      setDraftGeometry(saved);
      setHasSavedDraft(true);
    }

    setWorkspaceViewState('calibration');
  }, [workspaceView, onCloseContextSurfaces]);

  // 6. Centralized Exit Point: closeMapCalibration() (Section 6, 8, 10)
  const closeMapCalibration = useCallback(
    (force = false) => {
      if (isGeometryDirty && !force) {
        setShowUnsavedModal(true);
        return;
      }

      setShowUnsavedModal(false);
      // Clean up URL query param without reload
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
        }
      }
    },
    [workspaceView, openMapCalibration, closeMapCalibration]
  );

  // 7. Save Draft Action (Section 11)
  const saveDraft = useCallback(() => {
    saveDraftToStorage(draftGeometry);
    setHasSavedDraft(true);
  }, [draftGeometry]);

  // 8. Discard Draft Action (Section 10)
  const discardDraft = useCallback(() => {
    clearDraftFromStorage();
    setDraftGeometry(JSON.parse(JSON.stringify(publishedGeometry)));
    setHasSavedDraft(false);
    setShowUnsavedModal(false);
    closeMapCalibration(true);
  }, [publishedGeometry, closeMapCalibration]);

  // 9. Reset to published
  const resetToPublished = useCallback(() => {
    setDraftGeometry(JSON.parse(JSON.stringify(publishedGeometry)));
  }, [publishedGeometry]);

  // 10. Apply Geometry Action (Section 13)
  const applyGeometry = useCallback(() => {
    const gate = validatePrePublishGeometry(draftGeometry);
    if (!gate.valid) {
      return { success: false, errors: gate.errors };
    }

    const appliedManifest = JSON.parse(JSON.stringify(draftGeometry));
    setPublishedGeometry(appliedManifest);
    clearDraftFromStorage();
    setHasSavedDraft(false);

    // Generate canonical JSON artifact for Git commit (Section 12, 13)
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

  // 11. Import Geometry Action (Section 12)
  const importGeometry = useCallback((jsonStr: string) => {
    const res = validateImportJson(jsonStr);
    if (!res.valid || !res.data) {
      return { success: false, error: res.error || 'Dữ liệu không hợp lệ' };
    }
    setDraftGeometry(res.data);
    return { success: true };
  }, []);

  // Backward compatibility: ?mapCalibration=1 on initial mount (Section 7)
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
  };
}
