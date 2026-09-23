# 04 — Zone Operational State & Truthful Status Model

**Scope:** Attaching live zone metrics to Map V2 presentation zones with truthful multi-state indicators.

---

## 1. Stable Presentation-to-Business Zone Mapping

Mapping between Map V2's 7 canonical presentation zones and SQLite operational business zones is governed by `CANONICAL_MAP_V2_ZONE_MAPPING` (`frontend/src/components/map-v2/zoneMapping.ts`):

```typescript
export const CANONICAL_MAP_V2_ZONE_MAPPING: Record<string, string> = {
  ZONE_QUAY: 'zone-berth',
  ZONE_CONTAINER: 'zone-container',
  ZONE_GENERAL: 'zone-warehouse',
  BLDG_KHO_1: 'zone-warehouse',
  BLDG_KHO_2: 'zone-warehouse',
  BLDG_KHO_4: 'zone-warehouse',
  ZONE_ADMIN: 'zone-technical',
};
```

- **Invariant:** Mapping uses immutable identifiers, never fuzzy string comparisons or Vietnamese display labels.

---

## 2. Five-State Zone Status Abstraction

Implemented via `computeZoneOperationalStatus(zone, roundStatus)`:

| Status | Trigger Condition | Status Label | Visual Semantics |
| :--- | :--- | :--- | :--- |
| `NO_DATA` | Zone has 0 meters or round is uninitialized | `Chưa mở lượt` | Neutral calm slate; **never renders as 0%** |
| `NOT_DUE` | Selected round is scheduled in future (`UPCOMING`) | `Lịch dự kiến` | Soft blue; **never renders as overdue** |
| `OVERDUE` | Target round is past/closed with unread meters (`overdue_count > 0`) | `🔴 [N] trễ hạn` | Prominent attention coral badge |
| `REVIEW` | OCR or quality issues flagged (`review_count > 0`) | `⚠️ [N] cần kiểm tra` | Amber warning badge |
| `NORMAL` | All due meters confirmed without errors | `Đã xác nhận: [X]/[Y]` | Calm maritime slate / emerald check |

---

## 3. Truthful Progress Denominator (BD-05 Adherence)

- **Single-Round Progress:** In accordance with Section 10 of the implementation rules and pending business decision BD-05, zone progress is explicitly scoped to single reading rounds:
  - Formatted text: `"Đã ghi [X] / [Y] công tơ trong lượt"`.
  - Unopened rounds: `"Chưa mở lượt đọc"`.
  - Prohibitions enforced: Never renders `"81% hoàn thành công việc"` (no personal performance attribution) and never aggregates child zones into parent zones (BD-04 deferred).
