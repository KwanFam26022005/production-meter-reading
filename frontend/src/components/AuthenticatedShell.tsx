import React, { useEffect, useRef, useState } from 'react';
import { ArrowLeft, LogOut, X } from 'lucide-react';
import { User, formatUserRole } from '../types';

export interface AuthenticatedShellProps {
  screenTitle?: string;
  screenSubtitle?: string;
  backLabel?: string;
  onBack?: () => void;
  onLogout?: () => void;
  user?: User | null;
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
  rightAction,
  children,
}) => {
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

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
                className="btn-account-avatar"
                onClick={() => setAccountMenuOpen((prev) => !prev)}
                aria-label="Mở menu tài khoản"
                aria-expanded={accountMenuOpen}
                aria-haspopup="dialog"
              >
                <span className="avatar-initial">{userInitial}</span>
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
