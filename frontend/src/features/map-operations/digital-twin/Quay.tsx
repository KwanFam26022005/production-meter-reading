import React, { useMemo } from 'react';
import { PORT_BERTHS, PORT_GROUND_CONFIG } from './geometry/portGeometry';
import { MOORED_CARGO_SHIP } from './geometry/tanThuanScene';

export const Quay: React.FC = () => {
  const { minX, maxX, minZ, maxZ, elevation } = PORT_GROUND_CONFIG.quayApron;
  const width = maxX - minX;
  const depth = maxZ - minZ;
  const posX = minX + width / 2;
  const posZ = minZ + depth / 2;

  // Bollard positions along quayside edge
  const bollards = useMemo(() => {
    const list: [number, number, number][] = [];
    PORT_BERTHS.forEach((berth) => {
      const startZ = berth.startPoint[2];
      const endZ = berth.endPoint[2];
      const edgeX = berth.startPoint[0] - 0.4;
      const count = berth.bollardCount;
      for (let i = 0; i < count; i++) {
        const z = startZ + ((endZ - startZ) / (count - 1)) * i;
        list.push([edgeX, elevation + 0.15, z]);
      }
    });
    return list;
  }, [elevation]);

  return (
    <group>
      {/* 1. Main Concrete Quayside Apron */}
      <mesh
        position={[posX, elevation / 2, posZ]}
        receiveShadow
        castShadow
      >
        <boxGeometry args={[width, elevation, depth]} />
        <meshStandardMaterial
          color="#CCD5DB"
          roughness={0.7}
          metalness={0.1}
        />
      </mesh>

      {/* 2. Quayside Coping / Concrete Edge Beam along the river */}
      <mesh
        position={[maxX - 0.4, elevation + 0.05, posZ]}
        receiveShadow
      >
        <boxGeometry args={[0.8, 0.1, depth]} />
        <meshStandardMaterial
          color="#B4BFC7"
          roughness={0.6}
        />
      </mesh>

      {/* 3. Embedded Crane Rail Tracks along the quayside */}
      {/* Water-side rail */}
      <mesh position={[maxX - 2.5, elevation + 0.02, posZ]}>
        <boxGeometry args={[0.16, 0.03, depth - 4]} />
        <meshStandardMaterial color="#4A5568" metalness={0.7} roughness={0.4} />
      </mesh>
      {/* Land-side rail */}
      <mesh position={[minX + 3.0, elevation + 0.02, posZ]}>
        <boxGeometry args={[0.16, 0.03, depth - 4]} />
        <meshStandardMaterial color="#4A5568" metalness={0.7} roughness={0.4} />
      </mesh>

      {/* 4. Mooring Bollards */}
      {bollards.map((bPos, idx) => (
        <group key={`bollard-${idx}`} position={bPos}>
          <mesh castShadow>
            <cylinderGeometry args={[0.22, 0.28, 0.35, 8]} />
            <meshStandardMaterial color="#2D3748" metalness={0.8} roughness={0.3} />
          </mesh>
          <mesh position={[0, 0.2, 0]}>
            <sphereGeometry args={[0.24, 8, 6]} />
            <meshStandardMaterial color="#2D3748" metalness={0.8} roughness={0.3} />
          </mesh>
        </group>
      ))}

      {/* 5. Moored Cargo Vessel (Saigon Star at Berth 2) */}
      <group position={MOORED_CARGO_SHIP.position}>
        {/* Vessel Hull */}
        <mesh position={[0, 1.2, 0]} castShadow receiveShadow>
          <boxGeometry args={[MOORED_CARGO_SHIP.beam, 2.4, MOORED_CARGO_SHIP.length]} />
          <meshStandardMaterial color={MOORED_CARGO_SHIP.hullColor} roughness={0.6} />
        </mesh>
        {/* Bow Wedge (Front) */}
        <mesh position={[0, 1.2, -MOORED_CARGO_SHIP.length / 2 - 2.2]} rotation={[0, Math.PI, 0]} castShadow>
          <coneGeometry args={[MOORED_CARGO_SHIP.beam / 2, 4.4, 4]} />
          <meshStandardMaterial color={MOORED_CARGO_SHIP.hullColor} roughness={0.6} />
        </mesh>
        {/* Deck Surface */}
        <mesh position={[0, 2.45, 0]}>
          <boxGeometry args={[MOORED_CARGO_SHIP.beam - 0.4, 0.1, MOORED_CARGO_SHIP.length - 1]} />
          <meshStandardMaterial color="#A0AEC0" roughness={0.8} />
        </mesh>
        {/* Bridge / Superstructure (Stern) */}
        <mesh position={[0, 4.2, MOORED_CARGO_SHIP.length / 2 - 6]} castShadow>
          <boxGeometry args={[MOORED_CARGO_SHIP.beam - 0.8, 3.4, 7]} />
          <meshStandardMaterial color="#EDF2F7" roughness={0.5} />
        </mesh>
        {/* Bridge Wings / Windows */}
        <mesh position={[0, 5.2, MOORED_CARGO_SHIP.length / 2 - 6.2]}>
          <boxGeometry args={[MOORED_CARGO_SHIP.beam - 0.4, 0.8, 4]} />
          <meshStandardMaterial color="#2B6CB0" roughness={0.2} metalness={0.6} />
        </mesh>
        {/* Cargo Hatches on Deck */}
        {[-8, -1, 6].map((offsetZ, hIdx) => (
          <mesh key={`hatch-${hIdx}`} position={[0, 2.8, offsetZ]} castShadow>
            <boxGeometry args={[MOORED_CARGO_SHIP.beam - 1.6, 0.6, 5]} />
            <meshStandardMaterial color="#C53030" roughness={0.7} />
          </mesh>
        ))}
      </group>
    </group>
  );
};
