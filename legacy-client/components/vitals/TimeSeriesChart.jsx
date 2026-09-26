import React, { useState, useMemo } from 'react';
import { Activity, TrendingUp, Info } from 'lucide-react';
import { useLanguage } from '../../i18n/LanguageContext';

export default function TimeSeriesChart({
  title,
  loincCode,
  data = [],
  color = '#0d9488',
  unit = '',
  isDual = false,
  dualConfig = null,
  normalRange = null
}) {
  const { locale, t } = useLanguage();
  const [hoveredPoint, setHoveredPoint] = useState(null);

  // Format date helper
  const formatDate = (dateStr) => {
    try {
      const d = new Date(dateStr);
      return new Intl.DateTimeFormat(locale, {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      }).format(d);
    } catch {
      return dateStr;
    }
  };

  const formatShortDate = (dateStr) => {
    try {
      const d = new Date(dateStr);
      return new Intl.DateTimeFormat(locale, {
        month: 'short',
        year: '2-digit'
      }).format(d);
    } catch {
      return dateStr;
    }
  };

  // Dimensions & bounds calculation
  const width = 460;
  const height = 180;
  const padding = { top: 20, right: 25, bottom: 35, left: 45 };

  const chartAreaWidth = width - padding.left - padding.right;
  const chartAreaHeight = height - padding.top - padding.bottom;

  const { points, dualPoints, yMin, yMax, latestValue, minValue, maxValue } = useMemo(() => {
    if (!data || data.length === 0) {
      return { points: [], dualPoints: [], yMin: 0, yMax: 100, latestValue: null, minValue: null, maxValue: null };
    }

    if (isDual) {
      // For Blood Pressure: data has { systolic, diastolic, date, timestamp }
      const validPoints = data.filter(d => d.systolic !== null || d.diastolic !== null);
      if (validPoints.length === 0) return { points: [], dualPoints: [], yMin: 0, yMax: 160 };

      const allValues = [];
      validPoints.forEach(d => {
        if (d.systolic !== null) allValues.push(d.systolic);
        if (d.diastolic !== null) allValues.push(d.diastolic);
      });

      const rawMin = Math.min(...allValues);
      const rawMax = Math.max(...allValues);
      const yMinCalc = Math.floor(Math.max(0, rawMin - 15) / 10) * 10;
      const yMaxCalc = Math.ceil((rawMax + 15) / 10) * 10;

      const latest = validPoints[validPoints.length - 1];

      return {
        dualPoints: validPoints,
        yMin: yMinCalc,
        yMax: yMaxCalc,
        latestValue: latest ? `${latest.systolic ?? '-'}/${latest.diastolic ?? '-'}` : null,
        minValue: rawMin,
        maxValue: rawMax
      };
    } else {
      const validPoints = data.filter(d => typeof d.value === 'number' && !isNaN(d.value));
      if (validPoints.length === 0) return { points: [], dualPoints: [], yMin: 0, yMax: 100 };

      const values = validPoints.map(d => d.value);
      const rawMin = Math.min(...values);
      const rawMax = Math.max(...values);
      const span = rawMax - rawMin || 1;
      const yMinCalc = Math.max(0, Math.floor(rawMin - span * 0.15));
      const yMaxCalc = Math.ceil(rawMax + span * 0.15);

      const latest = validPoints[validPoints.length - 1];

      return {
        points: validPoints,
        yMin: yMinCalc,
        yMax: yMaxCalc,
        latestValue: latest?.value,
        minValue: rawMin,
        maxValue: rawMax
      };
    }
  }, [data, isDual]);

  // Coordinate scales
  const getX = (index, total) => {
    if (total <= 1) return padding.left + chartAreaWidth / 2;
    return padding.left + (index / (total - 1)) * chartAreaWidth;
  };

  const getY = (val) => {
    if (yMax === yMin) return padding.top + chartAreaHeight / 2;
    const norm = (val - yMin) / (yMax - yMin);
    return padding.top + chartAreaHeight - norm * chartAreaHeight;
  };

  // Generate SVG path for a series
  const buildSvgPath = (pts, valueKey = 'value') => {
    if (!pts || pts.length === 0) return '';
    return pts.map((pt, i) => {
      const val = valueKey ? pt[valueKey] : pt.value;
      if (val === null || val === undefined) return '';
      const x = getX(i, pts.length);
      const y = getY(val);
      return `${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
    }).filter(Boolean).join(' ');
  };

  // Generate area fill path
  const buildAreaPath = (pts, valueKey = 'value') => {
    if (!pts || pts.length === 0) return '';
    const linePath = buildSvgPath(pts, valueKey);
    const lastX = getX(pts.length - 1, pts.length);
    const firstX = getX(0, pts.length);
    const bottomY = padding.top + chartAreaHeight;
    return `${linePath} L ${lastX.toFixed(1)} ${bottomY} L ${firstX.toFixed(1)} ${bottomY} Z`;
  };

  const hasData = (isDual && dualPoints.length > 0) || (!isDual && points.length > 0);
  const activePoints = isDual ? dualPoints : points;

  // Unique chart ID for gradient
  const chartId = useMemo(() => `chart-${loincCode.replace(/[^a-zA-Z0-9]/g, '')}`, [loincCode]);

  return (
    <div
      style={{
        backgroundColor: '#ffffff',
        borderRadius: '0.75rem',
        border: '1px solid #e2e8f0',
        padding: '1.25rem',
        boxShadow: '0 1px 3px rgba(15, 23, 42, 0.04)',
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
        transition: 'all 0.15s ease'
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '0.75rem', gap: '0.5rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
            <h4 style={{ fontSize: '0.9375rem', fontWeight: 700, color: '#0f172a' }}>
              {title}
            </h4>
            <span
              style={{
                fontSize: '0.6875rem',
                fontFamily: 'var(--font-mono)',
                backgroundColor: '#f1f5f9',
                color: '#64748b',
                padding: '0.1rem 0.4rem',
                borderRadius: '4px'
              }}
            >
              LOINC {loincCode}
            </span>
          </div>

          {normalRange && (
            <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '2px' }}>
              {t('normalRange')}: <span style={{ fontWeight: 600 }}>{normalRange}</span>
            </div>
          )}
        </div>

        {/* Latest Value Badge */}
        {hasData && (
          <div style={{ textAlign: 'right', flexShrink: 0 }}>
            <div style={{ fontSize: '1.15rem', fontWeight: 800, color: color, lineHeight: 1 }}>
              {latestValue} <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b' }}>{unit}</span>
            </div>
            <div style={{ fontSize: '0.6875rem', color: '#94a3b8', marginTop: '2px' }}>
              {t('latestReading')}
            </div>
          </div>
        )}
      </div>

      {/* Dual Legend if Blood Pressure */}
      {isDual && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.5rem', fontSize: '0.75rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <span style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: dualConfig?.systolicColor || '#ef4444' }} />
            <span style={{ fontWeight: 600, color: '#334155' }}>{t('systolic')} (8480-6)</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <span style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: dualConfig?.diastolicColor || '#0284c7' }} />
            <span style={{ fontWeight: 600, color: '#334155' }}>{t('diastolic')} (8462-4)</span>
          </div>
        </div>
      )}

      {/* SVG Chart Area */}
      {hasData ? (
        <div style={{ width: '100%', position: 'relative' }}>
          <svg
            viewBox={`0 0 ${width} ${height}`}
            style={{ width: '100%', height: 'auto', display: 'block', overflow: 'visible' }}
          >
            <defs>
              <linearGradient id={`${chartId}-grad`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={color} stopOpacity="0.25" />
                <stop offset="100%" stopColor={color} stopOpacity="0.0" />
              </linearGradient>
            </defs>

            {/* Gridlines */}
            {[0, 0.33, 0.66, 1].map((ratio, i) => {
              const yVal = Math.round(yMin + ratio * (yMax - yMin));
              const yPos = getY(yVal);
              return (
                <g key={i}>
                  <line
                    x1={padding.left}
                    y1={yPos}
                    x2={width - padding.right}
                    y2={yPos}
                    stroke="#f1f5f9"
                    strokeDasharray="3 3"
                    strokeWidth="1"
                  />
                  <text
                    x={padding.left - 6}
                    y={yPos + 3}
                    textAnchor="end"
                    fontSize="9"
                    fill="#94a3b8"
                    fontFamily="var(--font-mono)"
                  >
                    {yVal}
                  </text>
                </g>
              );
            })}

            {/* Area Fill for Single Series */}
            {!isDual && points.length > 1 && (
              <path
                d={buildAreaPath(points)}
                fill={`url(#${chartId}-grad)`}
              />
            )}

            {/* Line Paths */}
            {isDual ? (
              <>
                {/* Systolic Line */}
                <path
                  d={buildSvgPath(dualPoints, 'systolic')}
                  fill="none"
                  stroke={dualConfig?.systolicColor || '#ef4444'}
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                {/* Diastolic Line */}
                <path
                  d={buildSvgPath(dualPoints, 'diastolic')}
                  fill="none"
                  stroke={dualConfig?.diastolicColor || '#0284c7'}
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </>
            ) : (
              <path
                d={buildSvgPath(points)}
                fill="none"
                stroke={color}
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            )}

            {/* Data Point Dots & Hover Targets */}
            {activePoints.map((pt, i) => {
              const cx = getX(i, activePoints.length);

              if (isDual) {
                const sysY = pt.systolic !== null ? getY(pt.systolic) : null;
                const diaY = pt.diastolic !== null ? getY(pt.diastolic) : null;

                return (
                  <g key={pt.id || i} onMouseEnter={() => setHoveredPoint(pt)} onMouseLeave={() => setHoveredPoint(null)}>
                    {sysY !== null && (
                      <circle
                        cx={cx}
                        cy={sysY}
                        r={hoveredPoint === pt ? 5 : 3.5}
                        fill="#ffffff"
                        stroke={dualConfig?.systolicColor || '#ef4444'}
                        strokeWidth="2"
                        style={{ cursor: 'pointer', transition: 'all 0.15s ease' }}
                      />
                    )}
                    {diaY !== null && (
                      <circle
                        cx={cx}
                        cy={diaY}
                        r={hoveredPoint === pt ? 5 : 3.5}
                        fill="#ffffff"
                        stroke={dualConfig?.diastolicColor || '#0284c7'}
                        strokeWidth="2"
                        style={{ cursor: 'pointer', transition: 'all 0.15s ease' }}
                      />
                    )}
                  </g>
                );
              } else {
                const cy = getY(pt.value);
                return (
                  <circle
                    key={pt.id || i}
                    cx={cx}
                    cy={cy}
                    r={hoveredPoint === pt ? 5 : 3.5}
                    fill="#ffffff"
                    stroke={color}
                    strokeWidth="2"
                    onMouseEnter={() => setHoveredPoint(pt)}
                    onMouseLeave={() => setHoveredPoint(null)}
                    style={{ cursor: 'pointer', transition: 'all 0.15s ease' }}
                  />
                );
              }
            })}

            {/* X-axis date labels */}
            {activePoints.length > 0 && (
              <>
                <text
                  x={getX(0, activePoints.length)}
                  y={height - 10}
                  textAnchor="start"
                  fontSize="9"
                  fill="#94a3b8"
                >
                  {formatShortDate(activePoints[0].date)}
                </text>
                {activePoints.length > 2 && (
                  <text
                    x={getX(Math.floor(activePoints.length / 2), activePoints.length)}
                    y={height - 10}
                    textAnchor="middle"
                    fontSize="9"
                    fill="#94a3b8"
                  >
                    {formatShortDate(activePoints[Math.floor(activePoints.length / 2)].date)}
                  </text>
                )}
                {activePoints.length > 1 && (
                  <text
                    x={getX(activePoints.length - 1, activePoints.length)}
                    y={height - 10}
                    textAnchor="end"
                    fontSize="9"
                    fill="#94a3b8"
                  >
                    {formatShortDate(activePoints[activePoints.length - 1].date)}
                  </text>
                )}
              </>
            )}
          </svg>

          {/* Hover Tooltip Overlay */}
          {hoveredPoint && (
            <div
              style={{
                position: 'absolute',
                top: '4px',
                left: '50%',
                transform: 'translateX(-50%)',
                backgroundColor: '#0f172a',
                color: '#ffffff',
                padding: '0.35rem 0.65rem',
                borderRadius: '0.375rem',
                fontSize: '0.75rem',
                boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
                pointerEvents: 'none',
                zIndex: 10,
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                whiteSpace: 'nowrap'
              }}
            >
              <span style={{ color: '#94a3b8' }}>{formatDate(hoveredPoint.date)}:</span>
              <span style={{ fontWeight: 700, color: '#38bdf8' }}>
                {isDual
                  ? `${hoveredPoint.systolic ?? '-'}/${hoveredPoint.diastolic ?? '-'} ${unit}`
                  : `${hoveredPoint.value} ${unit}`}
              </span>
            </div>
          )}
        </div>
      ) : (
        <div
          style={{
            height: '140px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: '#f8fafc',
            borderRadius: '0.5rem',
            border: '1px dashed #e2e8f0',
            color: '#94a3b8',
            fontSize: '0.8125rem',
            gap: '0.25rem'
          }}
        >
          <Activity size={22} strokeWidth={1.5} color="#cbd5e1" />
          <span>{t('noObservationsRecorded')}</span>
        </div>
      )}

      {/* Footer Stats summary */}
      {hasData && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid #f1f5f9', paddingTop: '0.6rem', marginTop: '0.5rem', fontSize: '0.72rem', color: '#64748b' }}>
          <span>{activePoints.length} {t('readingsRecorded')}</span>
          {!isDual && minValue !== null && maxValue !== null && (
            <span>Min: <strong>{minValue}</strong> • Max: <strong>{maxValue}</strong> {unit}</span>
          )}
        </div>
      )}
    </div>
  );
}
