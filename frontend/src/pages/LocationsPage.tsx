import { useState, useEffect, useRef } from 'react';
import { MapPin, Plus, X, Shield } from 'lucide-react';
import { api } from '../api';
import type { AssetLocation, Asset, CreateAssetLocation } from '../types';
import type { EntityFilter } from '../layouts/AppShell';

// ─── Mini world map SVG (Web Mercator, 1000×500 viewBox) ─────────────────────
// Approximate continent outlines — hand-simplified from Natural Earth data
const CONTINENT_PATHS = [
  // North America
  'M 78,108 L 88,80 L 120,68 L 158,72 L 175,90 L 192,115 L 195,175 L 185,220 L 195,280 L 215,320 L 240,378 L 230,385 L 195,360 L 175,330 L 140,275 L 115,220 L 82,180 L 68,140 Z',
  // Greenland
  'M 290,52 L 335,42 L 385,55 L 405,85 L 380,105 L 340,110 L 305,98 L 288,75 Z',
  // South America
  'M 210,370 L 262,348 L 289,375 L 298,425 L 285,468 L 258,490 L 228,488 L 200,458 L 193,410 L 200,385 Z',
  // Europe (rough)
  'M 428,158 L 454,138 L 488,128 L 522,122 L 558,132 L 570,158 L 556,188 L 528,208 L 506,225 L 476,228 L 452,210 L 436,185 Z',
  // Africa
  'M 448,218 L 530,212 L 572,238 L 580,315 L 558,398 L 510,458 L 468,468 L 422,435 L 398,360 L 402,278 L 432,238 Z',
  // Asia + Middle East
  'M 562,132 L 628,92 L 718,72 L 808,60 L 900,82 L 958,118 L 978,165 L 950,198 L 900,215 L 848,228 L 795,258 L 732,272 L 672,265 L 628,248 L 592,220 L 568,188 L 558,162 Z',
  // India
  'M 648,228 L 680,222 L 700,245 L 698,292 L 680,328 L 655,322 L 640,290 L 638,260 Z',
  // SE Asia  
  'M 738,262 L 772,268 L 805,275 L 808,302 L 785,315 L 752,310 L 735,288 Z',
  // Japan
  'M 888,135 L 902,128 L 918,138 L 915,162 L 898,168 L 886,155 Z',
  // Australia
  'M 778,338 L 848,325 L 912,340 L 935,385 L 912,432 L 852,445 L 788,435 L 762,398 L 762,362 Z',
  // New Zealand
  'M 952,408 L 962,398 L 972,415 L 968,435 L 955,440 L 946,425 Z',
];

// ─── Helpers ──────────────────────────────────────────────────────────────────
function fmtCurrency(value: number): string {
  if (value >= 1_000_000) return '$' + (value / 1_000_000).toFixed(2) + 'M';
  if (value >= 1_000) return '$' + (value / 1_000).toFixed(1) + 'K';
  return '$' + value.toFixed(0);
}

const SECURITY_LABELS: Record<string, { label: string; color: string }> = {
  high_security: { label: 'High Security', color: 'text-secondary border-secondary/20 bg-secondary-container/20' },
  medium_security: { label: 'Medium Security', color: 'text-primary border-primary/20 bg-primary/10' },
  standard: { label: 'Standard', color: 'text-on-surface-variant border-outline-variant/30 bg-surface-high/30' },
};

const AUDIT_LABELS: Record<string, { label: string; color: string }> = {
  annual: { label: 'Annual', color: 'text-on-surface-variant' },
  semi_annual: { label: 'Semi-Annual', color: 'text-tertiary' },
  quarterly: { label: 'Quarterly', color: 'text-secondary' },
};

// ─── World Map Component ──────────────────────────────────────────────────────
interface MapProps {
  locations: AssetLocation[];
  assets: Asset[];
}

