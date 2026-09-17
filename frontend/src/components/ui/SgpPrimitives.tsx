import React from 'react';
import { Search, X, ChevronDown, Check, AlertTriangle, AlertCircle, Clock } from 'lucide-react';

// ============================================================================
// 1. SGP BUTTON
// ============================================================================
export interface SgpButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'touch';
  icon?: React.ReactNode;
  iconRight?: React.ReactNode;
  fullWidth?: boolean;
}

export const SgpButton: React.FC<SgpButtonProps> = ({
  variant = 'secondary',
  size = 'md',
  icon,
  iconRight,
  fullWidth = false,
  children,
  className = '',
  disabled,
  ...rest
}) => {
  return (
    <button
      className={`sgp-btn sgp-btn-${variant} sgp-btn-${size} ${fullWidth ? 'w-full' : ''} ${className}`}
      disabled={disabled}
      {...rest}
    >
      {icon && <span className="sgp-btn-icon shrink-0">{icon}</span>}
      {children && <span className="sgp-btn-text">{children}</span>}
      {iconRight && <span className="sgp-btn-icon-right shrink-0">{iconRight}</span>}
    </button>
  );
};

// ============================================================================
// 2. SGP ICON BUTTON
// ============================================================================
export interface SgpIconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'outline';
  size?: 'sm' | 'md' | 'touch';
  active?: boolean;
  title: string;
}

export const SgpIconButton: React.FC<SgpIconButtonProps> = ({
  variant = 'ghost',
  size = 'md',
  active = false,
  title,
  children,
  className = '',
  ...rest
}) => {
  return (
    <button
      className={`sgp-icon-btn sgp-icon-btn-${variant} sgp-icon-btn-${size} ${active ? 'active' : ''} ${className}`}
      title={title}
      aria-label={title}
      {...rest}
    >
      {children}
    </button>
  );
};

// ============================================================================
// 3. SGP INPUT
// ============================================================================
export interface SgpInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  sizeVariant?: 'sm' | 'md' | 'touch';
  iconLeft?: React.ReactNode;
  iconRight?: React.ReactNode;
  onClear?: () => void;
}

export const SgpInput: React.FC<SgpInputProps> = ({
  sizeVariant = 'md',
  iconLeft,
  iconRight,
  onClear,
  value,
  className = '',
  ...rest
}) => {
  return (
    <div className={`sgp-input-wrap sgp-input-${sizeVariant} ${className}`}>
      {iconLeft && <span className="sgp-input-icon-left">{iconLeft}</span>}
      <input
        className="sgp-input"
        value={value}
        {...rest}
      />
      {onClear && value ? (
        <button
          type="button"
          className="sgp-input-clear-btn"
          onClick={onClear}
          title="Xóa tìm kiếm"
          aria-label="Xóa nội dung"
        >
          <X size={14} />
        </button>
      ) : (
        iconRight && <span className="sgp-input-icon-right">{iconRight}</span>
      )}
    </div>
  );
};

// ============================================================================
// 4. SGP SELECT
// ============================================================================
export interface SgpSelectOption {
  value: string;
  label: string;
  count?: number;
}

export interface SgpSelectProps extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'size'> {
  sizeVariant?: 'sm' | 'md' | 'touch';
  options: SgpSelectOption[];
  iconLeft?: React.ReactNode;
}

export const SgpSelect: React.FC<SgpSelectProps> = ({
  sizeVariant = 'md',
  options,
  iconLeft,
  className = '',
  ...rest
}) => {
  return (
    <div className={`sgp-select-wrap sgp-select-${sizeVariant} ${className}`}>
      {iconLeft && <span className="sgp-select-icon-left">{iconLeft}</span>}
      <select className="sgp-select" {...rest}>
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label} {opt.count !== undefined ? `(${opt.count})` : ''}
          </option>
        ))}
      </select>
      <ChevronDown size={14} className="sgp-select-chevron" aria-hidden="true" />
    </div>
  );
};

// ============================================================================
// 5. SGP SEGMENTED CONTROL
// ============================================================================
export interface SgpSegmentOption<T extends string = string> {
  id: T;
  label: string;
  count?: number;
  icon?: React.ReactNode;
}

export interface SgpSegmentedControlProps<T extends string = string> {
  options: SgpSegmentOption<T>[];
  value: T;
  onChange: (val: T) => void;
  size?: 'sm' | 'md' | 'touch';
  className?: string;
}

