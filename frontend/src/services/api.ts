import {
  AdminAuditLogListResponse,
  AdminDashboardResponse,
  AdminMeterCreatePayload,
  AdminMeterItem,
  AdminMeterLatestReadingResponse,
  AdminMeterListResponse,
  AdminMeterReadingInspectionResponse,
  AdminMeterRetirePayload,
  AdminMeterUpdatePayload,
  AdminScheduleCreateResponse,
  AdminScheduleDeleteResponse,
  AdminSchedulePreviewResponse,
  AdminTechnicalDetailsResponse,
  AdminTechnicalMeterListResponse,
  AdminTechnicalOverviewResponse,
  AttendanceActionResponse,
  BatchMeterListResponse,
  ConfirmReadingPayload,
  MarkReviewPayload,
  MeterDetailResponse,
  MeterReadingActionResponse,
  MeterReadingHistoryItem,
  MeterReadResponse,
  ReadingBatch,
  ReadingRoundCurrentResponse,
  ReadingRoundListResponse,
  ReportMeterDetailResponse,
  ReportOverviewResponse,
  RoundMeterListResponse,
  TodayAttendance,
  TodayOperationsResponse,
  User,
  AdminRosterResponse,
  AdminShiftAssignItem,
  AdminAutoPatternPreviewResponse,
  LeaveRequestCreatePayload,
  LeaveRequestItem,
  UserMonthlyScheduleResponse,
  MapOverviewResponse,
  OperationalZoneOut,
  MapMeterOut,
  ZoneReassignRequest,
  ZoneReassignResponse,
  AdminMeterRelocatePayload,
  AdminMeterChangeZonePayload,
  MapVersionZoneOut,
  MapVersionOut,
  MapVersionListResponse,
  MapValidationResponse,
  MapPublishResponse,
  ActiveMapConfiguration,
} from '../types';


const API_BASE_URL =
  (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_API_BASE_URL?.trim()) || '';

let cachedCsrfToken: string | null = null;

// ==============================================================================
// ERROR HANDLING & CENTRAL AUTH EXPIRATION LISTENER
// ==============================================================================
export class ApiError extends Error {
  status: number;
  detail?: string;

  constructor(status: number, message: string, detail?: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.detail = detail;
  }
}

type AuthExpiredCallback = (message: string) => void;
let authExpiredHandler: AuthExpiredCallback | null = null;

export function setOnAuthExpired(handler: AuthExpiredCallback | null) {
  authExpiredHandler = handler;
}

export function notifyAuthExpired(message = 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.') {
  cachedCsrfToken = null;
  if (authExpiredHandler) {
    authExpiredHandler(message);
  }
}

async function apiFetch(
  endpoint: string,
  options: RequestInit = {},
  skip401Notify = false
): Promise<Response> {
  const url = endpoint.startsWith('http') ? endpoint : `${API_BASE_URL}${endpoint}`;
  let res: Response;
  try {
    res = await fetch(url, {
      ...options,
      credentials: 'include',
    });
  } catch {
    throw new ApiError(0, 'Không thể kết nối đến hệ thống. Kiểm tra kết nối mạng và thử lại.');
  }

  if (res.status === 401 && !skip401Notify) {
    notifyAuthExpired('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.');
    throw new ApiError(401, 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.');
  }

  return res;
}

// ==============================================================================
// AUTHENTICATION APIS
// ==============================================================================
export async function getCsrfToken(forceRefresh = false): Promise<string> {
  if (cachedCsrfToken && !forceRefresh) {
    return cachedCsrfToken;
  }
  try {
    const res = await apiFetch('/api/v1/auth/csrf', { method: 'GET' });
    if (!res.ok) {
      throw new ApiError(res.status, 'Không thể lấy mã CSRF Token.');
    }
    const data = await res.json();
    cachedCsrfToken = data.csrf_token;
    return cachedCsrfToken!;
  } catch (err) {
    cachedCsrfToken = null;
    throw err;
  }
}

export async function getMe(): Promise<User> {
  // Initial bootstrap skips global expiration notice on fresh unauthenticated sessions
  const res = await apiFetch('/api/v1/auth/me', { method: 'GET' }, true);
  if (res.status === 401) {
    throw new ApiError(401, 'Chưa đăng nhập.');
  }
  if (!res.ok) {
    throw new ApiError(res.status, 'Không thể kiểm tra phiên đăng nhập.');
  }
  return res.json();
}

export async function login(employeeCode: string, password: string): Promise<User> {
  cachedCsrfToken = null;
  const res = await apiFetch(
    '/api/v1/auth/login',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        employee_code: employeeCode.trim(),
        password,
      }),
    },
    true
  );

  if (!res.ok) {
    let detail = 'Không thể đăng nhập lúc này. Vui lòng thử lại.';
    if (res.status === 401) {
      detail = 'Mã nhân viên hoặc mật khẩu không chính xác.';
    } else if (res.status === 429) {
      detail = 'Bạn đã thử đăng nhập quá nhiều lần. Vui lòng thử lại sau ít phút.';
    } else {
      try {
        const errJson = await res.json();
        if (errJson.detail && typeof errJson.detail === 'string') {
          detail = errJson.detail;
        }
      } catch {
        // ignore
      }
    }
    throw new ApiError(res.status, detail);
  }

  const data = await res.json();
  // Fetch fresh CSRF token after login
  await getCsrfToken(true).catch(() => {});
  return data.user;
}

export async function logout(): Promise<void> {
  const csrfToken = await getCsrfToken().catch(() => '');
  const url = `${API_BASE_URL}/api/v1/auth/logout`;
  let res: Response;
  try {
    res = await fetch(url, {
      method: 'POST',
      headers: {
        'X-CSRF-Token': csrfToken,
      },
      credentials: 'include',
    });
  } catch {
    throw new ApiError(0, 'Không thể kết nối để đăng xuất. Vui lòng thử lại.');
  }

  // 200 OK: session revoked and cookie cleared on server
  // 401 Unauthorized: session already expired/revoked on server
  if (res.status === 200 || res.status === 401) {
    cachedCsrfToken = null;
    return;
  }

  let detail = 'Không thể kết nối để đăng xuất. Vui lòng thử lại.';
  try {
    const errJson = await res.json();
    if (errJson.detail && typeof errJson.detail === 'string') {
      detail = errJson.detail;
    }
  } catch {
    // ignore
  }
  throw new ApiError(res.status, detail);
}

// ==============================================================================
// ATTENDANCE APIS
// ==============================================================================
export async function getTodayAttendance(): Promise<TodayAttendance> {
  const res = await apiFetch('/api/v1/attendance/today', { method: 'GET' });
  if (!res.ok) {
    throw new ApiError(res.status, 'Không thể tải trạng thái chấm công.');
  }
  return res.json();
}

export async function submitAttendance(
  eventType: 'CHECK_IN' | 'CHECK_OUT',
  imageFile: File,
  captureSource = 'live_camera'
): Promise<AttendanceActionResponse> {
  const csrfToken = await getCsrfToken();
  const formData = new FormData();
  formData.append('file', imageFile);
  formData.append('capture_source', captureSource);

  const endpoint =
    eventType === 'CHECK_IN'
      ? '/api/v1/attendance/check-in'
      : '/api/v1/attendance/check-out';

  const res = await apiFetch(endpoint, {
    method: 'POST',
    headers: {
      'X-CSRF-Token': csrfToken,
    },
    body: formData,
  });

  if (!res.ok) {
    let detail = 'Không thể ghi nhận chấm công.';
    try {
      const errJson = await res.json();
      if (errJson.detail) {
        detail = errJson.detail;
      }
    } catch {
      // ignore
    }
    throw new ApiError(res.status, detail);
  }

  return res.json();
}

