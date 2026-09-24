export function formatMeterTypeLabel(
  meterType: string | null | undefined,
  detail = false,
): string {
  switch (meterType?.trim().toUpperCase()) {
    case 'LCD':
      return detail ? 'Điện tử (LCD)' : 'LCD';
    case 'MECHANICAL':
      return detail ? 'Cơ (Mechanical)' : 'Cơ';
    case 'OTHER':
      return 'Khác';
    default:
      return 'Chưa cấu hình loại';
  }
}
