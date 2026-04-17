import { useState, useEffect, useMemo } from 'react';
import { Plus, Pencil, Trash2, Check, X, Store, Building2, Download, RefreshCw, Shield, Bot } from 'lucide-react';
import { api } from '../api';
import type { Dealer, Asset } from '../types';
import { getDealerRate, toGrams } from '../utils/metalPricing';

// ─── Types ────────────────────────────────────────────────────────────────────
type MetalTab = 'gold' | 'silver' | 'platinum' | 'palladium';

interface DealerFormValues {
  name: string;
  contact_notes: string;
  we_buy_gold_per_gram: string;
  we_buy_gold_coin_per_gram: string;
  we_buy_silver_bar_per_gram: string;
  we_buy_silver_coin_per_gram: string;
  we_buy_platinum_per_gram: string;
  we_buy_palladium_per_gram: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────
const METAL_TABS: { id: MetalTab; label: string; symbol: string }[] = [
  { id: 'gold',      label: 'Gold',      symbol: 'Au' },
  { id: 'silver',    label: 'Silver',    symbol: 'Ag' },
  { id: 'platinum',  label: 'Platinum',  symbol: 'Pt' },
  { id: 'palladium', label: 'Palladium', symbol: 'Pd' },
];

const CHIP_DOTS: { field: keyof Dealer; dot: string; label: string }[] = [
  { field: 'we_buy_gold_per_gram',        dot: 'bg-yellow-400',  label: 'Au Bar' },
  { field: 'we_buy_gold_coin_per_gram',   dot: 'bg-yellow-300',  label: 'Au Coin' },
  { field: 'we_buy_silver_bar_per_gram',  dot: 'bg-slate-400',   label: 'Ag Bar' },
  { field: 'we_buy_silver_coin_per_gram', dot: 'bg-slate-300',   label: 'Ag Coin' },
  { field: 'we_buy_platinum_per_gram',    dot: 'bg-violet-400',  label: 'Pt' },
  { field: 'we_buy_palladium_per_gram',   dot: 'bg-blue-400',    label: 'Pd' },
];

const RATE_FIELDS: { key: keyof Dealer; label: string }[] = [
  { key: 'we_buy_gold_per_gram',           label: 'Au 1g' },
  { key: 'we_buy_gold_1oz_bar_per_gram',   label: 'Au 1oz bar' },
  { key: 'we_buy_gold_50g_bar_per_gram',   label: 'Au 50g bar' },
  { key: 'we_buy_gold_100g_bar_per_gram',  label: 'Au 100g bar' },
  { key: 'we_buy_gold_coin_per_gram',      label: 'Au Coin' },
  { key: 'we_buy_silver_bar_per_gram',     label: 'Ag 1g' },
  { key: 'we_buy_silver_100oz_bar_per_gram', label: 'Ag 100oz bar' },
  { key: 'we_buy_silver_coin_per_gram',    label: 'Ag Coin' },
  { key: 'we_buy_platinum_per_gram',       label: 'Pt' },
  { key: 'we_buy_palladium_per_gram',      label: 'Pd' },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────


function fmtEur(v: number, fractions = 2): string {
  return '€' + v.toLocaleString('en-EU', { minimumFractionDigits: fractions, maximumFractionDigits: fractions });
}

function freshnessClass(iso: string): string {
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
  if (days <= 1) return 'text-secondary';
  if (days <= 7) return 'text-on-surface-variant/50';
  return 'text-error/60';
}

function daysAgo(iso: string): string {
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
  if (days === 0) return 'Today';
  if (days === 1) return '1d ago';
  return `${days}d ago`;
}

function fmtDateTime(iso: string): string {
  return new Date(iso).toLocaleString('en-GB', {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function toTroyOzPrice(ratePerGram: string | null | undefined): number | null {
  if (!ratePerGram) return null;
  const parsed = parseFloat(ratePerGram);
  if (!Number.isFinite(parsed)) return null;
  return parsed * 31.1035;
}

const emptyForm = (): DealerFormValues => ({
  name: '', contact_notes: '',
  we_buy_gold_per_gram: '', we_buy_gold_coin_per_gram: '',
  we_buy_silver_bar_per_gram: '', we_buy_silver_coin_per_gram: '',
  we_buy_platinum_per_gram: '', we_buy_palladium_per_gram: '',
});

function dealerToForm(d: Dealer): DealerFormValues {
  return {
    name:                        d.name,
    contact_notes:               d.contact_notes ?? '',
    we_buy_gold_per_gram:        d.we_buy_gold_per_gram ?? '',
    we_buy_gold_coin_per_gram:   d.we_buy_gold_coin_per_gram ?? '',
    we_buy_silver_bar_per_gram:  d.we_buy_silver_bar_per_gram ?? '',
    we_buy_silver_coin_per_gram: d.we_buy_silver_coin_per_gram ?? '',
    we_buy_platinum_per_gram:    d.we_buy_platinum_per_gram ?? '',
    we_buy_palladium_per_gram:   d.we_buy_palladium_per_gram ?? '',
  };
}

// ─── Sub-components ───────────────────────────────────────────────────────────
function DealerChip({
  dealer, active, onSelect, onEdit,
}: {
  dealer: Dealer;
  active: boolean;
  onSelect: () => void;
  onEdit: () => void;
}) {
  const activeDots = CHIP_DOTS.filter(d => !!dealer[d.field]);
  return (
    <div className={[
      'group inline-flex items-center rounded-lg border transition-all cursor-pointer',
      active
        ? 'border-primary/50 bg-primary/10 shadow-[0_0_0_1px_rgba(var(--color-primary),.15)]'
        : 'border-outline-variant/30 hover:border-outline-variant/60 bg-surface-high/30 hover:bg-surface-high/50',
    ].join(' ')}>
      <button onClick={onSelect} className="flex items-center gap-2 pl-3 pr-2 py-2">
        <span className={`text-sm font-medium whitespace-nowrap ${active ? 'text-primary' : 'text-on-surface-variant/80'}`}>
          {dealer.name}
        </span>
        {activeDots.length > 0 && (
          <div className="flex gap-0.5">
            {activeDots.map(d => (
              <span key={String(d.field)} className={`w-1.5 h-1.5 rounded-full ${d.dot}`} title={d.label} />
            ))}
          </div>
        )}
      </button>
      <button
        onClick={e => { e.stopPropagation(); onEdit(); }}
        className="opacity-0 group-hover:opacity-100 w-7 h-full pr-1.5 flex items-center justify-center text-on-surface-variant/30 hover:text-primary transition-all"
        title="Edit"
      >
        <Pencil className="w-3 h-3" />
      </button>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function DealerPage() {
  const [dealers, setDealers]         = useState<Dealer[]>([]);
  const [assets, setAssets]           = useState<Asset[]>([]);
  const [loading, setLoading]         = useState(true);
  const [refreshingPrices, setRefreshingPrices] = useState(false);
  const [refreshNotice, setRefreshNotice] = useState<string | null>(null);
  const [pageError, setPageError]     = useState<string | null>(null);
  const [selectedDealerId, setSelectedDealerId] = useState<number | null>(null);
  const [activeTab, setActiveTab]     = useState<MetalTab>('gold');
  const [editingId, setEditingId]     = useState<number | 'new' | null>(null);
  const [formValues, setFormValues]   = useState<DealerFormValues>(emptyForm());
  const [saving, setSaving]           = useState(false);
  const [formError, setFormError]     = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);

  useEffect(() => {
    setLoading(true);
    Promise.all([api.dealers.list(), api.assets.list()])
      .then(([d, a]) => { setDealers(d); setAssets(a); })
      .catch(err => setPageError(String(err)))
      .finally(() => setLoading(false));
  }, []);

  const selectedDealer = useMemo(
    () => dealers.find(d => d.id === selectedDealerId) ?? null,
    [dealers, selectedDealerId],
  );

  const displayDealer = useMemo(() => {
    if (selectedDealer) return selectedDealer;
    const hollandGold = dealers.find(d => d.name.toLowerCase().replace(/\s+/g, '') === 'hollandgold');
    return hollandGold ?? dealers[0] ?? null;
  }, [dealers, selectedDealer]);

  const SPOT_PRICES = useMemo(() => ([
    {
      symbol: 'Au',
      metal: 'Gold',
      price: toTroyOzPrice(displayDealer?.we_buy_gold_per_gram),
      unit: '€/Troy oz (dealer)',
    },
    {
      symbol: 'Ag',
      metal: 'Silver',
      price: toTroyOzPrice(displayDealer?.we_buy_silver_bar_per_gram),
      unit: '€/Troy oz (dealer)',
    },
    {
      symbol: 'Pt',
      metal: 'Platinum',
      price: toTroyOzPrice(displayDealer?.we_buy_platinum_per_gram),
      unit: '€/Troy oz (dealer)',
    },
    {
      symbol: 'Pd',
      metal: 'Palladium',
      price: toTroyOzPrice(displayDealer?.we_buy_palladium_per_gram),
      unit: '€/Troy oz (dealer)',
    },
  ]), [displayDealer]);

  // Precious metal assets for the active metal tab
  const tabAssets = useMemo(
    () => assets.filter(a =>
      a.asset_class === 'precious_metals' &&
      a.sub_class?.toLowerCase() === activeTab,
    ),
    [assets, activeTab],
  );

  // ─── CRUD ─────────────────────────────────────────────────────────────────
  function startEdit(d: Dealer) {
    setEditingId(d.id);
    setFormValues(dealerToForm(d));
    setFormError(null);
    setConfirmDeleteId(null);
  }

  function startAdd() {
    setEditingId('new');
    setFormValues(emptyForm());
    setFormError(null);
    setConfirmDeleteId(null);
  }

  function cancelEdit() {
    setEditingId(null);
    setFormError(null);
    setConfirmDeleteId(null);
  }

  async function handleSave() {
    if (!formValues.name.trim()) { setFormError('Name is required.'); return; }
    setSaving(true);
    setFormError(null);
    try {
      const payload = {
        name:                        formValues.name.trim(),
        contact_notes:               formValues.contact_notes || null,
        we_buy_gold_per_gram:        formValues.we_buy_gold_per_gram || null,
        we_buy_gold_coin_per_gram:   formValues.we_buy_gold_coin_per_gram || null,
        we_buy_silver_bar_per_gram:  formValues.we_buy_silver_bar_per_gram || null,
        we_buy_silver_coin_per_gram: formValues.we_buy_silver_coin_per_gram || null,
        we_buy_platinum_per_gram:    formValues.we_buy_platinum_per_gram || null,
        we_buy_palladium_per_gram:   formValues.we_buy_palladium_per_gram || null,
      };
      if (editingId === 'new') {
        const created = await api.dealers.create(payload);
        setDealers(prev => [...prev, created]);
        setSelectedDealerId(created.id);
      } else {
        const updated = await api.dealers.update(editingId as number, payload);
        setDealers(prev => prev.map(d => d.id === updated.id ? updated : d));
      }
      setEditingId(null);
    } catch (err) {
      setFormError(String(err));
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: number) {
    setSaving(true);
    try {
      await api.dealers.delete(id);
      setDealers(prev => prev.filter(d => d.id !== id));
      if (selectedDealerId === id) setSelectedDealerId(null);
      if (editingId === id) setEditingId(null);
      setConfirmDeleteId(null);
    } catch (err) {
      setFormError(String(err));
    } finally {
      setSaving(false);
    }
  }

  async function handleRefreshPrices() {
    setRefreshingPrices(true);
    setPageError(null);
    setRefreshNotice(null);
    try {
      const targetDealerId = selectedDealerId ?? dealers.find(d => d.name === 'HollandGold')?.id ?? null;
      if (!targetDealerId) {
        throw new Error('Select a dealer first (or create HollandGold) before updating prices.');
      }
      const updated = await api.dealers.refreshPrices(targetDealerId);
      setDealers(prev => prev.map(d => (d.id === updated.id ? updated : d)));
      setSelectedDealerId(updated.id);
      setRefreshNotice(`Updated ${updated.name} at ${fmtDateTime(updated.updated_at)}`);
    } catch (err) {
      setPageError(String(err));
    } finally {
      setRefreshingPrices(false);
    }
  }

  // Static 24h trend bars (16 bars, relative heights 0–100)
  const TREND_BARS = [45, 52, 48, 61, 58, 72, 68, 65, 79, 84, 77, 82, 91, 88, 93, 97];

  // ─── Render ───────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center h-64">
        <div className="text-on-surface-variant/40 text-sm">Loading dealers…</div>
      </div>
    );
  }

  if (pageError) {
    return (
      <div className="p-8">
        <div className="glass-panel p-6 border border-red-200 text-red-600 text-sm">{pageError}</div>
      </div>
    );
  }

  const editingDealer = typeof editingId === 'number' ? dealers.find(d => d.id === editingId) : null;

  return (
    <div className="p-8 space-y-6 max-w-[1400px] mx-auto">

      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <div className="flex items-end justify-between gap-6">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant/60 mb-2">Precious Metals</p>
          <p className="font-headline font-extrabold leading-none text-on-surface" style={{ fontSize: 'clamp(2.6rem, 4vw, 3.2rem)' }}>
            Spot Prices
          </p>
          <p className="text-sm text-on-surface-variant/50 mt-2">
            {dealers.length} dealer{dealers.length !== 1 ? 's' : ''} · We Buy rates · per-product liquidation
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button className="flex items-center gap-2 px-4 py-2.5 rounded-lg border border-slate-200 bg-white text-sm font-medium text-on-surface-variant hover:bg-slate-50 transition-colors">
            <Download className="w-4 h-4" />
            Export Rates
          </button>
          <button
            onClick={handleRefreshPrices}
            disabled={refreshingPrices}
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold text-white transition-colors disabled:opacity-60"
            style={{ background: 'linear-gradient(135deg, #545f73 0%, #485367 100%)' }}
          >
            <RefreshCw className={`w-4 h-4 ${refreshingPrices ? 'animate-spin' : ''}`} />
            {refreshingPrices ? 'Refreshing...' : 'Update Prices'}
          </button>
        </div>
      </div>
      <div className="flex items-center justify-between text-xs text-on-surface-variant/45 -mt-3">
        <span>
          {displayDealer
            ? `Prices as of ${fmtDateTime(displayDealer.updated_at)}`
            : 'Select a dealer to view latest price timestamp'}
        </span>
        {refreshNotice && <span className="text-secondary">{refreshNotice}</span>}
      </div>

      {/* ── Spot Price Cards ─────────────────────────────────────────────── */}
      <div className="grid grid-cols-4 gap-4">
        {SPOT_PRICES.map(s => (
          <div key={s.symbol} className="glass-panel p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold font-mono text-white px-1.5 py-0.5 rounded" style={{ background: '#545f73' }}>{s.symbol}</span>
                <span className="text-xs text-on-surface-variant/60">{s.metal}</span>
              </div>
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-on-surface-variant/60">
                {displayDealer ? 'Dealer' : 'N/A'}
              </span>
            </div>
            <div className="font-headline font-extrabold text-on-surface tabular-nums" style={{ fontSize: '1.6rem' }}>
              {s.price != null ? fmtEur(s.price, 0) : '—'}
            </div>
            <div className="text-[10px] text-on-surface-variant/40 mt-0.5">{s.unit}</div>
          </div>
        ))}
      </div>

      {/* ══════════════════════════════════════════════════════════════════ */}
      {/* DEALER SELECTION                                                  */}
      {/* ══════════════════════════════════════════════════════════════════ */}
      <div className="glass-panel p-4 space-y-0">

        {/* Chip bar */}
        <div className="flex items-center gap-3 flex-wrap">
          <span className="text-[10px] text-on-surface-variant/35 uppercase tracking-wider shrink-0">Dealer</span>

          {dealers.map(d => (
            <DealerChip
              key={d.id}
              dealer={d}
              active={selectedDealerId === d.id}
              onSelect={() => setSelectedDealerId(prev => prev === d.id ? null : d.id)}
              onEdit={() => startEdit(d)}
            />
          ))}

          {editingId !== 'new' && (
            <button
              onClick={startAdd}
              className="inline-flex items-center gap-1.5 px-3 py-2 border border-dashed border-slate-200 hover:border-primary/30 rounded-lg text-xs text-on-surface-variant/40 hover:text-primary transition-all"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Dealer
            </button>
          )}
        </div>

        {/* ── Selected dealer rate panel ── */}
        {selectedDealer && editingId !== selectedDealer.id && (
          <div className="mt-4 pt-4 border-t border-slate-100">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-on-surface">{selectedDealer.name}</p>
                {selectedDealer.contact_notes && (
                  <p className="text-[11px] text-on-surface-variant/40 mt-0.5">{selectedDealer.contact_notes}</p>
                )}
                <p className={`text-[10px] mt-0.5 ${freshnessClass(selectedDealer.updated_at)}`}>
                  Rates updated {daysAgo(selectedDealer.updated_at)} · {fmtDateTime(selectedDealer.updated_at)}
                </p>
              </div>
              <button
                onClick={() => startEdit(selectedDealer)}
                className="flex items-center gap-1 px-2.5 py-1.5 text-xs text-on-surface-variant/40 hover:text-primary hover:bg-primary/5 rounded transition-colors shrink-0"
              >
                <Pencil className="w-3.5 h-3.5" />
                Edit Rates
              </button>
            </div>
            <div className="flex flex-wrap gap-5 mt-3">
              {RATE_FIELDS.map(r => {
                const val = selectedDealer[r.key] as string | null;
                return (
                  <div key={r.key} className="flex flex-col">
                    <span className="text-[10px] text-on-surface-variant/35 uppercase tracking-widest font-bold">{r.label}</span>
                    {val ? (
                      <span className="text-sm font-mono text-on-surface tabular-nums">
                        €{parseFloat(val).toFixed(2)}<span className="text-[10px] text-on-surface-variant/30 ml-0.5">/g</span>
                      </span>
                    ) : (
                      <span className="text-sm text-on-surface-variant/20">—</span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── Edit / Add form ── */}
        {editingId !== null && (
          <div className="mt-4 pt-4 border-t border-slate-100">
            <p className="text-[10px] text-on-surface-variant/40 uppercase tracking-wider mb-3">
              {editingId === 'new' ? 'New Dealer' : `Edit: ${editingDealer?.name}`}
            </p>

            <div className="grid grid-cols-2 gap-3 mb-3">
              <div>
                <label className={LABEL_CLS}>Name <span className="text-red-500">*</span></label>
                <input
                  autoFocus
                  type="text"
                  className={INPUT_CLS}
                  value={formValues.name}
                  onChange={e => setFormValues(v => ({ ...v, name: e.target.value }))}
                  placeholder="Dealer name"
                />
              </div>
              <div>
                <label className={LABEL_CLS}>Contact Notes</label>
                <input
                  type="text"
                  className={INPUT_CLS}
                  value={formValues.contact_notes}
                  onChange={e => setFormValues(v => ({ ...v, contact_notes: e.target.value }))}
                  placeholder="Phone, website, email…"
                />
              </div>
            </div>

            <div className="grid grid-cols-6 gap-3 mb-3">
              {RATE_FIELDS.map(f => (
                <div key={f.key}>
                  <label className={LABEL_CLS}>{f.label} (€/g)</label>
                  <input
                    type="text"
                    className={INPUT_CLS}
                    value={formValues[f.key as keyof DealerFormValues]}
                    onChange={e => setFormValues(v => ({ ...v, [f.key]: e.target.value }))}
                    placeholder="0.00"
                  />
                </div>
              ))}
            </div>

            {formError && <p className="text-xs text-red-500 mb-2">{formError}</p>}
            <div className="flex items-center gap-2">
              <button
                onClick={handleSave}
                disabled={saving || !formValues.name.trim()}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-primary/10 hover:bg-primary/15 border border-primary/25 rounded text-xs text-primary disabled:opacity-40 transition-colors"
              >
                <Check className="w-3.5 h-3.5" />
                {saving ? 'Saving…' : editingId === 'new' ? 'Add Dealer' : 'Save Changes'}
              </button>
              <button
                onClick={cancelEdit}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded text-xs text-on-surface-variant transition-colors"
              >
                <X className="w-3.5 h-3.5" />
                Cancel
              </button>

              {typeof editingId === 'number' && (
                confirmDeleteId === editingId ? (
                  <div className="ml-auto flex items-center gap-2">
                    <span className="text-xs text-red-500">Delete {editingDealer?.name}?</span>
                    <button
                      onClick={() => handleDelete(editingId as number)}
                      disabled={saving}
                      className="px-2.5 py-1 rounded bg-red-50 border border-red-200 text-red-500 text-xs hover:bg-red-100 transition-colors disabled:opacity-40"
                    >
                      {saving ? '…' : 'Confirm'}
                    </button>
                    <button
                      onClick={() => setConfirmDeleteId(null)}
                      className="px-2 py-1 rounded text-on-surface-variant/50 hover:text-on-surface text-xs transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setConfirmDeleteId(editingId as number)}
                    className="ml-auto flex items-center gap-1 px-2 py-1.5 text-xs text-on-surface-variant/25 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Delete
                  </button>
                )
              )}
            </div>
          </div>
        )}
      </div>

      {/* ══════════════════════════════════════════════════════════════════ */}
      {/* VENDOR CATALOG + PRICE TREND MATRIX                              */}
      {/* ══════════════════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-12 gap-6">

        {/* Vendor Catalog — col-span-8 */}
        <div className="col-span-12 lg:col-span-8 glass-panel overflow-hidden">

          <div className="px-5 py-3.5 border-b border-slate-100">
            <div className="flex items-baseline justify-between gap-3">
              <div>
                <h2 className="text-sm font-bold text-on-surface">Vendor Catalog</h2>
                <p className="text-[11px] text-on-surface-variant/40 mt-0.5">
                  {selectedDealer
                    ? `${selectedDealer.name} · we buy prices for your holdings`
                    : 'Select a dealer above to view product prices'
                  }
                </p>
              </div>
              <span className="text-[10px] text-on-surface-variant/30 tabular-nums shrink-0">
                {tabAssets.length} item{tabAssets.length !== 1 ? 's' : ''}
              </span>
            </div>
          </div>

          {/* Metal tabs */}
          <div className="flex border-b border-slate-100">
            {METAL_TABS.map(t => (
              <button
                key={t.id}
                onClick={() => setActiveTab(t.id)}
                className={[
                  'relative px-5 py-2.5 text-xs font-bold uppercase tracking-widest transition-colors shrink-0',
                  activeTab === t.id
                    ? 'text-primary after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-primary'
                    : 'text-on-surface-variant/40 hover:text-on-surface-variant',
                ].join(' ')}
              >
                {t.label}
                <span className="ml-1.5 text-[9px] font-mono text-on-surface-variant/30">{t.symbol}</span>
              </button>
            ))}
          </div>

          {!selectedDealer && (
            <div className="py-16 flex flex-col items-center gap-3 text-center">
              <div className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center">
                <Building2 className="w-5 h-5 text-on-surface-variant/20" />
              </div>
              <p className="text-sm text-on-surface-variant/35">Select a dealer above to view product prices</p>
            </div>
          )}

          {selectedDealer && tabAssets.length === 0 && (
            <div className="py-12 flex flex-col items-center gap-2 text-center">
              <Store className="w-7 h-7 text-on-surface-variant/15" />
              <p className="text-sm text-on-surface-variant/35 capitalize">No {activeTab} holdings</p>
              <p className="text-[11px] text-on-surface-variant/20">
                Add precious metal assets with the "{activeTab}" sub-class to see them here
              </p>
            </div>
          )}

          {selectedDealer && tabAssets.length > 0 && (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-50">
                  <th className="px-5 py-3 text-left text-[10px] font-bold text-on-surface-variant/50 uppercase tracking-widest w-[35%]">Product</th>
                  <th className="px-5 py-3 text-left text-[10px] font-bold text-on-surface-variant/50 uppercase tracking-widest">Spec</th>
                  <th className="px-5 py-3 text-right text-[10px] font-bold text-on-surface-variant/50 uppercase tracking-widest">Weight / Unit</th>
                  <th className="px-5 py-3 text-right text-[10px] font-bold text-on-surface-variant/50 uppercase tracking-widest">We Buy (€/g)</th>
                  <th className="px-5 py-3 text-right text-[10px] font-bold text-on-surface-variant/50 uppercase tracking-widest">Dealer Buy / Unit</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {tabAssets.map(asset => {
                  const rate          = getDealerRate(selectedDealer, asset.sub_class, asset.product_type, asset.weight_per_unit ? parseFloat(asset.weight_per_unit) : null, asset.weight_unit);
                  const rawWeight     = asset.weight_per_unit ? parseFloat(asset.weight_per_unit) : null;
                  const weightInGrams = rawWeight != null ? toGrams(rawWeight, asset.weight_unit) : null;
                  const unitBuy       = rate && weightInGrams ? rate * weightInGrams : null;

                  return (
                    <tr key={asset.id} className="hover:bg-slate-50/60 transition-colors border-l-4 border-l-transparent hover:border-l-primary/30">
                      <td className="px-5 py-3.5">
                        <div className="font-semibold text-on-surface">{asset.name}</div>
                        {asset.entity_name && (
                          <div className="text-[11px] text-on-surface-variant/35 mt-0.5">{asset.entity_name}</div>
                        )}
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-1 text-[11px] text-on-surface-variant/60">
                          {asset.sub_class && <span className="capitalize">{asset.sub_class}</span>}
                          {asset.product_type && <><span className="text-on-surface-variant/25">·</span><span className="capitalize">{asset.product_type}</span></>}
                          {!asset.sub_class && !asset.product_type && <span className="text-on-surface-variant/20">—</span>}
                        </div>
                      </td>
                      <td className="px-5 py-3.5 text-right font-mono tabular-nums">
                        {rawWeight != null ? (
                          <span className="text-on-surface">
                            {rawWeight % 1 === 0 ? rawWeight.toFixed(0) : rawWeight.toFixed(4).replace(/\.?0+$/, '')}
                            <span className="text-[10px] text-on-surface-variant/30 ml-0.5">{asset.weight_unit}</span>
                          </span>
                        ) : (
                          <span className="text-[11px] text-on-surface-variant/20">not set</span>
                        )}
                      </td>
                      <td className="px-5 py-3.5 text-right font-mono tabular-nums">
                        {rate != null ? (
                          <span className="text-on-surface-variant/70">
                            €{rate.toFixed(2)}<span className="text-[10px] text-on-surface-variant/30 ml-0.5">/g</span>
                          </span>
                        ) : (
                          <span className="text-[11px] text-on-surface-variant/20">—</span>
                        )}
                      </td>
                      <td className="px-5 py-3.5 text-right font-mono tabular-nums">
                        {unitBuy != null ? (
                          <span className="text-primary font-bold text-base">{fmtEur(unitBuy)}</span>
                        ) : (
                          <span className="text-[11px] text-on-surface-variant/25">
                            {!rate ? 'No rate set' : 'Set weight in Assets'}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Price Trend Matrix — col-span-4 */}
        <div className="col-span-12 lg:col-span-4 flex flex-col gap-5">
          <div className="glass-panel p-5 flex-1">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-on-surface">24h Price Trend</h3>
              <span className="text-[10px] text-on-surface-variant/40 uppercase tracking-widest font-bold">Gold</span>
            </div>
            {/* Mini bar chart */}
            <div className="flex items-end gap-1 h-20 mb-3">
              {TREND_BARS.map((h, i) => (
                <div
                  key={i}
                  className="flex-1 rounded-sm transition-all"
                  style={{ height: `${h}%`, background: i === TREND_BARS.length - 1 ? '#545f73' : 'rgba(84,95,115,0.25)' }}
                />
              ))}
            </div>
            <div className="flex justify-between text-[9px] text-on-surface-variant/35 font-bold uppercase tracking-wide">
              <span>00:00</span><span>06:00</span><span>12:00</span><span>18:00</span><span>Now</span>
            </div>
            <div className="mt-4 pt-4 border-t border-slate-100 space-y-2">
              {[
                { label: 'Open', value: '€82,150' },
                { label: '24h High', value: '€84,890', up: true },
                { label: '24h Low', value: '€81,820', up: false },
                { label: 'Current', value: '€84,264', primary: true },
              ].map(r => (
                <div key={r.label} className="flex items-center justify-between text-xs">
                  <span className="text-on-surface-variant/50">{r.label}</span>
                  <span className={`font-mono font-bold tabular-nums ${r.primary ? 'text-primary' : r.up ? 'text-emerald-600' : r.up === false && !r.primary ? 'text-red-500' : 'text-on-surface'}`}>
                    {r.value}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── Protection Plan Banner ────────────────────────────────────────── */}
      <div className="rounded-xl p-6 flex items-center justify-between gap-6" style={{ background: 'linear-gradient(135deg, #545f73 0%, #3d4859 60%, #2e3a4a 100%)' }}>
        <div className="flex items-start gap-4 text-white">
          <div className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center shrink-0 mt-0.5">
            <Shield className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="font-headline font-bold text-base">Price Protection Plan</h3>
            <p className="text-sm text-white/70 leading-relaxed mt-1">
              Set automated buy orders and price alerts. Configure bots to acquire holdings when spot prices dip below your target threshold.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <button className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-white/15 border border-white/25 text-sm font-semibold text-white hover:bg-white/25 transition-colors whitespace-nowrap">
            <Bot className="w-4 h-4" />
            Configure Bots
          </button>
          <button className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-white text-sm font-bold text-on-surface hover:bg-white/90 transition-colors whitespace-nowrap">
            Enable Auto-Buy
          </button>
        </div>
      </div>

    </div>
  );
}
