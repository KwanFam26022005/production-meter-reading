/**
 * Physical Scene Geometry — Tan Thuan Port
 *
 * Contains ONLY physical geographic features:
 * - Saigon River (Northern edge) — reduced to ~15% of map height
 * - Port land footprint (Elongated 2.5:1 riverfront geometry)
 * - Concrete quayside apron & berths 1, 2, 3
 * - Internal arterial road network
 * - Warehouses B, C, D (West sector)
 * - Container stacking yard grid blocks (East sector)
 * - Technical area & 110kV substation (South-Central sector)
 * - Main entrance gate (South)
 *
 * NOTE: Does NOT contain operational metrics, zone assignments, or meter states.
 *
 * GEOMETRY REVISION (Phase 6A):
 *   River height reduced from ~115px → 72px (to avoid large empty top band).
 *   Port footprint y-start adjusted accordingly.
 *   All downstream y-coordinates shifted to match.
 */

export const PHYSICAL_VIEWBOX = {
  width: 1300,
  height: 520,
  aspectRatio: 2.5,
};

// ─────────────────────────────────────────────────────────────────────────────
// OPERATIONAL MAP BOUNDS — geometry-fit, not hard-coded pixel offsets
// Used to compute an auto-fit viewBox that centers the port footprint.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Returns the tight SVG bounding box of operational content:
 * river + quay edge (top) through gate (bottom).
 * Padding args are percentages of the respective dimension.
 */
export function getOperationalMapBounds(
  paddingXPct = 0.04,
  paddingYPct = 0.05,
): { x: number; y: number; width: number; height: number } {
  // Content spans y=0 (river top) to y=496 (gate bottom)
  // and x=0 to x=1300
  const contentX1 = 0;
  const contentX2 = 1300;
  const contentY1 = 0;   // top of river
  const contentY2 = 498; // bottom of gate label

  const contentW = contentX2 - contentX1;
  const contentH = contentY2 - contentY1;

  const padX = contentW * paddingXPct;
  const padY = contentH * paddingYPct;

  return {
    x: contentX1 - padX,
    y: contentY1 - padY,
    width: contentW + 2 * padX,
    height: contentH + 2 * padY,
  };
}

/** Pre-computed default fit viewBox string for the SVG */
export const FIT_VIEWBOX = (() => {
  const b = getOperationalMapBounds(0.03, 0.04);
  return `${b.x.toFixed(1)} ${b.y.toFixed(1)} ${b.width.toFixed(1)} ${b.height.toFixed(1)}`;
})();

// River is now 72px tall (≈ 14% of 520) — recognisable boundary, not dominant sky
export const PHYSICAL_RIVER = {
  path: 'M 0,0 L 1300,0 L 1300,72 C 1050,68 820,74 650,72 C 450,70 250,74 0,70 Z',
  color: '#C8DDE9',
  edgeColor: '#7A9FB5',
  label: 'SÔNG SÀI GÒN',
  ripples: [
    { d: 'M 120,25 C 180,22 240,28 300,25', opacity: 0.45 },
    { d: 'M 480,32 C 560,28 640,36 720,31', opacity: 0.5 },
    { d: 'M 880,22 C 950,20 1020,26 1090,22', opacity: 0.4 },
    { d: 'M 260,50 C 330,47 400,53 470,49', opacity: 0.35 },
    { d: 'M 670,55 C 750,51 830,59 910,54', opacity: 0.4 },
  ],
};

// Port land starts at y=68 (was 110), ends at y=498
export const PHYSICAL_PORT_LAND = {
  points: [
    { x: 20, y: 68 },
    { x: 1280, y: 68 },
    { x: 1280, y: 478 },
    { x: 1070, y: 496 },
    { x: 650, y: 500 },
    { x: 230, y: 496 },
    { x: 20, y: 478 },
  ],
  fillColor: '#F3F6F8',
  strokeColor: '#C8D8E2',
};

