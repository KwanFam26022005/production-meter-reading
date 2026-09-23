# 19 — Handoff to shift assignment

Thread 9A provides the stable operational set: `ReadingRound` is WHEN and `ReadingRoundMeter` is WHAT. Thread 9B can add assignment ownership using existing `WorkSchedule` and `ZoneAssignment` conventions without editing published scope.

Thread 9C should project user tasks as `ReadingRoundMeter ∩ OperationalAssignment`, then update cross-round reporting and map consumers to explicitly named meter-slot metrics. It must retain `MeterReading.user_id` as actual executor provenance and keep legacy rounds distinguishable.

No assignment FK or employee filter was added in 9A.
