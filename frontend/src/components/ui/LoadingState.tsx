import React from 'react';

interface LoadingStateProps {
  message?: string;
  compact?: boolean;
}

export const LoadingState: React.FC<LoadingStateProps> = ({
  message = 'Đang tải dữ liệu...',
  compact = false,
}) => {
  return (
    <div className={compact ? 'loading-compact' : 'loading-container'} role="status">
      <div className="maritime-spinner" aria-hidden="true" />
      <p className="loading-message">{message}</p>
    </div>
  );
};
