# Saigon Port — Thread 9C Personal Progress vs Global Denominator

**Principle:** Two Separate Truths  
**Scope:** Mobile User Portal UI & API Contract  

---

## 1. Dual-Truth Architecture

In production meter reading operations, an individual employee must clearly understand their personal shift duty without losing sight of overall wharf-wide reading progress.

```text
┌─────────────────────────────────────────────────────────────┐
│ ROUND 08:00 · Đang mở                                       │
│ [Lượt này có 12 công tơ (CONTAINER, GENERAL, CFS)]           │
├─────────────────────────────────────────────────────────────┤
│ Khu vực: [Bãi container · Chính]                            │
│                                                             │
│ Tiến độ cá nhân: 3 / 5 công tơ được giao đã ghi (60%)       │
│ [████████████████████░░░░░░░░░░░░]                          │
│                                                             │
│ (5 Được giao)  (3 Đã ghi)  (0 Cần kiểm tra)  (2 Chưa ghi)  │
└─────────────────────────────────────────────────────────────┘
```

### 1.1 Invariants
1. **Personal Numerator & Denominator:**
   - Displayed as: `3 / 5 công tơ được giao đã ghi`.
   - Numerator: confirmed readings on assigned meters.
   - Denominator: total scheduled meters within the employee's assigned zones for that round.
2. **Global Round Denominator:**
   - Displayed as a global scope pill: `Lượt này có 12 công tơ`.
   - Never overridden or replaced by personal assigned counts.
3. **No False 100%:**
   - When User A completes 5/5 assigned meters, User A's personal progress reaches 100%, but the global round progress remains 5/12 until User B and User C finish their respective zones.
