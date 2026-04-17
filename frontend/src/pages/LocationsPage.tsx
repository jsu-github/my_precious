import { useState, useEffect, useMemo, useRef } from 'react';
import { ComposableMap, Geographies, Geography, Marker, ZoomableGroup } from 'react-simple-maps';
import { MapPin, Plus, X, Shield, CheckCircle, Pencil, Trash2, ArrowLeft, ChevronRight } from 'lucide-react';
import { api } from '../api';
import type { AssetLocation, Asset, CreateAssetLocation, UpdateAssetLocation } from '../types';
import type { EntityFilter } from '../layouts/AppShell';

const GEO_URL = '/world-atlas.json';

// ─── Helpers ──────────────────────────────────────────────────────────────────
function fmtCurrency(value: number): string {
  if (value >= 1_000_000) return '€' + (value / 1_000_000).toFixed(2) + 'M';
  if (value >= 1_000) return '€' + (value / 1_000).toFixed(1) + 'K';
  return '€' + value.toFixed(0);
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

const INITIAL_ZOOM = 4;
const INITIAL_CENTER: [number, number] = [5.3, 52.1]; // Netherlands

function WorldMap({ locations, assets }: MapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [tooltip, setTooltip] = useState<{ loc: AssetLocation; x: number; y: number } | null>(null);
  const [zoom, setZoom] = useState(INITIAL_ZOOM);
  const [center, setCenter] = useState<[number, number]>(INITIAL_CENTER);

  // Marker geometry scales inversely — pins stay ~5px on screen at any zoom
  const r  = 5   / zoom;
  const sw = 1.5 / zoom;
  const br = 5.5 / zoom;
  const bo = 6.5 / zoom;
  const fs = 6.5 / zoom;

  function getLocationAssets(locationId: number) {
    return assets.filter(a => a.location_id === locationId);
  }

  function handleMarkerEnter(loc: AssetLocation) {
    return (e: React.MouseEvent<SVGGElement>) => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      setTooltip({
        loc,
        x: ((e.clientX - rect.left) / rect.width)  * 100,
        y: ((e.clientY - rect.top)  / rect.height) * 100,
      });
    };
  }

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full rounded-xl overflow-hidden"
      style={{ background: 'linear-gradient(175deg, #d4eaf5 0%, #b6d8ed 100%)' }}
      onMouseLeave={() => setTooltip(null)}
    >
      <ComposableMap
        projectionConfig={{ scale: 145, center: [15, 15] }}
        width={800}
        height={420}
        style={{ width: '100%', height: '100%' }}
      >
        <ZoomableGroup
          zoom={zoom}
          center={center}
          minZoom={1}
          maxZoom={12}
          onMoveEnd={({ coordinates, zoom: z }) => {
            setCenter(coordinates as [number, number]);
            setZoom(z);
          }}
        >
          <Geographies geography={GEO_URL}>
          {({ geographies }) =>
            geographies.map(geo => (
              <Geography
                key={geo.rsmKey}
                geography={geo}
                fill="#dde9f0"
                stroke="#a8c4d2"
                strokeWidth={0.3 / zoom}
                style={{
                  default: { outline: 'none' },
                  hover:   { fill: '#cddde8', outline: 'none' },
                  pressed: { outline: 'none' },
                }}
              />
            ))
          }
        </Geographies>

        {locations
          .filter(loc =>
            loc.lat != null && loc.lon != null &&
            loc.lat >= -90 && loc.lat <= 90 &&
            loc.lon >= -180 && loc.lon <= 180
          )
          .map(loc => {
            const locAssets = getLocationAssets(loc.id);
            return (
              <Marker
                key={loc.id}
                coordinates={[loc.lon as number, loc.lat as number]}
                onMouseEnter={handleMarkerEnter(loc)}
                onMouseLeave={() => setTooltip(null)}
              >
                <circle r={r * 2.6} fill="rgba(42,52,57,0.10)" />
                <circle r={r} fill="#2a3439" stroke="#ffffff" strokeWidth={sw} />
                {locAssets.length > 0 && (
                  <>
                    <circle cx={bo} cy={-bo} r={br} fill="white" stroke="rgba(84,95,115,0.3)" strokeWidth={sw * 0.6} />
                    <text
                      x={bo} y={-bo + fs * 0.4}
                      textAnchor="middle"
                      fontSize={fs}
                      fontWeight="700"
                      fill="#545f73"
                      style={{ fontFamily: 'Inter, sans-serif' }}
                    >{locAssets.length}</text>
                  </>
                )}
              </Marker>
            );
          })}        </ZoomableGroup>      </ComposableMap>

      {/* Zoom controls — grouped pill */}
      <div className="absolute top-3 right-3 z-20 flex flex-col rounded-lg overflow-hidden shadow-sm border border-slate-200/80">
        <button
          onClick={() => setZoom(z => Math.min(z * 1.6, 12))}
          className="w-7 h-7 bg-white/95 text-slate-500 text-sm font-bold flex items-center justify-center hover:bg-white hover:text-slate-800 transition-colors border-b border-slate-100"
        >+</button>
        <button
          onClick={() => setZoom(z => Math.max(z / 1.6, 1))}
          className="w-7 h-7 bg-white/95 text-slate-500 text-sm font-bold flex items-center justify-center hover:bg-white hover:text-slate-800 transition-colors border-b border-slate-100"
        >−</button>
        <button
          onClick={() => { setZoom(INITIAL_ZOOM); setCenter(INITIAL_CENTER); }}
          className="w-7 h-7 bg-white/95 text-slate-400 text-[10px] font-bold flex items-center justify-center hover:bg-white hover:text-slate-600 transition-colors"
          title="Reset view to Netherlands"
        >⌖</button>
      </div>

      {/* Tooltip — rendered as HTML overlay, positioned by % */}
      {tooltip && (() => {
        const locAssets = getLocationAssets(tooltip.loc.id);
        const totalVal = locAssets.reduce((s, a) => s + parseFloat(a.current_value), 0);
        const flipX = tooltip.x > 70;
        const flipY = tooltip.y > 60;
        return (
          <div
            className="absolute z-20 glass-panel p-4 border border-slate-100 shadow-lg min-w-[200px] pointer-events-none"
            style={{
              left:      flipX ? `${tooltip.x - 2}%` : `${tooltip.x + 2}%`,
              top:       flipY ? `${tooltip.y - 2}%` : `${tooltip.y + 2}%`,
              transform: `translate(${flipX ? '-100%' : '0'}, ${flipY ? '-100%' : '0'})`,
            }}
          >
            <div className="flex items-start gap-2 mb-2">
              <MapPin className="w-3.5 h-3.5 text-primary mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-semibold text-on-surface">{tooltip.loc.name}</p>
                <p className="text-[11px] text-on-surface-variant/60">{tooltip.loc.custodian_name}</p>
              </div>
            </div>
            <div className="text-[11px] text-on-surface-variant/50 space-y-0.5">
              <div className="flex justify-between gap-4">
                <span>Assets</span>
                <span className="text-on-surface font-semibold">{locAssets.length}</span>
              </div>
              {totalVal > 0 && (
                <div className="flex justify-between gap-4">
                  <span>Value</span>
                  <span className="text-primary tabular-nums font-semibold">{fmtCurrency(totalVal)}</span>
                </div>
              )}
            </div>
          </div>
        );
      })()}

      <div className="absolute bottom-3 left-3 z-20 flex items-center gap-2 px-3 py-1.5 bg-white/80 backdrop-blur-sm rounded-lg border border-slate-100 shadow-sm">
        <span className="w-2.5 h-2.5 rounded-full bg-primary/70" />
        <span className="text-[10px] text-on-surface-variant/60 font-medium">Custody Location</span>
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
  lat: null,
  lon: null,
  insurance_amount: null,
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

  const inputClass = 'w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm text-on-surface placeholder:text-on-surface-variant/30 focus:outline-none focus:border-primary/40 focus:ring-2 focus:ring-primary/10';
  const labelClass = 'text-xs text-on-surface-variant/60 font-bold uppercase tracking-widest mb-1 block';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative glass-panel p-6 w-full max-w-md shadow-xl">
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-headline font-bold text-xl text-on-surface">New Location</h2>
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
              <label className={labelClass}>Latitude</label>
              <input required type="number" step="any" min="-90" max="90" className={inputClass}
                placeholder="47.3769"
                value={form.lat ?? ''}
                onChange={e => setForm(f => ({ ...f, lat: e.target.value === '' ? null : parseFloat(e.target.value) }))} />
            </div>
            <div>
              <label className={labelClass}>Longitude</label>
              <input required type="number" step="any" min="-180" max="180" className={inputClass}
                placeholder="8.5417"
                value={form.lon ?? ''}
                onChange={e => setForm(f => ({ ...f, lon: e.target.value === '' ? null : parseFloat(e.target.value) }))} />
            </div>
          </div>
          <p className="text-xs text-on-surface-variant/40">
            Geographic coordinates — e.g. Zurich: lat 47.3769, lon 8.5417 · Amsterdam: lat 52.3676, lon 4.9041
          </p>
          <div>
            <label className={labelClass}>Insurance Amount (€)</label>
            <input type="number" step="0.01" min="0" className={inputClass}
              placeholder="0.00"
              value={form.insurance_amount ?? ''}
              onChange={e => setForm(f => ({ ...f, insurance_amount: e.target.value === '' ? null : e.target.value }))} />
          </div>
          {error && <p className="text-xs text-red-500 font-medium">{error}</p>}
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 rounded-lg border border-slate-200 text-sm text-on-surface-variant hover:text-on-surface transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={saving} className="flex-1 py-2.5 rounded-lg bg-primary text-white text-sm font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50">
              {saving ? 'Saving…' : 'Add Location'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Edit Location Modal ──────────────────────────────────────────────────────
interface EditLocationModalProps {
  location: AssetLocation;
  onClose: () => void;
  onSave: (loc: AssetLocation) => void;
  onDelete: (id: number) => void;
}

function EditLocationModal({ location, onClose, onSave, onDelete }: EditLocationModalProps) {
  const [form, setForm] = useState<UpdateAssetLocation>({
    name: location.name,
    country_code: location.country_code,
    custodian_name: location.custodian_name,
    lat: location.lat,
    lon: location.lon,
    insurance_amount: location.insurance_amount,
  });
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const saved = await api.locations.update(location.id, form);
      onSave(saved);
    } catch (err) {
      setError(String(err));
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!confirmDelete) { setConfirmDelete(true); return; }
    setDeleting(true);
    try {
      await api.locations.delete(location.id);
      onDelete(location.id);
    } catch (err) {
      setError(String(err));
      setDeleting(false);
      setConfirmDelete(false);
    }
  }

  const inputClass = 'w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm text-on-surface placeholder:text-on-surface-variant/30 focus:outline-none focus:border-primary/40 focus:ring-2 focus:ring-primary/10';
  const labelClass = 'text-xs text-on-surface-variant/60 font-bold uppercase tracking-widest mb-1 block';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative glass-panel p-6 w-full max-w-md shadow-xl">
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-headline font-bold text-xl text-on-surface">Edit Location</h2>
          <button onClick={onClose} className="text-on-surface-variant/50 hover:text-on-surface transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className={labelClass}>Location Name</label>
            <input required className={inputClass} value={form.name ?? ''}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Country Code</label>
              <input required className={inputClass} maxLength={3} value={form.country_code ?? ''}
                onChange={e => setForm(f => ({ ...f, country_code: e.target.value.toUpperCase() }))} />
            </div>
            <div>
              <label className={labelClass}>Custodian</label>
              <input required className={inputClass} value={form.custodian_name ?? ''}
                onChange={e => setForm(f => ({ ...f, custodian_name: e.target.value }))} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Latitude</label>
              <input type="number" step="any" min="-90" max="90" className={inputClass}
                placeholder="47.3769"
                value={form.lat ?? ''}
                onChange={e => setForm(f => ({ ...f, lat: e.target.value === '' ? null : parseFloat(e.target.value) }))} />
            </div>
            <div>
              <label className={labelClass}>Longitude</label>
              <input type="number" step="any" min="-180" max="180" className={inputClass}
                placeholder="8.5417"
                value={form.lon ?? ''}
                onChange={e => setForm(f => ({ ...f, lon: e.target.value === '' ? null : parseFloat(e.target.value) }))} />
            </div>
          </div>
          <p className="text-xs text-on-surface-variant/40">
            e.g. Zurich: lat 47.3769, lon 8.5417 · Amsterdam: lat 52.3676, lon 4.9041
          </p>
          <div>
            <label className={labelClass}>Insurance Amount (€)</label>
            <input type="number" step="0.01" min="0" className={inputClass}
              placeholder="0.00"
              value={form.insurance_amount ?? ''}
              onChange={e => setForm(f => ({ ...f, insurance_amount: e.target.value === '' ? null : e.target.value }))} />
          </div>
          {error && <p className="text-xs text-red-500 font-medium">{error}</p>}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={handleDelete}
              disabled={deleting}
              className={`py-2.5 px-4 rounded-lg text-sm font-semibold transition-colors disabled:opacity-50 ${
                confirmDelete
                  ? 'bg-red-500 text-white hover:bg-red-600'
                  : 'border border-red-200 text-red-500 hover:bg-red-50'
              }`}
            >
              {deleting ? 'Deleting…' : confirmDelete ? 'Confirm Delete' : 'Delete'}
            </button>
            <div className="flex-1" />
            <button type="button" onClick={onClose} className="py-2.5 px-4 rounded-lg border border-slate-200 text-sm text-on-surface-variant hover:text-on-surface transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={saving} className="py-2.5 px-4 rounded-lg bg-primary text-white text-sm font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50">
              {saving ? 'Saving…' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Sub-nav tabs ─────────────────────────────────────────────────────────────
const SUB_TABS = ['Asset Inventory', 'Locations', 'Compliance', 'Insurance'] as const;

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
  const [activeTab, setActiveTab] = useState<typeof SUB_TABS[number]>('Asset Inventory');
  const [editingLocation, setEditingLocation] = useState<AssetLocation | null>(null);
  const [selectedLocationId, setSelectedLocationId] = useState<number | null>(null);

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

  const totalValue = useMemo(
    () => filteredAssets.reduce((s, a) => s + parseFloat(a.current_value), 0),
    [filteredAssets],
  );

  const locationsWithAssets = useMemo(
    () => locations.filter(loc => filteredAssets.some(a => a.location_id === loc.id)),
    [locations, filteredAssets],
  );

  const topLocations = useMemo(() => {
    return locations.map(loc => {
      const locValue = filteredAssets.filter(a => a.location_id === loc.id)
        .reduce((s, a) => s + parseFloat(a.current_value), 0);
      return { ...loc, locValue };
    }).filter(l => l.locValue > 0).sort((a, b) => b.locValue - a.locValue).slice(0, 5);
  }, [locations, filteredAssets]);

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
            Custody &amp; Storage
          </p>
          <p className="font-headline font-extrabold tabular-nums leading-none text-on-surface" style={{ fontSize: 'clamp(2.6rem, 4vw, 3.2rem)' }}>
            {fmtCurrency(totalValue)}
          </p>
          <div className="flex items-center gap-3 mt-2">
            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-xs font-semibold">
              <CheckCircle className="w-3 h-3" />
              {locationsWithAssets.length} Site{locationsWithAssets.length !== 1 ? 's' : ''} Verified
            </div>
            <span className="text-xs text-on-surface-variant/40 capitalize">{entityFilter} view · {filteredAssets.length} assets</span>
          </div>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-1.5 px-4 py-2.5 rounded-lg text-sm font-semibold text-white transition-opacity hover:opacity-90 shrink-0"
          style={{ background: 'linear-gradient(135deg, #545f73 0%, #485367 100%)' }}
        >
          <Plus className="w-3.5 h-3.5" />
          New Location
        </button>
      </div>

      {/* ── Sub-nav tabs ──────────────────────────────────────────────────── */}
      <div className="flex items-center gap-1 border-b border-slate-100 -mb-2">
        {SUB_TABS.map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 pb-3 pt-1 text-sm font-semibold border-b-2 transition-colors ${
              activeTab === tab
                ? 'border-primary text-primary'
                : 'border-transparent text-on-surface-variant/50 hover:text-on-surface/70'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* ── Map + Storage Analytics + Inventory (Asset Inventory tab) ────── */}
      {activeTab === 'Asset Inventory' && (
        <>
      {/* ── Map + Storage Analytics ───────────────────────────────────────── */}
      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-12 lg:col-span-8 h-[420px]">
          <WorldMap locations={locations} assets={filteredAssets} />
        </div>
        <div className="col-span-12 lg:col-span-4 glass-panel p-6 flex flex-col gap-5">
          {selectedLocationId === null ? (
            /* ── Distribution list ── */
            <>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant/50 mb-0.5">Distribution</p>
                <h2 className="text-lg font-bold font-headline text-on-surface">Storage Analytics</h2>
              </div>
              <div className="flex-1 space-y-4">
                {topLocations.length === 0 ? (
                  <p className="text-sm text-on-surface-variant/40">No location data available.</p>
                ) : (
                  topLocations.map(loc => {
                    const pct = totalValue > 0 ? (loc.locValue / totalValue) * 100 : 0;
                    const insuranceAmt = loc.insurance_amount != null ? parseFloat(loc.insurance_amount) : null;
                    const underInsured = insuranceAmt != null && insuranceAmt < loc.locValue;
                    return (
                      <button
                        key={loc.id}
                        onClick={() => setSelectedLocationId(loc.id)}
                        className="w-full text-left group"
                      >
                        <div className="flex items-center justify-between mb-1">
                          <div className="min-w-0">
                            <p className="text-xs font-semibold text-on-surface leading-tight group-hover:text-primary transition-colors truncate">{loc.name}</p>
                            <p className="text-[10px] text-on-surface-variant/40">{loc.country_code}</p>
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            <span className="text-xs font-bold tabular-nums text-on-surface-variant">{pct.toFixed(0)}%</span>
                            <ChevronRight className="w-3 h-3 text-on-surface-variant/30 group-hover:text-primary transition-colors" />
                          </div>
                        </div>
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-[10px] tabular-nums text-on-surface-variant/60">{fmtCurrency(loc.locValue)}</span>
                          {insuranceAmt != null ? (
                            <span className={`text-[10px] tabular-nums font-semibold ${underInsured ? 'text-amber-500' : 'text-emerald-600'}`}>
                              ⛨ {fmtCurrency(insuranceAmt)}
                            </span>
                          ) : (
                            <span className="text-[10px] text-on-surface-variant/30">no insurance</span>
                          )}
                        </div>
                        <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden">
                          <div className="h-full rounded-full bg-primary/60 transition-all" style={{ width: `${pct}%` }} />
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
              <button className="w-full py-2.5 rounded-lg border border-slate-200 text-xs font-bold text-on-surface-variant/70 uppercase tracking-widest hover:bg-slate-50 transition-colors flex items-center justify-center gap-2">
                <Shield className="w-3.5 h-3.5" />
                Generate Security Audit
              </button>
            </>
          ) : (() => {
            /* ── Location detail view ── */
            const selLoc = locations.find(l => l.id === selectedLocationId);
            const selAssets = getLocationAssets(selectedLocationId);
            const selTotal = selAssets.reduce((s, a) => s + parseFloat(a.current_value), 0);
            return (
              <>
                <div className="flex items-start gap-3">
                  <button
                    onClick={() => setSelectedLocationId(null)}
                    className="p-1 rounded hover:bg-slate-100 text-on-surface-variant/50 hover:text-on-surface transition-colors mt-0.5 shrink-0"
                    aria-label="Back to distribution"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                  </button>
                  <div className="min-w-0">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant/50 mb-0.5">Location Detail</p>
                    <h2 className="text-base font-bold font-headline text-on-surface leading-tight truncate">{selLoc?.name}</h2>
                    <p className="text-[10px] text-on-surface-variant/40 mt-0.5 truncate">{selLoc?.custodian_name} · {selLoc?.country_code}</p>
                  </div>
                </div>
                <div className="flex-1 space-y-0 overflow-y-auto">
                  {selAssets.length === 0 ? (
                    <p className="text-sm text-on-surface-variant/40 py-6 text-center">No assets at this location.</p>
                  ) : (
                    selAssets.map(asset => (
                      <div key={asset.id} className="flex items-center justify-between gap-3 py-2.5 border-b border-slate-50 last:border-0">
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-on-surface truncate">{asset.name}</p>
                          <p className="text-[10px] text-on-surface-variant/40 truncate">{asset.entity_name}</p>
                        </div>
                        <span className="text-xs font-bold tabular-nums text-on-surface shrink-0">{fmtCurrency(parseFloat(asset.current_value))}</span>
                      </div>
                    ))
                  )}
                </div>
                {selAssets.length > 0 && (
                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant/50">{selAssets.length} asset{selAssets.length !== 1 ? 's' : ''}</span>
                    <span className="text-sm font-bold tabular-nums text-on-surface">{fmtCurrency(selTotal)}</span>
                  </div>
                )}
              </>
            );
          })()}
        </div>
      </div>

      {/* ── Inventory Table ───────────────────────────────────────────────── */}
      <div className="glass-panel overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-primary/50" />
            <h2 className="text-base font-bold font-headline text-on-surface">Custody Inventory</h2>
          </div>
          <span className="text-[10px] text-on-surface-variant/40 uppercase tracking-widest font-bold">
            {filteredAssets.filter(a => a.location_id).length} secured assets
          </span>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50/60">
              <th className="px-5 py-3 text-left  text-[10px] font-bold uppercase tracking-widest text-on-surface-variant/50">Asset Description</th>
              <th className="px-5 py-3 text-left  text-[10px] font-bold uppercase tracking-widest text-on-surface-variant/50">Weight / Purity</th>
              <th className="px-5 py-3 text-center text-[10px] font-bold uppercase tracking-widest text-on-surface-variant/50">Security Status</th>
              <th className="px-5 py-3 text-right text-[10px] font-bold uppercase tracking-widest text-on-surface-variant/50">Market Value</th>
              <th className="px-5 py-3 text-left  text-[10px] font-bold uppercase tracking-widest text-on-surface-variant/50">Jurisdiction</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {locations.map(loc => {
              const locAssets = getLocationAssets(loc.id);
              return locAssets.map((asset, idx) => {
                const security = SECURITY_LABELS[asset.security_class]
                  ?? { label: asset.security_class, color: 'text-on-surface-variant border-slate-200 bg-slate-50' };
                const auditBadge = asset.last_audit_date
                  ? { label: 'Certified', color: 'bg-emerald-50 border-emerald-200 text-emerald-700' }
                  : { label: 'Pending', color: 'bg-amber-50 border-amber-200 text-amber-700' };
                return (
                  <tr key={asset.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="px-5 py-3.5">
                      {idx === 0 && (
                        <div className="flex items-center gap-1.5 text-[10px] text-on-surface-variant/40 mb-1 font-bold uppercase tracking-wider">
                          <MapPin className="w-2.5 h-2.5" />
                          {loc.name} · {loc.custodian_name}
                        </div>
                      )}
                      <p className="text-on-surface font-semibold">{asset.name}</p>
                      <p className="text-[11px] text-on-surface-variant/40 mt-0.5">{asset.entity_name}</p>
                    </td>
                    <td className="px-5 py-3.5 text-xs text-on-surface-variant/70">
                      {asset.description ?? '—'}
                    </td>
                    <td className="px-5 py-3.5 text-center">
                      <div className="flex flex-col items-center gap-1">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border ${security.color}`}>
                          {security.label}
                        </span>
                        <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-semibold border ${auditBadge.color}`}>
                          {auditBadge.label}
                        </span>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-right tabular-nums font-semibold text-on-surface">
                      {fmtCurrency(parseFloat(asset.current_value))}
                    </td>
                    <td className="px-5 py-3.5">
                      <p className="text-xs font-semibold text-on-surface">{loc.country_code}</p>
                      <p className="text-[10px] text-on-surface-variant/40">{AUDIT_LABELS[asset.audit_frequency]?.label ?? asset.audit_frequency}</p>
                    </td>
                  </tr>
                );
              });
            })}
            {filteredAssets.filter(a => !a.location_id).length > 0 && (
              <tr>
                <td colSpan={5} className="px-5 py-3 text-xs text-on-surface-variant/30 text-center">
                  {filteredAssets.filter(a => !a.location_id).length} asset(s) without custody location
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
        </>
      )}

      {/* ── Locations management tab ──────────────────────────────────────── */}
      {activeTab === 'Locations' && (
        <div className="glass-panel overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-primary/50" />
              <h2 className="text-base font-bold font-headline text-on-surface">Location Management</h2>
            </div>
            <span className="text-[10px] text-on-surface-variant/40 uppercase tracking-widest font-bold">
              {locations.length} location{locations.length !== 1 ? 's' : ''}
            </span>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/60">
                <th className="px-5 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-on-surface-variant/50">Name / Custodian</th>
                <th className="px-5 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-on-surface-variant/50">Country</th>
                <th className="px-5 py-3 text-center text-[10px] font-bold uppercase tracking-widest text-on-surface-variant/50">Assets</th>
                <th className="px-5 py-3 text-right text-[10px] font-bold uppercase tracking-widest text-on-surface-variant/50">Total Stored</th>
                <th className="px-5 py-3 text-right text-[10px] font-bold uppercase tracking-widest text-on-surface-variant/50">Insurance</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {locations.map(loc => {
                const locAssets = assets.filter(a => a.location_id === loc.id);
                const locValue = locAssets.reduce((s, a) => s + parseFloat(a.current_value), 0);
                const insuranceAmt = loc.insurance_amount != null ? parseFloat(loc.insurance_amount) : null;
                const coverageOk = insuranceAmt != null && insuranceAmt >= locValue;
                return (
                  <tr key={loc.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="px-5 py-3.5">
                      <p className="font-semibold text-on-surface">{loc.name}</p>
                      <p className="text-[11px] text-on-surface-variant/40 mt-0.5">{loc.custodian_name}</p>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="text-xs font-bold text-on-surface-variant/70">{loc.country_code}</span>
                    </td>
                    <td className="px-5 py-3.5 text-center">
                      <span className="text-xs font-bold text-on-surface-variant">{locAssets.length}</span>
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <span className="text-xs tabular-nums font-semibold text-on-surface">{fmtCurrency(locValue)}</span>
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      {insuranceAmt == null ? (
                        <span className="text-[10px] font-semibold text-slate-400">—</span>
                      ) : (
                        <div className="flex flex-col items-end gap-0.5">
                          <span className={`text-xs tabular-nums font-semibold ${coverageOk ? 'text-emerald-600' : 'text-amber-600'}`}>
                            {fmtCurrency(insuranceAmt)}
                          </span>
                          {!coverageOk && (
                            <span className="text-[9px] font-bold text-amber-500 uppercase tracking-wide">Under-insured</span>
                          )}
                        </div>
                      )}
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <button
                        onClick={() => setEditingLocation(loc)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-primary border border-primary/20 hover:bg-primary/5 transition-colors"
                      >
                        <Pencil className="w-3 h-3" />
                        Edit
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {showAddModal && (
        <AddLocationModal
          onClose={() => setShowAddModal(false)}
          onSave={newLoc => { setLocations(prev => [...prev, newLoc]); setShowAddModal(false); }}
        />
      )}

      {editingLocation && (
        <EditLocationModal
          location={editingLocation}
          onClose={() => setEditingLocation(null)}
          onSave={updated => {
            setLocations(prev => prev.map(l => l.id === updated.id ? updated : l));
            setEditingLocation(null);
          }}
          onDelete={id => {
            setLocations(prev => prev.filter(l => l.id !== id));
            setEditingLocation(null);
          }}
        />
      )}
    </div>
  );
}
