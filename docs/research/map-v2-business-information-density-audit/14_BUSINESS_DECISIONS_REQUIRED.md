# Map V2 Business & Information Density Audit — 14. Business Decisions Required

The following questions require Cảng Sài Gòn operational management confirmation before proceeding with UI implementation.

## Priority 1 — Data Foundation

| # | Question | Context | Impact If Unresolved |
| :--- | :--- | :--- | :--- |
| BD-01 | Should Map V2 display REAL-TIME zone progress? | Currently hardcoded demo data | Map remains a static visualization |
| BD-02 | What backend API endpoints should serve Map V2 data? | No endpoints exist for Map V2 specifically | Cannot integrate operational data |
| BD-03 | How should Map V2 zone IDs (ZONE_QUAY, etc.) map to backend OperationalZone IDs? | Two different ID systems exist | Cannot link map to reports/schedules |
| BD-04 | Should parent zone (Bãi tổng hợp) aggregate child zone (Kho 1, Kho 2) progress? | Frontend has parent-child; backend is flat | Risk of double-counting or missing data |
| BD-05 | What is the denominator for zone progress? | Total meters? Scheduled meters? Active meters? | Progress percentage is meaningless without a defined denominator |

## Priority 2 — User Workflow

| # | Question | Context | Impact |
| :--- | :--- | :--- | :--- |
| BD-06 | Should Map V2 show the current reading round and date? | Map V2 currently has no date/round context | Users cannot understand what time period they're viewing |
| BD-07 | Should Map V2 have search functionality? | No search exists | Users cannot find specific zones or meters |
| BD-08 | Should clicking a zone/meter on Map V2 deep-link to Reports? | No cross-screen links exist | Map is isolated from other modules |
| BD-09 | Should reports be able to navigate back to Map V2 with context? | No reverse navigation | Cannot use map for spatial investigation |
| BD-10 | When should employee markers use real assignment data vs demo? | Backend ZoneAssignment table exists but no API | Employee display remains illustrative indefinitely |

## Priority 3 — UI Organization

| # | Question | Context | Impact |
| :--- | :--- | :--- | :--- |
| BD-11 | Should Technical mode tools (geometry inspection, coordinates) require elevated permissions? | Currently anyone can access | Operators may be confused by technical data |
| BD-12 | Should utility network visualization require Technical mode? | Currently toggleable in any mode | Operators may confuse simulation with real infrastructure |
| BD-13 | Should the CANONICAL badge and technical metadata (1536×1024 px, vertex counts) be visible to operators? | Currently always visible on wide screens | Screen space consumed by technical info |
| BD-14 | Should toolbar layout follow Option A (unified compact) or Option B (contextual by mode)? | See 04_TOOLBAR_OPTIONS_AND_DECISIONS.md | Determines implementation approach |

## Priority 4 — Data Truthfulness

| # | Question | Context | Impact |
| :--- | :--- | :--- | :--- |
| BD-15 | When real data becomes available, should Map V2 show both demo and real data, or only real? | Demo data is well-labeled but may confuse | User trust |
| BD-16 | Should zone progress badges on the map distinguish 'no data' from '0% complete'? | Different operational meanings | Misinterpretation of zone status |
| BD-17 | How should the map indicate meters that exist but have no assigned coordinates in Map V2 space? | Backend meters have map_x/map_y that may be Map V1 coords | Meters may appear at wrong positions |
