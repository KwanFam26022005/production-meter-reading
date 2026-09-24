# Saigon Port — Thread 9C Mobile User Portal Integration

**Component:** `frontend/src/components/ReadingBatchView.tsx`  
**Parent Shell:** `frontend/src/apps/user/UserApp.tsx`  
**Styles:** `frontend/src/index.css`  

---

## 1. UI Enhancements Implemented

1. **Assigned Zone & Role Header Bar (`.worklist-assignment-bar`):**
   - Renders interactive chips displaying each assigned zone and the user's role (`Chính` vs `Hỗ trợ`).
   - Uses WCAG-compliant maritime blues and neutral slates from `DESIGN_DNA.md`.
2. **Personal Progress Bar (`.worklist-progress-section`):**
   - Explicitly shows: `3 / 5 công tơ được giao đã ghi`.
   - Accompanied by the global round pill: `Lượt này có 12 công tơ`.
3. **Task Cards with Role & Provenance:**
   - Shows role pill (`.task-card-role-badge.role-primary` / `.role-support`).
   - Shows zone snapshot tag (`.meter-card-zone-tag`).
   - For confirmed meters, renders auditor-grade provenance: `Người ghi: Nguyễn Văn An (NV-101) · 08:15`.
4. **Stale Assignment Banner (`.stale-notice-banner`):**
   - Informs field operators of real-time schedule adjustments made while reading on the wharf.
