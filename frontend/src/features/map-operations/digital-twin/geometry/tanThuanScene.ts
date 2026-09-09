export interface LandmarkWarehouse {
  id: string;
  name: string;
  position: [number, number, number];
  size: [number, number, number]; // width (X), height (Y), depth (Z)
  roofType: 'gable' | 'flat';
  color: string;
}

export interface LandmarkCrane {
  id: string;
  name: string;
  position: [number, number, number]; // along quayside
  boomAngle: number;
  height: number;
}

export interface ContainerStackGroup {
  id: string;
  position: [number, number, number];
  rows: number;
  cols: number;
  maxTier: number;
  primaryTone: 'rust' | 'blue' | 'green' | 'slate' | 'mixed';
}

export interface CargoVesselDef {
  id: string;
  name: string;
  position: [number, number, number];
  length: number;
  beam: number;
  hullColor: string;
}

/**
 * Procedural low-poly warehouses for Tan Thuan Port (Kho B, C, D)
 */
export const TAN_THUAN_WAREHOUSES: LandmarkWarehouse[] = [
  {
    id: 'wh-b',
    name: 'Kho B (Hàng tổng hợp)',
    position: [-35, 1.8, -20],
    size: [18, 3.6, 12],
    roofType: 'gable',
    color: '#DCE4E8',
  },
  {
    id: 'wh-c',
    name: 'Kho C (Kho ngoại quan)',
    position: [-35, 1.8, -6],
    size: [18, 3.6, 11],
    roofType: 'gable',
    color: '#D4DEE3',
  },
  {
    id: 'wh-d',
    name: 'Kho D (Bảo thuế & đệm)',
    position: [-35, 1.8, 8],
    size: [18, 3.6, 11],
    roofType: 'gable',
    color: '#CBD7DE',
  },
  {
    id: 'wh-transit',
    name: 'Nhà kho trung chuyển tiền phương',
    position: [-16, 1.4, -20],
    size: [10, 2.8, 8],
    roofType: 'flat',
    color: '#E2E8EC',
  },
];

/**
 * Procedural low-poly quayside gantry / portal cranes along Berths 1-3
 */
export const TAN_THUAN_CRANES: LandmarkCrane[] = [
  {
    id: 'crane-b1',
    name: 'Cẩu bờ QC-01',
    position: [29, 0, -22],
    boomAngle: 0.15,
    height: 14,
  },
  {
    id: 'crane-b2-1',
    name: 'Cẩu bờ QC-02',
    position: [29.5, 0, -4],
    boomAngle: 0.2,
    height: 14.5,
  },
  {
    id: 'crane-b2-2',
    name: 'Cẩu bờ QC-03',
    position: [30, 0, 8],
    boomAngle: 0.18,
    height: 14.5,
  },
  {
    id: 'crane-b3',
    name: 'Cẩu bờ QC-04',
    position: [30.5, 0, 24],
    boomAngle: 0.12,
    height: 13.5,
  },
];

/**
 * Container Yard bays (CY Blocks) in central zone
 */
export const TAN_THUAN_CONTAINER_BAYS: ContainerStackGroup[] = [
  // CY Bay 1 (North)
  {
    id: 'cy-north-1',
    position: [-6, 0.2, -18],
    rows: 4,
    cols: 6,
    maxTier: 4,
    primaryTone: 'mixed',
  },
  {
    id: 'cy-north-2',
    position: [6, 0.2, -18],
    rows: 4,
    cols: 6,
    maxTier: 3,
    primaryTone: 'blue',
  },
  // CY Bay 2 (Central)
  {
    id: 'cy-central-1',
    position: [-6, 0.2, 10],
    rows: 5,
    cols: 6,
    maxTier: 4,
    primaryTone: 'rust',
  },
  {
    id: 'cy-central-2',
    position: [6, 0.2, 10],
    rows: 5,
    cols: 6,
    maxTier: 3,
    primaryTone: 'green',
  },
];

/**
 * Technical zone substations & utility landmarks (Trạm điện A, Trạm B, Xưởng cơ giới)
 */
export const TAN_THUAN_UTILITIES = [
  {
    id: 'substation-a',
    name: 'Trạm điện biến áp A (22/0.4kV)',
    position: [-38, 1.2, 26] as [number, number, number],
    size: [8, 2.4, 6] as [number, number, number],
    color: '#A0AEC0',
  },
  {
    id: 'substation-b',
    name: 'Trạm điện B & Máy phát dự phòng',
    position: [-26, 1.2, 26] as [number, number, number],
    size: [7, 2.4, 5] as [number, number, number],
    color: '#94A3B8',
  },
  {
    id: 'workshop',
    name: 'Xưởng bảo dưỡng phương tiện cơ giới',
    position: [-10, 1.5, 26] as [number, number, number],
    size: [12, 3.0, 7] as [number, number, number],
    color: '#CBD5E1',
  },
];

/**
 * Cargo ship moored alongside Berth 2
 */
export const MOORED_CARGO_SHIP: CargoVesselDef = {
  id: 'ship-sg-express',
  name: 'Tàu hàng SAIGON STAR',
  position: [41, -0.15, -2],
  length: 36,
  beam: 6.5,
  hullColor: '#1A2E3B',
};
