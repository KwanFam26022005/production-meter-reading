# 08 — Mobile User Portal Counterpart: Truthful Field Experience

**Document Reference:** `docs/research/employee-map-ux-design/08_USER_PORTAL_COUNTERPART.md`  
**Author:** Senior Product Designer, UX Researcher & Operations Software Architect  
**Project:** Production Meter Reading — Cảng Sài Gòn  
**Date:** 2026-09-23  
**Status:** PROPOSED DESIGN SPECIFICATION  

---

## 1. Executive Summary

This document specifies the mobile User Portal experience (`user.html`) designed for field technicians operating under harsh wharf sunlight and wearing industrial work gloves. It resolves the critical disconnections identified in the audit by clearly surfacing the worker's scheduled shift, assigned zone, and reading checklist, while maintaining strict data truthfulness when personal task assignments do not exist.

---

## 2. Mobile HomeHub Screen Architecture

```text
┌────────────────────────────────────────────────────────┐
│ [CẢNG SÀI GÒN]                  NV001 — NGUYỄN VĂN HẢI │
│ Thứ Tư, 23/09/2026                 [Avatar Photo]      │
├────────────────────────────────────────────────────────┤
│ 📋 THÔNG TIN CA TRỰC HÔM NAY                           │
│                                                        │
│  Ca trực:    Ca 1 (06:00 - 14:00)                      │
│  Điểm danh:  🟢 Đã vào ca (05:58)                      │
│  Khu vực:    📍 Khu cảng sà lan (Cầu tàu 1-3)          │
│                                                        │
│  [Chấm công tan ca] (Nút 48px - Disabled đến 13:45)    │
├────────────────────────────────────────────────────────┤
│ ⚡ TIẾN ĐỘ ĐO ĐẾM — LƯỢT 08:00                         │
│                                                        │
│  Khu cảng sà lan:  34/42 công tơ đã đọc (81%)          │
│  [=============================.......]                │
│                                                        │
│  * Chế độ: Nhận việc theo khu vực trực ca              │
│  (Mọi kỹ thuật viên trong ca đều có thể hỗ trợ)        │
├────────────────────────────────────────────────────────┤
│ 🚀 TÁC VỤ TIẾP THEO                                    │
│                                                        │
│  [📸 Ghi chỉ số tiếp theo: M-035 (Cầu bến 2)]          │
│  (Nút Hero lớn: Chiều cao 54px, màu Navy #003875)      │
├────────────────────────────────────────────────────────┤
│ 🔍 DANH SÁCH CÔNG TƠ KHU VỰC                           │
│  [Tất cả (42)]  [Chưa ghi (8)]  [Sự cố (1)]            │
│                                                        │
│  • M-035 — Cột điện B2 (Chưa ghi)            [Chụp]   │
│  • M-036 — Trạm bơm nước P1 (Chưa ghi)        [Chụp]   │
│  • M-037 — Tủ phân phối T3 (Chưa ghi)         [Chụp]   │
└────────────────────────────────────────────────────────┘
```

---

## 3. Resolving the 5 Field Inquiries with Data Truthfulness

### Inquiry 1: "What shift am I scheduled for?"
- **UI Mechanism**: Prominent Shift Banner at the top of HomeHub.
- **Truthful Rule**: If a persisted row exists in `work_schedules`, display: `Ca 1 (06:00 - 14:00)`. If relying on dynamic fallback, append subtle note: `(Ca mặc định theo lịch tuần)`.

### Inquiry 2: "What zone am I responsible for?"
- **UI Mechanism**: Dedicated "Khu vực phân công" chip with direct map preview link.
- **Handling Unassigned State**: If no `ZoneAssignment` exists for this user, **never leave the user guessing**. Display an explicit amber prompt:
  ```text
  ⚠️ Chưa phân công khu vực cụ thể
  (Vui lòng liên hệ điều độ viên ca trực hoặc chọn công tơ theo đợt)
  ```

### Inquiry 3: "What meter-reading work is assigned to me?"
- **Handling Current Reality (Pool-Based)**: Because the backend lacks individual meter dispatch (`ReadingTask`), the UI must **not lie** by claiming "You have 25 meters assigned to you personally."
- **Truthful UX**: State clearly:  
  `Danh mục công tơ Khu vực Cảng Sà Lan (34/42 đã ghi bởi tổ ca 1)`. The worker reads from the **Zone Pool**, and the app shows who submitted which reading.

### Inquiry 4: "What remains unfinished?"
- **UI Mechanism**: Dedicated filter tab: `Chưa ghi (8)`.
- Sorted automatically by physical walking order / serial number, allowing the worker to systematically move along the wharf.

### Inquiry 5: "How do I report a problem or obstruction?"
- **UI Mechanism**: Inside the camera view and meter inspection sheet, a prominent secondary button is provided: `Báo sự cố (Không thể ghi)`.
- **Options**:
  - `Mặt kính công tơ mờ / đọng nước`
  - `Bị che chắn bởi container / hàng hóa`
  - `Công tơ mất điện / kim không chạy`
  - `Khác (chụp ảnh hiện trường)`

---

## 4. Preservation of Invariant OCR Camera Flow

In accordance with [`saigon-port-ui`](file:///D:/Projects/production-meter-reading/production-meter-reading/.agent/skills/saigon-port-ui/SKILL.md), the camera workflow remains strictly protected:
```text
Chọn đợt/lượt -> Chụp ảnh (Capture) -> Xem trước (Preview) -> Nhận diện (Processing) -> Xác nhận/Hiệu chỉnh (Result)
```
- **Viewfinder**: Minimalist rectangle with 4 crisp corner brackets. Zero HUD sci-fi laser lines.
- **Lighting Control**: High-contrast outdoor white buttons with high-contrast text.
- **Fail-Safe**: If OCR confidence is low (<75%), the system presents an immediate **Manual Input / Retake** sheet without error loops.
