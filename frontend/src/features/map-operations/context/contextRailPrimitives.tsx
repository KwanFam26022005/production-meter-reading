/**
 * Context Rail Design System Primitives (V13)
 *
 * Section 29: Card Design System
 * Semantic primitives replacing fragmented, one-off cards.
 * Avoids nested "card inside card inside rail" patterns.
 */

import React from 'react';

/**
 * Clean semantic section with optional eyebrow/title
 */
export interface ContextSectionProps {
  title?: string;
  eyebrow?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  bordered?: boolean;
}

export const ContextSection: React.FC<ContextSectionProps> = ({
  title,
  eyebrow,
  action,
  children,
  className = '',
  bordered = true,
}) => {
  return (
    <section
      className={`sgp-context-section ${bordered ? 'bordered' : ''} ${className}`}
      aria-label={title}
    >
      {(title || eyebrow || action) && (
        <div className="sgp-section-header">
          <div>
            {eyebrow && <span className="sgp-section-eyebrow">{eyebrow}</span>}
            {title && <h3 className="sgp-section-title">{title}</h3>}
          </div>
          {action && <div className="sgp-section-action">{action}</div>}
        </div>
      )}
      <div className="sgp-section-content">{children}</div>
    </section>
  );
};

/**
 * Metric Line: Clean Label + Tabular Numeric Value
 */
export interface MetricLineProps {
  label: string;
  value: React.ReactNode;
  subtext?: string;
  status?: 'normal' | 'success' | 'warning' | 'danger';
  className?: string;
}

export const MetricLine: React.FC<MetricLineProps> = ({
  label,
  value,
  subtext,
  status = 'normal',
  className = '',
}) => {
  return (
    <div className={`sgp-metric-line status-${status} ${className}`}>
      <span className="sgp-metric-label">{label}</span>
      <div className="sgp-metric-val-wrap">
        <span className="sgp-metric-val font-tabular">{value}</span>
        {subtext && <span className="sgp-metric-sub">{subtext}</span>}
      </div>
    </div>
  );
};

/**
 * Status Badge: Standardized semantic status pill
 */
export interface StatusBadgeProps {
  status: 'CONFIRMED' | 'OVERDUE' | 'REVIEW' | 'PENDING' | 'DUE' | 'ACTIVE' | 'WARNING' | 'NEUTRAL';
  label?: string;
  icon?: React.ReactNode;
  size?: 'sm' | 'md';
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  label,
  icon,
  size = 'md',
}) => {
  const defaultLabels: Record<string, string> = {
    CONFIRMED: 'Đã ghi',
    OVERDUE: 'Quá hạn',
    REVIEW: 'Cần kiểm tra',
    PENDING: 'Chờ ghi',
    DUE: 'Đến hạn',
    ACTIVE: 'Hoạt động',
    WARNING: 'Cảnh báo',
    NEUTRAL: 'Bình thường',
  };

  const text = label || defaultLabels[status] || status;

  return (
    <span className={`sgp-status-badge badge-${status.toLowerCase()} size-${size}`}>
      {icon && <span className="sgp-badge-icon">{icon}</span>}
      <span>{text}</span>
    </span>
  );
};

/**
 * Progress Line: Single-rail streamlined progress bar
 */
export interface ProgressLineProps {
  percent: number;
  label?: string;
  valueText?: string;
  color?: string;
  subtext?: string;
}

export const ProgressLine: React.FC<ProgressLineProps> = ({
  percent,
  label,
  valueText,
  color,
  subtext,
}) => {
  const clamped = Math.min(100, Math.max(0, percent));
  const autoColor =
    color || (clamped === 100 ? '#10B981' : clamped < 50 ? '#F59E0B' : '#0284C7');

  return (
    <div className="sgp-progress-line-group">
      {(label || valueText) && (
        <div className="sgp-progress-labels">
          {label && <span className="sgp-progress-label">{label}</span>}
          {valueText && <span className="sgp-progress-value font-tabular">{valueText}</span>}
        </div>
      )}
      <div className="sgp-progress-track">
        <div
          className="sgp-progress-fill"
          style={{ width: `${clamped}%`, backgroundColor: autoColor }}
        />
      </div>
      {subtext && <span className="sgp-progress-sub">{subtext}</span>}
    </div>
  );
};

/**
 * Action Row: Container for primary and secondary actions in rail footer or sections
 */
export interface ActionRowProps {
  children: React.ReactNode;
  align?: 'left' | 'right' | 'stretch';
  className?: string;
}

export const ActionRow: React.FC<ActionRowProps> = ({
  children,
  align = 'stretch',
  className = '',
}) => {
  return (
    <div className={`sgp-action-row align-${align} ${className}`}>
      {children}
    </div>
  );
};

/**
 * Entity List Item: Clickable item row with hover states
 */
export interface EntityListItemProps {
  icon?: React.ReactNode;
  title: string;
  subtitle?: string;
  badge?: React.ReactNode;
  action?: React.ReactNode;
  onClick?: () => void;
  selected?: boolean;
}

export const EntityListItem: React.FC<EntityListItemProps> = ({
  icon,
  title,
  subtitle,
  badge,
  action,
  onClick,
  selected = false,
}) => {
  return (
    <div
      className={`sgp-entity-list-item ${selected ? 'selected' : ''} ${
        onClick ? 'clickable' : ''
      }`}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={
        onClick
          ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onClick();
              }
            }
          : undefined
      }
    >
      <div className="sgp-item-left">
        {icon && <span className="sgp-item-icon">{icon}</span>}
        <div className="sgp-item-titles">
          <span className="sgp-item-title">{title}</span>
          {subtitle && <span className="sgp-item-sub">{subtitle}</span>}
        </div>
      </div>
      <div className="sgp-item-right">
        {badge}
        {action}
      </div>
    </div>
  );
};
