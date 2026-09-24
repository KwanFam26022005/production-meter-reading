# Operations V2 UAT Environment

## Source and runtime

- Candidate/branch: `e6d4b204cb871647b39fb1c5ec5d0f8e98d0fd85` / `integration/operations-v2-foundation`.
- Entry preflight matched that branch and SHA and found one registered worktree. The worktree already contained staged changes from this authorized, in-progress UAT; those source, test, seed/audit, documentation, and evidence paths were reviewed and classified before continuing. No unrelated changes were discarded.
- Canonical source: `D:\Projects\production-meter-reading\production-meter-reading`.
- Canonical runtime and database: `D:\Projects\production-meter-reading\.runtime` and `.runtime\data\app.db`.
- Python: `D:\Projects\production-meter-reading\production-meter-reading\.venv\Scripts\python.exe` (Python 3.11.9).
- The legacy `MeterReadingBackend` service was `Stopped` and `Disabled` before launch.
- `scripts\dev.ps1 -NonInteractive` launched the backend on 8000, User on 5173, and Operations on 5174. `state\dev-pids.json` under the canonical runtime recorded the canonical source, runtime, branch/SHA, and listener ownership. Backend health and both frontend endpoints returned ready.
- The first launcher attempt found stale process records and refused to take over port 8000. Its recorded listener was verified as the canonical Uvicorn child, and only the exact canonical Uvicorn/Vite process tree was stopped. No global Python or Node process termination was used. A subsequent launcher run completed successfully.

## Scenario configuration

The canonical database contains the deterministic `tan-thuan-demo-v2` dataset, while the application default `active_scenario` is `tan-thuan-demo-v1`. Starting the UAT stack with `ACTIVE_SCENARIO=tan-thuan-demo-v2` exposed the 12 V2 meters in the Admin inventory. This was a process environment setting only; product source defaults were not changed. The Admin meter API returned all 12 V2 meters with `scenario_id=tan-thuan-demo-v2`.

## Automated test process isolation

- Backend and spatial regression commands use the authoritative project Python and `DATABASE_URL=sqlite:///./data/test_app.db`; `PMR_RUNTIME_ROOT` is left unset for those test processes. The User/Operations development stack continues to use the canonical `.runtime` database.
- One early standalone spatial-authority diagnostic omitted `DATABASE_URL`, so its legacy test module resolved the repository's `data/app.db` instead of the test fixture DB. Two tests then failed on the legacy DB's five-zone map while their assertions expected six zones. The same tests passed 11/11 when rerun with `DATABASE_URL=sqlite:///./data/test_app.db`.
- That first diagnostic imported a legacy fixture with an automatic draft-map cleanup hook. A read-only post-check found `integrity_check=ok` and zero DRAFT map versions in the repository-local DB; its pre-run DRAFT count was not captured. The canonical `.runtime` database was not the connection target and was independently checked at 719/60/720/269 with `integrity_check=ok` afterward. No restore was attempted against the noncanonical database.

## Browser/session isolation

- Chrome Profile A: Operations / `ADMIN-001`.
- Separate Edge/profile: User Portal / Employee session.
- Browser sessions were kept separate because localhost cookies can be shared across ports. Evidence contains no cookies, tokens, or private session files. Public demo passwords are not repeated here.

## Database history and integrity

- Initial snapshot: [initial-state.json](evidence/database/initial-state.json), SHA-256 `8dc620378a58dcfddd02d43c586ee3aaf84a62fd7f24dfbbcb7aeea11fc50e0c`; its verified backup is `.runtime\backups\phase27-uat-initial-2026-09-25.sqlite`, SHA-256 `019787eb59fc310710981e9729e07500fbb9ddd7ec1c66146c5e5f92655710ab`, `integrity_check=ok`.
- A later raw file copy made immediately before the approved reset did not capture the SQLite WAL contents. It is **not a valid restore point**: `.runtime\backups\phase27-uat-pre-final-reset-20260925.sqlite`, SHA-256 `9413e5e84a8f877eb3b7e5fc0f5bff68dc3617abe2fe792aa45afb7db380be85`, reports zero readings. It was not used for restore.
- The controlled pre-reset snapshot `.runtime\backups\phase27-uat-controlled-pre-reset-2026-09-25.sqlite` is a valid SQLite file with 720 readings, 61 rounds, 732 RRM rows, and 270 assignments; it predates the final controlled reading. The controlled E2E IDs and observations are preserved in [controlled-e2e-record.json](evidence/cross-feature/controlled-e2e-record.json).
- After the authorized V2 seed reset, a consistent online SQLite backup was made at `.runtime\backups\phase27-uat-final-baseline-20260925.sqlite`, SHA-256 `6edc0feb9f8309b41145895684eee9643762f10c6009ca5076742b62c87cd97a`, with `integrity_check=ok` and the expected 719/60/720/269 counts.
- The final baseline is deterministic Demo V2. No controlled UAT reading, round, or assignment remains in the canonical DB.

## OCR and camera capability

The local OCR model paths exist and the development launcher reported local inference `READY`. No authentic meter photograph was available in the repository/runtime evidence, and the browser camera request was denied by the local browser permission. No OCR execution or image evidence was fabricated. Real OCR inference therefore remains unqualified in this environment; see `REAL_OCR_INFERENCE_NOT_QUALIFIED_IN_CURRENT_ENVIRONMENT` in [UAT_RESULTS.md](UAT_RESULTS.md).
