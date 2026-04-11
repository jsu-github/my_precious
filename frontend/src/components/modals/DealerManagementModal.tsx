import { useState, useEffect } from 'react';
import { Plus, Search, Building2, Pencil, Trash2, Check, X } from 'lucide-react';
import { api } from '../../api';
import type { Dealer } from '../../types';
import Modal from './Modal';
import { Input, ErrorMessage } from './FormFields';

// ─── Types ────────────────────────────────────────────────────────────────────
type PriceTab = 'gold-bars' | 'gold-coins' | 'silver-bars' | 'silver-coins' | 'pt-pd';

type PriceField =
  | 'we_buy_gold_per_gram'
  | 'we_buy_gold_coin_per_gram'
  | 'we_buy_silver_bar_per_gram'
  | 'we_buy_silver_coin_per_gram'
  | 'we_buy_platinum_per_gram'
  | 'we_buy_palladium_per_gram';

interface PriceFormValues {
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
const PRICE_TABS: { id: PriceTab; label: string }[] = [
  { id: 'gold-bars',    label: 'Gold Bars' },
  { id: 'gold-coins',   label: 'Gold Coins' },
  { id: 'silver-bars',  label: 'Silver Bars' },
  { id: 'silver-coins', label: 'Silver Coins' },
  { id: 'pt-pd',        label: 'Pt & Pd' },
];

const PRICE_TAB_META: Record<Exclude<PriceTab, 'pt-pd'>, { field: PriceField; hint: string }> = {
  'gold-bars':    { field: 'we_buy_gold_per_gram',        hint: '€ per gram pure Au · typically 1.5% below spot' },
  'gold-coins':   { field: 'we_buy_gold_coin_per_gram',   hint: '€ per gram pure Au · typically 2.0% below spot' },
  'silver-bars':  { field: 'we_buy_silver_bar_per_gram',  hint: '€ per gram pure Ag · typically 2.0% below spot' },
  'silver-coins': { field: 'we_buy_silver_coin_per_gram', hint: '€ per gram pure Ag · zakelijk excl. 21% BTW' },
};

const PT_PD_FIELDS: { field: PriceField; label: string; hint: string }[] = [
  { field: 'we_buy_platinum_per_gram',  label: 'Platinum',  hint: '€ per gram pure Pt · typically 2.0% below spot' },
  { field: 'we_buy_palladium_per_gram', label: 'Palladium', hint: '€ per gram pure Pd · at or near spot' },
];

const TAB_DOT_COLOR: Record<PriceTab, string> = {
  'gold-bars':    'bg-yellow-400/70',
  'gold-coins':   'bg-yellow-300/60',
  'silver-bars':  'bg-slate-400/70',
  'silver-coins': 'bg-slate-300/60',
  'pt-pd':        'bg-violet-400/60',
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
function daysAgo(iso: string): string {
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
  if (days === 0) return 'Updated today';
  if (days === 1) return 'Updated 1 day ago';
  return `Updated ${days} days ago`;
}

function freshnessClass(iso: string): string {
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
  if (days <= 1) return 'text-secondary';
  if (days <= 7) return 'text-on-surface-variant/40';
  return 'text-error/60';
}

function primaryPrice(dealer: Dealer): string | null {
  return (
    dealer.we_buy_gold_per_gram ||
    dealer.we_buy_gold_coin_per_gram ||
    dealer.we_buy_silver_bar_per_gram ||
    dealer.we_buy_silver_coin_per_gram ||
    dealer.we_buy_platinum_per_gram ||
    dealer.we_buy_palladium_per_gram ||
    null
  );
}

function tabHasPrice(tab: PriceTab, dealer: Dealer): boolean {
  if (tab === 'pt-pd') return !!(dealer.we_buy_platinum_per_gram || dealer.we_buy_palladium_per_gram);
  return !!dealer[PRICE_TAB_META[tab].field];
}

function tabHasPriceInForm(tab: PriceTab, values: PriceFormValues): boolean {
  if (tab === 'pt-pd') return !!(values.we_buy_platinum_per_gram || values.we_buy_palladium_per_gram);
  return !!values[PRICE_TAB_META[tab].field];
}

function dealerToFormValues(dealer: Dealer): PriceFormValues {
  return {
    name:                        dealer.name,
    contact_notes:               dealer.contact_notes ?? '',
    we_buy_gold_per_gram:        dealer.we_buy_gold_per_gram ?? '',
    we_buy_gold_coin_per_gram:   dealer.we_buy_gold_coin_per_gram ?? '',
    we_buy_silver_bar_per_gram:  dealer.we_buy_silver_bar_per_gram ?? '',
    we_buy_silver_coin_per_gram: dealer.we_buy_silver_coin_per_gram ?? '',
    we_buy_platinum_per_gram:    dealer.we_buy_platinum_per_gram ?? '',
    we_buy_palladium_per_gram:   dealer.we_buy_palladium_per_gram ?? '',
  };
}

const emptyFormValues = (): PriceFormValues => ({
  name: '', contact_notes: '',
  we_buy_gold_per_gram: '', we_buy_gold_coin_per_gram: '',
  we_buy_silver_bar_per_gram: '', we_buy_silver_coin_per_gram: '',
  we_buy_platinum_per_gram: '', we_buy_palladium_per_gram: '',
});

// ─── MetalPriceCard ───────────────────────────────────────────────────────────
interface MetalPriceCardProps {
  label: string;
  price: string | null;
  hint: string;
  editing: boolean;
  value: string;
  onChange: (val: string) => void;
}

function MetalPriceCard({ label, price, hint, editing, value, onChange }: MetalPriceCardProps) {
  const hasPrice = price !== null && price !== '';

  return (
    <div className={[
      'rounded-xl p-5 border transition-colors',
      editing
        ? 'bg-surface-high/30 border-primary/40'
        : hasPrice
          ? 'bg-surface-high/20 border-outline-variant/15'
          : 'bg-surface-high/10 border-dashed border-outline-variant/20',
    ].join(' ')}>
      <p className="text-[11px] uppercase tracking-wider text-on-surface-variant/40 mb-3">{label}</p>
      {editing ? (
        <div className="flex items-baseline gap-1">
          <span className="text-2xl font-mono font-light text-primary/60">€</span>
          <input
            type="number"
            min="0"
            step="0.0001"
            value={value}
            onChange={e => onChange(e.target.value)}
            placeholder="0.0000"
            className="text-3xl font-mono font-light text-primary bg-transparent border-b border-primary/40 focus:outline-none flex-1 min-w-0"
          />
          <span className="text-lg text-primary/40">/g</span>
        </div>
      ) : hasPrice ? (
        <p className="text-3xl font-mono font-light text-primary">
          €{Number(price).toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 4 })}
          <span className="text-lg text-primary/40">/g</span>
        </p>
      ) : (
        <p className="text-sm text-on-surface-variant/20">No price set — click Edit to add</p>
      )}
      {hint && <p className="text-[11px] text-on-surface-variant/25 mt-2">{hint}</p>}
    </div>
  );
}

