# 02 — User Personas, Core Questions & Operational Inquiries

**Document Reference:** `docs/research/employee-map-ux-design/02_USER_PERSONAS_AND_QUESTIONS.md`  
**Author:** Senior Product Designer, UX Researcher & Operations Software Architect  
**Project:** Production Meter Reading — Cảng Sài Gòn  
**Date:** 2026-09-23  
**Status:** PROPOSED DESIGN SPECIFICATION  

---

## 1. Executive Summary

To ground the UX in real-world port operations rather than theoretical dashboards, this document defines four primary user personas operating across desktop and mobile channels. It formalizes the five canonical operational questions an administrator must be able to answer within three seconds of looking at the screen, as well as the essential questions a field technician must resolve on their mobile device.

---

## 2. Primary Operations Personas

```
+----------------------------------------------------------------------------------------------------+
|                                    OPERATIONAL PERSONAS MATRIX                                     |
+--------------------------+----------------------------+------------------------+-------------------+
| Persona                  | Role & Workspace           | Primary Medium         | Cognitive Load    |
+--------------------------+----------------------------+------------------------+-------------------+
| 1. Trần Minh Đạt         | Điều độ viên ca trực       | Desktop Portal         | High-frequency,   |
| (Shift Dispatcher)       | Phòng Điều độ Trung tâm    | (1440x900 / 1920x1080) | time-sensitive    |
+--------------------------+----------------------------+------------------------+-------------------+
| 2. Nguyễn Hoàng Long     | Trưởng phòng Điều hành     | Desktop Executive View | Oversight,        |
| (Operations Manager)     | Văn phòng Quản lý Cảng     | (1920x1080)            | compliance, audit |
+--------------------------+----------------------------+------------------------+-------------------+
| 3. Lê Văn Hùng           | Kỹ thuật viên đo đếm       | Mobile User Portal     | Outdoor, gloves,  |
| (Field Technician)       | Hiện trường Cầu tàu & Bãi  | (user.html / <480px)   | glare, physical   |
+--------------------------+----------------------------+------------------------+-------------------+
| 4. Phạm Thị Thu Hương    | Quản trị viên Nhân sự      | Desktop Admin Console  | Data integrity,   |
| (HR & System Admin)      | Phòng Tổ chức Cán bộ       | (1440x900)             | account lifecycle |
+--------------------------+----------------------------+------------------------+-------------------+
```

### Persona 1: Trần Minh Đạt — Shift Dispatcher (Điều độ viên ca)
- **Context**: Sits in the central control room managing a 24/7 port rotation.
- **Pain Points**:
  - Doesn't know if a scheduled worker actually showed up without switching to the attendance tab.
  - Has to guess which zone is lagging behind during a reading round.
  - When someone calls in sick, reassigning their zone requires editing two different screens and making a phone call.
- **Goal**: Instantly see zone coverage, spot unassigned areas, and resolve bottlenecks before rounds become overdue.

### Persona 2: Nguyễn Hoàng Long — Operations Manager (Trưởng phòng Điều hành)
- **Context**: Responsible for overall port utility consumption, tenant billing (ships, logistics warehouses), and SLA compliance.
- **Pain Points**:
  - Unread meters at month-end delay billing disputes with shipping lines.
  - Cannot trace who failed to record an unread meter because reports show `recorded_by=None`.
  - Distrusts dashboard numbers that look simulated or don't match the monthly power invoice.
- **Goal**: Verifiable data, audit trails of who inspected which transformer/meter, and immediate escalation of abnormal readings.

### Persona 3: Lê Văn Hùng — Field Technician (Kỹ thuật viên đo đếm hiện trường)
- **Context**: Walking the wharf in 35°C Saigon heat, climbing container ladders, inspecting wharf power bollards and underground water valves.
- **Pain Points**:
  - Opens the app and gets dumped into a list of 150 meters across the whole port. Has to scroll and guess which ones belong to his wharf section.
  - App displays a shift badge but doesn't tell him which zone he's supposed to cover.
  - Fear of getting blamed for missed readings in zones he was never assigned to.
- **Goal**: Clear personal or zone checklist, large touch buttons, fast camera OCR, and certainty that his submitted readings are recorded.

---

## 3. The 5 Core Inquiries of the Operations Overview

When the Shift Dispatcher opens the Operations Portal, the interface must answer five fundamental questions within 3 seconds:

```
+----------------------------------------------------------------------------------------------------+
|                               THE 5 OPERATIONAL QUESTIONS HIERARCHY                                |
+----+-----------------------------------------------------+-----------------------------------------+
| #  | Operational Question                                | Screen Location & Visual Mechanism      |
+----+-----------------------------------------------------+-----------------------------------------+
| 1  | Which operational period am I viewing?              | Global Operational Strip (Header):      |
|    | (Date, Shift CA1/CA2/CA3, Round e.g. 08:00)         | Calendar date, shift chip, round pill.  |
+----+-----------------------------------------------------+-----------------------------------------+
| 2  | What is the port-wide meter-reading progress?       | Top Status Summary & Map Zone Rings:    |
|    | (Overall completed / total meters, on-time status)  | 142/180 meters (78%) + time remaining.  |
+----+-----------------------------------------------------+-----------------------------------------+
| 3  | Which zones need immediate attention?               | Spatial Map Polygons & Alert Badges:    |
|    | (Lagging progress, unread clusters, alert flags)    | Amber/Red border highlight, alert icon. |
+----+-----------------------------------------------------+-----------------------------------------+
| 4  | Who is recorded as responsible for each zone?       | Zone Operations Anchor & Marker Badge:  |
|    | (Assigned operator name, code, attendance status)   | Operator avatar chip + duty badge.      |
+----+-----------------------------------------------------+-----------------------------------------+
| 5  | What action can I take next?                        | Contextual Inspector Action Dock:       |
|    | (Reassign zone, contact staff, close round)         | Primary CTA: "Điều phối ca", "Hối thúc" |
+----+-----------------------------------------------------+-----------------------------------------+
```

---

## 4. The 5 Core Inquiries of the Mobile Field Technician

When the Field Technician opens `user.html` on their smartphone, the interface must answer:

1. **"What shift am I scheduled for today?"**  
   - *Example*: `Ca 1 (06:00 - 14:00) — Đã điểm danh lúc 05:58`.
2. **"What zone am I responsible for?"**  
   - *Example*: `Khu vực phụ trách: Khu cảng sà lan (Zone Quay)` or `Chưa phân công khu vực cụ thể`.
3. **"What meter-reading work is assigned to me right now?"**  
   - *Example*: `Lượt 08:00: 24/32 công tơ cần ghi tại Khu cảng sà lan`.
4. **"What remains unfinished?"**  
   - *Example*: Filter tab: `Chưa ghi (8)` showing exact meter codes sorted by physical inspection sequence.
5. **"How do I report a problem or obstruction?"**  
   - *Example*: Direct action button inside the camera/reading modal: `Báo sự cố (Kẹt hàng, hỏng mặt kính)`.
