import React, { useState, useEffect, useMemo } from 'react';
import { AlertTriangle, ChevronDown } from 'lucide-react';
import { api } from '../api';
import type { Asset, TierConfig } from '../types';
import type { EntityFilter } from '../layouts/AppShell';

// ─── Constants ────────────────────────────────────────────────────────────────
const TIER_LABELS: Record<number, string> = {
  0: 'Grid-Down Baseline',
  1: 'Digital Liquidity',
  2: 'The Vaults',
  3: 'Uncensorable Frontier',
  4: 'Paper Prosperity',
};

const TIER_DESCRIPTIONS: Record<number, string> = {
  0: 'Physical cash and hard assets accessible in a grid-down scenario',
  1: 'Highly liquid digital and near-cash positions',
  2: 'Long-term store of value: gold, silver, real estate',
  3: 'Self-sovereign, uncensorable assets: crypto',
  4: 'Stocks, bonds, ETFs — conventional markets exposed to systemic and counterparty risk',
};

type TierStatus = 'green' | 'amber' | 'red' | 'unset';

// ─── Tier Presets ─────────────────────────────────────────────────────────────
const TIER_PRESETS: { id: string; label: string; targets: Record<number, number> }[] = [
  { id: 'very-defensive', label: 'Very Defensive', targets: { 0: 35, 1: 5,  2: 55, 3: 5,  4: 0  } },
  { id: 'defensive',      label: 'Defensive',      targets: { 0: 20, 1: 10, 2: 55, 3: 10, 4: 5  } },
  { id: 'neutral',        label: 'Neutral',        targets: { 0: 15, 1: 15, 2: 45, 3: 15, 4: 10 } },
  { id: 'relaxed',        label: 'Relaxed',        targets: { 0: 10, 1: 15, 2: 40, 3: 20, 4: 15 } },
  { id: 'very-relaxed',   label: 'Very Relaxed',   targets: { 0: 5,  1: 10, 2: 35, 3: 30, 4: 20 } },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────
function computeStatus(currentPct: number, minPct: number, maxPct: number): TierStatus {
  if (currentPct >= minPct && currentPct <= maxPct) return 'green';
  const distance = currentPct < minPct ? minPct - currentPct : currentPct - maxPct;
  return distance <= 5 ? 'amber' : 'red';
}

const STATUS_COLORS: Record<TierStatus, string> = {
  green: '#059669',
  amber: '#d97706',
  red: '#dc2626',
  unset: '#a9b4b9',
};

const STATUS_LABELS: Record<TierStatus, string> = {
  green: 'In Range',
  amber: 'Near Bound',
  red: 'Out of Range',
  unset: 'No Config',
};

function StatusBadge({ status }: { status: TierStatus }) {
  const color = STATUS_COLORS[status];
  return (
    <span
      style={{ color, borderColor: `${color}33`, backgroundColor: `${color}12` }}
      className="inline-flex items-center px-2.5 py-0.5 rounded text-[11px] font-medium border"
    >
      {STATUS_LABELS[status]}
    </span>
  );
}

// ─── Tier Pie Charts ─────────────────────────────────────────────────────────
const TIER_COLORS: Record<number, string> = {
  0: '#64748B',
  1: '#3B82F6',
  2: '#10B981',
  3: '#8B5CF6',
  4: '#F59E0B',
};
const UNASSIGNED_COLOR = '#CBD5E1';

function buildPaths(slices: { pct: number; color: string }[], cx: number, cy: number, R: number, r: number) {
  let angle = -Math.PI / 2;
  return slices
    .filter(s => s.pct > 0.1)
    .map(s => {
      const sweep = (s.pct / 100) * 2 * Math.PI;
      const end = angle + sweep;
      const large = sweep > Math.PI ? 1 : 0;
      const x1 = cx + R * Math.cos(angle),  y1 = cy + R * Math.sin(angle);
      const x2 = cx + R * Math.cos(end),    y2 = cy + R * Math.sin(end);
      const x3 = cx + r * Math.cos(end),    y3 = cy + r * Math.sin(end);
      const x4 = cx + r * Math.cos(angle),  y4 = cy + r * Math.sin(angle);
      const d = `M${x1} ${y1} A${R} ${R} 0 ${large} 1 ${x2} ${y2} L${x3} ${y3} A${r} ${r} 0 ${large} 0 ${x4} ${y4}Z`;
      angle = end;
      return { d, color: s.color };
    });
}

interface TierAllocationChartsProps {
  tierConfigs: TierConfig[];
  tierPcts: Record<number, number>;
  totalValue: number;
  unassignedPct: number;
  isGlobal: boolean;
}

function TierAllocationCharts({ tierConfigs, tierPcts, totalValue, unassignedPct, isGlobal }: TierAllocationChartsProps) {
  const sorted = isGlobal
    ? [0, 1, 2, 3, 4].map(tid => ({ tier_id: tid, tier_name: TIER_LABELS[tid], target_pct: '0' } as TierConfig))
    : [...tierConfigs].sort((a, b) => a.tier_id - b.tier_id);
  const cx = 50, cy = 50, R = 44, r = 27;

  const currentSlices = [
    ...sorted.map(tc => ({ pct: tierPcts[tc.tier_id] ?? 0, color: TIER_COLORS[tc.tier_id] ?? '#94A3B8' })),
    ...(unassignedPct > 0.1 ? [{ pct: unassignedPct, color: UNASSIGNED_COLOR }] : []),
  ];
  const modelSlices = sorted.map(tc => ({
    pct: parseFloat(tc.target_pct),
    color: TIER_COLORS[tc.tier_id] ?? '#94A3B8',
  }));

  const currentPaths = buildPaths(currentSlices, cx, cy, R, r);
  const modelPaths   = buildPaths(modelSlices,   cx, cy, R, r);
  const totalLabel   = totalValue >= 1000 ? `€${(totalValue / 1000).toFixed(0)}k` : `€${totalValue.toFixed(0)}`;

  return (
    <div className="glass-panel rounded-xl border border-outline-variant/20 p-5">
      <div className="flex items-center gap-8">
        {/* Donut — Current */}
        <div className="flex flex-col items-center gap-1 shrink-0">
          <p className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant/50">Current</p>
          <svg viewBox="0 0 100 100" width="92" height="92">
            {currentPaths.length === 0
              ? <circle cx={cx} cy={cy} r={R} fill="none" stroke="#E2E8F0" strokeWidth={R - r} />
              : currentPaths.map((p, i) => <path key={i} d={p.d} fill={p.color} />)}
            <text x={cx} y={cy + 4} textAnchor="middle" fontSize="10" fill="#1E293B" fontWeight="700">{totalLabel}</text>
          </svg>
        </div>

        {/* Donut — Model (hidden in global view) */}
        {!isGlobal && (
          <div className="flex flex-col items-center gap-1 shrink-0">
            <p className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant/50">Model</p>
            <svg viewBox="0 0 100 100" width="92" height="92">
              {modelPaths.length === 0
                ? <circle cx={cx} cy={cy} r={R} fill="none" stroke="#E2E8F0" strokeWidth={R - r} />
                : modelPaths.map((p, i) => <path key={i} d={p.d} fill={p.color} />)}
              <text x={cx} y={cy + 4} textAnchor="middle" fontSize="10" fill="#1E293B" fontWeight="700">{totalLabel}</text>
            </svg>
          </div>
        )}

        {/* Shared legend */}
        <div className="min-w-0 overflow-x-auto">
          <div
            className="grid gap-x-4 gap-y-2.5"
            style={{ gridTemplateColumns: isGlobal ? 'auto auto auto' : 'auto auto auto auto auto auto auto' }}
          >
            {/* Header row */}
            <span /> {/* spacer */}
            <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider text-right">Current %</span>
            <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider text-right">Current €</span>
            {!isGlobal && <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider text-right">Model %</span>}
            {!isGlobal && <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider text-right">Model €</span>}
            {!isGlobal && <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider text-right">Delta %</span>}
            {!isGlobal && <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider text-right">Delta €</span>}
            {sorted.map(tc => {
              const current = tierPcts[tc.tier_id] ?? 0;
              const target = parseFloat(tc.target_pct);
              const delta = current - target;
              const deltaColor = Math.abs(delta) < 0.5 ? 'text-on-surface-variant' : delta > 0 ? 'text-amber-500' : 'text-blue-500';
              const currentEur = totalValue * current / 100;
              const targetEur  = totalValue * target / 100;
              const deltaEur   = currentEur - targetEur;
              const fmtK = (v: number) => Math.abs(v) >= 1000
                ? `€${(v / 1000).toFixed(0)}k`
                : `€${v.toFixed(0)}`;
              const fmtKSigned = (v: number) => {
                const abs = Math.abs(v) >= 1000 ? `€${(Math.abs(v) / 1000).toFixed(0)}k` : `€${Math.abs(v).toFixed(0)}`;
                return (v > 0 ? '+' : v < 0 ? '-' : '') + abs;
              };
              return (
                <React.Fragment key={tc.tier_id}>
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ backgroundColor: TIER_COLORS[tc.tier_id] ?? '#94A3B8' }} />
                    <span className="text-[13px] font-medium text-on-surface truncate">T{tc.tier_id} {tc.tier_name}</span>
                  </div>
                  <span className="text-[13px] tabular-nums font-semibold text-on-surface text-right">{current.toFixed(1)}%</span>
                  <span className="text-[12px] tabular-nums text-on-surface-variant/60 text-right">{fmtK(currentEur)}</span>
                  {!isGlobal && <span className="text-[13px] tabular-nums font-medium text-on-surface-variant text-right">{target.toFixed(1)}%</span>}
                  {!isGlobal && <span className="text-[12px] tabular-nums text-on-surface-variant/50 text-right">{fmtK(targetEur)}</span>}
                  {!isGlobal && (
                    <span className={`text-[13px] tabular-nums font-medium text-right ${deltaColor}`}>
                      {delta > 0 ? '+' : ''}{delta.toFixed(1)}%
                    </span>
                  )}
                  {!isGlobal && (
                    <span className={`text-[12px] tabular-nums font-medium text-right ${deltaColor}`}>
                      {fmtKSigned(deltaEur)}
                    </span>
                  )}
                </React.Fragment>
              );
            })}
            {unassignedPct > 0.1 && (
              <React.Fragment>
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ backgroundColor: UNASSIGNED_COLOR }} />
                  <span className="text-[13px] font-medium text-on-surface-variant">Unassigned</span>
                </div>
                <span className="text-[13px] tabular-nums font-semibold text-on-surface text-right">{unassignedPct.toFixed(1)}%</span>
                <span className="text-[12px] tabular-nums text-on-surface-variant/60 text-right">
                  {totalValue * unassignedPct / 100 >= 1000
                    ? `€${(totalValue * unassignedPct / 10000).toFixed(0)}k`
                    : `€${(totalValue * unassignedPct / 100).toFixed(0)}`}
                </span>
                {!isGlobal && <span />}{!isGlobal && <span />}
                {!isGlobal && <span />}{!isGlobal && <span />}
              </React.Fragment>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Range Bar ────────────────────────────────────────────────────────────────
interface RangeBarProps {
  currentPct: number;
  targetPct: number;
  minPct: number;
  maxPct: number;
  status: TierStatus;
}

function RangeBar({ currentPct, targetPct, minPct, maxPct, status }: RangeBarProps) {
  // Display range: 0..100 but we clamp and show overflow positions
  const clamp = (v: number) => Math.min(100, Math.max(0, v));
  const currentPos = clamp(currentPct);
  const targetPos = clamp(targetPct);
  const minPos = clamp(minPct);
  const maxPos = clamp(maxPct);
  const statusColor = STATUS_COLORS[status];

  return (
    <div className="relative w-full h-6 flex items-center select-none" title={`${currentPct.toFixed(1)}% allocated`}>
      {/* Track */}
      <div className="absolute inset-0 rounded overflow-hidden flex items-center">
        <div className="relative w-full h-2 bg-surface-highest/60 rounded">
          {/* Below-min zone */}
          <div
            className="absolute top-0 left-0 h-full bg-outline-variant/20 rounded-l"
            style={{ width: `${minPos}%` }}
          />
          {/* In-range zone */}
          <div
            className="absolute top-0 h-full"
            style={{
              left: `${minPos}%`,
              width: `${maxPos - minPos}%`,
              backgroundColor: `${STATUS_COLORS.green}30`,
              borderTop: `1px solid ${STATUS_COLORS.green}40`,
              borderBottom: `1px solid ${STATUS_COLORS.green}40`,
            }}
          />
          {/* Above-max zone — rest of bar is dim, handled by base */}

          {/* Target tick */}
          <div
            className="absolute top-[-3px] bottom-[-3px] w-[2px] rounded-full opacity-80"
            style={{ left: `calc(${targetPos}% - 1px)`, backgroundColor: '#545f73' }}
            title={`Target: ${targetPct.toFixed(1)}%`}
          />

          {/* Min/max boundary lines */}
          <div
            className="absolute top-[-2px] bottom-[-2px] w-px opacity-40"
            style={{ left: `${minPos}%`, backgroundColor: STATUS_COLORS.green }}
          />
          <div
            className="absolute top-[-2px] bottom-[-2px] w-px opacity-40"
            style={{ left: `${maxPos}%`, backgroundColor: STATUS_COLORS.green }}
          />

          {/* Current allocation dot */}
          <div
            className="absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full border-2 border-surface-base shadow-md z-10 transition-all duration-300"
            style={{
              left: `calc(${currentPos}% - 6px)`,
              backgroundColor: statusColor,
              borderColor: statusColor,
            }}
          />
        </div>
      </div>

      {/* Labels */}
      <span className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-[calc(100%+8px)] text-[11px] tabular-nums text-on-surface-variant/60 hidden lg:block whitespace-nowrap">
        {currentPct.toFixed(1)}%
      </span>
    </div>
  );
}
// ─── Tier Bar Chart ──────────────────────────────────────────────────────────
interface TierRadarChartProps {
  tierConfigs: TierConfig[];
  tierPcts: Record<number, number>;
  statuses: Record<number, TierStatus>;
  tierAllocations: Record<number, number>;
  totalValue: number;
}

function fmtEur(v: number): string {
  return v >= 1000
    ? `€ ${(v / 1000).toFixed(0)}k`
    : `€ ${v.toFixed(0)}`;
}

function TierGroupedBarChart({ tierConfigs, tierPcts, statuses, tierAllocations, totalValue }: TierRadarChartProps) {
  const sorted = [...tierConfigs].sort((a, b) => a.tier_id - b.tier_id);

  return (
    <div className="glass-panel rounded-xl border border-outline-variant/20 p-5">
      <p className="text-[11px] text-on-surface-variant/60 uppercase tracking-wider mb-4">Allocation vs Target</p>
      <div className="space-y-5">
        {sorted.map(tc => {
          const current = tierPcts[tc.tier_id] ?? 0;
          const target = parseFloat(tc.target_pct);
          const status = statuses[tc.tier_id] ?? 'unset';
          const statusColor = STATUS_COLORS[status];

          let action: string;
          let actionColor: string;
          if (current > target + 0.5) {
            action = 'Afbouwen';
            actionColor = '#dc2626';
          } else if (current < target - 0.5) {
            action = 'Bijkopen';
            actionColor = '#63b3ed';
          } else {
            action = 'On target';
            actionColor = '#059669';
          }

          const amount = tierAllocations[tc.tier_id] ?? 0;
          const targetAmount = totalValue * (target / 100);

          return (
            <div key={tc.tier_id} className="space-y-2">
              {/* Tier header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: statusColor }} />
                  <span className="text-[11px] font-bold text-on-surface/80">T{tc.tier_id}</span>
                  <span className="text-[11px] text-on-surface-variant/50">{tc.tier_name}</span>
                  <span className="text-[11px] tabular-nums text-on-surface-variant/35">·</span>
                  <span className="text-[11px] tabular-nums text-on-surface-variant/50">{fmtEur(amount)}</span>
                </div>
                <span
                  className="text-[10px] font-medium px-2 py-0.5 rounded"
                  style={{ color: actionColor, backgroundColor: `${actionColor}18`, border: `1px solid ${actionColor}33` }}
                >
                  {action}
                </span>
              </div>
              {/* Bars */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-on-surface-variant/40 w-11 shrink-0 text-right">Current</span>
                  <div className="flex-1 h-5 bg-surface-highest/40 rounded overflow-hidden">
                    <div
                      className="h-full rounded transition-all duration-500"
                      style={{ width: `${Math.min(100, current)}%`, backgroundColor: statusColor }}
                    />
                  </div>
                  <div className="w-32 text-right shrink-0">
                    <span className="text-[11px] tabular-nums font-medium text-on-surface/80">{current.toFixed(1)}%</span>
                    <span className="text-[10px] tabular-nums text-on-surface-variant/40 ml-1.5">{fmtEur(amount)}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-on-surface-variant/40 w-11 shrink-0 text-right">Doel</span>
                  <div className="flex-1 h-3 bg-surface-highest/40 rounded overflow-hidden">
                    <div
                      className="h-full rounded transition-all duration-500"
                      style={{ width: `${Math.min(100, target)}%`, backgroundColor: 'rgba(169,180,185,0.45)' }}
                    />
                  </div>
                  <div className="w-32 text-right shrink-0">
                    <span className="text-[10px] tabular-nums text-on-surface-variant/55">{target.toFixed(1)}%</span>
                    <span className="text-[10px] tabular-nums text-on-surface-variant/35 ml-1.5">{fmtEur(targetAmount)}</span>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
// ─── Tier Row ─────────────────────────────────────────────────────────────────
interface TierRowProps {
  config: TierConfig;
  allConfigs: TierConfig[];
  currentPct: number;
  currentValue: number;
  totalValue: number;
  tierAssets: Asset[];
  isGlobal: boolean;
  entityScope: 'personal' | 'business';
  onUpdate: (updated: TierConfig) => void;
  onTierChange: (assetId: number, newTier: number | null) => void;
}

function TierRow({ config, allConfigs, currentPct, currentValue, totalValue, tierAssets, isGlobal, entityScope, onUpdate, onTierChange }: TierRowProps) {
  const [draft, setDraft] = useState({
    target_pct: config.target_pct,
    min_pct: config.min_pct,
    max_pct: config.max_pct,
  });
  const [saving, setSaving] = useState(false);
  const [expanded, setExpanded] = useState(false);

  // Sync draft if config changes externally (e.g., on refresh)
  useEffect(() => {
    setDraft({ target_pct: config.target_pct, min_pct: config.min_pct, max_pct: config.max_pct });
  }, [config.target_pct, config.min_pct, config.max_pct]);

  async function handleBlur(field: keyof typeof draft) {
    const value = draft[field];
    const parsed = parseFloat(value);
    if (isNaN(parsed) || parsed === parseFloat(config[field])) return; // no change
    setSaving(true);
    try {
      const updated = await api.tierConfig.update(config.tier_id, entityScope, {
        target_pct: draft.target_pct,
        min_pct: draft.min_pct,
        max_pct: draft.max_pct,
      });
      onUpdate(updated);
    } catch {
      // revert
      setDraft({ target_pct: config.target_pct, min_pct: config.min_pct, max_pct: config.max_pct });
    } finally {
      setSaving(false);
    }
  }

  const status: TierStatus = isGlobal
    ? 'unset'
    : computeStatus(currentPct, parseFloat(config.min_pct), parseFloat(config.max_pct));

  const pctInputClass = `w-16 bg-surface-high/60 border border-outline-variant/30 rounded px-2 py-1 text-sm text-on-surface tabular-nums text-right focus:outline-none focus:border-primary/40 ${saving ? 'opacity-50' : ''}`;

  return (
    <div className="glass-panel rounded-xl border border-outline-variant/20 p-5 space-y-3">
      {/* Header row */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span
              className="inline-flex items-center justify-center w-5 h-5 rounded text-[10px] font-bold text-on-surface"
              style={{ backgroundColor: 'rgba(169,180,185,0.25)' }}
            >
              T{config.tier_id}
            </span>
            <h3 className="font-medium text-on-surface">{TIER_LABELS[config.tier_id]}</h3>
          </div>
          <p className="text-[11px] text-on-surface-variant/40 mt-0.5">{TIER_DESCRIPTIONS[config.tier_id]}</p>
        </div>
        {!isGlobal && <StatusBadge status={status} />}
      </div>

      {/* Range bar — hidden in global view */}
      {!isGlobal && (
        <div className="pr-14">
          <RangeBar
            currentPct={currentPct}
            targetPct={parseFloat(config.target_pct)}
            minPct={parseFloat(config.min_pct)}
            maxPct={parseFloat(config.max_pct)}
            status={status}
          />
        </div>
      )}

      {/* Stats + config row */}
      <div className="flex items-center gap-6 flex-wrap">
        {/* Current allocation */}
        <div className="text-right">
          <div className="text-[11px] text-on-surface-variant/40 uppercase tracking-wider">Current</div>
          <div className="text-xl font-light tabular-nums" style={{ color: isGlobal ? undefined : STATUS_COLORS[status] }}>
            {currentPct.toFixed(1)}<span className="text-sm text-on-surface-variant/50">%</span>
          </div>
          <div className="text-[11px] tabular-nums text-on-surface-variant/40 mt-0.5">{fmtEur(currentValue)}</div>
        </div>

        {/* Target stat + editable inputs — hidden in global view */}
        {!isGlobal && (
          <>
            <div className="h-8 w-px bg-outline-variant/20" />

            {/* Target allocation */}
            <div className="text-right">
              <div className="text-[11px] text-on-surface-variant/40 uppercase tracking-wider">Target</div>
              <div className="text-xl font-light tabular-nums text-on-surface-variant/50">
                {parseFloat(config.target_pct).toFixed(1)}<span className="text-sm text-on-surface-variant/30">%</span>
              </div>
              <div className="text-[11px] tabular-nums text-on-surface-variant/30 mt-0.5">{fmtEur(totalValue * parseFloat(config.target_pct) / 100)}</div>
            </div>

            <div className="h-8 w-px bg-outline-variant/20" />

            {/* Editable config bounds */}
            <div className="flex items-center gap-4">
              {([
                { field: 'target_pct', label: 'Target' },
                { field: 'min_pct', label: 'Min' },
                { field: 'max_pct', label: 'Max' },
              ] as const).map(({ field, label }) => {
                const pct = parseFloat(draft[field]) || 0;
                return (
                  <div key={field}>
                    <label className="block text-[11px] text-on-surface-variant/40 uppercase tracking-wider mb-1">{label}</label>
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        min="0"
                        max="100"
                        step="0.1"
                        className={pctInputClass}
                        value={draft[field]}
                        onChange={e => setDraft(d => ({ ...d, [field]: e.target.value }))}
                        onBlur={() => handleBlur(field)}
                      />
                      <span className="text-xs text-on-surface-variant/40">%</span>
                    </div>
                    <div className="text-[10px] tabular-nums text-on-surface-variant/30 mt-0.5 text-right pr-5">
                      {fmtEur(totalValue * pct / 100)}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Legend */}
            <div className="ml-auto text-[10px] text-on-surface-variant/30 space-y-0.5 text-right hidden md:block">
              <div className="flex items-center gap-1.5 justify-end">
                <span className="w-2 h-0.5 bg-primary inline-block" />
                <span>target</span>
              </div>
              <div className="flex items-center gap-1.5 justify-end">
                <span className="w-2 h-0.5 bg-secondary/40 inline-block" />
                <span>in-range</span>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Expandable asset list */}
      {tierAssets.length > 0 && (
        <div className="border-t border-outline-variant/15">
          <button
            onClick={() => setExpanded(e => !e)}
            className="w-full flex items-center justify-between px-1 py-2 text-[11px] text-on-surface-variant/40 hover:text-on-surface-variant/70 transition-colors"
          >
            <span>{tierAssets.length} asset{tierAssets.length !== 1 ? 's' : ''} in this tier</span>
            <ChevronDown className={`w-3.5 h-3.5 transition-transform ${expanded ? 'rotate-180' : ''}`} />
          </button>
          {expanded && (
            <div className="space-y-0.5 pb-2">
              {tierAssets.map(a => (
                <div key={a.id} className="flex items-center gap-2 px-1 py-1.5">
                  <div className="flex-1 min-w-0">
                    <span className="text-xs text-on-surface truncate block">{a.name}</span>
                    {a.location_name && <span className="text-[10px] text-on-surface-variant truncate block">{a.location_name}</span>}
                  </div>
                  {a.total_quantity && parseFloat(a.total_quantity) > 0 && (
                    <span className="text-xs tabular-nums text-on-surface-variant shrink-0 text-right">
                      {parseFloat(a.total_quantity) % 1 === 0
                        ? parseFloat(a.total_quantity).toFixed(0)
                        : parseFloat(a.total_quantity).toFixed(2)}
                      {a.weight_unit ? ` ${a.weight_unit}` : 'x'}
                    </span>
                  )}
                  {a.total_quantity && parseFloat(a.total_quantity) > 0 && (
                    <span className="text-[10px] tabular-nums text-on-surface-variant shrink-0 text-right">
                      @ {'€'}{(parseFloat(a.current_value) / parseFloat(a.total_quantity)).toLocaleString('nl-NL', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                    </span>
                  )}
                  <span className="text-xs tabular-nums font-medium text-on-surface shrink-0 text-right w-20">
                    {'€'}{parseFloat(a.current_value).toLocaleString('nl-NL', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                  </span>
                  <select
                    value={a.tier != null ? String(a.tier) : ''}
                    onChange={e => onTierChange(a.id, e.target.value !== '' ? Number(e.target.value) : null)}
                    className="text-[11px] bg-surface-high/60 border border-outline-variant/25 rounded px-1.5 py-0.5 text-on-surface-variant/60 focus:outline-none focus:border-primary/40 cursor-pointer shrink-0"
                  >
                    <option value="">— Unassigned —</option>
                    {allConfigs.map(tc => (
                      <option key={tc.tier_id} value={String(tc.tier_id)}>T{tc.tier_id} — {tc.tier_name}</option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Unassigned Panel ─────────────────────────────────────────────────────────
interface UnassignedPanelProps {
  assets: Asset[];
  allConfigs: TierConfig[];
  onTierChange: (assetId: number, newTier: number | null) => void;
}

function UnassignedPanel({ assets, allConfigs, onTierChange }: UnassignedPanelProps) {
  const [expanded, setExpanded] = useState(false);
  if (assets.length === 0) return null;

  return (
    <div className="rounded-xl border border-dashed border-outline-variant/25 p-4">
      <button
        onClick={() => setExpanded(e => !e)}
        className="w-full flex items-center justify-between text-left"
      >
        <div className="flex items-center gap-2.5">
          <span className="inline-flex items-center justify-center w-5 h-5 rounded text-[10px] font-bold text-on-surface-variant/35 border border-dashed border-outline-variant/30">
            ?
          </span>
          <span className="text-sm font-medium text-on-surface-variant/60">Unassigned</span>
          <span className="text-[11px] text-on-surface-variant/35">
            {assets.length} asset{assets.length !== 1 ? 's' : ''} without a tier
          </span>
        </div>
        <ChevronDown className={`w-3.5 h-3.5 text-on-surface-variant/35 transition-transform ${expanded ? 'rotate-180' : ''}`} />
      </button>
      {expanded && (
        <div className="mt-3 space-y-0.5 border-t border-outline-variant/15 pt-3">
          {assets.map(a => (
            <div key={a.id} className="flex items-center gap-2 px-1 py-1.5">
              <div className="flex-1 min-w-0">
                <span className="text-xs text-on-surface truncate block">{a.name}</span>
                {a.location_name && <span className="text-[10px] text-on-surface-variant truncate block">{a.location_name}</span>}
              </div>
              {a.total_quantity && parseFloat(a.total_quantity) > 0 && (
                <span className="text-xs tabular-nums text-on-surface-variant shrink-0 text-right">
                  {parseFloat(a.total_quantity) % 1 === 0
                    ? parseFloat(a.total_quantity).toFixed(0)
                    : parseFloat(a.total_quantity).toFixed(2)}
                  {a.weight_unit ? ` ${a.weight_unit}` : 'x'}
                </span>
              )}
              {a.total_quantity && parseFloat(a.total_quantity) > 0 && (
                <span className="text-[10px] tabular-nums text-on-surface-variant shrink-0 text-right">
                  @ {'€'}{(parseFloat(a.current_value) / parseFloat(a.total_quantity)).toLocaleString('nl-NL', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                </span>
              )}
              <span className="text-xs tabular-nums font-medium text-on-surface shrink-0 text-right w-20">
                {'€'}{parseFloat(a.current_value).toLocaleString('nl-NL', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
              </span>
              <select
                value=""
                onChange={e => { if (e.target.value !== '') onTierChange(a.id, Number(e.target.value)); }}
                className="text-[11px] bg-surface-high/60 border border-outline-variant/25 rounded px-1.5 py-0.5 text-on-surface-variant/60 focus:outline-none focus:border-primary/40 cursor-pointer shrink-0"
              >
                <option value="">— Assign tier —</option>
                {allConfigs.map(tc => (
                  <option key={tc.tier_id} value={String(tc.tier_id)}>T{tc.tier_id} — {tc.tier_name}</option>
                ))}
              </select>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
interface Props {
  entityFilter: EntityFilter;
}

export default function TierPage({ entityFilter }: Props) {
  const [tierConfigs, setTierConfigs] = useState<TierConfig[]>([]);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const isGlobal = entityFilter === 'global';
  const entityScope = entityFilter === 'personal' ? 'personal' : 'business';

  useEffect(() => {
    setLoading(true);
    const fetches: [Promise<TierConfig[]>, Promise<Asset[]>] = [
      isGlobal ? Promise.resolve([]) : api.tierConfig.list(entityScope),
      api.assets.list(),
    ];
    Promise.all(fetches)
      .then(([tc, a]) => { setTierConfigs(tc); setAssets(a); })
      .catch(err => setError(String(err)))
      .finally(() => setLoading(false));
  }, [entityFilter]);

  // Filter assets by entity if needed
  const filteredAssets = useMemo(() => {
    if (entityFilter === 'global') return assets;
    return assets.filter(a => a.entity_type === entityFilter);
  }, [assets, entityFilter]);

  // Compute allocation per tier (denominator = ALL filtered assets)
  const totalValue = useMemo(
    () => filteredAssets.reduce((s, a) => s + parseFloat(a.current_value), 0),
    [filteredAssets],
  );

  const tierAllocations = useMemo(() => {
    const map: Record<number, number> = {};
    for (let i = 0; i <= 3; i++) map[i] = 0;
    filteredAssets.forEach(a => {
      if (a.tier != null) {  // tier=0 is valid — do NOT use !a.tier
        map[a.tier] = (map[a.tier] ?? 0) + parseFloat(a.current_value);
      }
    });
    return map;
  }, [filteredAssets]);

  const tierPcts = useMemo(() => {
    const result: Record<number, number> = {};
    for (let i = 0; i <= 3; i++) {
      result[i] = totalValue > 0 ? ((tierAllocations[i] ?? 0) / totalValue) * 100 : 0;
    }
    return result;
  }, [tierAllocations, totalValue]);

  // Unassigned pct
  const assignedValue = useMemo(
    () => Object.values(tierAllocations).reduce((s, v) => s + v, 0),
    [tierAllocations],
  );
  const unassignedPct = totalValue > 0 ? ((totalValue - assignedValue) / totalValue) * 100 : 0;

  // Sum-not-100% warning
  const targetSum = useMemo(
    () => tierConfigs.reduce((s, tc) => s + parseFloat(tc.target_pct), 0),
    [tierConfigs],
  );
  const targetSumOff = Math.abs(targetSum - 100) > 0.5;

  const unassignedAssets = useMemo(
    () => filteredAssets.filter(a => a.tier == null),
    [filteredAssets],
  );

  const tierStatuses = useMemo(() => {
    const result: Record<number, TierStatus> = {};
    for (let i = 0; i <= 3; i++) {
      const cfg = tierConfigs.find(t => t.tier_id === i);
      result[i] = cfg
        ? computeStatus(tierPcts[i] ?? 0, parseFloat(cfg.min_pct), parseFloat(cfg.max_pct))
        : 'unset';
    }
    return result;
  }, [tierPcts, tierConfigs]);

  async function handleTierChange(assetId: number, newTier: number | null) {
    const original = assets.find(a => a.id === assetId);
    if (!original) return;
    const prevTier = original.tier;
    setAssets(prev => prev.map(a => a.id === assetId ? { ...a, tier: newTier } : a));
    try {
      await api.assets.update(assetId, { tier: newTier });
    } catch {
      setAssets(prev => prev.map(a => a.id === assetId ? { ...a, tier: prevTier } : a));
    }
  }

  const [applyingPreset, setApplyingPreset] = useState<string | null>(null);
  // Track selected preset independently per entity scope
  const [selectedPresets, setSelectedPresets] = useState<Record<string, string | null>>({});
  const selectedPresetId = selectedPresets[entityScope] ?? null;

  async function handleApplyPreset(preset: typeof TIER_PRESETS[number]) {
    if (isGlobal) return;
    setApplyingPreset(preset.id);
    try {
      const updates = await Promise.all(
        Object.entries(preset.targets).map(([tid, target]) => {
          const min = parseFloat((Math.max(0, target * 0.9)).toFixed(1));
          const max = parseFloat((Math.min(100, target * 1.1)).toFixed(1));
          return api.tierConfig.update(Number(tid), entityScope, {
            target_pct: String(target),
            min_pct: String(min),
            max_pct: String(max),
          });
        }),
      );
      setTierConfigs(prev =>
        prev.map(c => {
          const updated = updates.find(u => u.tier_id === c.tier_id);
          return updated ?? c;
        }),
      );
      setSelectedPresets(prev => ({ ...prev, [entityScope]: preset.id }));
    } finally {
      setApplyingPreset(null);
    }
  }

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center h-64">
        <div className="text-on-surface-variant/50 text-sm tracking-wide">Loading tier data…</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8">
        <div className="glass-panel rounded-xl p-6 border border-error/20 text-error text-sm">{error}</div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="font-headline italic text-3xl text-on-surface">Sovereign Tiers</h1>
          <p className="text-on-surface-variant/60 text-sm mt-1">
            Portfolio allocated across 4 sovereignty layers ·{' '}
            <span className="text-primary capitalize">{entityFilter}</span>
          </p>
        </div>
        {unassignedPct > 0 && (
          <div className="text-right">
            <div className="text-[11px] text-on-surface-variant/40 uppercase tracking-wider">Unassigned</div>
            <div className="text-lg font-light tabular-nums text-on-surface-variant/50">
              {unassignedPct.toFixed(1)}<span className="text-sm">%</span>
            </div>
          </div>
        )}
      </div>

      {/* Target sum warning — only when editing personal/business */}
      {!isGlobal && targetSumOff && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl border border-amber-500/30 bg-amber-500/8 text-amber-400 text-sm">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>
            Tier targets sum to <strong className="tabular-nums">{targetSum.toFixed(1)}%</strong>{' '}
            (expected 100%). Adjust min/max/target values to correct the allocation plan.
          </span>
        </div>
      )}

      {/* Allocation presets — hidden in global view */}
      {!isGlobal && (
        <div className="glass-panel rounded-xl border border-outline-variant/20 p-4">
          <p className="text-[10px] text-on-surface-variant/40 uppercase tracking-wider mb-3">Model Allocatie</p>
          <div className="flex flex-wrap gap-2">
            {TIER_PRESETS.map(preset => {
              const isSelected = selectedPresetId === preset.id;
              const isApplying = applyingPreset === preset.id;
              return (
                <button
                  key={preset.id}
                  onClick={() => handleApplyPreset(preset)}
                  disabled={applyingPreset !== null}
                  className="px-3.5 py-1.5 rounded-lg border text-xs font-medium transition-all disabled:opacity-40"
                  style={isSelected
                    ? { borderColor: 'var(--color-primary)', color: 'var(--color-primary)', backgroundColor: 'rgba(var(--color-primary),.12)', fontWeight: 700 }
                    : { borderColor: 'rgba(169,180,185,0.30)', color: isApplying ? 'var(--color-primary)' : 'var(--color-on-surface-variant)', backgroundColor: isApplying ? 'rgba(var(--color-primary),.08)' : 'rgba(169,180,185,0.08)' }
                  }
                >
                  {isApplying ? '…' : preset.label}
                </button>
              );
            })}
          </div>
          <p className="text-[10px] text-on-surface-variant/30 mt-2">
            Sets target per tier; min/max = target ± 10% relative. Deselects when you edit manually.
          </p>
        </div>
      )}

      {/* Pie charts — Current vs Model */}
      <TierAllocationCharts
        tierConfigs={tierConfigs}
        tierPcts={tierPcts}
        totalValue={totalValue}
        unassignedPct={unassignedPct}
        isGlobal={isGlobal}
      />

      {/* Tier rows */}
      <div className="space-y-3">
        {(isGlobal
          ? [0, 1, 2, 3, 4].map(tid => ({
              tier_id: tid,
              entity_scope: 'global',
              tier_name: TIER_LABELS[tid],
              target_pct: '0',
              min_pct: '0',
              max_pct: '100',
              description: TIER_DESCRIPTIONS[tid] ?? null,
            } as TierConfig))
          : [...tierConfigs].sort((a, b) => a.tier_id - b.tier_id)
        ).map(tc => (
          <TierRow
            key={tc.tier_id}
            config={tc}
            allConfigs={tierConfigs}
            currentPct={tierPcts[tc.tier_id] ?? 0}
            currentValue={tierAllocations[tc.tier_id] ?? 0}
            totalValue={totalValue}
            tierAssets={filteredAssets.filter(a => a.tier === tc.tier_id)}
            isGlobal={isGlobal}
            entityScope={entityScope}
            onUpdate={updated => {
              setTierConfigs(prev => prev.map(c => c.tier_id === updated.tier_id ? updated : c));
              setSelectedPresets(prev => ({ ...prev, [entityScope]: null }));
            }}
            onTierChange={handleTierChange}
          />
        ))}
      </div>

      {/* Unassigned assets */}
      <UnassignedPanel assets={unassignedAssets} allConfigs={tierConfigs} onTierChange={handleTierChange} />
    </div>
  );
}
