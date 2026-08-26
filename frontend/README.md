# Frontend — Antigravity handoff

Build a **mobile-first PWA**. The frontend must not run AI inference locally; it only captures/uploads an image and calls the backend API.

## Required flow

1. Capture a meter photo with the phone camera or choose an image.
2. Show image preview.
3. Submit `multipart/form-data` with field name `file` to `POST /api/v1/read-meter`.
4. Show a clear loading state while inference runs.
5. `status=success`: show the reading prominently.
6. `status=review`: ask the operator to retake/review the image.

## API type

```ts
export type MeterReadResponse = {
  status: "success" | "review";
  reading: string | null;
  meter_type: "lcd" | "mechanical" | null;
  det_confidence: number | null;
  ocr_confidence: number | null;
  localization_imgsz: number | null;
  pipeline_version: string;
};
```

## Antigravity starter prompt

```text
Build a mobile-first PWA for field electricity-meter reading.

The app has one main task: capture or upload a meter image and send it to an existing FastAPI backend.

User flow:
1. Home screen has one primary action: Take meter photo.
2. Support mobile camera capture and gallery upload.
3. Show a full-width image preview with Retake and Read Meter actions.
4. POST multipart/form-data field "file" to `${VITE_API_BASE_URL}/api/v1/read-meter`.
5. While waiting, show a simple processing state; do not fabricate progress percentages.
6. On status="success", show the reading in very large type, then meter type and confidence as secondary details.
7. On status="review", show "Không đọc được chỉ số — vui lòng chụp lại" and a primary Retake action.
8. Handle camera permission, network error, API error, oversized files and invalid images cleanly.

Design:
- Vietnamese UI
- mobile-first, PWA-ready
- clean utility/industrial aesthetic, but not heavy or overly futuristic
- large touch targets suitable for field workers
- high contrast in outdoor conditions
- minimal screens, no dashboard, no login, no database and no history in v1
- avoid decorative 3D elements

Technical constraints:
- frontend only; do not implement AI inference in JavaScript
- keep API access in one small service module
- environment variable VITE_API_BASE_URL
- typed response matching MeterReadResponse
- camera input should use accept="image/*" and capture="environment" where supported
```

## V1 acceptance test

On a phone: open app -> take photo -> preview -> submit -> receive reading or REVIEW. That one flow must work before adding authentication, history, dashboards or other features.
