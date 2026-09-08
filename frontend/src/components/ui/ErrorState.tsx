import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface ErrorStateProps {
  title?: string;
  message: string;
  onRetry?: () => void;
  retryLabel?: string;
  compact?: boolean;
}

export const ErrorState: React.FC<ErrorStateProps> = ({
  title = 'Không thể tải dữ liệu',
  message,
  onRetry,
  retryLabel = 'Thử lại',
  compact = false,
}) => {
  return (
    <div className={compact ? 'error-card-compact' : 'error-card-state'} role="alert">
      <div className="error-card-body">
        <div className="error-icon-circle">
          <AlertTriangle size={20} strokeWidth={2} />
        </div>
        <div className="error-text-content">
          <h3 className="error-state-title">{title}</h3>
          <p className="error-state-desc">{message}</p>
        </div>
      </div>
      {onRetry && (
        <button
          type="button"
          className="btn btn-secondary btn-sm"
          onClick={onRetry}
          aria-label={retryLabel}
        >
          <RefreshCw size={14} strokeWidth={2} />
          <span>{retryLabel}</span>
        </button>
      )}
    </div>
  );
};
