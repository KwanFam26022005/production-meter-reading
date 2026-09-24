# Production Meter Reading

Mobile-first electricity meter reading application.

## Locked inference pipeline

```text
Image
  -> E2 localization @960
  -> retry E2 @1280 only when no valid sequence ROI is found
  -> ROI crop: 5% padding + +2.5% horizontal shift
  -> PP-OCRv6-Medium recognition
  -> reading or REVIEW
```

Main-path scope is intentionally small. Stage-A `reading_panel`, crop sweeps, 1600/1920 inference and other experimental fallbacks are not part of the production pipeline.

## Repository layout

```text
production-meter-reading/
├── backend/       FastAPI inference service
├── frontend/      Antigravity mobile/PWA workspace
├── models/        model placement instructions only; weights are not committed
├── .env.example
├── .gitignore
└── README.md
```

## API contract

`POST /api/v1/read-meter` with `multipart/form-data`, field name `file`.

Success:

```json
{
  "status": "success",
  "reading": "0035785.4",
  "meter_type": "lcd",
  "det_confidence": 0.7145,
  "ocr_confidence": 0.9918,
  "localization_imgsz": 960,
  "pipeline_version": "e2-adaptive-ppocrv6-medium-v1"
}
```

Review:

```json
{
  "status": "review",
  "reading": null,
  "meter_type": null,
  "det_confidence": null,
  "ocr_confidence": null,
  "localization_imgsz": null,
  "pipeline_version": "e2-adaptive-ppocrv6-medium-v1"
}
```

## Local backend

1. Put model files in the paths described in `models/README.md`.
2. Copy `.env.example` to `.env` and adjust paths/device.
3. Install dependencies:

```bash
cd backend
pip install -r requirements.txt
```

4. Provision an employee user account:

```bash
python backend/scripts/create_user.py
```
*(Prompts securely for employee code, full name, and password with masked input and confirmation).*

5. Import Meter Master Catalog (CSV):

```bash
python backend/scripts/import_meters.py meters.csv
```
*Expected CSV headers (UTF-8): `meter_code,name,location,meter_type`.*

6. Create / Open a Reading Batch:

```bash
python backend/scripts/create_reading_batch.py --period 2026-08 --name "Đợt ghi chỉ số Tháng 08/2026"
```
*Use `--list` to inspect active and closed batches.*

7. Generate Daily Reading Rounds:

```bash
python backend/scripts/create_reading_rounds.py --current-batch --date 2026-08-27 --start 08:00 --end 17:00 --interval-minutes 60
```
*Use `--list` to inspect round progress and `--close <round_id>` to close individual rounds.*

8. Start API:

```bash
python -m uvicorn backend.app.main:app --host 0.0.0.0 --port 8000 --reload
```

9. Start Frontend (PWA):

```bash
cd frontend
npm run dev -- --host 0.0.0.0
```

## Meter Reading Logbook & Reading Rounds Workflow

```text
LOGIN
  ↓
HOME HUB
  ↓
ĐỌC CÔNG TƠ
  ↓
SCHEDULE OVERVIEW (Lịch ghi hôm nay & Lượt hiện tại)
  ↓
ROUND METER LIST (Tiến độ & Danh sách công tơ của lượt đã chọn)
  ↓
SELECT METER (Chưa ghi / Cần kiểm tra)
  ↓
CAPTURE & OCR INFERENCE (Zero Image Persistence)
  ↓
RESULT VERIFICATION & OPTIONAL CORRECTION (ROI Zoom / User Edit)
  ↓
EMPLOYEE CONFIRMATION ("Xác nhận chỉ số" / "Đánh dấu cần kiểm tra")
  ↓
PERSISTED OFFICIAL RECORD (meter_readings: UNIQUE(meter_id, reading_round_id))
  ↓
RETURN TO ROUND LIST (Cập nhật tiến độ tức thì)
```

### Data Hierarchy & Reading State Machine

```text
ReadingBatch (1:N) ──> ReadingRound (1:N) ──> MeterReading
```