function WorldMap({ locations, assets }: MapProps) {
  const [tooltip, setTooltip] = useState<{ loc: AssetLocation; x: number; y: number } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  function getLocationAssets(locationId: number) {
    return assets.filter(a => a.location_id === locationId);
  }

  function handlePinEnter(loc: AssetLocation) {
    setTooltip({ loc, x: loc.map_x_pct, y: loc.map_y_pct });
  }

  return (
    <div
      ref={containerRef}
      className="relative h-[500px] bg-surface-low rounded-xl border border-outline-variant/20 overflow-hidden"
      onMouseLeave={() => setTooltip(null)}
    >
      {/* Graticule overlay (subtle grid) */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: [
            'linear-gradient(rgba(233,195,73,0.018) 1px, transparent 1px)',
            'linear-gradient(90deg, rgba(233,195,73,0.018) 1px, transparent 1px)',
          ].join(','),
          backgroundSize: '100px 66.7px',
        }}
      />

      {/* World map SVG */}
      <svg
        viewBox="0 0 1000 500"
        className="absolute inset-0 w-full h-full"
        preserveAspectRatio="xMidYMid meet"
      >
        <defs>
          <filter id="land-shadow">
            <feDropShadow dx="0" dy="1" stdDeviation="3" floodColor="#000" floodOpacity="0.4" />
          </filter>
        </defs>
        {/* Ocean background */}
        <rect width="1000" height="500" fill="#0d1828" />
        {/* Continent fills */}
        {CONTINENT_PATHS.map((d, i) => (
          <path
            key={i}
            d={d}
            fill="#1a2640"
            stroke="#253450"
            strokeWidth="1"
            filter="url(#land-shadow)"
          />
        ))}
      </svg>

      {/* Pin layer */}
      {locations.map(loc => {
        const locAssets = getLocationAssets(loc.id);
        return (
          <div
            key={loc.id}
            className="absolute -translate-x-1/2 -translate-y-1/2 cursor-pointer z-10 group"
            style={{ left: `${loc.map_x_pct}%`, top: `${loc.map_y_pct}%` }}
            onMouseEnter={() => handlePinEnter(loc)}
          >
            {/* Outer pulse ring */}
            <div className="w-8 h-8 rounded-full bg-primary/10 animate-ping absolute -inset-2 opacity-60" />
            {/* Pin dot */}
            <div
              className="w-4 h-4 rounded-full bg-primary"
              style={{ boxShadow: '0 0 15px rgba(233,195,73,0.8), 0 0 4px rgba(233,195,73,1)' }}
            />
            {/* Asset count badge */}
            {locAssets.length > 0 && (
              <div className="absolute -top-2 -right-2 w-4 h-4 bg-surface-high border border-primary/40 rounded-full flex items-center justify-center">
                <span className="text-[9px] font-bold text-primary">{locAssets.length}</span>
              </div>
            )}
          </div>
        );
      })}

      {/* Hover tooltip */}
      {tooltip && (() => {
        const locAssets = getLocationAssets(tooltip.loc.id);
        const totalValue = locAssets.reduce((s, a) => s + parseFloat(a.current_value), 0);
        // Flip tooltip if too close to right edge
        const flipX = tooltip.x > 75;
        const flipY = tooltip.y > 65;
        return (
          <div
            className="absolute z-20 glass-panel rounded-xl p-4 border border-primary/15 shadow-panel min-w-[200px] pointer-events-none"
            style={{
              left: flipX ? `${tooltip.x - 2}%` : `${tooltip.x + 2}%`,
              top: flipY ? `${tooltip.y - 2}%` : `${tooltip.y + 2}%`,
              transform: `translate(${flipX ? '-100%' : '0'}, ${flipY ? '-100%' : '0'})`,
            }}
          >
            <div className="flex items-start gap-2 mb-2">
              <MapPin className="w-3.5 h-3.5 text-primary mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-medium text-on-surface">{tooltip.loc.name}</p>
                <p className="text-[11px] text-on-surface-variant/60">{tooltip.loc.custodian_name}</p>
              </div>
            </div>
            <div className="text-[11px] text-on-surface-variant/50 mt-2 space-y-0.5">
              <div className="flex justify-between gap-4">
                <span>Assets</span>
                <span className="text-on-surface">{locAssets.length}</span>
              </div>
              {totalValue > 0 && (
                <div className="flex justify-between gap-4">
                  <span>Value</span>
                  <span className="text-primary tabular-nums">{fmtCurrency(totalValue)}</span>
                </div>
              )}
            </div>
          </div>
        );
      })()}

      {/* Legend */}
      <div className="absolute bottom-4 right-4 flex items-center gap-2 px-3 py-2 bg-surface-base/70 backdrop-blur-sm rounded-lg border border-outline-variant/20">
        <span className="w-3 h-3 bg-primary rounded-full" style={{ boxShadow: '0 0 6px rgba(233,195,73,0.7)' }} />
        <span className="text-[10px] text-on-surface-variant/60">Custody Location</span>
      </div>
    </div>
  );
}

