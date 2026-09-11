import React from 'react';
import { User } from 'lucide-react';

interface OperatorIconButtonProps {
  operator?: {
    id: string;
    fullName: string;
    employeeCode?: string;
    role?: string;
  };
  isOpen?: boolean;
  onClick: (e: React.MouseEvent<HTMLButtonElement>) => void;
  className?: string;
}

export const OperatorIconButton: React.FC<OperatorIconButtonProps> = ({
  operator,
  isOpen = false,
  onClick,
  className = '',
}) => {
  const label = operator
    ? `Xem người phụ trách ${operator.fullName}`
    : 'Chưa phân công nhân sự phụ trách';

  const initial = operator?.fullName?.trim()?.charAt(0)?.toUpperCase();

  return (
    <button
      type="button"
      className={`sgp-operator-icon-btn ${isOpen ? 'active' : ''} ${className}`}
      onClick={onClick}
      aria-label={label}
      aria-haspopup="dialog"
      aria-expanded={isOpen}
      title={label}
    >
      <span className="sgp-operator-icon-avatar" aria-hidden="true">
        {initial ? (
          <span className="sgp-operator-initial">{initial}</span>
        ) : (
          <User size={15} />
        )}
      </span>
      {operator && (
        <span
          className="sgp-operator-active-dot"
          aria-hidden="true"
          title="Đang trong ca trực"
        />
      )}
    </button>
  );
};
