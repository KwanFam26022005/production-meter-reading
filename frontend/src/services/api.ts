import {
  AdminAuditLogListResponse,
  AdminDashboardResponse,
  AdminMeterCreatePayload,
  AdminMeterItem,
  AdminMeterLatestReadingResponse,
  AdminMeterListResponse,
  AdminMeterReadingInspectionResponse,
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
  LeaveRequestCreatePayload,
  LeaveRequestItem,
  UserMonthlyScheduleResponse,
} from '../types';

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL?.trim() || '';

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
  meterType?: string
): Promise<AdminMeterListResponse> {
  const params = new URLSearchParams();
  if (search && search.trim()) params.set('search', search.trim());
  if (statusFilter && statusFilter.trim()) params.set('status', statusFilter.trim());
  if (meterType && meterType.trim()) params.set('meter_type', meterType.trim());

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


