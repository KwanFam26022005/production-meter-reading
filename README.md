# Production Meter Reading

Mobile-first electricity meter reading application.

## Locked inference pipeline

```text
Image
  -> E2 localization @960
  -> retry E2 @1280 only when no valid sequence ROI is found
  -> ROI crop: 5% padding + +2.5% horizontal shift
  -> PP-OCRv6-Medium recognition
  -> reading or REVIEW
```

Main-path scope is intentionally small. Stage-A `reading_panel`, crop sweeps, 1600/1920 inference and other experimental fallbacks are not part of the production pipeline.

## Repository layout

```text
production-meter-reading/
├── backend/       FastAPI inference service
├── frontend/      Antigravity mobile/PWA workspace
├── models/        model placement instructions only; weights are not committed
├── .env.example
├── .gitignore
└── README.md
```

## API contract

`POST /api/v1/read-meter` with `multipart/form-data`, field name `file`.

Success:

```json
{
  "status": "success",
  "reading": "0035785.4",
  "meter_type": "lcd",
  "det_confidence": 0.7145,
  "ocr_confidence": 0.9918,
  "localization_imgsz": 960,
  "pipeline_version": "e2-adaptive-ppocrv6-medium-v1"
}
```

Review:

```json
{
  "status": "review",
  "reading": null,
  "meter_type": null,
  "det_confidence": null,
  "ocr_confidence": null,
  "localization_imgsz": null,
  "pipeline_version": "e2-adaptive-ppocrv6-medium-v1"
}
```

## Local backend

1. Put model files in the paths described in `models/README.md`.
2. Copy `.env.example` to `.env` and adjust paths/device.
3. Install dependencies:

```bash
cd backend
pip install -r requirements.txt
```

4. Start API:

```bash
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

5. Open `http://localhost:8000/docs`.

## Security

This repository is public. Do **not** commit company meter images, datasets, `.env`, E2 weights, PaddleOCR weights, API keys or other internal artifacts.
