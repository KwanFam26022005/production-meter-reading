import React, { useState } from 'react';
import {
  LayoutDashboard,
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
    { id: 'dashboard', label: 'Tổng quan', icon: <LayoutDashboard size={18} /> },
    { id: 'schedules', label: 'Lịch ghi', icon: <Calendar size={18} /> },
    { id: 'staff_roster', label: 'Lịch phân ca', icon: <Users size={18} /> },
    { id: 'meters', label: 'Công tơ', icon: <Zap size={18} /> },
    { id: 'reports', label: 'Báo cáo', icon: <BarChart3 size={18} /> },
    { id: 'audit', label: 'Nhật ký', icon: <ScrollText size={18} /> },
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

        {/* NAVY DESKTOP SIDEBAR */}
        <aside
          className={`admin-sidebar ${sidebarOpen ? 'open' : ''} ${sidebarCollapsed ? 'collapsed' : ''}`}
          role="navigation"
          aria-label="Menu quản trị"
        >
          <div className="admin-sidebar-brand">
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
                  title={sidebarCollapsed ? item.label : undefined}
                  aria-label={item.label}
                  aria-current={isActive ? 'page' : undefined}
                >
                  <span className="admin-nav-icon">{item.icon}</span>
                  {!sidebarCollapsed && <span className="admin-nav-label">{item.label}</span>}
                </button>
              );
            })}
          </nav>

          <div className="admin-sidebar-footer">
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

