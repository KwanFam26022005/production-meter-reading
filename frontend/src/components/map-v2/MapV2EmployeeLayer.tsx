import React, { useMemo } from 'react';
import { MapV2Manifest, MapV2ToneMode } from './types';
import { MapV2Employee, DEMO_MAP_V2_EMPLOYEES } from './employeeDataAdapter';
import { generateSafeMovementPath, SafeMovementPath } from './employeeMovement';
import { MapV2EmployeeMarker } from './MapV2EmployeeMarker';
import { getZoneAnchor } from './zoneAnchors';

export interface MapV2EmployeeLayerProps {
  manifest: MapV2Manifest;
  employees?: MapV2Employee[];
  selectedEmployeeId?: string | null;
  onSelectEmployee: (employee: MapV2Employee, evt: React.MouseEvent | React.KeyboardEvent) => void;
  isManuallyPaused?: boolean;
  isLayerVisible?: boolean;
  isTechnicalMode?: boolean;
  toneMode?: MapV2ToneMode;
  zoom?: number;
  forcedReducedMotion?: boolean;
}

/**
 * MapV2 Employee Markers Layer
 *
 * Renders all assigned zone employee markers with geometry-validated movement paths.
 * Hidden automatically when layer is toggled off or in Technical Network Mode.
 */
export const MapV2EmployeeLayer: React.FC<MapV2EmployeeLayerProps> = ({
  manifest,
  employees = DEMO_MAP_V2_EMPLOYEES,
  selectedEmployeeId,
  onSelectEmployee,
  isManuallyPaused = false,
  isLayerVisible = true,
  isTechnicalMode = false,
  toneMode = 'technical',
  zoom = 1,
  forcedReducedMotion = false,
}) => {
  // If layer is hidden or in technical network mode, do not render markers
  if (!isLayerVisible || isTechnicalMode) {
    return null;
  }

  // Pre-calculate deterministic, geometry-safe movement paths for each employee
  const pathsMap = useMemo(() => {
    const map = new Map<string, SafeMovementPath>();
    // Group employees by zone to handle multi-worker spacing
    const zoneEmployeeCounts = new Map<string, number>();

    employees.forEach((emp, index) => {
      const polygonObj = manifest.polygons.find((p) => p.id === emp.zoneId);
      const zoneAnchor = getZoneAnchor(emp.zoneId);

      const zoneCount = zoneEmployeeCounts.get(emp.zoneId) || 0;
      zoneEmployeeCounts.set(emp.zoneId, zoneCount + 1);

      if (!polygonObj) {
        // Fallback if zone polygon not found
        const fallbackPoint = zoneAnchor?.point || [500, 500];
        map.set(emp.id, {
          center: fallbackPoint,
          radiusX: 0,
          radiusY: 0,
          isStationary: true,
          reason: 'empty_polygon',
          duration: 0,
          getPositionAt: () => fallbackPoint,
          samplePoints: [fallbackPoint],
          minBoundaryDistance: 0,
        });
        return;
      }

      if (emp.isStationary) {
        const stationaryPoint: [number, number] = emp.coordinates
          ? emp.coordinates
          : (zoneAnchor
              ? [zoneAnchor.point[0] + zoneCount * 28, zoneAnchor.point[1] + zoneCount * 12]
              : polygonObj.vertices[0]);

        map.set(emp.id, {
          center: stationaryPoint,
          radiusX: 0,
          radiusY: 0,
          isStationary: true,
          reason: 'stationary_assignee',
          duration: 0,
          getPositionAt: () => stationaryPoint,
          samplePoints: [stationaryPoint],
          minBoundaryDistance: 0,
        });
        return;
      }

      // Offset starting anchor slightly if multiple employees in same zone
      const anchorPoint: [number, number] = zoneAnchor
        ? [zoneAnchor.point[0] + zoneCount * 28, zoneAnchor.point[1] + zoneCount * 12]
        : polygonObj.vertices[0];

      // Generate verified safe path
      const path = generateSafeMovementPath({
        polygon: polygonObj.vertices,
        preferredAnchor: anchorPoint,
        markerRadius: 14,
        clearanceMargin: 4,
        desiredRadius: 22,
        seed: `${emp.id}_${emp.zoneId}_${index}`,
        cycleDuration: 8 + (index % 3) * 2, // 8s, 10s, 12s stagger
      });

      map.set(emp.id, path);
    });

    return map;
  }, [manifest.polygons, employees]);

  return (
    <g id="layer-employee-markers" className="map-v2-layer-employees">
      {employees.map((emp, index) => {
        const path = pathsMap.get(emp.id);
        if (!path) return null;

        const isSelected = selectedEmployeeId === emp.id;
        // Stagger initial progress so markers don't move in synchronized formation
        const initialProgress = (index * 0.33) % 1;

        return (
          <MapV2EmployeeMarker
            key={emp.id}
            employee={emp}
            path={path}
            isSelected={isSelected}
            onSelect={onSelectEmployee}
            isManuallyPaused={isManuallyPaused}
            isLayerVisible={isLayerVisible}
            isTechnicalMode={isTechnicalMode}
            toneMode={toneMode}
            initialProgress={initialProgress}
            zoomScale={zoom}
            forcedReducedMotion={forcedReducedMotion}
          />
        );
      })}
    </g>
  );
};
