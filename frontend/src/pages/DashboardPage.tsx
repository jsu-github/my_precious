import { useState, useEffect, useMemo } from 'react';
import { Shield, Layers, Plus, ArrowUpRight, ArrowDownRight, TrendingUp, RotateCcw } from 'lucide-react';
import { api } from '../api';
import type { Asset, AssetClass, AssetLocation, Entity, TierConfig, DashboardHistory, RecentMovement } from '../types';
import type { EntityFilter } from '../layouts/AppShell';
import type { View } from '../components/Sidebar';
import AssetModal from '../components/modals/AssetModal';

// ─── Asset class metadata ─────────────────────────────────────────────────────
const ASSET_CLASS_COLORS: Record<AssetClass, string> = {
  precious_metals: '#a16207',
  real_estate:     '#475569',
  equities:        '#047857',
  crypto:          '#6d28d9',
  private_equity:  '#c2410c',
  fixed_income:    '#1d4ed8',
  cash:            '#15803d',
  exotics:         '#be185d',
};

const ASSET_CLASS_LABELS: Record<AssetClass, string> = {
  precious_metals: 'Precious Metals',
  real_estate:     'Real Estate',
  equities:        'Equities',
  crypto:          'Crypto',
  private_equity:  'Private Equity',
  fixed_income:    'Fixed Income',
  cash:            'Cash',
  exotics:         'Exotics',
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
function formatBucketLabel(isoDate: string, period: '1M' | '6M' | '1Y' | '5Y' | 'ALL'): string {
  const d = new Date(isoDate);
  if (period === '1M' || period === '6M') {
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }).toUpperCase();
  }
  return d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' }).toUpperCase();
}

function formatCurrency(value: number): string {
  if (value >= 1_000_000) return '€' + (value / 1_000_000).toFixed(2) + 'M';
  if (value >= 1_000)     return '€' + (value / 1_000).toFixed(1) + 'K';
  return new Intl.NumberFormat('nl-NL', { style: 'currency', currency: 'EUR', minimumFractionDigits: 0 }).format(value);
}

function formatHero(value: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'EUR', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(value).replace('€', '€');
}

function auditFreshness(lastAudit: string | null | undefined) {
  if (!lastAudit) return { label: 'No record', color: 'text-on-surface-variant/30', dot: 'bg-slate-300' };
  const days = Math.floor((Date.now() - new Date(lastAudit).getTime()) / 86_400_000);
  if (days <= 30)  return { label: 'Recent',  color: 'text-emerald-600', dot: 'bg-emerald-500' };
  if (days <= 90)  return { label: 'Stale',   color: 'text-amber-600',   dot: 'bg-amber-500'  };
  return                  { label: 'Overdue', color: 'text-red-600',     dot: 'bg-red-500'    };
}

function formatDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

