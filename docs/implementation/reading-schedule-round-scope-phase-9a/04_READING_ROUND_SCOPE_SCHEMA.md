# 04 — Reading round scope schema

`ReadingRound.scope_mode` distinguishes `SNAPSHOT` from `LEGACY_DYNAMIC`. SQLite migration defaults old records to `LEGACY_DYNAMIC`.

`ReadingRoundMeter` stores: primary key; required round FK; nullable meter FK; meter code/name snapshot; operational and presentation zone ID snapshots; utility snapshot; `scope_origin`; `scope_status`; and creation time. A row with `scope_status=SCHEDULED` represents one scheduled meter task. Current meter deletion can null the FK while keeping the snapshot. A round/meter unique constraint prevents duplicate meter tasks; a round/snapshot-code constraint preserves uniqueness if the meter FK is later null. Lookup indexes cover round, meter, and status.

Round FKs use `RESTRICT`; meter references use `SET NULL`. SQLite triggers protect scope facts from update and prevent deleting round/meter history that has readings. Existing `UNIQUE(meter_id, reading_round_id)` remains in `MeterReading`.
