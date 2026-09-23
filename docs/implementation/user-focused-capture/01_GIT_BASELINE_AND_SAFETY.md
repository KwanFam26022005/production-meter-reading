# 01 — AN TOÀN HỆ THỐNG & KHẢO SÁT BASELINE GIT

> **Dự án:** Hệ thống Quản lý và Ghi chỉ số Công tơ Cảng Sài Gòn (`production-meter-reading`)  
> **Nhánh làm việc:** `feature/v16e-network-map-overlay-r1`  
> **Cam kết an toàn:** Không thực hiện bất kỳ thao tác xóa/ghi đè lịch sử Git (`no-reset`, `no-clean-force`, `no-rebase`, `no-push`).

---

## 1. Khảo sát trạng thái Git ban đầu

Trước khi thực hiện các sửa đổi mã nguồn cho tính năng **Focused Meter Capture**, hiện trạng kho mã nguồn đã được rà soát chi tiết:

- **Branch hiện hành:** `feature/v16e-network-map-overlay-r1`
- **Commit HEAD:** `5d37047` (`chore: save state before task`)
- **Tệp tin đã thay đổi chưa commit từ các phân hệ trước (Được bảo tồn nguyên vẹn):**
  - `.agent/skills/saigon-port-ui/SKILL.md` (Bổ sung hướng dẫn dresscode Cảng Sài Gòn)
  - `frontend/DESIGN_DNA.md` (Đặc tả bảng màu Maritime, Warm Yellow, typography và token)
  - `frontend/src/components/AuthenticatedShell.tsx` (Tích hợp ẩn radial navigation)
  - `frontend/src/components/HomeHub.tsx` (Hoàn thiện diện mạo Home Hub theo audit)
- **Tệp tin chưa theo dõi (Untracked files):**
  - Các tài liệu audit tại `docs/audits/user-meter-reading-ux/`
  - Các tệp test phụ trợ cho bảng màu và avatar

---

## 2. Kiểm thử Baseline ban đầu

Trước khi thêm bất kỳ dòng code nào, toàn bộ test suite hiện có của dự án đã được chạy để thiết lập mốc chuẩn:

```bash
cd frontend && npm test
```

- **Kết quả baseline:**
  - `tests 273`
  - `pass 273`
  - `fail 0`
  - `duration_ms 4390.15`

Toàn bộ 273 bài test hiện có bao gồm:
- V16/V16A-R1/V16A-R2: Kiểm thử tính toàn vẹn bản đồ không gian cảng Tân Thuận, kiểm tra đa giác topo, kiểm tra khóa toạ độ đóng băng (freeze geometry).
- V16B: Vòng đời công tơ và kiểm tra trạng thái hoạt động.
- V16E: Phân lớp sơ đồ mạng lưới điện một sợi (Single-Line Diagram).
- Gate 33 & V9: Các tiêu chí ràng buộc về tỷ lệ khung nhìn, token màu biển sương mù và bố cục cảng.

---

## 3. Các thay đổi mã nguồn đã thực hiện

Chỉ can thiệp vào các tệp tin trực tiếp phục vụ tính năng Chụp chuyên biệt (Focused Capture Mode):

| Tệp tin thay đổi | Mục đích thay đổi | Rủi ro hồi quy |
| :--- | :--- | :---: |
| [frontend/src/components/MeterCamera.tsx](file:///D:/Projects/production-meter-reading/production-meter-reading/frontend/src/components/MeterCamera.tsx) | Thiết kế lại hoàn toàn viewport toàn màn hình, 4 góc reticle Warm Yellow, thanh thumb controls, giải phóng track camera khi chụp | Không ảnh hưởng phân hệ khác |
| [frontend/src/App.tsx](file:///D:/Projects/production-meter-reading/production-meter-reading/frontend/src/App.tsx) | Bổ sung Focused Capture & Verification Shell, `ocrRequestIdRef`, double-confirm locking, xử lý HTTP 409 conflict | Đã kiểm thử tương thích với `ReadingBatchView` |
| [frontend/src/index.css](file:///D:/Projects/production-meter-reading/production-meter-reading/frontend/src/index.css) | Thêm các class `.focused-*`, quy tắc reticle `#FCC959`, `white-space: nowrap !important` trên số đo, `prefers-reduced-motion` | Không làm vỡ layout cũ |
| [frontend/tests/focusedMeterCapture.test.ts](file:///D:/Projects/production-meter-reading/production-meter-reading/frontend/tests/focusedMeterCapture.test.ts) | Tệp kiểm thử mới chứa 15 ca kiểm thử bao phủ toàn bộ các yêu cầu của bản đặc tả | Tệp mới độc lập |

---

## 4. Kết quả kiểm thử sau triển khai

Chạy lại toàn bộ test suite sau khi hoàn thành mã nguồn:

```bash
cd frontend && npm test
```

- **Kết quả sau triển khai:**
  - `tests 288`
  - `pass 288`
  - `fail 0`
  - `duration_ms 5300.58`

Toàn bộ **273 ca kiểm thử baseline** tiếp tục pass 100%, cộng thêm **15 ca kiểm thử mới** của `focusedMeterCapture.test.ts` pass hoàn hảo, không có bất kỳ xung đột hoặc hồi quy nào trong toàn bộ dự án.

---

## 5. Xác minh Production Build

Thực thi kiểm tra quy trình biên dịch gói sản phẩm:

```bash
cd frontend && npm run build
```

- Trình biên dịch TypeScript `tsc` hoàn thành **0 lỗi** (zero type errors).
- Vite v6.4.3 đóng gói thành công:
  - `dist/index.html` (1.46 kB)
  - `dist/assets/index-BRahJgdF.css` (358.11 kB)
  - `dist/assets/index-CHuOvh20.js` (931.58 kB)
- Thời gian biên dịch: **4.19 giây**.
