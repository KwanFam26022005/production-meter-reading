import React, { useEffect, useState } from 'react';
import { ShieldAlert, LogOut, ArrowLeft } from 'lucide-react';
import { User } from '../../types';
import { getMe, logout, setOnAuthExpired } from '../../services/api';
import { LoginView } from '../../components/LoginView';
import { LoadingState } from '../../components/ui/LoadingState';
import { LogoutConfirmModal } from '../../components/LogoutConfirmModal';
import { AdminShell, AdminTab } from '../../components/admin/AdminShell';
import { AdminDashboard } from '../../components/admin/AdminDashboard';
import { AdminSchedules } from '../../components/admin/AdminSchedules';
import { AdminStaffRoster } from '../../components/admin/AdminStaffRoster';
import { AdminAudit } from '../../components/admin/AdminAudit';
import { AdminReports } from '../../components/admin/AdminReports';
import { AdminReadingInspection } from '../../components/admin/AdminReadingInspection';
import { AdminVerification } from '../../components/admin/AdminVerification';
import { AdminDevicesWorkspace } from '../../components/admin/AdminDevicesWorkspace';
import { MapV2Workspace } from '../../components/map-v2/MapV2Workspace';
import { OperationalWorkspaceProvider, useOperationalWorkspace } from '../../context/OperationalWorkspaceContext';

interface AdminWorkspaceContentProps {
  currentUser: User;
  onLogout: () => void;
  isLogoutModalOpen: boolean;
  isLoggingOut: boolean;
  logoutError: string | null;
  handleConfirmLogout: () => void;
  handleCancelLogout: () => void;
}

const AdminWorkspaceContent: React.FC<AdminWorkspaceContentProps> = ({
  currentUser,
  onLogout,
  isLogoutModalOpen,
  isLoggingOut,
  logoutError,
  handleConfirmLogout,
  handleCancelLogout,
}) => {
  const {
    activeTab,
    setActiveTab,
    inspectingReadingId,
    setInspectingReadingId,
    setDeviceSegment,
  } = useOperationalWorkspace();

  const adminActiveTab = activeTab;

  const handleSelectTab = (tab: AdminTab) => {
    setInspectingReadingId(null);
    if (tab === 'meters') {
      setDeviceSegment('METERS');
      setActiveTab('meters');
      return;
    }
    if (tab === 'assets') {
      setDeviceSegment('ASSETS');
      setActiveTab('assets');
      return;
    }
    setActiveTab(tab);
  };

  return (
    <AdminShell
      user={currentUser}
      activeTab={adminActiveTab}
      onSelectTab={handleSelectTab}
      onLogout={onLogout}
    >
      {/* Detail overlay: inspect reading evidence modal */}
      {inspectingReadingId && (
        <AdminReadingInspection
          readingId={inspectingReadingId}
          onBack={() => setInspectingReadingId(null)}
          onSelectReading={(nextReadingId) => setInspectingReadingId(nextReadingId)}
        />
      )}

      {/* Active tab content: strictly isolate lifecycle so only active page is mounted */}
      {!inspectingReadingId && (
        <>
          {adminActiveTab === 'dashboard' && (
            <AdminDashboard user={currentUser} onInspectReading={(rId) => setInspectingReadingId(rId)} />
          )}
          {adminActiveTab === 'assets' && (
            <AdminDevicesWorkspace onInspectReading={(rId) => setInspectingReadingId(rId)} />
          )}
          {adminActiveTab === 'verification' && <AdminVerification />}
          {adminActiveTab === 'schedules' && (
            <AdminSchedules onInspectReading={(rId) => setInspectingReadingId(rId)} />
          )}
          {adminActiveTab === 'staff_roster' && <AdminStaffRoster user={currentUser} />}
          {adminActiveTab === 'meters' && (
            <AdminDevicesWorkspace onInspectReading={(rId) => setInspectingReadingId(rId)} />
          )}
          {adminActiveTab === 'reports' && (
            <AdminReports
              user={currentUser}
              onBackToDashboard={() => handleSelectTab('dashboard')}
              onInspectReading={(rId) => setInspectingReadingId(rId)}
            />
          )}
          {adminActiveTab === 'audit' && <AdminAudit />}
          {adminActiveTab === 'map_v2' && <MapV2Workspace />}
        </>
      )}

      <LogoutConfirmModal
        isOpen={isLogoutModalOpen}
        hasUnsavedWork={false}
        isLoggingOut={isLoggingOut}
        error={logoutError}
        onConfirm={handleConfirmLogout}
        onCancel={handleCancelLogout}
      />
    </AdminShell>
  );
};

