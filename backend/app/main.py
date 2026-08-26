from contextlib import asynccontextmanager

from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware

from .config import get_settings
from .inference import MeterReader, decode_image
from .schemas import HealthResponse, MeterReadResponse


settings = get_settings()
reader = MeterReader(settings)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Load eagerly so model/config errors are visible at startup rather than on
    # the first mobile request.
    reader.load()
    yield


app = FastAPI(
    title="Production Meter Reading API",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)


@app.get("/health", response_model=HealthResponse)
def health() -> HealthResponse:
    return HealthResponse(
        pipeline_version=settings.pipeline_version,
        models_loaded=reader.loaded,
    )


@app.post("/api/v1/read-meter", response_model=MeterReadResponse)
async def read_meter(file: UploadFile = File(...)) -> MeterReadResponse:
    if file.content_type and not file.content_type.startswith("image/"):
        raise HTTPException(status_code=415, detail="Only image uploads are supported")

    data = await file.read()
    if not data:
        raise HTTPException(status_code=400, detail="Empty upload")

    max_bytes = settings.max_upload_mb * 1024 * 1024
    if len(data) > max_bytes:
        raise HTTPException(
            status_code=413,
            detail=f"Image exceeds {settings.max_upload_mb} MB limit",
        )

    try:
        image = decode_image(data)
        result = reader.read(image)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    return MeterReadResponse(
        status=result.status,
        reading=result.reading,
        meter_type=result.meter_type,
        det_confidence=result.det_confidence,
        ocr_confidence=result.ocr_confidence,
        localization_imgsz=result.localization_imgsz,
        pipeline_version=settings.pipeline_version,
    )
