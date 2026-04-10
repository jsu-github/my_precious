import { useState } from 'react';
import { api } from '../../api';
import type { Acquisition, CreateAcquisition, TaxStatus, Asset } from '../../types';
import Modal from './Modal';
import { Field, Input, Select, Textarea, FormActions, ErrorMessage } from './FormFields';

interface Props {
  asset: Asset;
  acquisition?: Acquisition;
  onSaved: (acq: Acquisition) => void;
  onClose: () => void;
}

export default function AcquisitionModal({ asset, acquisition, onSaved, onClose }: Props) {
  const isEdit = !!acquisition;
  const [form, setForm] = useState<CreateAcquisition>({
    purchase_date: acquisition?.purchase_date.slice(0, 10) ?? new Date().toISOString().slice(0, 10),
    cost_basis: acquisition?.cost_basis ?? '',
    quantity: acquisition?.quantity ?? '1',
    tax_status: acquisition?.tax_status ?? 'settled',
    description: acquisition?.description ?? null,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const saved = isEdit
        ? await api.assets.acquisitions.update(asset.id, acquisition!.id, form)
        : await api.assets.acquisitions.create(asset.id, form);
      onSaved(saved);
    } catch (err) {
      setError(String(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal title={isEdit ? 'Edit Acquisition' : `Add Acquisition — ${asset.name}`} onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <Field label="Purchase Date" required>
            <Input
              required
              autoFocus
              type="date"
              value={form.purchase_date}
              onChange={e => setForm(f => ({ ...f, purchase_date: e.target.value }))}
            />
          </Field>
          <Field label="Tax Status" required>
            <Select
              value={form.tax_status}
              onChange={e => setForm(f => ({ ...f, tax_status: e.target.value as TaxStatus }))}
            >
              <option value="settled">Settled</option>
              <option value="pending">Pending</option>
            </Select>
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Cost Basis (USD)" required>
            <Input
              required
              type="number"
              min="0"
              step="0.01"
              placeholder="0.00"
              value={form.cost_basis}
              onChange={e => setForm(f => ({ ...f, cost_basis: e.target.value }))}
            />
          </Field>
          <Field label="Quantity">
            <Input
              type="number"
              min="0"
              step="any"
              placeholder="1"
              value={form.quantity}
              onChange={e => setForm(f => ({ ...f, quantity: e.target.value }))}
            />
          </Field>
        </div>
        <Field label="Notes">
          <Textarea
            rows={2}
            placeholder="Optional acquisition notes…"
            value={form.description ?? ''}
            onChange={e => setForm(f => ({ ...f, description: e.target.value || null }))}
          />
        </Field>
        {error && <ErrorMessage message={error} />}
        <FormActions onCancel={onClose} loading={saving} submitLabel={isEdit ? 'Update' : 'Add'} />
      </form>
    </Modal>
  );
}