// ─── DealerSidebar ────────────────────────────────────────────────────────────
interface SidebarProps {
  dealers: Dealer[];
  selectedId: number | 'new' | null;
  searchQuery: string;
  onSelect: (id: number | 'new') => void;
  onSearchChange: (q: string) => void;
}

function DealerSidebar({ dealers, selectedId, searchQuery, onSelect, onSearchChange }: SidebarProps) {
  const filtered = dealers.filter(d =>
    d.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="w-52 shrink-0 border-r border-outline-variant/20 flex flex-col">
      {/* Search */}
      <div className="relative border-b border-outline-variant/20">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-on-surface-variant/30 pointer-events-none" />
        <input
          type="text"
          placeholder="Search dealers…"
          value={searchQuery}
          onChange={e => onSearchChange(e.target.value)}
          className="w-full bg-surface-high/40 pl-8 pr-3 py-2.5 text-xs text-on-surface placeholder-on-surface-variant/30 focus:outline-none focus:bg-surface-high/60 transition-colors"
        />
      </div>

      {/* Dealer list */}
      <div className="overflow-y-auto flex-1">
        {filtered.length === 0 && searchQuery && (
          <p className="px-3 py-4 text-[11px] text-on-surface-variant/30 text-center">No matches</p>
        )}
        {filtered.map(d => {
          const isSelected = selectedId === d.id;
          const price = primaryPrice(d);
          return (
            <button
              key={d.id}
              onClick={() => onSelect(d.id)}
              className={[
                'w-full text-left px-3 py-2.5 transition-colors border-l-2',
                isSelected
                  ? 'bg-primary/10 border-primary text-primary'
                  : 'border-transparent text-on-surface-variant hover:bg-surface-high/50 hover:text-on-surface',
              ].join(' ')}
            >
              <p className={['text-sm truncate', isSelected ? 'font-medium' : ''].join(' ')}>{d.name}</p>
              {price && (
                <p className="text-[10px] font-mono text-primary/60 mt-0.5">
                  €{parseFloat(price).toFixed(2)}/g
                </p>
              )}
            </button>
          );
        })}
      </div>

      {/* Add dealer button */}
      <div className="border-t border-outline-variant/20 p-2">
        <button
          onClick={() => onSelect('new')}
          className={[
            'w-full flex items-center gap-1.5 px-2 py-1.5 text-xs rounded transition-colors',
            selectedId === 'new'
              ? 'bg-primary/10 text-primary'
              : 'text-on-surface-variant/50 hover:text-primary hover:bg-primary/5',
          ].join(' ')}
        >
          <Plus className="w-3.5 h-3.5" />
          Add Dealer
        </button>
      </div>
    </div>
  );
}

