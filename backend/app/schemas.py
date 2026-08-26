from typing import Literal

from pydantic import BaseModel


class HealthResponse(BaseModel):
    status: Literal["ok"] = "ok"
    pipeline_version: str
    models_loaded: bool


class MeterReadResponse(BaseModel):
    status: Literal["success", "review"]
    reading: str | None = None
    meter_type: Literal["lcd", "mechanical"] | None = None
    det_confidence: float | None = None
    ocr_confidence: float | None = None
    localization_imgsz: int | None = None
    pipeline_version: str