// ==============================================================================
// METER READING INFERENCE API
// ==============================================================================
export async function readMeter(imageFile: File): Promise<MeterReadResponse> {
  const csrfToken = await getCsrfToken();
  const formData = new FormData();
  formData.append('file', imageFile);

  const response = await apiFetch('/api/v1/read-meter', {
    method: 'POST',
    headers: {
      'X-CSRF-Token': csrfToken,
    },
    body: formData,
  });

  if (!response.ok) {
    if (response.status === 403) {
      throw new ApiError(403, 'Lỗi bảo mật phiên làm việc (CSRF). Vui lòng thử lại.');
    }
    if (response.status === 413) {
      throw new ApiError(413, 'Dung lượng ảnh vượt quá giới hạn 12MB. Vui lòng chụp lại.');
    }
    if (response.status === 415) {
      throw new ApiError(415, 'Chỉ hỗ trợ tệp hình ảnh hợp lệ.');
    }
    if (response.status === 400) {
      let detailMsg = 'Ảnh không hợp lệ hoặc không thể giải mã.';
      try {
        const errJson = await response.json();
        if (errJson.detail && typeof errJson.detail === 'string') {
          detailMsg = errJson.detail;
        }
      } catch {
        // ignore
      }
      throw new ApiError(400, detailMsg);
    }
    if (response.status >= 500) {
      throw new ApiError(response.status, 'Hệ thống máy chủ gặp sự cố xử lý. Vui lòng thử lại.');
    }
    throw new ApiError(response.status, 'Đã xảy ra lỗi khi gửi ảnh tới máy chủ.');
  }

  return response.json();
}

// ==============================================================================
// METER LOGBOOK & READING BATCH APIS
// ==============================================================================
export async function getCurrentBatch(): Promise<ReadingBatch | null> {
  const res = await apiFetch('/api/v1/reading-batches/current', { method: 'GET' });
  if (res.status === 404) {
    return null;
  }
  if (!res.ok) {
    throw new ApiError(res.status, 'Không thể tải thông tin đợt ghi chỉ số.');
  }
  return res.json();
}

export async function getTodayOperations(date?: string): Promise<TodayOperationsResponse> {
  const params = new URLSearchParams();
  if (date && date.trim()) {
    params.set('date', date.trim());
  }
  const queryStr = params.toString() ? `?${params.toString()}` : '';
  const res = await apiFetch(`/api/v1/meter-operations/today${queryStr}`, { method: 'GET' });
  if (!res.ok) {
    throw new ApiError(res.status, 'Không thể tải dữ liệu điều hành công tơ hôm nay.');
  }
  return res.json();
}

export async function getCurrentRound(date?: string): Promise<ReadingRoundCurrentResponse> {
  const params = new URLSearchParams();
  if (date && date.trim()) {
    params.set('date', date.trim());
  }
  const queryStr = params.toString() ? `?${params.toString()}` : '';
  const res = await apiFetch(`/api/v1/reading-rounds/current${queryStr}`, { method: 'GET' });
  if (res.status === 404) {
    return { current_round: null, nearest_upcoming_round: null, batch: null };
  }
  if (!res.ok) {
    throw new ApiError(res.status, 'Không thể tải thông tin lượt ghi chỉ số hiện tại.');
  }
  return res.json();
}

export async function getBatchRounds(batchId: string, date?: string): Promise<ReadingRoundListResponse> {
  const params = new URLSearchParams();
  if (date && date.trim()) {
    params.set('date', date.trim());
  }
  const queryStr = params.toString() ? `?${params.toString()}` : '';
  const res = await apiFetch(`/api/v1/reading-batches/${batchId}/rounds${queryStr}`, { method: 'GET' });
  if (!res.ok) {
    throw new ApiError(res.status, 'Không thể tải danh sách lượt ghi chỉ số.');
  }
  return res.json();
}

export async function getRoundMeters(
  roundId: string,
  search?: string,
  statusFilter?: string
): Promise<RoundMeterListResponse> {
  const params = new URLSearchParams();
  if (search && search.trim()) {
    params.set('search', search.trim());
  }
  if (statusFilter && statusFilter.trim()) {
    params.set('status', statusFilter.trim());
  }
  const url = `/api/v1/reading-rounds/${roundId}/meters?${params.toString()}`;
  const res = await apiFetch(url, { method: 'GET' });
  if (!res.ok) {
    throw new ApiError(res.status, 'Không thể tải danh sách công tơ của lượt này.');
  }
  return res.json();
}

export async function getBatchMeters(
  batchId: string,
  search?: string,
  statusFilter?: string
): Promise<BatchMeterListResponse> {
  const params = new URLSearchParams();
  if (search && search.trim()) {
    params.set('search', search.trim());
  }
  if (statusFilter && statusFilter.trim()) {
    params.set('status', statusFilter.trim());
  }
  const url = `/api/v1/reading-batches/${batchId}/meters?${params.toString()}`;
  const res = await apiFetch(url, { method: 'GET' });
  if (!res.ok) {
    throw new ApiError(res.status, 'Không thể tải danh sách công tơ trong đợt.');
  }
  return res.json();
}

export async function confirmMeterReading(
  payload: ConfirmReadingPayload
): Promise<MeterReadingActionResponse> {
  const csrfToken = await getCsrfToken();
  const res = await apiFetch('/api/v1/meter-readings/confirm', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-CSRF-Token': csrfToken,
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    let detail = 'Không thể xác nhận chỉ số.';
    try {
      const errJson = await res.json();
      if (errJson.detail) detail = errJson.detail;
    } catch {
      // ignore
    }
    throw new ApiError(res.status, detail);
  }
  return res.json();
}

export async function markMeterReview(
  payload: MarkReviewPayload
): Promise<MeterReadingActionResponse> {
  const csrfToken = await getCsrfToken();
  const res = await apiFetch('/api/v1/meter-readings/review', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-CSRF-Token': csrfToken,
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    let detail = 'Không thể đánh dấu cần kiểm tra.';
    try {
      const errJson = await res.json();
      if (errJson.detail) detail = errJson.detail;
    } catch {
      // ignore
    }
    throw new ApiError(res.status, detail);
  }
  return res.json();
}

export async function getMeterDetail(meterId: string): Promise<MeterDetailResponse> {
  const res = await apiFetch(`/api/v1/meters/${meterId}`, { method: 'GET' });
  if (!res.ok) {
    throw new ApiError(res.status, 'Không thể tải thông tin chi tiết công tơ.');
  }
  return res.json();
}

export async function getMeterReadings(meterId: string): Promise<MeterReadingHistoryItem[]> {
  const res = await apiFetch(`/api/v1/meters/${meterId}/readings`, { method: 'GET' });
  if (!res.ok) {
    throw new ApiError(res.status, 'Không thể tải lịch sử ghi chỉ số.');
  }
  return res.json();
}

export async function getReportOverview(date?: string): Promise<ReportOverviewResponse> {
  const url = date
    ? `/api/v1/reports/overview?date=${encodeURIComponent(date)}`
    : `/api/v1/reports/overview`;
  const res = await apiFetch(url, { method: 'GET' });
  if (!res.ok) {
    throw new ApiError(res.status, 'Không thể tải dữ liệu báo cáo tổng quan.');
  }
  return res.json();
}

export async function getMeterReport(
  meterId: string,
  date?: string
): Promise<ReportMeterDetailResponse> {
  const url = date
    ? `/api/v1/reports/meters/${meterId}?date=${encodeURIComponent(date)}`
    : `/api/v1/reports/meters/${meterId}`;
  const res = await apiFetch(url, { method: 'GET' });
  if (!res.ok) {
    throw new ApiError(res.status, 'Không thể tải báo cáo công tơ.');
  }
  return res.json();
}

export async function downloadReportCsv(date?: string): Promise<void> {
  const url = date
    ? `/api/v1/reports/export.csv?date=${encodeURIComponent(date)}`
    : `/api/v1/reports/export.csv`;
  const res = await apiFetch(url, { method: 'GET' });
  if (!res.ok) {
    throw new ApiError(res.status, 'Không thể xuất dữ liệu báo cáo CSV.');
  }
  const blob = await res.blob();
  const downloadUrl = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = downloadUrl;
  const filenameDate = date || new Date().toISOString().split('T')[0];
  a.download = `bao-cao-cong-to-${filenameDate}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(downloadUrl);
}

// ==============================================================================
// ADMIN OPERATIONS V1 APIS
// ==============================================================================
export async function getAdminMeters(
  search?: string,
  statusFilter?: string,
  meterType?: string,
  scenarioId?: string,
  dataOrigin?: string
): Promise<AdminMeterListResponse> {
  const params = new URLSearchParams();
  if (search && search.trim()) params.set('search', search.trim());
  if (statusFilter && statusFilter.trim()) params.set('status', statusFilter.trim());
  if (meterType && meterType.trim()) params.set('meter_type', meterType.trim());
  if (scenarioId && scenarioId.trim()) params.set('scenario_id', scenarioId.trim());
  if (dataOrigin && dataOrigin.trim()) params.set('data_origin', dataOrigin.trim());

  const url = `/api/v1/admin/meters?${params.toString()}`;
  const res = await apiFetch(url, { method: 'GET' });
  if (!res.ok) {
    let detail = 'Không thể tải danh sách công tơ.';
    try {
      const err = await res.json();
      if (err.detail) detail = err.detail;
    } catch {
      // ignore
    }
    throw new ApiError(res.status, detail);
  }
  return res.json();
}

export async function createAdminMeter(
  payload: AdminMeterCreatePayload
): Promise<AdminMeterItem> {
  const csrfToken = await getCsrfToken();
  const res = await apiFetch('/api/v1/admin/meters', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-CSRF-Token': csrfToken,
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    let detail = 'Không thể tạo mới công tơ.';
    try {
      const err = await res.json();
      if (err.detail) detail = err.detail;
    } catch {
      // ignore
    }
    throw new ApiError(res.status, detail);
  }
  return res.json();
}

export async function updateAdminMeter(
  meterId: string,
  payload: AdminMeterUpdatePayload
): Promise<AdminMeterItem> {
  const csrfToken = await getCsrfToken();
  const res = await apiFetch(`/api/v1/admin/meters/${meterId}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'X-CSRF-Token': csrfToken,
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    let detail = 'Không thể cập nhật thông tin công tơ.';
    try {
      const err = await res.json();
      if (err.detail) detail = err.detail;
    } catch {
      // ignore
    }
    throw new ApiError(res.status, detail);
  }
  return res.json();
}

