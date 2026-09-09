import React, { useRef, useMemo } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import { MapMeterItem, OperationalLayerType } from '../../types';
import { normalizedToScene } from '../geometry/mapSceneCoordinates';
import { getSemanticStateStyle } from '../../utils/mapStatus';
import { getPrefersReducedMotion } from '../animation/motionPolicy';

interface MeterBeaconProps {
  meter: MapMeterItem;
  isSelected: boolean;
  isHovered: boolean;
  activeLayer: OperationalLayerType;
  exceptionsOnly: boolean;
  onSelect: (meterId: string) => void;
  onHover: (meterId: string | null) => void;
}

export const MeterBeacon: React.FC<MeterBeaconProps> = ({
  meter,
  isSelected,
  isHovered,
  activeLayer,
  exceptionsOnly,
  onSelect,
  onHover,
}) => {
  const groupRef = useRef<THREE.Group>(null);
  const ringRef = useRef<THREE.Mesh>(null);
  const headRef = useRef<THREE.Mesh>(null);

  const reducedMotion = useMemo(() => getPrefersReducedMotion(), []);
  const pos = useMemo(() => normalizedToScene(meter.coordinates, 0.2), [meter.coordinates]);
  const style = useMemo(() => getSemanticStateStyle(meter.semanticState), [meter.semanticState]);

  const isException = meter.semanticState === 'REVIEW' || meter.semanticState === 'OVERDUE';

  // Dimming logic
  let opacity = 1.0;
  if ((exceptionsOnly || activeLayer === 'EXCEPTIONS') && !isException) {
    opacity = 0.22;
  }

  // Animation for pulse / breathing
  useFrame((state) => {
    if (reducedMotion) return;
    const t = state.clock.getElapsedTime();

    if (isException && ringRef.current) {
      // Gentle breathing pulse
      const scale = 1.0 + Math.sin(t * 3.0) * 0.22;
      ringRef.current.scale.set(scale, scale, scale);
    }
  });

  // Target Y and scale when hovered or selected
  const targetScale = isSelected ? 1.25 : isHovered ? 1.14 : 1.0;
  const stemHeight = isSelected ? 2.6 : 2.0;

  return (
    <group
      ref={groupRef}
      position={pos}
      scale={[targetScale, targetScale, targetScale]}
      onClick={(e) => {
        e.stopPropagation();
        onSelect(meter.id);
      }}
      onPointerOver={(e) => {
        e.stopPropagation();
        onHover(meter.id);
      }}
      onPointerOut={() => onHover(null)}
    >
      {/* 1. Ground Anchor Base Ring */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
        <ringGeometry args={[0.3, 0.65, 16]} />
        <meshBasicMaterial
          color={style.fill}
          transparent
          opacity={opacity * 0.75}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* 2. Dynamic Status Pulse Ring for Exceptions or Selected */}
      {(isSelected || isException) && (
        <mesh
          ref={ringRef}
          rotation={[-Math.PI / 2, 0, 0]}
          position={[0, 0.03, 0]}
        >
          <ringGeometry args={[0.7, 0.95, 24]} />
          <meshBasicMaterial
            color={style.fill}
            transparent
            opacity={opacity * (isSelected ? 0.9 : 0.6)}
            side={THREE.DoubleSide}
          />
        </mesh>
      )}

      {/* 3. Vertical Beacon Stem / Light Pole */}
      <mesh position={[0, stemHeight / 2, 0]} castShadow>
        <cylinderGeometry args={[0.07, 0.09, stemHeight, 8]} />
        <meshStandardMaterial
          color="#334155"
          metalness={0.6}
          roughness={0.4}
          transparent
          opacity={opacity}
        />
      </mesh>

      {/* 4. Illuminated Beacon Head */}
      <mesh
        ref={headRef}
        position={[0, stemHeight + 0.25, 0]}
        castShadow
      >
        <sphereGeometry args={[0.38, 16, 16]} />
        <meshStandardMaterial
          color={style.fill}
          emissive={style.fill}
          emissiveIntensity={isSelected ? 0.75 : 0.45}
          roughness={0.2}
          transparent
          opacity={opacity}
        />
      </mesh>

      {/* 5. Vertical Selection Focus Beam when selected */}
      {isSelected && (
        <mesh position={[0, stemHeight + 4.5, 0]}>
          <cylinderGeometry args={[0.04, 0.25, 8, 8]} />
          <meshBasicMaterial
            color={style.fill}
            transparent
            opacity={0.35}
            side={THREE.DoubleSide}
          />
        </mesh>
      )}

      {/* 6. Contextual HTML Tooltip / Badge on Hover or Selected */}
      {(isHovered || isSelected) && (
        <Html
          position={[0, stemHeight + 0.8, 0]}
          center
          distanceFactor={55}
          zIndexRange={[200, 300]}
        >
          <div className="sgp-3d-meter-tooltip" style={{ opacity }}>
            <div className="sgp-3d-tooltip-code font-tabular font-semibold">
              {meter.meterCode}
            </div>
            <div className="sgp-3d-tooltip-name">{meter.name}</div>
            <div className="sgp-3d-tooltip-status">
              <span
                className="sgp-3d-status-dot"
                style={{ backgroundColor: style.fill }}
              />
              <span>{meter.stateLabel}</span>
              {meter.latestReading?.readingValue && (
                <span className="sgp-3d-status-val font-tabular">
                  · {meter.latestReading.readingValue} kWh
                </span>
              )}
            </div>
          </div>
        </Html>
      )}
    </group>
  );
};
