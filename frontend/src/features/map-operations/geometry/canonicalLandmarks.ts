/**
 * V10 Landmark-Calibrated Spatial Model — Tan Thuan Port
 *
 * Establishes physical engineering ground truth points visible on canonical 1915 x 821 base map.
 */

export type CalibrationLandmarkCategory =
  | 'quay-edge'
  | 'service-road'
  | 'internal-road'
  | 'perimeter-road'
  | 'fence'
  | 'warehouse-edge'
  | 'yard-edge'
  | 'gate'
  | 'security'
  | 'weigh-station'
  | 'intersection'
  | 'other';

export interface CalibrationLandmark {
  id: string;
  zoneId: string;
  label: string;
  category: CalibrationLandmarkCategory;
  canonical: {
    x: number;
    y: number;
  };
}

export interface ZoneBoundaryContract {
  zoneId: string;
  zoneName: string;
  description: string;
  north: string;
  south: string;
  west: string;
  east: string;
  landmarkIds: string[];
}

export const ZONE_BOUNDARY_CONTRACTS: Record<string, ZoneBoundaryContract> = {
  'pres-berth': {
    zoneId: 'pres-berth',
    zoneName: 'Cầu cảng (Berths 1–3 / 1–7)',
    description: 'Băng cầu tàu ven sông, bệ cẩu giàn và đường công vụ quayside.',
    north: 'Mép nước cầu cảng / quayside apron.',
    south: 'Đường công vụ nội bộ ngăn cách cầu cảng và bãi chứa container.',
    west: 'Điểm khởi đầu bến bãi phía Tây.',
    east: 'Điểm cuối dải cầu cảng Tân Thuận trước khi chuyển tiếp sang kho CFS phía Đông.',
    landmarkIds: [
      'berth-west-start',
      'quay-west-bend',
      'quay-central-break',
      'berth-central-junction',
      'east-crane-transition',
      'berth-east-end',
      'southern-service-road-west',
      'southern-service-road-center',
      'southern-service-road-east',
    ],
  },
  'pres-container-west': {
    zoneId: 'pres-container-west',
    zoneName: 'Bãi container phía Tây',
    description: 'Khu bãi chứa hàng rời, kho tổng hợp và cung đường ranh giới phía Tây.',
    north: 'Đường nội bộ ngay phía dưới dải cầu cảng.',
    south: 'Cung đường cong ranh giới phía Nam bến bãi.',
    west: 'Hàng rào ranh giới phía Tây cảng.',
    east: 'Trục đường nội bộ chính phân cách bãi Tây và bãi container trung tâm.',
    landmarkIds: [
      'west-yard-northwest',
      'west-yard-west-mid',
      'west-yard-southwest',
      'south-road-west-curve',
      'south-road-mid-curve',
      'south-road-east-curve',
      'west-central-road-south',
      'west-central-road-north',
    ],
  },
  'pres-container-center': {
    zoneId: 'pres-container-center',
    zoneName: 'Bãi container trung tâm (CY)',
    description: 'Trọng tâm xếp dỡ container chính của Cảng Tân Thuận.',
    north: 'Đường công vụ ngay dưới bệ cẩu cầu cảng.',
    south: 'Tuyến đường phân cách bãi container với khu kỹ thuật/trạm điện.',
    west: 'Trục đường chính phân cách với bãi container phía Tây.',
    east: 'Đường ranh giới trước khi sang cụm kho CFS phía Đông.',
    landmarkIds: [
      'central-yard-nw',
      'central-yard-ne',
      'central-yard-east-mid',
      'central-yard-se',
      'central-yard-south-road-east',
      'central-yard-south-road-west',
      'central-yard-sw',
      'central-yard-west-mid',
    ],
  },
  'pres-cfs-east': {
    zoneId: 'pres-cfs-east',
    zoneName: 'Kho / CFS phía Đông',
    description: 'Cụm nhà kho đóng ghép hàng CFS và bãi tập kết phía Đông cảng.',
    north: 'Đường chuyển tiếp từ đầu cầu tàu phía Đông.',
    south: 'Ranh giới tiếp giáp với hướng cổng chính và trạm cân.',
    west: 'Đường ranh tiếp giáp bãi container trung tâm.',
    east: 'Ranh giới tác nghiệp phía Đông bờ sông.',
    landmarkIds: [
      'east-cfs-northwest',
      'east-cfs-north',
      'east-cfs-northeast',
      'east-cfs-east',
      'east-cfs-southeast',
      'east-cfs-south',
      'east-cfs-southwest',
    ],
  },
  'pres-technical': {
    zoneId: 'pres-technical',
    zoneName: 'Khu kỹ thuật / Dịch vụ',
    description: 'Xưởng cơ giới, trạm biến áp, xưởng bảo trì và đường nội bộ phụ trợ.',
    north: 'Đường phân cách với bãi container trung tâm.',
    south: 'Ranh giới kỹ thuật phía Nam cảng.',
    west: 'Khu vực tiếp giáp phụ trợ bãi Tây.',
    east: 'Lối chuyển tiếp vào cụm trạm cân và cổng bảo vệ.',
    landmarkIds: [
      'technical-nw',
      'workshop-west',
      'technical-north-road-west',
      'technical-north-road-east',
      'workshop-east',
      'technical-east-road',
      'technical-southeast',
      'technical-south-road',
      'technical-southwest',
    ],
  },
  'pres-gate': {
    zoneId: 'pres-gate',
    zoneName: 'Cổng chính & Trạm cân',
    description: 'Phễu ra vào cảng, trạm gác an ninh, barie, làn xe tải và trạm cân.',
    north: 'Đường ranh giới giáp khu kho CFS và kỹ thuật.',
    south: 'Cổng ra vào chính tiếp giáp đường giao thông đối ngoại.',
    west: 'Khu kiểm soát trạm cân và đảo phân làn.',
    east: 'Hàng rào an ninh phía Đông cổng chính.',
    landmarkIds: [
      'gate-entry-road',
      'outer-gate',
      'security-post',
      'inbound-lane',
      'outbound-lane',
      'weigh-station-entry',
      'gate-internal-junction',
      'gate-east-boundary',
    ],
  },
};

