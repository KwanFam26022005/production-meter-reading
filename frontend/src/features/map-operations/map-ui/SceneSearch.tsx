import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Search, X, Zap, MapPin, User as UserIcon } from 'lucide-react';
import { MapMeterItem, MapOperationalZone } from '../types';
import { User } from '../../../types';

interface SceneSearchProps {
  meters: MapMeterItem[];
  zones: MapOperationalZone[];
  operators: User[];
  isOpen: boolean;
  onToggle: (open: boolean) => void;
  onSelectMeter: (meterId: string) => void;
  onSelectZone: (zoneId: string) => void;
  onSelectOperator: (operatorId: string) => void;
}

/**
 * SceneSearch — Unified industrial spatial search across meters, zones, and operators.
 *
 * Results hierarchy:
 * 1. CÔNG TƠ (Meters)
 * 2. KHU VỰC (Zones)
 * 3. NHÂN SỰ (Operators)
 */
export const SceneSearch: React.FC<SceneSearchProps> = ({
  meters,
  zones,
  operators,
  isOpen,
  onToggle,
  onSelectMeter,
  onSelectZone,
  onSelectOperator,
}) => {
  const [query, setQuery] = useState('');
  const popoverRef = useRef<HTMLDivElement | null>(null);

  // Close on outside click
  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        onToggle(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, onToggle]);

  // Unified categorized search dataset
  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return { meters: [], zones: [], operators: [], total: 0 };

    const matchedMeters = meters
      .filter((m) =>
        [m.meterCode, m.name, m.location, m.zoneName].some((v) =>
          v?.toLowerCase().includes(q)
        )
      )
      .slice(0, 5);

    const matchedZones = zones
      .filter((z) =>
        [z.name, z.shortName, z.code].some((v) =>
          v?.toLowerCase().includes(q)
        )
      )
      .slice(0, 4);

    const matchedOperators = operators
      .filter((o) => {
        const fullName = 'fullName' in o ? (o as any).fullName : (o as any).full_name || '';
        const empCode = 'employeeCode' in o ? (o as any).employeeCode : (o as any).employee_code || '';
        return [fullName, empCode].some((v) => v.toLowerCase().includes(q));
      })
      .slice(0, 4);

    const total = matchedMeters.length + matchedZones.length + matchedOperators.length;
    return { meters: matchedMeters, zones: matchedZones, operators: matchedOperators, total };
  }, [meters, zones, operators, query]);

  return (
    <div className="sgp-search-wrap" ref={popoverRef}>
      <button
        type="button"
        className="sgp-search-trigger-btn sgp-scene-action-pill sgp-map-action-control"
        aria-label="Tìm kiếm trong sơ đồ tác nghiệp"
        aria-expanded={isOpen}
        onClick={() => onToggle(!isOpen)}
        title="Tìm công tơ, khu vực, nhân sự..."
      >
        <Search size={16} />
        <span>Tìm kiếm</span>
      </button>

      {isOpen && (
        <div className="sgp-search-popover" role="dialog" aria-label="Tìm kiếm tác nghiệp">
          <div className="sgp-search-input-wrap">
            <Search size={15} className="sgp-search-input-icon" />
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Tìm công tơ, khu vực, nhân sự..."
              aria-label="Nhập từ khóa tìm kiếm"
            />
            {query ? (
              <button
                type="button"
                className="sgp-search-clear-btn"
                onClick={() => setQuery('')}
                aria-label="Xóa từ khóa"
              >
                <X size={13} />
              </button>
            ) : (
              <button
                type="button"
                className="sgp-search-close-btn"
                onClick={() => onToggle(false)}
                aria-label="Đóng tìm kiếm"
              >
                <X size={14} />
              </button>
            )}
          </div>

          <div className="sgp-search-results">
            {/* Category 1: METERS */}
            {results.meters.length > 0 && (
              <div className="sgp-search-category">
                <div className="sgp-search-cat-title">
                  <Zap size={12} />
                  <span>CÔNG TƠ</span>
                </div>
                {results.meters.map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    className="sgp-search-item meter"
                    onClick={() => {
                      onSelectMeter(m.id);
                      onToggle(false);
                    }}
                  >
                    <span className="sgp-search-item-primary font-tabular">{m.meterCode}</span>
                    <span className="sgp-search-item-sub">
                      {m.name} · {m.zoneName}
                    </span>
                  </button>
                ))}
              </div>
            )}

            {/* Category 2: ZONES */}
            {results.zones.length > 0 && (
              <div className="sgp-search-category">
                <div className="sgp-search-cat-title">
                  <MapPin size={12} />
                  <span>KHU VỰC</span>
                </div>
                {results.zones.map((z) => (
                  <button
                    key={z.id}
                    type="button"
                    className="sgp-search-item zone"
                    onClick={() => {
                      onSelectZone(z.id);
                      onToggle(false);
                    }}
                  >
                    <span className="sgp-search-item-primary">{z.name}</span>
                    <span className="sgp-search-item-sub">
                      {z.metrics?.totalMeters ?? z.meters?.length ?? 0} công tơ
                    </span>
                  </button>
                ))}
              </div>
            )}

            {/* Category 3: OPERATORS */}
            {results.operators.length > 0 && (
              <div className="sgp-search-category">
                <div className="sgp-search-cat-title">
                  <UserIcon size={12} />
                  <span>NHÂN SỰ</span>
                </div>
                {results.operators.map((op) => {
                  const name = 'fullName' in op ? (op as any).fullName : (op as any).full_name || '';
                  const code = 'employeeCode' in op ? (op as any).employeeCode : (op as any).employee_code || '';
                  return (
                    <button
                      key={op.id}
                      type="button"
                      className="sgp-search-item operator"
                      onClick={() => {
                        onSelectOperator(op.id);
                        onToggle(false);
                      }}
                    >
                      <span className="sgp-search-item-primary">{name}</span>
                      <span className="sgp-search-item-sub">{code || 'Nhân viên ghi'}</span>
                    </button>
                  );
                })}
              </div>
            )}

            {query.trim() && results.total === 0 && (
              <div className="sgp-search-empty">
                Không tìm thấy công tơ, khu vực hoặc nhân sự phù hợp
              </div>
            )}

            {!query.trim() && (
              <div className="sgp-search-hint">
                Nhập mã công tơ (CT-xxx), tên khu vực hoặc nhân viên phụ trách...
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
