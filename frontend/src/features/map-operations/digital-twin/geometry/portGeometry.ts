import { SCENE_WORLD_SIZE } from './mapSceneCoordinates';

export interface RoadSegment {
  id: string;
  points: [number, number, number][]; // [X, Y, Z] path
  width: number;
  isMainSpine?: boolean;
}

export interface QuayBerthDef {
  id: string;
  name: string;
  startPoint: [number, number, number];
  endPoint: [number, number, number];
  bollardCount: number;
}

export const PORT_GROUND_CONFIG = {
  // Main port terrain footprint (X: [-58, +36], Z: [-38, +38])
  terrainBounds: {
    minX: -58,
    maxX: 36,
    minZ: -38,
    maxZ: 38,
    height: 0.2,
  },
  // Saigon River water plane spanning the eastern half
  riverBounds: {
    minX: 35,
    maxX: 72,
    minZ: -48,
    maxZ: 48,
    elevation: SCENE_WORLD_SIZE.waterElevation,
  },
  // Concrete quay line along the river edge
  quayApron: {
    minX: 16,
    maxX: 36,
    minZ: -36,
    maxZ: 36,
    elevation: SCENE_WORLD_SIZE.quayElevation,
  },
};

/**
 * Berths along the Saigon River quayside (Berth 1 to 3)
 */
export const PORT_BERTHS: QuayBerthDef[] = [
  {
    id: 'berth-1',
    name: 'Cầu cảng số 1',
    startPoint: [34, 0.22, -34],
    endPoint: [34.5, 0.22, -12],
    bollardCount: 6,
  },
  {
    id: 'berth-2',
    name: 'Cầu cảng số 2',
    startPoint: [34.5, 0.22, -10],
    endPoint: [35, 0.22, 12],
    bollardCount: 7,
  },
  {
    id: 'berth-3',
    name: 'Cầu cảng số 3',
    startPoint: [35, 0.22, 14],
    endPoint: [35.5, 0.22, 34],
    bollardCount: 6,
  },
];

/**
 * Internal circulation roads within Tan Thuan terminal
 */
export const PORT_ROADS: RoadSegment[] = [
  // Main Central Spine: Gate -> Container Yard -> Quayside Apron
  {
    id: 'road-central-spine',
    points: [
      [-56, 0.05, 0],
      [-20, 0.05, 0],
      [5, 0.05, 0],
      [18, 0.05, 0],
    ],
    width: 3.2,
    isMainSpine: true,
  },
  // Quayside Waterfront Service Road (runs North-South parallel to berths)
  {
    id: 'road-quay-transit',
    points: [
      [18, 0.05, -34],
      [18, 0.05, 0],
      [18, 0.05, 34],
    ],
    width: 3.0,
  },
  // North Warehouse Access Road (leads into Zone Warehouse B, C, D)
  {
    id: 'road-warehouse-loop',
    points: [
      [-48, 0.05, -28],
      [-20, 0.05, -28],
      [-20, 0.05, 0],
    ],
    width: 2.6,
  },
  // South Technical Area Access Road (leads into Zone Technical / Substations)
  {
    id: 'road-technical-access',
    points: [
      [-48, 0.05, 28],
      [-15, 0.05, 28],
      [5, 0.05, 28],
      [18, 0.05, 28],
    ],
    width: 2.6,
  },
  // West Perimeter Link Road
  {
    id: 'road-west-perimeter',
    points: [
      [-48, 0.05, -28],
      [-56, 0.05, 0],
      [-48, 0.05, 28],
    ],
    width: 2.4,
  },
];
