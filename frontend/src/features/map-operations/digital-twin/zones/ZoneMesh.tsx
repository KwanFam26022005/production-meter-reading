import React, { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import { MapOperationalZone, OperationalLayerType } from '../../types';
import {
  createShapeFromNormalizedPolygon,
  getPolygonSceneCentroid,
} from '../geometry/mapSceneCoordinates';
import { getPrefersReducedMotion } from '../animation/motionPolicy';

interface ZoneMeshProps {
  zone: MapOperationalZone;
  isSelected: boolean;
  isHovered: boolean;
  activeLayer: OperationalLayerType;
  onSelect: (zoneId: string) => void;
  onHover: (zoneId: string | null) => void;
}

export const ZoneMesh: React.FC<ZoneMeshProps> = ({
  zone,
  isSelected,
  isHovered,
  activeLayer,
  onSelect,
  onHover,
}) => {
  const groupRef = useRef<THREE.Group>(null);
  const reducedMotion = useMemo(() => getPrefersReducedMotion(), []);

  // Geometry from normalized polygon
  const { shape, centroid, linePoints } = useMemo(() => {
    const s = createShapeFromNormalizedPolygon(zone.polygon);
    const c = getPolygonSceneCentroid(zone.polygon, 0.08);

    // Extract outline line points for the border ring
    const points2D = s.getPoints();
    const v3: THREE.Vector3[] = points2D.map((p) => new THREE.Vector3(p.x, 0.04, -p.y));
    if (v3.length > 0) v3.push(v3[0].clone()); // close loop

    return { shape: s, centroid: c, linePoints: v3 };
  }, [zone.polygon]);

  // Target elevation
  const targetY = isSelected ? 0.22 : isHovered ? 0.12 : 0.06;

  useFrame((_, delta) => {
    if (!groupRef.current) return;
    if (reducedMotion) {
      groupRef.current.position.y = targetY;
      return;
    }
    // Smooth elevation dampening
    groupRef.current.position.y = THREE.MathUtils.damp(
      groupRef.current.position.y,
      targetY,
      12,
      delta
    );
  });

  // Layer-based color derivation
  const { surfaceColor, surfaceOpacity, borderColor, borderWidth, labelText, labelTextColor } = useMemo(() => {
    let sColor = '#0B4F75';
    let sOpacity = 0.06;
    let bColor = '#0B4F75';
    let bWidth = 1.5;
    let lblText = `${zone.shortName} · ${zone.metrics.confirmedCount}/${zone.metrics.totalMeters}`;
    let lblTextColor = '#073B5C';

    if (activeLayer === 'PROGRESS') {
      const pct = zone.metrics.completionPercent;
      lblText = `${zone.shortName} · ${pct}%`;
      if (pct === 100) {
        sColor = '#167A5A';
        sOpacity = 0.18;
        bColor = '#167A5A';
        lblTextColor = '#167A5A';
      } else if (pct > 50) {
        sColor = '#12658F';
        sOpacity = 0.15;
        bColor = '#12658F';
        lblTextColor = '#12658F';
      } else if (pct > 0) {
        sColor = '#D97706';
        sOpacity = 0.13;
        bColor = '#D97706';
        lblTextColor = '#D97706';
      } else {
        sColor = '#74838C';
        sOpacity = 0.08;
        bColor = '#74838C';
        lblTextColor = '#53636D';
      }
    } else if (activeLayer === 'OWNERSHIP') {
      sColor = '#0B4F75';
      sOpacity = 0.10;
      bColor = '#0B4F75';
      const opName = zone.assignedUser?.fullName
        ? zone.assignedUser.fullName.split(' ').slice(-2).join(' ')
        : 'Chưa gán';
      lblText = `${zone.shortName} · ${opName}`;
    } else if (activeLayer === 'EXCEPTIONS') {
      const excCount = zone.metrics.reviewCount + zone.metrics.overdueCount;
      if (excCount > 0) {
        sColor = '#B42318';
        sOpacity = 0.16;
        bColor = '#B42318';
        bWidth = 2.5;
        lblText = `! ${zone.shortName} · ${excCount} ngoại lệ`;
        lblTextColor = '#B42318';
      } else {
        sColor = '#74838C';
        sOpacity = 0.03;
        bColor = '#D7E0E5';
        lblText = `${zone.shortName} · 0 lỗi`;
        lblTextColor = '#74838C';
      }
    } else if (activeLayer === 'WORKLOAD') {
      sColor = '#073B5C';
      sOpacity = 0.09;
      bColor = '#073B5C';
      lblText = `${zone.shortName} · ${zone.metrics.totalMeters} công tơ`;
    }

    if (isHovered) {
      sOpacity += 0.08;
      bColor = '#0B4F75';
      bWidth = 2.0;
    }
    if (isSelected) {
      sOpacity += 0.12;
      bColor = '#073B5C';
      bWidth = 3.0;
    }

    return {
      surfaceColor: sColor,
      surfaceOpacity: sOpacity,
      borderColor: bColor,
      borderWidth: bWidth,
      labelText: lblText,
      labelTextColor: lblTextColor,
    };
  }, [activeLayer, zone, isHovered, isSelected]);

  // Line geometry for outline
  const lineGeo = useMemo(() => {
    return new THREE.BufferGeometry().setFromPoints(linePoints);
  }, [linePoints]);

  return (
    <group ref={groupRef} position={[0, 0.06, 0]}>
      {/* 1. Zone Floor Polygon Surface */}
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        onClick={(e) => {
          e.stopPropagation();
          onSelect(zone.id);
        }}
        onPointerOver={(e) => {
          e.stopPropagation();
          onHover(zone.id);
        }}
        onPointerOut={() => onHover(null)}
      >
        <shapeGeometry args={[shape]} />
        <meshStandardMaterial
          color={surfaceColor}
          transparent
          opacity={surfaceOpacity}
          roughness={0.7}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* 2. Zone Boundary Outline Loop */}
      <lineLoop geometry={lineGeo}>
        <lineBasicMaterial color={borderColor} linewidth={borderWidth} />
      </lineLoop>

      {/* 3. Drei HTML Centroid Label */}
      <Html
        position={[centroid[0], 0.4, centroid[2]]}
        center
        distanceFactor={65}
        zIndexRange={[100, 200]}
      >
        <div
          className={`sgp-3d-zone-badge ${isSelected ? 'selected' : ''} ${isHovered ? 'hovered' : ''}`}
          style={{
            borderColor: isSelected ? '#073B5C' : '#D7E0E5',
            color: labelTextColor,
          }}
          onClick={(e) => {
            e.stopPropagation();
            onSelect(zone.id);
          }}
          onMouseEnter={() => onHover(zone.id)}
          onMouseLeave={() => onHover(null)}
          role="button"
          tabIndex={0}
        >
          <span className="sgp-3d-zone-badge-text">{labelText}</span>
        </div>
      </Html>
    </group>
  );
};
