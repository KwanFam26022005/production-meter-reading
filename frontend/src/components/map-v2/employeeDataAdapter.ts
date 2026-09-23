/**
 * Saigon Port Map V2 — Employee Data Adapter & Integrity Gate
 *
 * Implements strict data truthfulness rules:
 * - Distinguishes verified authoritative assignments from demo/illustrative visualizations.
 * - Labels employees as "zone assignees" (Người phụ trách phân khu), NOT as real-time GPS or unverified shift duty.
 * - Suppresses individual progress denominators (denominators belong to zones, not individuals).
 * - Documents the production data dependencies needed for future live integration.
 */

export interface MapV2Employee {
  id: string;
  code: string;
  name: string;
  zoneId: string;
  zoneLabel: string;
  roleTitle: string;
  dutyStatus: 'assigned' | 'unassigned' | 'unknown';
  dutyLabel: string;
  isDemo: boolean;
  isStationary?: boolean;
  avatarInitials: string;
  shiftNotes?: string;
  zoneMeterSummary?: string; // Zone-level only, e.g. "Tiến độ khu vực: 34/42"
  coordinates?: [number, number];
}

/**
 * Explanatory banner required by Section 18 for demo animation:
 * "Chuyển động minh họa khu vực phân công — không phải vị trí GPS."
 */
export const MAP_V2_EMPLOYEE_DISCLOSURE_TEXT = 'Chuyển động minh họa khu vực phân công — không phải vị trí GPS.';

/**
 * Disclosure text for real live standing assignees:
 * Stationary marker at operator anchor, no GPS tracking.
 */
export const MAP_V2_LIVE_STAFF_DISCLOSURE_TEXT = 'Người phụ trách phân khu — Vị trí cố định tại điểm neo, không phải vị trí GPS.';

/**
 * Isolated demo-only employee assignments for Map V2 canonical zones.
 * Used when authoritative backend zone-assignment integration is not active on Map V2.
 */
export const DEMO_MAP_V2_EMPLOYEES: MapV2Employee[] = [
  {
    id: 'DEMO_NV001',
    code: 'NV001',
    name: 'Nguyễn Văn Hải',
    zoneId: 'ZONE_QUAY',
    zoneLabel: 'Khu cảng sà lan',
    roleTitle: 'Người phụ trách phân khu',
    dutyStatus: 'assigned',
    dutyLabel: 'Phân công theo dõi khu vực (Minh họa)',
    isDemo: true,
    avatarInitials: 'HẢI',
    shiftNotes: 'Phân công thường trực khu vực cầu bến sà lan',
    zoneMeterSummary: 'Khu vực: 34/42 công tơ (81%)',
  },
  {
    id: 'DEMO_NV003',
    code: 'NV003',
    name: 'Lê Hoàng Nam',
    zoneId: 'ZONE_GENERAL',
    zoneLabel: 'Bãi tổng hợp',
    roleTitle: 'Người phụ trách phân khu',
    dutyStatus: 'assigned',
    dutyLabel: 'Phân công theo dõi khu vực (Minh họa)',
    isDemo: true,
    avatarInitials: 'NAM',
    shiftNotes: 'Phân công thường trực bãi hàng bách hóa',
    zoneMeterSummary: 'Khu vực: 28/35 công tơ (80%)',
  },
  {
    id: 'DEMO_NV002',
    code: 'NV002',
    name: 'Trần Minh Tuấn',
    zoneId: 'ZONE_CONTAINER',
    zoneLabel: 'Bãi container',
    roleTitle: 'Người phụ trách phân khu',
    dutyStatus: 'assigned',
    dutyLabel: 'Phân công theo dõi khu vực (Minh họa)',
    isDemo: true,
    avatarInitials: 'TUẤN',
    shiftNotes: 'Phân công thường trực bãi container reefer',
    zoneMeterSummary: 'Khu vực: 18/40 công tơ (45%)',
  },
  {
    id: 'DEMO_NV004',
    code: 'NV004',
    name: 'Võ Quốc Bảo',
    zoneId: 'BLDG_KHO_1',
    zoneLabel: 'Kho 1',
    roleTitle: 'Người phụ trách kho',
    dutyStatus: 'assigned',
    dutyLabel: 'Phân công theo dõi kho (Minh họa)',
    isDemo: true,
    avatarInitials: 'BẢO',
    shiftNotes: 'Phân công kiểm tra thiết bị cụm kho 1 (Vị trí tĩnh/biên độ hẹp)',
    zoneMeterSummary: 'Cụm thiết bị: 8 công tơ',
  },
];

