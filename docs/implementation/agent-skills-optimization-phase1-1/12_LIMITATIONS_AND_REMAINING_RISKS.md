# Remaining Limitations, Architectural Boundaries, and Phase 2 Risks

**Project:** Production Meter Reading — Cảng Sài Gòn  
**Repository:** `D:\Projects\production-meter-reading\production-meter-reading`  
**Date:** 2026-09-23  
**Auditor Role:** Independent AI Agent Runtime Auditor  

---

## 1. Epistemic Transparency and Scope Boundaries

In accordance with independent auditing standards, this document identifies the remaining limitations, unalterable engine mechanics, and residual risks following the Phase 1.1 acceptance audit.

---

## 2. Identified Limitations & Remaining Risks

### 2.1 The System Prompt Fixed Footprint Tax (~780 tokens/turn)
- **The Condition:** All 7 generic skills in `.agents/skills/` remain physically present in the directory to satisfy the non-deletion safety invariant.
- **The Consequence:** The Antigravity engine scans `.agents/skills/` and mounts all 7 skills into the `<skills>` block on every model turn.
- **Impact:** Skills irrelevant to software development (`banner-design`, `brand`, `design`, `slides`) consume approximately **~780 tokens per turn** (~39,000 tokens over a 50-turn session).
- **Phase 2 Recommendation:** In Phase 2, move these 4 non-engineering skills to an archive or auxiliary tools directory (e.g., `tools/creative-skills/` or `.agents_archive/`) so the engine does not discover them during core development workflows.

### 2.2 Server-Side Billed Token Telemetry Boundary
- **The Condition:** Exact BPE token invoices billed by Google DeepMind Gemini API endpoints are tracked server-side and are not written to local client logs.
- **Epistemic Classification:** Billed token usage is strictly recorded as **`TOKEN_USAGE_UNAVAILABLE`**.
- **Auditing Rule:** No overall percentage savings claims may be manufactured from character length heuristics. Character counts (~4 chars/token) serve only as descriptive engineered models.

### 2.3 Backend Test Isolation & Live Database Safety
- **The Condition:** Some test files in `tests/` (e.g., `test_work_schedule.py`) explicitly configure `DATABASE_URL = sqlite:///./data/test_app.db`, but running the entire `pytest tests/` suite without a standardized fixture wrapper poses a potential risk of mutating `data/app.db`.
- **Precaution Taken:** In this acceptance audit, backend tests were safely inspected via read-only tools; mutating backend suites were NOT executed against the live environment.
- **Phase 2 Recommendation:** Implement a pytest `conftest.py` fixture that strictly enforces an in-memory database (`sqlite:///:memory:`) for all backend automated test runs.

### 2.4 Parent Session Static Prompt Serialization
- **The Condition:** Antigravity serializes the parent conversation's system prompt once at startup (`manager.go:1331`).
- **The Consequence:** Adding or editing skills during an active parent conversation does not dynamically hot-reload that parent's system prompt; discovery updates take effect immediately in subagents, reloaded conversations, and subsequent sessions.

### 2.5 Long-Term CSS Token Refactoring
- **Accomplished in Phase 1:** Duplicate token tables in `saigon-port-ui` were removed and linked to `frontend/DESIGN_DNA.md`.
- **Deferred:** Refactoring duplicate utility classes across `frontend/src/index.css` (25,474 lines) remains deferred to avoid touching production CSS during an agent-workflow optimization phase.
