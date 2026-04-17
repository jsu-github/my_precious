import { useState, useEffect, useMemo } from 'react';
import { RefreshCw, ArrowLeftRight, TrendingUp } from 'lucide-react';
import { api } from '../api';
import type { Asset, Entity, AssetClass } from '../types';
import type { EntityFilter } from '../layouts/AppShell';

// ─── Helpers ──────────────────────────────────────────────────────────────────
function fmtCurrency(value: number): string {
  if (value >= 1_000_000) return '€' + (value / 1_000_000).toFixed(2) + 'M';
  if (value >= 1_000) return '€' + (value / 1_000).toFixed(1) + 'K';
  return '€' + value.toFixed(0);
}

function fmtHero(value: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'EUR', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(value);
}

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

// Static inter-ledger activity feed
const INTER_LEDGER_FEED = [
  { date: 'Jul 14, 2024', from: 'Holding BV', to: 'Personal Estate', amount: '+€120,000', desc: 'Dividend distribution Q2' },
  { date: 'Jun 28, 2024', from: 'Personal Estate', to: 'Operating Ltd', amount: '−€45,000', desc: 'Business investment allocation' },
  { date: 'Jun 10, 2024', from: 'Trust Structure', to: 'Holding BV', desc: 'Quarterly rebalancing', amount: '+€310,000' },
];

// ─── Entity Column (preserved) ────────────────────────────────────────────────
interface EntityColumnProps {
  entity: Entity;
  assets: Asset[];
  total: number;
  grandTotal: number;
}

