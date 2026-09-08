import argparse
import csv
import json
import os
import shutil
import sys
from pathlib import Path

# Add parent directory to PYTHONPATH
sys.path.insert(0, str(Path(__file__).resolve().parent.parent.parent))

from backend.app.config import get_settings
from backend.app.db import SessionLocal
from backend.app.models import MeterTrainingSample


def export_training_samples(output_dir: str = "training_export"):
    settings = get_settings()
    source_dir = Path(settings.meter_training_dir)
    out_path = Path(output_dir)

    ocr_dir = out_path / "ocr" / "images"
    ocr_dir.mkdir(parents=True, exist_ok=True)
    needs_bbox_dir = out_path / "needs_annotation" / "images"
    needs_bbox_dir.mkdir(parents=True, exist_ok=True)

    db = SessionLocal()
    try:
        samples = db.query(MeterTrainingSample).all()
        print(f"Found {len(samples)} training samples in database.")

        ocr_labels = []
        needs_bbox_rows = []

        ready_ocr_count = 0
        needs_bbox_count = 0

        for s in samples:
            src_img = source_dir / s.image_filename
            if not src_img.exists():
                print(f"Warning: source image {s.image_filename} not found, skipping.")
                continue

            if s.annotation_status == "READY_OCR":
                dest_img = ocr_dir / s.image_filename
                shutil.copy2(src_img, dest_img)
                ocr_labels.append(f"images/{s.image_filename}\t{s.corrected_reading}")
                ready_ocr_count += 1
            elif s.annotation_status == "NEEDS_BBOX":
                dest_img = needs_bbox_dir / s.image_filename
                shutil.copy2(src_img, dest_img)
                needs_bbox_rows.append({
                    "sample_id": s.id,
                    "image_filename": s.image_filename,
                    "meter_id": s.meter_id,
                    "sample_type": s.sample_type,
                    "corrected_reading": s.corrected_reading,
                    "created_at": s.created_at.isoformat() if s.created_at else "",
                })
                needs_bbox_count += 1

        # Write OCR labels
        labels_file = out_path / "ocr" / "labels.txt"
        with open(labels_file, "w", encoding="utf-8") as f:
            f.write("\n".join(ocr_labels) + ("\n" if ocr_labels else ""))

        # Write Needs Bbox Manifest
        manifest_file = out_path / "needs_annotation" / "manifest.csv"
        with open(manifest_file, "w", newline="", encoding="utf-8") as f:
            writer = csv.DictWriter(
                f,
                fieldnames=["sample_id", "image_filename", "meter_id", "sample_type", "corrected_reading", "created_at"]
            )
            writer.writeheader()
            writer.writerows(needs_bbox_rows)

        print(f"Export completed:")
        print(f"  - READY_OCR samples: {ready_ocr_count} -> {labels_file}")
        print(f"  - NEEDS_BBOX samples: {needs_bbox_count} -> {manifest_file}")

    finally:
        db.close()


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Export meter training samples for ML dataset preparation.")
    parser.add_argument("--output-dir", type=str, default="training_export", help="Destination folder for exported dataset")
    args = parser.parse_args()
    export_training_samples(args.output_dir)
