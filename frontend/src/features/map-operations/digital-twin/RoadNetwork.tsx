import React, { useMemo } from 'react';
import * as THREE from 'three';
import { PORT_ROADS } from './geometry/portGeometry';

export const RoadNetwork: React.FC = () => {
  // Build road strip meshes from road segments
  const roadMeshes = useMemo(() => {
    return PORT_ROADS.map((road) => {
      const parts: {
        pos: [number, number, number];
        args: [number, number, number];
        rot: [number, number, number];
      }[] = [];

      for (let i = 0; i < road.points.length - 1; i++) {
        const p1 = new THREE.Vector3(...road.points[i]);
        const p2 = new THREE.Vector3(...road.points[i + 1]);
        const mid = new THREE.Vector3().addVectors(p1, p2).multiplyScalar(0.5);
        const length = p1.distanceTo(p2);

        // Direction vector in X-Z
        const dir = new THREE.Vector3().subVectors(p2, p1).normalize();
        const angle = Math.atan2(dir.x, dir.z);

        parts.push({
          pos: [mid.x, 0.04, mid.z],
          args: [road.width, 0.02, length],
          rot: [0, angle, 0],
        });
      }

      return { id: road.id, parts, isMain: road.isMainSpine };
    });
  }, []);

  return (
    <group>
      {/* 1. Main Terminal Ground Baseplate */}
      <mesh position={[-11, 0.01, 0]} receiveShadow>
        <planeGeometry args={[94, 76]} />
        <meshStandardMaterial color="#E8ECEF" roughness={0.9} />
        {/* Rotate to lay flat on X-Z */}
      </mesh>
      {/* Flattened Ground Base Box */}
      <mesh position={[-11, -0.1, 0]} receiveShadow>
        <boxGeometry args={[94, 0.2, 76]} />
        <meshStandardMaterial color="#DFE5E8" roughness={0.9} />
      </mesh>

      {/* 2. Asphalt Road Network Segments */}
      {roadMeshes.map((r) => (
        <group key={r.id}>
          {r.parts.map((p, idx) => (
            <mesh
              key={`${r.id}-${idx}`}
              position={p.pos}
              rotation={p.rot}
              receiveShadow
            >
              <boxGeometry args={p.args} />
              <meshStandardMaterial
                color={r.isMain ? '#2D3748' : '#394656'}
                roughness={0.8}
              />
            </mesh>
          ))}
        </group>
      ))}

      {/* 3. Main Port Entrance Gate Structure (West Boundary) */}
      <group position={[-56, 0, 0]}>
        {/* Gate Pillars */}
        <mesh position={[0, 2.5, -3]} castShadow>
          <boxGeometry args={[1.2, 5, 1.2]} />
          <meshStandardMaterial color="#0B4F75" roughness={0.4} />
        </mesh>
        <mesh position={[0, 2.5, 3]} castShadow>
          <boxGeometry args={[1.2, 5, 1.2]} />
          <meshStandardMaterial color="#0B4F75" roughness={0.4} />
        </mesh>
        {/* Overhead Canopy Beam */}
        <mesh position={[0, 5.2, 0]} castShadow>
          <boxGeometry args={[1.8, 0.8, 8]} />
          <meshStandardMaterial color="#073B5C" roughness={0.4} />
        </mesh>
        {/* Guard Booth */}
        <mesh position={[-2, 1.4, -4.5]} castShadow>
          <boxGeometry args={[2.4, 2.8, 2.2]} />
          <meshStandardMaterial color="#E2E8F0" roughness={0.5} />
        </mesh>
      </group>
    </group>
  );
};