export async function deactivateAdminMeter(meterId: string): Promise<AdminMeterItem> {
  const csrfToken = await getCsrfToken();
  const res = await apiFetch(`/api/v1/admin/meters/${meterId}/deactivate`, {
    method: 'POST',
    headers: {
      'X-CSRF-Token': csrfToken,
    },
  });

  if (!res.ok) {
    let detail = 'Không thể ngừng sử dụng công tơ.';
    try {
      const err = await res.json();
      if (err.detail) detail = err.detail;
    } catch {
      // ignore
    }
    throw new ApiError(res.status, detail);
  }
  return res.json();
}

export async function activateAdminMeter(meterId: string): Promise<AdminMeterItem> {
  const csrfToken = await getCsrfToken();
  const res = await apiFetch(`/api/v1/admin/meters/${meterId}/activate`, {
    method: 'POST',
    headers: {
      'X-CSRF-Token': csrfToken,
    },
  });

  if (!res.ok) {
    let detail = 'Không thể kích hoạt lại công tơ.';
    try {
      const err = await res.json();
      if (err.detail) detail = err.detail;
    } catch {
      // ignore
    }
    throw new ApiError(res.status, detail);
  }
  return res.json();
}

export async function reactivateAdminMeter(meterId: string): Promise<AdminMeterItem> {
  const csrfToken = await getCsrfToken();
  const res = await apiFetch(`/api/v1/admin/meters/${meterId}/reactivate`, {
    method: 'POST',
    headers: {
      'X-CSRF-Token': csrfToken,
    },
  });

  if (!res.ok) {
    let detail = 'Không thể kích hoạt lại công tơ.';
    try {
      const err = await res.json();
      if (err.detail) detail = err.detail;
    } catch {
      // ignore
    }
    throw new ApiError(res.status, detail);
  }
  return res.json();
}

export async function retireAdminMeter(
  meterId: string,
  payload?: AdminMeterRetirePayload
): Promise<AdminMeterItem> {
  const csrfToken = await getCsrfToken();
  const res = await apiFetch(`/api/v1/admin/meters/${meterId}/retire`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-CSRF-Token': csrfToken,
    },
    body: JSON.stringify(payload || {}),
  });

  if (!res.ok) {
    let detail = 'Không thể ngừng sử dụng vĩnh viễn công tơ.';
    try {
      const err = await res.json();
      if (err.detail) detail = err.detail;
    } catch {
      // ignore
    }
    throw new ApiError(res.status, detail);
  }
  return res.json();
}

export async function getAdminSchedules(date?: string): Promise<ReadingRoundListResponse> {
  const params = new URLSearchParams();
  if (date && date.trim()) params.set('date', date.trim());

  const url = `/api/v1/admin/schedules?${params.toString()}`;
  const res = await apiFetch(url, { method: 'GET' });
  if (!res.ok) {
    let detail = 'Không thể tải lịch ghi chỉ số.';
    try {
      const err = await res.json();
      if (err.detail) detail = err.detail;
    } catch {
      // ignore
    }
    throw new ApiError(res.status, detail);
  }
  return res.json();
}

export async function previewAdminSchedule(payload: {
  date: string;
  start_time?: string;
  end_time?: string;
  interval_minutes?: number;
}): Promise<AdminSchedulePreviewResponse> {
  const csrfToken = await getCsrfToken();
  const res = await apiFetch('/api/v1/admin/schedules/preview', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-CSRF-Token': csrfToken,
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    let detail = 'Không thể kiểm tra lịch đọc trước.';
    try {
      const err = await res.json();
      if (err.detail) detail = err.detail;
    } catch {
      // ignore
    }
    throw new ApiError(res.status, detail);
  }
  return res.json();
}

export async function createAdminSchedule(payload: {
  date: string;
  start_time?: string;
  end_time?: string;
  interval_minutes?: number;
}): Promise<AdminScheduleCreateResponse> {
  const csrfToken = await getCsrfToken();
  const res = await apiFetch('/api/v1/admin/schedules', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-CSRF-Token': csrfToken,
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    let detail = 'Không thể tạo lịch đọc mới.';
    try {
      const err = await res.json();
      if (err.detail) detail = err.detail;
    } catch {
      // ignore
    }
    throw new ApiError(res.status, detail);
  }
  return res.json();
}

export async function deleteAdminScheduleRound(
  roundId: string,
  force = false
): Promise<AdminScheduleDeleteResponse> {
  const csrfToken = await getCsrfToken();
  const url = `/api/v1/admin/schedules/rounds/${roundId}${force ? '?force=true' : ''}`;
  const res = await apiFetch(url, {
    method: 'DELETE',
    headers: {
      'X-CSRF-Token': csrfToken,
    },
  });

  if (!res.ok) {
    let detail = 'Không thể xóa lượt ghi chỉ số.';
    try {
      const err = await res.json();
      if (err.detail) detail = err.detail;
    } catch {
      // ignore
    }
    throw new ApiError(res.status, detail);
  }
  return res.json();
}

export async function deleteAdminSchedulesByDate(
  date: string,
  force = false
): Promise<AdminScheduleDeleteResponse> {
  const csrfToken = await getCsrfToken();
  const url = `/api/v1/admin/schedules?date=${encodeURIComponent(date)}${force ? '&force=true' : ''}`;
  const res = await apiFetch(url, {
    method: 'DELETE',
    headers: {
      'X-CSRF-Token': csrfToken,
    },
  });

  if (!res.ok) {
    let detail = 'Không thể xóa lịch đọc theo ngày.';
    try {
      const err = await res.json();
      if (err.detail) detail = err.detail;
    } catch {
      // ignore
    }
    throw new ApiError(res.status, detail);
  }
  return res.json();
}

export async function getAdminDashboard(
  date?: string,
  location?: string
): Promise<AdminDashboardResponse> {
  const params = new URLSearchParams();
  if (date && date.trim()) params.set('date', date.trim());
  if (location && location.trim()) params.set('location', location.trim());

  const url = `/api/v1/admin/dashboard?${params.toString()}`;
  const res = await apiFetch(url, { method: 'GET' });
  if (!res.ok) {
    let detail = 'Không thể tải bảng điều hành quản trị.';
    try {
      const err = await res.json();
      if (err.detail) detail = err.detail;
    } catch {
      // ignore
    }
    throw new ApiError(res.status, detail);
  }
  return res.json();
}

export async function getAdminAuditLogs(
  action?: string,
  resourceType?: string,
  limit = 50,
  offset = 0
): Promise<AdminAuditLogListResponse> {
  const params = new URLSearchParams();
  if (action && action.trim()) params.set('action', action.trim());
  if (resourceType && resourceType.trim()) params.set('resource_type', resourceType.trim());
  params.set('limit', String(limit));
  params.set('offset', String(offset));

  const url = `/api/v1/admin/audit-logs?${params.toString()}`;
  const res = await apiFetch(url, { method: 'GET' });
  if (!res.ok) {
    let detail = 'Không thể tải nhật ký quản trị.';
    try {
      const err = await res.json();
      if (err.detail) detail = err.detail;
    } catch {
      // ignore
    }
    throw new ApiError(res.status, detail);
  }
  return res.json();
}

// --- Admin Technical Reports API Client ---