- **`ReadingBatch`:** High-level operational period (e.g. Month 08/2026).
- **`ReadingRound`:** Scheduled time slot within a batch (e.g. `08:00`, `09:00`, `10:00`). Uniqueness: `UNIQUE(meter_id, reading_round_id)`.
- **`PENDING` (Chưa ghi):** Derived state when no reading record exists for the active meter in the selected round.
- **`REVIEW` (Cần kiểm tra):** Marked by employee when lighting or physical obstructions prevent automated OCR. Can be recaptured and confirmed subsequently within that round.
- **`CONFIRMED` (Đã ghi):** Official business reading recorded only upon explicit employee confirmation for that round. Duplicate confirmations for the same meter within the same round return HTTP 409.

### Important Data & Privacy Invariants

- **REPEATED METER READINGS:** The system natively supports workers recording the same meter at multiple scheduled rounds during a work shift (08:00 -> 09:00 -> 10:00).
- **AI PREDICTION $\neq$ OFFICIAL READING:** OCR results are transient predictions in RAM. Official database records are strictly created only after user review and explicit confirmation.
- **ZERO IMAGE PERSISTENCE:** Meter photos are decoded in volatile memory for inference and immediately released. Meter images are never persisted to disk, database, or static storage.

## DUAL PORTAL DEMO

Launch the real two-site architecture locally and (optionally) over separate Cloudflare Quick Tunnels:
- **User Portal** (`frontend/user.html`, `src/apps/user/UserApp.tsx` on port `5173`)
- **Operations Portal** (`frontend/operations.html`, `src/apps/operations/OperationsApp.tsx` on port `5174`)
- **Backend API** (FastAPI on `127.0.0.1:8000`)

### Running the Dual Portal Demo

```powershell
# Standard dual-portal demo with separate Cloudflare Quick Tunnels
.\scripts\demo-portals.ps1

# Local-only demo without Cloudflare tunnels
.\scripts\demo-portals.ps1 -NoTunnel

# Skip AI model verification if not testing OCR inference
.\scripts\demo-portals.ps1 -SkipModelCheck
```

### Access URLs

- **Local Access:**
  - User Portal: `http://localhost:5173`
  - Operations Portal: `http://localhost:5174`
- **Remote Access (Cloudflare Demo Mode):**
  - User Portal: `https://<user-subdomain>.trycloudflare.com`
  - Operations Portal: `https://<ops-subdomain>.trycloudflare.com`

### Role & Portal Authority Boundaries

- **EMPLOYEE:** Sign in to **User Portal** (`http://localhost:5173` or User tunnel URL). Normal field meter-reading and attendance workflows. Accessing Operations Portal will return 403 Access Denied.
- **ADMIN:** Sign in to **Operations Portal** (`http://localhost:5174` or Ops tunnel URL). Administrative dashboard, schedules, devices, reports, and digital twin Map V2. Signing in to User Portal will show the Admin portal guard without mounting the Admin workspace.

### Stopping the Demo

```powershell
.\scripts\stop-demo-portals.ps1
```
This terminates only the recorded processes (`backend`, `user_frontend`, `operations_frontend`, and tunnels) from `.demo_portals_pids.json` without affecting unrelated system processes.

---

## IPHONE 14 PLUS DEMO (LEGACY SINGLE-PORTAL)

Run the complete application on a local PC and demo it live from an iPhone 14 Plus using Safari over HTTPS with same-origin architecture.

### Architecture

```text
iPhone Safari
    │
    │ HTTPS (Single Origin)
    ▼
Cloudflare Quick Tunnel (https://*.trycloudflare.com)
    │
    ▼
Vite Frontend Dev Server (:5173)
    │
    ├── Frontend Static & Dev Assets
    ├── /api/*  ──────> FastAPI Backend (127.0.0.1:8000)
    └── /health ──────> FastAPI Backend (127.0.0.1:8000)
```

**Key Highlights:**
- **Single Origin:** Frontend, API, and `/health` share the exact same HTTPS origin. No separate backend tunnel URL is needed.
- **Full Security & Auth Intact:** Native `HttpOnly` session cookies (`csg_session`), HMAC CSRF tokens (`X-CSRF-Token`), and rate limiting work seamlessly without weakening CORS or storing tokens in `localStorage`.
- **HTTPS Camera Security:** Safari requires a secure context (HTTPS) for `navigator.mediaDevices.getUserMedia` (attendance selfie) and rear-camera capture.

---

### Prerequisites

