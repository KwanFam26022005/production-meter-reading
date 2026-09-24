# Saigon Port — Thread 9C Empty States and Stale Assignment UX

**Design Specification:** Saigon Port UI & WCAG 2.1 AA  
**Frontend Component:** `frontend/src/components/ReadingBatchView.tsx`  

---

## 1. The 4 Distinct Empty States

Rather than showing a generic "Không có dữ liệu", Thread 9C provides actionable clarity for the 4 distinct operational realities:

| Code | Title | Explanation & Guidance |
| :--- | :--- | :--- |
| `NO_ROUND` | **Hiện chưa có lượt ghi.** | Hệ thống chưa có lượt ghi chỉ số đang mở trong ngày hôm nay. |
| `NO_ASSIGNMENT` | **Bạn chưa được phân khu tác nghiệp cho lượt này.** | Vui lòng liên hệ điều độ hoặc quản lý ca để được phân công khu vực. |
| `NO_METERS_IN_ZONE` | **Khu vực được phân công không có công tơ trong lượt này.** | Các khu vực bạn phụ trách không có công tơ nào trong lịch ghi của lượt hiện tại. |
| `ALL_TASKS_COMPLETE` | **Bạn đã hoàn thành các công tơ được giao trong lượt này.** | Tất cả công tơ trong khu vực phân công đã được ghi nhận thành công. |

---

## 2. Stale Assignment Notice Banner

If an operational supervisor cancels or modifies an assignment while an employee is actively reading in the field, or if assignment changes occurred after round snapshot generation:
- The UI detects that the selected meter's zone is no longer actionable under the updated assignment state.
- A high-visibility warning banner (`.stale-notice-banner`, role `alert`) alerts the employee:
  > **⚠️ Lịch phân khu có thể đã thay đổi sau khi mở lượt. Vui lòng kiểm tra với quản trị viên nếu có thắc mắc.**
- Prevents unexpected submission errors and directs field staff to coordinate with dispatchers.
