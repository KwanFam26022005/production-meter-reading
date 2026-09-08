import React, { useState, useEffect } from 'react';
import { Lock, User as UserIcon, LogIn, AlertCircle, Eye, EyeOff, Clock, Compass } from 'lucide-react';
import { login, ApiError } from '../services/api';
import { User } from '../types';
import loginPortWebp from '../assets/auth/auth-login-port.webp';
import loadingPortWebp from '../assets/auth/auth-loading-port.webp';

interface LoginViewProps {
  onLoginSuccess: (user: User) => void;
  sessionExpiredMessage?: string | null;
}

export const LoginView: React.FC<LoginViewProps> = ({
  onLoginSuccess,
  sessionExpiredMessage,
}) => {
  const [employeeCode, setEmployeeCode] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Preload loading hero image once on client
  useEffect(() => {
    const img = new Image();
    img.src = loadingPortWebp;
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;

    const trimmedCode = employeeCode.trim();
    if (!trimmedCode || !password) {
      setError('Vui lòng nhập đầy đủ Mã nhân viên và Mật khẩu.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const user = await login(trimmedCode, password);
      onLoginSuccess(user);
    } catch (err: unknown) {
      let msg = 'Không thể kết nối đến hệ thống. Kiểm tra kết nối mạng và thử lại.';
      if (err instanceof ApiError) {
        msg = err.message;
      } else if (err instanceof Error) {
        msg = err.message;
      }
      setError(msg);
      setLoading(false);
    }
  };

  return (
    <div className="auth-shell">
      {/* Port Operation Hero Area with Integrated Brand Header */}
      <section
        className="auth-hero-section"
        aria-label="Khung cảnh tác nghiệp Cảng Tân Thuận"
      >
        <div className="auth-hero-media">
          {/* Asset A: Realistic Login Port Hero */}
          <img
            src={loginPortWebp}
            alt="Khung cảnh bến cảng, tàu hàng và cẩu bờ Cảng Tân Thuận"
            className={`auth-hero-img auth-hero-login ${loading ? 'is-faded' : 'is-active'}`}
            loading="eager"
            decoding="async"
          />
          {/* Asset B: Realistic Operational Loading Hero */}
          <img
            src={loadingPortWebp}
            alt="Hiện trường tác nghiệp và nhân viên kiểm đếm"
            className={`auth-hero-img auth-hero-loading ${loading ? 'is-active' : 'is-faded'}`}
            loading="lazy"
            decoding="async"
          />
          <div className="auth-hero-overlay" aria-hidden="true" />
        </div>

        {/* Integrated Brand Header over top of hero */}
        <header className="auth-header" role="banner">
          <div className="auth-header-brand">
            <img
              src="/logo.png"
              alt="Logo Cảng Sài Gòn"
              className="auth-brand-logo"
              width={36}
              height={36}
            />
            <div className="auth-brand-text">
              <span className="auth-brand-title">CẢNG SÀI GÒN</span>
              <span className="auth-brand-subtitle">Trung tâm Tác nghiệp</span>
            </div>
          </div>
          <span className="auth-badge" aria-label="Mã phân hệ tác nghiệp">
            CSG-OPS
          </span>
        </header>

        {/* Subtle Ambient Tag */}
        <div className="auth-hero-ambient-tag" aria-hidden="true">
          <span className="auth-hero-dot" />
          <span>Hiện trường • Cảng Tân Thuận</span>
        </div>
      </section>

      {/* Login Card or Continuous Authenticating State */}
      <main className="auth-main" role="main">
        <div className="auth-card">
          {loading ? (
            /* Authenticating / Loading State */
            <div
              className="auth-loading-state"
              role="status"
              aria-live="polite"
              aria-atomic="true"
            >
              <div className="auth-loading-icon-wrap">
                <Compass className="auth-compass-spinner" size={32} strokeWidth={1.8} />
              </div>

              <h2 className="auth-loading-title">
                Đang xác thực phiên làm việc...
              </h2>
              <p className="auth-loading-subtitle">
                Kết nối hệ thống tác nghiệp Cảng Sài Gòn
              </p>

              <div className="auth-progress-track" aria-hidden="true">
                <div className="auth-progress-shimmer" />
              </div>

              <span className="auth-loading-wait">
                Vui lòng chờ trong giây lát
              </span>
            </div>
          ) : (
            /* Standard Login Form */
            <>
              <div className="auth-card-header">
                <h1 className="auth-card-title">Đăng nhập</h1>
                <p className="auth-card-subtitle">
                  Hệ thống tác nghiệp hiện trường
                </p>
              </div>

              {/* Session Expired Notice */}
              {sessionExpiredMessage && !error && (
                <div className="auth-alert auth-alert-warning" role="status">
                  <Clock size={16} strokeWidth={2} style={{ flexShrink: 0 }} />
                  <span>{sessionExpiredMessage}</span>
                </div>
              )}

              {/* Login Error Alert */}
              {error && (
                <div className="auth-alert auth-alert-error" role="alert">
                  <AlertCircle size={16} strokeWidth={2} style={{ flexShrink: 0 }} />
                  <span>{error}</span>
                </div>
              )}

              <form onSubmit={handleSubmit} className="auth-form" noValidate>
                <div className="auth-field">
                  <label htmlFor="employeeCode" className="auth-label">
                    Mã nhân viên
                  </label>
                  <div className="auth-input-wrap">
                    <UserIcon size={18} className="auth-input-icon" aria-hidden="true" />
                    <input
                      id="employeeCode"
                      type="text"
                      className="auth-input"
                      placeholder="Ví dụ: CSG-0102"
                      value={employeeCode}
                      onChange={(e) => {
                        setEmployeeCode(e.target.value);
                        if (error) setError(null);
                      }}
                      autoCapitalize="none"
                      autoComplete="username"
                      spellCheck={false}
                      inputMode="text"
                      disabled={loading}
                      required
                    />
                  </div>
                </div>

                <div className="auth-field">
                  <label htmlFor="password" className="auth-label">
                    Mật khẩu
                  </label>
                  <div className="auth-input-wrap">
                    <Lock size={18} className="auth-input-icon" aria-hidden="true" />
                    <input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      className="auth-input"
                      style={{ paddingRight: '48px' }}
                      placeholder="Nhập mật khẩu"
                      value={password}
                      onChange={(e) => {
                        setPassword(e.target.value);
                        if (error) setError(null);
                      }}
                      autoComplete="current-password"
                      disabled={loading}
                      required
                    />
                    <button
                      type="button"
                      className="auth-btn-pwd-toggle"
                      onClick={() => setShowPassword(!showPassword)}
                      aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                      tabIndex={0}
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  className="btn btn-primary auth-submit-btn"
                  disabled={loading}
                >
                  <LogIn size={19} strokeWidth={2} aria-hidden="true" />
                  <span>Đăng nhập</span>
                </button>
              </form>

              <div className="auth-support-text">
                <span>Không đăng nhập được? Liên hệ quản trị hệ thống.</span>
              </div>
            </>
          )}
        </div>
      </main>

      {/* Standardized Shell Footer */}
      <footer className="auth-footer" role="contentinfo">
        CÔNG TY CỔ PHẦN CẢNG SÀI GÒN &bull; CSG-OPS V1.0
      </footer>
    </div>
  );
};