export interface TechnicalReportFilterParams {
  startDate?: string;
  endDate?: string;
  location?: string;
  meterType?: string;
  confirmationSource?: string;
}

export async function getAdminTechnicalOverview(
  filters: TechnicalReportFilterParams
): Promise<AdminTechnicalOverviewResponse> {
  const params = new URLSearchParams();
  if (filters.startDate) params.set('start_date', filters.startDate);
  if (filters.endDate) params.set('end_date', filters.endDate);
  if (filters.location && filters.location !== 'ALL') params.set('location', filters.location);
  if (filters.meterType && filters.meterType !== 'ALL') params.set('meter_type', filters.meterType);
  if (filters.confirmationSource && filters.confirmationSource !== 'ALL') {
    params.set('confirmation_source', filters.confirmationSource);
  }

  const url = `/api/v1/admin/reports/technical/overview?${params.toString()}`;
  const res = await apiFetch(url, { method: 'GET' });
  if (!res.ok) {
    let detail = 'Không thể tải báo cáo kỹ thuật tổng quan.';
    try {
      const err = await res.json();
      if (err.detail) detail = err.detail;
    } catch {
      // ignore
    }
    throw new ApiError(res.status, detail);
  }
  return res.json();
}

export async function getAdminTechnicalMeters(
  filters: TechnicalReportFilterParams & { meterId?: string }
): Promise<AdminTechnicalMeterListResponse> {
  const params = new URLSearchParams();
  if (filters.startDate) params.set('start_date', filters.startDate);
  if (filters.endDate) params.set('end_date', filters.endDate);
  if (filters.location && filters.location !== 'ALL') params.set('location', filters.location);
  if (filters.meterType && filters.meterType !== 'ALL') params.set('meter_type', filters.meterType);
  if (filters.confirmationSource && filters.confirmationSource !== 'ALL') {
    params.set('confirmation_source', filters.confirmationSource);
  }
  if (filters.meterId) params.set('meter_id', filters.meterId);

  const url = `/api/v1/admin/reports/technical/meters?${params.toString()}`;
  const res = await apiFetch(url, { method: 'GET' });
  if (!res.ok) {
    let detail = 'Không thể tải báo cáo kỹ thuật theo công tơ.';
    try {
      const err = await res.json();
      if (err.detail) detail = err.detail;
    } catch {
      // ignore
    }
    throw new ApiError(res.status, detail);
  }
  return res.json();
}

export async function getAdminTechnicalDetails(
  filters: TechnicalReportFilterParams & { statusFilter?: string; page?: number; limit?: number }
): Promise<AdminTechnicalDetailsResponse> {
  const params = new URLSearchParams();
  if (filters.startDate) params.set('start_date', filters.startDate);
  if (filters.endDate) params.set('end_date', filters.endDate);
  if (filters.location && filters.location !== 'ALL') params.set('location', filters.location);
  if (filters.meterType && filters.meterType !== 'ALL') params.set('meter_type', filters.meterType);
  if (filters.confirmationSource && filters.confirmationSource !== 'ALL') {
    params.set('confirmation_source', filters.confirmationSource);
  }
  if (filters.statusFilter && filters.statusFilter !== 'ALL') {
    params.set('status_filter', filters.statusFilter);
  }
  if (filters.page) params.set('page', String(filters.page));
  if (filters.limit) params.set('limit', String(filters.limit));

  const url = `/api/v1/admin/reports/technical/details?${params.toString()}`;
  const res = await apiFetch(url, { method: 'GET' });
  if (!res.ok) {
    let detail = 'Không thể tải chi tiết dữ liệu kiểm toán kỹ thuật.';
    try {
      const err = await res.json();
      if (err.detail) detail = err.detail;
    } catch {
      // ignore
    }
    throw new ApiError(res.status, detail);
  }
  return res.json();
}

export function getAdminTechnicalExportUrl(filters: TechnicalReportFilterParams): string {
  const params = new URLSearchParams();
  if (filters.startDate) params.set('start_date', filters.startDate);
  if (filters.endDate) params.set('end_date', filters.endDate);
  if (filters.location && filters.location !== 'ALL') params.set('location', filters.location);
  if (filters.meterType && filters.meterType !== 'ALL') params.set('meter_type', filters.meterType);
  if (filters.confirmationSource && filters.confirmationSource !== 'ALL') {
    params.set('confirmation_source', filters.confirmationSource);
  }
  return `/api/v1/admin/reports/technical/export.csv?${params.toString()}`;
}

// ==============================================================================
// ADMIN METER READING INSPECTION APIS
// ==============================================================================
export async function getAdminMeterReadingInspection(
  readingId: string
): Promise<AdminMeterReadingInspectionResponse> {
  const res = await apiFetch(`/api/v1/admin/meter-readings/${readingId}`, { method: 'GET' });
  if (!res.ok) {
    let detail = 'Không thể tải thông tin bản ghi kiểm tra.';
    try {
      const errJson = await res.json();
      if (errJson.detail) detail = errJson.detail;
    } catch {
      // ignore
    }
    throw new ApiError(res.status, detail);
  }
  return res.json();
}

export function getAdminMeterReadingEvidenceUrl(readingId: string): string {
  return `/api/v1/admin/meter-readings/${readingId}/evidence`;
}

export async function getAdminMeterLatestReading(
  meterId: string
): Promise<AdminMeterLatestReadingResponse> {
  const res = await apiFetch(`/api/v1/admin/meters/${meterId}/latest-reading`, { method: 'GET' });
  if (!res.ok) {
    let detail = 'Công tơ chưa có bản ghi để kiểm tra.';
    try {
      const errJson = await res.json();
      if (errJson.detail) detail = errJson.detail;
    } catch {
      // ignore
    }
    throw new ApiError(res.status, detail);
  }
  return res.json();
}

// ==============================================================================
// WORK SCHEDULE & LEAVE MANAGEMENT APIS
// ==============================================================================

export async function getUserMonthlySchedule(
  month?: string
): Promise<UserMonthlyScheduleResponse> {
  const query = month ? `?month=${encodeURIComponent(month)}` : '';
  const res = await apiFetch(`/api/v1/schedule/my-month${query}`, { method: 'GET' });
  if (!res.ok) {
    let detail = 'Không thể tải lịch làm việc tháng.';
    try {
      const err = await res.json();
      if (err.detail) detail = err.detail;
    } catch {}
    throw new ApiError(res.status, detail);
  }
  return res.json();
}

export async function createLeaveRequest(
  payload: LeaveRequestCreatePayload
): Promise<{ status: string; id: string; message: string }> {
  const csrfToken = await getCsrfToken();
  const res = await apiFetch('/api/v1/schedule/leave-requests', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-CSRF-Token': csrfToken,
    },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    let detail = 'Không thể gửi đơn xin nghỉ phép.';
    try {
      const err = await res.json();
      if (err.detail) detail = err.detail;
    } catch {}
    throw new ApiError(res.status, detail);
  }
  return res.json();
}

export async function getMyLeaveRequests(): Promise<LeaveRequestItem[]> {
  const res = await apiFetch('/api/v1/schedule/leave-requests/my', { method: 'GET' });
  if (!res.ok) {
    let detail = 'Không thể tải danh sách đơn xin nghỉ phép.';
    try {
      const err = await res.json();
      if (err.detail) detail = err.detail;
    } catch {}
    throw new ApiError(res.status, detail);
  }
  return res.json();
}

export async function cancelLeaveRequest(requestId: string): Promise<void> {
  const csrfToken = await getCsrfToken();
  const res = await apiFetch(`/api/v1/schedule/leave-requests/${requestId}`, {
    method: 'DELETE',
    headers: {
      'X-CSRF-Token': csrfToken,
    },
  });
  if (!res.ok) {
    let detail = 'Không thể hủy đơn xin nghỉ phép.';
    try {
      const err = await res.json();
      if (err.detail) detail = err.detail;
    } catch {}
    throw new ApiError(res.status, detail);
  }
}

// Admin Roster & Leave APIs

export async function getAdminRoster(
  month?: string
): Promise<AdminRosterResponse> {
  const query = month ? `?month=${encodeURIComponent(month)}` : '';
  const res = await apiFetch(`/api/v1/admin/roster${query}`, { method: 'GET' });
  if (!res.ok) {
    let detail = 'Không thể tải ma trận phân ca tháng.';
    try {
      const err = await res.json();
      if (err.detail) detail = err.detail;
    } catch {}
    throw new ApiError(res.status, detail);
  }
  return res.json();
}

