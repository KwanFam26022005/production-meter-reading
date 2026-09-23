import React, { useEffect, useRef, useState } from 'react';
import {
  Zap,
  Clock,
  CalendarDays,
  X,
} from 'lucide-react';
import { SaigonPortUiIcon } from './SaigonPortUiIcon';

export interface RoundProgressData {
  total: number;
  confirmed: number;
  roundName?: string;
}

export interface BottomRadialNavProps {
  onOpenMeter: () => void;
  onOpenAttendance: () => void;
  onOpenSchedule: () => void;
  roundProgress?: RoundProgressData | null;
  hasActiveRound?: boolean;
}

export const BottomRadialNav: React.FC<BottomRadialNavProps> = ({
  onOpenMeter,
  onOpenAttendance,
  onOpenSchedule,
  roundProgress,
  hasActiveRound = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close on Escape or click outside
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };

    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Circumference calculation for r=30 on 68x68 viewBox: 2 * PI * 30 = 188.4955
  const circumference = 188.5;
  const total = roundProgress?.total ?? 0;
  const confirmed = roundProgress?.confirmed ?? 0;
  const percent = total > 0 ? Math.min(100, Math.max(0, Math.round((confirmed / total) * 100))) : 0;
  const dashoffset = hasActiveRound && total > 0
    ? circumference - (percent / 100) * circumference
    : circumference;

  const handleAction = (callback: () => void) => {
    setIsOpen(false);
    callback();
  };

  return (
    <>
      {/* Light dim backdrop overlay when radial arc is open */}
      {isOpen && (
        <div
          className="sgp-radial-backdrop"
          onClick={() => setIsOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Fixed bottom navigation bar container */}
      <nav
        className="sgp-bottom-radial-bar"
        ref={containerRef}
        role="navigation"
        aria-label="Điều hướng chính tác nghiệp"
      >
        {/* Left Quick Tab: Schedule */}
        <button
          type="button"
          className="sgp-bar-nav-item"
          onClick={onOpenSchedule}
          aria-label="Xem Lịch làm việc & Phép"
        >
          <CalendarDays size={20} strokeWidth={2.2} />
          <span className="sgp-bar-nav-label">Lịch trực</span>
        </button>

        {/* Center Radial Hub & Progress Ring */}
        <div className="sgp-radial-hub-wrap">
          {/* Circular Progress Ring SVG */}
          <svg
            className="sgp-progress-ring-svg"
            viewBox="0 0 68 68"
            aria-hidden="true"
          >
            {/* Track Circle */}
            <circle
              className="sgp-progress-ring-track"
              cx="34"
              cy="34"
              r="30"
            />
            {/* Active Progress Circle (Whole Port) */}
            {hasActiveRound && total > 0 && (
              <circle
                className="sgp-progress-ring-fill"
                cx="34"
                cy="34"
                r="30"
                strokeDasharray={circumference}
                strokeDashoffset={dashoffset}
              />
            )}
            {!hasActiveRound && (
              <circle
                className="sgp-progress-ring-fill sgp-progress-ring-fill--neutral"
                cx="34"
                cy="34"
                r="30"
                strokeDasharray={circumference}
                strokeDashoffset={circumference}
              />
            )}
          </svg>

          {/* Central Radial Trigger Button */}
          <button
            type="button"
            className={`sgp-radial-fab ${isOpen ? 'is-open' : ''}`}
            onClick={() => setIsOpen((prev) => !prev)}
            aria-expanded={isOpen}
            aria-haspopup="menu"
            aria-label={isOpen ? 'Đóng menu thao tác' : 'Mở menu thao tác tác nghiệp'}
          >
            {isOpen ? (
              <X size={22} strokeWidth={2.4} />
            ) : (
              <SaigonPortUiIcon
                size={45}
                className="sgp-radial-home-icon"
              />
            )}
          </button>

          {/* Port-Wide Progress Badge */}
          <div
            className={`sgp-radial-port-badge ${!hasActiveRound ? 'sgp-radial-port-badge--neutral' : ''}`}
            aria-live="polite"
          >
            {hasActiveRound && total > 0 ? `${percent}% cảng` : 'Chưa có lượt'}
          </div>

          {/* Radial Arc Layer (3 uniform child items fanning upward) */}
          <div
            className={`sgp-radial-arc-layer ${isOpen ? 'is-open' : ''}`}
            role="menu"
            aria-label="Các tác vụ mở rộng"
          >
            {/* 1. Left Item: Attendance (Chấm công) */}
            <div className="sgp-radial-arc-item arc-item-left">
              <button
                type="button"
                className="sgp-radial-arc-btn"
                onClick={() => handleAction(onOpenAttendance)}
                tabIndex={isOpen ? 0 : -1}
                role="menuitem"
                aria-label="Chấm công ca làm"
              >
                <Clock size={20} strokeWidth={2.2} />
              </button>
              <span className="sgp-radial-arc-label">Chấm công</span>
            </div>

            {/* 2. Center Item: Meter Reading (Đo đếm) */}
            <div className="sgp-radial-arc-item arc-item-center">
              <button
                type="button"
                className="sgp-radial-arc-btn"
                onClick={() => handleAction(onOpenMeter)}
                tabIndex={isOpen ? 0 : -1}
                role="menuitem"
                aria-label="Đo đếm điện năng"
              >
                <Zap size={20} strokeWidth={2.2} />
              </button>
              <span className="sgp-radial-arc-label">Đo đếm</span>
            </div>

            {/* 3. Right Item: Schedule & Leave (Lịch trực) */}
            <div className="sgp-radial-arc-item arc-item-right">
              <button
                type="button"
                className="sgp-radial-arc-btn"
                onClick={() => handleAction(onOpenSchedule)}
                tabIndex={isOpen ? 0 : -1}
                role="menuitem"
                aria-label="Lịch làm việc & Phép"
              >
                <CalendarDays size={20} strokeWidth={2.2} />
              </button>
              <span className="sgp-radial-arc-label">Lịch trực</span>
            </div>
          </div>
        </div>

        {/* Right Quick Tab: Attendance */}
        <button
          type="button"
          className="sgp-bar-nav-item"
          onClick={onOpenAttendance}
          aria-label="Chấm công ca làm: Vào ca / tan ca"
        >
          <Clock size={20} strokeWidth={2.2} />
          <span className="sgp-bar-nav-label">Chấm công</span>
        </button>
      </nav>
    </>
  );
};
