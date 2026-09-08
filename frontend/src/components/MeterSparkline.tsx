import React from 'react';
import { MeterTrendPoint } from '../types';

interface MeterSparklineProps {
  data: MeterTrendPoint[];
  width?: number;
  height?: number;
  className?: string;
}

export const MeterSparkline: React.FC<MeterSparklineProps> = ({
  data,
  width = 120,
  height = 26,
  className = '',
}) => {
  // If fewer than 2 valid points, do not render a misleading line
  if (!data || data.length < 2) {
    return (
      <div className={`sparkline-empty-container ${className}`} aria-label="Chưa đủ dữ liệu xu hướng">
        <span className="sparkline-empty-text">Chưa đủ dữ liệu xu hướng</span>
      </div>
    );
  }

  const paddingX = 4;
  const paddingY = 4;
  const plotWidth = width - paddingX * 2;
  const plotHeight = height - paddingY * 2;

  const values = data.map((d) => d.value);
  const minVal = Math.min(...values);
  const maxVal = Math.max(...values);
  const valRange = maxVal - minVal;

  const points = data.map((d, idx) => {
    const x = paddingX + (idx / (data.length - 1)) * plotWidth;
    // Invert y: higher value = higher on chart (smaller y coord)
    const y =
      valRange === 0
        ? paddingY + plotHeight / 2
        : height - paddingY - ((d.value - minVal) / valRange) * plotHeight;
    return { x: Number(x.toFixed(1)), y: Number(y.toFixed(1)) };
  });

  const pointsString = points.map((p) => `${p.x},${p.y}`).join(' ');
  const lastPoint = points[points.length - 1];
  const firstPoint = points[0];

  const firstReading = data[0].reading;
  const lastReading = data[data.length - 1].reading;

  const ariaLabel = `Xu hướng chỉ số ${data.length} lượt gần nhất: từ ${firstReading} (${data[0].scheduled_time}) đến ${lastReading} (${data[data.length - 1].scheduled_time}) kWh`;

  return (
    <div className={`meter-sparkline-wrapper ${className}`} title={ariaLabel}>
      <svg
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        className="meter-sparkline-svg"
        role="img"
        aria-label={ariaLabel}
      >
        {/* Sparkline polyline */}
        <polyline
          fill="none"
          stroke="var(--sgp-brand-600)"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          points={pointsString}
        />

        {/* Start subtle anchor dot */}
        <circle
          cx={firstPoint.x}
          cy={firstPoint.y}
          r="2"
          fill="var(--sgp-brand-400)"
        />

        {/* Latest active reading dot */}
        <circle
          cx={lastPoint.x}
          cy={lastPoint.y}
          r="3"
          fill="var(--sgp-brand-700)"
        />
      </svg>
      <span className="sparkline-range-hint">
        {data[0].scheduled_time} &rarr; {data[data.length - 1].scheduled_time}
      </span>
    </div>
  );
};