export async function assignAdminShifts(
  assignments: AdminShiftAssignItem[]
): Promise<{ status: string; updated_count: number; message: string }> {
  const csrfToken = await getCsrfToken();
  const res = await apiFetch('/api/v1/admin/roster/assign', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-CSRF-Token': csrfToken,
    },
    body: JSON.stringify({ assignments }),
  });
  if (!res.ok) {
    let detail = 'Không thể lưu lịch phân ca.';
    try {
      const err = await res.json();
      if (err.detail) detail = err.detail;
    } catch {}
    throw new ApiError(res.status, detail);
  }
  return res.json();
}

export async function autoPatternAdminRoster(
  month: string,
  userIds: string[],
  patternType: string = 'THREE_SHIFT_FOUR_TEAM'
): Promise<{ status: string; updated_count: number; message: string }> {
  const csrfToken = await getCsrfToken();
  const res = await apiFetch('/api/v1/admin/roster/auto-pattern', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-CSRF-Token': csrfToken,
    },
    body: JSON.stringify({
      month,
      user_ids: userIds,
      pattern_type: patternType,
    }),
  });
  if (!res.ok) {
    let detail = 'Không thể áp dụng chu kỳ ca tự động.';
    try {
      const err = await res.json();
      if (err.detail) detail = err.detail;
    } catch {}
    throw new ApiError(res.status, detail);
  }
  return res.json();
}

export async function previewAutoPatternAdminRoster(
  month: string,
  userIds: string[],
  patternType: string = 'THREE_SHIFT_FOUR_TEAM'
): Promise<AdminAutoPatternPreviewResponse> {
  const csrfToken = await getCsrfToken();
  const res = await apiFetch('/api/v1/admin/roster/auto-pattern/preview', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-CSRF-Token': csrfToken,
    },
    body: JSON.stringify({
      month,
      user_ids: userIds,
      pattern_type: patternType,
    }),
  });
  if (!res.ok) {
    let detail = 'Không thể xem trước tác động của chu kỳ ca.';
    try {
      const err = await res.json();
      if (err.detail) detail = err.detail;
    } catch {}
    throw new ApiError(res.status, detail);
  }
  return res.json();
}


export async function getAdminLeaveRequests(
  statusFilter?: string
): Promise<LeaveRequestItem[]> {
  const query = statusFilter && statusFilter !== 'ALL' ? `?status=${encodeURIComponent(statusFilter)}` : '';
  const res = await apiFetch(`/api/v1/admin/leave-requests${query}`, { method: 'GET' });
  if (!res.ok) {
    let detail = 'Không thể tải danh sách đơn xin nghỉ phép.';
    try {
      const err = await res.json();
      if (err.detail) detail = err.detail;
    } catch {}
    throw new ApiError(res.status, detail);
  }
  return res.json();
}

export async function reviewAdminLeaveRequest(
  requestId: string,
  action: 'APPROVED' | 'REJECTED',
  reviewNote?: string
): Promise<{ status: string; request_id: string; new_status: string; message: string }> {
  const csrfToken = await getCsrfToken();
  const res = await apiFetch(`/api/v1/admin/leave-requests/${requestId}/review`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-CSRF-Token': csrfToken,
    },
    body: JSON.stringify({
      action,
      review_note: reviewNote,
    }),
  });
  if (!res.ok) {
    let detail = 'Không thể xử lý đơn xin nghỉ phép.';
    try {
      const err = await res.json();
      if (err.detail) detail = err.detail;
    } catch {}
    throw new ApiError(res.status, detail);
  }
  return res.json();
}

export function getAdminRosterExportUrl(month?: string): string {
  const query = month ? `?month=${encodeURIComponent(month)}` : '';
  return `/api/v1/admin/roster/export.csv${query}`;
}

// ==============================================================================
// MAP OPERATIONS APIS (PHASE 2 & PHASE 3)
// ==============================================================================

export async function getMapOverview(date?: string, roundId?: string): Promise<MapOverviewResponse> {
  const params = new URLSearchParams();
  if (date) params.set('date', date);
  if (roundId) params.set('round_id', roundId);
  const query = params.toString() ? `?${params.toString()}` : '';
  const res = await apiFetch(`/api/v1/map/overview${query}`);
  if (!res.ok) {
    let detail = 'Không thể tải tổng quan bản đồ tác nghiệp.';
    try {
      const err = await res.json();
      if (err.detail) detail = err.detail;
    } catch {}
    throw new ApiError(res.status, detail);
  }
  return res.json();
}

export async function getMapZones(): Promise<OperationalZoneOut[]> {
  const res = await apiFetch('/api/v1/map/zones');
  if (!res.ok) {
    let detail = 'Không thể tải danh sách khu vực tác nghiệp.';
    try {
      const err = await res.json();
      if (err.detail) detail = err.detail;
    } catch {}
    throw new ApiError(res.status, detail);
  }
  return res.json();
}

export async function getMapOperators(): Promise<User[]> {
  const res = await apiFetch('/api/v1/map/operators');
  if (!res.ok) {
    let detail = 'Không thể tải danh sách nhân sự tác nghiệp.';
    try {
      const err = await res.json();
      if (err.detail) detail = err.detail;
    } catch {}
    throw new ApiError(res.status, detail);
  }
  return res.json();
}

export async function getMapMeters(zoneId?: string, date?: string): Promise<MapMeterOut[]> {
  const params = new URLSearchParams();
  if (zoneId && zoneId !== 'ALL') params.append('zone_id', zoneId);
  if (date) params.append('date', date);
  const query = params.toString() ? `?${params.toString()}` : '';
  const res = await apiFetch(`/api/v1/map/meters${query}`);
  if (!res.ok) {
    let detail = 'Không thể tải danh sách công tơ bản đồ.';
    try {
      const err = await res.json();
      if (err.detail) detail = err.detail;
    } catch {}
    throw new ApiError(res.status, detail);
  }
  return res.json();
}

export async function reassignZoneOperator(
  zoneId: string,
  payload: ZoneReassignRequest
): Promise<ZoneReassignResponse> {
  const csrfToken = await getCsrfToken();
  const res = await apiFetch(`/api/v1/map/zones/${zoneId}/assign`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-CSRF-Token': csrfToken,
    },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    let detail = 'Không thể phân công phụ trách khu vực.';
    try {
      const err = await res.json();
      if (err.detail) detail = err.detail;
    } catch {}
    throw new ApiError(res.status, detail);
  }
  return res.json();
}

// ==============================================================================
// MAP CONFIGURATION & SPATIAL ADMINISTRATION API (V16)
// ==============================================================================

export async function fetchActiveMapConfiguration(): Promise<ActiveMapConfiguration> {
  const res = await apiFetch('/api/v1/map-config/active');
  if (!res.ok) {
    let detail = 'Không thể tải cấu hình bản đồ đang hoạt động.';
    try {
      const err = await res.json();
      if (err.detail) detail = err.detail;
    } catch {}
    throw new ApiError(res.status, detail);
  }
  return res.json();
}

export const getActiveMapConfig = fetchActiveMapConfiguration;

export async function getMapVersions(): Promise<MapVersionListResponse> {
  const res = await apiFetch('/api/v1/map-config/versions');
  if (!res.ok) {
    let detail = 'Không thể tải lịch sử phiên bản bản đồ.';
    try {
      const err = await res.json();
      if (err.detail) detail = err.detail;
    } catch {}
    throw new ApiError(res.status, detail);
  }
  return res.json();
}

export async function getCurrentMapDraft(): Promise<MapVersionOut | null> {
  const res = await apiFetch('/api/v1/map-config/versions/current-draft');
  if (res.status === 404) {
    return null;
  }
  if (!res.ok) {
    let detail = 'Không thể kiểm tra bản nháp hiện tại.';
    try {
      const err = await res.json();
      if (err.detail) detail = err.detail;
    } catch {}
    throw new ApiError(res.status, detail);
  }
  return res.json();
}

export async function getMapVersionDetail(versionId: string): Promise<MapVersionOut> {
  const res = await apiFetch(`/api/v1/map-config/versions/${versionId}`);
  if (!res.ok) {
    let detail = 'Không thể tải chi tiết phiên bản bản đồ.';
    try {
      const err = await res.json();
      if (err.detail) detail = err.detail;
    } catch {}
    throw new ApiError(res.status, detail);
  }
  return res.json();
}