/**
 * Adapter function to safely resolve employees assigned to a given zone.
 * Currently returns isolated demo records with explicit isDemo=true flag.
 * Ready to consume live authoritative API data when backend endpoints are established.
 */
export function getEmployeesForZone(
  zoneId: string,
  employees: MapV2Employee[] = DEMO_MAP_V2_EMPLOYEES
): MapV2Employee[] {
  if (!zoneId) return [];
  return employees.filter((emp) => emp.zoneId === zoneId);
}

export function getAvatarInitials(fullName: string): string {
  if (!fullName) return 'NV';
  const parts = fullName.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 3).toUpperCase();
  const last = parts[parts.length - 1];
  return last.toUpperCase();
}

/**
 * Builds live standing zone assignees from backend OperationalZoneOut records.
 * Rules:
 * - Positioned at zone operator anchor (stationary).
 * - isDemo = false.
 * - Role is 'Người phụ trách phân khu'.
 * - NEVER claims 'Đang trực' or GPS position.
 * - Zone meter summary is explicitly labeled as zone progress, not personal workload.
 */
export function buildLiveZoneEmployees(
  zones: Array<{
    id: string;
    code?: string;
    name: string;
    total_meters: number;
    confirmed_count?: number;
    assigned_user?: {
      id: string;
      employee_code: string;
      full_name: string;
      role: string;
      is_active: boolean;
    } | null;
  }>,
  presentationZoneMapping?: Record<string, string>
): MapV2Employee[] {
  const result: MapV2Employee[] = [];
  const defaultMapping: Record<string, string> = {
    'zone-berth': 'ZONE_QUAY',
    'zone-container': 'ZONE_CONTAINER',
    'zone-warehouse': 'ZONE_GENERAL',
    'zone-technical': 'ZONE_ADMIN',
  };

  const reverseMap = presentationZoneMapping || defaultMapping;

  zones.forEach((z) => {
    if (!z.assigned_user) return;
    const user = z.assigned_user;
    const presZoneId = reverseMap[z.id] || z.id;

    result.push({
      id: user.id,
      code: user.employee_code,
      name: user.full_name,
      zoneId: presZoneId,
      zoneLabel: z.name,
      roleTitle: 'Người phụ trách phân khu',
      dutyStatus: 'assigned',
      dutyLabel: 'Phụ trách phân khu (Cố định)',
      isDemo: false,
      isStationary: true,
      avatarInitials: getAvatarInitials(user.full_name),
      shiftNotes: 'Phân công thường trực theo dõi khu vực',
      zoneMeterSummary: `Tiến độ khu vực: ${z.confirmed_count ?? 0}/${z.total_meters}`,
    });
  });

  return result;
}

/**
 * Returns a truthful assignment state descriptor for an employee marker.
 */
export function formatEmployeeTooltip(emp: MapV2Employee): {
  title: string;
  zone: string;
  role: string;
  duty: string;
  progress?: string;
  isDemo: boolean;
  disclosure: string;
} {
  return {
    title: `${emp.code} — ${emp.name}`,
    zone: emp.zoneLabel,
    role: emp.roleTitle,
    duty: emp.dutyLabel,
    progress: emp.zoneMeterSummary,
    isDemo: emp.isDemo,
    disclosure: emp.isDemo ? MAP_V2_EMPLOYEE_DISCLOSURE_TEXT : MAP_V2_LIVE_STAFF_DISCLOSURE_TEXT,
  };
}