function EntityColumn({ entity, assets, total, grandTotal }: EntityColumnProps) {
  const pctOfGrand = grandTotal > 0 ? (total / grandTotal) * 100 : 0;

  const byClass = useMemo(() => {
    const map = new Map<AssetClass, number>();
    assets.forEach(a => {
      map.set(a.asset_class, (map.get(a.asset_class) ?? 0) + parseFloat(a.current_value));
    });
    return Array.from(map.entries())
      .map(([cls, val]) => ({ cls, val, pct: total > 0 ? (val / total) * 100 : 0 }))
      .sort((a, b) => b.val - a.val);
  }, [assets, total]);

  return (
    <div className="glass-panel p-6 space-y-5 flex flex-col h-full">
      <div className="flex items-start justify-between">
        <div>
          <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border mb-2 ${
            entity.type === 'business'
              ? 'bg-primary/10 border-primary/20 text-primary'
              : 'bg-emerald-50 border-emerald-200 text-emerald-700'
          }`}>
            {entity.type === 'business' ? 'Business' : 'Personal'}
          </span>
          <h2 className="font-headline font-bold text-lg text-on-surface leading-tight">{entity.name}</h2>
          {entity.description && (
            <p className="text-[11px] text-on-surface-variant/50 mt-0.5">{entity.description}</p>
          )}
        </div>
        <div className="text-right shrink-0">
          <div className="text-[10px] text-on-surface-variant/40 uppercase tracking-widest mb-0.5">Total</div>
          <div className="font-headline font-bold text-xl text-on-surface tabular-nums">{fmtCurrency(total)}</div>
          <div className="text-[10px] text-on-surface-variant/40 mt-0.5">{pctOfGrand.toFixed(1)}% of portfolio</div>
        </div>
      </div>

      <div className="space-y-2 flex-1">
        {byClass.length === 0 ? (
          <p className="text-xs text-on-surface-variant/30">No assets</p>
        ) : (
          byClass.map(({ cls, val, pct }) => (
            <div key={cls}>
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-sm" style={{ background: ASSET_CLASS_COLORS[cls] }} />
                  <span className="text-xs text-on-surface-variant">{ASSET_CLASS_LABELS[cls]}</span>
                </div>
                <div className="flex items-center gap-3 text-xs tabular-nums">
                  <span className="text-on-surface-variant/40">{pct.toFixed(0)}%</span>
                  <span className="text-on-surface w-20 text-right font-medium">{fmtCurrency(val)}</span>
                </div>
              </div>
              <div className="h-1 bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full rounded-full" style={{ width: `${pct}%`, background: ASSET_CLASS_COLORS[cls], opacity: 0.75 }} />
              </div>
            </div>
          ))
        )}
      </div>

      <div className="border-t border-slate-100 pt-4">
        <div className="text-[10px] text-on-surface-variant/40 uppercase tracking-widest font-bold mb-2">Assets ({assets.length})</div>
        <div className="space-y-1.5 max-h-32 overflow-y-auto">
          {assets.map(a => (
            <div key={a.id} className="flex items-center justify-between text-xs">
              <span className="text-on-surface-variant/70 truncate pr-2">{a.name}</span>
              <span className="text-on-surface tabular-nums shrink-0 font-medium">{fmtCurrency(parseFloat(a.current_value))}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Liquidity Donut ─────────────────────────────────────────────────────────
function LiquidityDonut({ liquidPct }: { liquidPct: number }) {
  const r = 42;
  const circ = 2 * Math.PI * r;
  const filled = (liquidPct / 100) * circ;
  return (
    <svg viewBox="0 0 100 100" className="w-24 h-24">
      <circle cx="50" cy="50" r={r} fill="none" stroke="#e2e8f0" strokeWidth="12" />
      <circle cx="50" cy="50" r={r} fill="none" stroke="#545f73" strokeWidth="12"
        strokeDasharray={`${filled} ${circ}`}
        strokeDashoffset={circ * 0.25}
        strokeLinecap="round"
        transform="rotate(-90 50 50)"
      />
      <text x="50" y="46" textAnchor="middle" className="font-bold" style={{ fontSize: '14px', fill: '#2a3439', fontFamily: 'Manrope, sans-serif' }}>
        {liquidPct.toFixed(0)}%
      </text>
      <text x="50" y="60" textAnchor="middle" style={{ fontSize: '7px', fill: '#566166', fontFamily: 'Manrope, sans-serif' }}>
        LIQUID
      </text>
    </svg>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────
interface Props {
  entityFilter: EntityFilter;
}

export default function EntityPage({ entityFilter }: Props) {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [entities, setEntities] = useState<Entity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastSync] = useState(new Date());

  useEffect(() => {
    setLoading(true);
    Promise.all([api.assets.list(), api.entities.list()])
      .then(([a, e]) => { setAssets(a); setEntities(e); })
      .catch(err => setError(String(err)))
      .finally(() => setLoading(false));
  }, []);

  const businessEntities = useMemo(() => entities.filter(e => e.type === 'business'), [entities]);
  const personalEntities = useMemo(() => entities.filter(e => e.type === 'personal'), [entities]);
  const grandTotal = useMemo(() => assets.reduce((s, a) => s + parseFloat(a.current_value), 0), [assets]);

  function getEntityAssets(entityId: number) {
    return assets.filter(a => a.entity_id === entityId);
  }
  function getEntityTotal(entityId: number) {
    return getEntityAssets(entityId).reduce((s, a) => s + parseFloat(a.current_value), 0);
  }

  const displayEntities = useMemo(() => {
    if (entityFilter === 'personal') return personalEntities;
    if (entityFilter === 'business') return businessEntities;
    return entities;
  }, [entities, businessEntities, personalEntities, entityFilter]);

  const businessTotal = useMemo(
    () => businessEntities.reduce((s, e) => s + getEntityTotal(e.id), 0),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [businessEntities, assets],
  );
  const personalTotal = useMemo(
    () => personalEntities.reduce((s, e) => s + getEntityTotal(e.id), 0),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [personalEntities, assets],
  );
  const liquidValue = useMemo(
    () => assets.filter(a => a.asset_class === 'cash').reduce((s, a) => s + parseFloat(a.current_value), 0),
    [assets],
  );
  const liquidPct = grandTotal > 0 ? (liquidValue / grandTotal) * 100 : 0;
  const minutesAgo = Math.floor((Date.now() - lastSync.getTime()) / 60_000);

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center h-64">
        <div className="text-on-surface-variant/50 text-sm">Loading entities…</div>
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
    <div className="p-8 space-y-6 max-w-[1400px] mx-auto">

      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <div className="flex items-end justify-between gap-6">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant/60 mb-2">
            Business vs. Personal
          </p>
          <p className="font-headline font-extrabold tabular-nums leading-none text-on-surface" style={{ fontSize: 'clamp(2.6rem, 4vw, 3.2rem)' }}>
            {fmtHero(grandTotal)}
          </p>
          <div className="flex items-center gap-3 mt-2">
            <span className="text-xs text-on-surface-variant/50 capitalize">{entityFilter} view · {entities.length} entities</span>
          </div>
        </div>
        <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 bg-white shrink-0">
          <RefreshCw className="w-3.5 h-3.5 text-emerald-600" />
          <div className="text-right">
            <div className="text-xs font-semibold text-emerald-600">Protocol Active</div>
            <div className="text-[10px] text-on-surface-variant/40">
              Synced {minutesAgo === 0 ? 'just now' : `${minutesAgo}m ago`}
            </div>
          </div>
        </div>
      </div>

      {/* ── Combined split bar ────────────────────────────────────────────── */}
      {businessTotal > 0 && personalTotal > 0 && (
        <div className="glass-panel px-6 py-5 flex items-center gap-8">
          <div>
            <div className="text-[10px] text-on-surface-variant/40 uppercase tracking-widest font-bold mb-0.5">Business</div>
            <div className="font-headline font-bold text-xl text-on-surface tabular-nums">{fmtCurrency(businessTotal)}</div>
            <div className="text-[10px] text-on-surface-variant/40">{grandTotal > 0 ? ((businessTotal / grandTotal) * 100).toFixed(0) : 0}%</div>
          </div>
          <div className="flex-1 flex flex-col gap-1.5">
            <div className="flex h-3 rounded-full overflow-hidden gap-px bg-slate-100">
              <div className="h-full rounded-l-full" style={{ width: `${grandTotal > 0 ? (businessTotal / grandTotal) * 100 : 0}%`, background: '#545f73', opacity: 0.75 }} />
              <div className="h-full rounded-r-full flex-1" style={{ background: '#059669', opacity: 0.55 }} />
            </div>
            <div className="flex gap-4 text-[10px]">
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-primary/70" />Business</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-emerald-500/70" />Personal</span>
            </div>
          </div>
          <div className="text-right">
            <div className="text-[10px] text-on-surface-variant/40 uppercase tracking-widest font-bold mb-0.5">Personal</div>
            <div className="font-headline font-bold text-xl text-on-surface tabular-nums">{fmtCurrency(personalTotal)}</div>
            <div className="text-[10px] text-on-surface-variant/40">{grandTotal > 0 ? ((personalTotal / grandTotal) * 100).toFixed(0) : 0}%</div>
          </div>
        </div>
      )}

      {/* ── Entity Columns + Advisory Card ───────────────────────────────── */}
      <div className="grid grid-cols-12 gap-6">

        {/* Entity columns — 8 cols */}
        <div className={`col-span-12 lg:col-span-8 grid gap-5 ${displayEntities.length === 1 ? 'grid-cols-1' : 'grid-cols-1 sm:grid-cols-2'}`}>
          {displayEntities.map(entity => (
            <EntityColumn
              key={entity.id}
              entity={entity}
              assets={getEntityAssets(entity.id)}
              total={getEntityTotal(entity.id)}
              grandTotal={grandTotal}
            />
          ))}
        </div>

        {/* Advisory card — 4 cols */}
        <div className="col-span-12 lg:col-span-4 flex flex-col gap-5">
          <div
            className="rounded-xl p-6 text-white flex flex-col gap-4 flex-1"
            style={{ background: 'linear-gradient(145deg, #545f73 0%, #3d4859 50%, #2e3a4a 100%)' }}
          >
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-white/50 mb-2">Advisory Insight</p>
              <h3 className="font-headline font-bold text-lg leading-snug">Optimize Your Structure</h3>
              <p className="text-sm text-white/70 leading-relaxed mt-2">
                Your business-to-personal ratio is currently {grandTotal > 0 ? ((businessTotal / grandTotal) * 100).toFixed(0) : '—'}% / {grandTotal > 0 ? ((personalTotal / grandTotal) * 100).toFixed(0) : '—'}%. Transferring lower-yield assets to personal trust structures could improve your estate position.
              </p>
            </div>
            <div className="flex items-center gap-2 mt-auto">
              <TrendingUp className="w-4 h-4 text-white/60" />
              <span className="text-xs text-white/60">Potential saving: ~2.1% annually</span>
            </div>
            <button className="w-full py-2.5 rounded-lg bg-white/15 border border-white/25 text-sm font-semibold hover:bg-white/25 transition-colors">
              Review Transfer Options
            </button>
          </div>

          {/* Liquidity donut */}
          <div className="glass-panel p-6 flex items-center gap-5">
            <LiquidityDonut liquidPct={liquidPct} />
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant/50 mb-1">Liquidity</p>
              <p className="font-headline font-bold text-xl text-on-surface tabular-nums">{fmtCurrency(liquidValue)}</p>
              <p className="text-xs text-on-surface-variant/50 mt-1">liquid assets of total</p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Inter-Ledger Activity Feed ─────────────────────────────────────── */}
      <div className="glass-panel p-6">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <ArrowLeftRight className="w-4 h-4 text-primary/60" />
            <h2 className="text-base font-bold font-headline text-on-surface">Inter-Ledger Activity</h2>
          </div>
          <span className="text-[10px] text-on-surface-variant/40 uppercase tracking-widest font-bold">Recent Transfers</span>
        </div>
        <div className="space-y-4">
          {INTER_LEDGER_FEED.map((item, i) => (
            <div key={i} className="flex items-start gap-4 py-3 border-b border-slate-50 last:border-0">
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                <ArrowLeftRight className="w-3.5 h-3.5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-xs font-semibold text-on-surface">{item.desc}</p>
                    <p className="text-[10px] text-on-surface-variant/50 mt-0.5">{item.from} → {item.to}</p>
                  </div>
                  <span className={`text-sm font-bold tabular-nums shrink-0 ${item.amount.startsWith('+') ? 'text-emerald-600' : 'text-red-500'}`}>
                    {item.amount}
                  </span>
                </div>
                <p className="text-[9px] text-on-surface-variant/35 font-bold uppercase tracking-wide mt-1">{item.date}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}