// Quay apron: y was 108 → now 66
export const PHYSICAL_QUAY = {
  rect: { x: 150, y: 66, width: 1060, height: 32 },
  concreteFill: '#D8E4EC',
  railStroke: '#9DB6C5',
  bollards: [
    { x: 200, y: 68 }, { x: 280, y: 68 }, { x: 360, y: 68 },
    { x: 440, y: 68 }, { x: 520, y: 68 }, { x: 600, y: 68 },
    { x: 680, y: 68 }, { x: 760, y: 68 }, { x: 840, y: 68 },
    { x: 920, y: 68 }, { x: 1000, y: 68 }, { x: 1080, y: 68 },
    { x: 1160, y: 68 },
  ],
  berths: [
    { id: 'berth-1', name: 'CẦU 1', x: 310, y: 88 },
    { id: 'berth-2', name: 'CẦU 2', x: 670, y: 88 },
    { id: 'berth-3', name: 'CẦU 3', x: 1030, y: 88 },
  ],
  mooredShip: {
    path: 'M 735,50 L 915,50 C 930,50 940,56 940,61 C 940,66 930,72 915,72 L 735,72 C 727,72 723,67 723,61 C 723,55 727,50 735,50 Z',
    fill: '#42566A',
    superstructure: { x: 745, y: 53, width: 32, height: 13, fill: '#D8E8F2' },
    label: 'TÀU HÀNG NỘI ĐỊA',
  },
};

// Roads shifted by -42px in Y (110→68)
export const PHYSICAL_ROADS = [
  { id: 'road-south', d: 'M 50,450 L 1250,450', strokeWidth: 10 },
  { id: 'road-central', d: 'M 650,498 L 650,100', strokeWidth: 12 },
  { id: 'road-west', d: 'M 350,450 L 350,100', strokeWidth: 8 },
  { id: 'road-east', d: 'M 950,450 L 950,100', strokeWidth: 8 },
  { id: 'road-cross-mid', d: 'M 50,285 L 1250,285', strokeWidth: 7 },
];

// Warehouses shifted -42px in Y
export const PHYSICAL_WAREHOUSES = [
  {
    id: 'wh-b',
    code: 'KHO B',
    subTitle: 'Hàng CFS & Ngoại quan',
    rect: { x: 70, y: 118, width: 238, height: 100 },
  },
  {
    id: 'wh-c',
    code: 'KHO C',
    subTitle: 'Hàng Bách hóa Tổng hợp',
    rect: { x: 375, y: 118, width: 230, height: 100 },
  },
  {
    id: 'wh-d',
    code: 'KHO D',
    subTitle: 'Kho Lạnh / Reefer CFS',
    rect: { x: 70, y: 310, width: 238, height: 108 },
  },
];

// Container yards shifted -42px in Y
export const PHYSICAL_CONTAINER_YARDS = [
  {
    id: 'cy-bay-1',
    code: 'BÃI A1',
    rect: { x: 695, y: 118, width: 220, height: 100 },
    rows: 4,
    cols: 6,
  },
  {
    id: 'cy-bay-2',
    code: 'BÃI A2',
    rect: { x: 985, y: 118, width: 250, height: 100 },
    rows: 4,
    cols: 7,
  },
  {
    id: 'cy-bay-3',
    code: 'BÃI B1',
    rect: { x: 695, y: 310, width: 220, height: 108 },
    rows: 4,
    cols: 6,
  },
  {
    id: 'cy-bay-4',
    code: 'BÃI B2',
    rect: { x: 985, y: 310, width: 250, height: 108 },
    rows: 4,
    cols: 7,
  },
];

// Technical structures shifted -42px in Y
export const PHYSICAL_TECHNICAL_STRUCTURES = [
  {
    id: 'tech-substation',
    name: 'TRẠM NGUỒN 110KV',
    rect: { x: 395, y: 330, width: 156, height: 90 },
  },
  {
    id: 'tech-workshop',
    name: 'XƯỞNG CƠ ĐIỆN VẬN HÀNH',
    rect: { x: 570, y: 330, width: 148, height: 90 },
  },
  {
    id: 'tech-gate',
    name: 'CỔNG CHÍNH CẢNG TÂN THUẬN',
    rect: { x: 600, y: 480, width: 100, height: 18 },
  },
];
