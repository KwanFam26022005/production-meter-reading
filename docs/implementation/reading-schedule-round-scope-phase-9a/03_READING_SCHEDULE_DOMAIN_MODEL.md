# 03 — Reading schedule domain model

Lịch ghi owns **WHEN + WHAT**. A `ReadingRound` is the scheduled time. Its `ReadingRoundMeter` rows are the exact meter tasks due in that round. Assignment and employee ownership remain outside this thread.

```mermaid
flowchart TD
  A[Admin creates schedule] --> B[Resolve eligible meter IDs]
  B --> C[Fingerprint and preview]
  C --> D[Publish in one transaction]
  D --> E[ReadingBatch]
  E --> F[ReadingRound: WHEN]
  F --> G[ReadingRoundMeter: WHAT]
  G --> H[Identity, zone and utility snapshots]
  G --> I[Pending / Review / Confirmed]
  I --> J[Admin round detail]
  I --> K[User global current queue]
  G -. future intersection .-> L[OperationalAssignment: Thread 9B/9C]
```

Published scope rows are operational evidence. Current inventory state can show availability, but it does not add or remove scheduled tasks.
