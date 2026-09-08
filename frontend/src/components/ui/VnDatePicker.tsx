import React, { useRef } from 'react';
import { Calendar, ChevronLeft, ChevronRight } from 'lucide-react';

export const formatToVnDate = (isoDate: string): string => {
  if (!isoDate) return '';
  try {
    const parts = isoDate.trim().split('-');
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
  } catch {}
  return isoDate;
};

export const addDaysToIso = (isoDate: string, days: number): string => {
  try {
    const [y, m, d] = isoDate.trim().split('-').map(Number);
    const date = new Date(y, m - 1, d);
    date.setDate(date.getDate() + days);
    const ny = date.getFullYear();
    const nm = String(date.getMonth() + 1).padStart(2, '0');
    const nd = String(date.getDate()).padStart(2, '0');
    return `${ny}-${nm}-${nd}`;
  } catch {
    return isoDate;
  }
};

export interface VnDatePickerProps {
  value: string; // ISO date string: YYYY-MM-DD
  onChange: (newIsoDate: string) => void;
  min?: string;
  max?: string;
  disabled?: boolean;
  required?: boolean;
  id?: string;
  className?: string;
  size?: 'sm' | 'md';
  showSteppers?: boolean;
  showToday?: boolean;
  todayDateStr?: string;
  title?: string;
  ariaLabel?: string;
}

export const VnDatePicker: React.FC<VnDatePickerProps> = ({
  value,
  onChange,
  min,
  max,
  disabled = false,
  required = false,
  id,
  className = '',
  size = 'md',
  showSteppers = false,
  showToday = false,
  todayDateStr,
  title = 'Chọn ngày (DD/MM/YYYY)',
  ariaLabel = 'Chọn ngày theo định dạng Việt Nam',
}) => {
  const inputRef = useRef<HTMLInputElement | null>(null);

  const handleDisplayClick = () => {
    if (disabled) return;
    if (inputRef.current) {
      try {
        if ('showPicker' in HTMLInputElement.prototype) {
          inputRef.current.showPicker();
        } else {
          inputRef.current.focus();
        }
      } catch {
        inputRef.current.focus();
      }
    }
  };

  const handleStep = (days: number) => {
    if (disabled || !value) return;
    const nextDate = addDaysToIso(value, days);
    if (min && nextDate < min) return;
    if (max && nextDate > max) return;
    onChange(nextDate);
  };

  const displayVn = formatToVnDate(value);
  const isToday = todayDateStr ? value === todayDateStr : false;

  return (
    <div
      className={`vn-datepicker-wrapper ${size === 'sm' ? 'vn-datepicker-sm' : ''} ${disabled ? 'vn-datepicker-disabled' : ''} ${className}`}
      title={title}
    >
      {/* Optional Today Button */}
      {showToday && todayDateStr && !isToday && (
        <button
          type="button"
          className="vn-datepicker-btn-today"
          onClick={() => onChange(todayDateStr)}
          disabled={disabled}
          title="Về hôm nay"
        >
          Hôm nay
        </button>
      )}

      {/* Stepper: Previous Day */}
      {showSteppers && (
        <button
          type="button"
          className="vn-datepicker-stepper-btn"
          onClick={() => handleStep(-1)}
          disabled={disabled || Boolean(min && value <= min)}
          title="Ngày trước"
          aria-label="Ngày trước"
        >
          <ChevronLeft size={14} aria-hidden="true" />
        </button>
      )}

      {/* Visual Box with Vietnamese Formatted Date and Overlay Input */}
      <div
        className="vn-datepicker-field"
        onClick={handleDisplayClick}
        role="button"
        tabIndex={disabled ? -1 : 0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            handleDisplayClick();
          }
        }}
        aria-label={`${ariaLabel}: ${displayVn || 'Chưa chọn'}`}
      >
        <Calendar size={size === 'sm' ? 13 : 15} className="vn-datepicker-icon" aria-hidden="true" />
        <span className="vn-datepicker-text font-tabular">{displayVn || 'DD/MM/YYYY'}</span>

        {/* Native Hidden Date Input */}
        <input
          ref={inputRef}
          type="date"
          id={id}
          className="vn-datepicker-native-input"
          value={value}
          min={min}
          max={max}
          disabled={disabled}
          required={required}
          onChange={(e) => {
            if (e.target.value) {
              onChange(e.target.value);
            }
          }}
          tabIndex={-1}
          aria-hidden="true"
        />
      </div>

      {/* Stepper: Next Day */}
      {showSteppers && (
        <button
          type="button"
          className="vn-datepicker-stepper-btn"
          onClick={() => handleStep(1)}
          disabled={disabled || Boolean(max && value >= max)}
          title="Ngày sau"
          aria-label="Ngày sau"
        >
          <ChevronRight size={14} aria-hidden="true" />
        </button>
      )}
    </div>
  );
};
