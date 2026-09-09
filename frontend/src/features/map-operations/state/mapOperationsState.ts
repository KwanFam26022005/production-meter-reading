/**
 * Map Operations Shared State Types & Helpers
 */

export type OperationalProductMode = 'operational' | 'asset' | '3d';

export interface OperationalTimelineRound {
  roundId: string;
  scheduledTime: string; // e.g. "06:00", "12:00"
  scheduledLocal: string;
  timingState: 'CURRENT' | 'PAST' | 'UPCOMING';
  totalMeters: number;
  confirmed: number;
  review: number;
  pending: number;
  completionPercent: number;
}