export async function createMapDraft(payload?: {
  map_version?: string;
  from_version_id?: string;
}): Promise<MapVersionOut> {
  const csrfToken = await getCsrfToken();
  const res = await apiFetch('/api/v1/map-config/drafts', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-CSRF-Token': csrfToken,
    },
    body: JSON.stringify(payload || {}),
  });
  if (!res.ok) {
    let detail = 'Không thể tạo bản nháp bản đồ.';
    try {
      const err = await res.json();
      if (err.detail) detail = err.detail;
    } catch {}
    throw new ApiError(res.status, detail);
  }
  return res.json();
}

export async function updateDraftZone(
  versionId: string,
  zoneId: string,
  payload: {
    polygon_canonical?: any[];
    label_anchor_canonical?: any;
    operator_anchor_canonical?: any;
    landmarks?: any[];
    revision: number;
  }
): Promise<MapVersionZoneOut> {
  const csrfToken = await getCsrfToken();
  const res = await apiFetch(`/api/v1/map-config/versions/${versionId}/zones/${zoneId}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'X-CSRF-Token': csrfToken,
    },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    let detail = 'Không thể cập nhật phân khu bản đồ.';
    try {
      const err = await res.json();
      if (err.detail) detail = err.detail;
    } catch {}
    throw new ApiError(res.status, detail);
  }
  return res.json();
}

export async function validateMapVersion(versionId: string): Promise<MapValidationResponse> {
  const res = await apiFetch(`/api/v1/map-config/versions/${versionId}/validate`, {
    method: 'POST',
  });
  if (!res.ok) {
    let detail = 'Lỗi kiểm tra tính hợp lệ của bản đồ.';
    try {
      const err = await res.json();
      if (err.detail) detail = err.detail;
    } catch {}
    throw new ApiError(res.status, detail);
  }
  return res.json();
}

export async function publishMapVersion(versionId: string): Promise<MapPublishResponse> {
  const csrfToken = await getCsrfToken();
  const res = await apiFetch(`/api/v1/map-config/versions/${versionId}/publish`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-CSRF-Token': csrfToken,
    },
  });
  if (!res.ok) {
    let detail = 'Không thể xuất bản bản đồ.';
    try {
      const err = await res.json();
      if (err.detail) detail = typeof err.detail === 'string' ? err.detail : JSON.stringify(err.detail);
    } catch {}
    throw new ApiError(res.status, detail);
  }
  return res.json();
}

export async function rollbackMapVersion(
  versionId: string,
  reason?: string
): Promise<MapPublishResponse> {
  const csrfToken = await getCsrfToken();
  const res = await apiFetch(`/api/v1/map-config/versions/${versionId}/rollback`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-CSRF-Token': csrfToken,
    },
    body: JSON.stringify({ reason: reason || 'Phục hồi phiên bản lịch sử' }),
  });
  if (!res.ok) {
    let detail = 'Không thể phục hồi phiên bản bản đồ.';
    try {
      const err = await res.json();
      if (err.detail) detail = err.detail;
    } catch {}
    throw new ApiError(res.status, detail);
  }
  return res.json();
}

export async function deleteMapDraft(versionId: string): Promise<{ status: string; message: string }> {
  const csrfToken = await getCsrfToken();
  const res = await apiFetch(`/api/v1/map-config/versions/${versionId}`, {
    method: 'DELETE',
    headers: {
      'X-CSRF-Token': csrfToken,
    },
  });
  if (!res.ok) {
    let detail = 'Không thể xóa bản nháp bản đồ.';
    try {
      const err = await res.json();
      if (err.detail) detail = err.detail;
    } catch {}
    throw new ApiError(res.status, detail);
  }
  return res.json();
}

export async function relocateAdminMeter(
  meterId: string,
  payload: AdminMeterRelocatePayload
): Promise<AdminMeterItem> {
  const csrfToken = await getCsrfToken();
  const res = await apiFetch(`/api/v1/admin/meters/${meterId}/relocate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-CSRF-Token': csrfToken,
    },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    let detail = 'Không thể đặt lại vị trí công tơ.';
    try {
      const err = await res.json();
      if (err.detail) detail = err.detail;
    } catch {}
    throw new ApiError(res.status, detail);
  }
  return res.json();
}

export async function changeAdminMeterZone(
  meterId: string,
  payload: AdminMeterChangeZonePayload
): Promise<AdminMeterItem> {
  const csrfToken = await getCsrfToken();
  const res = await apiFetch(`/api/v1/admin/meters/${meterId}/change-zone`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-CSRF-Token': csrfToken,
    },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    let detail = 'Không thể chuyển phân khu công tơ.';
    try {
      const err = await res.json();
      if (err.detail) detail = err.detail;
    } catch {}
    throw new ApiError(res.status, detail);
  }
  return res.json();
}

export async function deleteAdminMeter(meterId: string): Promise<{ status: string; message: string }> {
  const csrfToken = await getCsrfToken();
  const res = await apiFetch(`/api/v1/admin/meters/${meterId}`, {
    method: 'DELETE',
    headers: {
      'X-CSRF-Token': csrfToken,
    },
  });
  if (!res.ok) {
    let detail = 'Không thể xóa công tơ.';
    try {
      const err = await res.json();
      if (err.detail) detail = err.detail;
    } catch {}
    throw new ApiError(res.status, detail);
  }
  return res.json();
}

// ==============================================================================
// ASSET DOMAIN FOUNDATION & TOPOLOGY (V16C)
// ==============================================================================
import {
  Asset,
  AssetListResponse,
  MeterAssetRelation,
  MeterAssetRelationListResponse,
  AssetConnection,
  AssetConnectionListResponse,
  TopologyTraceResponse,
  CandidateImportResponse,
  AssetVerificationSummary,
  MeterReviewMatrixItem,
  VerificationEvidence,
  AssetVerifyRequest,
  AssetRejectRequest,
  AssetVerifyPositionRequest,
  RelationVerifyRequest,
  RelationRejectRequest,
  ConnectionVerifyRequest,
  ConnectionRejectRequest,
  AssetNetworkResponse,
  AssetOperationalContextResponse,
} from '../features/assets/types';

export async function getAdminAssets(params?: {
  asset_type?: string;
  zone_id?: string;
  lifecycle_status?: string;
  verification_status?: string;
  mobility_type?: string;
  search?: string;
  scenario_id?: string;
  data_origin?: string;
  limit?: number;
  offset?: number;
}): Promise<AssetListResponse> {
  const query = new URLSearchParams();
  if (params?.asset_type) query.append('asset_type', params.asset_type);
  if (params?.zone_id) query.append('zone_id', params.zone_id);
  if (params?.lifecycle_status) query.append('lifecycle_status', params.lifecycle_status);
  if (params?.verification_status) query.append('verification_status', params.verification_status);
  if (params?.mobility_type) query.append('mobility_type', params.mobility_type);
  if (params?.search) query.append('search', params.search);
  if (params?.scenario_id) query.append('scenario_id', params.scenario_id);
  if (params?.data_origin) query.append('data_origin', params.data_origin);
  if (params?.limit) query.append('limit', String(params.limit));
  if (params?.offset) query.append('offset', String(params.offset));

  const qs = query.toString();
  const res = await apiFetch(`/api/v1/admin/assets${qs ? `?${qs}` : ''}`);
  if (!res.ok) {
    throw new ApiError(res.status, 'Không thể tải danh sách thiết bị.');
  }
  return res.json();
}

export async function getAdminAssetById(assetId: string): Promise<Asset> {
  const res = await apiFetch(`/api/v1/admin/assets/${assetId}`);
  if (!res.ok) {
    throw new ApiError(res.status, 'Không thể tải thông tin thiết bị.');
  }
  return res.json();
}

export async function createAdminAsset(payload: {
  code: string;
  name: string;
  asset_type: string;
  parent_asset_id?: string | null;
  zone_id?: string | null;
  mobility_type?: string;
  position_source?: string;
  map_x?: number | null;
  map_y?: number | null;
  verification_status?: string;
  data_origin?: string;
  scenario_id?: string | null;
  metadata_json?: string | null;
}): Promise<Asset> {
  const csrfToken = await getCsrfToken();
  const res = await apiFetch('/api/v1/admin/assets', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-CSRF-Token': csrfToken,
    },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    let detail = 'Không thể tạo thiết bị.';
    try {
      const err = await res.json();
      if (err.detail) detail = err.detail;
    } catch {}
    throw new ApiError(res.status, detail);
  }
  return res.json();
}

