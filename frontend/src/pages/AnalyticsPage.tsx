import { useState, useEffect, useMemo } from 'react';
import { TrendingUp, TrendingDown, Lock } from 'lucide-react';
import { api } from '../api';
import type { LedgerRow, AssetClass } from '../types';
import type { EntityFilter } from '../layouts/AppShell';

// ─── Market ticker data (static — Phase 10 makes these editable) ─────────────
const MARKET_TICKERS = [
  { symbol: 'XAU/USD', label: 'Gold',    price: 2_375.40, change: +1.24 },
  { symbol: 'XAG/USD', label: 'Silver',  price:    30.82, change: +0.47 },
  { symbol: 'BTC/USD', label: 'Bitcoin', price: 61_402.00, change: -2.31 },
  { symbol: 'SPX',     label: 'S&P 500', price: 5_308.13, change: +0.52 },
  { symbol: 'DXY',     label: 'USD Index',price: 105.08,  change: -0.18 },
  { symbol: 'XPT/USD', label: 'Platinum', price: 995.60,  change: +0.33 },
];

const BENCHMARK_RETURN_PCT = 12.5; // S&P 500 TTM

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

const LOCKED_CLASSES: AssetClass[] = ['private_equity'];

// ─── Helpers ──────────────────────────────────────────────────────────────────
function fmtCurrency(value: number, compact = false): string {
  if (compact && Math.abs(value) >= 1_000_000) return (value < 0 ? '-$' : '$') + (Math.abs(value) / 1_000_000).toFixed(2) + 'M';
  if (compact && Math.abs(value) >= 1_000) return (value < 0 ? '-$' : '$') + (Math.abs(value) / 1_000).toFixed(1) + 'K';
  return new Intl.NumberFormat('en-US', {
    style: 'currency', currency: 'USD', minimumFractionDigits: 0, maximumFractionDigits: 0,
  }).format(value);
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function fmtPct(n: number, sign = true): string {
  return (sign && n >= 0 ? '+' : '') + n.toFixed(1) + '%';
}

function buildAnalyticsRows(rows: LedgerRow[]) {
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
    const alpha = roiPct - BENCHMARK_RETURN_PCT;
    const isLocked = LOCKED_CLASSES.includes(r.asset_class);
    return { ...r, currentValue, pl, roiPct, alpha, isLocked };
  });
}

