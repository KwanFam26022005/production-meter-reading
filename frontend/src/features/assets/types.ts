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
  | 'WATER_POINT'
  | 'FIRE_WATER_POINT'
  | 'SHORE_POWER_POINT'
  | 'OTHER';

export type AssetMobilityType = 'FIXED' | 'MOBILE';
export type AssetPositionSource = 'STATIC_MAP' | 'ASSIGNED' | 'LAST_KNOWN' | 'GPS' | 'UNKNOWN';
export type AssetLifecycleStatus = 'ACTIVE' | 'INACTIVE' | 'RETIRED';
export type AssetVerificationStatus = 'UNVERIFIED' | 'VERIFIED' | 'REJECTED';

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
