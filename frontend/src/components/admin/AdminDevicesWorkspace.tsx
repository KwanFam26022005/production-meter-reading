import React, { useState, useEffect } from 'react';
import { Boxes } from 'lucide-react';
import { AdminAssets } from './AdminAssets';
import { AdminMeters } from './AdminMeters';
import { useOperationalWorkspace } from '../../context/OperationalWorkspaceContext';

export interface AdminDevicesWorkspaceProps {
  onInspectReading?: (readingId: string) => void;
}

export const AdminDevicesWorkspace: React.FC<AdminDevicesWorkspaceProps> = ({ onInspectReading }) => {
  const { deviceSegment, setDeviceSegment, activeTab, setActiveTab } = useOperationalWorkspace();

  const [activeSegment, setActiveSegment] = useState<'assets' | 'meters'>(() => {
    if (activeTab === 'meters' || deviceSegment === 'METERS') {
      return 'meters';
    }
    return 'assets';
  });

  // Keep state synchronized with external navigation or context changes
  useEffect(() => {
    if (activeTab === 'meters' || deviceSegment === 'METERS') {
      setActiveSegment('meters');
    } else if (activeTab === 'assets' || deviceSegment === 'ASSETS') {
      setActiveSegment('assets');
    }
  }, [activeTab, deviceSegment]);

  const handleSelectSegment = (segment: 'assets' | 'meters') => {
    setActiveSegment(segment);
    if (segment === 'assets') {
      setDeviceSegment('ASSETS');
      setActiveTab('assets');
    } else {
      setDeviceSegment('METERS');
      setActiveTab('meters');
    }
  };

  return (
    <div className="sgp-devices-shell" data-testid="devices-workspace-shell">
      {/* 1. OPERATIONAL SUB-TAB NAVIGATION */}
      <header className="sgp-devices-header" role="region" aria-label="Thanh điều hướng Thiết bị">
        <div className="sgp-devices-header-title">
          <Boxes size={18} />
          <span>THIẾT BỊ</span>
        </div>

        <div className="sgp-devices-tab-switch" role="tablist" aria-label="Phân loại thiết bị">
          <button
            type="button"
            role="tab"
            id="tab-segment-assets"
            aria-selected={activeSegment === 'assets'}
            aria-controls="panel-segment-assets"
            className={`sgp-devices-tab-btn ${activeSegment === 'assets' ? 'active' : ''}`}
            onClick={() => handleSelectSegment('assets')}
          >
            Hạ tầng
          </button>
          <button
            type="button"
            role="tab"
            id="tab-segment-meters"
            aria-selected={activeSegment === 'meters'}
            aria-controls="panel-segment-meters"
            className={`sgp-devices-tab-btn ${activeSegment === 'meters' ? 'active' : ''}`}
            onClick={() => handleSelectSegment('meters')}
          >
            Công tơ
          </button>
        </div>
      </header>

      {/* 2. STABLE WORKSPACE BODY (Hạ tầng or Công tơ) */}
      <main
        className="sgp-devices-body"
        role="tabpanel"
        id={`panel-segment-${activeSegment}`}
        aria-labelledby={`tab-segment-${activeSegment}`}
      >
        {activeSegment === 'assets' ? (
          <AdminAssets hideWorkspaceHeader={true} />
        ) : (
          <AdminMeters onInspectReading={onInspectReading} />
        )}
      </main>
    </div>
  );
};