// ─── DealerCatalogPanel ───────────────────────────────────────────────────────
interface CatalogPanelProps {
  dealer: Dealer | null;
  mode: 'view' | 'edit' | 'add';
  loading: boolean;
  onUpdate: (d: Dealer) => void;
  onDelete: (id: number) => void;
  onAddDone: (d: Dealer) => void;
  onAddCancel: () => void;
  onEditStart: () => void;
  onEditEnd: () => void;
}

function DealerCatalogPanel({
  dealer, mode, loading,
  onUpdate, onDelete, onAddDone, onAddCancel, onEditStart, onEditEnd,
}: CatalogPanelProps) {
  const [activeTab, setActiveTab] = useState<PriceTab>('gold-bars');
  const [editValues, setEditValues] = useState<PriceFormValues>(
    dealer ? dealerToFormValues(dealer) : emptyFormValues()
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  // Add form state
  const [addName, setAddName] = useState('');
  const [addNotes, setAddNotes] = useState('');

  async function handleSave() {
    if (!dealer) return;
    setSaving(true);
    setError(null);
    try {
      const updated = await api.dealers.update(dealer.id, {
        name:                        editValues.name || dealer.name,
        contact_notes:               editValues.contact_notes || null,
        we_buy_gold_per_gram:        editValues.we_buy_gold_per_gram || null,
        we_buy_gold_coin_per_gram:   editValues.we_buy_gold_coin_per_gram || null,
        we_buy_silver_bar_per_gram:  editValues.we_buy_silver_bar_per_gram || null,
        we_buy_silver_coin_per_gram: editValues.we_buy_silver_coin_per_gram || null,
        we_buy_platinum_per_gram:    editValues.we_buy_platinum_per_gram || null,
        we_buy_palladium_per_gram:   editValues.we_buy_palladium_per_gram || null,
      });
      onUpdate(updated);
      onEditEnd();
    } catch (err) {
      setError(String(err));
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!dealer) return;
    setSaving(true);
    try {
      await api.dealers.delete(dealer.id);
      onDelete(dealer.id);
    } catch (err) {
      setError(String(err));
      setSaving(false);
    }
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const created = await api.dealers.create({
        name:                        addName,
        contact_notes:               addNotes || null,
        we_buy_gold_per_gram:        null,
        we_buy_gold_coin_per_gram:   null,
        we_buy_silver_bar_per_gram:  null,
        we_buy_silver_coin_per_gram: null,
        we_buy_platinum_per_gram:    null,
        we_buy_palladium_per_gram:   null,
      });
      onAddDone(created);
    } catch (err) {
      setError(String(err));
    } finally {
      setSaving(false);
    }
  }

  // ── Loading state ──────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="text-sm text-on-surface-variant/30">Loading…</p>
      </div>
    );
  }

  // ── Add mode ───────────────────────────────────────────────────────────────
  if (mode === 'add') {
    return (
      <form onSubmit={handleAdd} className="flex-1 flex flex-col p-5">
        <p className="text-[11px] text-on-surface-variant/40 uppercase tracking-wider mb-4">New Dealer</p>
        <div className="space-y-3 flex-1">
          <div>
            <label className="block text-[11px] text-on-surface-variant/50 uppercase tracking-wider mb-1.5">
              Name <span className="text-error">*</span>
            </label>
            <Input
              autoFocus
              required
              placeholder="Dealer name"
              value={addName}
              onChange={e => setAddName(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-[11px] text-on-surface-variant/50 uppercase tracking-wider mb-1.5">Contact Notes</label>
            <Input
              placeholder="Phone, website, address…"
              value={addNotes}
              onChange={e => setAddNotes(e.target.value)}
            />
          </div>
          <p className="text-[11px] text-on-surface-variant/25 pt-1">
            You can add prices after saving the dealer.
          </p>
        </div>
        {error && <ErrorMessage message={error} />}
        <div className="flex items-center gap-2 pt-4 border-t border-outline-variant/20 mt-4">
          <button
            type="submit"
            disabled={saving || !addName.trim()}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-primary/10 hover:bg-primary/15 border border-primary/25 rounded text-xs text-primary disabled:opacity-40 transition-colors"
          >
            <Check className="w-3.5 h-3.5" />
            {saving ? 'Adding…' : 'Add Dealer'}
          </button>
          <button
            type="button"
            onClick={onAddCancel}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-surface-high/60 hover:bg-surface-high border border-outline-variant/30 rounded text-xs text-on-surface-variant transition-colors"
          >
            <X className="w-3.5 h-3.5" />
            Cancel
          </button>
        </div>
      </form>
    );
  }

  // ── Empty state (no dealer selected) ──────────────────────────────────────
  if (!dealer) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
        <div className="w-12 h-12 rounded-full bg-surface-high/60 flex items-center justify-center mb-3">
          <Building2 className="w-5 h-5 text-on-surface-variant/30" />
        </div>
        <p className="text-sm text-on-surface-variant/40">Select a dealer to view prices</p>
        <p className="text-[11px] text-on-surface-variant/20 mt-1">or add a new dealer using the sidebar</p>
      </div>
    );
  }

  // ── View / Edit mode ───────────────────────────────────────────────────────
  return (
    <div className="flex-1 flex flex-col min-h-0">
      {/* Header */}
      <div className="px-5 py-3.5 border-b border-outline-variant/20 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="font-headline italic text-base text-on-surface truncate">{dealer.name}</h3>
          {dealer.contact_notes && (
            <p className="text-[11px] text-on-surface-variant/40 mt-0.5 truncate">{dealer.contact_notes}</p>
          )}
          <p className={['text-[11px] mt-0.5', freshnessClass(dealer.updated_at)].join(' ')}>
            {daysAgo(dealer.updated_at)}
          </p>
        </div>
        {!confirmDelete && mode === 'view' && (
          <div className="flex items-center gap-1 shrink-0">
            <button
              onClick={() => { setEditValues(dealerToFormValues(dealer)); onEditStart(); }}
              className="flex items-center gap-1 px-2 py-1.5 text-xs text-on-surface-variant/50 hover:text-primary hover:bg-primary/5 rounded transition-colors"
            >
              <Pencil className="w-3.5 h-3.5" />
              Edit
            </button>
            <button
              onClick={() => setConfirmDelete(true)}
              className="flex items-center gap-1 px-2 py-1.5 text-xs text-on-surface-variant/50 hover:text-error hover:bg-error/5 rounded transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Delete
            </button>
          </div>
        )}
      </div>

      {/* Delete confirm strip */}
      {confirmDelete && (
        <div className="flex items-center gap-3 px-5 py-2.5 bg-error/10 border-b border-error/20">
          <p className="text-xs text-error flex-1">Delete {dealer.name}? This cannot be undone.</p>
          <button
            onClick={handleDelete}
            disabled={saving}
            className="px-2.5 py-1 rounded bg-error/20 border border-error/30 text-error text-[11px] hover:bg-error/30 transition-colors disabled:opacity-40"
          >
            {saving ? '…' : 'Confirm Delete'}
          </button>
          <button
            onClick={() => setConfirmDelete(false)}
            className="px-2 py-1 rounded text-on-surface-variant/50 hover:text-on-surface text-[11px] transition-colors"
          >
            Cancel
          </button>
        </div>
      )}

      {/* Edit: name + contact fields above tabs */}
      {mode === 'edit' && (
        <div className="grid grid-cols-2 gap-3 px-5 py-3 border-b border-outline-variant/20">
          <div>
            <label className="block text-[11px] text-on-surface-variant/40 uppercase tracking-wider mb-1">Name</label>
            <Input
              value={editValues.name}
              onChange={e => setEditValues(v => ({ ...v, name: e.target.value }))}
              placeholder="Dealer name"
            />
          </div>
          <div>
            <label className="block text-[11px] text-on-surface-variant/40 uppercase tracking-wider mb-1">Contact</label>
            <Input
              value={editValues.contact_notes}
              onChange={e => setEditValues(v => ({ ...v, contact_notes: e.target.value }))}
              placeholder="Phone, website…"
            />
          </div>
        </div>
      )}

      {/* Metal tabs */}
      <div className="flex border-b border-outline-variant/20 overflow-x-auto shrink-0" role="tablist">
        {PRICE_TABS.map(t => {
          const hasDot = mode === 'edit'
            ? tabHasPriceInForm(t.id, editValues)
            : tabHasPrice(t.id, dealer);
          return (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={activeTab === t.id}
              onClick={() => setActiveTab(t.id)}
              className={[
                'relative px-3.5 py-2.5 text-xs whitespace-nowrap shrink-0 transition-colors',
                activeTab === t.id
                  ? 'text-primary font-medium after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-primary'
                  : 'text-on-surface-variant/40 hover:text-on-surface-variant',
              ].join(' ')}
            >
              {t.label}
              {hasDot && (
                <span className={['ml-1.5 inline-block w-1.5 h-1.5 rounded-full align-middle', TAB_DOT_COLOR[t.id]].join(' ')} />
              )}
            </button>
          );
        })}
      </div>

      {/* Price content */}
      <div className="flex-1 overflow-y-auto p-5" role="tabpanel">
        {activeTab === 'pt-pd' ? (
          <div className="space-y-3">
            {PT_PD_FIELDS.map(f => (
              <MetalPriceCard
                key={f.field}
                label={f.label}
                price={dealer[f.field]}
                hint={f.hint}
                editing={mode === 'edit'}
                value={editValues[f.field]}
                onChange={val => setEditValues(v => ({ ...v, [f.field]: val }))}
              />
            ))}
          </div>
        ) : (() => {
          const meta = PRICE_TAB_META[activeTab as Exclude<PriceTab, 'pt-pd'>];
          return (
            <MetalPriceCard
              label={PRICE_TABS.find(t => t.id === activeTab)!.label}
              price={dealer[meta.field]}
              hint={meta.hint}
              editing={mode === 'edit'}
              value={editValues[meta.field]}
              onChange={val => setEditValues(v => ({ ...v, [meta.field]: val }))}
            />
          );
        })()}
      </div>

      {/* Edit mode footer */}
      {mode === 'edit' && (
        <div className="shrink-0 px-5 py-3 border-t border-outline-variant/20 flex items-center gap-2">
          {error && <ErrorMessage message={error} />}
          <button
            onClick={handleSave}
            disabled={saving || !editValues.name.trim()}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-primary/10 hover:bg-primary/15 border border-primary/25 rounded text-xs text-primary disabled:opacity-40 transition-colors"
          >
            <Check className="w-3.5 h-3.5" />
            {saving ? 'Saving…' : 'Save'}
          </button>
          <button
            onClick={() => { onEditEnd(); setError(null); }}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-surface-high/60 hover:bg-surface-high border border-outline-variant/30 rounded text-xs text-on-surface-variant transition-colors"
          >
            <X className="w-3.5 h-3.5" />
            Cancel
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Main Modal ───────────────────────────────────────────────────────────────
interface Props {
  onClose: () => void;
  onDealersChanged: () => void;
}

export default function DealerManagementModal({ onClose, onDealersChanged }: Props) {
  const [dealers, setDealers] = useState<Dealer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<number | 'new' | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    api.dealers.list()
      .then(data => {
        setDealers(data);
        if (data.length > 0) setSelectedId(data[0].id);
      })
      .catch(err => setError(String(err)))
      .finally(() => setLoading(false));
  }, []);

  function handleSelect(id: number | 'new') {
    setSelectedId(id);
    setEditMode(false);
  }

  function handleUpdate(updated: Dealer) {
    setDealers(ds => ds.map(d => d.id === updated.id ? updated : d));
    onDealersChanged();
  }

  function handleDelete(id: number) {
    setDealers(ds => {
      const remaining = ds.filter(d => d.id !== id);
      setSelectedId(remaining.length > 0 ? remaining[0].id : null);
      return remaining;
    });
    setEditMode(false);
    onDealersChanged();
  }

  function handleAddDone(dealer: Dealer) {
    setDealers(ds => [...ds, dealer]);
    setSelectedId(dealer.id);
    setEditMode(false);
    onDealersChanged();
  }

  const selectedDealer = selectedId === 'new' ? null : dealers.find(d => d.id === selectedId) ?? null;
  const panelMode: 'view' | 'edit' | 'add' = selectedId === 'new' ? 'add' : editMode ? 'edit' : 'view';

  return (
    <Modal title="Manage Dealers" onClose={onClose} width="max-w-2xl">
      {error && <div className="mb-3"><ErrorMessage message={error} /></div>}
      <div className="-mx-6 -my-5 flex h-[520px] overflow-hidden rounded-b-xl">
        <DealerSidebar
          dealers={dealers}
          selectedId={selectedId}
          searchQuery={searchQuery}
          onSelect={handleSelect}
          onSearchChange={setSearchQuery}
        />
        <DealerCatalogPanel
          key={String(selectedId)}
          dealer={selectedDealer}
          mode={panelMode}
          loading={loading}
          onUpdate={handleUpdate}
          onDelete={handleDelete}
          onAddDone={handleAddDone}
          onAddCancel={() => setSelectedId(dealers.length > 0 ? dealers[0].id : null)}
          onEditStart={() => setEditMode(true)}
          onEditEnd={() => setEditMode(false)}
        />
      </div>
    </Modal>
  );
}
