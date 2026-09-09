import React from 'react';

interface PortLightingProps {
  is2D?: boolean;
}

export const PortLighting: React.FC<PortLightingProps> = ({ is2D = false }) => {
  return (
    <>
      {/* Ambient Fill: Daylight port illumination */}
      <ambientLight intensity={is2D ? 1.1 : 0.8} color="#EDF2F7" />

      {/* Hemispherical light: Sky blue fill from above, warm earth bounce from below */}
      <hemisphereLight
        args={['#E2E8F0', '#CBD5E1', is2D ? 0.6 : 0.45]}
      />

      {/* Primary Directional Sun: Saigon tropical afternoon light */}
      <directionalLight
        position={[-35, 55, -25]}
        intensity={is2D ? 0.8 : 1.25}
        color="#FFFDF8"
        castShadow={!is2D}
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
        shadow-camera-near={10}
        shadow-camera-far={140}
        shadow-camera-left={-65}
        shadow-camera-right={65}
        shadow-camera-top={50}
        shadow-camera-bottom={-50}
        shadow-bias={-0.0004}
      />

      {/* Secondary Soft Water Reflection / Quayside fill */}
      {!is2D && (
        <directionalLight
          position={[40, 20, 20]}
          intensity={0.35}
          color="#D4E4EC"
        />
      )}
    </>
  );
};
