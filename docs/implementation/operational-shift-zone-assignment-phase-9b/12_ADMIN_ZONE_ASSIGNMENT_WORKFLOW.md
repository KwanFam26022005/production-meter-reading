# 12 — Admin zone assignment workflow

The new **Phân khu tác nghiệp** tab shows date, shift, server shift window, staff availability, and each zone's PRIMARY/SUPPORT roster. An uncovered zone says “Chưa phân công.” Admin chooses role and an eligible employee, previews conflicts/warnings, then explicitly confirms. Apply inserts the assignment and audit record atomically. Cancel retains the row and audit record; previously cancelled rows can be expanded.

Endpoint checks require Admin auth and CSRF on POST. The UI disables unavailable staff, labels leave warnings, surfaces 409 conflicts, and uses labelled native controls and visible focus. ZoneAssignment defaults are returned as suggestion metadata but are not materialized by a read or migration.
