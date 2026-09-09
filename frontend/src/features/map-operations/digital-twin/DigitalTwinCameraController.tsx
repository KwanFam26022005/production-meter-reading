import React, { useEffect, useRef, useMemo } from 'react';
import * as THREE from 'three';
import { useFrame, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import { MapMeterItem, MapOperationalZone } from '../types';
import { normalizedToScene, getPolygonSceneCentroid } from './geometry/mapSceneCoordinates';
import { getPrefersReducedMotion, easeInOutCubic } from './animation/motionPolicy';

export interface CameraCommand {
  type: 'PORT' | 'ZONE' | 'METER' | 'RESET';
  id?: string;
  timestamp: number;
}

interface CameraControllerProps {
  is2D: boolean;
  activeCommand: CameraCommand | null;
  selectedZoneId: string | null;
  selectedMeterId: string | null;
  zones: MapOperationalZone[];
  meters: MapMeterItem[];
  onCommandFinished?: () => void;
}

const DEFAULT_3D_POS = new THREE.Vector3(-8, 48, 56);
const DEFAULT_3D_TARGET = new THREE.Vector3(0, 0, 0);

const DEFAULT_2D_POS = new THREE.Vector3(0, 80, 0.001);
const DEFAULT_2D_TARGET = new THREE.Vector3(0, 0, 0);

export const DigitalTwinCameraController: React.FC<CameraControllerProps> = ({
  is2D,
  activeCommand,
  selectedZoneId: _selectedZoneId,
  selectedMeterId: _selectedMeterId,
  zones,
  meters,
  onCommandFinished,
}) => {
  const { camera } = useThree();
  const controlsRef = useRef<OrbitControlsImpl>(null);
  const reducedMotion = useMemo(() => getPrefersReducedMotion(), []);

  // Animation state
  const animRef = useRef<{
    isAnimating: boolean;
    startTime: number;
    duration: number;
    startPos: THREE.Vector3;
    endPos: THREE.Vector3;
    startTarget: THREE.Vector3;
    endTarget: THREE.Vector3;
  }>({
    isAnimating: false,
    startTime: 0,
    duration: 600,
    startPos: new THREE.Vector3(),
    endPos: new THREE.Vector3(),
    startTarget: new THREE.Vector3(),
    endTarget: new THREE.Vector3(),
  });

  const startTransition = (
    targetCameraPos: THREE.Vector3,
    targetLookAt: THREE.Vector3,
    durationMs: number = 600
  ) => {
    if (reducedMotion) {
      camera.position.copy(targetCameraPos);
      if (controlsRef.current) {
        controlsRef.current.target.copy(targetLookAt);
        controlsRef.current.update();
      }
      if (onCommandFinished) onCommandFinished();
      return;
    }

    const currentTarget = controlsRef.current
      ? controlsRef.current.target.clone()
      : new THREE.Vector3(0, 0, 0);

    animRef.current = {
      isAnimating: true,
      startTime: performance.now(),
      duration: durationMs,
      startPos: camera.position.clone(),
      endPos: targetCameraPos.clone(),
      startTarget: currentTarget,
      endTarget: targetLookAt.clone(),
    };
  };

  // Handle mode switch (2D <-> 3D)
  useEffect(() => {
    if (is2D) {
      startTransition(DEFAULT_2D_POS, DEFAULT_2D_TARGET, 600);
    } else {
      startTransition(DEFAULT_3D_POS, DEFAULT_3D_TARGET, 650);
    }
  }, [is2D]);

  // Handle explicit Camera Commands
  useEffect(() => {
    if (!activeCommand) return;

    if (activeCommand.type === 'RESET' || activeCommand.type === 'PORT') {
      const targetPos = is2D ? DEFAULT_2D_POS : DEFAULT_3D_POS;
      const targetLook = is2D ? DEFAULT_2D_TARGET : DEFAULT_3D_TARGET;
      startTransition(targetPos, targetLook, 700);
    } else if (activeCommand.type === 'ZONE' && activeCommand.id) {
      const zone = zones.find((z) => z.id === activeCommand.id);
      if (zone) {
        const centroid = getPolygonSceneCentroid(zone.polygon);
        const lookTarget = new THREE.Vector3(centroid[0], 0, centroid[2]);
        const camPos = is2D
          ? new THREE.Vector3(centroid[0], 55, centroid[2] + 0.001)
          : new THREE.Vector3(centroid[0] - 6, 26, centroid[2] + 28);
        startTransition(camPos, lookTarget, 650);
      }
    } else if (activeCommand.type === 'METER' && activeCommand.id) {
      const meter = meters.find((m) => m.id === activeCommand.id);
      if (meter) {
        const [x, , z] = normalizedToScene(meter.coordinates);
        const lookTarget = new THREE.Vector3(x, 0.5, z);
        const camPos = is2D
          ? new THREE.Vector3(x, 38, z + 0.001)
          : new THREE.Vector3(x - 4, 16, z + 18);
        startTransition(camPos, lookTarget, 550);
      }
    }
  }, [activeCommand, is2D, zones, meters]);

  // Frame tick animation loop
  useFrame(() => {
    const anim = animRef.current;
    if (!anim.isAnimating) return;

    const now = performance.now();
    const elapsed = now - anim.startTime;
    const progress = Math.min(1.0, elapsed / anim.duration);
    const ease = easeInOutCubic(progress);

    camera.position.lerpVectors(anim.startPos, anim.endPos, ease);

    if (controlsRef.current) {
      controlsRef.current.target.lerpVectors(anim.startTarget, anim.endTarget, ease);
      controlsRef.current.update();
    }

    if (progress >= 1.0) {
      anim.isAnimating = false;
      if (onCommandFinished) onCommandFinished();
    }
  });

  return (
    <OrbitControls
      ref={controlsRef}
      enableRotate={!is2D} // In 2D, rotation is locked to preserve North
      enablePan={true}
      enableZoom={true}
      minDistance={12}
      maxDistance={125}
      maxPolarAngle={Math.PI / 2.2} // Prevent camera sinking under the port ground
      minPolarAngle={is2D ? 0 : Math.PI / 8}
      dampingFactor={0.05}
    />
  );
};
