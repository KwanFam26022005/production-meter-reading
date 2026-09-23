export interface MapV2ImageMeta {
  file_name: string;
  width: number;
  height: number;
  coordinate_system: string;
  origin: string;
  x_direction: string;
  y_direction: string;
  notes?: string;
}

export interface MapV2PolygonStyle {
  fill: string;
  stroke: string;
  fill_opacity: number;
  stroke_width: number;
}

export interface MapV2Polygon {
  id: string;
  label: string;
  category: 'operational_zone' | 'warehouse' | 'administration' | string;
  parent_id: string | null;
  vertices: [number, number][];
  normalized_vertices: [number, number][];
  edges: [number, number][];
  style: MapV2PolygonStyle;
}

export interface MapV2PolylineStyle {
  stroke: string;
  stroke_width: number;
  dash?: number[];
}

export interface MapV2Polyline {
  id: string;
  label: string;
  category: 'boundary' | 'zone_separator' | 'road_centerline' | string;
  closed: boolean;
  vertices: [number, number][];
  normalized_vertices: [number, number][];
  style: MapV2PolylineStyle;
}

export interface MapV2Marker {
  id: string;
  label: string;
  point: [number, number];
  normalized_point: [number, number];
  category: 'gate' | string;
  style?: Record<string, unknown> | null;
}

export interface MapV2Manifest {
  schema: string;
  title: string;
  image: MapV2ImageMeta;
  references?: string[];
  status?: string;
  accuracy_note?: string;
  geometry_rules?: Record<string, unknown>;
  polygons: MapV2Polygon[];
  polylines: MapV2Polyline[];
  markers: MapV2Marker[];
  uncertain_or_unlabeled?: string[];
}

import type { MapMeterOut, OperationalZoneOut } from '../../types';

export interface MapV2LayerVisibility {
  baseMap: boolean;
  zones: boolean;
  buildings: boolean;
  roadsAndBoundaries: boolean;
  gates: boolean;
  anchors?: boolean;
  employees?: boolean;       // Live standing assignees
  meters?: boolean;          // Live meters with valid coordinates
  exceptionsOnly?: boolean;  // Highlight exception states
  demoEmployees?: boolean;   // Demo animated simulation layer
  powerNetwork?: boolean;    // Simulated electrical network
  waterNetwork?: boolean;    // Simulated water network
}

export type ZoneOperationalStatus = 'NORMAL' | 'REVIEW' | 'OVERDUE' | 'NOT_DUE' | 'NO_DATA';

export interface ZoneStatusMetrics {
  status: ZoneOperationalStatus;
  statusLabel: string;
  confirmedCount: number;
  totalMeters: number;
  reviewCount: number;
  overdueCount: number;
  dueCount: number;
  pendingCount: number;
  completionPercent?: number;
  isUpcomingRound?: boolean;
  hasNoMeters?: boolean;
}

export type MapV2SelectedEntity = 
  | { type: 'polygon'; data: MapV2Polygon }
  | { type: 'polyline'; data: MapV2Polyline }
  | { type: 'marker'; data: MapV2Marker }
  | { type: 'employee'; data: any }
  | { type: 'meter'; data: MapMeterOut }
  | { type: 'zone_operational'; data: { zone: OperationalZoneOut; anchor?: MapV2ZoneAnchor; polygon?: MapV2Polygon } }
  | null;

export type MapV2ViewMode = 'contain' | 'width';

export type MapV2InteractionMode = 'operational' | 'technical';

export type MapV2ToneMode = 'technical' | 'neon';

export interface MapV2ZoneAnchor {
  zoneId: string;
  label: string;
  category: 'operational_zone' | 'warehouse' | 'administration' | string;
  point: [number, number];
  iconType: 'quay' | 'yard' | 'container' | 'warehouse' | 'admin';
  code: string;
  description: string;
}

export type MapV2CameraState = 'AUTO_FIT' | 'MANUAL_VIEW';

export type MapV2ToolbarPresentation = 'wide' | 'compact';

