import { useState, useEffect, useMemo } from 'react';
import { RefreshCw } from 'lucide-react';
import { api } from '../api';
import type { Asset, Entity, AssetClass } from '../types';
import type { EntityFilter } from '../layouts/AppShell';

// ─── Helpers ──────────────────────────────────────────────────────────────────
function fmtCurrency(value: number): string {
  if (value >= 1_000_000) return '€' + (value / 1_000_000).toFixed(2) + 'M';
  if (value >= 1_000) return '€' + (value / 1_000).toFixed(1) + 'K';
  return '€' + value.toFixed(0);
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
  precious_metals: '#e9c349',
  real_estate:     '#b9c7e0',
  equities:        '#4edea3',
  crypto:          '#a78bfa',
  private_equity:  '#fb923c',
  fixed_income:    '#60a5fa',
  cash:            '#86efac',
  exotics:         '#f472b6',
};

// ─── Entity Column ────────────────────────────────────────────────────────────
interface EntityColumnProps {
  entity: Entity;
  assets: Asset[];
  total: number;
  grandTotal: number;
}

function EntityColumn({ entity, assets, total, grandTotal }: EntityColumnProps) {
  const pctOfGrand = grandTotal > 0 ? (total / grandTotal) * 100 : 0;

  // Group by asset_class
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
    <div className="glass-panel rounded-xl border border-outline-variant/20 p-6 space-y-5 flex flex-col">
      {/* Entity header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-3 py-1 bg-primary/10 text-primary rounded-full text-xs border border-primary/20 font-medium">
              {entity.type === 'business' ? 'Business' : 'Personal'}
            </span>
          </div>
          <h2 className="font-headline italic text-2xl text-on-surface mt-2">{entity.name}</h2>
          {entity.description && (
            <p className="text-xs text-on-surface-variant/50 mt-1">{entity.description}</p>
          )}
        </div>
        <div className="text-right shrink-0">
          <div className="text-[11px] text-on-surface-variant/40 uppercase tracking-wider mb-1">Total Value</div>
          <div className="font-headline italic text-2xl text-on-surface tabular-nums">{fmtCurrency(total)}</div>
          <div className="text-xs text-on-surface-variant/40 mt-1">{pctOfGrand.toFixed(1)}% of portfolio</div>
        </div>
      </div>

      {/* Allocation bars */}
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
                  <span className="text-on-surface-variant/40">{pct.toFixed(1)}%</span>
                  <span className="text-on-surface w-20 text-right">{fmtCurrency(val)}</span>
                </div>
              </div>
              <div className="h-1 bg-surface-highest rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full"
                  style={{ width: `${pct}%`, background: ASSET_CLASS_COLORS[cls], opacity: 0.7 }}
                />
              </div>
            </div>
          ))
        )}
      </div>

      {/* Asset list */}
      <div className="border-t border-outline-variant/15 pt-4">
        <div className="text-[11px] text-on-surface-variant/40 uppercase tracking-wider mb-2">Assets ({assets.length})</div>
        <div className="space-y-1.5">
          {assets.map(a => (
            <div key={a.id} className="flex items-center justify-between text-xs">
              <span className="text-on-surface-variant/70 truncate pr-2">{a.name}</span>
              <span className="text-on-surface tabular-nums shrink-0">{fmtCurrency(parseFloat(a.current_value))}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
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
        <div className="glass-panel rounded-xl p-6 border border-error/20 text-error text-sm">{error}</div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 relative">
      {/* ── Atmospheric glow (deep left atmosphere) ───────────────────────── */}
      <div
        className="absolute top-0 left-0 w-[500px] h-[500px] rounded-full pointer-events-none"
        style={{
          background: 'radial-gradient(circle, rgba(233,195,73,0.04) 0%, transparent 70%)',
          filter: 'blur(80px)',
          transform: 'translate(-20%, -20%)',
        }}
      />

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-4 relative">
        <div>
          <h1 className="font-headline italic text-3xl text-on-surface">Business vs Personal</h1>
          <p className="text-on-surface-variant/60 text-sm mt-1">
            Entity allocation &amp; ownership structure ·{' '}
            <span className="text-primary capitalize">{entityFilter}</span>
          </p>
        </div>

        {/* Sync status */}
        <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-outline-variant/25 bg-surface-high/30 shrink-0">
          <RefreshCw className="w-3.5 h-3.5 text-secondary/60" />
          <div className="text-right">
            <div className="text-xs font-medium text-secondary/70">Protocol Active</div>
            <div className="text-[10px] text-on-surface-variant/40">
              Last Sync: {minutesAgo === 0 ? 'just now' : `${minutesAgo}m ago`}
            </div>
          </div>
        </div>
      </div>

      {/* ── Portfolio total banner ────────────────────────────────────────── */}
      <div className="glass-panel rounded-xl px-6 py-4 border border-outline-variant/20 flex items-center gap-6">
        <div>
          <div className="text-[11px] text-on-surface-variant/50 uppercase tracking-[0.16em] mb-0.5">Grand Total</div>
          <div className="font-headline italic text-2xl text-on-surface tabular-nums">{fmtCurrency(grandTotal)}</div>
        </div>
        <div className="flex-1 flex items-center gap-2">
          {/* Business vs personal bar */}
          {businessEntities.length > 0 && personalEntities.length > 0 && (
            <div className="flex-1 h-2 rounded-full overflow-hidden bg-surface-highest flex">
              {(['business', 'personal'] as const).map(type => {
                const typeEntities = type === 'business' ? businessEntities : personalEntities;
                const typeTotal = typeEntities.reduce((s, e) => s + getEntityTotal(e.id), 0);
                const pct = grandTotal > 0 ? (typeTotal / grandTotal) * 100 : 0;
                return (
                  <div
                    key={type}
                    className="h-full"
                    style={{
                      width: `${pct}%`,
                      background: type === 'business' ? '#e9c349' : '#4edea3',
                      opacity: 0.7,
                    }}
                  />
                );
              })}
            </div>
          )}
          <div className="flex gap-4 text-xs shrink-0">
            <span className="flex items-center gap-1.5 text-primary">
              <span className="w-2 h-2 bg-primary/70 rounded-sm" />
              Business
            </span>
            <span className="flex items-center gap-1.5 text-secondary">
              <span className="w-2 h-2 bg-secondary/70 rounded-sm" />
              Personal
            </span>
          </div>
        </div>
      </div>

      {/* ── Entity columns ────────────────────────────────────────────────── */}
      <div className={`grid gap-6 ${displayEntities.length <= 2 ? 'lg:grid-cols-2' : 'lg:grid-cols-3'}`}>
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
    </div>
  );
}
