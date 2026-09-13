/**
 * useOperationalMotion — React Hook for Map Operational Workflow Motion (V15C)
 *
 * Coordinates:
 * - Singleton OperationalMotionController instance
 * - Map / List lifecycle pause/resume
 * - Calibration mode pause/resume
 * - Target meter animation synchronization
 * - Active route for selected operator
 */

import { useState, useEffect, useRef, useMemo } from 'react';
import {
  OperationalMotionController,
  OperatorWorkflowRecord,
  MotionMode,
} from './OperationalMotionController';
import { PlannedRoute } from './routing/RouteTypes';
import { MapOperationalZone, MapMeterItem } from '../types';
import { getZoneOperatorAnchor } from '../geometry/operationalGeometry';

export interface UseOperationalMotionProps {
  zones: MapOperationalZone[];
  meters: MapMeterItem[];
  selectedOperatorId?: string | null;
  isCalibrationActive?: boolean;
  viewMode?: 'map' | 'list' | 'calibration' | string;
  demoMode?: boolean;
}

export interface UseOperationalMotionReturn {
  controller: OperationalMotionController;
  activePlannedRoute: PlannedRoute | null;
  getOperatorWorkflowPosition: (operatorId: string) => { x: number; y: number } | undefined;
  getOperatorWorkflowState: (operatorId: string) => OperatorWorkflowRecord['state'] | undefined;
  getMeterMotionOverride: (meterId: string) => 'approaching' | 'reading' | 'completed' | undefined;
  startOperatorMovement: (operatorId: string, meterId: string) => boolean;
  motionMode: MotionMode;
  setMotionMode: (mode: MotionMode) => void;
}

export function useOperationalMotion({
  zones,
  meters: _meters,
  selectedOperatorId,
  isCalibrationActive = false,
  viewMode = 'map',
  demoMode = false,
}: UseOperationalMotionProps): UseOperationalMotionReturn {
  // Singleton-like controller per session
  const controllerRef = useRef<OperationalMotionController | null>(null);
  if (!controllerRef.current) {
    controllerRef.current = new OperationalMotionController({
      mode: demoMode ? 'demo' : 'operational',
    });
  }
  const controller = controllerRef.current;

  // React state for re-rendering on discrete semantic state changes
  const [, setTick] = useState(0);

  // Synchronize registered operators with zone anchors
  useEffect(() => {
    for (const z of zones) {
      if (z.assignedUser?.id) {
        const anchor = getZoneOperatorAnchor(z.id);
        controller.registerOperator(z.assignedUser.id, z.id, anchor);
      }
    }
  }, [zones, controller]);

  // Subscribe to state changes
  useEffect(() => {
    const unsubState = controller.subscribeStateChange(() => {
      setTick((t) => t + 1);
    });
    const unsubFrame = controller.subscribeFrame(() => {
      setTick((t) => t + 1);
    });

    return () => {
      unsubState();
      unsubFrame();
    };
  }, [controller]);

  // Pause on calibration mode or non-map view
  useEffect(() => {
    const shouldPause = isCalibrationActive || viewMode !== 'map';
    if (shouldPause) {
      controller.pause();
    } else {
      controller.resume();
    }
  }, [isCalibrationActive, viewMode, controller]);

  // Handle demo mode switch
  useEffect(() => {
    controller.setMode(demoMode ? 'demo' : 'operational');
  }, [demoMode, controller]);

  // Resolve active planned route for selected operator (disabled in static decoupled mode)
  const activePlannedRoute = useMemo<PlannedRoute | null>(() => {
    if (!demoMode || !selectedOperatorId) return null;
    const opRecord = controller.getOperatorRecord(selectedOperatorId);
    return opRecord?.plannedRoute || null;
  }, [demoMode, selectedOperatorId, controller]);

  const getOperatorWorkflowPosition = (operatorId: string) => {
    if (!demoMode) return undefined; // Keep operators static at zone anchors
    const record = controller.getOperatorRecord(operatorId);
    return record?.currentPosition;
  };

  const getOperatorWorkflowState = (operatorId: string) => {
    if (!demoMode) return undefined;
    const record = controller.getOperatorRecord(operatorId);
    return record?.state;
  };

  // Determine if a meter is currently targeted by an operator
  const getMeterMotionOverride = (meterId: string): 'approaching' | 'reading' | 'completed' | undefined => {
    if (!demoMode) return undefined; // Meters strictly follow real domain data
    for (const record of controller.getAllOperators()) {
      if (record.targetMeterId === meterId) {
        if (record.state === 'MOVING') return 'approaching';
        if (record.state === 'ARRIVING' || record.state === 'READING') return 'reading';
      }
      if (record.lastCompletedMeterId === meterId && record.state === 'COMPLETED') {
        return 'completed';
      }
    }
    return undefined;
  };

  const startOperatorMovement = (operatorId: string, meterId: string) => {
    if (!demoMode) {
      // Movement tracking disabled per operational decoupling
      return false;
    }
    return controller.startMovementToMeter(operatorId, meterId);
  };

  return {
    controller,
    activePlannedRoute,
    getOperatorWorkflowPosition,
    getOperatorWorkflowState,
    getMeterMotionOverride,
    startOperatorMovement,
    motionMode: controller.getMode(),
    setMotionMode: (m) => controller.setMode(m),
  };
}
