import { useEffect, useState } from 'react';
import {
  ArrowLeft,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Check,
  MapPin,
  Edit3,
  Maximize2,
  X,
} from 'lucide-react';
import {
  Meter,
  MeterReadResponse,
  MeterReadingActionResponse,
  ReadingBatch,
  ReadingRound,
  User,
} from './types';
import { confirmMeterReading, getMe, logout, markMeterReview, readMeter, setOnAuthExpired } from './services/api';
import { LoginView } from './components/LoginView';
import { HomeHub } from './components/HomeHub';
import { AttendanceView } from './components/AttendanceView';
import { ReadingBatchView } from './components/ReadingBatchView';
import { UserScheduleView } from './components/UserScheduleView';
import { ImageViewerModal } from './components/ImageViewerModal';
import { MeterCamera } from './components/MeterCamera';
import { LogoutConfirmModal } from './components/LogoutConfirmModal';
import { UnsavedWorkConfirmModal } from './components/UnsavedWorkConfirmModal';
import { AuthenticatedShell } from './components/AuthenticatedShell';
import { LoadingState } from './components/ui/LoadingState';
import { AdminShell, AdminTab } from './components/admin/AdminShell';
import { AdminDashboard } from './components/admin/AdminDashboard';
import { AdminSchedules } from './components/admin/AdminSchedules';
import { AdminStaffRoster } from './components/admin/AdminStaffRoster';
import { AdminMeters } from './components/admin/AdminMeters';
import { AdminAudit } from './components/admin/AdminAudit';
import { AdminReports } from './components/admin/AdminReports';
import { AdminReadingInspection } from './components/admin/AdminReadingInspection';

const MAX_IMAGE_SIZE_BYTES = 12 * 1024 * 1024; // 12MB
const MAX_READING_LENGTH = 12;
const READING_REGEX = /^\d+(\.\d+)?$/;

type ActiveScreen = 'home' | 'reading_batch' | 'meter' | 'attendance' | 'schedule';

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function sanitizeReadingInput(raw: string): string {
  // Allow only 0-9 and at most one separator (. or ,)
  let result = '';
  let hasSeparator = false;
  for (const char of raw) {
    if (/\d/.test(char)) {
      result += char;
    } else if ((char === '.' || char === ',') && !hasSeparator) {
      result += char;
      hasSeparator = true;
    }
  }
  return result;
}

function normalizeReading(val: string): string {
  return val.replace(',', '.').trim();
}

// Helper to generate cropped ROI data URL from original preview in client RAM
function generateRoiCrop(imageSrc: string, roiBbox: [number, number, number, number]): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      try {
        const [x1, y1, x2, y2] = roiBbox;
        const naturalW = img.naturalWidth;
        const naturalH = img.naturalHeight;

        const sx = Math.max(0, Math.floor(x1 * naturalW));
        const sy = Math.max(0, Math.floor(y1 * naturalH));
        const sw = Math.min(naturalW - sx, Math.ceil((x2 - x1) * naturalW));
        const sh = Math.min(naturalH - sy, Math.ceil((y2 - y1) * naturalH));

        if (sw <= 0 || sh <= 0) {
          resolve(imageSrc);
          return;
        }

        const canvas = document.createElement('canvas');
        canvas.width = sw;
        canvas.height = sh;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(imageSrc);
          return;
        }

        ctx.drawImage(img, sx, sy, sw, sh, 0, 0, sw, sh);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.95);
        resolve(dataUrl);
      } catch {
        resolve(imageSrc);
      }
    };
    img.onerror = () => resolve(imageSrc);
    img.src = imageSrc;
  });
}

