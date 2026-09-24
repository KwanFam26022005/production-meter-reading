# 02 — Skill loading and plan

`AGENTS.md` was read first and applied. The task-specific `saigon-port-ui` skill and `frontend/DESIGN_DNA.md` were read before Admin/User interface work. The top-level `ui-ux-pro-max/SKILL.md` was read for focus, keyboard, and ARIA guidance; its data directory was not opened.

Implementation sequence followed: reconcile preserved work; inspect schema/API/test conventions; persist scope and preserve legacy state; resolve and fingerprint scope; publish transactionally; consume scope in Admin and User; enforce submissions; protect history; add tests and screenshots; run regression and build gates.

Backend schema work followed existing SQLAlchemy/Pydantic and SQLite bootstrap conventions. `WorkSchedule` and `ZoneAssignment` semantics were not changed.
