# CURRENT ROLE & PERMISSION AUDIT

## 1. System Roles
Defined in `backend/app/models.py` (`User.role`):
1. **`ADMIN`**
2. **`OPERATOR`**
3. **`EMPLOYEE`**

---

## 2. Matrix of Visible Screens & Capabilities by Role

| Screen / Capability | ADMIN | OPERATOR | EMPLOYEE |
| :--- | :---: | :---: | :---: |
| **Mobile Capture Flow** (Camera -> OCR -> Confirm) | Accessible via Direct URL | Accessible via Mobile Shell | Default screen upon login (`HomeHub` / `ReadingBatchView`) |
| **Bản đồ (Map)** | Full Access: view pins, inspect, relocate pins, assign zones | Read-only view of map pins and operational states | No access (redirected to Employee Home) |
| **Mạng lưới (Network)** | Full Access: view diagram, toggle unverified hypotheses, trace DAG | View verified DAG diagram only (unverified toggle hidden) | No access |
| **Sổ ca ghi (List)** | Full Access: view shift reading tasks, open inspection | View shift reading tasks, click to inspect | Mobile counterpart (`ReadingBatchView`) |
| **Kho Thiết bị (Assets)** | Full Access: Create, Edit, Relocate, Attach Meter, Retire | Read-only access to asset registry | No access |
| **Trung tâm Đối soát (Verification)** | Full Access: Verify, Reject, Reopen proposals, log evidence | Read-only access to verification overview | No access |
| **Lịch ghi (Schedules)** | Full Access: Create, Preview, Generate, Delete shift rounds | View assigned schedules | View personal schedule (`UserScheduleView`) |
| **Phân ca (Staff Roster)** | Full Access: Assign shifts, Auto-pattern, approve leaves | View roster | Request leave |
| **Báo cáo (Reports)** | Full Access: KPI analytics, technical exports, CSV download | View operational summary | No access |
| **Nhật ký (Audit Logs)** | Full Access: View immutable audit trail of all mutations | No access | No access |

---

## 3. Explaining Multiple Screens Through Persona Needs
- **EMPLOYEE (Field Worker)**:
  - Needs high contrast, single-flow mobile camera UX (`SKILL.md` "Capture -> Preview -> Processing -> Result").
  - Should NEVER be distracted by complex GIS layers, network DAGs, or CRUD dialogs.
- **OPERATOR (Control Room Dispatcher)**:
  - Needs immediate tactical awareness: Which meters are overdue in the current 2-hour shift? Which zone needs attention?
  - Uses **Bản đồ** (GIS spatial) and **Sổ ca ghi** (checklist).
- **ADMIN (Port Chief Engineer / Supervisor)**:
  - Needs master governance: Adding new transformers/cranes (**Kho Thiết bị**), linking meters to assets, vetting vendor single-line drawings (**Trung tâm Đối soát**), and scheduling monthly reading rounds (**Lịch ghi**).
