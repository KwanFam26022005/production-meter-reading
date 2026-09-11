import React, { useState, useEffect } from 'react';
import {
  Calendar,
  Users,
  Zap,
  BarChart3,
  ScrollText,
  LogOut,
  Menu,
  X,
  ShieldCheck,
  ChevronLeft,
  Map,
} from 'lucide-react';
import { User, formatUserRole } from '../../types';

export type AdminTab = 'dashboard' | 'schedules' | 'staff_roster' | 'meters' | 'reports' | 'audit';

interface AdminShellProps {
  user: User;
  activeTab: AdminTab;
  onSelectTab: (tab: AdminTab) => void;
  onLogout: () => void;
  children: React.ReactNode;
}

export const AdminShell: React.FC<AdminShellProps> = ({
  user,
  activeTab,
  onSelectTab,
  onLogout,
  children,
}) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    const handleToggle = () => setSidebarOpen((prev) => !prev);
    window.addEventListener('sgp-toggle-admin-sidebar', handleToggle);
    return () => window.removeEventListener('sgp-toggle-admin-sidebar', handleToggle);
  }, []);

  useEffect(() => {
    if (!sidebarOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        setSidebarOpen(false);
      }
    };
    document.addEventListener('keydown', handleKeyDown, true);
    return () => document.removeEventListener('keydown', handleKeyDown, true);
  }, [sidebarOpen]);

  const navItems: { id: AdminTab; label: string; icon: React.ReactNode }[] = [
    { id: 'dashboard', label: 'Bản đồ', icon: <Map size={22} /> },
    { id: 'schedules', label: 'Lịch ghi', icon: <Calendar size={22} /> },
    { id: 'staff_roster', label: 'Phân ca', icon: <Users size={22} /> },
    { id: 'meters', label: 'Công tơ', icon: <Zap size={22} /> },
    { id: 'reports', label: 'Báo cáo', icon: <BarChart3 size={22} /> },
    { id: 'audit', label: 'Nhật ký', icon: <ScrollText size={22} /> },
  ];

  return (
    <div className="admin-portal-root">
      {/* MOBILE / TABLET TOP BAR */}
      <header className="admin-mobile-topbar" role="banner">
        <button
          type="button"
          className="admin-sidebar-toggle-btn"
          onClick={() => setSidebarOpen((prev) => !prev)}
          aria-label={sidebarOpen ? 'Đóng menu' : 'Mở menu quản trị'}
        >
          {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
        </button>

        <div className="admin-mobile-brand">
          <img src="/icon-192.png" alt="Cảng Sài Gòn" className="admin-brand-logo-sm" />
          <span className="admin-mobile-title">Quản trị Vận hành</span>
        </div>

        <div className="admin-mobile-user">
          <span className="admin-badge-tag">ADMIN</span>
        </div>
      </header>

      <div className="admin-shell-layout">
        {/* SIDEBAR BACKDROP WHEN EXPANDED (DESKTOP & MOBILE) */}
        {sidebarOpen && (
          <div
            className="admin-sidebar-backdrop"
            onClick={() => setSidebarOpen(false)}
            aria-hidden="true"
          />
        )}

        {/* PERMANENT DESKTOP NAVY RAIL (80px COLLAPSED) */}
        <aside
          className="admin-sidebar rail-mode"
          role="navigation"
          aria-label="Menu quản trị"
        >
          <div className="admin-sidebar-brand">
            <button
              type="button"
              className="admin-sidebar-rail-menu-btn"
              onClick={() => setSidebarOpen(true)}
              title="Mở rộng menu quản trị"
              aria-label="Mở rộng menu quản trị"
            >
              <img src="/icon-192.png" alt="Cảng Sài Gòn" className="admin-rail-brand-icon" />
            </button>
          </div>

          <nav className="admin-nav-list">
            {navItems.map((item) => {
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  className={`admin-nav-item ${isActive ? 'active' : ''}`}
                  onClick={() => {
                    onSelectTab(item.id);
                    setSidebarOpen(false);
                  }}
                  title={item.label}
                  aria-label={item.label}
                  aria-current={isActive ? 'page' : undefined}
                >
                  <span className="admin-nav-icon">{item.icon}</span>
                  <span className="admin-nav-label">{item.label}</span>
                </button>
              );
            })}
          </nav>

          <div className="admin-sidebar-footer">
            <div className="admin-sidebar-rail-footer" title="Cảng Tân Thuận v1.0.0">
              <span className="admin-rail-port-title">CẢNG TÂN THUẬN</span>
              <span className="admin-rail-version">v1.0.0</span>
              <div className="admin-rail-user-actions">
                <button
                  type="button"
                  className="admin-rail-avatar-btn"
                  onClick={() => setSidebarOpen(true)}
                  title={`${user.full_name} (${formatUserRole(user.role)}) — Mở thông tin`}
                  aria-label="Thông tin tài khoản"
                >
                  <div className="admin-rail-avatar">
                    {user.full_name?.charAt(0).toUpperCase() || 'A'}
                  </div>
                </button>
                <button
                  type="button"
                  className="admin-rail-logout-btn"
                  onClick={onLogout}
                  title="Đăng xuất"
                  aria-label="Đăng xuất khỏi hệ thống quản trị"
                >
                  <LogOut size={16} />
                </button>
              </div>
            </div>
          </div>
        </aside>

        {/* EXPANDED OVERLAY DRAWER (320px) */}
        {sidebarOpen && (
          <aside
            className="admin-sidebar-expanded-drawer"
            role="dialog"
            aria-label="Menu quản trị mở rộng"
            aria-modal="true"
          >
            <div className="admin-drawer-brand">
              <div className="admin-drawer-brand-info">
                <img src="/logo.png" alt="Cảng Sài Gòn" className="admin-drawer-brand-logo" />
                <div className="admin-drawer-brand-text">
                  <span className="admin-drawer-brand-corp">CẢNG SÀI GÒN</span>
                  <span className="admin-drawer-brand-sub">Quản trị Vận hành</span>
                </div>
              </div>
              <button
                type="button"
                className="admin-drawer-close-btn"
                onClick={() => setSidebarOpen(false)}
                title="Thu gọn menu (ESC)"
                aria-label="Thu gọn menu"
              >
                <ChevronLeft size={20} />
              </button>
            </div>

            <nav className="admin-drawer-nav-list">
              {navItems.map((item) => {
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    className={`admin-drawer-nav-item ${isActive ? 'active' : ''}`}
                    onClick={() => {
                      onSelectTab(item.id);
                      setSidebarOpen(false);
                    }}
                    title={item.label}
                    aria-label={item.label}
                    aria-current={isActive ? 'page' : undefined}
                  >
                    <span className="admin-drawer-nav-icon">{item.icon}</span>
                    <span className="admin-drawer-nav-label">{item.label}</span>
                    {isActive && <span className="admin-drawer-active-dot" />}
                  </button>
                );
              })}
            </nav>

            <div className="admin-drawer-footer">
              <div
                className="admin-drawer-user-card"
                title={`${user.full_name} (${formatUserRole(user.role)})`}
              >
                <div className="admin-avatar">
                  {user.full_name?.charAt(0).toUpperCase() || 'A'}
                </div>
                <div className="admin-user-details">
                  <span className="admin-user-name" title={user.full_name}>
                    {user.full_name}
                  </span>
                  <div className="admin-role-line">
                    <ShieldCheck size={12} className="admin-role-icon" />
                    <span className="admin-user-role">{formatUserRole(user.role)}</span>
                  </div>
                </div>
              </div>

              <button
                type="button"
                className="admin-logout-btn"
                onClick={onLogout}
                title="Đăng xuất"
                aria-label="Đăng xuất khỏi hệ thống quản trị"
              >
                <LogOut size={16} />
                <span>Đăng xuất</span>
              </button>

              <div className="admin-drawer-version-tag">
                <span>Cảng Tân Thuận · v1.0.0</span>
              </div>
            </div>
          </aside>
        )}

        {/* MAIN DESKTOP CONTENT AREA */}
        <main className="admin-main-viewport" role="main">
          {children}
        </main>
      </div>
    </div>
  );
};

