import { useState, useEffect, useMemo } from 'react';
import { TrendingUp, Shield, Layers, Plus } from 'lucide-react';
import { api } from '../api';
import type { Asset, AssetClass, AssetLocation, Entity, TierConfig } from '../types';
import type { EntityFilter } from '../layouts/AppShell';
import type { View } from '../components/Sidebar';
import AssetModal from '../components/modals/AssetModal';

// ─── Asset class metadata ─────────────────────────────────────────────────────
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
function formatCurrency(value: number): string {
  if (value >= 1_000_000) {
    return '€' + (value / 1_000_000).toFixed(2) + 'M';
  }
  if (value >= 1_000) {
    return '€' + (value / 1_000).toFixed(1) + 'K';
  }
  return new Intl.NumberFormat('nl-NL', { style: 'currency', currency: 'EUR', minimumFractionDigits: 0 }).format(value);
}

function formatDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
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

  useEffect(() => {
    setLoading(true);
    Promise.all([api.assets.list(), api.locations.list(), api.entities.list(), api.tierConfig.list()])
      .then(([a, l, e, tc]) => {
        setAssets(a);
        setLocations(l);
        setEntities(e);
        setTierConfigs(tc);
      })
      .catch(err => setError(String(err)))
      .finally(() => setLoading(false));
  }, []);

  // ─── Filtered assets by entity toggle ─────────────────────────────────────
  const filteredAssets = useMemo(() => {
    if (entityFilter === 'global') return assets;
    return assets.filter(a => a.entity_type === entityFilter);
  }, [assets, entityFilter]);

  // ─── Computed totals ───────────────────────────────────────────────────────
  const totalValue = useMemo(
    () => filteredAssets.reduce((sum, a) => sum + parseFloat(a.current_value), 0),
    [filteredAssets],
  );

  // ─── Tier health ───────────────────────────────────────────────────────────
  const tierHealth = useMemo(() => {
    if (tierConfigs.length === 0) return null;
    const tierMap: Record<number, number> = {};
    filteredAssets.forEach(a => {
      if (a.tier != null) { // tier=0 is valid — guard with != null, not !tier
        tierMap[a.tier] = (tierMap[a.tier] ?? 0) + parseFloat(a.current_value);
      }
    });
    const tiers = tierConfigs
      .sort((a, b) => a.tier_id - b.tier_id)
      .map(tc => {
        const tierValue = tierMap[tc.tier_id] ?? 0;
        const currentPct = totalValue > 0 ? (tierValue / totalValue) * 100 : 0;
        const min = parseFloat(tc.min_pct);
        const max = parseFloat(tc.max_pct);
        let status: 'green' | 'amber' | 'red';
        if (currentPct >= min && currentPct <= max) {
          status = 'green';
        } else {
          const distance = currentPct < min ? min - currentPct : currentPct - max;
          status = distance <= 5 ? 'amber' : 'red';
        }
        return { tier_id: tc.tier_id, name: tc.tier_name, status };
      });
    const in_range = tiers.filter(t => t.status === 'green').length;
    return { tiers, in_range };
  }, [filteredAssets, tierConfigs, totalValue]);

  const byAssetClass = useMemo(() => {
    const map = new Map<AssetClass, number>();
    filteredAssets.forEach(a => {
      map.set(a.asset_class, (map.get(a.asset_class) ?? 0) + parseFloat(a.current_value));
    });
    return Array.from(map.entries())
      .map(([cls, val]) => ({
        asset_class: cls,
        value: val,
        pct: totalValue > 0 ? (val / totalValue) * 100 : 0,
      }))
      .sort((a, b) => b.value - a.value);
  }, [filteredAssets, totalValue]);

  const locationStats = useMemo(() => {
    return locations
      .map(loc => {
        const locAssets = filteredAssets.filter(a => a.location_id === loc.id);
        const locValue = locAssets.reduce((sum, a) => sum + parseFloat(a.current_value), 0);
        const lastAudit = locAssets
          .map(a => a.last_audit_date)
          .filter(Boolean)
          .sort()
          [locAssets.map(a => a.last_audit_date).filter(Boolean).sort().length - 1];
        return { ...loc, asset_count: locAssets.length, total_value: locValue, last_audit: lastAudit };
      })
      .filter(l => l.asset_count > 0);
  }, [locations, filteredAssets]);

  const lastUpdated = useMemo(() => {
    const dates = assets.map(a => a.updated_at).sort();
    return dates[dates.length - 1] ?? null;
  }, [assets]);

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
        <div className="glass-panel rounded-xl p-6 border border-error/20 text-error text-sm">{error}</div>
      </div>
    );
  }

  return (
    <>
    <div className="p-6 space-y-6">

      {/* ── Net Worth Hero ─────────────────────────────────────────────────── */}
      <div className="glass-panel rounded-xl p-8 border border-outline-variant/20">
        <div className="flex items-start justify-between gap-6">
          <div className="flex-1">
            <p className="text-[11px] text-on-surface-variant/60 uppercase tracking-[0.2em] font-label mb-2">
              Total Portfolio Value
            </p>
            <p className="font-headline italic tabular-nums leading-none"
               style={{ fontSize: 'clamp(2.5rem, 5vw, 4rem)', color: '#dae2fd' }}>
              {formatCurrency(totalValue)}
            </p>
            <div className="flex items-center gap-3 mt-3">
              <span className="inline-flex items-center gap-1.5 text-xs text-on-surface-variant/50">
                <span className="w-1 h-1 rounded-full bg-secondary inline-block" />
                {filteredAssets.length} assets
              </span>
              {lastUpdated && (
                <span className="text-xs text-on-surface-variant/40">
                  Updated {formatDate(lastUpdated)}
                </span>
              )}
            </div>
          </div>

          <div className="flex flex-col items-end gap-3 shrink-0">
            {/* Entity scope badge */}
            <div className={`
              inline-flex items-center gap-1.5 px-3 py-1 rounded text-xs font-medium border
              ${entityFilter === 'global'
                ? 'bg-primary/10 border-primary/20 text-primary'
                : entityFilter === 'personal'
                  ? 'bg-tertiary/10 border-tertiary/20 text-tertiary'
                  : 'bg-secondary/10 border-secondary/20 text-secondary'
              }
            `}>
              <span className="capitalize">{entityFilter}</span>
              <span className="opacity-60">view</span>
            </div>

            {/* Add Asset */}
            <button
              onClick={() => setShowAddAsset(true)}
              className="flex items-center gap-2 px-3 py-1.5 bg-primary/10 hover:bg-primary/15 border border-primary/25 rounded text-xs text-primary transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Asset
            </button>

            {/* Trend stub — Phase 12 will wire real snapshot comparison */}
            <div className="flex items-center gap-1.5 text-xs text-on-surface-variant/40">
              <TrendingUp className="w-3.5 h-3.5" />
              <span>Trend data — Phase 12</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Two-panel row ───────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Asset Allocation — 2/3 width */}
        <div className="lg:col-span-2 glass-panel rounded-xl p-6 border border-outline-variant/20">
          <div className="flex items-center gap-2 mb-5">
            <Layers className="w-4 h-4 text-primary/60" />
            <h2 className="font-headline italic text-xl text-on-surface">Asset Allocation</h2>
          </div>

          {byAssetClass.length === 0 ? (
            <p className="text-on-surface-variant/40 text-sm">No assets in this view.</p>
          ) : (
            <div className="space-y-3">
              {byAssetClass.map(({ asset_class, value, pct }) => (
                <div key={asset_class} className="group">
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      <span
                        className="w-2.5 h-2.5 rounded-sm shrink-0"
                        style={{ background: ASSET_CLASS_COLORS[asset_class] }}
                      />
                      <span className="text-sm text-on-surface-variant group-hover:text-on-surface transition-colors">
                        {ASSET_CLASS_LABELS[asset_class]}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 tabular-nums">
                      <span className="text-xs text-on-surface-variant/50 w-10 text-right">
                        {pct.toFixed(1)}%
                      </span>
                      <span className="text-sm text-on-surface font-medium w-24 text-right">
                        {formatCurrency(value)}
                      </span>
                    </div>
                  </div>
                  {/* Bar track */}
                  <div className="h-1 rounded-full bg-surface-highest overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-700"
                      style={{
                        width: `${pct}%`,
                        background: ASSET_CLASS_COLORS[asset_class],
                        opacity: 0.75,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Vault Security Status — 1/3 width */}
        <div className="glass-panel rounded-xl p-6 border border-outline-variant/20">
          <div className="flex items-center gap-2 mb-5">
            <Shield className="w-4 h-4 text-secondary/60" />
            <h2 className="font-headline italic text-xl text-on-surface">Vault Security</h2>
          </div>

          {locationStats.length === 0 ? (
            <p className="text-on-surface-variant/40 text-sm">No locations in this view.</p>
          ) : (
            <div className="space-y-4">
              {locationStats.map(loc => (
                <div key={loc.id} className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-on-surface font-medium truncate pr-2">
                      {loc.name}
                    </span>
                    {/* Connected status */}
                    <span className="flex items-center gap-1.5 text-xs text-secondary shrink-0">
                      <span className="w-1.5 h-1.5 rounded-full bg-secondary animate-pulse" />
                      Connected
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-on-surface-variant/50">
                    <span>{loc.custodian_name}</span>
                    <span>{loc.asset_count} assets</span>
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-on-surface-variant/35">
                    <span>Last audit</span>
                    <span>{formatDate(loc.last_audit)}</span>
                  </div>
                  <div className="mt-2 pt-2 border-t border-outline-variant/15 text-xs text-on-surface-variant/50 tabular-nums">
                    {formatCurrency(loc.total_value)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>


      {/* ── Tier Health tile ────────────────────────────────────────────────── */}
      {tierHealth && (
        <button
          onClick={() => onNavigate?.('tier')}
          className="w-full text-left glass-panel rounded-xl p-6 border border-outline-variant/20 hover:border-primary/20 transition-colors group"
        >
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Layers className="w-4 h-4 text-primary/60" />
                <span className="font-headline italic text-xl text-on-surface">Tier Health</span>
              </div>
              <p className="text-2xl font-light text-on-surface tabular-nums">
                <span
                  style={{
                    color: tierHealth.in_range === 4
                      ? '#4edea3'
                      : tierHealth.in_range >= 2
                        ? '#f59e0b'
                        : '#ffb4ab',
                  }}
                >
                  {tierHealth.in_range} of 4
                </span>
                <span className="text-on-surface-variant/50 text-lg ml-1">Tiers In Range</span>
              </p>
            </div>
            <div className="flex items-center gap-3 shrink-0 pt-1">
              {tierHealth.tiers.map(t => {
                const color = t.status === 'green' ? '#4edea3'
                  : t.status === 'amber' ? '#f59e0b'
                  : '#ffb4ab';
                return (
                  <div key={t.tier_id} className="text-center">
                    <div
                      className="w-3 h-3 rounded-full mx-auto mb-1"
                      style={{ backgroundColor: color, boxShadow: `0 0 6px ${color}60` }}
                      title={t.name}
                    />
                    <div className="text-[9px] text-on-surface-variant/40">T{t.tier_id}</div>
                  </div>
                );
              })}
            </div>
          </div>
          <p className="text-[11px] text-on-surface-variant/30 mt-3 group-hover:text-on-surface-variant/50 transition-colors">
            Click to view full tier allocation →
          </p>
        </button>
      )}

    </div>
    {showAddAsset && (
      <AssetModal
        entities={entities}
        locations={locations}
        onClose={() => setShowAddAsset(false)}
        onSaved={asset => {
          setAssets(prev => [...prev, asset]);
          setShowAddAsset(false);
        }}
      />
    )}
    </>
  );
}
