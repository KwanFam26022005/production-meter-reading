/**
 * Asset Domain Foundation Types (Phase V16C)
 * Strongly-typed contracts for Port Assets, Meter-Asset Relations, and Utility Topology.
 */

export type AssetType =
  | 'SUBSTATION'
  | 'TRANSFORMER'
  | 'FEEDER'
  | 'SWITCHBOARD'
  | 'QUAY_CRANE'
  | 'RTG'
  | 'VEHICLE'
  | 'PUMP'
  | 'COMPRESSOR'
  | 'MACHINE'
  | 'WAREHOUSE'
  | 'WORKSHOP'
  | 'OFFICE'
  | 'FACILITY'
  | 'BUILDING'
  | 'BERTH_INFRASTRUCTURE'
  | 'GATE_EQUIPMENT'
  | 'FIRE_PUMP_SYSTEM'
  | 'COMPRESSOR_SYSTEM'
  | 'WATER_POINT'
  | 'FIRE_WATER_POINT'
  | 'SHORE_POWER_POINT'
  | 'OTHER';

export type AssetMobilityType = 'FIXED' | 'MOBILE';
export type AssetPositionSource = 'STATIC_MAP' | 'ASSIGNED' | 'LAST_KNOWN' | 'GPS' | 'UNKNOWN';
export type AssetLifecycleStatus = 'ACTIVE' | 'INACTIVE' | 'RETIRED';
export type AssetVerificationStatus = 'UNVERIFIED' | 'VERIFIED' | 'REJECTED';

export type EvidenceType =
  | 'FIELD_INSPECTION'
  | 'MENTOR_CONFIRMATION'
  | 'PORT_DOCUMENT'
  | 'EQUIPMENT_NAMEPLATE'
  | 'METER_PHOTO'
  | 'ELECTRICAL_DRAWING'
  | 'WATER_DRAWING'
  | 'SCADA_CONFIG'
  | 'OTHER';

export type ReadingMethod = 'MANUAL' | 'OCR' | 'PULSE' | 'MODBUS' | 'PLC' | 'SCADA' | 'UNKNOWN';
export type CommunicationProtocol = 'NONE' | 'PULSE' | 'RS485' | 'MODBUS_RTU' | 'MODBUS_TCP' | 'PLC' | 'OTHER' | 'UNKNOWN';

export type MeterAssetRelationType = 'INSTALLED_AT' | 'MEASURES';
export type UtilityType = 'ELECTRICITY' | 'WATER' | 'OTHER';
export type AssetConnectionType = 'SUPPLIES' | 'CONNECTED_TO';

export interface AssetSummary {
  id: string;
  code: string;
  name: string;
  asset_type: AssetType;
  lifecycle_status: AssetLifecycleStatus;
  verification_status: AssetVerificationStatus;
}

export interface Asset {
  id: string;
  code: string;
  name: string;
  asset_type: AssetType;
  parent_asset_id: string | null;
  parent_asset?: AssetSummary | null;
  zone_id: string | null;
  zone_code?: string | null;
  zone_name?: string | null;
  mobility_type: AssetMobilityType;
  position_source: AssetPositionSource;
  map_x: number | null;
  map_y: number | null;
  lifecycle_status: AssetLifecycleStatus;
  verification_status: AssetVerificationStatus;
  position_verification_status: 'UNVERIFIED' | 'VERIFIED';
  source: 'DISCOVERY_PROPOSAL' | 'MANUAL_ENTRY' | 'IMPORT';
  metadata_json?: string | null;
  child_count: number;
  attached_meters_count: number;
  created_at: string;
  updated_at: string;
  created_by?: string | null;
  updated_by?: string | null;
}

export interface AssetListResponse {
  total: number;
  assets: Asset[];
}

export interface MeterAssetRelation {
  id: string;
  meter_id: string;
  meter_code: string;
  meter_name: string;
  asset_id: string;
  asset_code: string;
  asset_name: string;
  relation_type: MeterAssetRelationType;
  mount_point?: string | null;
  is_primary: boolean;
  verification_status: AssetVerificationStatus;
  confidence?: 'LOW' | 'MEDIUM' | 'HIGH';
  source?: string | null;
  notes?: string | null;
  valid_from: string;
  valid_to: string | null;
  created_at: string;
  created_by?: string | null;
}

export interface MeterAssetRelationListResponse {
  total: number;
  relations: MeterAssetRelation[];
}

