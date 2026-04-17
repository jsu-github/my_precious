import { useState, useEffect, useMemo } from 'react';
import { TrendingUp, TrendingDown, Lock, ArrowUpRight, RotateCcw } from 'lucide-react';
import { api } from '../api';
import type { LedgerRow, AssetClass } from '../types';
import type { EntityFilter } from '../layouts/AppShell';

// ─── Market ticker data ────────────────────────────────────────────────────────
const MARKET_TICKERS = [
  { symbol: 'XAU/USD', label: 'Gold',      price: 3_208.50,  change: +0.82 },
  { symbol: 'XAG/USD', label: 'Silver',    price:    33.15,  change: +0.31 },
  { symbol: 'BTC/USD', label: 'Bitcoin',   price: 82_400.00, change: +1.47 },
  { symbol: 'SPX',     label: 'S&P 500',   price: 5_640.00,  change: +0.21 },
  { symbol: 'DXY',     label: 'USD Index', price:   101.82,  change: -0.14 },
  { symbol: 'XPT/USD', label: 'Platinum',  price: 1_012.40,  change: +0.55 },
];

const LOCKED_CLASSES: AssetClass[] = ['private_equity'];

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

// ─── Helpers ──────────────────────────────────────────────────────────────────
function fmtCurrency(value: number, compact = false): string {
  if (compact && Math.abs(value) >= 1_000_000) return (value < 0 ? '-€' : '€') + (Math.abs(value) / 1_000_000).toFixed(2) + 'M';
  if (compact && Math.abs(value) >= 1_000)     return (value < 0 ? '-€' : '€') + (Math.abs(value) / 1_000).toFixed(1) + 'K';
  return new Intl.NumberFormat('nl-NL', { style: 'currency', currency: 'EUR', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(value);
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function fmtPct(n: number, sign = true): string {
  return (sign && n >= 0 ? '+' : '') + n.toFixed(1) + '%';
}

function buildAnalyticsRows(rows: LedgerRow[], benchmarkPct: number) {
  const assetCostBasisSum = new Map<number, number>();
  rows.forEach(r => {
    assetCostBasisSum.set(r.asset_id, (assetCostBasisSum.get(r.asset_id) ?? 0) + parseFloat(r.cost_basis));
  });
  return rows.map(r => {
    const cb = parseFloat(r.cost_basis);
    const assetTotal = assetCostBasisSum.get(r.asset_id) ?? cb;
    const assetCv = parseFloat(r.asset_current_value);
    const proportion = assetTotal > 0 ? cb / assetTotal : 0;
    const currentValue = proportion * assetCv;
    const pl = currentValue - cb;
    const roiPct = cb > 0 ? (pl / cb) * 100 : 0;
    const alpha = roiPct - benchmarkPct;
    const isLocked = LOCKED_CLASSES.includes(r.asset_class);
    return { ...r, currentValue, pl, roiPct, alpha, isLocked };
  });
}

// ─── Market Ticker strip ──────────────────────────────────────────────────────
function MarketTicker() {
  return (
    <div className="flex items-center gap-px overflow-x-auto border-b border-slate-100 bg-white/60 backdrop-blur-sm px-6 shrink-0">
      {MARKET_TICKERS.map(t => (
        <div key={t.symbol} className="flex items-center gap-3 px-5 py-2.5 shrink-0 border-r border-slate-100 last:border-0">
          <span className="text-[10px] text-on-surface-variant/50 font-bold tracking-widest uppercase">{t.label}</span>
          <span className="text-xs text-on-surface tabular-nums font-semibold">
            {t.price >= 10_000
              ? fmtCurrency(t.price).replace('€', '')
              : t.price.toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </span>
          <div className={`flex items-center gap-0.5 text-xs tabular-nums font-semibold ${t.change >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
            {t.change >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
            {fmtPct(t.change)}
          </div>
        </div>
      ))}
      <div className="ml-auto pl-5 pr-2 shrink-0">
        <span className="text-[10px] text-on-surface-variant/25 italic">Manual spot prices · Apr 2026</span>
      </div>
    </div>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────
interface Props {
  entityFilter: EntityFilter;
}

export default function AnalyticsPage({ entityFilter }: Props) {
  const [rows, setRows] = useState<LedgerRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [benchmarkPct, setBenchmarkPct] = useState(12.5);
  const [portfolioHistory, setPortfolioHistory] = useState<{ label: string; h: number; isLast: boolean; isFirst: boolean; value: number; momPct: number | null; yoyPct: number | null }[]>([]);
  const [historyKey, setHistoryKey] = useState(0);
  const [recalculating, setRecalculating] = useState(false);
  const [hoveredBar, setHoveredBar] = useState<number | null>(null);

  useEffect(() => {
    setLoading(true);
    api.ledger.list()
      .then(setRows)
      .catch(err => setError(String(err)))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const entityType = entityFilter !== 'global' ? entityFilter : undefined;
    api.dashboard.history('1Y', entityType)
      .then(hist => {
        if (hist.points.length === 0) { setPortfolioHistory([]); return; }
        const values = hist.points.map(p => parseFloat(p.value));
        const max = Math.max(...values);
        setPortfolioHistory(hist.points.map((p, i) => {
          const val = parseFloat(p.value);
          const isFirst = i === 0;
          const isLast = i === hist.points.length - 1;
          const prevVal = i > 0 ? parseFloat(hist.points[i - 1].value) : null;
          const momPct = prevVal != null && prevVal > 0 ? ((val - prevVal) / prevVal) * 100 : null;
          const bucketDate = new Date(p.bucket);
          const yearAgoDate = new Date(bucketDate);
          yearAgoDate.setFullYear(yearAgoDate.getFullYear() - 1);
          const yearAgoPoint = hist.points.find(q => {
            const d = new Date(q.bucket);
            return d.getFullYear() === yearAgoDate.getFullYear() && d.getMonth() === yearAgoDate.getMonth();
          });
          const yoyPct = yearAgoPoint
            ? ((val - parseFloat(yearAgoPoint.value)) / parseFloat(yearAgoPoint.value)) * 100
            : null;
          return {
            label: bucketDate.toLocaleDateString('en-US', { month: 'short', year: '2-digit' }).toUpperCase(),
            h: max > 0 ? Math.max(4, Math.round((val / max) * 88)) : 4,
            isLast, isFirst, value: val, momPct, yoyPct,
          };
        }));
      })
      .catch(() => setPortfolioHistory([]));
  }, [entityFilter, historyKey]);

  async function handleRecalculate() {
    setRecalculating(true);
    try {
      await api.dashboard.recalculate();
      setHistoryKey(k => k + 1);
    } finally {
      setRecalculating(false);
    }
  }

  const filteredRows = useMemo(() => {
    if (entityFilter === 'global') return rows;
    return rows.filter(r => r.entity_type === entityFilter);
  }, [rows, entityFilter]);

  const analyticsRows = useMemo(() => buildAnalyticsRows(filteredRows, benchmarkPct), [filteredRows, benchmarkPct]);

  const totals = useMemo(() => {
    const cb = analyticsRows.reduce((s, r) => s + parseFloat(r.cost_basis), 0);
    const cv = analyticsRows.reduce((s, r) => s + r.currentValue, 0);
    const pl = cv - cb;
    const roi = cb > 0 ? (pl / cb) * 100 : 0;
    const alpha = roi - benchmarkPct;
    return { cb, cv, pl, roi, alpha };
  }, [analyticsRows, benchmarkPct]);

  // Composition bar by asset class
  const composition = useMemo(() => {
    const map = new Map<AssetClass, number>();
    analyticsRows.forEach(r => map.set(r.asset_class, (map.get(r.asset_class) ?? 0) + r.currentValue));
    return Array.from(map.entries())
      .map(([cls, val]) => ({ cls, val, pct: totals.cv > 0 ? (val / totals.cv) * 100 : 0 }))
      .sort((a, b) => b.val - a.val);
  }, [analyticsRows, totals.cv]);

  // ROI by asset class
  const byClass = useMemo(() => {
    const map = new Map<AssetClass, { cb: number; cv: number }>();
    analyticsRows.forEach(r => {
      const e = map.get(r.asset_class) ?? { cb: 0, cv: 0 };
      map.set(r.asset_class, { cb: e.cb + parseFloat(r.cost_basis), cv: e.cv + r.currentValue });
    });
    return Array.from(map.entries())
      .map(([cls, { cb, cv }]) => ({ cls, cb, cv, pl: cv - cb, roi: cb > 0 ? ((cv - cb) / cb) * 100 : 0 }))
      .sort((a, b) => b.cv - a.cv);
  }, [analyticsRows]);

  if (loading) {
    return (
      <div className="flex flex-col h-full">
        <MarketTicker />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-on-surface-variant/50 text-sm">Loading analytics…</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col h-full">
        <MarketTicker />
        <div className="p-8">
          <div className="glass-panel p-6 border border-red-200 text-red-600 text-sm">{error}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-full">
      <MarketTicker />

      <div className="p-8 space-y-6 max-w-[1400px] mx-auto w-full">

        {/* ── Hero ─────────────────────────────────────────────────────── */}
        <div className="flex items-end justify-between gap-6">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant/60 mb-2">
              Performance Analytics
            </p>
            <p className="font-headline font-extrabold tabular-nums leading-none text-on-surface" style={{ fontSize: 'clamp(2.6rem, 4vw, 3.2rem)' }}>
              {fmtCurrency(totals.cv, true)}
            </p>
            <div className="flex items-center gap-3 mt-2">
              <div className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${totals.roi >= 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-600'}`}>
                <ArrowUpRight className="w-3 h-3" />
                {fmtPct(totals.roi)} portfolio ROI
              </div>
              <span className="text-xs text-on-surface-variant/40 capitalize">{entityFilter} · {analyticsRows.length} batches</span>
            </div>
          </div>
          {/* Benchmark control */}
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-[11px] text-on-surface-variant/50 uppercase tracking-widest font-bold">Benchmark</span>
            <input
              type="number" step="0.1"
              className="w-16 bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5 text-xs text-on-surface tabular-nums text-right focus:outline-none focus:border-primary/40 focus:ring-2 focus:ring-primary/10"
              value={benchmarkPct}
              onChange={e => setBenchmarkPct(parseFloat(e.target.value) || 0)}
            />
            <span className="text-[11px] text-on-surface-variant/40">%</span>
          </div>
        </div>

        {/* ── Composition bar ───────────────────────────────────────────── */}
        {composition.length > 0 && (
          <div className="space-y-2">
            <div className="flex rounded-full overflow-hidden h-2 w-full">
              {composition.map(({ cls, pct }) => (
                <div key={cls} className="transition-all" style={{ width: `${pct}%`, background: ASSET_CLASS_COLORS[cls] }} title={`${ASSET_CLASS_LABELS[cls]} ${pct.toFixed(1)}%`} />
              ))}
            </div>
            <div className="flex flex-wrap gap-x-4 gap-y-1.5">
              {composition.map(({ cls, pct }) => (
                <div key={cls} className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-sm" style={{ background: ASSET_CLASS_COLORS[cls] }} />
                  <span className="text-[10px] text-on-surface-variant/60 font-medium">{ASSET_CLASS_LABELS[cls]}</span>
                  <span className="text-[10px] text-on-surface-variant/40 tabular-nums">{pct.toFixed(0)}%</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Equity Chart + Alpha Analysis ─────────────────────────────── */}
        <div className="grid grid-cols-12 gap-6">

          {/* Portfolio Performance chart — 8 cols */}
          <div className="col-span-12 lg:col-span-8 glass-panel p-6">
            <div className="flex items-start justify-between mb-5">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant/50 mb-0.5">Historical Performance</p>
                <h2 className="text-lg font-bold font-headline text-on-surface">Portfolio Performance</h2>
              </div>
              <button
                onClick={handleRecalculate}
                disabled={recalculating}
                title="Rebuild history from all transactions"
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-on-surface-variant/60 hover:text-on-surface hover:bg-slate-100 transition-all disabled:opacity-40"
              >
                <RotateCcw className={`w-3 h-3 ${recalculating ? 'animate-spin' : ''}`} />
                {recalculating ? 'Rebuilding…' : 'Recalculate'}
              </button>
            </div>
            <div className="space-y-1">
              {/* Bars with hover tooltip */}
              <div className="relative flex items-end gap-3 h-44">
                {portfolioHistory.length === 0 ? (
                  <div className="w-full self-center text-center text-on-surface-variant/25 text-sm">No history yet</div>
                ) : (
                  portfolioHistory.map(({ h, isLast, isFirst, value, momPct, yoyPct, label }, i) => {
                    const isHovered = hoveredBar === i;
                    return (
                      <div
                        key={i}
                        className="flex-1 h-full flex flex-col justify-end relative"
                        onMouseEnter={() => setHoveredBar(i)}
                        onMouseLeave={() => setHoveredBar(null)}
                      >
                        {/* Tooltip */}
                        {isHovered && (
                          <div className="absolute z-10 bottom-[calc(100%+6px)] left-1/2 -translate-x-1/2 pointer-events-none" style={{ minWidth: '88px' }}>
                            <div className="bg-[#1e2635] rounded-lg px-3 py-2 shadow-xl text-center">
                              <div className="text-white text-[11px] font-bold tabular-nums leading-tight">
                                {value >= 1_000_000 ? '€' + (value / 1_000_000).toFixed(2) + 'M' : value >= 1_000 ? '€' + (value / 1_000).toFixed(1) + 'K' : '€' + value.toFixed(0)}
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
                            <div className="flex justify-center"><div className="w-2 h-2 bg-[#1e2635] rotate-45 -mt-1" /></div>
                          </div>
                        )}

                        {/* Bar */}
                        <div className="w-full rounded-t-[3px] transition-all duration-150" style={{
                          height: `${h}%`,
                          minHeight: '4px',
                          background: isHovered
                            ? 'linear-gradient(to top, #2e3d52 0%, #4a6080 100%)'
                            : isLast
                            ? 'linear-gradient(to top, #3d4c5f 0%, #506070 100%)'
                            : 'linear-gradient(to top, rgba(96,111,128,0.11) 0%, rgba(69,83,100,0.38) 100%)',
                        }} />

                        {/* Static first/last label */}
                        {(isFirst || isLast) && !isHovered && (
                          <div className="absolute bottom-[calc(100%+4px)] left-1/2 -translate-x-1/2 whitespace-nowrap pointer-events-none">
                            <span className={`text-[8px] font-bold tabular-nums ${
                              isLast ? 'text-on-surface/70' : 'text-on-surface-variant/45'
                            }`}>
                              {value >= 1_000_000 ? '€' + (value / 1_000_000).toFixed(2) + 'M' : value >= 1_000 ? '€' + (value / 1_000).toFixed(1) + 'K' : '€' + value.toFixed(0)}
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
              {portfolioHistory.length > 0 && (
                <div className="flex gap-3 pt-0.5">
                  {portfolioHistory.map(({ label, isLast }, i) => (
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

          {/* Alpha Analysis — 4 cols */}
          <div className="col-span-12 lg:col-span-4 flex flex-col gap-4">
            <div className="glass-panel p-6 flex-1">
              <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant/50 mb-1">Portfolio Alpha</p>
              <p className={`text-3xl font-extrabold font-headline tabular-nums ${totals.alpha >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                {fmtPct(totals.alpha)}
              </p>
              <p className="text-[11px] text-on-surface-variant/50 mt-1.5">
                vs {fmtPct(benchmarkPct, false)} benchmark
              </p>
              <div className="mt-4 h-0.5 rounded-full bg-slate-100 overflow-hidden">
                <div className="h-full rounded-full bg-primary/60" style={{ width: `${Math.min(100, Math.max(0, (totals.roi / (benchmarkPct * 2)) * 100))}%` }} />
              </div>
            </div>
            <div className="glass-panel p-6 flex-1">
              <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant/50 mb-1">Total P&L</p>
              <p className={`text-3xl font-extrabold font-headline tabular-nums ${totals.pl >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                {fmtCurrency(totals.pl, true)}
              </p>
              <p className="text-[11px] text-on-surface-variant/50 mt-1.5">
                {fmtCurrency(totals.cb, true)} cost basis
              </p>
            </div>
          </div>
        </div>

        {/* ── ROI by Asset Class ────────────────────────────────────────── */}
        {byClass.length > 0 && (
          <div>
            <h2 className="text-base font-bold font-headline text-on-surface mb-3">ROI by Asset Class</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {byClass.slice(0, 8).map(({ cls, cv, roi }) => (
                <div key={cls} className="bg-white rounded-xl p-4 border-l-4 flex flex-col gap-1.5 shadow-sm" style={{ borderLeftColor: ASSET_CLASS_COLORS[cls] }}>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-on-surface">{ASSET_CLASS_LABELS[cls]}</span>
                    {LOCKED_CLASSES.includes(cls) && <Lock className="w-3 h-3 text-on-surface-variant/30" />}
                  </div>
                  <p className="text-xl font-extrabold font-headline tabular-nums text-on-surface">{fmtCurrency(cv, true)}</p>
                  <span className={`text-xs font-bold tabular-nums ${roi >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>{fmtPct(roi)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── P&L Table ─────────────────────────────────────────────────── */}
        <div className="glass-panel overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
            <h2 className="text-base font-bold font-headline text-on-surface">Acquisition P&amp;L</h2>
            <span className="text-[10px] text-on-surface-variant/40 uppercase tracking-wider">{analyticsRows.length} batches</span>
          </div>
          {analyticsRows.length === 0 ? (
            <div className="p-12 text-center text-on-surface-variant/40 text-sm">No batches match the current filter.</div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/60">
                  <th className="px-5 py-3 text-left  text-[10px] font-bold uppercase tracking-widest text-on-surface-variant/50">Asset / Batch</th>
                  <th className="px-5 py-3 text-left  text-[10px] font-bold uppercase tracking-widest text-on-surface-variant/50">Date</th>
                  <th className="px-5 py-3 text-right text-[10px] font-bold uppercase tracking-widest text-on-surface-variant/50">Cost Basis</th>
                  <th className="px-5 py-3 text-right text-[10px] font-bold uppercase tracking-widest text-on-surface-variant/50">Current Value</th>
                  <th className="px-5 py-3 text-right text-[10px] font-bold uppercase tracking-widest text-on-surface-variant/50">P&amp;L</th>
                  <th className="px-5 py-3 text-right text-[10px] font-bold uppercase tracking-widest text-on-surface-variant/50">ROI</th>
                  <th className="px-5 py-3 text-right text-[10px] font-bold uppercase tracking-widest text-on-surface-variant/50">Alpha</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {analyticsRows.map(r => (
                  <tr key={r.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2">
                        <span className="text-on-surface font-medium">{r.asset_name}</span>
                        {r.isLocked && (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-slate-100 border border-slate-200 text-on-surface-variant/50">
                            <Lock className="w-2.5 h-2.5" /> LOCKED
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-on-surface-variant/40 mt-0.5">
                        {ASSET_CLASS_LABELS[r.asset_class]} · {r.entity_name}
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-on-surface-variant/60 text-xs whitespace-nowrap">{fmtDate(r.purchase_date)}</td>
                    <td className="px-5 py-3.5 text-right tabular-nums text-on-surface-variant">{fmtCurrency(parseFloat(r.cost_basis), true)}</td>
                    <td className="px-5 py-3.5 text-right tabular-nums text-on-surface font-semibold">{fmtCurrency(r.currentValue, true)}</td>
                    <td className="px-5 py-3.5 text-right tabular-nums">
                      <span className={r.pl >= 0 ? 'text-emerald-600 font-semibold' : 'text-red-500 font-semibold'}>{fmtCurrency(r.pl, true)}</span>
                    </td>
                    <td className="px-5 py-3.5 text-right tabular-nums">
                      <span className={r.roiPct >= 0 ? 'text-emerald-600 font-semibold' : 'text-red-500 font-semibold'}>{fmtPct(r.roiPct)}</span>
                    </td>
                    <td className="px-5 py-3.5 text-right tabular-nums">
                      {r.isLocked
                        ? <span className="text-on-surface-variant/30 text-xs">—</span>
                        : <span className={r.alpha >= 0 ? 'text-emerald-600/80 font-semibold' : 'text-red-500/80 font-semibold'}>{fmtPct(r.alpha)}</span>
                      }
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* ── Portfolio totals footer ────────────────────────────────────── */}
        {analyticsRows.length > 0 && (
          <div className="flex items-center justify-end gap-8 px-6 py-4 bg-white rounded-xl border border-slate-100 shadow-sm">
            <span className="text-[10px] text-on-surface-variant/40 uppercase tracking-widest font-bold mr-2">Portfolio Total</span>
            {[
              { label: 'Cost Basis', val: fmtCurrency(totals.cb, true), color: 'text-on-surface' },
              { label: 'Current Value', val: fmtCurrency(totals.cv, true), color: 'text-on-surface font-semibold' },
              { label: 'Total P&L', val: fmtCurrency(totals.pl, true), color: totals.pl >= 0 ? 'text-emerald-600 font-semibold' : 'text-red-500 font-semibold' },
              { label: 'Portfolio ROI', val: fmtPct(totals.roi), color: totals.roi >= 0 ? 'text-emerald-600 font-bold' : 'text-red-500 font-bold' },
              { label: 'vs Benchmark', val: fmtPct(totals.alpha), color: totals.alpha >= 0 ? 'text-emerald-600 font-bold' : 'text-red-500 font-bold' },
            ].map(item => (
              <div key={item.label} className="text-right">
                <div className="text-[10px] text-on-surface-variant/40 uppercase tracking-wider mb-0.5">{item.label}</div>
                <div className={`text-sm tabular-nums ${item.color}`}>{item.val}</div>
              </div>
            ))}
          </div>
        )}

      </div>
    </div>
  );
}
