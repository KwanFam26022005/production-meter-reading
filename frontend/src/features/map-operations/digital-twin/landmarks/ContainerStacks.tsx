import React, { useMemo } from 'react';
import * as THREE from 'three';
import { TAN_THUAN_CONTAINER_BAYS } from '../geometry/tanThuanScene';

const CONTAINER_DIMS = {
  width: 2.4,
  height: 2.2,
  length: 6.0,
  spacingX: 2.8,
  spacingZ: 6.5,
};

// Restrained industrial colors for decorative shipping containers
const INDUSTRIAL_CONTAINER_COLORS = [
  '#8B3A2B', // Rust Red
  '#2B4C6F', // Deep Maritime Blue
  '#355E4C', // Forest Green
  '#4A5568', // Slate Gray
  '#976937', // Ochre Tan
];

export const ContainerStacks: React.FC = () => {
  // Pre-calculate all container instance transforms and colors
  const { instances, totalCount } = useMemo(() => {
    const list: { matrix: THREE.Matrix4; color: THREE.Color }[] = [];
    const dummy = new THREE.Object3D();
    let seed = 42;

    const pseudoRandom = () => {
      seed = (seed * 9301 + 49297) % 233280;
      return seed / 233280;
    };

    TAN_THUAN_CONTAINER_BAYS.forEach((bay) => {
      const { position, rows, cols, maxTier } = bay;

      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          // Height varies randomly between 1 and maxTier
          const tier = Math.floor(pseudoRandom() * maxTier) + 1;

          for (let h = 0; h < tier; h++) {
            const posX = position[0] + (r - rows / 2) * CONTAINER_DIMS.spacingX;
            const posY = position[1] + (h + 0.5) * CONTAINER_DIMS.height;
            const posZ = position[2] + (c - cols / 2) * CONTAINER_DIMS.spacingZ;

            dummy.position.set(posX, posY, posZ);
            dummy.rotation.set(0, 0, 0);
            dummy.scale.set(1, 1, 1);
            dummy.updateMatrix();

            const colorIndex = Math.floor(pseudoRandom() * INDUSTRIAL_CONTAINER_COLORS.length);
            const color = new THREE.Color(INDUSTRIAL_CONTAINER_COLORS[colorIndex]);

            list.push({ matrix: dummy.matrix.clone(), color });
          }
        }
      }
    });

    return { instances: list, totalCount: list.length };
  }, []);

  // InstancedMesh ref setup
  const instancedMesh = useMemo(() => {
    const geo = new THREE.BoxGeometry(
      CONTAINER_DIMS.width,
      CONTAINER_DIMS.height,
      CONTAINER_DIMS.length
    );
    const mat = new THREE.MeshStandardMaterial({
      roughness: 0.65,
      metalness: 0.2,
    });
    const mesh = new THREE.InstancedMesh(geo, mat, totalCount);
    mesh.castShadow = true;
    mesh.receiveShadow = true;

    instances.forEach((inst, idx) => {
      mesh.setMatrixAt(idx, inst.matrix);
      mesh.setColorAt(idx, inst.color);
    });

    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    return mesh;
  }, [instances, totalCount]);

  return <primitive object={instancedMesh} />;
};