export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [authChecking, setAuthChecking] = useState<boolean>(true);
  const [sessionExpiredMessage, setSessionExpiredMessage] = useState<string | null>(null);
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState<boolean>(false);
  const [isLoggingOut, setIsLoggingOut] = useState<boolean>(false);
  const [logoutError, setLogoutError] = useState<string | null>(null);
  const [isUnsavedWorkModalOpen, setIsUnsavedWorkModalOpen] = useState<boolean>(false);
  const [activeScreen, setActiveScreen] = useState<ActiveScreen>('home');
  const [adminActiveTab, setAdminActiveTab] = useState<AdminTab>(() => {
    try {
      const saved = sessionStorage.getItem('admin_active_tab');
      if (saved && ['dashboard', 'schedules', 'staff_roster', 'meters', 'reports', 'audit'].includes(saved)) {
        return saved as AdminTab;
      }
    } catch {}
    return 'dashboard';
  });
  const [visitedAdminTabs, setVisitedAdminTabs] = useState<Set<AdminTab>>(() => new Set([adminActiveTab]));
  const [inspectingReadingId, setInspectingReadingId] = useState<string | null>(null);

  const handleSelectAdminTab = (tab: AdminTab) => {
    setInspectingReadingId(null);
    setAdminActiveTab(tab);
    setVisitedAdminTabs((prev) => new Set(prev).add(tab));
    try {
      sessionStorage.setItem('admin_active_tab', tab);
    } catch {}
  };

  // Selected Meter, Batch & Round Context
  const [selectedMeter, setSelectedMeter] = useState<Meter | null>(null);
  const [selectedBatch, setSelectedBatch] = useState<ReadingBatch | null>(null);
  const [selectedRound, setSelectedRound] = useState<ReadingRound | null>(null);

  // Meter Reading state (100% frozen inference workflow)
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [result, setResult] = useState<MeterReadResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Verification, Editing & ROI Inspection State
  const [roiDataUrl, setRoiDataUrl] = useState<string | null>(null);
  const [activeImageTab, setActiveImageTab] = useState<'roi' | 'original'>('roi');
  const [isEditingReading, setIsEditingReading] = useState<boolean>(false);
  const [editReadingValue, setEditReadingValue] = useState<string>('');
  const [editError, setEditError] = useState<string | null>(null);
  const [confirmedReadingValue, setConfirmedReadingValue] = useState<string>('');
  const [isViewerOpen, setIsViewerOpen] = useState<boolean>(false);

  // Manual Entry Fallback in REVIEW State
  const [isManualEntryOpen, setIsManualEntryOpen] = useState<boolean>(false);
  const [manualReadingValue, setManualReadingValue] = useState<string>('');
  const [manualReadingError, setManualReadingError] = useState<string | null>(null);

  // Confirmation & Review Action State
  const [confirming, setConfirming] = useState<boolean>(false);
  const [confirmSuccessData, setConfirmSuccessData] = useState<MeterReadingActionResponse | null>(null);

  // Central Auth Expiration Listener
  useEffect(() => {
    setOnAuthExpired((msg) => {
      handleReset();
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
          setActiveScreen('home');
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

  const handleFileSelect = (file: File) => {
    if (!file.type.startsWith('image/')) {
      setError('Chỉ hỗ trợ tệp hình ảnh hợp lệ.');
      return;
    }
    if (file.size > MAX_IMAGE_SIZE_BYTES) {
      setError('Dung lượng ảnh vượt quá 12MB. Vui lòng chọn ảnh khác.');
      return;
    }

    setError(null);
    setResult(null);
    setConfirmSuccessData(null);
    setIsEditingReading(false);
    setEditError(null);
    setIsManualEntryOpen(false);
    setManualReadingValue('');
    setManualReadingError(null);
    setRoiDataUrl(null);
    setActiveImageTab('roi');
    setImageFile(file);

    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
  };

  const handleReset = () => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setImageFile(null);
    setPreviewUrl(null);
    setResult(null);
    setError(null);
    setConfirmSuccessData(null);
    setRoiDataUrl(null);
    setIsEditingReading(false);
    setEditReadingValue('');
    setEditError(null);
    setIsManualEntryOpen(false);
    setManualReadingValue('');
    setManualReadingError(null);
    setConfirmedReadingValue('');
    setIsViewerOpen(false);
    setActiveImageTab('roi');
  };

  const handleReadMeter = async () => {
    if (!imageFile || !previewUrl) return;

    setLoading(true);
    setError(null);
    setConfirmSuccessData(null);
    setIsManualEntryOpen(false);
    setManualReadingValue('');
    setManualReadingError(null);

    try {
      const data = await readMeter(imageFile);
      setResult(data);

      if (data.reading) {
        setConfirmedReadingValue(data.reading);
        setEditReadingValue(data.reading);
      }

      // Generate cropped ROI data URL if coordinates are provided
      if (data.roi_bbox) {
        const cropped = await generateRoiCrop(previewUrl, data.roi_bbox);
        setRoiDataUrl(cropped);
        setActiveImageTab('roi');
      } else {
        setActiveImageTab('original');
      }

      if (data.status === 'success' && 'vibrate' in navigator) {
        try {
          navigator.vibrate(40);
        } catch {
          // Gracefully ignore
        }
      }
    } catch (err: unknown) {
      const errMsg =
        err instanceof Error
          ? err.message
          : 'Không thể kết nối tới máy chủ. Vui lòng thử lại.';
      if (errMsg.includes('Phiên đăng nhập đã hết hạn')) {
        setCurrentUser(null);
      }
      setError(errMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleStartEditing = () => {
    setEditReadingValue(confirmedReadingValue);
    setEditError(null);
    setIsEditingReading(true);
  };

  const handleSaveEdit = () => {
    const sanitized = sanitizeReadingInput(editReadingValue);
    const normalized = normalizeReading(sanitized);
    if (!normalized) {
      setEditError('Chỉ số công tơ không được để trống.');
      return;
    }
    if (!READING_REGEX.test(normalized) || normalized.length > MAX_READING_LENGTH) {
      setEditError(`Chỉ số chỉ được chứa chữ số (0-9), tối đa một dấu chấm và không quá ${MAX_READING_LENGTH} ký tự.`);
      return;
    }
    setConfirmedReadingValue(normalized);
    setEditReadingValue(normalized);
    setIsEditingReading(false);
    setEditError(null);
  };

  const handleCancelEdit = () => {
    setEditReadingValue(confirmedReadingValue);
    setIsEditingReading(false);
    setEditError(null);
  };

  const handleConfirmReading = async () => {
    if (!selectedMeter || !selectedRound || !result || !confirmedReadingValue) return;

    const normConfirmed = normalizeReading(confirmedReadingValue);
    const normOcr = result.reading ? normalizeReading(result.reading) : null;
    const isCorrected = normOcr !== null && normConfirmed !== normOcr;

    setConfirming(true);
    setError(null);

    try {
      let imageB64: string | null = null;
      if (imageFile) {
        try {
          imageB64 = await fileToBase64(imageFile);
        } catch {
          // ignore
        }
      }

      const actionRes = await confirmMeterReading({
        meter_id: selectedMeter.id,
        reading_round_id: selectedRound.id,
        batch_id: selectedBatch?.id,
        reading: normConfirmed,
        ocr_reading: normOcr,
        confirmation_source: isCorrected ? 'USER_CORRECTED' : 'OCR_CONFIRMED',
        meter_type: result.meter_type,
        det_confidence: result.det_confidence,
        ocr_confidence: result.ocr_confidence,
        localization_imgsz: result.localization_imgsz,
        pipeline_version: result.pipeline_version,
        roi_bbox: result.roi_bbox,
        image_base64: imageB64,
      });
      setConfirmSuccessData(actionRes);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Không thể lưu xác nhận chỉ số.';
      setError(msg);
    } finally {
      setConfirming(false);
    }
  };

  const handleConfirmManualReading = async () => {
    if (!selectedMeter || !selectedRound) return;

    const sanitized = sanitizeReadingInput(manualReadingValue);
    const normalized = normalizeReading(sanitized);
    if (!normalized) {
      setManualReadingError('Chỉ số công tơ không được để trống.');
      return;
    }
    if (!READING_REGEX.test(normalized) || normalized.length > MAX_READING_LENGTH) {
      setManualReadingError(`Chỉ số chỉ được chứa chữ số (0-9), tối đa một dấu chấm và không quá ${MAX_READING_LENGTH} ký tự.`);
      return;
    }

    setConfirming(true);
    setError(null);
    setManualReadingError(null);

    try {
      let imageB64: string | null = null;
      if (imageFile) {
        try {
          imageB64 = await fileToBase64(imageFile);
        } catch {
          // ignore
        }
      }

      const actionRes = await confirmMeterReading({
        meter_id: selectedMeter.id,
        reading_round_id: selectedRound.id,
        batch_id: selectedBatch?.id,
        reading: normalized,
        ocr_reading: null,
        confirmation_source: 'MANUAL_ENTRY',
        meter_type: result?.meter_type || null,
        det_confidence: result?.det_confidence || null,
        ocr_confidence: result?.ocr_confidence || null,
        localization_imgsz: result?.localization_imgsz || null,
        pipeline_version: result?.pipeline_version || null,
        roi_bbox: result?.roi_bbox || null,
        image_base64: imageB64,
      });
      setConfirmSuccessData(actionRes);
      setIsManualEntryOpen(false);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Không thể lưu xác nhận chỉ số.';
      setManualReadingError(msg);
    } finally {
      setConfirming(false);
    }
  };

  const handleMarkReview = async () => {
    if (!selectedMeter || !selectedRound || !result) return;

    setConfirming(true);
    setError(null);

    try {
      await markMeterReview({
        meter_id: selectedMeter.id,
        reading_round_id: selectedRound.id,
        batch_id: selectedBatch?.id,
        meter_type: result.meter_type,
        det_confidence: result.det_confidence,
        ocr_confidence: result.ocr_confidence,
        localization_imgsz: result.localization_imgsz,
        pipeline_version: result.pipeline_version,
      });
      handleReset();
      setActiveScreen('reading_batch');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Không thể đánh dấu cần kiểm tra.';
      setError(msg);
    } finally {
      setConfirming(false);
    }
  };

  const hasUnsavedWork = Boolean(
    previewUrl || result || isEditingReading || isManualEntryOpen || manualReadingValue || (confirmedReadingValue && !confirmSuccessData)
  );

  const handleBackFromMeter = () => {
    if (hasUnsavedWork) {
      setIsUnsavedWorkModalOpen(true);
    } else {
      handleReset();
      setActiveScreen('reading_batch');
    }
  };

  const handleConfirmExitMeter = () => {
    setIsUnsavedWorkModalOpen(false);
    handleReset();
    setActiveScreen('reading_batch');
  };

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
      // Server returned 200 (revoked) or 401 (already expired)
      setIsLogoutModalOpen(false);
      setLogoutError(null);
      handleReset();
      setCurrentUser(null);
      setSessionExpiredMessage(null);
    } catch (err: unknown) {
      // Network unreachable or failure: keep user authenticated, show retry option
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
        <LoadingState message="Đang xác thực hệ thống..." />
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
          setActiveScreen('home');
        }}
      />
    );
  }

  // 2.5 Admin Persona Route (ADMIN role)
  if (currentUser.role === 'ADMIN') {
    return (
      <AdminShell
        user={currentUser}
        activeTab={adminActiveTab}
        onSelectTab={handleSelectAdminTab}
        onLogout={handleOpenLogoutModal}
      >
        {/* If inspecting a reading, show inspection view */}
        {inspectingReadingId && (
          <AdminReadingInspection
            readingId={inspectingReadingId}
            onBack={() => setInspectingReadingId(null)}
            onSelectReading={(nextReadingId) => setInspectingReadingId(nextReadingId)}
          />
        )}

        {/* Tab content containers kept alive in DOM */}
        <div style={{ display: inspectingReadingId ? 'none' : 'contents' }}>
          {visitedAdminTabs.has('dashboard') && (
            <div style={{ display: adminActiveTab === 'dashboard' ? 'block' : 'none' }}>
              <AdminDashboard onInspectReading={(rId) => setInspectingReadingId(rId)} />
            </div>
          )}
          {visitedAdminTabs.has('schedules') && (
            <div style={{ display: adminActiveTab === 'schedules' ? 'block' : 'none' }}>
              <AdminSchedules />
            </div>
          )}
          {visitedAdminTabs.has('staff_roster') && (
            <div style={{ display: adminActiveTab === 'staff_roster' ? 'block' : 'none' }}>
              <AdminStaffRoster user={currentUser} />
            </div>
          )}
          {visitedAdminTabs.has('meters') && (
            <div style={{ display: adminActiveTab === 'meters' ? 'block' : 'none' }}>
              <AdminMeters onInspectReading={(rId) => setInspectingReadingId(rId)} />
            </div>
          )}
          {visitedAdminTabs.has('reports') && (
            <div style={{ display: adminActiveTab === 'reports' ? 'block' : 'none' }}>
              <AdminReports
                user={currentUser}
                onBackToDashboard={() => handleSelectAdminTab('dashboard')}
                onInspectReading={(rId) => setInspectingReadingId(rId)}
              />
            </div>
          )}
          {visitedAdminTabs.has('audit') && (
            <div style={{ display: adminActiveTab === 'audit' ? 'block' : 'none' }}>
              <AdminAudit />
            </div>
          )}
        </div>

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
  }

  // 3. Authenticated Home Hub (EMPLOYEE role)
  if (activeScreen === 'home') {
    return (
      <AuthenticatedShell user={currentUser} onLogout={handleOpenLogoutModal}>
        <HomeHub
          user={currentUser}
          onOpenMeter={() => {
            handleReset();
            setActiveScreen('reading_batch');
          }}
          onOpenAttendance={() => setActiveScreen('attendance')}
          onOpenSchedule={() => setActiveScreen('schedule')}
        />
        <LogoutConfirmModal
          isOpen={isLogoutModalOpen}
          hasUnsavedWork={hasUnsavedWork}
          isLoggingOut={isLoggingOut}
          error={logoutError}
          onConfirm={handleConfirmLogout}
          onCancel={handleCancelLogout}
        />
      </AuthenticatedShell>
    );
  }

  // 4. Reading Batch Logbook View
  if (activeScreen === 'reading_batch') {
    return (
      <ReadingBatchView
        user={currentUser}
        onBackToHome={() => setActiveScreen('home')}
        onSelectMeter={(meter, batch, round) => {
          setSelectedMeter(meter);
          setSelectedBatch(batch);
          setSelectedRound(round);
          handleReset();
          setActiveScreen('meter');
        }}
      />
    );
  }

  // 5. Authenticated Photo Attendance View
  if (activeScreen === 'attendance') {
    return (
      <AttendanceView
        user={currentUser}
        onBackToHome={() => setActiveScreen('home')}
      />
    );
  }

  // 6. Authenticated User Work Schedule & Leave View (Replacing User Reports)
  if (activeScreen === 'schedule') {
    return (
      <UserScheduleView
        user={currentUser}
        onBackToHome={() => setActiveScreen('home')}
        onLogout={handleOpenLogoutModal}
      />
    );
  }

  // Current active preview url for viewer
  const currentDisplayUrl =
    activeImageTab === 'roi' && roiDataUrl ? roiDataUrl : previewUrl || '';

  // 7. Authenticated Meter Reading Workflow with Verification & Inspection
  return (
    <AuthenticatedShell
      screenTitle="ĐỌC CHỈ SỐ"
      screenSubtitle={selectedMeter ? selectedMeter.meter_code : 'Đo đếm điện năng'}
      backLabel="Danh sách"
      onBack={handleBackFromMeter}
    >
        {/* Selected Meter Context Banner */}
        {selectedMeter && (
          <div className="meter-context-banner">
            <div className="context-main">
              <span className="context-tag">ĐANG GHI:</span>
              <span className="context-code">{selectedMeter.meter_code}</span>
              <span className="context-name">{selectedMeter.name}</span>
              {selectedRound && (
                <span className="context-round-badge">
                  Lượt {selectedRound.scheduled_time_only}
                </span>
              )}
            </div>
            {selectedMeter.location && (
              <div className="context-loc">
                <MapPin size={12} />
                <span>{selectedMeter.location}</span>
              </div>
            )}
          </div>
        )}

        {/* STATE 1: LIVE REAR-CAMERA CAPTURE WITH FIXED ALIGNMENT OVERLAY */}
        {!previewUrl && !loading && !result && !error && !confirmSuccessData && (
          <MeterCamera
            onCapture={handleFileSelect}
            onSelectGallery={handleFileSelect}
          />
        )}

        {/* STATE 2: PREVIEW */}
        {previewUrl && !loading && !result && !error && !confirmSuccessData && (
          <>
            <div className="screen-heading">
              <h2 className="screen-title">Kiểm tra ảnh chụp</h2>
              <p className="screen-instruction">
                Đảm bảo hàng số rõ nét và không bị phản sáng trước khi đọc.
              </p>
            </div>

            <div className="preview-container">
              <img
                src={previewUrl}
                alt="Ảnh công tơ xem trước"
                className="preview-image"
              />
            </div>

            <div className="button-stack">
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleReadMeter}
              >
                <Check size={20} strokeWidth={2.2} />
                Đọc chỉ số
              </button>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={handleReset}
              >
                <RotateCcw size={18} strokeWidth={1.8} />
                Chụp lại
              </button>
            </div>
          </>
        )}

        {/* STATE 3: PROCESSING */}
        {loading && (
          <section
            className="processing-card"
            role="status"
            aria-live="polite"
            aria-label="Đang đọc chỉ số"
          >
            <div className="maritime-spinner" aria-hidden="true" />
            <div>
              <p className="processing-title">Đang đọc chỉ số...</p>
              <p className="processing-subtext">Giữ ứng dụng mở trong giây lát.</p>
            </div>
          </section>
        )}

        {/* STATE 4A: SUCCESS RESULT, VISUAL INSPECTION & OPTIONAL CORRECTION */}
        {result && result.status === 'success' && !loading && !confirmSuccessData && (
          <section className="result-card" aria-label="Kết quả nhận diện và kiểm tra">
            <div className="status-badge-success">
              <CheckCircle2 size={15} strokeWidth={2.2} />
              KẾT QUẢ NHẬN DIỆN
            </div>

            {/* READING VALUE DISPLAY OR INLINE EDIT FORM */}
            {!isEditingReading ? (
              <div className="reading-hero" aria-label={`Chỉ số công tơ là ${confirmedReadingValue} kilowatt giờ`}>
                <div className="reading-hero-header">
                  <span className="reading-hero-eyebrow">Chỉ số xác nhận</span>
                  <button
                    type="button"
                    className="btn-edit-inline"
                    onClick={handleStartEditing}
                    aria-label="Sửa chỉ số thủ công"
                    title="Sửa chỉ số"
                  >
                    <Edit3 size={14} />
                    <span>Sửa chỉ số</span>
                  </button>
                </div>

                <div className="reading-hero-value-wrap">
                  <span className="reading-hero-number">{confirmedReadingValue}</span>
                  <span className="reading-hero-unit">kWh</span>
                </div>

                {confirmedReadingValue !== result.reading && (
                  <div className="corrected-notice" role="status">
                    <CheckCircle2 size={13} />
                    <span>Đã chỉnh từ kết quả nhận diện <strong>{result.reading}</strong></span>
                  </div>
                )}
              </div>
            ) : (
              <div className="edit-reading-box">
                <div className="edit-reading-header">
                  <span className="edit-reading-title">Hiệu chỉnh chỉ số</span>
                  <button
                    type="button"
                    className="btn-cancel-icon"
                    onClick={handleCancelEdit}
                    aria-label="Hủy chỉnh sửa"
                  >
                    <X size={16} />
                  </button>
                </div>

                <div className="edit-input-wrap">
                  <input
                    type="text"
                    inputMode="decimal"
                    className={`edit-reading-input ${editError ? 'input-error' : ''}`}
                    value={editReadingValue}
                    onChange={(e) => {
                      const sanitized = sanitizeReadingInput(e.target.value);
                      setEditReadingValue(sanitized);
                      if (editError) setEditError(null);
                    }}
                    placeholder="00000.000"
                    maxLength={MAX_READING_LENGTH}
                    autoFocus
                    aria-label="Nhập chỉ số công tơ chính xác"
                  />
                  <button
                    type="button"
                    className="btn-quick-dot"
                    onClick={() => {
                      if (!editReadingValue.includes('.') && !editReadingValue.includes(',')) {
                        setEditReadingValue((prev) => prev + '.');
                      }
                    }}
                    aria-label="Thêm dấu chấm thập phân"
                    title="Dấu chấm"
                  >
                    .
                  </button>
                  <span className="edit-input-unit">kWh</span>
                </div>

                {editError && <p className="edit-error-msg">{editError}</p>}

                <p className="edit-reading-original">
                  Kết quả nhận diện ban đầu: <strong>{result.reading}</strong>
                </p>

                <div className="edit-actions-row">
                  <button
                    type="button"
                    className="btn btn-primary btn-sm"
                    onClick={handleSaveEdit}
                  >
                    <Check size={16} /> Lưu chỉnh sửa
                  </button>
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={handleCancelEdit}
                  >
                    Hủy
                  </button>
                </div>
              </div>
            )}

            {/* IMAGE INSPECTION WITH SEGMENTED TOGGLE (ROI / ORIGINAL) */}
            <div className="inspect-section">
              <div className="inspect-header">
                <span className="inspect-label">Hình ảnh đối chiếu:</span>
                {roiDataUrl ? (
                  <div className="image-toggle-pills" role="tablist" aria-label="Chế độ xem ảnh">
                    <button
                      type="button"
                      role="tab"
                      aria-selected={activeImageTab === 'roi'}
                      className={`image-toggle-pill ${activeImageTab === 'roi' ? 'active' : ''}`}
                      onClick={() => setActiveImageTab('roi')}
                    >
                      Vùng chỉ số (ROI)
                    </button>
                    <button
                      type="button"
                      role="tab"
                      aria-selected={activeImageTab === 'original'}
                      className={`image-toggle-pill ${activeImageTab === 'original' ? 'active' : ''}`}
                      onClick={() => setActiveImageTab('original')}
                    >
                      Ảnh gốc
                    </button>
                  </div>
                ) : (
                  <span className="image-single-tag">Ảnh gốc</span>
                )}
              </div>

              <div
                className="inspect-preview-container"
                onClick={() => setIsViewerOpen(true)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') setIsViewerOpen(true);
                }}
                aria-label="Chạm để phóng to ảnh đối chiếu"
              >
                <img
                  src={currentDisplayUrl}
                  alt={activeImageTab === 'roi' ? 'Vùng chỉ số công tơ' : 'Ảnh công tơ gốc'}
                  className="inspect-preview-image"
                />
                <div className="zoom-tap-hint">
                  <Maximize2 size={13} />
                  <span>Chạm để phóng to & kiểm tra</span>
                </div>
              </div>
            </div>

            {result.meter_type && (
              <div className="meta-row">
                <span className="meta-label">Loại công tơ:</span>
                <span className="meta-value">
                  {result.meter_type === 'lcd' ? 'Điện tử (LCD)' : 'Cơ (Mechanical)'}
                </span>
              </div>
            )}

            {/* ACTION BUTTONS */}
            <div className="button-stack">
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleConfirmReading}
                disabled={confirming || isEditingReading}
              >
                <Check size={20} strokeWidth={2.2} />
                {confirming ? 'Đang lưu vào sổ...' : 'Xác nhận chỉ số'}
              </button>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={handleReset}
                disabled={confirming}
              >
                <RotateCcw size={18} strokeWidth={1.8} />
                Chụp lại
              </button>
            </div>
          </section>
        )}

        {/* STATE 4B: CONFIRMATION SUCCESS VIEW */}
        {confirmSuccessData && !loading && (
          <section className="result-card" aria-label="Đã ghi nhận chỉ số thành công">
            <div className="status-badge-success" style={{ background: '#dcfce7', color: '#166534', border: '1px solid #86efac' }}>
              <CheckCircle2 size={16} strokeWidth={2.2} />
              ĐÃ GHI NHẬN CHỈ SỐ VÀO SỔ
            </div>

            <div className="reading-hero">
              <span className="reading-hero-eyebrow">
                Chỉ số chính thức ({selectedMeter?.meter_code} &bull; Lượt {selectedRound?.scheduled_time_only || '---'})
              </span>
              <div className="reading-hero-value-wrap">
                <span className="reading-hero-number">{confirmSuccessData.reading}</span>
                <span className="reading-hero-unit">kWh</span>
              </div>
              {confirmSuccessData.confirmation_source === 'MANUAL_ENTRY' && (
                <div className="corrected-notice" role="status">
                  <CheckCircle2 size={13} />
                  <span>Nhập thủ công từ ảnh thực tế</span>
                </div>
              )}
              {confirmSuccessData.confirmation_source === 'USER_CORRECTED' && (
                <div className="corrected-notice" role="status">
                  <CheckCircle2 size={13} />
                  <span>Đã hiệu chỉnh bởi người đọc (AI: {confirmSuccessData.ocr_reading})</span>
                </div>
              )}
            </div>

            <div className="meta-row">
              <span className="meta-label">Lượt ghi chỉ số:</span>
              <span className="meta-value">
                {confirmSuccessData.round_scheduled_local || (selectedRound ? selectedRound.scheduled_local : '---')}
              </span>
            </div>

            <div className="meta-row">
              <span className="meta-label">Nguồn xác nhận:</span>
              <span className="meta-value">
                {confirmSuccessData.confirmation_source === 'MANUAL_ENTRY'
                  ? 'Nhập thủ công'
                  : confirmSuccessData.confirmation_source === 'USER_CORRECTED'
                  ? 'Đã hiệu chỉnh từ OCR'
                  : 'Xác nhận từ OCR'}
              </span>
            </div>

            <div className="meta-row">
              <span className="meta-label">Thời gian máy chủ:</span>
              <span className="meta-value">{confirmSuccessData.formatted_time}</span>
            </div>

            <div className="meta-row">
              <span className="meta-label">Đợt ghi:</span>
              <span className="meta-value">{selectedBatch?.name || '---'}</span>
            </div>

            <div className="button-stack">
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => {
                  handleReset();
                  setActiveScreen('reading_batch');
                }}
              >
                <ArrowLeft size={18} strokeWidth={2.2} />
                Về danh sách công tơ
              </button>
            </div>
          </section>
        )}

        {/* STATE 5: REVIEW RESULT WITH MANUAL ENTRY FALLBACK */}
        {result && result.status === 'review' && !loading && !confirmSuccessData && (
          <section className="result-card" role="alert" aria-label="Cần kiểm tra lại hoặc nhập thủ công">
            <div className="status-badge-review" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '6px 12px', background: '#fef3c7', color: '#92400e', borderRadius: '9999px', fontSize: '0.8rem', fontWeight: '700', marginBottom: '14px', border: '1px solid #fde68a' }}>
              <AlertTriangle size={15} strokeWidth={2.2} />
              KHÔNG THỂ NHẬN DIỆN TỰ ĐỘNG
            </div>

            {/* IMAGE INSPECTION WITH SEGMENTED TOGGLE (ROI / ORIGINAL) */}
            <div className="inspect-section">
              <div className="inspect-header">
                <span className="inspect-label">Hình ảnh đối chiếu:</span>
                {roiDataUrl ? (
                  <div className="image-toggle-pills" role="tablist" aria-label="Chế độ xem ảnh">
                    <button
                      type="button"
                      role="tab"
                      aria-selected={activeImageTab === 'roi'}
                      className={`image-toggle-pill ${activeImageTab === 'roi' ? 'active' : ''}`}
                      onClick={() => setActiveImageTab('roi')}
                    >
                      Vùng chỉ số (ROI)
                    </button>
                    <button
                      type="button"
                      role="tab"
                      aria-selected={activeImageTab === 'original'}
                      className={`image-toggle-pill ${activeImageTab === 'original' ? 'active' : ''}`}
                      onClick={() => setActiveImageTab('original')}
                    >
                      Ảnh gốc
                    </button>
                  </div>
                ) : (
                  <span className="image-single-tag">Ảnh gốc</span>
                )}
              </div>

              <div
                className="inspect-preview-container"
                onClick={() => setIsViewerOpen(true)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') setIsViewerOpen(true);
                }}
                aria-label="Chạm để phóng to ảnh đối chiếu"
              >
                <img
                  src={currentDisplayUrl}
                  alt={activeImageTab === 'roi' ? 'Vùng chỉ số công tơ' : 'Ảnh công tơ gốc'}
                  className="inspect-preview-image"
                />
                <div className="zoom-tap-hint">
                  <Maximize2 size={13} />
                  <span>Chạm để phóng to & kiểm tra</span>
                </div>
              </div>
            </div>

            {/* MANUAL ENTRY FORM IF ACTIVE */}
            {isManualEntryOpen ? (
              <div className="edit-reading-box" style={{ marginTop: '16px', background: '#f8fafc', border: '1.5px solid #cbd5e1' }}>
                <div className="edit-reading-header">
                  <span className="edit-reading-title">Chỉ số thực tế</span>
                  <button
                    type="button"
                    className="btn-cancel-icon"
                    onClick={() => {
                      setIsManualEntryOpen(false);
                      setManualReadingError(null);
                    }}
                    aria-label="Hủy nhập thủ công"
                  >
                    <X size={16} />
                  </button>
                </div>

                <p style={{ margin: '0 0 10px 0', fontSize: '0.85rem', color: '#475569', lineHeight: 1.4 }}>
                  Nhập chỉ số bạn đọc trực tiếp từ ảnh công tơ.
                </p>

                <div className="edit-input-wrap">
                  <input
                    type="text"
                    inputMode="decimal"
                    className={`edit-reading-input ${manualReadingError ? 'input-error' : ''}`}
                    value={manualReadingValue}
                    onChange={(e) => {
                      const sanitized = sanitizeReadingInput(e.target.value);
                      setManualReadingValue(sanitized);
                      if (manualReadingError) setManualReadingError(null);
                    }}
                    placeholder="00000.000"
                    maxLength={MAX_READING_LENGTH}
                    autoFocus
                    aria-label="Nhập chỉ số bạn đọc trực tiếp từ ảnh công tơ"
                  />
                  <button
                    type="button"
                    className="btn-quick-dot"
                    onClick={() => {
                      if (!manualReadingValue.includes('.') && !manualReadingValue.includes(',')) {
                        setManualReadingValue((prev) => prev + '.');
                      }
                    }}
                    aria-label="Thêm dấu chấm thập phân"
                    title="Dấu chấm"
                  >
                    .
                  </button>
                  <span className="edit-input-unit">kWh</span>
                </div>

                {manualReadingError && <p className="edit-error-msg">{manualReadingError}</p>}

                <div className="edit-actions-row" style={{ marginTop: '14px' }}>
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={handleConfirmManualReading}
                    disabled={confirming}
                  >
                    <Check size={18} strokeWidth={2.2} />
                    <span>{confirming ? 'Đang ghi nhận...' : 'Xác nhận chỉ số'}</span>
                  </button>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => {
                      setIsManualEntryOpen(false);
                      setManualReadingError(null);
                    }}
                    disabled={confirming}
                  >
                    Hủy
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div className="review-box">
                  <div className="review-header">
                    <AlertTriangle size={22} strokeWidth={2} className="review-icon" />
                    <div className="review-text-wrap">
                      <h2 className="review-title">Không thể nhận diện tự động chỉ số.</h2>
                      <p className="review-support">
                        Bạn có thể nhập chỉ số trực tiếp nếu nhìn rõ số trên ảnh, hoặc chụp lại góc khác, hoặc đánh dấu để kiểm tra thực địa.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="button-stack">
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={() => {
                      setManualReadingValue('');
                      setManualReadingError(null);
                      setIsManualEntryOpen(true);
                    }}
                    disabled={confirming}
                    aria-label="Nhập chỉ số thủ công"
                  >
                    <Edit3 size={18} strokeWidth={2.2} />
                    <span>Nhập chỉ số thủ công</span>
                  </button>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={handleReset}
                    disabled={confirming}
                    aria-label="Chụp lại ảnh khác"
                  >
                    <RotateCcw size={18} strokeWidth={2} />
                    <span>Chụp lại</span>
                  </button>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={handleMarkReview}
                    disabled={confirming}
                    style={{ color: '#9a3412', borderColor: '#fed7aa', background: '#fff7ed' }}
                    aria-label="Đánh dấu cần kiểm tra thực địa"
                  >
                    <AlertTriangle size={18} strokeWidth={2} />
                    <span>{confirming ? 'Đang lưu...' : 'Đánh dấu cần kiểm tra'}</span>
                  </button>
                </div>
              </>
            )}
          </section>
        )}

        {/* STATE 6: ERROR */}
        {error && !loading && (
          <section className="result-card" role="alert" aria-label="Lỗi xử lý">
            {previewUrl && (
              <div
                className="preview-container"
                style={{ maxHeight: '140px', aspectRatio: 'auto', marginBottom: '12px' }}
              >
                <img
                  src={previewUrl}
                  alt="Ảnh công tơ xem trước"
                  className="preview-image"
                />
              </div>
            )}
            <div className="error-box">
              <h2 className="error-title">
                <AlertTriangle size={18} strokeWidth={2} />
                Không thể kết nối đến hệ thống
              </h2>
              <p className="error-desc">{error}</p>
            </div>

            <div className="button-stack">
              {imageFile && (
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={handleReadMeter}
                  aria-label="Thử lại đọc chỉ số"
                >
                  <RefreshCw size={18} strokeWidth={2} />
                  Thử lại
                </button>
              )}
              <button
                type="button"
                className="btn btn-secondary"
                onClick={handleReset}
                aria-label="Chụp lại ảnh khác"
              >
                <RotateCcw size={18} strokeWidth={1.8} />
                Chụp lại
              </button>
            </div>
          </section>
        )}

      {/* FULLSCREEN PAN/ZOOM IMAGE VIEWER MODAL */}
      <ImageViewerModal
        isOpen={isViewerOpen}
        onClose={() => setIsViewerOpen(false)}
        imageUrl={currentDisplayUrl}
        title={activeImageTab === 'roi' && roiDataUrl ? 'Vùng chỉ số (ROI)' : 'Ảnh gốc'}
        subtitle={selectedMeter ? `${selectedMeter.meter_code} • ${selectedMeter.name}` : undefined}
      />

      {/* UNSAVED WORK CONFIRMATION MODAL */}
      <UnsavedWorkConfirmModal
        isOpen={isUnsavedWorkModalOpen}
        onConfirm={handleConfirmExitMeter}
        onCancel={() => setIsUnsavedWorkModalOpen(false)}
      />
    </AuthenticatedShell>
  );
}
