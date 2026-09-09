import { useCallback, useEffect, useMemo, useState } from 'react';
import { AdminDashboardResponse, AdminMeterListResponse } from '../../../types';
import { getAdminDashboard, getAdminMeters } from '../../../services/api';
import {
  METER_COORDINATES_ADAPTER,
  OPERATIONAL_ZONES_CONFIG,
} from '../config/portMapConfig';
import {
  MapMeterItem,
  MapOperationalZone,
  ZoneMetrics,
} from '../types';
import { deriveMeterSemanticState, getSemanticStateLabel } from '../utils/mapStatus';

export function useMapOperations(initialDate?: string) {
  const getTodayLocal = () => {
    return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' }).format(new Date());
  };

  const [selectedDate, setSelectedDate] = useState<string>(() => {
    try {
      return sessionStorage.getItem('admin_map_date') || initialDate || getTodayLocal();
    } catch {
      return initialDate || getTodayLocal();
    }
  });

  const [dashboardData, setDashboardData] = useState<AdminDashboardResponse | null>(null);
  const [metersData, setMetersData] = useState<AdminMeterListResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    try {
      sessionStorage.setItem('admin_map_date', selectedDate);
    } catch {}
  }, [selectedDate]);

  const loadData = useCallback(async (dateStr: string) => {
    setLoading(true);
    setError(null);
    try {
      const [dashRes, metersRes] = await Promise.all([
        getAdminDashboard(dateStr),
        getAdminMeters(),
      ]);
      setDashboardData(dashRes);
      setMetersData(metersRes);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Không thể tải dữ liệu bản đồ tác nghiệp.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData(selectedDate);
  }, [selectedDate, loadData]);

  // Derive consolidated Map Meters
  const mapMeters = useMemo<MapMeterItem[]>(() => {
    if (!metersData?.meters) return [];

    const exceptions = dashboardData?.exceptions || [];
    const currentRoundStatus = dashboardData?.kpis?.current_round_status;

    return metersData.meters.map((rawMeter) => {
      const adapter = METER_COORDINATES_ADAPTER[rawMeter.meter_code] || {
        meterCode: rawMeter.meter_code,
        zoneId: 'zone-technical',
        coordinates: { x: 0.5, y: 0.5 },
      };

      const zoneCfg = OPERATIONAL_ZONES_CONFIG.find((z) => z.id === adapter.zoneId);
      const { state, exception } = deriveMeterSemanticState(
        rawMeter,
        exceptions,
        currentRoundStatus
      );

      const item: MapMeterItem = {
        id: rawMeter.id,
        meterCode: rawMeter.meter_code,
        name: rawMeter.name,
        location: rawMeter.location || 'Chưa xác định',
        meterType: rawMeter.meter_type,
        isActive: rawMeter.is_active,
        zoneId: adapter.zoneId,
        zoneCode: zoneCfg?.code || 'ZONE-GEN',
        zoneName: zoneCfg?.name || 'Khu vực tác nghiệp',
        coordinates: adapter.coordinates,
        semanticState: state,
        stateLabel: getSemanticStateLabel(state),
        latestReading: rawMeter.latest_reading
          ? {
              readingId: exception?.reading_id || undefined,
              readingValue: rawMeter.latest_reading,
              status: exception?.exception_state || (rawMeter.has_readings ? 'CONFIRMED' : undefined),
              serverTimestamp: rawMeter.latest_reading_time || undefined,
              recordedBy: exception?.recorded_by || undefined,
              roundTime: exception?.scheduled_time || undefined,
            }
          : undefined,
        exceptionDetail: exception,
      };

      return item;
    });
  }, [metersData, dashboardData]);

  // Derive Map Operational Zones with aggregated metrics
  const mapZones = useMemo<MapOperationalZone[]>(() => {
    return OPERATIONAL_ZONES_CONFIG.map((zoneCfg) => {
      const zoneMeters = mapMeters.filter((m) => m.zoneId === zoneCfg.id);

      let confirmed = 0;
      let pending = 0;
      let due = 0;
      let overdue = 0;
      let review = 0;
      let inactive = 0;

      for (const m of zoneMeters) {
        if (!m.isActive) {
          inactive++;
          continue;
        }
        switch (m.semanticState) {
          case 'CONFIRMED':
            confirmed++;
            break;
          case 'PENDING':
            pending++;
            break;
          case 'DUE':
            due++;
            break;
          case 'OVERDUE':
            overdue++;
            break;
          case 'REVIEW':
            review++;
            break;
        }
      }

      const activeTotal = zoneMeters.length - inactive;
      const completionPercent =
        activeTotal > 0 ? Math.round((confirmed / activeTotal) * 100) : 0;

      const metrics: ZoneMetrics = {
        totalMeters: zoneMeters.length,
        confirmedCount: confirmed,
        pendingCount: pending,
        dueCount: due,
        overdueCount: overdue,
        reviewCount: review,
        inactiveCount: inactive,
        completionPercent,
      };

      return {
        ...zoneCfg,
        metrics,
        assignedUser: zoneCfg.defaultAssignedUser,
        meters: zoneMeters,
      };
    });
  }, [mapMeters]);

  // Overall KPIs
  const overallKpis = useMemo(() => {
    const total = mapMeters.length;
    const confirmed = mapMeters.filter((m) => m.semanticState === 'CONFIRMED').length;
    const review = mapMeters.filter((m) => m.semanticState === 'REVIEW').length;
    const overdue = mapMeters.filter((m) => m.semanticState === 'OVERDUE').length;
    const due = mapMeters.filter((m) => m.semanticState === 'DUE').length;
    const pending = mapMeters.filter((m) => m.semanticState === 'PENDING').length;
    const inactive = mapMeters.filter((m) => !m.isActive).length;
    const activeTotal = total - inactive;
    const percent = activeTotal > 0 ? Math.round((confirmed / activeTotal) * 100) : 0;

    return {
      total,
      confirmed,
      review,
      overdue,
      due,
      pending,
      inactive,
      percent,
      currentRoundTime: dashboardData?.kpis?.current_round_time,
      currentRoundStatus: dashboardData?.kpis?.current_round_status,
      exceptionsCount: (dashboardData?.exceptions || []).length,
    };
  }, [mapMeters, dashboardData]);

  return {
    selectedDate,
    setSelectedDate,
    dashboardData,
    metersData,
    mapMeters,
    mapZones,
    overallKpis,
    loading,
    error,
    refresh: () => loadData(selectedDate),
  };
}
