import React, { useRef, useMemo } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { PORT_GROUND_CONFIG } from './geometry/portGeometry';
import { getPrefersReducedMotion } from './animation/motionPolicy';

export const RiverSurface: React.FC = () => {
  const meshRef = useRef<THREE.Mesh>(null);
  const reducedMotion = useMemo(() => getPrefersReducedMotion(), []);

  const { minX, maxX, minZ, maxZ, elevation } = PORT_GROUND_CONFIG.riverBounds;
  const width = maxX - minX;
  const depth = maxZ - minZ;
  const posX = minX + width / 2;
  const posZ = minZ + depth / 2;

  useFrame((state) => {
    if (reducedMotion || !meshRef.current) return;
    // Gentle river water undulation
    const t = state.clock.getElapsedTime();
    meshRef.current.position.y = elevation + Math.sin(t * 0.8) * 0.04;
  });

  return (
    <group>
      {/* Primary River Water Body */}
      <mesh
        ref={meshRef}
        position={[posX, elevation, posZ]}
        rotation={[-Math.PI / 2, 0, 0]}
        receiveShadow
      >
        <planeGeometry args={[width, depth, 16, 16]} />
        <meshStandardMaterial
          color="#25424C"
          roughness={0.25}
          metalness={0.15}
          transparent
          opacity={0.92}
        />
      </mesh>

      {/* River Bed / Underwater Depth Plane */}
      <mesh
        position={[posX, elevation - 1.2, posZ]}
        rotation={[-Math.PI / 2, 0, 0]}
      >
        <planeGeometry args={[width, depth]} />
        <meshBasicMaterial color="#132329" />
      </mesh>
    </group>
  );
};
