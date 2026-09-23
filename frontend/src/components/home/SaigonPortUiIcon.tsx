import React from 'react';

export interface SaigonPortUiIconProps extends React.SVGProps<SVGSVGElement> {
  size?: number;
  hasOuterWhiteRing?: boolean;
}

export const SaigonPortUiIcon: React.FC<SaigonPortUiIconProps> = ({
  size = 45,
  hasOuterWhiteRing = false,
  className = '',
  style,
  ...props
}) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 120 120"
    width={size}
    height={size}
    role="img"
    aria-labelledby="csg-icon-title csg-icon-desc"
    className={className}
    style={style}
    {...props}
  >
    <title id="csg-icon-title">CSG — Cảng Sài Gòn</title>
    <desc id="csg-icon-desc">Biểu tượng CSG cách điệu trên địa cầu, phối màu navy và trắng dành cho giao diện Cảng Sài Gòn.</desc>
    <defs>
      <clipPath id="csg-globe-clip">
        <circle cx="60" cy="57" r="34" />
      </clipPath>
    </defs>

    {/* Optional outer white ring: only used if rendered without an enclosing container border */}
    {hasOuterWhiteRing && (
      <circle cx="60" cy="60" r="59" fill="#FFFFFF" />
    )}

    {/* Primary navy brand ring */}
    <circle cx="60" cy="60" r={hasOuterWhiteRing ? 55.5 : 58} fill="#003875" />

    {/* Inner white globe disc */}
    <circle cx="60" cy="60" r="46.5" fill="#FFFFFF" />

    {/* Globe: restrained vector lines retain clarity at dashboard sizes. */}
    <g fill="none" stroke="#415C94" strokeWidth="1.7" strokeLinejoin="round">
      <circle cx="60" cy="57" r="34" />
      <ellipse cx="60" cy="57" rx="15.5" ry="34" />
      <path d="M26 57H94 M31.5 40.5H88.5 M31.5 73.5H88.5 M60 23V91" />
    </g>

    {/* Deliberately simplified geographic silhouettes, clipped inside globe. */}
    <g clipPath="url(#csg-globe-clip)" fill="#415C94">
      <path d="M27 39l7-7 9-2 8 4 4 5-5 3-3 7-5 2-1 9-5-4-3-9-6-2z" />
      <path d="M45 57l7 4 2 8-5 8-2 11-5-9 1-10-4-6z" />
      <path d="M65 31l8-6 10 5 9 10-5 5-7-2-4 5-8-3-4 4-4-8 4-5z" />
      <path d="M66 52l8-4 9 5-1 11-5 10-5 2-3-10-5-6z" />
      <path d="M81 73l10-4 7 6-4 8-9 1-6-5z" />
    </g>

    {/* Clear label plate keeps the monogram legible at 40–80px. */}
    <rect x="34" y="49" width="52" height="28" rx="2.5" fill="#FFFFFF" />
    <text
      x="60"
      y="71"
      fill="#003875"
      textAnchor="middle"
      fontFamily="Arial Black, Arial, sans-serif"
      fontSize="29"
      fontWeight="900"
      letterSpacing="-1.7"
    >
      CSG
    </text>
  </svg>
);

export default SaigonPortUiIcon;
