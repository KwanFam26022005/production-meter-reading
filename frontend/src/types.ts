export type MeterType = "lcd" | "mechanical";

export interface MeterReadResponse {
  status: "success" | "review";
  reading: string | null;
  meter_type: MeterType | null;
  det_confidence: number | null;
  ocr_confidence: number | null;
  localization_imgsz: number | null;
  pipeline_version: string;
}