// ─── Add Location Modal ───────────────────────────────────────────────────────
interface AddLocationModalProps {
  onClose: () => void;
  onSave: (loc: AssetLocation) => void;
}

const EMPTY_FORM: CreateAssetLocation = {
  name: '',
  country_code: '',
  custodian_name: '',
  map_x_pct: 50,
  map_y_pct: 40,
};

function AddLocationModal({ onClose, onSave }: AddLocationModalProps) {
  const [form, setForm] = useState<CreateAssetLocation>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const saved = await api.locations.create(form);
      onSave(saved);
    } catch (err) {
      setError(String(err));
    } finally {
      setSaving(false);
    }
  }

  const inputClass = "w-full bg-surface-high/50 border border-outline-variant/30 rounded px-3 py-2 text-sm text-on-surface placeholder:text-on-surface-variant/30 focus:outline-none focus:border-primary/40";
  const labelClass = "text-xs text-on-surface-variant/60 font-label uppercase tracking-wider mb-1 block";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" onClick={onClose} />
      <div className="relative glass-panel rounded-xl p-6 border border-outline-variant/20 w-full max-w-md shadow-panel">
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-headline italic text-xl text-on-surface">New Location</h2>
          <button onClick={onClose} className="text-on-surface-variant/50 hover:text-on-surface transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className={labelClass}>Location Name</label>
            <input required className={inputClass} placeholder="e.g. Zurich Private Vault" value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Country Code</label>
              <input required className={inputClass} placeholder="CHE" maxLength={3} value={form.country_code}
                onChange={e => setForm(f => ({ ...f, country_code: e.target.value.toUpperCase() }))} />
            </div>
            <div>
              <label className={labelClass}>Custodian</label>
              <input required className={inputClass} placeholder="Swiss Gold Safe AG" value={form.custodian_name}
                onChange={e => setForm(f => ({ ...f, custodian_name: e.target.value }))} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Map X % (0–100)</label>
              <input required type="number" step="0.1" min="0" max="100" className={inputClass}
                value={form.map_x_pct}
                onChange={e => setForm(f => ({ ...f, map_x_pct: parseFloat(e.target.value) }))} />
            </div>
            <div>
              <label className={labelClass}>Map Y % (0–100)</label>
              <input required type="number" step="0.1" min="0" max="100" className={inputClass}
                value={form.map_y_pct}
                onChange={e => setForm(f => ({ ...f, map_y_pct: parseFloat(e.target.value) }))} />
            </div>
          </div>
          <p className="text-xs text-on-surface-variant/40">
            Pin coordinates as % of the world map container (x: 0=left 100=right, y: 0=top 100=bottom)
          </p>
          {error && <p className="text-xs text-error">{error}</p>}
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 py-2 rounded border border-outline-variant/30 text-sm text-on-surface-variant hover:text-on-surface transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={saving} className="flex-1 py-2 rounded bg-primary/15 border border-primary/25 text-sm text-primary font-medium hover:bg-primary/20 transition-colors disabled:opacity-50">
              {saving ? 'Saving…' : 'Add Location'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────
interface Props {
  entityFilter: EntityFilter;
}

export default function LocationsPage({ entityFilter }: Props) {
  const [locations, setLocations] = useState<AssetLocation[]>([]);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);

  useEffect(() => {
    setLoading(true);
    Promise.all([api.locations.list(), api.assets.list()])
      .then(([l, a]) => { setLocations(l); setAssets(a); })
      .catch(err => setError(String(err)))
      .finally(() => setLoading(false));
  }, []);

  const filteredAssets = entityFilter === 'global'
    ? assets
    : assets.filter(a => a.entity_type === entityFilter);

  function getLocationAssets(locationId: number) {
    return filteredAssets.filter(a => a.location_id === locationId);
  }

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center h-64">
        <div className="text-on-surface-variant/50 text-sm">Loading locations…</div>
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
    <div className="p-6 space-y-6">
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-headline italic text-3xl text-on-surface">Asset Locations</h1>
          <p className="text-on-surface-variant/60 text-sm mt-1">
            {locations.length} custody locations ·{' '}
            <span className="text-primary capitalize">{entityFilter}</span>
          </p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-primary/10 hover:bg-primary/15 border border-primary/20 rounded text-sm text-primary font-medium transition-colors shrink-0"
        >
          <Plus className="w-3.5 h-3.5" />
          New Location
        </button>
      </div>

      {/* ── World Map ──────────────────────────────────────────────────────── */}
      <WorldMap locations={locations} assets={filteredAssets} />

      {/* ── Inventory Table ────────────────────────────────────────────────── */}
      <div className="glass-panel rounded-xl border border-outline-variant/20 overflow-hidden">
        <div className="px-5 py-4 border-b border-outline-variant/15">
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-primary/50" />
            <h2 className="font-headline italic text-xl text-on-surface">Custody Inventory</h2>
          </div>
        </div>

        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-outline-variant/15">
              <th className="px-5 py-3 text-left text-[11px] font-medium text-on-surface-variant/50 uppercase tracking-wider">Location / Asset</th>
              <th className="px-5 py-3 text-left text-[11px] font-medium text-on-surface-variant/50 uppercase tracking-wider">Spec / Qty</th>
              <th className="px-5 py-3 text-right text-[11px] font-medium text-on-surface-variant/50 uppercase tracking-wider">Valuation</th>
              <th className="px-5 py-3 text-center text-[11px] font-medium text-on-surface-variant/50 uppercase tracking-wider">Audit Freq.</th>
              <th className="px-5 py-3 text-center text-[11px] font-medium text-on-surface-variant/50 uppercase tracking-wider">Audit Status</th>
              <th className="px-5 py-3 text-center text-[11px] font-medium text-on-surface-variant/50 uppercase tracking-wider">Security</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-outline-variant/10">
            {locations.map(loc => {
              const locAssets = getLocationAssets(loc.id);
              return locAssets.map((asset, idx) => {
                const auditStatus = asset.last_audit_date ? 'CERTIFIED' : 'Audit Pending';
                const auditStatusColor = asset.last_audit_date
                  ? 'bg-secondary-container/20 border-secondary/20 text-secondary'
                  : 'border-error/20 text-error';
                const security = SECURITY_LABELS[asset.security_class] ?? { label: asset.security_class, color: 'text-on-surface-variant' };
                const auditFreq = AUDIT_LABELS[asset.audit_frequency] ?? { label: asset.audit_frequency, color: 'text-on-surface-variant' };
                return (
                  <tr key={asset.id} className="hover:bg-surface-high/20 transition-colors">
                    <td className="px-5 py-3.5">
                      {idx === 0 && (
                        <div className="flex items-center gap-1.5 text-[11px] text-on-surface-variant/40 mb-1">
                          <MapPin className="w-3 h-3" />
                          {loc.name} · {loc.custodian_name}
                        </div>
                      )}
                      <div className="text-on-surface font-medium">{asset.name}</div>
                      <div className="text-[11px] text-on-surface-variant/40 mt-0.5">{asset.entity_name}</div>
                    </td>
                    <td className="px-5 py-3.5 text-on-surface-variant/60 text-xs">
                      {asset.description ?? '—'}
                    </td>
                    <td className="px-5 py-3.5 text-right tabular-nums text-on-surface font-medium">
                      {fmtCurrency(parseFloat(asset.current_value))}
                    </td>
                    <td className="px-5 py-3.5 text-center">
                      <span className={`text-xs ${auditFreq.color}`}>{auditFreq.label}</span>
                    </td>
                    <td className="px-5 py-3.5 text-center">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium border ${auditStatusColor}`}>
                        {auditStatus}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-center">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium border ${security.color}`}>
                        {security.label}
                      </span>
                    </td>
                  </tr>
                );
              });
            })}
            {filteredAssets.filter(a => !a.location_id).length > 0 && (
              <tr>
                <td colSpan={6} className="px-5 py-3 text-xs text-on-surface-variant/30 text-center">
                  {filteredAssets.filter(a => !a.location_id).length} asset(s) without custody location
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* ── Add Location Modal ────────────────────────────────────────────── */}
      {showAddModal && (
        <AddLocationModal
          onClose={() => setShowAddModal(false)}
          onSave={newLoc => {
            setLocations(prev => [...prev, newLoc]);
            setShowAddModal(false);
          }}
        />
      )}
    </div>
  );
}
