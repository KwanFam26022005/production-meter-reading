# Phase 1: Target Architecture — Two-Site Separation

**Dự án:** `production-meter-reading` (Cảng Sài Gòn)  
**Tài liệu:** `02_TARGET_ARCHITECTURE.md`  
**Mục tiêu:** Định hình kiến trúc phân tách hai cổng ứng dụng web độc lập trên nền tảng một backend duy nhất và một kho dữ liệu có căn cứ xác thực (Single Source of Truth).

---

## 1. Sơ đồ Kiến trúc Mục tiêu (Target Architecture)

```
                            INTERNET / BROWSER CLIENTS
                                       │
            ┌──────────────────────────┴──────────────────────────┐
            ▼                                                     ▼
     [ USER PORTAL ]                                      [ OPERATIONS PORTAL ]
  Mobile-first / PWA / Hiện trường                       Desktop-first / Giám sát điều hành
  https://<user-domain>/                                  https://<operations-domain>/
  (Ví dụ: meter.saigonport.vn)                            (Ví dụ: ops-meter.saigonport.vn)
            │                                                     │
            │ Same-Origin Proxy                                   │ Same-Origin Proxy
            │ /api/*                                              │ /api/*
            ▼                                                     ▼
    ┌────────────────┐                                    ┌────────────────┐
    │  REVERSE PROXY │                                    │  REVERSE PROXY │
    │ (Caddy/Staging)│                                    │ (Caddy/Staging)│
    └───────┬────────┘                                    └───────┬────────┘
            │                                                     │
            └──────────────────────────┬──────────────────────────┘
                                       │ Upstream: http://backend:8000
                                       ▼
                       ┌───────────────────────────────┐
                       │     SHARED FASTAPI BACKEND    │
                       │     (MeterReadingBackend)     │
                       │          Single Worker        │
                       └───────────────┬───────────────┘
                                       │
        ┌──────────────────────────────┼──────────────────────────────┐
        ▼                              ▼                              ▼
┌─────────────────┐          ┌────────────────────┐         ┌────────────────────┐
│ AUTHORITATIVE DB│          │  EVIDENCE STORAGE  │         │ SINGLE OCR RUNTIME │
│  SQLite app.db  │          │ attendance_photos/ │         │  YOLO E2 Detector  │
│ (Sessions, Logs,│          │ meter_reading_evid/│         │  PP-OCRv6 SVTR     │
│  Meters, Roles) │          │ (Private storage)  │         │  (Loaded once RAM) │
└─────────────────┘          └────────────────────┘         └────────────────────┘
```

---

## 2. Nguyên tắc Bất biến của Hệ thống (System Invariants)

1. **Một Backend Duy nhất (Single Backend Deployment):**
   - Không triển khai hai instance backend riêng biệt cho hai site.
   - Không chạy song song hai tiến trình uvicorn phục vụ cùng một cơ sở dữ liệu.
   - Không nạp mô hình AI hai lần vào bộ nhớ RAM (bảo toàn tài nguyên CPU/RAM theo tiêu chuẩn vận hành).

2. **Một Cơ sở Dữ liệu Xác thực Duy nhất (Single Authoritative Database):**
   - Toàn bộ bảng dữ liệu (`users`, `sessions`, `meters`, `meter_readings`, `reading_batches`, `reading_rounds`, `attendances`, `assets`, `audit_logs`) nằm tại một cơ sở dữ liệu SQLite duy nhất (`data/app.db`).
   - Tuyệt đối không chia tách cơ sở dữ liệu thành "User DB" và "Admin DB".

3. **Cùng một Kho Bằng chứng (Single Evidence Storage):**
   - Ảnh chụp chấm công và ảnh bằng chứng công tơ được quản lý tại một kho lưu trữ cục bộ thống nhất với chính sách tước bỏ EXIF và xác thực SHA-256.

4. **Cùng một Quy tắc Nghiệp vụ & Đối soát (Shared Reconciliation Contracts):**
   - Logic kiểm tra ca, đợt, trạng thái công tơ, idempotency key (`client_submission_id`), xử lý xung đột HTTP 409 và reconciliation transaction được backend thực thi thống nhất, không phụ thuộc vào nguồn gọi.

5. **Trải nghiệm Đồng nguồn (Same-Origin Browser Experience):**
   - Cả hai frontend đều gọi API thông qua đường dẫn tương đối `/api/v1/*`.
   - Reverse proxy của từng site forward yêu cầu `/api/*` tới backend chung.
   - Tránh phát sinh CORS preflight (OPTIONS) phức tạp và rủi ro rò rỉ session qua wildcard domain.

---

## 3. Phân định Trách nhiệm Hai Ứng dụng Frontend

| Tiêu chí | Cổng Nhân viên (User Portal) | Cổng Điều hành (Operations Portal) |
| :--- | :--- | :--- |
| **Mục đích** | Tác nghiệp hiện trường cho nhân viên đọc số và chấm công | Quản trị, giám sát chỉ số, điều phối nhân sự, bản đồ số |
| **Thiết bị ưu tiên** | Điện thoại thông minh (Mobile-first, PWA) | Máy tính để bàn, laptop (Desktop-first) |
| **PWA & Offline Shell** | Có: `manifest.webmanifest`, `sw.js` cache static shell | Không: Tải trực tiếp, không cài đặt PWA shell |
| **Camera & Phần cứng** | Kích hoạt camera sau/trước phục vụ OCR & selfie chấm công | Không tích hợp tính năng chụp ảnh phần cứng |
| **Các màn hình cốt lõi** | • Home Hub<br>• Lịch ca cá nhân & Đơn nghỉ phép<br>• Chấm công selfie & Đối soát<br>• Danh sách công tơ theo ca<br>• Quy trình đọc số tập trung (Focused OCR) | • Bảng điều khiển vận hành (Dashboard)<br>• Quản lý thiết bị & công tơ (Devices/Meters)<br>• Bản đồ số Digital Twin Tân Thuận & Topo cáp/điện<br>• Quản lý ca & Lịch trình (Schedules)<br>• Bảng chấm công & Phân ca (Staff Roster)<br>• Kiểm tra bằng chứng đọc số (Inspection)<br>• Báo cáo kỹ thuật & Xuất CSV (Reports)<br>• Nhật ký kiểm toán (Audit Logs) |
| **Chính sách Bundle** | **Tuyệt đối không chứa** bất kỳ module nào của 8 tab Quản trị | **Tuyệt đối không chứa** module camera/chụp ảnh/nhập số hiện trường |
