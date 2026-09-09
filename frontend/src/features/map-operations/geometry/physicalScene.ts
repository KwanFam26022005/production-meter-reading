/**
 * Physical Scene Geometry — Tan Thuan Port
 *
 * Contains ONLY physical geographic features:
 * - Saigon River (Northern edge)
 * - Port land footprint (Elongated 2.5:1 riverfront geometry)
 * - Concrete quayside apron & berths 1, 2, 3
 * - Internal arterial road network
 * - Warehouses B, C, D (West sector)
 * - Container stacking yard grid blocks (East sector)
 * - Technical area & 110kV substation (South-Central sector)
 * - Main entrance gate (South)
 *
 * NOTE: Does NOT contain operational metrics, zone assignments, or meter states.
 */

export const PHYSICAL_VIEWBOX = {
  width: 1300,
  height: 520,
  aspectRatio: 2.5,
};

export const PHYSICAL_RIVER = {
  path: 'M 0,0 L 1300,0 L 1300,115 C 1050,110 820,118 650,115 C 450,112 250,118 0,112 Z',
  color: '#D4E3EC',
  edgeColor: '#8CA7B8',
  label: 'SÔNG SÀI GÒN',
  ripples: [
    { d: 'M 120,45 C 180,42 240,48 300,45', opacity: 0.4 },
    { d: 'M 480,50 C 560,46 640,54 720,49', opacity: 0.5 },
    { d: 'M 880,42 C 950,40 1020,45 1090,42', opacity: 0.4 },
    { d: 'M 260,75 C 330,72 400,78 470,74', opacity: 0.35 },
    { d: 'M 670,80 C 750,76 830,84 910,79', opacity: 0.45 },
  ],
};

export const PHYSICAL_PORT_LAND = {
  // Elongated port land perimeter polygon
  points: [
    { x: 30, y: 110 },
    { x: 1270, y: 110 },
    { x: 1270, y: 470 },
    { x: 1080, y: 490 },
    { x: 650, y: 495 },
    { x: 220, y: 490 },
    { x: 30, y: 470 },
  ],
  fillColor: '#F4F7F9',
  strokeColor: '#D3DFE6',
};

export const PHYSICAL_QUAY = {
  // Concrete quay apron running along water's edge
  rect: { x: 160, y: 108, width: 1040, height: 36 },
  concreteFill: '#DCE5EB',
  railStroke: '#A6BAC7',
  bollards: [
    { x: 200, y: 110 },
    { x: 280, y: 110 },
    { x: 360, y: 110 },
    { x: 440, y: 110 },
    { x: 520, y: 110 },
    { x: 600, y: 110 },
    { x: 680, y: 110 },
    { x: 760, y: 110 },
    { x: 840, y: 110 },
    { x: 920, y: 110 },
    { x: 1000, y: 110 },
    { x: 1080, y: 110 },
    { x: 1160, y: 110 },
  ],
  berths: [
    { id: 'berth-1', name: 'CẦU 1', x: 310, y: 130 },
    { id: 'berth-2', name: 'CẦU 2', x: 670, y: 130 },
    { id: 'berth-3', name: 'CẦU 3', x: 1030, y: 130 },
  ],
  mooredShip: {
    // Subtle cargo ship outline berthed at Cầu 2
    path: 'M 740,94 L 920,94 C 935,94 945,100 945,104 C 945,108 935,114 920,114 L 740,114 C 732,114 728,109 728,104 C 728,99 732,94 740,94 Z',
    fill: '#445866',
    superstructure: { x: 750, y: 97, width: 35, height: 14, fill: '#E8F0F5' },
    label: 'TÀU HÀNG NỘI ĐỊA',
  },
};

export const PHYSICAL_ROADS = [
  // South perimeter arterial road
  { id: 'road-south', d: 'M 50,445 L 1250,445', strokeWidth: 10 },
  // Central North-South avenue
  { id: 'road-central', d: 'M 650,490 L 650,144', strokeWidth: 12 },
  // West distribution road
  { id: 'road-west', d: 'M 350,445 L 350,144', strokeWidth: 8 },
  // East distribution road
  { id: 'road-east', d: 'M 950,445 L 950,144', strokeWidth: 8 },
  // Mid crossroad
  { id: 'road-cross-mid', d: 'M 50,280 L 1250,280', strokeWidth: 7 },
];

export const PHYSICAL_WAREHOUSES = [
  {
    id: 'wh-b',
    code: 'KHO B',
    subTitle: 'Hàng CFS & Ngoại quan',
    rect: { x: 80, y: 165, width: 230, height: 95 },
  },
  {
    id: 'wh-c',
    code: 'KHO C',
    subTitle: 'Hàng Bách hóa Tổng hợp',
    rect: { x: 390, y: 165, width: 220, height: 95 },
  },
  {
    id: 'wh-d',
    code: 'KHO D',
    subTitle: 'Kho Lạnh / Reefer CFS',
    rect: { x: 80, y: 310, width: 230, height: 105 },
  },
];

export const PHYSICAL_CONTAINER_YARDS = [
  {
    id: 'cy-bay-1',
    code: 'BÃI A1',
    rect: { x: 700, y: 165, width: 215, height: 95 },
    rows: 4,
    cols: 6,
  },
  {
    id: 'cy-bay-2',
    code: 'BÃI A2',
    rect: { x: 990, y: 165, width: 240, height: 95 },
    rows: 4,
    cols: 7,
  },
  {
    id: 'cy-bay-3',
    code: 'BÃI B1',
    rect: { x: 700, y: 310, width: 215, height: 105 },
    rows: 4,
    cols: 6,
  },
  {
    id: 'cy-bay-4',
    code: 'BÃI B2',
    rect: { x: 990, y: 310, width: 240, height: 105 },
    rows: 4,
    cols: 7,
  },
];

export const PHYSICAL_TECHNICAL_STRUCTURES = [
  {
    id: 'tech-substation',
    name: 'TRẠM NGUỒN 110KV',
    rect: { x: 400, y: 330, width: 150, height: 85 },
  },
  {
    id: 'tech-workshop',
    name: 'XƯỞNG CƠ ĐIỆN VẬN HÀNH',
    rect: { x: 580, y: 330, width: 140, height: 85 },
  },
  {
    id: 'tech-gate',
    name: 'CỔNG CHÍNH CẢNG TÂN THUẬN',
    rect: { x: 605, y: 478, width: 90, height: 18 },
  },
];
