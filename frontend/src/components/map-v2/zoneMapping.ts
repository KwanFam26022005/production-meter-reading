/**
 * Saigon Port Map V2 — Zone Mapping & Status Model
 *
 * Implements architectural resolution of Section 9, 10, 11:
 * - Stable ID mappings between Presentation Zones (Map V2 1536x1024) and Business Zones (SQLite).
 * - Multi-state operational status abstraction: NORMAL, REVIEW, OVERDUE, NOT_DUE, NO_DATA.
 * - Strict data truthfulness: NO_DATA never renders as 0%; NOT_DUE never renders as overdue.
 * - Safe progress labels explicitly contextualized to single reading rounds.
 */

import type { OperationalZoneOut } from '../../types';
import type { ZoneStatusMetrics } from './types';
import type { ActiveMapZoneGeometry } from '../../features/map-operations/types/activeMapConfiguration';

/**
 * Deterministic mapping table for Map V2's 7 canonical presentation zones
 * to SQLite operational business zones when DB dynamic records are unseeded.
 */
export const CANONICAL_MAP_V2_ZONE_MAPPING: Record<string, string> = {
  ZONE_QUAY: 'zone-berth',
  ZONE_CONTAINER: 'zone-container',
  ZONE_GENERAL: 'zone-warehouse',
  BLDG_KHO_1: 'zone-warehouse',
  BLDG_KHO_2: 'zone-warehouse',
  BLDG_KHO_4: 'zone-warehouse',
  ZONE_ADMIN: 'zone-technical',
};

/**
 * Resolves a presentation zone ID to an operational business zone ID.
 * Priority:
 * 1. Authoritative MapVersionZone DB configuration if available.
 * 2. Deterministic canonical mapping dictionary.
 * 3. Identity match if already matching a known business zone.
 */
export function resolvePresentationToBusinessZone(
  presentationId: string,
  activeMapZones?: ActiveMapZoneGeometry[]
): string {
  if (activeMapZones && activeMapZones.length > 0) {
    const match = activeMapZones.find(
      (z) => z.presentationId === presentationId || z.zoneId === presentationId
    );
    if (match?.businessZoneId) {
      return match.businessZoneId;
    }
  }

  if (CANONICAL_MAP_V2_ZONE_MAPPING[presentationId]) {
    return CANONICAL_MAP_V2_ZONE_MAPPING[presentationId];
  }

  return presentationId;
}

/**
 * Computes the operational status of a zone based on live round metrics.
 *
 * Rules:
 * - NO_DATA: when zone has 0 meters or round is uninitialized. Never renders as 0%.
 * - NOT_DUE: when round is upcoming/in the future. Never renders as overdue.
 * - OVERDUE: when target round is past and meters remain unread.
 * - REVIEW: when meters have OCR or quality flags requiring attention.
 * - NORMAL: when all due meters are confirmed.
 */
export function computeZoneOperationalStatus(
  zone?: OperationalZoneOut | null,
  roundStatus?: string | null
): ZoneStatusMetrics {
  if (!zone || zone.total_meters === 0) {
    return {
      status: 'NO_DATA',
      statusLabel: 'Chưa mở lượt',
      confirmedCount: 0,
      totalMeters: 0,
      reviewCount: 0,
      overdueCount: 0,
      dueCount: 0,
      pendingCount: 0,
      hasNoMeters: true,
    };
  }

  const isUpcoming = roundStatus === 'UPCOMING';
  if (isUpcoming) {
    return {
      status: 'NOT_DUE',
      statusLabel: 'Lịch dự kiến',
      confirmedCount: zone.confirmed_count ?? 0,
      totalMeters: zone.total_meters,
      reviewCount: zone.review_count ?? 0,
      overdueCount: 0,
      dueCount: zone.due_count ?? 0,
      pendingCount: zone.pending_count ?? zone.total_meters,
      isUpcomingRound: true,
    };
  }

  const overdue = zone.overdue_count ?? 0;
  const review = zone.review_count ?? 0;
  const confirmed = zone.confirmed_count ?? 0;
  const total = zone.total_meters;

  if (overdue > 0) {
    return {
      status: 'OVERDUE',
      statusLabel: `🔴 ${overdue} trễ hạn`,
      confirmedCount: confirmed,
      totalMeters: total,
      reviewCount: review,
      overdueCount: overdue,
      dueCount: zone.due_count ?? 0,
      pendingCount: zone.pending_count ?? 0,
      completionPercent: zone.completion_percent,
    };
  }

  if (review > 0) {
    return {
      status: 'REVIEW',
      statusLabel: `⚠️ ${review} cần kiểm tra`,
      confirmedCount: confirmed,
      totalMeters: total,
      reviewCount: review,
      overdueCount: 0,
      dueCount: zone.due_count ?? 0,
      pendingCount: zone.pending_count ?? 0,
      completionPercent: zone.completion_percent,
    };
  }

  return {
    status: 'NORMAL',
    statusLabel: `Đã xác nhận: ${confirmed}/${total}`,
    confirmedCount: confirmed,
    totalMeters: total,
    reviewCount: 0,
    overdueCount: 0,
    dueCount: zone.due_count ?? 0,
    pendingCount: zone.pending_count ?? 0,
    completionPercent: zone.completion_percent,
  };
}

/**
 * Returns safe, truthful wording for single-round zone progress.
 * Explicitly mentions the round denominator to avoid confusing single-round
 * status with cumulative all-day port quotas.
 */
export function formatZoneProgressText(metrics: ZoneStatusMetrics): string {
  if (metrics.status === 'NO_DATA') {
    return 'Chưa mở lượt đọc';
  }
  if (metrics.status === 'NOT_DUE') {
    return 'Chưa đến lượt đọc';
  }
  return `Đã ghi ${metrics.confirmedCount} / ${metrics.totalMeters} công tơ trong lượt`;
}
