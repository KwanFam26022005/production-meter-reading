import React from 'react';
import { TAN_THUAN_UTILITIES } from '../geometry/tanThuanScene';

export const UtilityStructures: React.FC = () => {
  return (
    <group>
      {TAN_THUAN_UTILITIES.map((util) => {
        const [x, y, z] = util.position;
        const [w, h, d] = util.size;

        return (
          <group key={util.id} position={[x, y, z]}>
            {/* 1. Main Substation / Workshop Building Block */}
            <mesh position={[0, 0, 0]} castShadow receiveShadow>
              <boxGeometry args={[w, h, d]} />
              <meshStandardMaterial color={util.color} roughness={0.7} />
            </mesh>

            {/* 2. Flat Parapet Roof */}
            <mesh position={[0, h / 2 + 0.1, 0]}>
              <boxGeometry args={[w + 0.2, 0.2, d + 0.2]} />
              <meshStandardMaterial color="#64748B" roughness={0.6} />
            </mesh>

            {/* 3. High Voltage Bushings / Transformer Tanks for Substations */}
            {util.id.startsWith('substation') && (
              <group position={[0, h / 2 + 0.5, 0]}>
                {[-1.2, 0, 1.2].map((offX, bIdx) => (
                  <mesh key={`bushing-${bIdx}`} position={[offX, 0, 0]} castShadow>
                    <cylinderGeometry args={[0.18, 0.22, 0.8, 6]} />
                    <meshStandardMaterial color="#334155" metalness={0.7} roughness={0.3} />
                  </mesh>
                ))}
              </group>
            )}

            {/* 4. Safety Perimeter Chain Link Fence around Substations */}
            {util.id.startsWith('substation') && (
              <mesh position={[0, -h / 4, 0]}>
                <boxGeometry args={[w + 1.2, 0.8, d + 1.2]} />
                <meshStandardMaterial
                  color="#94A3B8"
                  wireframe
                  transparent
                  opacity={0.6}
                />
              </mesh>
            )}
          </group>
        );
      })}
    </group>
  );
};
