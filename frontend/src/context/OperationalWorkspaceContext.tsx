import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import type { AdminTab } from '../components/admin/AdminShell';

export interface FocusedEntity {
  type: 'asset' | 'meter';
  id: string;
  code: string;
  name?: string;
  zoneId?: string;
  coordinates?: [number, number]; // [map_x, map_y]
}

export type DeviceSegment = 'ALL' | 'ASSETS' | 'METERS';

export interface OperationalWorkspaceContextType {
  activeTab: AdminTab;
  setActiveTab: (tab: AdminTab) => void;
  focusedEntity: FocusedEntity | null;
  setFocusedEntity: (entity: FocusedEntity | null) => void;
  deviceSegment: DeviceSegment;
  setDeviceSegment: (segment: DeviceSegment) => void;
  isShiftPanelOpen: boolean;
  setIsShiftPanelOpen: (open: boolean | ((prev: boolean) => boolean)) => void;
  selectedDate: string;
  setSelectedDate: (date: string) => void;
  selectedRoundId: string | null;
  setSelectedRoundId: (roundId: string | null) => void;
  utilityFilter: 'ALL' | 'ELECTRICITY' | 'WATER';
  setUtilityFilter: (u: 'ALL' | 'ELECTRICITY' | 'WATER') => void;
  inspectingReadingId: string | null;
  setInspectingReadingId: (readingId: string | null) => void;
  locateOnMap: (entity: FocusedEntity) => void;
  openAssetDetails: (assetId: string, assetCode?: string) => void;
  openMeterDetails: (meterId: string, meterCode?: string) => void;
  openVerification: (assetId?: string) => void;
  openReadingInspection: (readingId: string) => void;
}

const OperationalWorkspaceContext = createContext<OperationalWorkspaceContextType | null>(null);

export const useOperationalWorkspace = (): OperationalWorkspaceContextType => {
  const context = useContext(OperationalWorkspaceContext);
  if (!context) {
    throw new Error('useOperationalWorkspace must be used within an OperationalWorkspaceProvider');
  }
  return context;
};

interface OperationalWorkspaceProviderProps {
  children: ReactNode;
  initialTab?: AdminTab;
  onTabChange?: (tab: AdminTab) => void;
}

export const OperationalWorkspaceProvider: React.FC<OperationalWorkspaceProviderProps> = ({
  children,
  initialTab = 'dashboard',
  onTabChange,
}) => {
  const [activeTab, setActiveTabState] = useState<AdminTab>(initialTab);
  const [focusedEntity, setFocusedEntity] = useState<FocusedEntity | null>(null);
  const [deviceSegment, setDeviceSegment] = useState<DeviceSegment>('ALL');
  const [isShiftPanelOpen, setIsShiftPanelOpen] = useState<boolean>(false);
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' }).format(new Date());
  });
  const [selectedRoundId, setSelectedRoundId] = useState<string | null>(null);
  const [utilityFilter, setUtilityFilter] = useState<'ALL' | 'ELECTRICITY' | 'WATER'>('ALL');
  const [inspectingReadingId, setInspectingReadingId] = useState<string | null>(null);

  const setActiveTab = useCallback((tab: AdminTab) => {
    setActiveTabState(tab);
    if (onTabChange) {
      onTabChange(tab);
    }
  }, [onTabChange]);

  const locateOnMap = useCallback((entity: FocusedEntity) => {
    setFocusedEntity(entity);
    setInspectingReadingId(null);
    setActiveTab('dashboard');
  }, [setActiveTab]);

  const openAssetDetails = useCallback((assetId: string, assetCode?: string) => {
    setFocusedEntity({
      type: 'asset',
      id: assetId,
      code: assetCode || assetId,
    });
    setDeviceSegment('ASSETS');
    setInspectingReadingId(null);
    setActiveTab('assets');
  }, [setActiveTab]);

  const openMeterDetails = useCallback((meterId: string, meterCode?: string) => {
    setFocusedEntity({
      type: 'meter',
      id: meterId,
      code: meterCode || meterId,
    });
    setDeviceSegment('METERS');
    setInspectingReadingId(null);
    setActiveTab('assets');
  }, [setActiveTab]);

  const openVerification = useCallback((assetId?: string) => {
    if (assetId) {
      setFocusedEntity({
        type: 'asset',
        id: assetId,
        code: assetId,
      });
    }
    setInspectingReadingId(null);
    setActiveTab('verification');
  }, [setActiveTab]);

  const openReadingInspection = useCallback((readingId: string) => {
    setInspectingReadingId(readingId);
  }, []);

  const value: OperationalWorkspaceContextType = {
    activeTab,
    setActiveTab,
    focusedEntity,
    setFocusedEntity,
    deviceSegment,
    setDeviceSegment,
    isShiftPanelOpen,
    setIsShiftPanelOpen,
    selectedDate,
    setSelectedDate,
    selectedRoundId,
    setSelectedRoundId,
    utilityFilter,
    setUtilityFilter,
    inspectingReadingId,
    setInspectingReadingId,
    locateOnMap,
    openAssetDetails,
    openMeterDetails,
    openVerification,
    openReadingInspection,
  };

  return (
    <OperationalWorkspaceContext.Provider value={value}>
      {children}
    </OperationalWorkspaceContext.Provider>
  );
};
