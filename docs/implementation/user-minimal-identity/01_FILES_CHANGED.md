# Báo cáo Chi tiết Tệp Thay đổi & Phần Giữ Nguyên
## Minimal Operational Identity · CSG-OPS User Home Hub

---

## 1. Trạng thái Git Trước & Sau

### Điểm mốc Baseline:
- **Nhánh hiện tại:** `feature/v16e-network-map-overlay-r1`
- **Commit HEAD:** `5d37047` (`feat(v16e-r1): handoff desktop UX r1 - admin schedules, reports, logbook & QA capture script`)
- **Nguyên tắc an toàn:** Không `git reset`, `git clean`, `git force push`, `git stash`, không tự động merge/push.

---

## 2. Chi tiết Tệp Đã Chỉnh sửa

### A. [`frontend/src/components/HomeHub.tsx`](file:///D:/Projects/production-meter-reading/production-meter-reading/frontend/src/components/HomeHub.tsx)
1. **Trích xuất tên gọi ngắn (`getShortDisplayName`):**
   - Lấy từ `user.full_name`. Trích xuất từ cuối cùng của họ tên đầy đủ theo văn phong tiếng Việt (ví dụ *"Nguyễn Văn An"* $\rightarrow$ *"An"*).
   - Nếu không có tên hoặc chuỗi rỗng/khoảng trắng, tự động sử dụng fallback trung tính an toàn: `'Nhân viên'`.
   - Không còn lời chào ghép chuỗi thời gian (*"Chào buổi sáng"*, *"Chào buổi trưa"*, v.v.).
2. **Định dạng Mã nhân viên & Vai trò (`formatEmployeeMeta`):**
   - Ghép `user.employee_code` và `formatUserRole(user.role)` bằng ký tự phân cách `\u2022`.
   - Xử lý các tình huống thiếu hụt dữ liệu: Nếu thiếu một trong hai, chỉ render phần có thật, không bao giờ để lại dấu chấm tròn phân cách thừa thãi hoặc chuỗi `undefined`. Nếu thiếu cả hai, trả về chuỗi rỗng và không render thẻ `<span>`.
3. **Theo dõi Trạng thái Lỗi Chấm công (`attendanceError`):**
   - Bổ sung state `attendanceError` để bắt lỗi fetch API.
   - Hàm `renderUserContextAttendanceStatus()` xử lý 5 trạng thái trung thực:
     - `loadingAttendance` $\rightarrow$ `Đang kiểm tra...` (`status-neutral`)
     - `attendanceError` hoặc `!attendance` $\rightarrow$ `Chưa xác định` (`status-error` / `status-neutral`, không tự ý báo sai là `Chưa vào ca`)
     - Chưa vào ca $\rightarrow$ `Chưa vào ca` (`status-warning`)
     - Đang trong ca $\rightarrow$ `Đang trong ca` (`status-success`)
     - Đã tan ca $\rightarrow$ `Đã hoàn tất ca` (`status-completed`)
4. **Cấu trúc JSX Identity Block:**
   ```tsx
   <section className="workspace-user-context" aria-label="Thông tin nhân viên tác nghiệp">
     <h1 className="workspace-operator-name">{getShortDisplayName(user.full_name)}</h1>
     <div className="workspace-subcontext">
       {employeeMeta ? (
         <span className="workspace-employee-meta">{employeeMeta}</span>
       ) : null}
       <div className="workspace-status-row">
         {renderUserContextAttendanceStatus()}
       </div>
     </div>
   </section>
   ```

### B. [`frontend/src/index.css`](file:///D:/Projects/production-meter-reading/production-meter-reading/frontend/src/index.css)
1. **Typography cho Tên gọi:** `.workspace-operator-name` đặt font-size `24px`, font-weight `700`, màu `var(--sgp-corporate-black)`.
2. **Typography cho Mã + Vai trò:** `.workspace-employee-meta` đặt font-size `13.5px`, font-weight `500`, màu `var(--sgp-corporate-gray)`, hỗ trợ `word-break: break-word` để tự động xuống dòng an toàn trên màn hình hẹp.
3. **Bổ sung Trạng thái Lỗi Chấm công:**
   - `.workspace-status-badge.status-error`: Nền đỏ nhạt `#fef2f2`, chữ đỏ `var(--sgp-danger)`, viền `#fecaca`.
   - `.status-dot.dot-error`: Màu chấm đỏ `var(--sgp-danger)`.
   - `.status-dot.dot-neutral`: Màu chấm xám `var(--sgp-corporate-gray)`.

### C. [`frontend/tests/userMinimalIdentity.test.ts`](file:///D:/Projects/production-meter-reading/production-meter-reading/frontend/tests/userMinimalIdentity.test.ts)
- Bộ kiểm thử mới gồm 5 nhóm test xác thực toàn diện:
  1. Trích xuất tên ngắn và loại bỏ lời chào.
  2. Định dạng mã nhân viên và vai trò không có ký tự thừa.
  3. Tính trung thực của trạng thái chấm công khi lỗi/null.
  4. Hợp đồng CSS typography và cấu trúc layout.
  5. Tính bất biến của ma trận phân định ưu tiên và radial navigation.

### D. [`scripts/capture_user_minimal_identity_screenshots.mjs`](file:///D:/Projects/production-meter-reading/production-meter-reading/scripts/capture_user_minimal_identity_screenshots.mjs)
- Kịch bản Playwright Edge headless tự động chụp 10 ảnh kiểm chứng trên 5 breakpoint và 6 trạng thái nghiệp vụ.

---

## 3. Các Phần Hoàn Toàn Được Giữ Nguyên

Để đảm bảo không gây tác dụng phụ ngoài phạm vi:
1. **Kiến trúc Priority Action Feed:** Bảo toàn 100% logic trong [`priorityInsightLogic.ts`](file:///D:/Projects/production-meter-reading/production-meter-reading/frontend/src/components/home/priorityInsightLogic.ts) và thành phần [`InsightFeed.tsx`](file:///D:/Projects/production-meter-reading/production-meter-reading/frontend/src/components/home/InsightFeed.tsx).
2. **Bottom Radial Navigation:** Bảo toàn 100% vị trí cố định, 3 nút con bung hình cung, vòng tiến độ SVG (`circumference = 188.5`), backdrop dim nhẹ và xử lý phím `Escape`.
3. **Dresscode Thương hiệu Cảng Sài Gòn:** 10 mã màu nguồn HEX được bảo vệ nguyên trạng.
4. **Header & Tài khoản:** Giữ nguyên top bar thương hiệu Cảng Sài Gòn và avatar tài khoản.
5. **Khu vực Admin & Quy trình Đo đếm OCR:** Hoàn toàn nằm ngoài phạm vi sửa đổi, không bị ảnh hưởng.
