"use client";

import { useMemo } from "react";

const COLORS = [
  "#ef4444", "#3b82f6", "#22c55e", "#f59e0b", "#8b5cf6",
  "#ec4899", "#14b8a6", "#f97316", "#6366f1", "#84cc16",
];

/* ─── 막대 그래프 (HTML/CSS) ─── */
type BarDatum = { label: string; value: number };

export function SvgBarChart({
  data,
  height = 240,
  color = "#ef4444",
  unit = "건",
}: {
  data: BarDatum[];
  height?: number;
  color?: string;
  unit?: string;
  showLabels?: boolean;
}) {
  const max = Math.max(1, ...data.map((d) => d.value));
  const barAreaH = height - 32;

  return (
    <div style={{ height }} className="flex flex-col">
      <div className="flex flex-1 items-end gap-[2px] px-1" style={{ height: barAreaH }}>
        {data.map((d, i) => {
          const barH = max > 0 ? (d.value / max) * barAreaH * 0.85 : 0;
          return (
            <div key={i} className="flex flex-1 flex-col items-center justify-end" title={`${d.label}: ${d.value}${unit}`}>
              {d.value > 0 && (
                <span className="mb-0.5 text-[10px] font-semibold leading-none" style={{ color }}>
                  {d.value}
                </span>
              )}
              <div
                className="w-full rounded-t-sm transition-all"
                style={{
                  height: Math.max(barH, d.value > 0 ? 3 : 0),
                  backgroundColor: color,
                  opacity: 0.85,
                  minWidth: 4,
                }}
              />
            </div>
          );
        })}
      </div>
      <div className="mt-1 flex gap-[2px] border-t border-border/50 px-1 pt-1">
        {data.map((d, i) => (
          <div key={i} className="flex-1 text-center">
            <span className="text-[9px] leading-none text-muted-foreground">{d.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── 꺾은선 그래프 (SVG, smooth bezier) ─── */
type LineDatum = { label: string; value: number };

function smoothPath(pts: { x: number; y: number }[]): string {
  if (pts.length < 2) return "";
  let d = `M ${pts[0].x} ${pts[0].y}`;
  for (let i = 1; i < pts.length; i++) {
    const prev = pts[i - 1];
    const cur = pts[i];
    const cpx = (prev.x + cur.x) / 2;
    d += ` C ${cpx} ${prev.y}, ${cpx} ${cur.y}, ${cur.x} ${cur.y}`;
  }
  return d;
}

function formatKoreanWon(v: number): string {
  if (v >= 100_000_000) return `${(v / 100_000_000).toFixed(1)}억`;
  if (v >= 10_000) return `${(v / 10_000).toFixed(0)}만`;
  if (v > 0) return `${v.toLocaleString()}`;
  return "";
}

export function SvgLineChart({
  data,
  height = 260,
  color = "#14b8a6",
}: {
  data: LineDatum[];
  height?: number;
  color?: string;
  unit?: string;
  formatValue?: (v: number) => string;
}) {
  const nonZero = data.filter((d) => d.value > 0);
  const max = Math.max(1, ...data.map((d) => d.value));
  const minNonZero = nonZero.length > 0 ? Math.min(...nonZero.map((d) => d.value)) : 0;
  const floorVal = minNonZero * 0.6;
  const range = max - floorVal || 1;

  const n = data.length;
  const svgW = 700;
  const svgH = height;
  const pad = { top: 36, bottom: 36, left: 50, right: 20 };
  const chartW = svgW - pad.left - pad.right;
  const chartH = svgH - pad.top - pad.bottom;

  const points = useMemo(() => {
    return data.map((d, i) => {
      const x = pad.left + (n > 1 ? (i / (n - 1)) * chartW : chartW / 2);
      const ratio = d.value > 0 ? (d.value - floorVal) / range : 0;
      const y = pad.top + chartH - Math.max(ratio, 0) * chartH;
      return { x, y, ...d };
    });
  }, [data, floorVal, range, chartW, chartH, n]);

  const curvePath = useMemo(() => smoothPath(points), [points]);
  const gradientId = `lg-${color.replace("#", "")}`;

  const areaPath = useMemo(() => {
    if (points.length < 2) return "";
    const baseline = pad.top + chartH;
    return `${curvePath} L ${points[points.length - 1].x} ${baseline} L ${points[0].x} ${baseline} Z`;
  }, [curvePath, points, chartH]);

  const yTicks = useMemo(() => {
    const ticks: number[] = [];
    const step = range / 4;
    for (let i = 0; i <= 4; i++) ticks.push(Math.round(floorVal + step * i));
    return ticks;
  }, [floorVal, range]);

  const showLabel = useMemo(() => {
    return new Set(data.map((d, i) => d.value > 0 ? i : -1).filter((i) => i >= 0));
  }, [data]);

  return (
    <svg width="100%" height={svgH} viewBox={`0 0 ${svgW} ${svgH}`} preserveAspectRatio="xMidYMid meet">
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity={0.15} />
          <stop offset="100%" stopColor={color} stopOpacity={0.01} />
        </linearGradient>
      </defs>

      {yTicks.map((tick, i) => {
        const ratio = range > 0 ? (tick - floorVal) / range : 0;
        const y = pad.top + chartH - ratio * chartH;
        return (
          <g key={i}>
            <line x1={pad.left} y1={y} x2={svgW - pad.right} y2={y} stroke="hsl(var(--border))" strokeWidth={0.5} strokeDasharray="4 3" />
            <text x={pad.left - 6} y={y + 3.5} textAnchor="end" fontSize={9} fill="hsl(var(--muted-foreground))">
              {formatKoreanWon(tick)}
            </text>
          </g>
        );
      })}

      {areaPath && <path d={areaPath} fill={`url(#${gradientId})`} />}
      <path d={curvePath} fill="none" stroke={color} strokeWidth={2.5} strokeLinecap="round" />

      {points.map((p, i) => (
        <g key={i}>
          <circle cx={p.x} cy={p.y} r={p.value > 0 ? 4 : 2.5} fill={p.value > 0 ? "hsl(var(--card))" : "hsl(var(--muted-foreground))"} stroke={p.value > 0 ? color : "hsl(var(--muted-foreground))"} strokeWidth={p.value > 0 ? 2 : 1} />
          {showLabel.has(i) && (
            <text x={p.x} y={p.y - 12} textAnchor="middle" fontSize={10} fill={color} fontWeight="600">
              {formatKoreanWon(p.value)}원
            </text>
          )}
          <text x={p.x} y={svgH - 10} textAnchor="middle" fontSize={9.5} fill="hsl(var(--muted-foreground))">
            {p.label}
          </text>
        </g>
      ))}
    </svg>
  );
}

/* ─── 원형/도넛 그래프 (SVG) ─── */
type PieDatum = { name: string; value: number };

function polarToCartesian(cx: number, cy: number, r: number, angle: number) {
  const rad = ((angle - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

export function SvgPieChart({
  data,
  size = 220,
  innerRadius = 0,
  colors = COLORS,
}: {
  data: PieDatum[];
  size?: number;
  innerRadius?: number;
  colors?: string[];
}) {
  const total = data.reduce((s, d) => s + d.value, 0);
  if (total === 0) return <p className="py-8 text-center text-sm text-muted-foreground">데이터 없음</p>;

  const cx = size / 2;
  const cy = size / 2;
  const outerR = size / 2 - 10;
  const innerR = innerRadius;

  let currentAngle = 0;
  const slices = data.map((d, i) => {
    const sliceAngle = (d.value / total) * 360;
    const startAngle = currentAngle;
    const endAngle = currentAngle + sliceAngle;
    currentAngle = endAngle;

    const midAngle = startAngle + sliceAngle / 2;
    const labelR = innerR > 0 ? (outerR + innerR) / 2 : outerR * 0.6;
    const labelPos = polarToCartesian(cx, cy, labelR, midAngle);
    const percent = ((d.value / total) * 100).toFixed(0);
    const showLabel = sliceAngle > 25;

    if (sliceAngle >= 359.9) {
      const path = innerR > 0
        ? `M ${cx - outerR} ${cy} A ${outerR} ${outerR} 0 1 1 ${cx + outerR} ${cy} A ${outerR} ${outerR} 0 1 1 ${cx - outerR} ${cy} M ${cx - innerR} ${cy} A ${innerR} ${innerR} 0 1 0 ${cx + innerR} ${cy} A ${innerR} ${innerR} 0 1 0 ${cx - innerR} ${cy}`
        : `M ${cx} ${cy} m -${outerR} 0 a ${outerR} ${outerR} 0 1 1 ${outerR * 2} 0 a ${outerR} ${outerR} 0 1 1 -${outerR * 2} 0`;
      return { path, color: colors[i % colors.length], label: showLabel ? { ...labelPos, text: `${d.value}`, sub: `${percent}%` } : null, title: `${d.name}: ${d.value}건 (${percent}%)`, name: d.name, value: d.value, percent };
    }

    const outerStart = polarToCartesian(cx, cy, outerR, startAngle);
    const outerEnd = polarToCartesian(cx, cy, outerR, endAngle);
    const largeArc = sliceAngle > 180 ? 1 : 0;

    let path: string;
    if (innerR > 0) {
      const innerStart = polarToCartesian(cx, cy, innerR, startAngle);
      const innerEnd = polarToCartesian(cx, cy, innerR, endAngle);
      path = `M ${outerEnd.x} ${outerEnd.y} A ${outerR} ${outerR} 0 ${largeArc} 0 ${outerStart.x} ${outerStart.y} L ${innerStart.x} ${innerStart.y} A ${innerR} ${innerR} 0 ${largeArc} 1 ${innerEnd.x} ${innerEnd.y} Z`;
    } else {
      path = `M ${cx} ${cy} L ${outerEnd.x} ${outerEnd.y} A ${outerR} ${outerR} 0 ${largeArc} 0 ${outerStart.x} ${outerStart.y} Z`;
    }

    return { path, color: colors[i % colors.length], label: showLabel ? { ...labelPos, text: `${d.value}`, sub: `${percent}%` } : null, title: `${d.name}: ${d.value}건 (${percent}%)`, name: d.name, value: d.value, percent };
  });

  return (
    <div className="flex flex-col items-center gap-3">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {slices.map((s, i) => (
          <g key={i}>
            <path d={s.path} fill={s.color} stroke="hsl(var(--card))" strokeWidth={2} className="transition-opacity hover:opacity-80">
              <title>{s.title}</title>
            </path>
            {s.label && (
              <>
                <text x={s.label.x} y={s.label.y - 6} textAnchor="middle" fontSize={13} fontWeight="700" fill="#fff">
                  {s.label.text}
                </text>
                <text x={s.label.x} y={s.label.y + 8} textAnchor="middle" fontSize={10} fill="rgba(255,255,255,0.8)">
                  {s.label.sub}
                </text>
              </>
            )}
          </g>
        ))}
      </svg>
      <div className="flex flex-wrap justify-center gap-x-4 gap-y-1.5">
        {data.map((d, i) => {
          const pct = total > 0 ? ((d.value / total) * 100).toFixed(1) : "0";
          return (
            <div key={i} className="flex items-center gap-1.5 text-xs">
              <span className="inline-block h-3 w-3 rounded-sm" style={{ backgroundColor: colors[i % colors.length] }} />
              <span className="text-foreground font-medium">{d.name}</span>
              <span className="text-muted-foreground">{d.value}건 ({pct}%)</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function SvgDonutChart(props: Omit<Parameters<typeof SvgPieChart>[0], "innerRadius"> & { innerRadius?: number }) {
  return <SvgPieChart {...props} innerRadius={props.innerRadius ?? 50} />;
}
