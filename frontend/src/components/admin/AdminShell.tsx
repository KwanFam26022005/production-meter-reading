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
  ChevronRight,
  Map,
  Anchor,
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

  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    try {
      return localStorage.getItem('csg_admin_sidebar_collapsed') === 'true';
    } catch {
      return false;
    }
  });

  const toggleCollapse = () => {
    setSidebarCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('csg_admin_sidebar_collapsed', String(next));
      } catch {
        // ignore
      }
      return next;
    });
  };

  const navItems: { id: AdminTab; label: string; icon: React.ReactNode }[] = [
    { id: 'dashboard', label: 'Bản đồ', icon: <Map size={22} /> },
    { id: 'schedules', label: 'Lịch ghi', icon: <Calendar size={22} /> },
    { id: 'staff_roster', label: 'Phân ca', icon: <Users size={22} /> },
    { id: 'meters', label: 'Công tơ', icon: <Zap size={22} /> },
    { id: 'reports', label: 'Báo cáo', icon: <BarChart3 size={22} /> },
    { id: 'audit', label: 'Nhật ký', icon: <ScrollText size={22} /> },
  ];

  const isMapMode = activeTab === 'dashboard';

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
          <img src="/logo.png" alt="Cảng Sài Gòn" className="admin-brand-logo-sm" />
          <span className="admin-mobile-title">Quản trị Vận hành</span>
        </div>

        <div className="admin-mobile-user">
          <span className="admin-badge-tag">ADMIN</span>
        </div>
      </header>

      <div className="admin-shell-layout">
        {/* SIDEBAR BACKDROP ON SMALL SCREENS */}
        {sidebarOpen && (
          <div
            className="admin-sidebar-backdrop"
            onClick={() => setSidebarOpen(false)}
            aria-hidden="true"
          />
        )}

        {/* NAVY DESKTOP SIDEBAR / MARITIME RAIL */}
        <aside
          className={`admin-sidebar ${sidebarOpen ? 'open' : ''} ${sidebarCollapsed ? 'collapsed' : ''} ${isMapMode ? 'rail-mode' : ''}`}
          role="navigation"
          aria-label="Menu quản trị"
        >
          <div className="admin-sidebar-brand">
            {isMapMode ? (
              <button
                type="button"
                className="admin-sidebar-rail-menu-btn"
                onClick={() => setSidebarOpen((prev) => !prev)}
                title="Menu quản trị"
                aria-label="Menu quản trị"
              >
                <Menu size={20} />
              </button>
            ) : (
              <>
                <div className="admin-brand-plate" title="Cảng Sài Gòn">
                  <img src="/logo.png" alt="Logo Cảng Sài Gòn" className="admin-brand-logo" />
                </div>
                {!sidebarCollapsed && (
                  <div className="admin-brand-info">
                    <span className="admin-brand-corp">CẢNG SÀI GÒN</span>
                    <span className="admin-brand-desc">Quản trị vận hành</span>
                  </div>
                )}
                <button
                  type="button"
                  className="admin-sidebar-collapse-btn"
                  onClick={toggleCollapse}
                  title={sidebarCollapsed ? 'Mở rộng menu (Phím tắt)' : 'Thu gọn menu để mở rộng không gian'}
                  aria-label={sidebarCollapsed ? 'Mở rộng menu' : 'Thu gọn menu'}
                >
                  {sidebarCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
                </button>
                {sidebarOpen && (
                  <button
                    type="button"
                    className="admin-sidebar-close-btn"
                    onClick={() => setSidebarOpen(false)}
                    title="Đóng menu điều hướng (ESC)"
                    aria-label="Đóng menu điều hướng"
                  >
                    <X size={16} />
                  </button>
                )}
              </>
            )}
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
            {isMapMode ? (
              <div className="admin-sidebar-rail-footer" title="Cảng Tân Thuận v1.0.0">
                <Anchor size={22} className="admin-rail-anchor-icon" />
                <span className="admin-rail-port-title">CẢNG TÂN THUẬN</span>
                <span className="admin-rail-version">v1.0.0</span>
              </div>
            ) : (
              <>
                <div className="admin-user-card" title={sidebarCollapsed ? `${user.full_name} (${formatUserRole(user.role)})` : undefined}>
                  <div className="admin-avatar">
                    {user.full_name?.charAt(0).toUpperCase() || 'A'}
                  </div>
                  {!sidebarCollapsed && (
                    <div className="admin-user-details">
                      <span className="admin-user-name" title={user.full_name}>
                        {user.full_name}
                      </span>
                      <div className="admin-role-line">
                        <ShieldCheck size={12} className="admin-role-icon" />
                        <span className="admin-user-role">{formatUserRole(user.role)}</span>
                      </div>
                    </div>
                  )}
                </div>

                <button
                  type="button"
                  className="admin-logout-btn"
                  onClick={onLogout}
                  title="Đăng xuất"
                  aria-label="Đăng xuất khỏi hệ thống quản trị"
                >
                  <LogOut size={16} />
                  {!sidebarCollapsed && <span>Đăng xuất</span>}
                </button>
              </>
            )}
          </div>
        </aside>

        {/* MAIN DESKTOP CONTENT AREA */}
        <main className={`admin-main-viewport ${sidebarCollapsed ? 'expanded-viewport' : ''}`} role="main">
          {children}
        </main>
      </div>
    </div>
  );
};

