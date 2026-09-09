import React from 'react';
import { TAN_THUAN_CRANES } from '../geometry/tanThuanScene';

export const CraneModels: React.FC = () => {
  return (
    <group>
      {TAN_THUAN_CRANES.map((crane) => {
        const [x, y, z] = crane.position;
        const h = crane.height;

        return (
          <group key={crane.id} position={[x, y, z]}>
            {/* 1. Portal Legs (4 columnar legs on rails) */}
            {/* Water-side legs */}
            <mesh position={[2.5, h * 0.28, -2.5]} castShadow>
              <boxGeometry args={[0.6, h * 0.56, 0.6]} />
              <meshStandardMaterial color="#3E5463" roughness={0.5} metalness={0.5} />
            </mesh>
            <mesh position={[2.5, h * 0.28, 2.5]} castShadow>
              <boxGeometry args={[0.6, h * 0.56, 0.6]} />
              <meshStandardMaterial color="#3E5463" roughness={0.5} metalness={0.5} />
            </mesh>
            {/* Land-side legs */}
            <mesh position={[-2.5, h * 0.28, -2.5]} castShadow>
              <boxGeometry args={[0.6, h * 0.56, 0.6]} />
              <meshStandardMaterial color="#3E5463" roughness={0.5} metalness={0.5} />
            </mesh>
            <mesh position={[-2.5, h * 0.28, 2.5]} castShadow>
              <boxGeometry args={[0.6, h * 0.56, 0.6]} />
              <meshStandardMaterial color="#3E5463" roughness={0.5} metalness={0.5} />
            </mesh>

            {/* Portal Cross Beams */}
            <mesh position={[0, h * 0.56, 0]} castShadow>
              <boxGeometry args={[5.6, 0.8, 5.6]} />
              <meshStandardMaterial color="#3E5463" roughness={0.5} />
            </mesh>

            {/* 2. Upper Machinery Tower & Cabin */}
            <mesh position={[0, h * 0.72, 0]} castShadow>
              <boxGeometry args={[3.6, h * 0.32, 4]} />
              <meshStandardMaterial color="#D97706" roughness={0.4} />
            </mesh>
            <mesh position={[1.4, h * 0.66, 0]}>
              <boxGeometry args={[1.2, 1.2, 1.8]} />
              <meshStandardMaterial color="#1E3A8A" roughness={0.2} metalness={0.6} />
            </mesh>

            {/* 3. Outreach Boom (extends eastward over the river/ship) */}
            <mesh position={[7.5, h * 0.86, 0]} rotation={[0, 0, -crane.boomAngle]} castShadow>
              <boxGeometry args={[15, 0.9, 1.4]} />
              <meshStandardMaterial color="#D97706" roughness={0.4} />
            </mesh>

            {/* 4. Backreach Boom (extends westward over the quayside apron) */}
            <mesh position={[-5, h * 0.86, 0]} castShadow>
              <boxGeometry args={[7, 0.9, 1.4]} />
              <meshStandardMaterial color="#D97706" roughness={0.4} />
            </mesh>

            {/* 5. A-Frame / Pylon Tower on Top */}
            <mesh position={[0, h * 0.95, 0]} castShadow>
              <coneGeometry args={[1.8, 3.2, 4]} />
              <meshStandardMaterial color="#3E5463" roughness={0.5} />
            </mesh>
          </group>
        );
      })}
    </group>
  );
};
