import React from 'react';
import { AlertTriangle, Check } from 'lucide-react';
import { AdminRosterDayHeader } from '../../../types';
import { DayCoverageSummary } from './types';

interface CoverageRowsProps {
  visibleDays: AdminRosterDayHeader[];
  dayCoverage: Record<string, DayCoverageSummary>;
  activeHoverCol: string | null;
}

export const CoverageRows: React.FC<CoverageRowsProps> = ({
  visibleDays,
  dayCoverage,
  activeHoverCol,
}) => {
  const shifts: Array<{ code: 'CA1' | 'CA2' | 'CA3'; label: string; accentClass: string }> = [
    { code: 'CA1', label: 'C1: 06:00 – 14:00', accentClass: 'accent-ca1' },
    { code: 'CA2', label: 'C2: 14:00 – 22:00', accentClass: 'accent-ca2' },
    { code: 'CA3', label: 'C3: 22:00 – 06:00', accentClass: 'accent-ca3' },
  ];

  return (
    <tfoot>
      {/* 24/7 Operational Shift Coverage Rows */}
      {shifts.map((shift) => (
        <tr key={shift.code} className="roster-coverage-diagnostic-row">
          <td className={`col-employee coverage-diag-label ${shift.accentClass}`}>
            <span className="coverage-shift-bullet" />
            <span>{shift.label}</span>
          </td>

          {visibleDays.map((d) => {
            const summary = dayCoverage[d.date];
            const stat = summary?.shifts[shift.code];
            const isColHover = activeHoverCol === d.date;

            if (!stat) {
              return (
                <td key={`${shift.code}-${d.date}`} className={isColHover ? 'col-active' : ''}>
                  -
                </td>
              );
            }

            // 3-tier coverage state: HEALTHY, AT_MINIMUM, UNDERSTAFFED
            const health = stat.healthState;
            const badgeClass =
              health === 'HEALTHY'
                ? 'coverage-badge-healthy'
                : health === 'AT_MINIMUM'
                ? 'coverage-badge-minimum'
                : 'coverage-badge-understaffed';

            const tooltipText =
              health === 'HEALTHY'
                ? `${stat.assigned} nhân sự được phân công · yêu cầu tối thiểu ${stat.required} (Đảm bảo định biên)`
                : health === 'AT_MINIMUM'
                ? `${stat.assigned} nhân sự được phân công · Đang ở mức nhân sự tối thiểu (yêu cầu tối thiểu ${stat.required})`
                : `Cảnh báo thiếu nhân sự: Hiện có ${stat.assigned} / yêu cầu tối thiểu ${stat.required}`;

            const ariaText = `${d.date} ${shift.code}: ${stat.assigned} nhân sự trên yêu cầu tối thiểu ${stat.required}. ${
              health === 'HEALTHY' ? 'Đảm bảo định biên' : health === 'AT_MINIMUM' ? 'Ở mức tối thiểu' : 'Thiếu người trực'
            }`;

            return (
              <td
                key={`${shift.code}-${d.date}`}
                className={isColHover ? 'col-active' : ''}
                title={tooltipText}
                aria-label={ariaText}
              >
                <span className={`roster-coverage-badge ${badgeClass}`}>
                  <span>
                    {stat.assigned} / ≥{stat.required}
                  </span>
                  {health === 'UNDERSTAFFED' ? (
                    <AlertTriangle size={10} style={{ flexShrink: 0 }} />
                  ) : health === 'HEALTHY' ? (
                    <Check size={10} style={{ flexShrink: 0 }} />
                  ) : null}
                </span>
              </td>
            );
          })}

          <td style={{ fontSize: '10px', color: 'var(--sgp-ink-muted)' }}>-</td>
        </tr>
      ))}

      {/* HC Count Row */}
      <tr className="roster-coverage-diagnostic-row">
        <td className="col-employee coverage-diag-label" style={{ color: 'var(--sgp-ink-secondary)' }}>
          <span className="coverage-shift-bullet" style={{ background: '#64748B' }} />
          <span>Ca HC: 07:30 – 16:30</span>
        </td>
        {visibleDays.map((d) => {
          const summary = dayCoverage[d.date];
          const isColHover = activeHoverCol === d.date;
          const count = summary?.shifts.HC.assigned || 0;
          return (
            <td key={`hc-${d.date}`} className={isColHover ? 'col-active' : ''} style={{ fontSize: '11px', color: 'var(--sgp-ink-secondary)' }}>
              {count}
            </td>
          );
        })}
        <td style={{ fontSize: '10px', color: 'var(--sgp-ink-muted)' }}>-</td>
      </tr>

      {/* Total Working Staff Row */}
      <tr className="admin-roster-footer-row">
        <td className="col-employee" style={{ fontWeight: 800 }}>
          Tổng NV trực / ngày
        </td>
        {visibleDays.map((d) => {
          const summary = dayCoverage[d.date];
          const totalWorking = summary?.totalWorking || 0;
          const isLow = summary?.hasUnderstaffed || totalWorking < 3;
          const isColHover = activeHoverCol === d.date;

          return (
            <td
              key={`total-${d.date}`}
              className={isColHover ? 'col-active' : ''}
              style={{
                backgroundColor: isLow ? '#FEF3C7' : undefined,
                color: isLow ? '#B45309' : undefined,
                fontWeight: isLow ? 800 : 700,
                fontSize: '11px',
              }}
              title={isLow ? `Ngày ${d.date} có ca chưa đủ định biên kíp trực!` : `Tổng cộng: ${totalWorking} nhân sự`}
            >
              {totalWorking} NV
            </td>
          );
        })}
        <td style={{ fontWeight: 800 }}>-</td>
      </tr>
    </tfoot>
  );
};
