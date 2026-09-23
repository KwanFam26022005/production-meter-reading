import React, { useEffect, useRef, useState } from 'react';
import { ArrowLeft, LogOut, X } from 'lucide-react';
import { TodayAttendance, User, formatUserRole } from '../types';

export interface AvatarShiftStatus {
  variant: 'warning' | 'success' | 'completed' | 'neutral' | 'unknown';
  label: string;
}

export function resolveAvatarShiftStatus(
  attendance?: TodayAttendance | null,
  loading?: boolean,
  error?: string | null
): AvatarShiftStatus {
  if (loading) {
    return { variant: 'neutral', label: 'Đang kiểm tra...' };
  }
  if (error || !attendance) {
    return { variant: 'unknown', label: 'Chưa xác định' };
  }
  if (!attendance.check_in && !attendance.check_out) {
    return { variant: 'warning', label: 'Chưa vào ca' };
  }
  if (attendance.check_in && !attendance.check_out) {
    return { variant: 'success', label: 'Đang trong ca' };
  }
  return { variant: 'completed', label: 'Đã hoàn tất ca' };
}

export interface AuthenticatedShellProps {
  screenTitle?: string;
  screenSubtitle?: string;
  backLabel?: string;
  onBack?: () => void;
  onLogout?: () => void;
  user?: User | null;
  attendance?: TodayAttendance | null;
  loadingAttendance?: boolean;
  attendanceError?: string | null;
  rightAction?: React.ReactNode;
  children: React.ReactNode;
}

export const AuthenticatedShell: React.FC<AuthenticatedShellProps> = ({
  screenTitle,
  screenSubtitle,
  backLabel,
  onBack,
  onLogout,
  user,
  attendance,
  loadingAttendance,
  attendanceError,
  rightAction,
  children,
}) => {
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const { variant: statusVariant, label: statusLabel } = resolveAvatarShiftStatus(
    attendance,
    loadingAttendance,
    attendanceError
  );

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [screenTitle, backLabel]);

  // Handle escape and outside clicks to close account menu
  useEffect(() => {
    if (!accountMenuOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setAccountMenuOpen(false);
      }
    };

    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setAccountMenuOpen(false);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [accountMenuOpen]);

  const isHome = !onBack;
  const userInitial = user?.full_name?.trim()
    ? user.full_name.trim().charAt(0).toUpperCase()
    : 'U';

  return (
    <div className="app-container">
      {/* 1. STANDARDIZED HEADER */}
      <header className="app-header" role="banner">
        {isHome ? (
          <>
            <div className="header-brand-compact">
              <img
                src="/logo.png"
                alt="Logo Cảng Sài Gòn"
                className="header-brand-logo"
              />
              <div className="header-brand-text">
                <span className="header-brand-title">Trung tâm Tác nghiệp</span>
                <span className="header-brand-sub">Cảng Sài Gòn</span>
              </div>
            </div>

            <div className="header-account-wrapper" ref={menuRef}>
              <button
                type="button"
                className={`btn-account-avatar btn-account-avatar--${statusVariant}`}
                onClick={() => setAccountMenuOpen((prev) => !prev)}
                aria-label={`Mở tài khoản, trạng thái: ${statusLabel}`}
                aria-expanded={accountMenuOpen}
                aria-haspopup="dialog"
              >
                <span className="avatar-initial">{userInitial}</span>
                <span className={`avatar-status-badge avatar-status-badge--${statusVariant}`} aria-hidden="true" />
              </button>

              {accountMenuOpen && (
                <>
                  <div
                    className="account-popover-backdrop"
                    onClick={() => setAccountMenuOpen(false)}
                    aria-hidden="true"
                  />
                  <div
                    className="account-popover-menu"
                    role="dialog"
                    aria-modal="true"
                    aria-label="Menu tài khoản"
                  >
                    <div className="account-popover-header">
                      <div className="account-popover-avatar" aria-hidden="true">
                        {userInitial}
                      </div>
                      <div className="account-popover-user-info">
                        <div className="account-popover-name">
                          {user?.full_name || 'Nhân viên tác nghiệp'}
                        </div>
                        <div className="account-popover-meta">
                          <span className="account-popover-code">{user?.employee_code || '---'}</span>
                          <span className="account-popover-role">{formatUserRole(user?.role)}</span>
                        </div>
                      </div>
                      <button
                        type="button"
                        className="account-popover-close"
                        onClick={() => setAccountMenuOpen(false)}
                        aria-label="Đóng menu tài khoản"
                      >
                        <X size={16} />
                      </button>
                    </div>

                    {/* Dedicated Shift Status Section */}
                    <div className="account-popover-status-section">
                      <span className="account-popover-status-label">Trạng thái ca</span>
                      <div className="account-popover-status-val">
                        <span className={`status-dot dot-${statusVariant === 'unknown' ? 'neutral' : statusVariant}`} />
                        <span className="account-popover-status-text">{statusLabel}</span>
                      </div>
                    </div>

                    <div className="account-popover-divider" />

                    <div className="account-popover-actions">
                      {onLogout && (
                        <button
                          type="button"
                          className="account-popover-logout-btn"
                          onClick={() => {
                            setAccountMenuOpen(false);
                            onLogout();
                          }}
                          aria-label="Đăng xuất khỏi hệ thống"
                        >
                          <LogOut size={16} strokeWidth={2} />
                          <span>Đăng xuất</span>
                        </button>
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>
          </>
        ) : (
          <>
            <button
              type="button"
              className="btn-header-back"
              onClick={onBack}
              aria-label={`Quay lại ${backLabel || 'Trang chủ'}`}
            >
              <ArrowLeft size={18} strokeWidth={2.2} />
              <span>{backLabel || 'Trang chủ'}</span>
            </button>

            <div className="header-brand-right">
              <div className="header-brand-text" style={{ textAlign: 'right' }}>
                <span className="brand-title">{screenTitle}</span>
                {screenSubtitle && (
                  <span className="brand-subtitle">{screenSubtitle}</span>
                )}
              </div>
              {rightAction || (
                <img
                  src="/logo.png"
                  alt="Logo Cảng Sài Gòn"
                  className="header-brand-logo-small"
                />
              )}
            </div>
          </>
        )}
      </header>

      {/* 2. MAIN VIEWPORT */}
      <main className="main-content" role="main">
        {children}
      </main>

      {/* 3. STANDARDIZED FOOTER */}
      <footer className="app-footer" role="contentinfo">
        CÔNG TY CỔ PHẦN CẢNG SÀI GÒN &bull; CSG-OPS V1.0
      </footer>
    </div>
  );
};
