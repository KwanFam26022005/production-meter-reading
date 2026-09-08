import React, { useEffect, useRef, useState } from 'react';
import {
  Camera,
  RotateCcw,
  CheckCircle2,
  Clock,
  Check,
  RefreshCw,
  ArrowLeft,
  Calendar,
  AlertCircle,
} from 'lucide-react';
import { AttendanceActionResponse, TodayAttendance, User } from '../types';
import { ApiError, getTodayAttendance, submitAttendance } from '../services/api';
import { AuthenticatedShell } from './AuthenticatedShell';
import { LoadingState } from './ui/LoadingState';
import { ErrorState } from './ui/ErrorState';

interface AttendanceViewProps {
  user: User;
  onBackToHome: () => void;
}

type AttendanceSubScreen =
  | 'overview'
  | 'camera'
  | 'preview'
  | 'processing'
  | 'success'
  | 'error';

function formatVnDate(isoDateStr?: string): string {
  if (!isoDateStr) return 'Hôm nay';
  const parts = isoDateStr.split('-');
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return isoDateStr;
}

export const AttendanceView: React.FC<AttendanceViewProps> = ({
  user,
  onBackToHome,
}) => {
  const [subScreen, setSubScreen] = useState<AttendanceSubScreen>('overview');
  const [targetAction, setTargetAction] = useState<'CHECK_IN' | 'CHECK_OUT'>('CHECK_IN');
  const [attendanceData, setAttendanceData] = useState<TodayAttendance | null>(null);
  const [loadingOverview, setLoadingOverview] = useState<boolean>(true);
  const [overviewError, setOverviewError] = useState<string | null>(null);

  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [capturedFile, setCapturedFile] = useState<File | null>(null);
  const [actionResult, setActionResult] = useState<AttendanceActionResponse | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isConflictError, setIsConflictError] = useState<boolean>(false);
  const [isNetworkError, setIsNetworkError] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Live Camera refs
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const [cameraPermissionError, setCameraPermissionError] = useState<boolean>(false);

  // Load today's attendance status
  const fetchStatus = async () => {
    setLoadingOverview(true);
    setOverviewError(null);
    try {
      const data = await getTodayAttendance();
      setAttendanceData(data);
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : 'Không thể tải dữ liệu chấm công.';
      setOverviewError(msg);
    } finally {
      setLoadingOverview(false);
    }
  };

  useEffect(() => {
    fetchStatus();
  }, []);

  // Cleanup media stream helper
  const stopMediaStream = () => {
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }
  };

  useEffect(() => {
    return () => {
      stopMediaStream();
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  // Start live front-facing camera
  const startCamera = async () => {
    setCameraPermissionError(false);
    stopMediaStream();

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Trình duyệt không hỗ trợ truy cập camera trực tiếp.');
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: 'user' },
          width: { ideal: 720 },
          height: { ideal: 960 },
        },
        audio: false,
      });

      mediaStreamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch(() => {});
      }
    } catch {
      setCameraPermissionError(true);
    }
  };

  const handleStartAttendance = (action: 'CHECK_IN' | 'CHECK_OUT') => {
    setTargetAction(action);
    setErrorMessage(null);
    setIsConflictError(false);
    setIsNetworkError(false);
    setActionResult(null);
    setSubScreen('camera');
    setTimeout(() => {
      startCamera();
    }, 50);
  };

  // Capture frame from video canvas at intrinsic dimensions
  const handleCapturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;

    canvas.width = video.videoWidth || 720;
    canvas.height = video.videoHeight || 960;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Flip horizontally to mirror selfie
    ctx.translate(canvas.width, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    canvas.toBlob(
      (blob) => {
        stopMediaStream();
        if (!blob) {
          setErrorMessage('Không thể tạo ảnh chụp. Vui lòng thử lại.');
          setIsConflictError(false);
          setIsNetworkError(false);
          setSubScreen('error');
          return;
        }

        const file = new File([blob], `selfie_${Date.now()}.jpg`, {
          type: 'image/jpeg',
        });
        setCapturedFile(file);

        if (previewUrl) {
          URL.revokeObjectURL(previewUrl);
        }
        const url = URL.createObjectURL(blob);
        setPreviewUrl(url);
        setSubScreen('preview');
      },
      'image/jpeg',
      0.9
    );
  };

  // Fallback file input change
  const handleFallbackFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const file = files[0];
      if (!file.type.startsWith('image/')) {
        setErrorMessage('Vui lòng chọn tệp hình ảnh hợp lệ (JPG, PNG).');
        setIsConflictError(false);
        setIsNetworkError(false);
        setSubScreen('error');
        return;
      }
      setCapturedFile(file);
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
      setSubScreen('preview');
    }
  };

  const handleRetake = () => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
    setCapturedFile(null);
    setErrorMessage(null);
    setIsConflictError(false);
    setIsNetworkError(false);
    setSubScreen('camera');
    setTimeout(() => {
      startCamera();
    }, 50);
  };

  const handleConfirmSubmit = async () => {
    if (!capturedFile || isSubmitting) return;

    setIsSubmitting(true);
    setErrorMessage(null);
    setIsConflictError(false);
    setIsNetworkError(false);

    try {
      const result = await submitAttendance(
        targetAction,
        capturedFile,
        cameraPermissionError ? 'fallback_file_input' : 'live_camera'
      );
      setActionResult(result);
      setSubScreen('success');
      // Refresh status in background
      fetchStatus();
    } catch (err: unknown) {
      if (err instanceof ApiError && err.status === 409) {
        // Duplicate action on server
        setIsConflictError(true);
        setErrorMessage(err.message);
        fetchStatus();
      } else if (err instanceof ApiError && err.status === 0) {
        // Network error before response
        setIsNetworkError(true);
        setErrorMessage('Không thể kết nối đến hệ thống. Vui lòng thử lại.');
      } else {
        const msg =
          err instanceof Error ? err.message : 'Không thể ghi nhận chấm công.';
        setErrorMessage(msg);
      }
      setSubScreen('error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AuthenticatedShell
      screenTitle="CHẤM CÔNG CA LÀM"
      screenSubtitle="Tác nghiệp hiện trường"
      backLabel="Trang chủ"
      onBack={() => {
        stopMediaStream();
        onBackToHome();
      }}
    >
      {/* Hidden Fallback Input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="user"
        className="hidden-input"
        onChange={handleFallbackFileInput}
        aria-label="Chụp ảnh chấm công dự phòng"
      />
      <canvas ref={canvasRef} style={{ display: 'none' }} />

      {/* 1. OVERVIEW SCREEN */}
      {subScreen === 'overview' && (
        <div className="attendance-content-flow">
          {/* Section Heading */}
          <div className="screen-heading">
            <h1 className="screen-title">Trạng thái ca làm việc</h1>
            <p className="screen-instruction">
              Ghi nhận ảnh minh chứng vào ca và tan ca theo thời gian thực.
            </p>
          </div>

          {loadingOverview ? (
            <LoadingState message="Đang kiểm tra dữ liệu chấm công..." />
          ) : overviewError ? (
            <ErrorState
              title="Không thể tải dữ liệu chấm công"
              message={overviewError}
              onRetry={fetchStatus}
            />
          ) : attendanceData ? (
            <>
              {/* A. TODAY STATUS CARD */}
              <section className="attendance-summary-card" aria-label="Tổng quan chấm công hôm nay">
                <div className="summary-date-row">
                  <div className="summary-date-left">
                    <Calendar size={15} />
                    <span className="summary-date-label">HÔM NAY</span>
                  </div>
                  <span className="summary-date-val">{formatVnDate(attendanceData.date)}</span>
                </div>

                <div className="attendance-status-block">
                  {!attendanceData.check_in && (
                    <div className="status-hero-state state-pending">
                      <div className="status-hero-icon">
                        <AlertCircle size={24} strokeWidth={2.2} />
                      </div>
                      <div className="status-hero-text">
                        <h2 className="status-hero-title">Chưa vào ca</h2>
                        <p className="status-hero-desc">
                          Cần chấm công vào ca để bắt đầu ghi nhận thời gian làm việc.
                        </p>
                      </div>
                    </div>
                  )}

                  {attendanceData.check_in && !attendanceData.check_out && (
                    <div className="status-hero-state state-active">
                      <div className="status-hero-icon">
                        <Clock size={24} strokeWidth={2.2} />
                      </div>
                      <div className="status-hero-text">
                        <h2 className="status-hero-title">Đang trong ca làm việc</h2>
                        <p className="status-hero-desc">
                          Đã vào ca lúc {attendanceData.check_in.formatted_time.split(' - ')[0]}
                        </p>
                      </div>
                    </div>
                  )}

                  {attendanceData.check_in && attendanceData.check_out && (
                    <div className="status-hero-state state-completed">
                      <div className="status-hero-icon">
                        <CheckCircle2 size={24} strokeWidth={2.2} />
                      </div>
                      <div className="status-hero-text">
                        <h2 className="status-hero-title">Đã hoàn tất ca làm việc</h2>
                        <p className="status-hero-desc">
                          Vào ca: {attendanceData.check_in.formatted_time.split(' - ')[0]} &bull; Tan ca:{' '}
                          {attendanceData.check_out.formatted_time.split(' - ')[0]}
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                {/* B. PRIMARY ACTION BUTTON */}
                <div className="attendance-primary-action-wrap">
                  {attendanceData.allowed_action === 'CHECK_IN' && (
                    <button
                      type="button"
                      className="btn btn-primary btn-lg"
                      onClick={() => handleStartAttendance('CHECK_IN')}
                      aria-label="Chấm công vào ca làm việc"
                    >
                      <Clock size={20} strokeWidth={2.2} />
                      <span>Chấm công vào ca</span>
                    </button>
                  )}

                  {attendanceData.allowed_action === 'CHECK_OUT' && (
                    <button
                      type="button"
                      className="btn btn-primary btn-lg"
                      onClick={() => handleStartAttendance('CHECK_OUT')}
                      aria-label="Chấm công tan ca làm việc"
                    >
                      <Clock size={20} strokeWidth={2.2} />
                      <span>Chấm công tan ca</span>
                    </button>
                  )}

                  {attendanceData.allowed_action === null && (
                    <div className="attendance-completed-banner" role="status">
                      <CheckCircle2 size={20} strokeWidth={2.2} />
                      <span>Bạn đã hoàn tất chấm công đầy đủ hôm nay.</span>
                    </div>
                  )}
                </div>
              </section>

              {/* C. TODAY'S ACTIVITY TIMELINE */}
              <section className="attendance-timeline-card" aria-label="Lịch sử chấm công hôm nay">
                <h3 className="timeline-section-title">LỊCH SỬ CHẤM CÔNG HÔM NAY</h3>
                <div className="summary-events-list">
                  {/* Event 1: Vào ca */}
                  <div className="summary-event-item">
                    <div className="event-item-left">
                      <div
                        className={`event-dot ${
                          attendanceData.check_in ? 'dot-success' : 'dot-pending'
                        }`}
                        aria-hidden="true"
                      />
                      <div>
                        <div className="event-type-name">Chấm công Vào ca</div>
                        <div className="event-time-desc">
                          {attendanceData.check_in
                            ? attendanceData.check_in.formatted_time
                            : 'Chưa ghi nhận'}
                        </div>
                      </div>
                    </div>
                    {attendanceData.check_in ? (
                      <span className="status-pill status-pill-success">Hợp lệ</span>
                    ) : (
                      <span className="status-pill status-pill-pending">Chưa có</span>
                    )}
                  </div>

                  {/* Event 2: Tan ca */}
                  <div className="summary-event-item">
                    <div className="event-item-left">
                      <div
                        className={`event-dot ${
                          attendanceData.check_out ? 'dot-success' : 'dot-pending'
                        }`}
                        aria-hidden="true"
                      />
                      <div>
                        <div className="event-type-name">Chấm công Tan ca</div>
                        <div className="event-time-desc">
                          {attendanceData.check_out
                            ? attendanceData.check_out.formatted_time
                            : 'Chưa ghi nhận'}
                        </div>
                      </div>
                    </div>
                    {attendanceData.check_out ? (
                      <span className="status-pill status-pill-success">Hợp lệ</span>
                    ) : (
                      <span className="status-pill status-pill-pending">Chưa có</span>
                    )}
                  </div>
                </div>
              </section>
            </>
          ) : null}
        </div>
      )}

      {/* 2. CAMERA SCREEN */}
      {subScreen === 'camera' && (
        <div className="attendance-content-flow">
          <div className="screen-heading">
            <h2 className="screen-title">
              {targetAction === 'CHECK_IN' ? 'Chụp ảnh Vào ca' : 'Chụp ảnh Tan ca'}
            </h2>
            <p className="screen-instruction">
              Giữ khuôn mặt trong khung để làm ảnh xác minh chấm công.
            </p>
          </div>

          {cameraPermissionError ? (
            <div className="camera-permission-box" role="alert">
              <AlertCircle size={36} strokeWidth={2} className="warning-icon" />
              <h3 className="camera-err-title">Không thể mở camera trực tiếp</h3>
              <p className="camera-err-desc">
                Trình duyệt chưa được cấp quyền Camera hoặc thiết bị không hỗ trợ. Hãy cấp
                quyền Camera cho Safari và thử lại, hoặc chọn ảnh từ máy.
              </p>
              <div className="button-stack" style={{ width: '100%', marginTop: '8px' }}>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={startCamera}
                  aria-label="Thử lại mở camera"
                >
                  <RefreshCw size={18} strokeWidth={2} />
                  Thử lại camera
                </button>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => fileInputRef.current?.click()}
                  aria-label="Chọn ảnh chụp từ thiết bị"
                >
                  <Camera size={18} strokeWidth={2} />
                  Chọn ảnh từ máy
                </button>
              </div>
            </div>
          ) : (
            <div className="live-camera-viewport">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="live-video-element"
              />
              <div className="portrait-oval-guide" aria-hidden="true">
                <div className="oval-outline" />
                <span className="oval-guide-text">GIỮ KHUÔN MẶT TRONG KHUNG</span>
              </div>
            </div>
          )}

          <div className="button-stack" style={{ marginTop: '16px' }}>
            {!cameraPermissionError && (
              <button
                type="button"
                className="btn btn-primary btn-lg"
                onClick={handleCapturePhoto}
                aria-label="Chụp ảnh xác minh chấm công"
              >
                <Camera size={20} strokeWidth={2.2} />
                <span>Chụp ảnh</span>
              </button>
            )}
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => {
                stopMediaStream();
                setSubScreen('overview');
              }}
              aria-label="Hủy thao tác và quay lại"
            >
              Hủy thao tác
            </button>
          </div>
        </div>
      )}

      {/* 3. PREVIEW SCREEN */}
      {subScreen === 'preview' && previewUrl && (
        <div className="attendance-content-flow">
          <div className="screen-heading">
            <h2 className="screen-title">Kiểm tra ảnh chụp</h2>
            <p className="screen-instruction">
              Đảm bảo gương mặt rõ nét trước khi xác nhận chấm công.
            </p>
          </div>

          <div className="preview-container">
            <img
              src={previewUrl}
              alt="Ảnh xác minh chấm công xem trước"
              className="preview-image"
            />
          </div>

          <div className="button-stack">
            <button
              type="button"
              className="btn btn-primary btn-lg"
              onClick={handleConfirmSubmit}
              disabled={isSubmitting}
              aria-label={`Xác nhận ${targetAction === 'CHECK_IN' ? 'vào ca' : 'tan ca'}`}
            >
              {isSubmitting ? (
                <>
                  <div className="maritime-spinner-sm" aria-hidden="true" />
                  <span>Đang ghi nhận...</span>
                </>
              ) : (
                <>
                  <Check size={20} strokeWidth={2.2} />
                  <span>Xác nhận {targetAction === 'CHECK_IN' ? 'vào ca' : 'tan ca'}</span>
                </>
              )}
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={handleRetake}
              disabled={isSubmitting}
              aria-label="Chụp lại ảnh"
            >
              <RotateCcw size={18} strokeWidth={1.8} />
              <span>Chụp lại</span>
            </button>
          </div>
        </div>
      )}

      {/* 4. SUCCESS SCREEN */}
      {subScreen === 'success' && actionResult && (
        <div className="attendance-content-flow">
          <section className="result-card" aria-label="Kết quả ghi nhận chấm công">
            <div className="status-badge-success">
              <CheckCircle2 size={16} strokeWidth={2.2} />
              <span>ĐÃ GHI NHẬN CHẤM CÔNG</span>
            </div>

            <div className="attendance-success-box">
              <h2 className="success-hero-type">
                {actionResult.event_type === 'CHECK_IN' ? '✓ VÀO CA THÀNH CÔNG' : '✓ TAN CA THÀNH CÔNG'}
              </h2>
              <div className="success-hero-time">{actionResult.formatted_time}</div>
              <p className="success-hero-note">Thời gian được xác nhận bởi hệ thống.</p>
            </div>

            {previewUrl && (
              <div
                className="preview-container"
                style={{ maxHeight: '150px', aspectRatio: 'auto', margin: '14px 0' }}
              >
                <img
                  src={previewUrl}
                  alt="Ảnh xác minh đã lưu"
                  className="preview-image"
                />
              </div>
            )}

            <div className="meta-row">
              <span className="meta-label">Nhân viên</span>
              <span className="meta-value">{user.full_name} ({user.employee_code})</span>
            </div>

            <div className="button-stack" style={{ marginTop: '20px' }}>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => {
                  stopMediaStream();
                  onBackToHome();
                }}
                aria-label="Về trang chủ"
              >
                <ArrowLeft size={18} strokeWidth={2.2} />
                <span>Về trang chủ</span>
              </button>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => {
                  stopMediaStream();
                  setSubScreen('overview');
                  fetchStatus();
                }}
                aria-label="Xem lại trạng thái hôm nay"
              >
                <span>Xem trạng thái</span>
              </button>
            </div>
          </section>
        </div>
      )}

      {/* 5. ERROR SCREEN */}
      {subScreen === 'error' && (
        <div className="attendance-content-flow">
          <section className="result-card" role="alert" aria-label="Lỗi chấm công">
            <div className="error-box">
              <h2 className="error-title">
                <AlertCircle size={20} strokeWidth={2.2} />
                <span>Không thể ghi nhận chấm công</span>
              </h2>
              <p className="error-desc">{errorMessage || 'Đã xảy ra sự cố xử lý.'}</p>
            </div>

            <div className="button-stack">
              {isNetworkError && capturedFile && (
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={handleConfirmSubmit}
                  disabled={isSubmitting}
                  aria-label="Thử lại gửi chấm công"
                >
                  <RefreshCw size={18} strokeWidth={2} />
                  <span>Thử lại</span>
                </button>
              )}

              {isConflictError ? (
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => {
                    stopMediaStream();
                    setSubScreen('overview');
                    fetchStatus();
                  }}
                  aria-label="Xem trạng thái chấm công hiện tại"
                >
                  <span>Xem trạng thái</span>
                </button>
              ) : (
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={handleRetake}
                  aria-label="Chụp lại ảnh minh chứng"
                >
                  <RotateCcw size={18} strokeWidth={1.8} />
                  <span>Chụp lại</span>
                </button>
              )}
            </div>
          </section>
        </div>
      )}
    </AuthenticatedShell>
  );
};