export const CANONICAL_V10_LANDMARKS: CalibrationLandmark[] = [
  // 1. Cầu cảng (pres-berth)
  { id: 'berth-west-start', zoneId: 'pres-berth', label: 'Bến Tây - Khởi đầu cầu tàu', category: 'quay-edge', canonical: { x: 192, y: 296 } },
  { id: 'quay-west-bend', zoneId: 'pres-berth', label: 'Bờ kè Tây - Góc uốn', category: 'quay-edge', canonical: { x: 440, y: 305 } },
  { id: 'quay-central-break', zoneId: 'pres-berth', label: 'Cầu cảng giữa - Điểm nối bến', category: 'quay-edge', canonical: { x: 695, y: 284 } },
  { id: 'berth-central-junction', zoneId: 'pres-berth', label: 'Ngã ba đường công vụ cầu cảng', category: 'intersection', canonical: { x: 930, y: 268 } },
  { id: 'east-crane-transition', zoneId: 'pres-berth', label: 'Chuyển tiếp ray cẩu giàn phía Đông', category: 'quay-edge', canonical: { x: 1480, y: 220 } },
  { id: 'berth-east-end', zoneId: 'pres-berth', label: 'Điểm kết thúc cầu cảng phía Đông', category: 'quay-edge', canonical: { x: 1915, y: 56 } },
  { id: 'southern-service-road-east', zoneId: 'pres-berth', label: 'Đường công vụ phía Nam - Đông', category: 'service-road', canonical: { x: 1505, y: 245 } },
  { id: 'southern-service-road-center', zoneId: 'pres-berth', label: 'Đường công vụ phía Nam - Giữa', category: 'service-road', canonical: { x: 930, y: 310 } },
  { id: 'southern-service-road-west', zoneId: 'pres-berth', label: 'Đường công vụ phía Nam - Tây', category: 'service-road', canonical: { x: 192, y: 338 } },

  // 2. Bãi container phía Tây (pres-container-west)
  { id: 'west-yard-northwest', zoneId: 'pres-container-west', label: 'Góc Tây Bắc bãi Tây', category: 'yard-edge', canonical: { x: 27, y: 315 } },
  { id: 'west-yard-west-mid', zoneId: 'pres-container-west', label: 'Ranh giới bờ rào phía Tây', category: 'fence', canonical: { x: 15, y: 380 } },
  { id: 'west-yard-southwest', zoneId: 'pres-container-west', label: 'Góc Tây Nam bãi Tây', category: 'yard-edge', canonical: { x: 9, y: 467 } },
  { id: 'south-road-west-curve', zoneId: 'pres-container-west', label: 'Khúc cua đường Nam phía Tây', category: 'perimeter-road', canonical: { x: 134, y: 537 } },
  { id: 'south-road-mid-curve', zoneId: 'pres-container-west', label: 'Đoạn cong giữa đường Nam', category: 'perimeter-road', canonical: { x: 280, y: 545 } },
  { id: 'south-road-east-curve', zoneId: 'pres-container-west', label: 'Đoạn cong Đông đường Nam', category: 'perimeter-road', canonical: { x: 450, y: 555 } },
  { id: 'west-central-road-south', zoneId: 'pres-container-west', label: 'Ngã tư đường ranh Tây - Trung tâm Nam', category: 'intersection', canonical: { x: 820, y: 548 } },
  { id: 'west-central-road-north', zoneId: 'pres-container-west', label: 'Ngã ba đường ranh Tây - Trung tâm Bắc', category: 'intersection', canonical: { x: 820, y: 328 } },

  // 3. Bãi container trung tâm (pres-container-center)
  { id: 'central-yard-nw', zoneId: 'pres-container-center', label: 'Góc Tây Bắc CY trung tâm', category: 'yard-edge', canonical: { x: 820, y: 328 } },
  { id: 'central-yard-ne', zoneId: 'pres-container-center', label: 'Góc Đông Bắc CY trung tâm', category: 'yard-edge', canonical: { x: 1505, y: 245 } },
  { id: 'central-yard-east-mid', zoneId: 'pres-container-center', label: 'Ranh giới Đông CY trung tâm', category: 'internal-road', canonical: { x: 1545, y: 380 } },
  { id: 'central-yard-se', zoneId: 'pres-container-center', label: 'Góc Đông Nam CY trung tâm', category: 'yard-edge', canonical: { x: 1546, y: 515 } },
  { id: 'central-yard-south-road-east', zoneId: 'pres-container-center', label: 'Đường phân cách Nam - Đông CY', category: 'internal-road', canonical: { x: 1200, y: 525 } },
  { id: 'central-yard-south-road-west', zoneId: 'pres-container-center', label: 'Đường phân cách Nam - Tây CY', category: 'internal-road', canonical: { x: 836, y: 525 } },
  { id: 'central-yard-sw', zoneId: 'pres-container-center', label: 'Góc Tây Nam CY trung tâm', category: 'yard-edge', canonical: { x: 830, y: 500 } },
  { id: 'central-yard-west-mid', zoneId: 'pres-container-center', label: 'Ranh giới Tây CY trung tâm', category: 'internal-road', canonical: { x: 820, y: 420 } },

  // 4. Kho / CFS phía Đông (pres-cfs-east)
  { id: 'east-cfs-northwest', zoneId: 'pres-cfs-east', label: 'Lối vào cụm kho phía Bắc', category: 'internal-road', canonical: { x: 1505, y: 245 } },
  { id: 'east-cfs-north', zoneId: 'pres-cfs-east', label: 'Đỉnh cụm kho CFS phía Bắc', category: 'warehouse-edge', canonical: { x: 1765, y: 195 } },
  { id: 'east-cfs-northeast', zoneId: 'pres-cfs-east', label: 'Góc Đông Bắc kho CFS', category: 'warehouse-edge', canonical: { x: 1905, y: 215 } },
  { id: 'east-cfs-east', zoneId: 'pres-cfs-east', label: 'Bờ rào phía Đông kho CFS', category: 'fence', canonical: { x: 1915, y: 350 } },
  { id: 'east-cfs-southeast', zoneId: 'pres-cfs-east', label: 'Góc Đông Nam cụm kho CFS', category: 'warehouse-edge', canonical: { x: 1850, y: 465 } },
  { id: 'east-cfs-south', zoneId: 'pres-cfs-east', label: 'Ranh giới đường Nam kho CFS', category: 'service-road', canonical: { x: 1690, y: 485 } },
  { id: 'east-cfs-southwest', zoneId: 'pres-cfs-east', label: 'Góc Tây Nam kho CFS', category: 'warehouse-edge', canonical: { x: 1555, y: 428 } },

  // 5. Khu kỹ thuật / Dịch vụ (pres-technical)
  { id: 'technical-nw', zoneId: 'pres-technical', label: 'Góc Tây Bắc khu kỹ thuật', category: 'yard-edge', canonical: { x: 836, y: 525 } },
  { id: 'workshop-west', zoneId: 'pres-technical', label: 'Mép Tây xưởng bảo dưỡng cơ giới', category: 'warehouse-edge', canonical: { x: 812, y: 586 } },
  { id: 'technical-north-road-west', zoneId: 'pres-technical', label: 'Đường dịch vụ Bắc - Tây', category: 'internal-road', canonical: { x: 950, y: 525 } },
  { id: 'technical-north-road-east', zoneId: 'pres-technical', label: 'Đường dịch vụ Bắc - Đông', category: 'internal-road', canonical: { x: 1200, y: 525 } },
  { id: 'workshop-east', zoneId: 'pres-technical', label: 'Mép Đông trạm điện trung thế', category: 'warehouse-edge', canonical: { x: 1320, y: 765 } },
  { id: 'technical-east-road', zoneId: 'pres-technical', label: 'Đường giao cắt kỹ thuật Đông', category: 'service-road', canonical: { x: 1474, y: 625 } },
  { id: 'technical-southeast', zoneId: 'pres-technical', label: 'Góc Đông Nam trạm kỹ thuật B', category: 'yard-edge', canonical: { x: 1380, y: 710 } },
  { id: 'technical-south-road', zoneId: 'pres-technical', label: 'Tuyến đường biên phía Nam', category: 'perimeter-road', canonical: { x: 1100, y: 768 } },
  { id: 'technical-southwest', zoneId: 'pres-technical', label: 'Góc Tây Nam trạm A', category: 'yard-edge', canonical: { x: 939, y: 656 } },

  // 6. Cổng chính & Trạm cân (pres-gate)
  { id: 'gate-entry-road', zoneId: 'pres-gate', label: 'Lối nhập làn từ đường nội bộ', category: 'internal-road', canonical: { x: 1500, y: 515 } },
  { id: 'outer-gate', zoneId: 'pres-gate', label: 'Trụ barie cổng chính Tân Thuận', category: 'gate', canonical: { x: 1900, y: 606 } },
  { id: 'security-post', zoneId: 'pres-gate', label: 'Bốt bảo vệ & kiểm soát chứng từ', category: 'security', canonical: { x: 1664, y: 562 } },
  { id: 'inbound-lane', zoneId: 'pres-gate', label: 'Làn xe container vào cảng', category: 'gate', canonical: { x: 1678, y: 617 } },
  { id: 'outbound-lane', zoneId: 'pres-gate', label: 'Làn xe container ra cảng', category: 'gate', canonical: { x: 1564, y: 564 } },
  { id: 'weigh-station-entry', zoneId: 'pres-gate', label: 'Bàn cân tải trọng xe container', category: 'weigh-station', canonical: { x: 1525, y: 560 } },
  { id: 'gate-internal-junction', zoneId: 'pres-gate', label: 'Nút giao thông phân luồng vào bãi', category: 'intersection', canonical: { x: 1595, y: 485 } },
  { id: 'gate-east-boundary', zoneId: 'pres-gate', label: 'Ranh rào chắn an ninh Đông cổng', category: 'fence', canonical: { x: 1790, y: 488 } },
];