export async function updateAdminAsset(
  assetId: string,
  payload: {
    name?: string;
    asset_type?: string;
    parent_asset_id?: string | null;
    zone_id?: string | null;
    mobility_type?: string;
    position_source?: string;
    map_x?: number | null;
    map_y?: number | null;
    lifecycle_status?: string;
    verification_status?: string;
    metadata_json?: string | null;
  }
): Promise<Asset> {
  const csrfToken = await getCsrfToken();
  const res = await apiFetch(`/api/v1/admin/assets/${assetId}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'X-CSRF-Token': csrfToken,
    },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    let detail = 'Không thể cập nhật thiết bị.';
    try {
      const err = await res.json();
      if (err.detail) detail = err.detail;
    } catch {}
    throw new ApiError(res.status, detail);
  }
  return res.json();
}

export async function relocateAdminAsset(
  assetId: string,
  payload: { map_x: number; map_y: number; position_source?: string }
): Promise<Asset> {
  const csrfToken = await getCsrfToken();
  const res = await apiFetch(`/api/v1/admin/assets/${assetId}/relocate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-CSRF-Token': csrfToken,
    },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    let detail = 'Không thể định vị thiết bị.';
    try {
      const err = await res.json();
      if (err.detail) detail = err.detail;
    } catch {}
    throw new ApiError(res.status, detail);
  }
  return res.json();
}

export async function setAdminAssetParent(
  assetId: string,
  payload: { parent_asset_id?: string | null }
): Promise<Asset> {
  const csrfToken = await getCsrfToken();
  const res = await apiFetch(`/api/v1/admin/assets/${assetId}/set-parent`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-CSRF-Token': csrfToken,
    },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    let detail = 'Không thể gán thiết bị cha.';
    try {
      const err = await res.json();
      if (err.detail) detail = err.detail;
    } catch {}
    throw new ApiError(res.status, detail);
  }
  return res.json();
}

export async function retireAdminAsset(assetId: string, reason?: string): Promise<Asset> {
  const csrfToken = await getCsrfToken();
  const res = await apiFetch(`/api/v1/admin/assets/${assetId}/retire`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-CSRF-Token': csrfToken,
    },
    body: JSON.stringify({ reason }),
  });
  if (!res.ok) {
    let detail = 'Không thể thu hồi thiết bị.';
    try {
      const err = await res.json();
      if (err.detail) detail = err.detail;
    } catch {}
    throw new ApiError(res.status, detail);
  }
  return res.json();
}

export async function getAdminMeterAssetRelations(params?: {
  meter_id?: string;
  asset_id?: string;
  relation_type?: string;
  active_only?: boolean;
  verification_status?: string;
}): Promise<MeterAssetRelationListResponse> {
  const query = new URLSearchParams();
  if (params?.meter_id) query.append('meter_id', params.meter_id);
  if (params?.asset_id) query.append('asset_id', params.asset_id);
  if (params?.relation_type) query.append('relation_type', params.relation_type);
  if (params?.active_only !== undefined) query.append('active_only', String(params.active_only));
  if (params?.verification_status) query.append('verification_status', params.verification_status);

  const qs = query.toString();
  const res = await apiFetch(`/api/v1/admin/meter-asset-relations${qs ? `?${qs}` : ''}`);
  if (!res.ok) {
    throw new ApiError(res.status, 'Không thể tải quan hệ công tơ - thiết bị.');
  }
  return res.json();
}

export async function getAdminMeterRelations(meterId: string): Promise<MeterAssetRelationListResponse> {
  const res = await apiFetch(`/api/v1/admin/meters/${meterId}/relations`);
  if (!res.ok) {
    throw new ApiError(res.status, 'Không thể tải liên kết công tơ.');
  }
  return res.json();
}

export async function createAdminMeterAssetRelation(payload: {
  meter_id: string;
  asset_id: string;
  relation_type: string;
  mount_point?: string | null;
  is_primary?: boolean;
  verification_status?: string;
}): Promise<MeterAssetRelation> {
  const csrfToken = await getCsrfToken();
  const res = await apiFetch('/api/v1/admin/meter-asset-relations', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-CSRF-Token': csrfToken,
    },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    let detail = 'Không thể liên kết công tơ với thiết bị.';
    try {
      const err = await res.json();
      if (err.detail) detail = err.detail;
    } catch {}
    throw new ApiError(res.status, detail);
  }
  return res.json();
}

export async function closeAdminMeterAssetRelation(relationId: string): Promise<MeterAssetRelation> {
  const csrfToken = await getCsrfToken();
  const res = await apiFetch(`/api/v1/admin/meter-asset-relations/${relationId}/close`, {
    method: 'POST',
    headers: {
      'X-CSRF-Token': csrfToken,
    },
  });
  if (!res.ok) {
    let detail = 'Không thể đóng liên kết công tơ.';
    try {
      const err = await res.json();
      if (err.detail) detail = err.detail;
    } catch {}
    throw new ApiError(res.status, detail);
  }
  return res.json();
}

export async function transferAdminMeterAssetRelation(
  relationId: string,
  payload: { new_asset_id: string; mount_point?: string | null; is_primary?: boolean }
): Promise<MeterAssetRelation> {
  const csrfToken = await getCsrfToken();
  const res = await apiFetch(`/api/v1/admin/meter-asset-relations/${relationId}/transfer`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-CSRF-Token': csrfToken,
    },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    let detail = 'Không thể chuyển đổi liên kết thiết bị.';
    try {
      const err = await res.json();
      if (err.detail) detail = err.detail;
    } catch {}
    throw new ApiError(res.status, detail);
  }
  return res.json();
}

export async function verifyAdminMeterAssetRelation(relationId: string, payload?: RelationVerifyRequest): Promise<MeterAssetRelation> {
  const csrfToken = await getCsrfToken();
  const res = await apiFetch(`/api/v1/admin/meter-asset-relations/${relationId}/verify`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-CSRF-Token': csrfToken,
    },
    body: JSON.stringify(payload || { evidence_type: 'PORT_DOCUMENT', evidence_reference: 'Xác minh hồ sơ công tơ' }),
  });
  if (!res.ok) {
    let detail = 'Không thể xác minh liên kết.';
    try {
      const err = await res.json();
      if (err.detail) detail = err.detail;
    } catch {}
    throw new ApiError(res.status, detail);
  }
  return res.json();
}

export async function getAdminAssetConnections(params?: {
  source_asset_id?: string;
  target_asset_id?: string;
  utility_type?: string;
  connection_type?: string;
  active_only?: boolean;
  verification_status?: string;
}): Promise<AssetConnectionListResponse> {
  const query = new URLSearchParams();
  if (params?.source_asset_id) query.append('source_asset_id', params.source_asset_id);
  if (params?.target_asset_id) query.append('target_asset_id', params.target_asset_id);
  if (params?.utility_type) query.append('utility_type', params.utility_type);
  if (params?.connection_type) query.append('connection_type', params.connection_type);
  if (params?.active_only !== undefined) query.append('active_only', String(params.active_only));
  if (params?.verification_status) query.append('verification_status', params.verification_status);

  const qs = query.toString();
  const res = await apiFetch(`/api/v1/admin/asset-connections${qs ? `?${qs}` : ''}`);
  if (!res.ok) {
    throw new ApiError(res.status, 'Không thể tải kết nối thiết bị.');
  }
  return res.json();
}

export async function createAdminAssetConnection(payload: {
  source_asset_id: string;
  target_asset_id: string;
  utility_type: string;
  connection_type?: string;
  verification_status?: string;
  data_origin?: string;
  scenario_id?: string | null;
  metadata_json?: string | null;
}): Promise<AssetConnection> {
  const csrfToken = await getCsrfToken();
  const res = await apiFetch('/api/v1/admin/asset-connections', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-CSRF-Token': csrfToken,
    },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    let detail = 'Không thể tạo kết nối mạng lưới.';
    try {
      const err = await res.json();
      if (err.detail) detail = err.detail;
    } catch {}
    throw new ApiError(res.status, detail);
  }
  return res.json();
}

export async function traceAdminAssetTopology(params: {
  asset_id: string;
  direction?: 'downstream' | 'upstream' | 'connected' | 'both';
  utility_type?: string;
  include_unverified?: boolean;
}): Promise<TopologyTraceResponse> {
  const query = new URLSearchParams();
  query.append('asset_id', params.asset_id);
  if (params.direction) query.append('direction', params.direction);
  if (params.utility_type) query.append('utility_type', params.utility_type);
  if (params.include_unverified !== undefined) query.append('include_unverified', String(params.include_unverified));

  const res = await apiFetch(`/api/v1/admin/asset-topology/trace?${query.toString()}`);
  if (!res.ok) {
    throw new ApiError(res.status, 'Không thể truy vết mạng lưới hạ tầng.');
  }
  return res.json();
}

