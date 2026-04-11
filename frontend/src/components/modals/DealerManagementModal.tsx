import { useState, useEffect } from 'react';
import { Plus, Pencil, Trash2, Check, X } from 'lucide-react';
import { api } from '../../api';
import type { Dealer } from '../../types';
import Modal from './Modal';
import { Input, ErrorMessage } from './FormFields';

// ─── Helpers ──────────────────────────────────────────────────────────────────
function daysAgo(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const days = Math.floor(ms / 86_400_000);
  if (days === 0) return 'Updated today';
  if (days === 1) return 'Updated 1 day ago';
  return `Updated ${days} days ago`;
}

interface DealerRowProps {
  dealer: Dealer;
  onUpdate: (updated: Dealer) => void;
  onDelete: (id: number) => void;
}

function DealerRow({ dealer, onUpdate, onDelete }: DealerRowProps) {
  const [editing, setEditing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [form, setForm] = useState({
    name: dealer.name,
    contact_notes: dealer.contact_notes ?? '',
    we_buy_gold_per_gram: dealer.we_buy_gold_per_gram ?? '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      const updated = await api.dealers.update(dealer.id, {
        name: form.name,
        contact_notes: form.contact_notes || null,
        we_buy_gold_per_gram: form.we_buy_gold_per_gram || null,
      });
      onUpdate(updated);
      setEditing(false);
    } catch (err) {
      setError(String(err));
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    setSaving(true);
    try {
      await api.dealers.delete(dealer.id);
      onDelete(dealer.id);
    } catch (err) {
      setError(String(err));
      setSaving(false);
    }
  }

  if (editing) {
    return (
      <div className="p-4 bg-surface-high/40 rounded-xl border border-primary/20 space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-[11px] text-on-surface-variant/50 uppercase tracking-wider mb-1">Name</label>
            <Input
              autoFocus
              placeholder="Dealer name"
              value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
            />
          </div>
          <div>
            <label className="block text-[11px] text-on-surface-variant/50 uppercase tracking-wider mb-1">
              We Buy Gold (€/g)
            </label>
            <Input
              type="number"
              min="0"
              step="0.0001"
              placeholder="e.g. 56.80"
              value={form.we_buy_gold_per_gram}
              onChange={e => setForm(f => ({ ...f, we_buy_gold_per_gram: e.target.value }))}
            />
          </div>
        </div>
        <div>
          <label className="block text-[11px] text-on-surface-variant/50 uppercase tracking-wider mb-1">
            Contact Notes
          </label>
          <Input
            placeholder="Address, phone, website…"
            value={form.contact_notes}
            onChange={e => setForm(f => ({ ...f, contact_notes: e.target.value }))}
          />
        </div>
        {error && <ErrorMessage message={error} />}
        <div className="flex items-center gap-2 pt-1">
          <button
            onClick={handleSave}
            disabled={saving || !form.name.trim()}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-primary/10 hover:bg-primary/15 border border-primary/25 rounded text-xs text-primary disabled:opacity-40 transition-colors"
          >
            <Check className="w-3.5 h-3.5" />
            {saving ? 'Saving…' : 'Save'}
          </button>
          <button
            onClick={() => { setEditing(false); setError(null); }}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-surface-high/60 hover:bg-surface-high border border-outline-variant/30 rounded text-xs text-on-surface-variant transition-colors"
          >
            <X className="w-3.5 h-3.5" />
            Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 bg-surface-high/20 hover:bg-surface-high/30 rounded-xl border border-outline-variant/20 transition-colors group">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-medium text-on-surface text-sm">{dealer.name}</span>
            {dealer.we_buy_gold_per_gram && (
              <span className="text-xs font-mono text-primary tabular-nums">
                €{parseFloat(dealer.we_buy_gold_per_gram).toFixed(4)}/g
              </span>
            )}
          </div>
          {dealer.contact_notes && (
            <p className="text-xs text-on-surface-variant/50 mt-0.5 truncate">{dealer.contact_notes}</p>
          )}
          <p className="text-[11px] text-on-surface-variant/30 mt-1">{daysAgo(dealer.updated_at)}</p>
        </div>
        <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={() => setEditing(true)}
            className="p-1.5 rounded hover:bg-surface-high/60 text-on-surface-variant/50 hover:text-on-surface transition-colors"
          >
            <Pencil className="w-3.5 h-3.5" />
          </button>
          {confirmDelete ? (
            <div className="flex items-center gap-1">
              <button
                onClick={handleDelete}
                disabled={saving}
                className="px-2 py-1 rounded bg-error/10 border border-error/25 text-error text-[11px] hover:bg-error/20 transition-colors"
              >
                Confirm
              </button>
              <button
                onClick={() => setConfirmDelete(false)}
                className="p-1.5 rounded hover:bg-surface-high/60 text-on-surface-variant/50 transition-colors"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ) : (
            <button
              onClick={() => setConfirmDelete(true)}
              className="p-1.5 rounded hover:bg-error/10 text-on-surface-variant/50 hover:text-error transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
      {error && <ErrorMessage message={error} />}
    </div>
  );
}

// ─── Add Dealer Form ──────────────────────────────────────────────────────────
interface AddFormProps {
  onAdd: (dealer: Dealer) => void;
  onCancel: () => void;
}

function AddDealerForm({ onAdd, onCancel }: AddFormProps) {
  const [form, setForm] = useState({
    name: '',
    contact_notes: '',
    we_buy_gold_per_gram: '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const created = await api.dealers.create({
        name: form.name,
        contact_notes: form.contact_notes || null,
        we_buy_gold_per_gram: form.we_buy_gold_per_gram || null,
      });
      onAdd(created);
    } catch (err) {
      setError(String(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="p-4 bg-surface-high/40 rounded-xl border border-primary/20 space-y-3">
      <p className="text-xs text-on-surface-variant/50 uppercase tracking-wider pb-1">New Dealer</p>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-[11px] text-on-surface-variant/50 uppercase tracking-wider mb-1">Name *</label>
          <Input
            autoFocus
            required
            placeholder="Dealer name"
            value={form.name}
            onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
          />
        </div>
        <div>
          <label className="block text-[11px] text-on-surface-variant/50 uppercase tracking-wider mb-1">
            We Buy Gold (€/g)
          </label>
          <Input
            type="number"
            min="0"
            step="0.0001"
            placeholder="e.g. 56.80"
            value={form.we_buy_gold_per_gram}
            onChange={e => setForm(f => ({ ...f, we_buy_gold_per_gram: e.target.value }))}
          />
        </div>
      </div>
      <div>
        <label className="block text-[11px] text-on-surface-variant/50 uppercase tracking-wider mb-1">
          Contact Notes
        </label>
        <Input
          placeholder="Address, phone, website…"
          value={form.contact_notes}
          onChange={e => setForm(f => ({ ...f, contact_notes: e.target.value }))}
        />
      </div>
      {error && <ErrorMessage message={error} />}
      <div className="flex items-center gap-2 pt-1">
        <button
          type="submit"
          disabled={saving || !form.name.trim()}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-primary/10 hover:bg-primary/15 border border-primary/25 rounded text-xs text-primary disabled:opacity-40 transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          {saving ? 'Adding…' : 'Add Dealer'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-surface-high/60 hover:bg-surface-high border border-outline-variant/30 rounded text-xs text-on-surface-variant transition-colors"
        >
          Cancel
        </button>
      </div>
    </form>
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
  const [showAdd, setShowAdd] = useState(false);

  useEffect(() => {
    api.dealers.list()
      .then(setDealers)
      .catch(err => setError(String(err)))
      .finally(() => setLoading(false));
  }, []);

  function handleUpdate(updated: Dealer) {
    setDealers(ds => ds.map(d => d.id === updated.id ? updated : d));
    onDealersChanged();
  }

  function handleDelete(id: number) {
    setDealers(ds => ds.filter(d => d.id !== id));
    onDealersChanged();
  }

  function handleAdd(dealer: Dealer) {
    setDealers(ds => [...ds, dealer]);
    setShowAdd(false);
    onDealersChanged();
  }

  return (
    <Modal title="Manage Dealers" onClose={onClose} width="max-w-xl">
      <div className="p-5 space-y-3">
        {loading && (
          <div className="text-center py-8 text-on-surface-variant/40 text-sm">Loading…</div>
        )}
        {error && <ErrorMessage message={error} />}

        {!loading && dealers.length === 0 && !showAdd && (
          <div className="text-center py-8 text-on-surface-variant/40 text-sm">
            No dealers yet. Add one to enable liquidation value calculations.
          </div>
        )}

        {dealers.map(d => (
          <DealerRow
            key={d.id}
            dealer={d}
            onUpdate={handleUpdate}
            onDelete={handleDelete}
          />
        ))}

        {showAdd ? (
          <AddDealerForm onAdd={handleAdd} onCancel={() => setShowAdd(false)} />
        ) : (
          <button
            onClick={() => setShowAdd(true)}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-surface-high/30 hover:bg-surface-high/50 border border-dashed border-outline-variant/40 hover:border-primary/30 rounded-xl text-sm text-on-surface-variant/50 hover:text-primary transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Dealer
          </button>
        )}
      </div>
    </Modal>
  );
}