// ─── Sub-component: Market Ticker ─────────────────────────────────────────────
function MarketTicker() {
  return (
    <div className="flex items-center gap-px overflow-x-auto border-b border-outline-variant/20 bg-surface-low/60 px-4 shrink-0">
      {MARKET_TICKERS.map(t => (
        <div
          key={t.symbol}
          className="flex items-center gap-4 px-5 py-2.5 shrink-0 border-r border-outline-variant/15 last:border-0"
        >
          <div>
            <span className="text-[10px] text-on-surface-variant/40 font-label tracking-widest uppercase mr-1.5">
              {t.label}
            </span>
            <span className="text-xs text-on-surface tabular-nums">
              {t.price >= 10_000
                ? fmtCurrency(t.price).replace('$', '')
                : t.price.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </span>
          </div>
          <div className={`flex items-center gap-0.5 text-xs tabular-nums ${t.change >= 0 ? 'text-secondary' : 'text-error'}`}>
            {t.change >= 0
              ? <TrendingUp className="w-3 h-3" />
              : <TrendingDown className="w-3 h-3" />
            }
            {fmtPct(t.change)}
          </div>
        </div>
      ))}
      <div className="ml-auto pl-5 pr-2 shrink-0">
        <span className="text-[10px] text-on-surface-variant/25 italic">Manual spot prices · Updated Phase 10</span>
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

  useEffect(() => {
    setLoading(true);
    api.ledger.list()
      .then(setRows)
      .catch(err => setError(String(err)))
      .finally(() => setLoading(false));
  }, []);

  const filteredRows = useMemo(() => {
    if (entityFilter === 'global') return rows;
    return rows.filter(r => r.entity_type === entityFilter);
  }, [rows, entityFilter]);

  const analyticsRows = useMemo(() => buildAnalyticsRows(filteredRows), [filteredRows]);

  const totals = useMemo(() => {
    const cb = analyticsRows.reduce((s, r) => s + parseFloat(r.cost_basis), 0);
    const cv = analyticsRows.reduce((s, r) => s + r.currentValue, 0);
    const pl = cv - cb;
    const roi = cb > 0 ? (pl / cb) * 100 : 0;
    const alpha = roi - BENCHMARK_RETURN_PCT;
    return { cb, cv, pl, roi, alpha };
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
          <div className="glass-panel rounded-xl p-6 border border-error/20 text-error text-sm">{error}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-full">
      {/* ── Market Ticker ────────────────────────────────────────────────── */}
      <MarketTicker />

      <div className="p-6 space-y-5 flex-1">
        {/* ── Header ────────────────────────────────────────────────────── */}
        <div>
          <h1 className="font-headline italic text-3xl text-on-surface">Performance Analytics</h1>
          <p className="text-on-surface-variant/60 text-sm mt-1">
            {analyticsRows.length} batches · Benchmark: S&P 500 TTM {fmtPct(BENCHMARK_RETURN_PCT)} ·{' '}
            <span className="text-primary capitalize">{entityFilter}</span>
          </p>
        </div>

        {/* ── Batch table ───────────────────────────────────────────────── */}
        <div className="glass-panel rounded-xl border border-outline-variant/20 overflow-hidden">
          {analyticsRows.length === 0 ? (
            <div className="p-12 text-center text-on-surface-variant/40 text-sm">
              No batches match the current filter.
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-outline-variant/20">
                  <th className="px-5 py-3 text-left   text-[11px] font-medium text-on-surface-variant/50 uppercase tracking-wider">Asset / Batch</th>
                  <th className="px-5 py-3 text-left   text-[11px] font-medium text-on-surface-variant/50 uppercase tracking-wider">Date</th>
                  <th className="px-5 py-3 text-right  text-[11px] font-medium text-on-surface-variant/50 uppercase tracking-wider">Cost Basis</th>
                  <th className="px-5 py-3 text-right  text-[11px] font-medium text-on-surface-variant/50 uppercase tracking-wider">Current Value</th>
                  <th className="px-5 py-3 text-right  text-[11px] font-medium text-on-surface-variant/50 uppercase tracking-wider">P&amp;L</th>
                  <th className="px-5 py-3 text-right  text-[11px] font-medium text-on-surface-variant/50 uppercase tracking-wider">ROI</th>
                  <th className="px-5 py-3 text-right  text-[11px] font-medium text-on-surface-variant/50 uppercase tracking-wider">Alpha</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/10">
                {analyticsRows.map(r => (
                  <tr key={r.id} className="group hover:bg-surface-high/30 transition-colors">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2">
                        <span className="text-on-surface font-medium">{r.asset_name}</span>
                        {r.isLocked && (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-outline-variant/20 border border-outline-variant/40 text-on-surface-variant/50">
                            <Lock className="w-2.5 h-2.5" />
                            LOCKED
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-on-surface-variant/40 mt-0.5">
                        {ASSET_CLASS_LABELS[r.asset_class]} · {r.entity_name}
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-on-surface-variant/60 text-xs whitespace-nowrap">
                      {fmtDate(r.purchase_date)}
                    </td>
                    <td className="px-5 py-3.5 text-right tabular-nums text-on-surface-variant">
                      {fmtCurrency(parseFloat(r.cost_basis), true)}
                    </td>
                    <td className="px-5 py-3.5 text-right tabular-nums text-on-surface">
                      {fmtCurrency(r.currentValue, true)}
                    </td>
                    <td className="px-5 py-3.5 text-right tabular-nums">
                      <span className={r.pl >= 0 ? 'text-secondary' : 'text-error'}>
                        {fmtCurrency(r.pl, true)}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-right tabular-nums">
                      <span className={r.roiPct >= 0 ? 'text-secondary' : 'text-error'}>
                        {fmtPct(r.roiPct)}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-right tabular-nums">
                      {r.isLocked ? (
                        <span className="text-on-surface-variant/30 text-xs">—</span>
                      ) : (
                        <span className={r.alpha >= 0 ? 'text-secondary/80' : 'text-error/80'}>
                          {fmtPct(r.alpha)}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* ── Portfolio totals ──────────────────────────────────────────── */}
        {analyticsRows.length > 0 && (
          <div className="flex items-center justify-end gap-8 px-5 py-3 bg-surface-high/30 rounded-xl border border-outline-variant/15">
            <div className="text-xs text-on-surface-variant/50 uppercase tracking-wider mr-4">Portfolio Total</div>
            <div className="text-right">
              <div className="text-[11px] text-on-surface-variant/40">Cost Basis</div>
              <div className="text-sm font-medium text-on-surface tabular-nums">{fmtCurrency(totals.cb, true)}</div>
            </div>
            <div className="text-right">
              <div className="text-[11px] text-on-surface-variant/40">Current Value</div>
              <div className="text-sm font-medium text-on-surface tabular-nums">{fmtCurrency(totals.cv, true)}</div>
            </div>
            <div className="text-right">
              <div className="text-[11px] text-on-surface-variant/40">Total P&L</div>
              <div className={`text-sm font-medium tabular-nums ${totals.pl >= 0 ? 'text-secondary' : 'text-error'}`}>
                {fmtCurrency(totals.pl, true)}
              </div>
            </div>
            <div className="text-right">
              <div className="text-[11px] text-on-surface-variant/40">Portfolio ROI</div>
              <div className={`text-sm font-medium tabular-nums ${totals.roi >= 0 ? 'text-secondary' : 'text-error'}`}>
                {fmtPct(totals.roi)}
              </div>
            </div>
            <div className="text-right">
              <div className="text-[11px] text-on-surface-variant/40">vs Benchmark</div>
              <div className={`text-sm font-medium tabular-nums ${totals.alpha >= 0 ? 'text-secondary' : 'text-error'}`}>
                {fmtPct(totals.alpha)}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
