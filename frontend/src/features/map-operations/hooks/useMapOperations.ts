import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AdminDashboardResponse,
  AdminMeterListResponse,
  MapOverviewResponse,
  User,
} from '../../../types';
import {
  getAdminDashboard,
  getAdminMeters,
  getMapOperators,
  getMapOverview,
  reassignZoneOperator,
} from '../../../services/api';
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

  const [overviewData, setOverviewData] = useState<MapOverviewResponse | null>(null);
  const [dashboardData, setDashboardData] = useState<AdminDashboardResponse | null>(null);
  const [metersData, setMetersData] = useState<AdminMeterListResponse | null>(null);
  const [availableOperators, setAvailableOperators] = useState<User[]>([]);
  const [selectedRoundId, setSelectedRoundId] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    try {
      sessionStorage.setItem('admin_map_date', selectedDate);
    } catch {}
  }, [selectedDate]);

  const loadData = useCallback(async (dateStr: string, roundId?: string | null) => {
    setLoading(true);
    setError(null);
    try {
      const [overviewRes, dashRes, operatorsRes] = await Promise.all([
        getMapOverview(dateStr, roundId || undefined).catch((err) => {
          console.warn('Map overview API unavailable, using fallback', err);
          return null;
        }),
        getAdminDashboard(dateStr),
        getMapOperators().catch(() => []),
      ]);

      setOverviewData(overviewRes);
      setDashboardData(dashRes);
      setAvailableOperators(operatorsRes);

      if (overviewRes?.selected_round_id) {
        setSelectedRoundId(overviewRes.selected_round_id);
      } else if (roundId) {
        setSelectedRoundId(roundId);
      }

      if (!overviewRes) {
        const metersRes = await getAdminMeters();
        setMetersData(metersRes);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Không thể tải dữ liệu bản đồ tác nghiệp.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData(selectedDate, null);
  }, [selectedDate, loadData]);

  const handleSelectRound = useCallback((roundId: string) => {
    setSelectedRoundId(roundId);
    loadData(selectedDate, roundId);
  }, [selectedDate, loadData]);


  // Derive consolidated Map Meters
  const mapMeters = useMemo<MapMeterItem[]>(() => {
    if (overviewData?.meters && overviewData.meters.length > 0) {
      return overviewData.meters.map((bm) => {
        const adapter = METER_COORDINATES_ADAPTER[bm.meter_code];
        const defaultCoord = adapter?.coordinates || { x: 0.5, y: 0.5 };
        const coordinates = {
          x: typeof bm.map_x === 'number' ? bm.map_x : defaultCoord.x,
          y: typeof bm.map_y === 'number' ? bm.map_y : defaultCoord.y,
        };
        const zoneCfg = OPERATIONAL_ZONES_CONFIG.find((z) => z.id === bm.zone_id) || OPERATIONAL_ZONES_CONFIG[0];
        const matchingExc = dashboardData?.exceptions.find(
          (e) => e.meter_id === bm.id || e.meter_code === bm.meter_code
        );

        return {
          id: bm.id,
          meterCode: bm.meter_code,
          name: bm.name,
          location: bm.location || 'Chưa xác định',
          meterType: bm.meter_type,
          isActive: bm.is_active,
          zoneId: bm.zone_id || zoneCfg.id,
          zoneCode: bm.zone_code || zoneCfg.code,
          zoneName: bm.zone_name || zoneCfg.name,
          coordinates,
          semanticState: bm.semantic_state,
          stateLabel: getSemanticStateLabel(bm.semantic_state),
          latestReading: bm.latest_reading_value
            ? {
                readingId: bm.reading_id || undefined,
                readingValue: bm.latest_reading_value,
                status: bm.semantic_state,
                serverTimestamp: bm.latest_reading_time || undefined,
                recordedBy: matchingExc?.recorded_by || undefined,
                roundTime: matchingExc?.scheduled_time || undefined,
              }
            : undefined,
          exceptionDetail: matchingExc,
        };
      });
    }

    // Fallback if overviewData not available
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

      return {
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
    });
  }, [overviewData, metersData, dashboardData]);

  // Derive Map Operational Zones with aggregated metrics
  const mapZones = useMemo<MapOperationalZone[]>(() => {
    return OPERATIONAL_ZONES_CONFIG.map((zoneCfg) => {
      const backendZone = overviewData?.zones.find(
        (bz) => bz.id === zoneCfg.id || bz.code === zoneCfg.code
      );
      const zoneMeters = mapMeters.filter((m) => m.zoneId === zoneCfg.id);

      let metrics: ZoneMetrics;
      if (backendZone && typeof backendZone.confirmed_count === 'number') {
        const inactive = zoneMeters.filter((m) => !m.isActive).length;
        metrics = {
          totalMeters: backendZone.total_meters,
          confirmedCount: backendZone.confirmed_count ?? 0,
          pendingCount: backendZone.pending_count ?? 0,
          dueCount: backendZone.due_count ?? 0,
          overdueCount: backendZone.overdue_count ?? 0,
          reviewCount: backendZone.review_count ?? 0,
          inactiveCount: inactive,
          completionPercent: backendZone.completion_percent ?? 0,
        };
      } else {
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

        metrics = {
          totalMeters: zoneMeters.length,
          confirmedCount: confirmed,
          pendingCount: pending,
          dueCount: due,
          overdueCount: overdue,
          reviewCount: review,
          inactiveCount: inactive,
          completionPercent,
        };
      }

      const assignedUser = backendZone?.assigned_user
        ? {
            id: backendZone.assigned_user.id,
            fullName: backendZone.assigned_user.full_name,
            employeeCode: backendZone.assigned_user.employee_code,
            role: backendZone.assigned_user.role,
          }
        : zoneCfg.defaultAssignedUser;

      return {
        ...zoneCfg,
        metrics,
        assignedUser,
        meters: zoneMeters,
      };
    });
  }, [mapMeters, overviewData]);

  // Overall KPIs
  const overallKpis = useMemo(() => {
    if (overviewData) {
      const inactive = mapMeters.filter((m) => !m.isActive).length;
      return {
        total: overviewData.total_meters,
        confirmed: overviewData.confirmed_count,
        review: overviewData.review_count,
        overdue: overviewData.overdue_count,
        due: overviewData.due_count,
        pending: overviewData.pending_count,
        inactive,
        percent: Math.round(overviewData.completion_percent),
        currentRoundTime: overviewData.current_round_time || dashboardData?.kpis?.current_round_time,
        currentRoundStatus: overviewData.current_round_status || dashboardData?.kpis?.current_round_status,
        exceptionsCount: overviewData.exceptions_count,
      };
    }

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
  }, [mapMeters, dashboardData, overviewData]);

  const handleReassignOperator = useCallback(
    async (zoneId: string, userId: string, note?: string) => {
      await reassignZoneOperator(zoneId, {
        user_id: userId,
        assignment_role: 'PRIMARY',
        note,
      });
      await loadData(selectedDate, selectedRoundId);
    },
    [loadData, selectedDate, selectedRoundId]
  );

  return {
    selectedDate,
    setSelectedDate,
    selectedRoundId,
    setSelectedRoundId: handleSelectRound,
    dashboardData,
    metersData,
    overviewData,
    availableOperators,
    mapMeters,
    mapZones,
    overallKpis,
    loading,
    error,
    refresh: () => loadData(selectedDate, selectedRoundId),
    reassignOperator: handleReassignOperator,
  };
}
