import { useEffect, useState, useCallback, useRef } from 'react';
import {
  ArrowLeft,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Check,
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
  TodayAttendance,
  User,
} from './types';
import { confirmMeterReading, getMe, getTodayAttendance, logout, markMeterReview, readMeter, reconcileMeterReading, setOnAuthExpired } from './services/api';
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
import { AdminAudit } from './components/admin/AdminAudit';
import { AdminReports } from './components/admin/AdminReports';
import { AdminReadingInspection } from './components/admin/AdminReadingInspection';
import { AdminVerification } from './components/admin/AdminVerification';
import { AdminDevicesWorkspace } from './components/admin/AdminDevicesWorkspace';
import { MapV2Workspace } from './components/map-v2/MapV2Workspace';
import { OperationalWorkspaceProvider, useOperationalWorkspace } from './context/OperationalWorkspaceContext';

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

interface AdminWorkspaceAppProps {
  currentUser: User;
  onLogout: () => void;
  isLogoutModalOpen: boolean;
  isLoggingOut: boolean;
  logoutError: string | null;
  handleConfirmLogout: () => void;
  handleCancelLogout: () => void;
}

const AdminWorkspaceApp: React.FC<AdminWorkspaceAppProps> = ({
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

  // Single Source of Truth for Today Attendance (Shared by Header Avatar and Home Hub)
  const [todayAttendance, setTodayAttendance] = useState<TodayAttendance | null>(null);
  const [loadingAttendance, setLoadingAttendance] = useState<boolean>(true);
  const [attendanceError, setAttendanceError] = useState<string | null>(null);

  const fetchTodayAttendance = useCallback(async () => {
    setLoadingAttendance(true);
    setAttendanceError(null);
    try {
      const data = await getTodayAttendance();
      setTodayAttendance(data);
      setAttendanceError(null);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Lỗi tải trạng thái chấm công.';
      setAttendanceError(msg);
      setTodayAttendance(null);
    } finally {
      setLoadingAttendance(false);
    }
  }, []);

  useEffect(() => {
    if (currentUser && currentUser.role !== 'ADMIN' && activeScreen === 'home') {
      fetchTodayAttendance();
    }
  }, [currentUser, activeScreen, fetchTodayAttendance]);

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
        if (tabParam && ['dashboard', 'assets', 'verification', 'schedules', 'staff_roster', 'meters', 'reports', 'audit'].includes(tabParam)) {
          setAdminActiveTab(tabParam as AdminTab);
        }
      } catch {}
    };
    window.addEventListener('popstate', handleLocationChange);
    return () => window.removeEventListener('popstate', handleLocationChange);
  }, []);

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

  // Confirmation & Review Action State Machine (Phase D)
  // NOT_SUBMITTED → SUBMITTING → CONFIRMED_BY_SERVER | REJECTED | OUTCOME_UNKNOWN
  type SubmissionPhase = 'NOT_SUBMITTED' | 'SUBMITTING' | 'CONFIRMED_BY_SERVER' | 'REJECTED' | 'OUTCOME_UNKNOWN';
  const [submissionPhase, setSubmissionPhase] = useState<SubmissionPhase>('NOT_SUBMITTED');
  const confirming = submissionPhase === 'SUBMITTING';
  const [confirmSuccessData, setConfirmSuccessData] = useState<MeterReadingActionResponse | null>(null);
  const [conflictError, setConflictError] = useState<string | null>(null);
  const [reconciling, setReconciling] = useState<boolean>(false);

  // Stale OCR response protection & concurrency guard
  const ocrRequestIdRef = useRef<number>(0);

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

  // Set dark body canvas class during focused meter reading to eliminate any background flash
  useEffect(() => {
    if (activeScreen === 'meter') {
      document.body.classList.add('focused-mode-active');
    } else {
      document.body.classList.remove('focused-mode-active');
    }
    return () => {
      document.body.classList.remove('focused-mode-active');
    };
  }, [activeScreen]);

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
    ocrRequestIdRef.current++;
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setImageFile(null);
    setPreviewUrl(null);
    setResult(null);
    setError(null);
    setConfirmSuccessData(null);
    setSubmissionPhase('NOT_SUBMITTED');
    setConflictError(null);
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

    const requestId = ++ocrRequestIdRef.current;
    setLoading(true);
    setError(null);
    setConfirmSuccessData(null);
    setIsManualEntryOpen(false);
    setManualReadingValue('');
    setManualReadingError(null);

    try {
      const data = await readMeter(imageFile);
      if (requestId !== ocrRequestIdRef.current) return;

      setResult(data);

      if (data.reading) {
        setConfirmedReadingValue(data.reading);
        setEditReadingValue(data.reading);
      }

      // Generate cropped ROI data URL if coordinates are provided
      if (data.roi_bbox) {
        const cropped = await generateRoiCrop(previewUrl, data.roi_bbox);
        if (requestId !== ocrRequestIdRef.current) return;
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
      if (requestId !== ocrRequestIdRef.current) return;
      const errMsg =
        err instanceof Error
          ? err.message
          : 'Không thể kết nối tới máy chủ. Vui lòng thử lại.';
      if (errMsg.includes('Phiên đăng nhập đã hết hạn')) {
        setCurrentUser(null);
      }
      setError(errMsg);
    } finally {
      if (requestId === ocrRequestIdRef.current) {
        setLoading(false);
      }
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

  const handleReconcileSubmission = async (targetReadingValue?: string | null) => {
    if (!selectedMeter || !selectedRound || reconciling) return;
    const valueToMatch = targetReadingValue || confirmedReadingValue || manualReadingValue;
    setReconciling(true);
    try {
      const rec = await reconcileMeterReading(selectedRound.id, selectedMeter.id);
      if (rec.exists && rec.reading) {
        const normExisting = normalizeReading(rec.reading);
        const normTarget = valueToMatch ? normalizeReading(valueToMatch) : null;
        if (normTarget && normExisting === normTarget) {
          setSubmissionPhase('CONFIRMED_BY_SERVER');
          setConfirmSuccessData({
            status: 'success',
            reading_id: rec.reading_id || 'reconciled',
            meter_id: rec.meter_id,
            batch_id: rec.batch_id || selectedBatch?.id || '',
            reading_round_id: rec.round_id,
            round_scheduled_local: selectedRound.scheduled_local || '',
            reading_status: (rec.reading_status as 'CONFIRMED' | 'REVIEW') || 'CONFIRMED',
            reading: rec.reading,
            ocr_reading: rec.ocr_reading,
            confirmation_source: rec.confirmation_source || 'RECONCILED',
            server_timestamp: rec.server_timestamp || new Date().toISOString(),
            formatted_time: rec.formatted_time || new Date().toLocaleTimeString('vi-VN'),
            message: 'Chỉ số đã được máy chủ ghi nhận thành công (kết quả đối soát khớp).',
          });
          setError(null);
          setConflictError(null);
          return;
        } else {
          setSubmissionPhase('REJECTED');
          setConflictError(
            `Chỉ số của công tơ này đã được ghi nhận với giá trị ${rec.reading}` +
            (rec.recorded_by_employee_code ? ` (Mã NV: ${rec.recorded_by_employee_code})` : '') +
            `. Vui lòng kiểm tra lại danh sách.`
          );
          setError(null);
          return;
        }
      } else {
        setSubmissionPhase('NOT_SUBMITTED');
        setError('Máy chủ chưa ghi nhận chỉ số. Bạn có thể bấm xác nhận để gửi lại an toàn.');
        setConflictError(null);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Không thể kết nối máy chủ để đối soát.';
      setError(`Đối soát thất bại: ${msg}`);
    } finally {
      setReconciling(false);
    }
  };

  const handleConfirmReading = async () => {
    if (!selectedMeter || !selectedRound || !result || !confirmedReadingValue || confirming) return;

    const normConfirmed = normalizeReading(confirmedReadingValue);
    const normOcr = result.reading ? normalizeReading(result.reading) : null;
    const isCorrected = normOcr !== null && normConfirmed !== normOcr;

    // Phase D: transition NOT_SUBMITTED → SUBMITTING
    setSubmissionPhase('SUBMITTING');
    setError(null);
    setConflictError(null);

    try {
      let imageB64: string | null = null;
      if (imageFile) {
        try {
          imageB64 = await fileToBase64(imageFile);
        } catch {
          // ignore — image send failure is non-fatal
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
      // Server returned a success body — definitive outcome
      setSubmissionPhase('CONFIRMED_BY_SERVER');
      setConfirmSuccessData(actionRes);
    } catch (err: unknown) {
      const isApiError = err && typeof err === 'object' && 'status' in err;
      const httpStatus = isApiError ? (err as { status: number }).status : null;
      const msg = err instanceof Error ? err.message : 'Không thể lưu xác nhận chỉ số.';
      const isNetworkLoss =
        httpStatus === 0 ||
        msg.toLowerCase().includes('network') ||
        msg.toLowerCase().includes('fetch') ||
        msg.toLowerCase().includes('kết nối') ||
        msg.toLowerCase().includes('failed to fetch');

      if (httpStatus === 409 || msg.includes('409') || msg.includes('đã được xác nhận') || msg.includes('already recorded')) {
        // Check with reconciliation first: did our commit succeed before response dropped?
        try {
          const rec = await reconcileMeterReading(selectedRound.id, selectedMeter.id);
          if (rec.exists && rec.reading && normalizeReading(rec.reading) === normConfirmed) {
            setSubmissionPhase('CONFIRMED_BY_SERVER');
            setConfirmSuccessData({
              status: 'success',
              reading_id: rec.reading_id || 'reconciled',
              meter_id: rec.meter_id,
              batch_id: rec.batch_id || selectedBatch?.id || '',
              reading_round_id: rec.round_id,
              round_scheduled_local: selectedRound.scheduled_local || '',
              reading_status: (rec.reading_status as 'CONFIRMED' | 'REVIEW') || 'CONFIRMED',
              reading: rec.reading,
              ocr_reading: rec.ocr_reading,
              confirmation_source: rec.confirmation_source || 'RECONCILED',
              server_timestamp: rec.server_timestamp || new Date().toISOString(),
              formatted_time: rec.formatted_time || new Date().toLocaleTimeString('vi-VN'),
              message: 'Chỉ số đã được máy chủ ghi nhận (đối soát xác nhận thành công).',
            });
            return;
          }
        } catch {
          // fallback to REJECTED if reconciliation fails
        }
        setSubmissionPhase('REJECTED');
        setConflictError(
          'Công tơ này đã được ghi nhận trong lượt hiện tại. ' +
          'Vui lòng quay lại danh sách để kiểm tra kết quả thực tế.'
        );
      } else if (isNetworkLoss) {
        // Network-level failure — we don't know if server processed the request
        setSubmissionPhase('OUTCOME_UNKNOWN');
        setError(
          'Mất kết nối sau khi gửi yêu cầu. Không thể xác định chỉ số đã được lưu chưa. ' +
          'Vui lòng bấm "Đối soát với máy chủ" bên dưới hoặc kiểm tra danh sách công tơ.'
        );
      } else {
        // Known server error (4xx/5xx other than 409) — REJECTED with reason
        setSubmissionPhase('REJECTED');
        setError(msg);
      }
    }
  };

  const handleConfirmManualReading = async () => {
    if (!selectedMeter || !selectedRound || confirming) return;

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

    // Phase D: transition NOT_SUBMITTED → SUBMITTING
    setSubmissionPhase('SUBMITTING');
    setError(null);
    setConflictError(null);
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
      setSubmissionPhase('CONFIRMED_BY_SERVER');
      setConfirmSuccessData(actionRes);
      setIsManualEntryOpen(false);
    } catch (err: unknown) {
      const isApiError = err && typeof err === 'object' && 'status' in err;
      const httpStatus = isApiError ? (err as { status: number }).status : null;
      const msg = err instanceof Error ? err.message : 'Không thể lưu xác nhận chỉ số.';
      const isNetworkLoss =
        httpStatus === 0 ||
        msg.toLowerCase().includes('network') ||
        msg.toLowerCase().includes('fetch') ||
        msg.toLowerCase().includes('kết nối') ||
        msg.toLowerCase().includes('failed to fetch');

      if (httpStatus === 409 || msg.includes('409') || msg.includes('đã được xác nhận') || msg.includes('already recorded')) {
        try {
          const rec = await reconcileMeterReading(selectedRound.id, selectedMeter.id);
          if (rec.exists && rec.reading && normalizeReading(rec.reading) === normalized) {
            setSubmissionPhase('CONFIRMED_BY_SERVER');
            setConfirmSuccessData({
              status: 'success',
              reading_id: rec.reading_id || 'reconciled',
              meter_id: rec.meter_id,
              batch_id: rec.batch_id || selectedBatch?.id || '',
              reading_round_id: rec.round_id,
              round_scheduled_local: selectedRound.scheduled_local || '',
              reading_status: (rec.reading_status as 'CONFIRMED' | 'REVIEW') || 'CONFIRMED',
              reading: rec.reading,
              ocr_reading: rec.ocr_reading,
              confirmation_source: rec.confirmation_source || 'RECONCILED',
              server_timestamp: rec.server_timestamp || new Date().toISOString(),
              formatted_time: rec.formatted_time || new Date().toLocaleTimeString('vi-VN'),
              message: 'Chỉ số đã được máy chủ ghi nhận (đối soát xác nhận thành công).',
            });
            setIsManualEntryOpen(false);
            return;
          }
        } catch {
          // ignore
        }
        setSubmissionPhase('REJECTED');
        setConflictError(
          'Công tơ này đã được ghi nhận trong lượt hiện tại. ' +
          'Vui lòng quay lại danh sách để kiểm tra kết quả thực tế.'
        );
        setIsManualEntryOpen(false);
      } else if (isNetworkLoss) {
        setSubmissionPhase('OUTCOME_UNKNOWN');
        setManualReadingError(
          'Mất kết nối sau khi gửi yêu cầu. Không thể xác định chỉ số đã được lưu chưa. ' +
          'Vui lòng bấm "Đối soát với máy chủ" để kiểm tra trạng thái.'
        );
      } else {
        setSubmissionPhase('REJECTED');
        setManualReadingError(msg);
      }
    }
  };

  const handleMarkReview = async () => {
    if (!selectedMeter || !selectedRound || !result || confirming) return;

    setSubmissionPhase('SUBMITTING');
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
      setSubmissionPhase('REJECTED');
      setError(msg);
    }
  };

  const hasUnsavedWork = Boolean(
    previewUrl || result || isEditingReading || isManualEntryOpen || manualReadingValue ||
    (confirmedReadingValue && !confirmSuccessData) ||
    submissionPhase === 'REJECTED' || submissionPhase === 'OUTCOME_UNKNOWN'
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
      <OperationalWorkspaceProvider
        initialTab={adminActiveTab}
        onTabChange={handleSelectAdminTab}
      >
        <AdminWorkspaceApp
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

  // 3. Authenticated Home Hub (EMPLOYEE role)
  if (activeScreen === 'home') {
    return (
      <AuthenticatedShell
        user={currentUser}
        attendance={todayAttendance}
        loadingAttendance={loadingAttendance}
        attendanceError={attendanceError}
        onLogout={handleOpenLogoutModal}
      >
        <HomeHub
          user={currentUser}
          attendance={todayAttendance}
          loadingAttendance={loadingAttendance}
          attendanceError={attendanceError}
          onRefreshAttendance={fetchTodayAttendance}
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

  // 7. FOCUSED METER READING WORKFLOW
  // 7.1 STATE 1: LIVE REAR-CAMERA CAPTURE WITH FOCUSED MINIMAL HEADER & CONTROLS
  if (!previewUrl && !loading && !result && !error && !confirmSuccessData) {
    return (
      <>
        <MeterCamera
          meterCode={selectedMeter?.meter_code}
          meterName={selectedMeter?.name}
          roundTime={selectedRound?.scheduled_time_only}
          onCapture={handleFileSelect}
          onSelectGallery={handleFileSelect}
          onBack={handleBackFromMeter}
        />
        <UnsavedWorkConfirmModal
          isOpen={isUnsavedWorkModalOpen}
          onConfirm={handleConfirmExitMeter}
          onCancel={() => setIsUnsavedWorkModalOpen(false)}
        />
      </>
    );
  }

  // 7.2 STATE 2 & 3: CONTINUOUS CAPTURED PREVIEW & SMOOTH OCR PROCESSING OVERLAY
  if (previewUrl && !result && !error && !confirmSuccessData) {
    return (
      <div className="focused-capture-shell" data-testid="focused-preview-shell">
        {/* Minimal Focused Header */}
        <header className="focused-capture-header" role="banner">
          <button
            type="button"
            className="btn-focused-back"
            onClick={handleBackFromMeter}
            aria-label="Quay lại danh sách công tơ"
            title="Quay lại danh sách"
          >
            <ArrowLeft size={20} strokeWidth={2.4} />
            <span className="focused-back-text">Danh sách</span>
          </button>

          <div className="focused-header-identity">
            <span className="focused-meter-code">{selectedMeter?.meter_code || 'ĐO ĐẾM CÔNG TƠ'}</span>
            {selectedMeter?.name && <span className="focused-meter-name">{selectedMeter.name}</span>}
          </div>

          <div className="focused-header-right">
            {selectedRound?.scheduled_time_only ? (
              <span className="focused-round-pill">Lượt {selectedRound.scheduled_time_only}</span>
            ) : (
              <div style={{ width: '44px' }} />
            )}
          </div>
        </header>

        {/* Viewport: Still image stays visible continuously */}
        <div className="focused-preview-viewport">
          <img
            src={previewUrl}
            alt="Ảnh công tơ xem trước"
            className="focused-preview-image"
          />

          {/* OCR Processing Overlay if loading */}
          {loading && (
            <div
              className="focused-processing-overlay"
              role="status"
              aria-live="polite"
              aria-label="Đang đọc chỉ số"
            >
              <div className="maritime-spinner" aria-hidden="true" />
              <div>
                <p className="focused-processing-title">Đang đọc chỉ số...</p>
                <p className="focused-processing-sub">Giữ ứng dụng mở trong giây lát.</p>
              </div>
            </div>
          )}
        </div>

        {/* Bottom Preview Controls (maintain stable container height during loading to prevent layout shift) */}
        <div
          className="focused-preview-controls"
          style={{
            opacity: loading ? 0.35 : 1,
            pointerEvents: loading ? 'none' : 'auto',
            transition: 'opacity 180ms ease-out',
          }}
        >
          <button
            type="button"
            className="btn btn-secondary"
            onClick={handleReset}
            disabled={loading}
            aria-label="Chụp lại ảnh khác"
          >
            <RotateCcw size={18} strokeWidth={1.8} />
            Chụp lại
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={handleReadMeter}
            disabled={loading}
            aria-label="Tiến hành đọc chỉ số"
          >
            <Check size={20} strokeWidth={2.2} />
            {loading ? 'Đang đọc...' : 'Đọc chỉ số'}
          </button>
        </div>

        <UnsavedWorkConfirmModal
          isOpen={isUnsavedWorkModalOpen}
          onConfirm={handleConfirmExitMeter}
          onCancel={() => setIsUnsavedWorkModalOpen(false)}
        />
      </div>
    );
  }

  // 7.3 STATES 4A, 4B, 5, 6: VERIFICATION, CONFIRMATION, REVIEW & ERROR VIEWS
  return (
    <div className="focused-capture-shell" data-testid="focused-verification-shell">
      {/* Minimal Focused Header */}
      <header className="focused-capture-header" role="banner">
        <button
          type="button"
          className="btn-focused-back"
          onClick={handleBackFromMeter}
          aria-label="Quay lại danh sách công tơ"
          title="Quay lại danh sách"
        >
          <ArrowLeft size={20} strokeWidth={2.4} />
          <span className="focused-back-text">Danh sách</span>
        </button>

        <div className="focused-header-identity">
          <span className="focused-meter-code">{selectedMeter?.meter_code || 'ĐO ĐẾM CÔNG TƠ'}</span>
          {selectedMeter?.name && <span className="focused-meter-name">{selectedMeter.name}</span>}
        </div>

        <div className="focused-header-right">
          {selectedRound?.scheduled_time_only ? (
            <span className="focused-round-pill">Lượt {selectedRound.scheduled_time_only}</span>
          ) : (
            <div style={{ width: '44px' }} />
          )}
        </div>
      </header>

      <div className="focused-verification-scroll">
        {/* ── PHASE D: CONFLICT BANNER (HTTP 409) ── */}
        {submissionPhase === 'REJECTED' && conflictError && (
          <section className="verify-conflict-banner" role="alert" aria-label="Xung đột dữ liệu">
            <div className="conflict-banner-icon"><AlertTriangle size={18} strokeWidth={2.2} /></div>
            <div className="conflict-banner-body">
              <strong className="conflict-banner-title">Chỉ số đã tồn tại trong lượt này</strong>
              <p className="conflict-banner-desc">{conflictError}</p>
            </div>
            <div className="conflict-banner-actions">
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => { handleReset(); setActiveScreen('reading_batch'); }}
              >
                <ArrowLeft size={16} /> Về danh sách
              </button>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => handleReconcileSubmission()}
                disabled={reconciling}
                style={{ fontSize: '13px', minHeight: '42px' }}
              >
                <RefreshCw size={15} className={reconciling ? 'animate-spin' : ''} /> {reconciling ? 'Đang đối soát...' : 'Đối soát kết quả'}
              </button>
            </div>
          </section>
        )}

        {/* ── PHASE D: OUTCOME UNKNOWN BANNER (network drop after send) ── */}
        {submissionPhase === 'OUTCOME_UNKNOWN' && error && (
          <section className="verify-outcome-unknown-banner" role="alert" aria-label="Kết quả chưa xác định">
            <div className="outcome-unknown-icon"><AlertTriangle size={18} strokeWidth={2.2} /></div>
            <div className="outcome-unknown-body">
              <strong className="outcome-unknown-title">Kết quả gửi chưa xác định</strong>
              <p className="outcome-unknown-desc">{error}</p>
            </div>
            <div className="outcome-unknown-actions">
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => handleReconcileSubmission()}
                disabled={reconciling}
                style={{ fontSize: '13px', minHeight: '42px' }}
              >
                <RefreshCw size={15} className={reconciling ? 'animate-spin' : ''} /> {reconciling ? 'Đang đối soát...' : 'Đối soát máy chủ'}
              </button>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => { handleReset(); setActiveScreen('reading_batch'); }}
              >
                <ArrowLeft size={16} /> Kiểm tra danh sách
              </button>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => { setSubmissionPhase('NOT_SUBMITTED'); setError(null); }}
                style={{ fontSize: '13px', minHeight: '42px' }}
              >
                <RotateCcw size={15} /> Thử gửi lại
              </button>
            </div>
          </section>
        )}

        {/* ── STATE 4A: OCR SUCCESS — VERIFY, INSPECT, EDIT & CONFIRM ── */}
        {result && result.status === 'success' && !loading && !confirmSuccessData &&
          submissionPhase !== 'REJECTED' && submissionPhase !== 'OUTCOME_UNKNOWN' && (
          <section className="result-card" aria-label="Kiểm tra chỉ số nhận diện">

            {/* ── A1: IMAGE INSPECTION ── */}
            <div className="verify-section-label">
              <span className="verify-section-eyebrow">ẢNH ĐỐI CHIẾU</span>
              {roiDataUrl ? (
                <div className="image-toggle-pills" role="tablist" aria-label="Chế độ xem ảnh">
                  <button
                    type="button"
                    role="tab"
                    aria-selected={activeImageTab === 'roi'}
                    className={`image-toggle-pill ${activeImageTab === 'roi' ? 'active' : ''}`}
                    onClick={() => setActiveImageTab('roi')}
                  >
                    Vùng số
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
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setIsViewerOpen(true); }}
              aria-label="Chạm để phóng to ảnh đối chiếu"
            >
              <img
                src={currentDisplayUrl}
                alt={activeImageTab === 'roi' ? 'Vùng chỉ số công tơ' : 'Ảnh công tơ gốc'}
                className="inspect-preview-image"
              />
              <div className="zoom-tap-hint">
                <Maximize2 size={13} />
                <span>Phóng to & kiểm tra</span>
              </div>
            </div>

            {/* ── A2: OCR READING (READ-ONLY, EXPLICIT LABEL) ── */}
            <div className="verify-ocr-row" aria-label="Chỉ số OCR nhận diện">
              <span className="verify-ocr-label">OCR NHẬN DIỆN</span>
              <span className="verify-ocr-value" aria-live="polite">
                {result.reading ?? '—'}
                <span className="verify-ocr-unit">kWh</span>
              </span>
            </div>

            {/* ── A3: NUMBER TO SAVE (EDITABLE) ── */}
            {!isEditingReading ? (
              <div className="reading-hero" aria-label={`Số sẽ lưu: ${confirmedReadingValue} kWh`}>
                <div className="reading-hero-header">
                  <span className="reading-hero-eyebrow">SỐ SẼ LƯU</span>
                  <button
                    type="button"
                    className="btn-edit-inline"
                    onClick={handleStartEditing}
                    aria-label="Sửa chỉ số trước khi lưu"
                    title="Sửa chỉ số"
                  >
                    <Edit3 size={14} />
                    <span>Sửa</span>
                  </button>
                </div>
                <div className="reading-hero-value-wrap">
                  <span className="reading-hero-number">{confirmedReadingValue}</span>
                  <span className="reading-hero-unit">kWh</span>
                </div>
                {confirmedReadingValue !== result.reading && (
                  <div className="corrected-notice" role="status">
                    <CheckCircle2 size={13} />
                    <span>Đã sửa từ: <strong>{result.reading}</strong></span>
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
                  >.</button>
                  <span className="edit-input-unit">kWh</span>
                </div>
                {editError && <p className="edit-error-msg">{editError}</p>}
                <p className="edit-reading-original">
                  OCR nhận diện: <strong>{result.reading}</strong>
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

            {/* ── A4: ACTION BUTTONS ── */}
            <div className="button-stack">
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleConfirmReading}
                disabled={confirming || isEditingReading}
                aria-label="Xác nhận & lưu chỉ số"
              >
                <Check size={20} strokeWidth={2.2} />
                {confirming ? 'Đang lưu vào sổ...' : 'Xác nhận & lưu'}
              </button>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={handleReset}
                disabled={confirming}
                aria-label="Chụp lại ảnh khác"
              >
                <RotateCcw size={18} strokeWidth={1.8} />
                Chụp lại
              </button>
            </div>
          </section>
        )}

        {/* ── STATE 4B: CONFIRMED BY SERVER ── */}
        {confirmSuccessData && !loading && (
          <section className="result-card" aria-label="Đã ghi nhận chỉ số thành công">
            <div className="status-badge-success" style={{ background: '#dcfce7', color: '#166534', border: '1px solid #86efac' }}>
              <CheckCircle2 size={16} strokeWidth={2.2} />
              ĐÃ GHI NHẬN VÀO SỔ
            </div>
            <div className="reading-hero">
              <span className="reading-hero-eyebrow">
                {selectedMeter?.meter_code} &bull; Lượt {selectedRound?.scheduled_time_only || '---'}
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
                  <span>Đã hiệu chỉnh (OCR: {confirmSuccessData.ocr_reading})</span>
                </div>
              )}
            </div>
            <div className="meta-row">
              <span className="meta-label">Lượt ghi:</span>
              <span className="meta-value">
                {confirmSuccessData.round_scheduled_local || (selectedRound ? selectedRound.scheduled_local : '---')}
              </span>
            </div>
            <div className="meta-row">
              <span className="meta-label">Nguồn:</span>
              <span className="meta-value">
                {confirmSuccessData.confirmation_source === 'MANUAL_ENTRY'
                  ? 'Nhập thủ công'
                  : confirmSuccessData.confirmation_source === 'USER_CORRECTED'
                  ? 'Hiệu chỉnh từ OCR'
                  : 'Xác nhận OCR'}
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
                onClick={() => { handleReset(); setActiveScreen('reading_batch'); }}
                aria-label="Về danh sách công tơ"
              >
                <ArrowLeft size={18} strokeWidth={2.2} />
                Về danh sách công tơ
              </button>
            </div>
          </section>
        )}

        {/* ── STATE 5: REVIEW — CANNOT AUTO-READ ── */}
        {result && result.status === 'review' && !loading && !confirmSuccessData &&
          submissionPhase !== 'REJECTED' && submissionPhase !== 'OUTCOME_UNKNOWN' && (
          <section className="result-card" role="alert" aria-label="Không đọc được tự động">
            {/* Phase C: single concise status badge — no speculative cause text */}
            <div className="status-badge-review-pill">
              <AlertTriangle size={14} strokeWidth={2.2} />
              CHƯA ĐỌC ĐƯỢC TỰ ĐỘNG
            </div>

            {/* Image inspection — same as 4A */}
            <div className="verify-section-label">
              <span className="verify-section-eyebrow">ẢNH ĐỐI CHIẾU</span>
              {roiDataUrl ? (
                <div className="image-toggle-pills" role="tablist" aria-label="Chế độ xem ảnh">
                  <button
                    type="button"
                    role="tab"
                    aria-selected={activeImageTab === 'roi'}
                    className={`image-toggle-pill ${activeImageTab === 'roi' ? 'active' : ''}`}
                    onClick={() => setActiveImageTab('roi')}
                  >
                    Vùng số
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
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setIsViewerOpen(true); }}
              aria-label="Chạm để phóng to ảnh đối chiếu"
            >
              <img
                src={currentDisplayUrl}
                alt={activeImageTab === 'roi' ? 'Vùng chỉ số công tơ' : 'Ảnh công tơ gốc'}
                className="inspect-preview-image"
              />
              <div className="zoom-tap-hint">
                <Maximize2 size={13} />
                <span>Phóng to & kiểm tra</span>
              </div>
            </div>

            {/* Phase C: single clear instruction — no speculative causes */}
            <p className="review-guide-text">
              Chưa đọc được chỉ số — Kiểm tra ảnh và chọn cách tiếp tục.
            </p>

            {/* Manual entry form */}
            {isManualEntryOpen ? (
              <div className="edit-reading-box" style={{ background: '#f8fafc', border: '1.5px solid #cbd5e1' }}>
                <div className="edit-reading-header">
                  <span className="edit-reading-title">Chỉ số thực tế</span>
                  <button
                    type="button"
                    className="btn-cancel-icon"
                    onClick={() => { setIsManualEntryOpen(false); setManualReadingError(null); }}
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
                  >.</button>
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
                    onClick={() => { setIsManualEntryOpen(false); setManualReadingError(null); }}
                    disabled={confirming}
                  >
                    Hủy
                  </button>
                </div>
              </div>
            ) : (
              /* Phase C: 3 business actions, no extra explanatory boxes */
              <div className="button-stack">
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => { setManualReadingValue(''); setManualReadingError(null); setIsManualEntryOpen(true); }}
                  disabled={confirming}
                  aria-label="Nhập chỉ số thủ công từ ảnh"
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
                  className="btn btn-secondary btn-review-flag"
                  onClick={handleMarkReview}
                  disabled={confirming}
                  aria-label="Đánh dấu cần kiểm tra thực địa"
                >
                  <AlertTriangle size={18} strokeWidth={2} />
                  <span>{confirming ? 'Đang lưu...' : 'Đánh dấu cần kiểm tra'}</span>
                </button>
              </div>
            )}
          </section>
        )}

        {/* ── STATE 6: OCR ERROR (non-submission error) ── */}
        {error && !loading && submissionPhase !== 'OUTCOME_UNKNOWN' && submissionPhase !== 'REJECTED' && (
          <section className="result-card" role="alert" aria-label="Lỗi xử lý">
            {previewUrl && (
              <div className="preview-container" style={{ maxHeight: '140px', aspectRatio: 'auto', marginBottom: '12px' }}>
                <img src={previewUrl} alt="Ảnh công tơ xem trước" className="preview-image" />
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
      </div>



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
    </div>
  );
}
