import React from 'react';

export interface RadarPoint {
  label: string;
  gross: number | null; // 1–5, null = not scored
  net: number | null;   // 1–5, null = not scored
}

interface RadarChartProps {
  points: RadarPoint[];
  size?: number; // SVG square size in px, default 280
}

export function RadarChart({ points, size = 280 }: RadarChartProps): React.JSX.Element {
  if (points.length === 0) {
    return (
      <div
        style={{
          width: size,
          height: size,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <span style={{ color: '#64748b', fontSize: '0.875rem' }}>No dimensions scored</span>
      </div>
    );
  }

  const cx = size / 2;
  const cy = size / 2;
  const r = (size / 2) * 0.60; // radar area radius — leaves room for labels
  const n = points.length;

  // Angle for dimension i: start at top (−π/2), clockwise evenly spaced
  const angle = (i: number): number => -Math.PI / 2 + (i * 2 * Math.PI) / n;

  // Cartesian coordinate for dimension i at given score (0 = center, 5 = outer edge)
  const coord = (i: number, score: number): { x: number; y: number } => {
    const d = (score / 5) * r;
    const a = angle(i);
    return { x: cx + d * Math.cos(a), y: cy + d * Math.sin(a) };
  };

  // SVG path string from array of {x, y} points (closed polygon)
  const toPath = (pts: Array<{ x: number; y: number }>): string =>
    pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(2)},${p.y.toFixed(2)}`).join(' ') + ' Z';

  // Grid rings at score levels 1–5
  const gridRings = [1, 2, 3, 4, 5].map((s) =>
    toPath(Array.from({ length: n }, (_, i) => coord(i, s))),
  );

  // Spoke lines from center to outer edge
  const spokes = Array.from({ length: n }, (_, i) => {
    const outer = coord(i, 5);
    return { x1: cx, y1: cy, x2: outer.x, y2: outer.y };
  });

  // Gross and net score polygons (null scores rendered at center = score 0)
  const grossPts = points.map((p, i) => coord(i, p.gross ?? 0));
  const netPts = points.map((p, i) => coord(i, p.net ?? 0));

  const hasGross = points.some((p) => p.gross !== null);
  const hasNet = points.some((p) => p.net !== null);

  // Label positions: slightly outside the outer ring
  const labelDist = r + 18;
  const labelPositions = points.map((p, i) => {
    const a = angle(i);
    const x = cx + labelDist * Math.cos(a);
    const y = cy + labelDist * Math.sin(a);
    const anchor: 'middle' | 'start' | 'end' =
      Math.abs(Math.cos(a)) < 0.15 ? 'middle' : x > cx ? 'start' : 'end';
    return { x, y, label: p.label, anchor };
  });

  return (
    <svg
      width={size}
      height={size}
      style={{ display: 'block', overflow: 'visible' }}
      role="img"
      aria-label="Risk heatmap radar chart"
    >
      {/* Grid rings */}
      {gridRings.map((d, i) => (
        <path
          key={i}
          d={d}
          fill="none"
          stroke={i === 4 ? '#475569' : '#1e293b'}
          strokeWidth={i === 4 ? 1.5 : 1}
        />
      ))}

      {/* Score level tick labels on right spoke (dimension 0 axis) */}
      {[1, 3, 5].map((s) => {
        const pt = coord(0, s);
        return (
          <text
            key={s}
            x={pt.x + 4}
            y={pt.y}
            fill="#475569"
            fontSize="9"
            dominantBaseline="middle"
          >
            {s}
          </text>
        );
      })}

      {/* Spoke lines */}
      {spokes.map((s, i) => (
        <line
          key={i}
          x1={s.x1}
          y1={s.y1}
          x2={s.x2}
          y2={s.y2}
          stroke="#334155"
          strokeWidth={1}
        />
      ))}

      {/* Gross polygon (amber) */}
      {hasGross && (
        <path
          d={toPath(grossPts)}
          fill="#f59e0b"
          fillOpacity={0.15}
          stroke="#f59e0b"
          strokeWidth={1.5}
          strokeOpacity={0.8}
        />
      )}

      {/* Net polygon (blue) */}
      {hasNet && (
        <path
          d={toPath(netPts)}
          fill="#3b82f6"
          fillOpacity={0.22}
          stroke="#3b82f6"
          strokeWidth={2}
        />
      )}

      {/* Net score dots on each spoke */}
      {points.map((p, i) => {
        if (p.net === null) return null;
        const pt = coord(i, p.net);
        return <circle key={i} cx={pt.x} cy={pt.y} r={3} fill="#3b82f6" />;
      })}

      {/* Dimension labels */}
      {labelPositions.map((l, i) => (
        <text
          key={i}
          x={l.x}
          y={l.y}
          textAnchor={l.anchor}
          dominantBaseline="middle"
          fill="#94a3b8"
          fontSize="11"
          fontFamily="inherit"
        >
          {l.label}
        </text>
      ))}

      {/* Center dot */}
      <circle cx={cx} cy={cy} r={2} fill="#475569" />
    </svg>
  );
}