export default function OperationsApp() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [authChecking, setAuthChecking] = useState<boolean>(true);
  const [sessionExpiredMessage, setSessionExpiredMessage] = useState<string | null>(null);
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState<boolean>(false);
  const [isLoggingOut, setIsLoggingOut] = useState<boolean>(false);
  const [logoutError, setLogoutError] = useState<string | null>(null);

  const [adminActiveTab, setAdminActiveTab] = useState<AdminTab>(() => {
    try {
      const params = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
      const tabParam = params?.get('tab');
      if (tabParam && ['dashboard', 'assets', 'verification', 'schedules', 'staff_roster', 'meters', 'reports', 'audit', 'map_v2'].includes(tabParam)) {
        return tabParam as AdminTab;
      }
      const saved = sessionStorage.getItem('admin_active_tab');
      if (saved && ['dashboard', 'assets', 'verification', 'schedules', 'staff_roster', 'meters', 'reports', 'audit', 'map_v2'].includes(saved)) {
        return saved as AdminTab;
      }
    } catch {}
    return 'dashboard';
  });

  const handleSelectAdminTab = (tab: AdminTab) => {
    setAdminActiveTab(tab);
    try {
      sessionStorage.setItem('admin_active_tab', tab);
      if (typeof window !== 'undefined') {
        const url = new URL(window.location.href);
        url.searchParams.set('tab', tab);
        window.history.replaceState({}, '', url.toString());
      }
    } catch {}
  };

  useEffect(() => {
    const handleLocationChange = () => {
      try {
        const params = new URLSearchParams(window.location.search);
        const tabParam = params.get('tab');
        if (tabParam && ['dashboard', 'assets', 'verification', 'schedules', 'staff_roster', 'meters', 'reports', 'audit', 'map_v2'].includes(tabParam)) {
          setAdminActiveTab(tabParam as AdminTab);
        }
      } catch {}
    };
    window.addEventListener('popstate', handleLocationChange);
    return () => window.removeEventListener('popstate', handleLocationChange);
  }, []);

  // Central Auth Expiration Listener
  useEffect(() => {
    setOnAuthExpired((msg) => {
      setCurrentUser(null);
      setSessionExpiredMessage(msg);
      setIsLogoutModalOpen(false);
    });
    return () => {
      setOnAuthExpired(null);
    };
  }, []);

  // Bootstrap session authentication on application startup
  useEffect(() => {
    let mounted = true;
    getMe()
      .then((user) => {
        if (mounted) {
          setCurrentUser(user);
          setSessionExpiredMessage(null);
        }
      })
      .catch(() => {
        if (mounted) {
          setCurrentUser(null);
        }
      })
      .finally(() => {
        if (mounted) {
          setAuthChecking(false);
        }
      });
    return () => {
      mounted = false;
    };
  }, []);

  const handleOpenLogoutModal = () => {
    setLogoutError(null);
    setIsLogoutModalOpen(true);
  };

  const handleCancelLogout = () => {
    if (!isLoggingOut) {
      setLogoutError(null);
      setIsLogoutModalOpen(false);
    }
  };

  const handleConfirmLogout = async () => {
    setIsLoggingOut(true);
    setLogoutError(null);
    try {
      await logout();
      setIsLogoutModalOpen(false);
      setLogoutError(null);
      setCurrentUser(null);
      setSessionExpiredMessage(null);
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : 'Không thể kết nối để đăng xuất. Vui lòng thử lại.';
      setLogoutError(msg);
    } finally {
      setIsLoggingOut(false);
    }
  };

  // 1. Initial Session Checking State
  if (authChecking) {
    return (
      <div className="app-container" style={{ justifyContent: 'center', alignItems: 'center' }}>
        <LoadingState message="Đang xác thực quyền quản trị..." />
      </div>
    );
  }

  // 2. Unauthenticated State -> Login View
  if (!currentUser) {
    return (
      <LoginView
        sessionExpiredMessage={sessionExpiredMessage}
        onLoginSuccess={(user) => {
          setCurrentUser(user);
          setSessionExpiredMessage(null);
        }}
      />
    );
  }

  // 2.5 Access Denied for Non-Admin on Operations Portal (Strict RBAC Boundary)
  if (currentUser.role !== 'ADMIN') {
    return (
      <div className="app-container" style={{ justifyContent: 'center', alignItems: 'center', padding: '24px', textAlign: 'center', minHeight: '100vh', background: '#F8FAFC' }}>
        <div style={{ maxWidth: '460px', background: '#ffffff', borderRadius: '16px', padding: '36px 28px', boxShadow: '0 4px 24px rgba(0,0,0,0.06)', border: '1px solid #E2E8F0' }}>
          <div style={{ width: '60px', height: '60px', borderRadius: '50%', background: '#FEF2F2', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px auto', color: '#DC2626' }}>
            <ShieldAlert size={32} />
          </div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: '700', color: '#0F172A', marginBottom: '8px' }}>
            Truy cập bị từ chối (403)
          </h2>
          <p style={{ fontSize: '0.9rem', color: '#475569', lineHeight: 1.5, marginBottom: '24px' }}>
            Cổng Điều hành chỉ dành cho <strong>Quản trị viên</strong> và <strong>Cán bộ điều hành cảng</strong>. Tài khoản của bạn (<strong>{currentUser.full_name}</strong> - <code>{currentUser.employee_code}</code>) không có quyền truy cập không gian này.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {(() => {
              const envUserUrl = import.meta.env.VITE_USER_PORTAL_URL as string | undefined;
              const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
              const targetUrl = envUserUrl || (isLocal ? `${window.location.protocol}//${window.location.hostname}:5173` : null);
              if (targetUrl) {
                return (
                  <button
                    type="button"
                    className="btn btn-primary"
                    style={{ display: 'inline-flex', justifyContent: 'center', alignItems: 'center' }}
                    onClick={() => {
                      window.location.href = targetUrl;
                    }}
                  >
                    <ArrowLeft size={16} style={{ marginRight: '6px' }} />
                    Chuyển sang Cổng Nhân viên Hiện trường
                  </button>
                );
              }
              return (
                <div style={{ padding: '8px 12px', background: '#F1F5F9', borderRadius: '8px', fontSize: '0.85rem', color: '#475569' }}>
                  Vui lòng mở Cổng Nhân viên Hiện trường từ đường dẫn riêng do launcher cung cấp.
                </div>
              );
            })()}
            <button
              type="button"
              className="btn btn-secondary"
              onClick={handleOpenLogoutModal}
              style={{ display: 'inline-flex', justifyContent: 'center', alignItems: 'center' }}
            >
              <LogOut size={16} style={{ marginRight: '6px' }} />
              Đăng xuất
            </button>
          </div>
        </div>
        <LogoutConfirmModal
          isOpen={isLogoutModalOpen}
          hasUnsavedWork={false}
          isLoggingOut={isLoggingOut}
          error={logoutError}
          onConfirm={handleConfirmLogout}
          onCancel={handleCancelLogout}
        />
      </div>
    );
  }

  // 3. Authenticated Admin Persona (Desktop-first Operational Workspace)
  return (
    <OperationalWorkspaceProvider
      initialTab={adminActiveTab}
      onTabChange={handleSelectAdminTab}
    >
      <AdminWorkspaceContent
        currentUser={currentUser}
        onLogout={handleOpenLogoutModal}
        isLogoutModalOpen={isLogoutModalOpen}
        isLoggingOut={isLoggingOut}
        logoutError={logoutError}
        handleConfirmLogout={handleConfirmLogout}
        handleCancelLogout={handleCancelLogout}
      />
    </OperationalWorkspaceProvider>
  );
}
