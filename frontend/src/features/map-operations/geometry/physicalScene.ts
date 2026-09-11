/**
 * Physical Scene Geometry — Tan Thuan Port (Figma Authoritative Alignment)
 *
 * Reconstructed directly from authoritative Figma frames:
 * - Frame 2:2 (Default) & 2:104 (Critical Exceptions)
 *
 * Contains:
 * - Saigon River banner with dashed mooring guidelines
 * - Moored cargo ship ("TÀU HÀNG") stadium pill
 * - Concrete quayside apron (Berths 1, 2, 3)
 * - 4 major sectors: CẦU CẢNG, KHO / CFS, BÃI CONTAINER, BÃI HÀNG TỔNG HỢP
 * - 10 discrete physical sub-blocks (Kho B, C, D, Bãi A, A2, B1, B2, Hàng Tổng Hợp, Trạm Điện, Xưởng)
 * - Internal arterial roads: Central avenue and horizontal crossroad with dashed divider
 * - Luu Trong Lu main access axis
 */

export const PHYSICAL_VIEWBOX = {
  width: 1300,
  height: 520,
  aspectRatio: 2.5,
};

export const FIT_VIEWBOX = '0 0 1300 520';

/**
 * Saigon River Northern Banner
 */
export const PHYSICAL_RIVER = {
  path: 'M 0,0 L 1300,0 L 1300,115 L 0,115 Z',
  color: '#C8D8E4',       // --scene-water: muted Saigon River blue-gray
  edgeColor: '#A8BCC9',   // --scene-water-edge: subtle edge
  label: 'SÔNG SÀI GÒN',
  labelY: 48,
  mooringLines: [
    { x: 295, y1: 25, y2: 115 },
    { x: 610, y1: 25, y2: 115 },
    { x: 930, y1: 25, y2: 115 },
  ],
  guidelines: [
    { x1: 220, y1: 65, x2: 370, y2: 65 },
    { x1: 535, y1: 65, x2: 685, y2: 65 },
    { x1: 855, y1: 65, x2: 1005, y2: 65 },
  ],
  mooredShip: {
    x: 640,
    y: 82,
    width: 180,
    height: 24,
    rx: 12,
    frontWidth: 60,
    frontFill: '#728A9A',
    backFill: '#485F6E',
    label: 'TÀU HÀNG',
  },
};

/**
 * Outer Port Land Perimeter Boundary
 */
export const PHYSICAL_PORT_LAND = {
  path: 'M 90,115 L 1220,115 L 1220,430 L 1030,488 L 135,488 L 90,430 Z',
  fillColor: '#F0F4F7',   // --scene-ground
  strokeColor: '#B0C4D1',
};

/**
 * Quayside Apron along Saigon River (CẦU CẢNG)
 */
export const PHYSICAL_QUAY = {
  rect: { x: 115, y: 115, width: 1040, height: 48 },
  fill: '#E8EEF2',     // --scene-structure
  stroke: '#94AEBB',   // stronger structural edge
  label: 'CẦU CẢNG',
  labelPosition: { x: 650, y: 135 },
  berths: [
    { id: 'berth-1', name: 'Cầu 1', x: 295, y: 144 },
    { id: 'berth-2', name: 'Cầu 2', x: 610, y: 144 },
    { id: 'berth-3', name: 'Cầu 3', x: 930, y: 144 },
  ],
  dividerX: 525,
};

/**
 * Arterial Road Network & Avenue Labels
 */
export const PHYSICAL_ROADS = {
  centralAvenue: { x: 525, y: 163, width: 25, height: 325, fill: '#D6E0E8' },  // --scene-road
  crossroad: { x: 115, y: 335, width: 945, height: 18, fill: '#D6E0E8' },     // --scene-road
  centerline: { x1: 115, y1: 344, x2: 1060, y2: 344, stroke: '#BFCCDA', strokeDasharray: '6 6', strokeWidth: 1.5 },
  axisLabel: 'LƯU TRỌNG LƯ / CỔNG CHÍNH',
  axisLabelPosition: { x: 537, y: 504 },
};

/**
 * 4 Zone Container Outline Frames (Figma Schematic Hierarchy)
 */
export const PHYSICAL_ZONE_FRAMES = [
  {
    id: 'frame-kho',
    title: 'KHO / CFS',
    titlePosition: { x: 315, y: 198 },
    rect: { x: 130, y: 185, width: 370, height: 142, rx: 4 },
  },
  {
    id: 'frame-container',
    title: 'BÃI CONTAINER',
    titlePosition: { x: 800, y: 198 },
    // Polygon with beveled top-right corner per Figma
    polygon: 'M 560,185 L 1025,185 L 1060,220 L 1060,372 L 560,372 Z',
  },
  {
    id: 'frame-cargo',
    title: 'BÃI HÀNG TỔNG HỢP',
    titlePosition: { x: 315, y: 378 },
    rect: { x: 125, y: 365, width: 385, height: 115, rx: 4 },
  },
];

/**
 * 10 Discrete Physical Sub-Blocks inside the Zones (Figma exact match)
 */
export const PHYSICAL_SUB_BLOCKS = [
  // 1. KHO / CFS sub-blocks
  { id: 'block-wh-b', name: 'KHO B', rect: { x: 150, y: 215, width: 145, height: 48, rx: 4 } },
  { id: 'block-wh-c', name: 'KHO C', rect: { x: 325, y: 215, width: 145, height: 48, rx: 4 } },
  { id: 'block-wh-d', name: 'KHO D', rect: { x: 150, y: 278, width: 145, height: 44, rx: 4 } },

  // 2. BÃI CONTAINER sub-blocks
  { id: 'block-cy-a', name: 'BÃI A', rect: { x: 590, y: 215, width: 195, height: 90, rx: 4 } },
  { id: 'block-cy-a2', name: 'BÃI A2', rect: { x: 815, y: 215, width: 195, height: 90, rx: 4 } },
  { id: 'block-cy-b1', name: 'BÃI B1', rect: { x: 590, y: 320, width: 195, height: 48, rx: 4 } },
  { id: 'block-cy-b2', name: 'BÃI B2', rect: { x: 815, y: 320, width: 195, height: 48, rx: 4 } },

  // 3. BÃI HÀNG TỔNG HỢP sub-block
  { id: 'block-cargo', name: 'HÀNG TỔNG HỢP', rect: { x: 175, y: 395, width: 180, height: 58, rx: 4 } },

  // 4. KỸ THUẬT & TRẠM ĐIỆN sub-blocks
  { id: 'block-substation', name: 'TRẠM ĐIỆN', rect: { x: 590, y: 395, width: 150, height: 55, rx: 4 } },
  { id: 'block-workshop', name: 'XƯỞNG', rect: { x: 765, y: 395, width: 145, height: 55, rx: 4 } },
];
