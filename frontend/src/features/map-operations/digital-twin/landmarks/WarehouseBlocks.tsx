import React from 'react';
import { TAN_THUAN_WAREHOUSES } from '../geometry/tanThuanScene';

export const WarehouseBlocks: React.FC = () => {
  return (
    <group>
      {TAN_THUAN_WAREHOUSES.map((wh) => {
        const [x, y, z] = wh.position;
        const [w, h, d] = wh.size;

        return (
          <group key={wh.id} position={[x, y, z]}>
            {/* 1. Main Warehouse Concrete Foundation & Walls */}
            <mesh position={[0, 0, 0]} castShadow receiveShadow>
              <boxGeometry args={[w, h, d]} />
              <meshStandardMaterial color={wh.color} roughness={0.7} />
            </mesh>

            {/* 2. Warehouse Gable Roof (if gable) */}
            {wh.roofType === 'gable' ? (
              <mesh position={[0, h / 2 + 0.9, 0]} rotation={[0, 0, 0]} castShadow>
                {/* Triangular roof prism using a 3-sided cylinder or wedge */}
                <cylinderGeometry args={[d / 3.4, d / 3.4, w, 3]} />
                <meshStandardMaterial color="#A0AEC0" roughness={0.6} />
              </mesh>
            ) : (
              /* Flat Cap Roof */
              <mesh position={[0, h / 2 + 0.15, 0]}>
                <boxGeometry args={[w + 0.4, 0.3, d + 0.4]} />
                <meshStandardMaterial color="#94A3B8" roughness={0.6} />
              </mesh>
            )}

            {/* 3. Loading Docks / Roller Doors along the East face */}
            {[-3, 0, 3].map((doorOffset, dIdx) => (
              <mesh key={`door-${dIdx}`} position={[w / 2 + 0.05, -h / 4, doorOffset]}>
                <boxGeometry args={[0.1, h / 2, 2.2]} />
                <meshStandardMaterial color="#4A5568" roughness={0.5} metalness={0.4} />
              </mesh>
            ))}

            {/* 4. Warehouse Name / Identifier Label Plate */}
            <mesh position={[w / 2 + 0.08, h / 3, 0]}>
              <boxGeometry args={[0.06, 0.6, 4]} />
              <meshStandardMaterial color="#073B5C" roughness={0.3} />
            </mesh>
          </group>
        );
      })}
    </group>
  );
};
