from functools import lru_cache
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    app_host: str = "0.0.0.0"
    app_port: int = 8000
    environment: str = "development"
    cors_origins: str = "http://localhost:5173,http://localhost:3000"
    max_upload_mb: int = 12

    # Simulation & Scenario Settings (Phase V16E-S1)
    data_mode: str = "SIMULATION"  # "SIMULATION" | "REAL"
    active_scenario: str = "tan-thuan-demo-v1"

    # Database & Storage
    database_url: str = "sqlite:///./data/app.db"
    attendance_photo_dir: Path = Path("data/attendance_photos")
    max_attendance_upload_mb: int = 5
    meter_training_dir: Path = Path("data/meter_training_samples")
    meter_reading_evidence_dir: Path = Path("data/meter_reading_evidence")
    max_evidence_upload_mb: int = 12

    # Session & Security
    session_cookie_name: str = "csg_session"
    session_ttl_hours: int = 12
    cookie_secure: bool | None = None
    csrf_secret: str = "csg-csrf-protection-secret-v1"
    timezone: str = "Asia/Ho_Chi_Minh"
    login_rate_limit_max_attempts: int = 5
    login_rate_limit_window_seconds: int = 60

    # Meter AI Pipeline (Frozen)
    e2_model_path: Path = Path("models/e2/best.pt")
    e2_device: str = "cpu"
    e2_conf: float = 0.30
    e2_iou: float = 0.70
    e2_max_det: int = 100
    e2_primary_imgsz: int = 960
    e2_retry_imgsz: int = 1280

    roi_padding: float = 0.05
    roi_shift_x: float = 0.025

    paddleocr_repo: Path = Path("/opt/PaddleOCR")
    ppocr_rec_model_dir: Path = Path("models/ppocrv6_medium/inference")
    ppocr_char_dict: Path = Path("models/ppocrv6_medium/meter_digits_dict.txt")
    ppocr_rec_algorithm: str = "SVTR_LCNet"
    ppocr_rec_image_shape: str = "3,48,320"
    ppocr_max_text_length: int = 12
    ppocr_rec_batch_num: int = 1
    ppocr_use_gpu: bool = False

    pipeline_version: str = "e2-adaptive-ppocrv6-medium-v1"

    @property
    def cors_origin_list(self) -> list[str]:
        return [x.strip() for x in self.cors_origins.split(",") if x.strip()]

    @property
    def is_cookie_secure(self) -> bool:
        if self.cookie_secure is not None:
            return self.cookie_secure
        return self.environment.lower() == "production"


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
