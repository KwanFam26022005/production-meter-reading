# 10 — User round consumption

`GET /api/v1/meter-operations/today` uses persisted rows for a current `SNAPSHOT` round. The queue remains global for all eligible operators; Thread 9A adds no employee or assignment filtering.

User progress labels scheduled tasks as “công tơ trong lượt” and shows confirmed, review, and pending counts. Electricity reads display kWh and water reads display m³. A scheduled meter that becomes inactive, retired, or missing remains visible; unavailable items do not open the capture flow. In-scope available items continue to the existing OCR/manual workflow.
