import { useState, useEffect, useMemo } from 'react';
import { AlertTriangle } from 'lucide-react';
import { api } from '../api';
import type { Asset, TierConfig } from '../types';
import type { EntityFilter } from '../layouts/AppShell';

// ─── Constants ────────────────────────────────────────────────────────────────
const TIER_LABELS: Record<number, string> = {
  0: 'Grid-Down Baseline',
  1: 'Digital Liquidity',
  2: 'The Vaults',
  3: 'Uncensorable Frontier',
};

const TIER_DESCRIPTIONS: Record<number, string> = {
  0: 'Physical cash and hard assets accessible in a grid-down scenario',
  1: 'Highly liquid digital and near-cash positions',
  2: 'Long-term store of value: gold, silver, real estate',
  3: 'Self-sovereign, uncensorable assets: crypto',
};

type TierStatus = 'green' | 'amber' | 'red' | 'unset';

// ─── Helpers ──────────────────────────────────────────────────────────────────
function computeStatus(currentPct: number, minPct: number, maxPct: number): TierStatus {
  if (currentPct >= minPct && currentPct <= maxPct) return 'green';
  const distance = currentPct < minPct ? minPct - currentPct : currentPct - maxPct;
  return distance <= 5 ? 'amber' : 'red';
}

const STATUS_COLORS: Record<TierStatus, string> = {
  green: '#4edea3',
  amber: '#f59e0b',
  red: '#ffb4ab',
  unset: '#45464d',
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
            style={{ left: `calc(${targetPos}% - 1px)`, backgroundColor: '#e9c349' }}
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

// ─── Tier Row ─────────────────────────────────────────────────────────────────
interface TierRowProps {
  config: TierConfig;
  currentPct: number;
  onUpdate: (updated: TierConfig) => void;
}

function TierRow({ config, currentPct, onUpdate }: TierRowProps) {
  const [draft, setDraft] = useState({
    target_pct: config.target_pct,
    min_pct: config.min_pct,
    max_pct: config.max_pct,
  });
  const [saving, setSaving] = useState(false);

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
      const updated = await api.tierConfig.update(config.tier_id, {
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

  const status: TierStatus = computeStatus(
    currentPct,
    parseFloat(config.min_pct),
    parseFloat(config.max_pct),
  );

  const pctInputClass = `w-16 bg-surface-high/60 border border-outline-variant/30 rounded px-2 py-1 text-sm text-on-surface tabular-nums text-right focus:outline-none focus:border-primary/40 ${saving ? 'opacity-50' : ''}`;

  return (
    <div className="glass-panel rounded-xl border border-outline-variant/20 p-5 space-y-3">
      {/* Header row */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span
              className="inline-flex items-center justify-center w-5 h-5 rounded text-[10px] font-bold text-on-surface"
              style={{ backgroundColor: '#45464d60' }}
            >
              T{config.tier_id}
            </span>
            <h3 className="font-medium text-on-surface">{TIER_LABELS[config.tier_id]}</h3>
          </div>
          <p className="text-[11px] text-on-surface-variant/40 mt-0.5">{TIER_DESCRIPTIONS[config.tier_id]}</p>
        </div>
        <StatusBadge status={status} />
      </div>

      {/* Range bar (with breathing room for label) */}
      <div className="pr-14">
        <RangeBar
          currentPct={currentPct}
          targetPct={parseFloat(config.target_pct)}
          minPct={parseFloat(config.min_pct)}
          maxPct={parseFloat(config.max_pct)}
          status={status}
        />
      </div>

      {/* Stats + config row */}
      <div className="flex items-center gap-6 flex-wrap">
        {/* Current allocation */}
        <div className="text-right">
          <div className="text-[11px] text-on-surface-variant/40 uppercase tracking-wider">Current</div>
          <div className="text-xl font-light tabular-nums" style={{ color: STATUS_COLORS[status] }}>
            {currentPct.toFixed(1)}<span className="text-sm text-on-surface-variant/50">%</span>
          </div>
        </div>

        <div className="h-8 w-px bg-outline-variant/20" />

        {/* Editable config */}
        <div className="flex items-center gap-4">
          <div>
            <label className="block text-[11px] text-on-surface-variant/40 uppercase tracking-wider mb-1">Target</label>
            <div className="flex items-center gap-1">
              <input
                type="number"
                min="0"
                max="100"
                step="0.1"
                className={pctInputClass}
                value={draft.target_pct}
                onChange={e => setDraft(d => ({ ...d, target_pct: e.target.value }))}
                onBlur={() => handleBlur('target_pct')}
              />
              <span className="text-xs text-on-surface-variant/40">%</span>
            </div>
          </div>
          <div>
            <label className="block text-[11px] text-on-surface-variant/40 uppercase tracking-wider mb-1">Min</label>
            <div className="flex items-center gap-1">
              <input
                type="number"
                min="0"
                max="100"
                step="0.1"
                className={pctInputClass}
                value={draft.min_pct}
                onChange={e => setDraft(d => ({ ...d, min_pct: e.target.value }))}
                onBlur={() => handleBlur('min_pct')}
              />
              <span className="text-xs text-on-surface-variant/40">%</span>
            </div>
          </div>
          <div>
            <label className="block text-[11px] text-on-surface-variant/40 uppercase tracking-wider mb-1">Max</label>
            <div className="flex items-center gap-1">
              <input
                type="number"
                min="0"
                max="100"
                step="0.1"
                className={pctInputClass}
                value={draft.max_pct}
                onChange={e => setDraft(d => ({ ...d, max_pct: e.target.value }))}
                onBlur={() => handleBlur('max_pct')}
              />
              <span className="text-xs text-on-surface-variant/40">%</span>
            </div>
          </div>
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
      </div>
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

  useEffect(() => {
    setLoading(true);
    Promise.all([api.tierConfig.list(), api.assets.list()])
      .then(([tc, a]) => { setTierConfigs(tc); setAssets(a); })
      .catch(err => setError(String(err)))
      .finally(() => setLoading(false));
  }, []);

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

      {/* Target sum warning */}
      {targetSumOff && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl border border-amber-500/30 bg-amber-500/8 text-amber-400 text-sm">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>
            Tier targets sum to <strong className="tabular-nums">{targetSum.toFixed(1)}%</strong>{' '}
            (expected 100%). Adjust min/max/target values to correct the allocation plan.
          </span>
        </div>
      )}

      {/* Tier rows */}
      <div className="space-y-3">
        {tierConfigs
          .sort((a, b) => a.tier_id - b.tier_id)
          .map(tc => (
            <TierRow
              key={tc.tier_id}
              config={tc}
              currentPct={tierPcts[tc.tier_id] ?? 0}
              onUpdate={updated =>
                setTierConfigs(prev => prev.map(c => c.tier_id === updated.tier_id ? updated : c))
              }
            />
          ))}
      </div>
    </div>
  );
}
