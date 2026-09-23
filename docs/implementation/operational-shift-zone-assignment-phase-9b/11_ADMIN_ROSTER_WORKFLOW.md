# 11 — Admin roster workflow

The existing Phân ca roster remains the **Lịch ca** tab. Missing WorkSchedule projects `UNASSIGNED` (“Chưa phân ca”), separate from OFF and LEAVE. Admin can still edit cells and apply THREE_SHIFT_FOUR_TEAM or STANDARD_WEEKDAY patterns. Both manual shift save and auto-pattern apply cancel incompatible active zone assignments in the same database transaction, with reason `SHIFT_CHANGED`; neither moves zones automatically to the new shift.

Auto-pattern preview now counts `assignment_impact_count`, displayed before apply. Preview also reports approved-leave conflicts; apply rejects those conflicts, so a roster pattern cannot silently schedule a person during approved leave. The existing roster filter and matrix remain in place.