export function SgpSegmentedControl<T extends string = string>({
  options,
  value,
  onChange,
  size = 'md',
  className = '',
}: SgpSegmentedControlProps<T>) {
  return (
    <div className={`sgp-segmented-control sgp-segmented-${size} ${className}`} role="tablist">
      {options.map((opt) => {
        const active = opt.id === value;
        return (
          <button
            key={opt.id}
            type="button"
            role="tab"
            aria-selected={active}
            className={`sgp-segmented-btn ${active ? 'active' : ''}`}
            onClick={() => onChange(opt.id)}
          >
            {opt.icon && <span className="sgp-segmented-icon">{opt.icon}</span>}
            <span className="sgp-segmented-label">{opt.label}</span>
            {opt.count !== undefined && (
              <span className={`sgp-segmented-count ${active ? 'active' : ''}`}>
                {opt.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

// ============================================================================
// 6. SGP BADGES & STATUS BADGES
// ============================================================================
export interface SgpBadgeProps {
  variant?: 'neutral' | 'blue' | 'cyan' | 'amber' | 'emerald' | 'rose';
  children: React.ReactNode;
  icon?: React.ReactNode;
  className?: string;
  title?: string;
}

export const SgpBadge: React.FC<SgpBadgeProps> = ({
  variant = 'neutral',
  children,
  icon,
  className = '',
  title,
}) => {
  return (
    <span className={`sgp-badge sgp-badge-${variant} ${className}`} title={title}>
      {icon && <span className="sgp-badge-icon">{icon}</span>}
      <span>{children}</span>
    </span>
  );
};

export interface SgpStatusBadgeProps {
  status: string;
  className?: string;
}

export const SgpStatusBadge: React.FC<SgpStatusBadgeProps> = ({ status, className = '' }) => {
  const norm = (status || '').toUpperCase();

  if (norm === 'OPERATIONAL' || norm === 'ACTIVE' || norm === 'CONFIRMED' || norm === 'HOẠT ĐỘNG') {
    return (
      <span className={`sgp-status-pill sgp-status-success ${className}`}>
        <Check size={11} className="shrink-0" />
        <span>Hoạt động</span>
      </span>
    );
  }
  if (norm === 'MAINTENANCE' || norm === 'BẢO TRÌ') {
    return (
      <span className={`sgp-status-pill sgp-status-warning ${className}`}>
        <Clock size={11} className="shrink-0" />
        <span>Bảo trì</span>
      </span>
    );
  }
  if (norm === 'FAULT' || norm === 'SỰ CỐ' || norm === 'OVERDUE' || norm === 'QUÁ HẠN') {
    return (
      <span className={`sgp-status-pill sgp-status-danger ${className}`}>
        <AlertTriangle size={11} className="shrink-0" />
        <span>{norm === 'OVERDUE' ? 'Quá hạn' : 'Sự cố'}</span>
      </span>
    );
  }
  if (norm === 'INACTIVE' || norm === 'RETIRED' || norm === 'NGỪNG HOẠT ĐỘNG') {
    return (
      <span className={`sgp-status-pill sgp-status-muted ${className}`}>
        <AlertCircle size={11} className="shrink-0" />
        <span>Ngừng hoạt động</span>
      </span>
    );
  }
  if (norm === 'DUE' || norm === 'CHƯA GHI') {
    return (
      <span className={`sgp-status-pill sgp-status-warning ${className}`}>
        <Clock size={11} className="shrink-0" />
        <span>Chưa ghi</span>
      </span>
    );
  }

  return (
    <span className={`sgp-status-pill sgp-status-neutral ${className}`}>
      <span>{status}</span>
    </span>
  );
};

// ============================================================================
// 7. SGP SEARCH FIELD
// ============================================================================
export interface SgpSearchFieldProps {
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  sizeVariant?: 'sm' | 'md' | 'touch';
  className?: string;
}

export const SgpSearchField: React.FC<SgpSearchFieldProps> = ({
  value,
  onChange,
  placeholder = 'Tìm kiếm mã, tên...',
  sizeVariant = 'md',
  className = '',
}) => {
  return (
    <SgpInput
      sizeVariant={sizeVariant}
      iconLeft={<Search size={14} className="text-slate-400" />}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onClear={() => onChange('')}
      placeholder={placeholder}
      className={`sgp-search-field ${className}`}
    />
  );
};

// ============================================================================
// 8. SGP EMPTY STATE
// ============================================================================
export interface SgpEmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
}

export const SgpEmptyState: React.FC<SgpEmptyStateProps> = ({
  icon,
  title,
  description,
  action,
}) => {
  return (
    <div className="sgp-empty-state">
      {icon && <div className="sgp-empty-icon">{icon}</div>}
      <h3 className="sgp-empty-title">{title}</h3>
      {description && <p className="sgp-empty-desc">{description}</p>}
      {action && <div className="sgp-empty-action">{action}</div>}
    </div>
  );
};
