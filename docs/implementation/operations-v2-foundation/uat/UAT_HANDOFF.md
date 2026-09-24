# Operations V2 UAT Handoff

## Acceptance state

Final status is recorded after the regression, commit, and remote push steps are complete. The intended outcome is exactly one of `OPERATIONS_V2_UAT_ACCEPTED` or `OPERATIONS_V2_UAT_BLOCKED`.

## Candidate and scope

- UAT candidate: `e6d4b204cb871647b39fb1c5ec5d0f8e98d0fd85`.
- Branch: `integration/operations-v2-foundation`.
- Scope: current Operations V2 acceptance only; no Phase 2.8 work.
- Cross-feature controlled IDs: [controlled-e2e-record.json](evidence/cross-feature/controlled-e2e-record.json).
- Defects and environment limitations: [UAT_DEFECTS.md](UAT_DEFECTS.md).

## Regression results

Final post-fix RELEASE verification:

- Harness overall: `PASSED`.
- Focused backend: 5/5 passed.
- Full backend: 386 passed; 4 failed nodes, all recorded with the same material reasons in `harness/known-failures.json`; 0 new backend failures. Six additional recorded nodes passed in this run.
- The harness's reason check is ID-only (`UNVERIFIED_REASON`); the four final tracebacks were manually checked against the recorded material reasons.
- Harness self-tests: 59/59 passed.
- User tests: 92/92 passed; User build: PASS.
- Operations tests: PASS (397-test baseline or higher); Operations build: PASS.
- Bundle separation: PASS.
- B2 checksum: PASS (`7f3a8916b841e12525969128783eb835218bcdd07f645dc1ee4305bce5a5cc6a`).
- Reading schedule, operational assignment, meter logbook, User task projection, spatial audit/authority, and unified simulation gates: PASS.
- Documentation integrity and `git diff --check`: PASS.
- Final Demo V2 semantic audit and canonical database integrity: PASS; counts remain 719/60/720/269.
- Manual responsive review: complete at the requested Operations and User viewport matrices; see [UAT_RESULTS.md](UAT_RESULTS.md).

## Final repository state

- Defect-focused commits:
  - `3c96e997c73c0b1536b98069d4ca6cbfe731b476` `fix(readings): preserve round chronology and meter metadata`
  - `74a910c7298b99c0b9f403dd35cdf3b2b9572447` `fix(demo-v2): align seed zones and assignment eligibility`
  - `3dc0efdf1d935377228ebcc195f0697cea7ae2e1` `fix(user): show configured meter units and types truthfully`
  - `dfd24871dfbd3cf4e72e698fbb68ea1d23248279` `fix(operations): keep reading review evidence truthful`
  - `d406558ba5f509cb54aa1988ca3357efb3896582` `fix(operations): clarify meter metadata and audit records`
  - `5507bc4c034f686a605ac908490a904ac2217ab8` `fix(operations): clear stale round details after date changes`
  - `0cb6bff1a9cc05217be330632a52029da7bb4291` `fix(map-v2): show shift from the selected round time`
  - `db643f8c190e557eca44f37b2d21568ce210d709` `test: align fixtures with local business-date boundaries`
- UAT evidence/docs commit: `2c1324430f9d08272438cb50f6eb130f9ccbeddb`; the final verification addendum is committed separately after this report update.
- `UAT_FINAL_SHA`: supplied in the completion response after the final handoff commit (the commit cannot contain its own hash).
- Remote push and final clean worktree status: recorded after the final handoff commit is pushed.
- Final canonical DB state and backup: [final-state.json](evidence/database/final-state.json).

## Deferred

See [FUTURE_PHASE_2_8_NOTES.md](FUTURE_PHASE_2_8_NOTES.md). Do not begin Phase 2.8 as part of this handoff.