1. **Install cloudflared CLI** (external developer tool; no Cloudflare account or token required for Quick Tunnel):
   ```powershell
   winget install --id Cloudflare.cloudflared -e
   ```
   *(Or download the binary from [Cloudflare releases](https://github.com/cloudflare/cloudflared/releases) and place in PATH).*

2. **Ensure Models & Environment:**
   Ensure frozen model files exist in `models/` and Python 3.11 virtual environment is prepared.

---

### Running the Demo

#### Option A: One-Click Demo Script (Recommended on Windows)

```powershell
.\scripts\demo-iphone.ps1
```

The script automatically validates Python, Node/npm, cloudflared, and AI model weights, starts all three services in background processes, and tracks their PIDs.

To cleanly stop all demo processes:
```powershell
.\scripts\stop-iphone-demo.ps1
```

#### Option B: Manual Three-Terminal Launch

**Terminal 1 — Backend (FastAPI):**
```powershell
python -m uvicorn backend.app.main:app --host 127.0.0.1 --port 8000
```

**Terminal 2 — Frontend (Vite with same-origin proxy):**
```powershell
cd frontend
npm run dev
```

**Terminal 3 — Cloudflare Quick Tunnel:**
```powershell
cloudflared tunnel --protocol http2 --url http://127.0.0.1:5173 --http-host-header localhost:5173
```

---

### iPhone 14 Plus Manual QA Steps

1. Start backend, frontend, and cloudflared tunnel (via `demo-iphone.ps1` or manual commands).
2. Copy the generated `https://<subdomain>.trycloudflare.com` URL printed in the cloudflared output.
3. Open **Safari** on iPhone 14 Plus and navigate to the HTTPS URL.
4. Sign in with employee credentials (e.g., `NV001`).
5. When Safari requests camera permission, tap **Allow**.
6. Verify **Home Hub** displays operational status, current shift, and navigation cards.
7. Tap **Chấm công** and verify **Attendance**:
   - Live front-facing camera preview opens with portrait oval guide.
   - Tap "Chụp ảnh minh chứng" -> preview selfie -> "Xác nhận vào ca".
8. Tap **Đọc công tơ** and select an active reading round:
   - Select a meter (`Chưa ghi` or `Cần kiểm tra`).
   - Tap "Chụp công tơ" to activate iPhone rear camera (`capture="environment"`).
   - Tap "Đọc chỉ số" to trigger zero-persistence AI inference.
9. Verify **ROI inspection & manual edit**:
   - Inspect zoomed ROI crop and OCR confidence.
   - Test "Sửa chỉ số" inline edit if adjustment is needed.
   - Tap "Xác nhận chỉ số" to persist official reading.
10. Tap **Báo cáo** to inspect operational statistics and CSV export.
11. *(Optional)* Tap Safari Share menu -> **Add to Home Screen** to test fullscreen presentation.
12. Stop cloudflared and services when demo is finished: `.\scripts\stop-iphone-demo.ps1`.

---

### Safari Camera Permission Recovery

If camera permission was denied or dismissed on iPhone Safari:
1. Tap the **`aA`** (Page Settings) icon on the left side of the Safari address bar.
2. Select **Website Settings** (Cài đặt trang web).
3. Under **Camera**, select **Allow** (Cho phép).
4. Reload the page.

---

### Creating Today's Reading Rounds (If Missing)

If testing on a new day and no reading rounds are open for today:
```powershell
python backend/scripts/create_reading_rounds.py --current-batch --date 2026-08-28 --start 08:00 --end 17:00 --interval-minutes 60
```

---

### Security Warning for Quick Tunnel

> [!WARNING]
> **DEMO / DEVELOPMENT USE ONLY**
> - Cloudflare Quick Tunnel produces a publicly reachable random HTTPS URL.
> - Always use test/demo data during presentations.
> - **NEVER** use real production credentials or confidential company data over Quick Tunnel.
> - Stop cloudflared immediately after completing the demo.
> - Sensitive files (SQLite database, password hashes, attendance photo directory, internal filesystem) are never exposed through the web server.

---

### PWA & Offline Note

When running through Vite dev server (`npm run dev`), the application is optimized for rapid live development and demo presentation. Full service worker offline caching and PWA manifests should be evaluated separately in production builds (`npm run build` served via Caddy/HTTPS).

---

## Security

This repository is public. Do **not** commit company meter images, datasets, `.env`, E2 weights, PaddleOCR weights, API keys or other internal artifacts.



