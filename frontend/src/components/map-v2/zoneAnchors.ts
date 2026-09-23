import { MapV2ZoneAnchor } from './types';

/**
 * Authoritative anchor hotspots for the 7 canonical polygons of Tan Thuan 1 Port.
 * All coordinates [X, Y] are strictly validated to reside inside their corresponding polygon geometry
 * in the 1536x1024 canonical coordinate space.
 */
export const ZONE_ANCHORS: MapV2ZoneAnchor[] = [
  {
    zoneId: 'ZONE_QUAY',
    label: 'Khu cảng sà lan',
    code: 'CSL',
    category: 'operational_zone',
    point: [792, 303],
    iconType: 'quay',
    description: 'Bến đón sà lan & cầu cảng tác nghiệp hàng hóa ven sông',
  },
  {
    zoneId: 'ZONE_GENERAL',
    label: 'Bãi tổng hợp',
    code: 'BTH',
    category: 'operational_zone',
    point: [650, 470],
    iconType: 'yard',
    description: 'Bãi bốc dỡ và lưu bãi hàng rời, hàng bách hóa nội địa',
  },
  {
    zoneId: 'ZONE_CONTAINER',
    label: 'Bãi container',
    code: 'CONT',
    category: 'operational_zone',
    point: [1232, 393],
    iconType: 'container',
    description: 'Bãi chứa container xuất nhập khẩu và trung chuyển đường bộ',
  },
  {
    zoneId: 'BLDG_KHO_1',
    label: 'Kho 1',
    code: 'KHO 1',
    category: 'warehouse',
    point: [244, 476],
    iconType: 'warehouse',
    description: 'Kho lưu trữ hàng bách hóa mái che số 1',
  },
  {
    zoneId: 'BLDG_KHO_2',
    label: 'Kho 2',
    code: 'KHO 2',
    category: 'warehouse',
    point: [382, 479],
    iconType: 'warehouse',
    description: 'Kho lưu trữ tổng hợp mái che số 2',
  },
  {
    zoneId: 'BLDG_KHO_4',
    label: 'Kho 4',
    code: 'KHO 4',
    category: 'warehouse',
    point: [1004, 600],
    iconType: 'warehouse',
    description: 'Kho hàng logistics & phụ trợ kỹ thuật số 4',
  },
  {
    zoneId: 'ZONE_ADMIN',
    label: 'Văn phòng hành chính',
    code: 'VP HC',
    category: 'administration',
    point: [936, 688],
    iconType: 'admin',
    description: 'Khu nhà văn phòng điều hành và ban giám đốc cảng',
  },
];

export function getZoneAnchor(zoneId: string): MapV2ZoneAnchor | undefined {
  return ZONE_ANCHORS.find((a) => a.zoneId === zoneId);
}

/**
 * Calculates the maximum Euclidean distance from the anchor point to any vertex of the polygon.
 * This determines the exact radius needed for the circular radial reveal animation.
 */
export function computeZoneBoundingRadius(
  vertices: [number, number][],
  anchor: [number, number]
): number {
  let maxDist = 0;
  const [ax, ay] = anchor;
  for (const [vx, vy] of vertices) {
    const dx = vx - ax;
    const dy = vy - ay;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist > maxDist) {
      maxDist = dist;
    }
  }
  // Add 10% padding to guarantee full coverage of the polygon corners
  return Math.ceil(maxDist * 1.1);
}
