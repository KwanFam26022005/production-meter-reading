from __future__ import annotations

import math
import sys
from dataclasses import dataclass
from pathlib import Path
from threading import Lock
from typing import Any

import cv2
import numpy as np
from ultralytics import YOLO

from .config import Settings


SEQUENCE_CLASSES = {"lcd_digit_line", "mechanical_black_row"}
METER_TYPE_MAP = {
    "lcd_digit_line": "lcd",
    "mechanical_black_row": "mechanical",
}


@dataclass(frozen=True)
class Detection:
    class_name: str
    confidence: float
    bbox: tuple[float, float, float, float]
    imgsz: int


@dataclass(frozen=True)
class ReadingResult:
    status: str
    reading: str | None
    meter_type: str | None
    det_confidence: float | None
    ocr_confidence: float | None
    localization_imgsz: int | None


class MeterReader:
    """Production inference pipeline.

    Locked flow:
        E2 @960 -> retry @1280 on miss -> fixed crop -> PP-OCRv6-Medium.
    """

    def __init__(self, settings: Settings):
        self.settings = settings
        self._detector: YOLO | None = None
        self._recognizer: Any | None = None
        self._load_lock = Lock()
        self._infer_lock = Lock()

    @property
    def loaded(self) -> bool:
        return self._detector is not None and self._recognizer is not None

    def load(self) -> None:
        with self._load_lock:
            if self.loaded:
                return

            self._validate_model_paths()
            self._detector = YOLO(str(self.settings.e2_model_path))
            self._recognizer = self._load_paddle_recognizer()

    def _validate_model_paths(self) -> None:
        missing = []
        for path in (
            self.settings.e2_model_path,
            self.settings.ppocr_rec_model_dir,
            self.settings.ppocr_char_dict,
        ):
            if not Path(path).exists():
                missing.append(str(path))

        if missing:
            raise FileNotFoundError(
                "Required model artifacts are missing: " + ", ".join(missing)
            )

    def _load_paddle_recognizer(self):
        repo = self.settings.paddleocr_repo.resolve()
        predictor = repo / "tools" / "infer" / "predict_rec.py"
        if not predictor.exists():
            raise FileNotFoundError(
                f"PaddleOCR repository not found at {repo}. "
                "Set PADDLEOCR_REPO to a PaddleOCR checkout containing tools/infer/predict_rec.py."
            )

        if str(repo) not in sys.path:
            sys.path.insert(0, str(repo))

        from tools.infer import utility as infer_utility  # type: ignore
        from tools.infer.predict_rec import TextRecognizer  # type: ignore

        old_argv = sys.argv[:]
        sys.argv = [
            "meter-recognizer",
            "--rec_model_dir",
            str(self.settings.ppocr_rec_model_dir),
            "--rec_algorithm",
            self.settings.ppocr_rec_algorithm,
            "--rec_image_shape",
            self.settings.ppocr_rec_image_shape,
            "--rec_char_dict_path",
            str(self.settings.ppocr_char_dict),
            "--rec_batch_num",
            str(self.settings.ppocr_rec_batch_num),
            "--max_text_length",
            str(self.settings.ppocr_max_text_length),
            "--use_gpu",
            str(self.settings.ppocr_use_gpu),
        ]
        try:
            args = infer_utility.parse_args()
        finally:
            sys.argv = old_argv

        return TextRecognizer(args)

    def read(self, image: np.ndarray) -> ReadingResult:
        if image is None or image.size == 0:
            raise ValueError("Empty image")

        if not self.loaded:
            self.load()

        # Model runtimes are shared singletons. Serialize inference until the
        # deployment runtime has been profiled for safe model-level concurrency.
        with self._infer_lock:
            detection = self._detect(image, self.settings.e2_primary_imgsz)
            if detection is None:
                detection = self._detect(image, self.settings.e2_retry_imgsz)

            if detection is None:
                return ReadingResult(
                    status="review",
                    reading=None,
                    meter_type=None,
                    det_confidence=None,
                    ocr_confidence=None,
                    localization_imgsz=None,
                )

            crop = self._crop(image, detection.bbox)
            reading, ocr_score = self._recognize(crop)

            if not reading:
                return ReadingResult(
                    status="review",
                    reading=None,
                    meter_type=METER_TYPE_MAP[detection.class_name],
                    det_confidence=detection.confidence,
                    ocr_confidence=ocr_score,
                    localization_imgsz=detection.imgsz,
                )

            return ReadingResult(
                status="success",
                reading=reading,
                meter_type=METER_TYPE_MAP[detection.class_name],
                det_confidence=detection.confidence,
                ocr_confidence=ocr_score,
                localization_imgsz=detection.imgsz,
            )

    def _detect(self, image: np.ndarray, imgsz: int) -> Detection | None:
        assert self._detector is not None
        result = self._detector.predict(
            source=image,
            imgsz=imgsz,
            conf=self.settings.e2_conf,
            iou=self.settings.e2_iou,
            max_det=self.settings.e2_max_det,
            device=self.settings.e2_device,
            verbose=False,
        )[0]

        names = self._detector.names
        candidates: list[Detection] = []

        if result.boxes is None:
            return None

        for box in result.boxes:
            cls_id = int(box.cls.item())
            class_name = str(names[cls_id])
            if class_name not in SEQUENCE_CLASSES:
                continue

            confidence = float(box.conf.item())
            x1, y1, x2, y2 = [float(v) for v in box.xyxy[0].tolist()]
            candidates.append(
                Detection(
                    class_name=class_name,
                    confidence=confidence,
                    bbox=(x1, y1, x2, y2),
                    imgsz=imgsz,
                )
            )

        if not candidates:
            return None

        return max(candidates, key=lambda item: item.confidence)

    def _crop(
        self,
        image: np.ndarray,
        bbox: tuple[float, float, float, float],
    ) -> np.ndarray:
        height, width = image.shape[:2]
        x1, y1, x2, y2 = bbox
        box_w = max(x2 - x1, 1.0)
        box_h = max(y2 - y1, 1.0)

        dx = self.settings.roi_shift_x * box_w
        pad_x = self.settings.roi_padding * box_w
        pad_y = self.settings.roi_padding * box_h

        nx1 = max(0, math.floor(x1 + dx - pad_x))
        nx2 = min(width, math.ceil(x2 + dx + pad_x))
        ny1 = max(0, math.floor(y1 - pad_y))
        ny2 = min(height, math.ceil(y2 + pad_y))

        if nx2 <= nx1 or ny2 <= ny1:
            raise ValueError("Invalid ROI crop")

        crop = image[ny1:ny2, nx1:nx2].copy()
        if crop.size == 0:
            raise ValueError("Empty ROI crop")
        return crop

    def _recognize(self, crop: np.ndarray) -> tuple[str, float]:
        assert self._recognizer is not None
        results, _ = self._recognizer([crop])
        if not results:
            return "", 0.0

        result = results[0]
        if not isinstance(result, (tuple, list)) or len(result) < 2:
            return "", 0.0

        text = str(result[0]).strip()
        score = float(result[1])
        return text, score


def decode_image(data: bytes) -> np.ndarray:
    array = np.frombuffer(data, dtype=np.uint8)
    image = cv2.imdecode(array, cv2.IMREAD_COLOR)
    if image is None:
        raise ValueError("Unsupported or invalid image file")
    return image
