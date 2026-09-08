import React from 'react';
import { Inbox } from 'lucide-react';

interface EmptyStateProps {
  icon?: React.ReactNode;
  title?: string;
  message: string;
  action?: React.ReactNode;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title = 'Chưa có dữ liệu',
  message,
  action,
}) => {
  return (
    <div className="empty-state-box" role="region" aria-label={title}>
      <div className="empty-state-icon-wrap" aria-hidden="true">
        {icon || <Inbox size={32} strokeWidth={1.8} />}
      </div>
      <h3 className="empty-state-title">{title}</h3>
      <p className="empty-state-message">{message}</p>
      {action && <div className="empty-state-action-wrap">{action}</div>}
    </div>
  );
};