export interface AssetConnection {
  id: string;
  source_asset_id: string;
  source_asset_code: string;
  source_asset_name: string;
  target_asset_id: string;
  target_asset_code: string;
  target_asset_name: string;
  utility_type: UtilityType;
  connection_type: AssetConnectionType;
  verification_status: AssetVerificationStatus;
  confidence?: 'LOW' | 'MEDIUM' | 'HIGH';
  source?: string | null;
  valid_from: string;
  valid_to: string | null;
  metadata_json?: string | null;
  created_at: string;
  created_by?: string | null;
}

export interface AssetConnectionListResponse {
  total: number;
  connections: AssetConnection[];
}

export interface TopologyTraceResponse {
  root_asset_id: string;
  direction: 'downstream' | 'upstream' | 'connected' | 'both';
  utility_type?: UtilityType | null;
  include_unverified: boolean;
  nodes: Asset[];
  edges: AssetConnection[];
}

export interface VerificationEvidence {
  id: string;
  entity_type: string;
  entity_id: string;
  evidence_type: EvidenceType;
  evidence_reference: string;
  notes?: string | null;
  verified_by?: string | null;
  verified_by_name?: string | null;
  verified_at: string;
  created_at: string;
}

export interface AssetVerifyRequest {
  evidence_type: EvidenceType;
  evidence_reference: string;
  notes?: string;
}

export interface AssetRejectRequest {
  reason: string;
  notes?: string;
}

export interface AssetVerifyPositionRequest {
  map_x: number;
  map_y: number;
  evidence_type: EvidenceType;
  evidence_reference: string;
  notes?: string;
}

export interface RelationVerifyRequest {
  evidence_type: EvidenceType;
  evidence_reference: string;
  is_primary?: boolean;
  mount_point?: string;
  notes?: string;
}

export interface RelationRejectRequest {
  reason?: string;
  notes?: string;
}

export interface ConnectionVerifyRequest {
  evidence_type: EvidenceType;
  evidence_reference: string;
  notes?: string;
}

export interface ConnectionRejectRequest {
  reason?: string;
  notes?: string;
}

export interface CandidateImportResponse {
  imported_assets: number;
  updated_assets: number;
  imported_relations: number;
  updated_relations: number;
  total_candidates: number;
  message: string;
}

export interface AssetVerificationSummary {
  assetCandidates: number;
  verifiedAssets: number;
  unverifiedAssets: number;
  rejectedAssets: number;
  meterRelations: number;
  verifiedMeterRelations: number;
  unverifiedMeterRelations: number;
  topologyConnections: number;
  verifiedTopologyConnections: number;
  spatialReviewMeters: string[];
  missingInformationCounts: {
    missing_asset_position: number;
    missing_installed_at: number;
    missing_measures: number;
    missing_reading_method: number;
    missing_utility_type: number;
  };
}

export interface MeterReviewMatrixItem {
  meter_code: string;
  name: string;
  utility: string;
  proposed_measures?: string | null;
  measures_confidence?: string | null;
  measures_verification: string;
  proposed_installed_at?: string | null;
  installed_at_verification: string;
  asset_position_known: boolean;
  reading_method: string;
  missing_info: string[];
  is_spatial_review_required: boolean;
}

export interface AssetNetworkStats {
  total_nodes: number;
  total_edges: number;
  verified_nodes: number;
  verified_edges: number;
  unverified_nodes: number;
  unverified_edges: number;
}

export interface AssetNetworkResponse {
  utility_type?: UtilityType | 'ALL' | null;
  focus_asset_id?: string | null;
  verified_only: boolean;
  nodes: Asset[];
  edges: AssetConnection[];
  stats: AssetNetworkStats;
}

export interface AssetAttachedMeterContext {
  relation_id: string;
  relation_type: MeterAssetRelationType;
  is_primary: boolean;
  verification_status: AssetVerificationStatus;
  meter_id: string;
  meter_code: string;
  meter_name: string;
  meter_type?: string | null;
  utility_type?: string | null;
  lifecycle_status: string;
  latest_reading_value?: string | null;
  latest_reading_status?: string | null;
  latest_reading_time?: string | null;
}

export interface AssetOperationalContextResponse {
  asset: Asset;
  meters: AssetAttachedMeterContext[];
  upstream_connections: AssetConnection[];
  downstream_connections: AssetConnection[];
  presentation_zone_id?: string | null;
  presentation_zone_name?: string | null;
  spatial_status: 'VERIFIED' | 'UNVERIFIED' | 'MISSING_COORDINATES';
}


