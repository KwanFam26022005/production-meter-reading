import { AdminDashboardExceptionItem } from '../../types';

export type MeterSemanticState =
  | 'CONFIRMED'
  | 'PENDING'
  | 'DUE'
  | 'OVERDUE'
  | 'REVIEW'
  | 'INACTIVE';

export type OperationalLayerType =
  | 'STATUS'
  | 'PROGRESS'
  | 'OWNERSHIP'
  | 'EXCEPTIONS'
  | 'WORKLOAD';

export interface NormalizedPoint {
  x: number; // 0.0 - 1.0
  y: number; // 0.0 - 1.0
}

export interface ZoneMetrics {
  totalMeters: number;
  confirmedCount: number;
  pendingCount: number;
  dueCount: number;
  overdueCount: number;
  reviewCount: number;
  inactiveCount: number;
  completionPercent: number;
}

export interface OperationalZoneConfig {
  id: string;
  code: string;
  name: string;
  shortName: string;
  description: string;
  polygon: NormalizedPoint[];
  labelPosition: NormalizedPoint;
  primaryColor: string;
  defaultAssignedUser?: {
    id: string;
    fullName: string;
    employeeCode: string;
    role: string;
  };
}

export interface MapMeterItem {
  id: string;
  meterCode: string;
  name: string;
  location: string;
  meterType: string;
  isActive: boolean;
  zoneId: string;
  zoneCode: string;
  zoneName: string;
  coordinates: NormalizedPoint;
  semanticState: MeterSemanticState;
  stateLabel: string;
  latestReading?: {
    readingId?: string;
    readingValue?: string;
    status?: string;
    ocrReading?: string;
    confidence?: number;
    serverTimestamp?: string;
    recordedBy?: string;
    confirmationSource?: string;
    roundTime?: string;
  };
  exceptionDetail?: AdminDashboardExceptionItem;
}

export interface MapOperationalZone extends OperationalZoneConfig {
  metrics: ZoneMetrics;
  assignedUser?: {
    id: string;
    fullName: string;
    employeeCode: string;
    role: string;
  };
  meters: MapMeterItem[];
}

export interface MapFilterOptions {
  searchQuery: string;
  zoneId: string; // 'ALL' | zoneId
  status: string; // 'ALL' | MeterSemanticState
  meterType: string; // 'ALL' | 'LCD' | 'MECHANICAL'
  exceptionsOnly: boolean;
  selectedRoundId?: string; // specific round or undefined for current/day summary
}

export interface MapSelectionState {
  selectedZoneId: string | null;
  selectedMeterId: string | null;
  hoveredZoneId: string | null;
  hoveredMeterId: string | null;
  drawerType: 'none' | 'zone' | 'meter' | 'reassign';
}

export interface MapViewportState {
  zoom: number;
  panX: number;
  panY: number;
}
