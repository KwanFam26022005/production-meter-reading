import React, { useState } from 'react';
import { ChevronDown, ChevronUp, Info } from 'lucide-react';
import { SEMANTIC_STATE_CONFIG } from '../utils/mapStatus';
import { MeterSemanticState } from '../types';

export const MapLegend: React.FC = () => {
  const [isExpanded, setIsExpanded] = useState<boolean>(true);

  const states: MeterSemanticState[] = [
    'CONFIRMED',
    'DUE',
    'REVIEW',
    'OVERDUE',
    'PENDING',
    'INACTIVE',
  ];

  return (
    <div
      className="sgp-map-legend"
      style={{
        position: 'absolute',
        bottom: '16px',
        left: '16px',
        zIndex: 10,
        backgroundColor: '#FFFFFF',
        borderRadius: '8px',
        padding: isExpanded ? '10px 14px' : '6px 10px',
        boxShadow: '0 4px 12px rgba(24, 36, 44, 0.10)',
        border: '1px solid #D7E0E5',
        maxWidth: '280px',
        transition: 'all 0.2s ease',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          cursor: 'pointer',
          gap: '8px',
        }}
        onClick={() => setIsExpanded((prev) => !prev)}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Info size={14} color="#073B5C" />
          <span style={{ fontSize: '11px', fontWeight: '700', color: '#073B5C', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Chú giải trạng thái
          </span>
        </div>
        <button
          type="button"
          style={{ background: 'none', border: 'none', padding: '0', cursor: 'pointer', color: '#74838C' }}
        >
          {isExpanded ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
        </button>
      </div>

      {isExpanded && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2, 1fr)',
            gap: '6px 12px',
            marginTop: '10px',
            paddingTop: '8px',
            borderTop: '1px solid #EEF2F5',
          }}
        >
          {states.map((st) => {
            const cfg = SEMANTIC_STATE_CONFIG[st];
            return (
              <div key={st} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span
                  style={{
                    width: '10px',
                    height: '10px',
                    borderRadius: '50%',
                    backgroundColor: cfg.style.fill,
                    border: `1px solid ${cfg.style.stroke}`,
                    flexShrink: 0,
                  }}
                />
                <span style={{ fontSize: '11px', color: '#374751', fontWeight: '500' }}>
                  {cfg.shortLabel}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