// ─── Sub-components ───────────────────────────────────────────────────────────
function KpiCard({ label, value, sub, subColor }: { label: string; value: string; sub: string; subColor?: string }) {
  return (
    <div className="glass-panel p-6">
      <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mb-3">{label}</p>
      <p className="text-2xl font-extrabold font-headline text-on-surface tabular-nums leading-none">{value}</p>
      <p className={`text-xs font-semibold mt-2 ${subColor ?? 'text-on-surface-variant/60'}`}>{sub}</p>
    </div>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────
interface Props {
  entityFilter: EntityFilter;
  onNavigate?: (view: View) => void;
}

export default function DashboardPage({ entityFilter, onNavigate }: Props) {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [locations, setLocations] = useState<AssetLocation[]>([]);
  const [entities, setEntities] = useState<Entity[]>([]);
  const [tierConfigs, setTierConfigs] = useState<TierConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAddAsset, setShowAddAsset] = useState(false);
  const [trajectoryPeriod, setTrajectoryPeriod] = useState<'1M'|'6M'|'1Y'|'5Y'|'ALL'>('1Y');
  const [history, setHistory] = useState<DashboardHistory | null>(null);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyKey, setHistoryKey] = useState(0);
  const [recalculating, setRecalculating] = useState(false);
  const [recentMovements, setRecentMovements] = useState<RecentMovement[]>([]);
  const [movementsLoading, setMovementsLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const tierScope = entityFilter === 'business' ? 'business' : 'personal';
    Promise.all([api.assets.list(), api.locations.list(), api.entities.list(), api.tierConfig.list(tierScope)])
      .then(([a, l, e, tc]) => { setAssets(a); setLocations(l); setEntities(e); setTierConfigs(tc); })
      .catch(err => setError(String(err)))
      .finally(() => setLoading(false));
  }, [entityFilter]);

  useEffect(() => {
    setMovementsLoading(true);
    const entityType = entityFilter !== 'global' ? entityFilter : undefined;
    api.dashboard.recentActivity(5, entityType)
      .then(setRecentMovements)
      .catch(() => setRecentMovements([]))
      .finally(() => setMovementsLoading(false));
  }, [entityFilter]);

  useEffect(() => {
    setHistoryLoading(true);
    const entityType = entityFilter !== 'global' ? entityFilter : undefined;
    api.dashboard.history(trajectoryPeriod, entityType)
      .then(setHistory)
      .catch(() => setHistory(null))
      .finally(() => setHistoryLoading(false));
  }, [trajectoryPeriod, entityFilter, historyKey]);

  async function handleRecalculate() {
    setRecalculating(true);
    try {
      await api.dashboard.recalculate();
      setHistoryKey(k => k + 1);
    } finally {
      setRecalculating(false);
    }
  }

  const filteredAssets = useMemo(() => {
    if (entityFilter === 'global') return assets;
    return assets.filter(a => a.entity_type === entityFilter);
  }, [assets, entityFilter]);

  const totalValue = useMemo(
    () => filteredAssets.reduce((sum, a) => sum + parseFloat(a.current_value), 0),
    [filteredAssets],
  );

  const liquidValue = useMemo(
    () => filteredAssets.filter(a => a.asset_class === 'cash').reduce((sum, a) => sum + parseFloat(a.current_value), 0),
    [filteredAssets],
  );

  const tierHealth = useMemo(() => {
    if (tierConfigs.length === 0) return null;
    const tierMap: Record<number, number> = {};
    filteredAssets.forEach(a => {
      if (a.tier != null) tierMap[a.tier] = (tierMap[a.tier] ?? 0) + parseFloat(a.current_value);
    });
    const tiers = tierConfigs.sort((a, b) => a.tier_id - b.tier_id).map(tc => {
      const tierValue = tierMap[tc.tier_id] ?? 0;
      const currentPct = totalValue > 0 ? (tierValue / totalValue) * 100 : 0;
      const min = parseFloat(tc.min_pct);
      const max = parseFloat(tc.max_pct);
      let status: 'green' | 'amber' | 'red';
      if (currentPct >= min && currentPct <= max) { status = 'green'; }
      else { const d = currentPct < min ? min - currentPct : currentPct - max; status = d <= 5 ? 'amber' : 'red'; }
      return { tier_id: tc.tier_id, name: tc.tier_name, status };
    });
    return { tiers, in_range: tiers.filter(t => t.status === 'green').length };
  }, [filteredAssets, tierConfigs, totalValue]);

  const riskLabel = tierHealth
    ? tierHealth.in_range === 4 ? 'Low' : tierHealth.in_range >= 2 ? 'Low / Med' : 'Medium'
    : '—';

  const byAssetClass = useMemo(() => {
    const map = new Map<AssetClass, number>();
    filteredAssets.forEach(a => map.set(a.asset_class, (map.get(a.asset_class) ?? 0) + parseFloat(a.current_value)));
    return Array.from(map.entries())
      .map(([cls, val]) => ({ asset_class: cls, value: val, pct: totalValue > 0 ? (val / totalValue) * 100 : 0 }))
      .sort((a, b) => b.value - a.value);
  }, [filteredAssets, totalValue]);

  const locationStats = useMemo(() => {
    return locations.map(loc => {
      const locAssets = filteredAssets.filter(a => a.location_id === loc.id);
      const locValue = locAssets.reduce((sum, a) => sum + parseFloat(a.current_value), 0);
      const audits = locAssets.map(a => a.last_audit_date).filter(Boolean).sort();
      return { ...loc, asset_count: locAssets.length, total_value: locValue, last_audit: audits[audits.length - 1] };
    }).filter(l => l.asset_count > 0);
  }, [locations, filteredAssets]);

  const pmByMetal = useMemo(() => {
    const map = new Map<string, { count: number; value: number }>();
    filteredAssets.filter(a => a.asset_class === 'precious_metals').forEach(a => {
      const metal = a.sub_class ?? 'other';
      const e = map.get(metal) ?? { count: 0, value: 0 };
      map.set(metal, { count: e.count + 1, value: e.value + parseFloat(a.current_value) });
    });
    return Array.from(map.entries()).map(([metal, s]) => ({ metal, ...s })).sort((a, b) => b.value - a.value);
  }, [filteredAssets]);

  const lastUpdated = useMemo(() => {
    const dates = assets.map(a => a.updated_at).sort();
    return dates[dates.length - 1] ?? null;
  }, [assets]);

  const trajectoryBars = useMemo(() => {
    if (!history || history.points.length === 0) return [];
    const values = history.points.map(p => parseFloat(p.value));
    const max = Math.max(...values);
    return history.points.map((p, i) => {
      const val = parseFloat(p.value);
      const isFirst = i === 0;
      const isLast = i === history.points.length - 1;
      // MoM change vs previous bar
      const prevVal = i > 0 ? parseFloat(history.points[i - 1].value) : null;
      const momPct = prevVal != null && prevVal > 0
        ? ((val - prevVal) / prevVal) * 100
        : null;
      // YoY: find same month 1 year earlier in the series
      const bucketDate = new Date(p.bucket);
      const yearAgoDate = new Date(bucketDate);
      yearAgoDate.setFullYear(yearAgoDate.getFullYear() - 1);
      const yearAgoPoint = history.points.find(q => {
        const d = new Date(q.bucket);
        return d.getFullYear() === yearAgoDate.getFullYear() && d.getMonth() === yearAgoDate.getMonth();
      });
      const yoyPct = yearAgoPoint
        ? ((val - parseFloat(yearAgoPoint.value)) / parseFloat(yearAgoPoint.value)) * 100
        : null;
      return {
        h: max > 0 ? Math.max(4, Math.round((val / max) * 88)) : 4,
        label: formatBucketLabel(p.bucket, trajectoryPeriod),
        isLast, isFirst,
        value: val,
        momPct,
        yoyPct,
      };
    });
  }, [history, trajectoryPeriod]);

  const [hoveredBar, setHoveredBar] = useState<number | null>(null);

  // ─── Render ────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center h-64">
        <div className="text-on-surface-variant/50 text-sm tracking-wide">Loading portfolio…</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8">
        <div className="glass-panel p-6 border border-red-200 text-red-600 text-sm">{error}</div>
      </div>
    );
  }

  return (
    <>
    <div className="p-8 space-y-6 max-w-[1400px] mx-auto">

      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <div className="flex items-end justify-between gap-6">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant/60 mb-2">
            Global Net Worth
          </p>
          <p className="font-headline font-extrabold tabular-nums leading-none text-on-surface" style={{ fontSize: 'clamp(2.8rem, 5vw, 3.5rem)' }}>
            {formatHero(totalValue)}
          </p>
          <div className="flex items-center gap-3 mt-2">
            <span className="text-xs text-on-surface-variant/50">
              {filteredAssets.length} assets
            </span>
            {lastUpdated && (
              <span className="text-xs text-on-surface-variant/40">· Updated {formatDate(lastUpdated)}</span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          {/* Personal/Business tabs show entity state */}
          <div className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-primary/10 text-primary capitalize">
            {entityFilter} view
          </div>
          <button
            onClick={() => setShowAddAsset(true)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold text-white transition-opacity hover:opacity-90"
            style={{ background: 'linear-gradient(135deg, #545f73 0%, #485367 100%)' }}
          >
            <Plus className="w-3.5 h-3.5" />
            Add Asset
          </button>
        </div>
      </div>

      {/* ── KPI Strip ─────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          label="Liquid Assets"
          value={formatCurrency(liquidValue)}
          sub={totalValue > 0 ? `${((liquidValue / totalValue) * 100).toFixed(1)}% of portfolio` : '—'}
          subColor="text-emerald-600 font-semibold"
        />
        <KpiCard
          label="Annual Growth"
          value={history?.growth_1y_pct != null
            ? `${history.growth_1y_pct >= 0 ? '+' : ''}${history.growth_1y_pct.toFixed(2)}%`
            : '—'}
          sub="YoY"
          subColor={history?.growth_1y_pct != null
            ? (history.growth_1y_pct >= 0 ? 'text-emerald-600 font-semibold' : 'text-red-500 font-semibold')
            : 'text-on-surface-variant/50'}
        />
        <KpiCard label="Debt-to-Asset" value="4.2%" sub="HEALTHY" subColor="text-primary/70 font-bold" />
        <KpiCard
          label="Risk Score"
          value={riskLabel}
          sub={tierHealth ? `${tierHealth.in_range} of ${tierHealth.tiers.length} tiers in range` : 'No tier data'}
          subColor={tierHealth?.in_range === tierHealth?.tiers.length ? 'text-emerald-600' : 'text-amber-600'}
        />
      </div>

      {/* ── Trajectory + Strategic Movements ─────────────────────────────── */}
      <div className="grid grid-cols-12 gap-6">

        {/* Net Worth Trajectory — 8 cols */}
        <div className="col-span-12 lg:col-span-8 glass-panel p-6">
          <div className="flex items-center justify-between mb-5">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant/50 mb-0.5">Net Worth Trajectory</p>
              <h2 className="text-lg font-bold font-headline text-on-surface">Portfolio Growth Over Time</h2>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleRecalculate}
                disabled={recalculating}
                title="Rebuild history from all transactions"
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-on-surface-variant/60 hover:text-on-surface hover:bg-slate-100 transition-all disabled:opacity-40"
              >
                <RotateCcw className={`w-3 h-3 ${recalculating ? 'animate-spin' : ''}`} />
                {recalculating ? 'Rebuilding…' : 'Recalculate'}
              </button>
              <div className="flex items-center gap-1 bg-slate-100 rounded-lg p-0.5">
                {(['1M','6M','1Y','5Y','ALL'] as const).map(p => (
                  <button key={p} onClick={() => setTrajectoryPeriod(p)}
                    className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-all ${
                      trajectoryPeriod === p ? 'bg-white text-on-surface shadow-sm' : 'text-on-surface-variant/60 hover:text-on-surface'
                    }`}>
                    {p}
                  </button>
                ))}
              </div>
            </div>
          </div>
          {/* Bar chart */}
          <div className="space-y-1">
            {/* Bars with hover tooltip */}
            <div className="relative flex items-end gap-2 h-44 px-1">
              {historyLoading ? (
                <div className="w-full self-center text-center text-on-surface-variant/25 text-xs">Loading…</div>
              ) : trajectoryBars.length === 0 ? (
                <div className="w-full self-center text-center text-on-surface-variant/25 text-xs px-4">
                  No history yet — update an asset value to start building history
                </div>
              ) : (
                trajectoryBars.map(({ h, isLast, isFirst, value, momPct, yoyPct, label }, i) => {
                  const isHovered = hoveredBar === i;
                  return (
                    <div
                      key={i}
                      className="flex-1 h-full flex flex-col justify-end relative group"
                      onMouseEnter={() => setHoveredBar(i)}
                      onMouseLeave={() => setHoveredBar(null)}
                    >
                      {/* Tooltip */}
                      {isHovered && (
                        <div
                          className="absolute z-10 bottom-[calc(100%+6px)] left-1/2 -translate-x-1/2 pointer-events-none"
                          style={{ minWidth: '88px' }}
                        >
                          <div className="bg-[#1e2635] rounded-lg px-3 py-2 shadow-xl text-center">
                            <div className="text-white text-[11px] font-bold tabular-nums leading-tight">
                              {formatCurrency(value)}
                            </div>
                            {momPct !== null && (
                              <div className={`text-[10px] font-semibold tabular-nums mt-0.5 ${
                                momPct >= 0 ? 'text-emerald-400' : 'text-red-400'
                              }`}>
                                {momPct >= 0 ? '▲' : '▼'} {Math.abs(momPct).toFixed(1)}% MoM
                              </div>
                            )}
                            {yoyPct !== null && (
                              <div className={`text-[10px] font-semibold tabular-nums ${
                                momPct !== null ? 'mt-0.5 pt-0.5 border-t border-white/10' : 'mt-0.5'
                              } ${
                                yoyPct >= 0 ? 'text-sky-400' : 'text-orange-400'
                              }`}>
                                {yoyPct >= 0 ? '▲' : '▼'} {Math.abs(yoyPct).toFixed(1)}% YoY
                              </div>
                            )}
                            <div className="text-white/40 text-[8.5px] font-medium uppercase tracking-wide mt-1">{label}</div>
                          </div>
                          {/* Arrow */}
                          <div className="flex justify-center">
                            <div className="w-2 h-2 bg-[#1e2635] rotate-45 -mt-1" />
                          </div>
                        </div>
                      )}

                      {/* Bar */}
                      <div
                        className="w-full rounded-t-[3px] transition-all duration-150"
                        style={{
                          height: `${h}%`,
                          minHeight: '4px',
                          background: isHovered
                            ? 'linear-gradient(to top, #2e3d52 0%, #4a6080 100%)'
                            : isLast
                            ? 'linear-gradient(to top, #3d4c5f 0%, #506070 100%)'
                            : 'linear-gradient(to top, rgba(96,111,128,0.11) 0%, rgba(69,83,100,0.38) 100%)',
                        }}
                      />

                      {/* Static first/last value label above bar */}
                      {(isFirst || isLast) && !isHovered && (
                        <div className="absolute bottom-[calc(100%+4px)] left-1/2 -translate-x-1/2 whitespace-nowrap pointer-events-none">
                          <span className={`text-[8px] font-bold tabular-nums ${
                            isLast ? 'text-on-surface/70' : 'text-on-surface-variant/45'
                          }`}>
                            {formatCurrency(value)}
                          </span>
                          {isLast && yoyPct !== null && (
                            <span className={`ml-1 text-[8px] font-bold tabular-nums ${
                              yoyPct >= 0 ? 'text-emerald-600' : 'text-red-500'
                            }`}>
                              {yoyPct >= 0 ? '▲' : '▼'}{Math.abs(yoyPct).toFixed(1)}%
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>

            {/* Month labels */}
            {trajectoryBars.length > 0 && !historyLoading && (
              <div className="flex gap-2 px-1 pt-0.5">
                {trajectoryBars.map(({ label, isLast }, i) => (
                  <div key={i} className="flex-1 text-center">
                    <span className={`text-[8px] font-medium uppercase tracking-wide ${
                      isLast ? 'text-on-surface/60' : 'text-on-surface-variant/35'
                    }`}>{label}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Strategic Movements — 4 cols */}
        <div className="col-span-12 lg:col-span-4 glass-panel p-6">
          <div className="flex items-center justify-between mb-5">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant/50 mb-0.5">Recent Activity</p>
              <h2 className="text-lg font-bold font-headline text-on-surface">Strategic Movements</h2>
            </div>
            <span
              className="text-[10px] font-bold text-primary uppercase tracking-wide cursor-pointer hover:text-primary/70 transition-colors"
              onClick={() => onNavigate?.('ledger')}
            >View All</span>
          </div>
          <div className="space-y-4">
            {movementsLoading ? (
              [0, 1, 2].map(i => (
                <div key={i} className="flex items-start gap-3 animate-pulse">
                  <div className="w-7 h-7 rounded-full bg-slate-200 shrink-0 mt-0.5" />
                  <div className="flex-1 space-y-1.5">
                    <div className="h-3 bg-slate-200 rounded w-3/4" />
                    <div className="h-2.5 bg-slate-100 rounded w-1/2" />
                  </div>
                </div>
              ))
            ) : recentMovements.length === 0 ? (
              <p className="text-[11px] text-on-surface-variant/40 text-center py-4">No transactions recorded yet</p>
            ) : (
              recentMovements.map(m => (
                <div key={m.id} className="flex items-start gap-3">
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${m.is_gain ? 'bg-emerald-50' : 'bg-red-50'}`}>
                    {m.is_gain
                      ? <ArrowUpRight className="w-3.5 h-3.5 text-emerald-600" />
                      : <ArrowDownRight className="w-3.5 h-3.5 text-red-500" />
                    }
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-xs font-semibold text-on-surface leading-tight">{m.asset_name}</p>
                      <span className={`text-xs font-bold shrink-0 tabular-nums ${m.is_gain ? 'text-emerald-600' : 'text-red-500'}`}>
                        €{Number(m.cost_basis).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                      </span>
                    </div>
                    <p className="text-[10px] text-on-surface-variant/50 mt-0.5">{m.entity_name}</p>
                    <p className="text-[9px] text-on-surface-variant/35 font-medium mt-1 uppercase tracking-wide">
                      {new Date(m.purchase_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).toUpperCase()}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* ── Asset Allocation + Private Equity CTA ─────────────────────────── */}
      <div className="grid grid-cols-12 gap-6">

        {/* Asset Allocation — 8 cols */}
        <div className="col-span-12 lg:col-span-8 glass-panel p-6">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-primary/60" />
              <h2 className="text-lg font-bold font-headline text-on-surface">Asset Allocation</h2>
            </div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant/40">
              {entityFilter === 'global' ? 'All Entities' : entityFilter === 'business' ? 'Business' : 'Personal'}
            </p>
          </div>
          {byAssetClass.length === 0 ? (
            <p className="text-on-surface-variant/40 text-sm">No assets in this view.</p>
          ) : (
            <div className="space-y-3">
              {byAssetClass.map(({ asset_class, value, pct }) => (
                <div key={asset_class} className="group">
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2.5">
                      <span className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ background: ASSET_CLASS_COLORS[asset_class] }} />
                      <span className="text-sm text-on-surface-variant group-hover:text-on-surface transition-colors">
                        {ASSET_CLASS_LABELS[asset_class]}
                      </span>
                    </div>
                    <div className="flex items-center gap-6 tabular-nums">
                      <span className="text-xs text-on-surface-variant/50 w-10 text-right">{pct.toFixed(0)}%</span>
                      <span className="text-sm font-semibold text-on-surface w-24 text-right">{formatCurrency(value)}</span>
                    </div>
                  </div>
                  <div className="h-1 rounded-full bg-slate-100 overflow-hidden">
                    <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, background: ASSET_CLASS_COLORS[asset_class], opacity: 0.8 }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Private Equity CTA — 4 cols */}
        <div className="col-span-12 lg:col-span-4 rounded-xl p-6 flex flex-col justify-between text-white"
          style={{ background: 'linear-gradient(145deg, #545f73 0%, #3d4859 50%, #2e3a4a 100%)' }}>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-white/50 mb-3">Featured Opportunity</p>
            <h3 className="text-lg font-bold font-headline leading-snug mb-2">Private Equity Opportunity</h3>
            <p className="text-sm text-white/70 leading-relaxed">
              Exclusive Series B round for FinTech Group available for early entry.
            </p>
          </div>
          <div className="mt-6">
            <button className="w-full py-2.5 px-4 rounded-lg bg-white/15 border border-white/25 text-sm font-semibold text-white hover:bg-white/25 transition-colors">
              Review Offering
            </button>
          </div>
        </div>
      </div>

      {/* ── PM Metal Strip ─────────────────────────────────────────────────── */}
      {pmByMetal.length > 0 && (
        <div className="flex items-center gap-3 overflow-x-auto pb-1">
          <span className="text-[10px] text-on-surface-variant/40 uppercase tracking-wider shrink-0 font-bold">Precious Metals</span>
          {pmByMetal.map(({ metal, count, value }) => (
            <div key={metal} className="glass-panel rounded-lg border border-outline-variant/20 px-4 py-2.5 flex items-center gap-3 shrink-0">
              <span className="text-[10px] font-bold text-on-surface-variant/50 uppercase tracking-wider capitalize">{metal}</span>
              <span className="text-sm font-semibold text-on-surface tabular-nums">{formatCurrency(value)}</span>
              <span className="text-[11px] text-on-surface-variant/35">{count} asset{count !== 1 ? 's' : ''}</span>
            </div>
          ))}
        </div>
      )}

      {/* ── Footer: 3 info cards + Tier Health ────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">

        {/* Tax Efficiency */}
        <div className="glass-panel p-5 flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center">
              <TrendingUp className="w-3.5 h-3.5 text-primary" />
            </div>
            <span className="text-xs font-bold text-on-surface">Tax Efficiency</span>
          </div>
          <p className="text-[11px] text-on-surface-variant/60 leading-relaxed">
            Your effective tax rate is 18.2%. Leveraging QOZ investments could reduce this to 14.5% by year end.
          </p>
          <button className="text-[10px] font-bold text-primary uppercase tracking-wide text-left hover:text-primary/70 transition-colors">
            Run Scenarios →
          </button>
        </div>

        {/* Asset Protection */}
        <div className="glass-panel p-5 flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-emerald-50 flex items-center justify-center">
              <Shield className="w-3.5 h-3.5 text-emerald-600" />
            </div>
            <span className="text-xs font-bold text-on-surface">Asset Protection</span>
          </div>
          <p className="text-[11px] text-on-surface-variant/60 leading-relaxed">
            {locationStats.length > 0
              ? `${locationStats.length} vault${locationStats.length !== 1 ? 's' : ''} across ${new Set(locationStats.map(l => l.country_code)).size} jurisdictions. ${locationStats.filter(l => auditFreshness(l.last_audit).label === 'Overdue').length > 0 ? 'Audit attention required.' : 'All audits current.'}`
              : '95% of assets are held in diversified jurisdictions.'
            }
          </p>
          <button className="text-[10px] font-bold text-primary uppercase tracking-wide text-left hover:text-primary/70 transition-colors">
            View Compliance →
          </button>
        </div>

        {/* Wealth Transfer */}
        <div className="glass-panel p-5 flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-tertiary/10 flex items-center justify-center">
              <ArrowUpRight className="w-3.5 h-3.5 text-tertiary" />
            </div>
            <span className="text-xs font-bold text-on-surface">Wealth Transfer</span>
          </div>
          <p className="text-[11px] text-on-surface-variant/60 leading-relaxed">
            Your trust structures are 100% funded. Tax schedules advise a half-yearly planning review with advisors on portfolio entry.
          </p>
          <button className="text-[10px] font-bold text-primary uppercase tracking-wide text-left hover:text-primary/70 transition-colors">
            Estate Dashboard →
          </button>
        </div>

        {/* Tier Health */}
        {tierHealth && (
          <button
            onClick={() => onNavigate?.('tier')}
            className="glass-panel p-5 flex flex-col gap-3 text-left hover:border-primary/20 transition-colors group"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Layers className="w-3.5 h-3.5 text-primary" />
                </div>
                <span className="text-xs font-bold text-on-surface">Tier Health</span>
              </div>
              <span
                className="text-lg font-extrabold font-headline tabular-nums"
                style={{ color: tierHealth.in_range === tierHealth.tiers.length ? '#059669' : tierHealth.in_range >= 2 ? '#d97706' : '#dc2626' }}
              >
                {tierHealth.in_range}/{tierHealth.tiers.length}
              </span>
            </div>
            <div className="flex items-center gap-2">
              {tierHealth.tiers.map(t => {
                const c = t.status === 'green' ? '#059669' : t.status === 'amber' ? '#d97706' : '#dc2626';
                return (
                  <div key={t.tier_id} className="flex-1 flex flex-col items-center gap-1">
                    <div className="w-full h-1.5 rounded-full" style={{ backgroundColor: c + '33' }}>
                      <div className="h-full rounded-full" style={{ backgroundColor: c, width: t.status === 'green' ? '100%' : '40%' }} />
                    </div>
                    <span className="text-[8px] text-on-surface-variant/40 uppercase">T{t.tier_id}</span>
                  </div>
                );
              })}
            </div>
            <p className="text-[10px] text-on-surface-variant/40 group-hover:text-on-surface-variant/60 transition-colors">
              {tierHealth.in_range} of {tierHealth.tiers.length} tiers in range · Click for details →
            </p>
          </button>
        )}
      </div>

    </div>

    {showAddAsset && (
      <AssetModal
        entities={entities}
        locations={locations}
        tierConfigs={tierConfigs}
        onClose={() => setShowAddAsset(false)}
        onSaved={asset => { setAssets(prev => [...prev, asset]); setShowAddAsset(false); }}
      />
    )}
    </>
  );
}
