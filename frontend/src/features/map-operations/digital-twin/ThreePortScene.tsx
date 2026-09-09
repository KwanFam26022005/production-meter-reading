import React from 'react';
import { MapMeterItem, MapOperationalZone, OperationalLayerType } from '../types';
import { PortLighting } from './PortLighting';
import { RiverSurface } from './RiverSurface';
import { Quay } from './Quay';
import { RoadNetwork } from './RoadNetwork';
import { ContainerStacks } from './landmarks/ContainerStacks';
import { CraneModels } from './landmarks/CraneModels';
import { WarehouseBlocks } from './landmarks/WarehouseBlocks';
import { UtilityStructures } from './landmarks/UtilityStructures';
import { ZoneLayer3D } from './zones/ZoneLayer3D';
import { MeterBeaconLayer } from './meters/MeterBeaconLayer';
import {
  DigitalTwinCameraController,
  CameraCommand,
} from './DigitalTwinCameraController';

interface ThreePortSceneProps {
  zones: MapOperationalZone[];
  meters: MapMeterItem[];
  selectedZoneId: string | null;
  selectedMeterId: string | null;
  hoveredZoneId: string | null;
  hoveredMeterId: string | null;
  activeLayer: OperationalLayerType;
  exceptionsOnly: boolean;
  is2D: boolean;
  cameraCommand: CameraCommand | null;
  onSelectZone: (zoneId: string) => void;
  onSelectMeter: (meterId: string) => void;
  onHoverZone: (zoneId: string | null) => void;
  onHoverMeter: (meterId: string | null) => void;
  onClearSelection: () => void;
  onCameraCommandFinished?: () => void;
}

export const ThreePortScene: React.FC<ThreePortSceneProps> = ({
  zones,
  meters,
  selectedZoneId,
  selectedMeterId,
  hoveredZoneId,
  hoveredMeterId,
  activeLayer,
  exceptionsOnly,
  is2D,
  cameraCommand,
  onSelectZone,
  onSelectMeter,
  onHoverZone,
  onHoverMeter,
  onClearSelection,
  onCameraCommandFinished,
}) => {
  return (
    <>
      {/* 1. Natural Port Illumination */}
      <PortLighting is2D={is2D} />

      {/* 2. Camera Controller & Orbit Controls */}
      <DigitalTwinCameraController
        is2D={is2D}
        activeCommand={cameraCommand}
        selectedZoneId={selectedZoneId}
        selectedMeterId={selectedMeterId}
        zones={zones}
        meters={meters}
        onCommandFinished={onCameraCommandFinished}
      />

      {/* 3. Base Physical Port Terrain & Infrastructure */}
      <group onPointerMissed={() => onClearSelection()}>
        <RoadNetwork />
        <RiverSurface />
        <Quay />

        {/* 4. Port Functional Landmarks */}
        <ContainerStacks />
        <CraneModels />
        <WarehouseBlocks />
        <UtilityStructures />

        {/* 5. 3D Operational Zones Layer */}
        <ZoneLayer3D
          zones={zones}
          selectedZoneId={selectedZoneId}
          hoveredZoneId={hoveredZoneId}
          activeLayer={activeLayer}
          onSelectZone={onSelectZone}
          onHoverZone={onHoverZone}
        />

        {/* 6. 3D Meter Beacons Layer */}
        <MeterBeaconLayer
          meters={meters}
          selectedMeterId={selectedMeterId}
          hoveredMeterId={hoveredMeterId}
          activeLayer={activeLayer}
          exceptionsOnly={exceptionsOnly}
          onSelectMeter={onSelectMeter}
          onHoverMeter={onHoverMeter}
        />
      </group>
    </>
  );
};
