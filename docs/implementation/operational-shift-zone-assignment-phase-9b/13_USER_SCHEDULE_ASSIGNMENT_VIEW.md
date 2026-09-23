# 13 — User schedule assignment view

`GET /api/v1/operational-assignments/me?month=YYYY-MM` returns only the authenticated user's noncancelled assignments. UserScheduleView joins that response by selected date and shift to display named zones and Chính/Hỗ trợ roles; multiple zones are listed individually. No row says “Chưa được phân khu tác nghiệp.” A missing WorkSchedule day says “Chưa phân ca,” not CA1 or OFF. CA3 shows 22:00–06:00 from the schedule response.

ReadingBatchView remains the global 9A round scope. 9B does not infer meter tasks from assignment or display a personal meter count.
