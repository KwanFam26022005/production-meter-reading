import React from 'react';

export interface MiniDonutProps {
  value: number; // 0 to 100
  size?: number; // default 70 (recommended: 68-72px)
  strokeWidth?: number; // default 6 (recommended: 6px)
  label?: string; // e.g. "78%"
  caption: string; // e.g. "OCR"
  color?: string; // default "#38BDF8" (sky-400)
  trackColor?: string; // default "rgba(255, 255, 255, 0.08)"
}

/**
 * MiniDonut (V13.4)
 *
 * Lightweight, reusable SVG progress donut.
 * Compact sizing (68-72px, 6px stroke).
 * Zero external chart dependencies.
 * Respects prefers-reduced-motion.
 */
export const MiniDonut: React.FC<MiniDonutProps> = ({
  value,
  size = 70,
  strokeWidth = 6,
  label,
  caption,
  color = '#38BDF8',
  trackColor = 'rgba(255, 255, 255, 0.08)',
}) => {
  const normalizedValue = Math.min(100, Math.max(0, isNaN(value) ? 0 : value));
  const center = size / 2;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (normalizedValue / 100) * circumference;

  const displayLabel = label ?? `${Math.round(normalizedValue)}%`;

  return (
    <div
      className="sgp-mini-donut-wrap"
      role="progressbar"
      aria-valuenow={Math.round(normalizedValue)}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={`${caption}: ${displayLabel}`}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '6px',
        userSelect: 'none',
      }}
    >
      <div style={{ position: 'relative', width: size, height: size }}>
        <svg
          width={size}
          height={size}
          viewBox={`0 0 ${size} ${size}`}
          style={{ transform: 'rotate(-90deg)', display: 'block' }}
        >
          {/* Background Track Circle */}
          <circle
            cx={center}
            cy={center}
            r={radius}
            fill="none"
            stroke={trackColor}
            strokeWidth={strokeWidth}
          />
          {/* Progress Indicator Circle */}
          <circle
            cx={center}
            cy={center}
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            className="sgp-donut-progress-circle"
            style={{
              transition: 'stroke-dashoffset 250ms cubic-bezier(0.16, 1, 0.3, 1)',
            }}
          />
        </svg>

        {/* Center Percentage Label */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            pointerEvents: 'none',
          }}
        >
          <span
            className="font-tabular"
            style={{
              fontSize: size >= 80 ? '16px' : '13px',
              fontWeight: 700,
              color: '#F8FAFC',
              lineHeight: 1,
            }}
          >
            {displayLabel}
          </span>
        </div>
      </div>

      {/* Underneath Caption */}
      <span
        style={{
          fontSize: '11px',
          color: '#94A3B8',
          fontWeight: 500,
          textAlign: 'center',
          maxWidth: `${size + 24}px`,
          lineHeight: 1.2,
        }}
      >
        {caption}
      </span>
    </div>
  );
};
