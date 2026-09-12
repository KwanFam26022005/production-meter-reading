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
 * SceneSearch — Progressive Minimal Spatial Search (V10)
 *
 * Overview: Icon-first tool button (38-40px visual box, >= 44px hit target)
 * Click: Expands into inline search input [Icon | Input | Close] with categorized results.
 * Close / Esc: Returns to icon-only state.
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
  const containerRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      setQuery('');
    }
  }, [isOpen]);

  // Close on outside click or ESC
  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        onToggle(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onToggle(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
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
    <div className={`sgp-search-wrap ${isOpen ? 'expanded' : 'collapsed'}`} ref={containerRef}>
      {!isOpen ? (
        <button
          type="button"
          className="sgp-search-trigger-btn sgp-map-icon-action"
          aria-label="Tìm kiếm trong sơ đồ tác nghiệp"
          aria-expanded={false}
          onClick={() => onToggle(true)}
          title="Tìm kiếm (công tơ, người, khu vực...)"
        >
          <Search size={16} />
        </button>
      ) : (
        <div className="sgp-search-expanded-bar" role="search">
          <Search size={15} className="sgp-search-input-icon text-cyan-400" aria-hidden="true" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Tìm công tơ, người, khu vực..."
            aria-label="Nhập từ khóa tìm kiếm"
            className="sgp-search-inline-input"
          />
          {query ? (
            <button
              type="button"
              className="sgp-search-clear-btn"
              onClick={() => setQuery('')}
              aria-label="Xóa từ khóa"
              title="Xóa từ khóa"
            >
              <X size={13} />
            </button>
          ) : (
            <button
              type="button"
              className="sgp-search-close-btn"
              onClick={() => onToggle(false)}
              aria-label="Đóng tìm kiếm"
              title="Đóng tìm kiếm (Esc)"
            >
              <X size={14} />
            </button>
          )}

          {/* Search Dropdown Results */}
          {query.trim().length > 0 && (
            <div className="sgp-search-popover" role="dialog" aria-label="Kết quả tìm kiếm">
              <div className="sgp-search-results">
                {/* Category 1: METERS */}
                {results.meters.length > 0 && (
                  <div className="sgp-search-category">
                    <div className="sgp-search-cat-title">
                      <Zap size={11} />
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
                      <MapPin size={11} />
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
                        <span className="sgp-search-item-sub font-tabular">{z.code}</span>
                      </button>
                    ))}
                  </div>
                )}

                {/* Category 3: OPERATORS */}
                {results.operators.length > 0 && (
                  <div className="sgp-search-category">
                    <div className="sgp-search-cat-title">
                      <UserIcon size={11} />
                      <span>NHÂN SỰ</span>
                    </div>
                    {results.operators.map((o) => {
                      const fullName =
                        'fullName' in o ? (o as any).fullName : (o as any).full_name || '';
                      const empCode =
                        'employeeCode' in o ? (o as any).employeeCode : (o as any).employee_code || '';
                      return (
                        <button
                          key={o.id}
                          type="button"
                          className="sgp-search-item operator"
                          onClick={() => {
                            onSelectOperator(o.id);
                            onToggle(false);
                          }}
                        >
                          <span className="sgp-search-item-primary">{fullName}</span>
                          <span className="sgp-search-item-sub font-tabular">{empCode}</span>
                        </button>
                      );
                    })}
                  </div>
                )}

                {results.total === 0 && (
                  <div className="sgp-search-empty">
                    <span>Không tìm thấy kết quả phù hợp cho "{query}"</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
