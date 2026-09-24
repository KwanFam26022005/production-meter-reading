export function formatMeasurementUnit(unit: string | null | undefined): string | null {
  switch (unit?.toUpperCase()) {
    case 'KWH':
      return 'kWh';
    case 'M3':
      return 'm³';
    default:
      return null;
  }
}