// ==============================================================================
// V16D — CANDIDATE IMPORT, HUMAN VERIFICATION & REVIEW WORKSPACE
// ==============================================================================

export async function importAdminCandidateProposals(payload?: {
  proposals_file?: string;
  relations_file?: string;
}): Promise<CandidateImportResponse> {
  const csrfToken = await getCsrfToken();
  const res = await apiFetch('/api/v1/admin/assets/import-candidates', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-CSRF-Token': csrfToken,
    },
    body: JSON.stringify(payload || {}),
  });
  if (!res.ok) {
    let detail = 'Không thể nạp danh sách ứng viên.';
    try {
      const err = await res.json();
      if (err.detail) detail = err.detail;
    } catch {}
    throw new ApiError(res.status, detail);
  }
  return res.json();
}

export async function getAssetVerificationOverview(): Promise<AssetVerificationSummary> {
  const res = await apiFetch('/api/v1/admin/asset-verification/overview');
  if (!res.ok) {
    throw new ApiError(res.status, 'Không thể tải tổng quan đối soát thiết bị.');
  }
  return res.json();
}

export async function getMeterReviewMatrix(): Promise<MeterReviewMatrixItem[]> {
  const res = await apiFetch('/api/v1/admin/asset-verification/matrix');
  if (!res.ok) {
    throw new ApiError(res.status, 'Không thể tải ma trận đối soát công tơ.');
  }
  return res.json();
}

export async function getEntityEvidences(entityType: string, entityId: string): Promise<VerificationEvidence[]> {
  const res = await apiFetch(`/api/v1/admin/asset-verification/evidences?entity_type=${encodeURIComponent(entityType)}&entity_id=${encodeURIComponent(entityId)}`);
  if (!res.ok) {
    throw new ApiError(res.status, 'Không thể tải danh sách bằng chứng.');
  }
  return res.json();
}

export async function verifyAdminAsset(assetId: string, payload: AssetVerifyRequest): Promise<Asset> {
  const csrfToken = await getCsrfToken();
  const res = await apiFetch(`/api/v1/admin/assets/${assetId}/verify`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-CSRF-Token': csrfToken,
    },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    let detail = 'Không thể xác minh thiết bị.';
    try {
      const err = await res.json();
      if (err.detail) detail = err.detail;
    } catch {}
    throw new ApiError(res.status, detail);
  }
  return res.json();
}

export async function rejectAdminAssetVerification(assetId: string, payload: AssetRejectRequest): Promise<Asset> {
  const csrfToken = await getCsrfToken();
  const res = await apiFetch(`/api/v1/admin/assets/${assetId}/reject-verification`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-CSRF-Token': csrfToken,
    },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    let detail = 'Không thể từ chối thiết bị.';
    try {
      const err = await res.json();
      if (err.detail) detail = err.detail;
    } catch {}
    throw new ApiError(res.status, detail);
  }
  return res.json();
}

export async function reopenAdminAssetReview(assetId: string): Promise<Asset> {
  const csrfToken = await getCsrfToken();
  const res = await apiFetch(`/api/v1/admin/assets/${assetId}/reopen-review`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-CSRF-Token': csrfToken,
    },
  });
  if (!res.ok) {
    let detail = 'Không thể mở lại rà soát thiết bị.';
    try {
      const err = await res.json();
      if (err.detail) detail = err.detail;
    } catch {}
    throw new ApiError(res.status, detail);
  }
  return res.json();
}

export async function verifyAdminAssetPosition(assetId: string, payload: AssetVerifyPositionRequest): Promise<Asset> {
  const csrfToken = await getCsrfToken();
  const res = await apiFetch(`/api/v1/admin/assets/${assetId}/verify-position`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-CSRF-Token': csrfToken,
    },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    let detail = 'Không thể xác minh tọa độ thiết bị.';
    try {
      const err = await res.json();
      if (err.detail) detail = err.detail;
    } catch {}
    throw new ApiError(res.status, detail);
  }
  return res.json();
}

export async function rejectAdminMeterAssetRelation(relationId: string, payload?: RelationRejectRequest): Promise<MeterAssetRelation> {
  const csrfToken = await getCsrfToken();
  const res = await apiFetch(`/api/v1/admin/meter-asset-relations/${relationId}/reject`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-CSRF-Token': csrfToken,
    },
    body: JSON.stringify(payload || { reason: 'Từ chối liên kết qua quản trị' }),
  });
  if (!res.ok) {
    let detail = 'Không thể từ chối liên kết công tơ.';
    try {
      const err = await res.json();
      if (err.detail) detail = err.detail;
    } catch {}
    throw new ApiError(res.status, detail);
  }
  return res.json();
}

export async function verifyAdminAssetConnection(connectionId: string, payload?: ConnectionVerifyRequest): Promise<AssetConnection> {
  const csrfToken = await getCsrfToken();
  const res = await apiFetch(`/api/v1/admin/asset-connections/${connectionId}/verify`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-CSRF-Token': csrfToken,
    },
    body: JSON.stringify(payload || { evidence_type: 'PORT_DOCUMENT', evidence_reference: 'Xác minh hồ sơ mạng lưới' }),
  });
  if (!res.ok) {
    let detail = 'Không thể xác minh kết nối mạng lưới.';
    try {
      const err = await res.json();
      if (err.detail) detail = err.detail;
    } catch {}
    throw new ApiError(res.status, detail);
  }
  return res.json();
}

export async function rejectAdminAssetConnection(connectionId: string, payload?: ConnectionRejectRequest): Promise<AssetConnection> {
  const csrfToken = await getCsrfToken();
  const res = await apiFetch(`/api/v1/admin/asset-connections/${connectionId}/reject`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-CSRF-Token': csrfToken,
    },
    body: JSON.stringify(payload || { reason: 'Từ chối kết nối mạng lưới' }),
  });
  if (!res.ok) {
    let detail = 'Không thể từ chối kết nối mạng lưới.';
    try {
      const err = await res.json();
      if (err.detail) detail = err.detail;
    } catch {}
    throw new ApiError(res.status, detail);
  }
  return res.json();
}

export async function updateAdminMeterMetadata(meterId: string, payload: {
  reading_method?: string;
  communication_protocol?: string;
  utility_type?: string;
}): Promise<any> {
  const csrfToken = await getCsrfToken();
  const res = await apiFetch(`/api/v1/admin/meters/${meterId}/metadata`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'X-CSRF-Token': csrfToken,
    },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    let detail = 'Không thể cập nhật thông số công tơ.';
    try {
      const err = await res.json();
      if (err.detail) detail = err.detail;
    } catch {}
    throw new ApiError(res.status, detail);
  }
  return res.json();
}

export async function getAdminAssetNetwork(params?: {
  utility_type?: string;
  focus_asset_id?: string;
  verified_only?: boolean;
  scenario_id?: string;
}): Promise<AssetNetworkResponse> {
  const query = new URLSearchParams();
  if (params?.utility_type && params.utility_type !== 'ALL') {
    query.set('utility_type', params.utility_type);
  }
  if (params?.focus_asset_id) {
    query.set('focus_asset_id', params.focus_asset_id);
  }
  if (params?.verified_only !== undefined) {
    query.set('verified_only', String(params.verified_only));
  }
  if (params?.scenario_id) {
    query.set('scenario_id', params.scenario_id);
  }
  const qs = query.toString();
  const url = `/api/v1/admin/asset-network${qs ? `?${qs}` : ''}`;
  const res = await apiFetch(url);
  if (!res.ok) {
    let detail = 'Không thể tải mạng lưới thiết bị kỹ thuật.';
    try {
      const err = await res.json();
      if (err.detail) detail = err.detail;
    } catch {}
    throw new ApiError(res.status, detail);
  }
  return res.json();
}

export async function getAdminAssetOperationalContext(assetId: string): Promise<AssetOperationalContextResponse> {
  const res = await apiFetch(`/api/v1/admin/assets/${encodeURIComponent(assetId)}/operational-context`);
  if (!res.ok) {
    let detail = 'Không thể tải ngữ cảnh tác nghiệp của thiết bị.';
    try {
      const err = await res.json();
      if (err.detail) detail = err.detail;
    } catch {}
    throw new ApiError(res.status, detail);
  }
  return res.json();
}





