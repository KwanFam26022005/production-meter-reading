# Saigon Port — Thread 9C Skill Loading and Progressive Disclosure

**Thread:** 9C — User Task Projection  
**Target Scope:** Mobile User Portal (ReadingBatchView), Backend APIs, Validation Authority  

---

## 1. Skill Selection Matrix

In adherence to `AGENTS.md` progressive disclosure:

| Skill | Status | Scope / Reason | Evidence / Target |
| :--- | :--- | :--- | :--- |
| `saigon-port-ui` | `APPLIED` / `VERIFIED` | Mobile User Portal, ReadingBatchView, Touch boundaries, Maritime token standards | `frontend/src/components/ReadingBatchView.tsx`, `frontend/src/index.css` |
| `ui-ux-pro-max` | `READ` / `APPLIED` | WCAG contrast, aria live regions, sticky progress bars, 4 distinct empty states | High-contrast role badges, sticky headers, ARIA alert live regions |
| `banner-design` | `NOT_APPLICABLE` | Auxiliary graphic design skill | Dormant |
| `brand` | `NOT_APPLICABLE` | External marketing asset management | Dormant |
| `design` | `NOT_APPLICABLE` | Slide & banner generation | Dormant |
| `slides` | `NOT_APPLICABLE` | HTML slide decks | Dormant |

---

## 2. Invariant Policies Maintained

1. **Targeted Progressive Disclosure:** No recursive dumping of `.agent/` or `.agents/`.
2. **Zero Shell Sleep / Timer Loops:** Synchronous `WaitMsBeforeAsync: 10000`, reactive background task notifications.
3. **Evidence-Backed Status Reporting:** Status taxonomy (`DISCOVERED`, `READ`, `APPLIED`, `VERIFIED`, `NOT_APPLICABLE`).
4. **Boundary Isolation:** Operations Portal bundle & Map V2 workspace strictly frozen.
