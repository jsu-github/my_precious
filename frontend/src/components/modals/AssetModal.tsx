import { useState } from 'react';
import { api } from '../../api';
import type { Asset, CreateAsset, AssetClass, SecurityClass, AuditFrequency, Entity, AssetLocation } from '../../types';
import Modal from './Modal';
import { Field, Input, Select, Textarea, FormActions, ErrorMessage } from './FormFields';

const ASSET_CLASSES: AssetClass[] = [
  'precious_metals', 'real_estate', 'equities', 'crypto',
  'private_equity', 'fixed_income', 'cash', 'exotics',
];

const ASSET_CLASS_LABELS: Record<AssetClass, string> = {
  precious_metals: 'Precious Metals', real_estate: 'Real Estate',
  equities: 'Equities', crypto: 'Crypto', private_equity: 'Private Equity',
  fixed_income: 'Fixed Income', cash: 'Cash', exotics: 'Exotics',
};

interface Props {
  asset?: Asset;
  entities: Entity[];
  locations: AssetLocation[];
  onSaved: (asset: Asset) => void;
  onClose: () => void;
}

export default function AssetModal({ asset, entities, locations, onSaved, onClose }: Props) {
  const isEdit = !!asset;
  const [form, setForm] = useState<CreateAsset>({
    entity_id: asset?.entity_id ?? (entities[0]?.id ?? 0),
    location_id: asset?.location_id ?? null,
    name: asset?.name ?? '',
    asset_class: asset?.asset_class ?? 'precious_metals',
    sub_class: asset?.sub_class ?? null,
    product_type: asset?.product_type ?? null,
    weight_per_unit_grams: asset?.weight_per_unit_grams ?? null,
    tier: asset?.tier ?? null,
    current_value: asset?.current_value ?? '',
    security_class: asset?.security_class ?? 'standard',
    audit_frequency: asset?.audit_frequency ?? 'annual',
    last_audit_date: asset?.last_audit_date ?? null,
    description: asset?.description ?? null,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const saved = isEdit
        ? await api.assets.update(asset!.id, form)
        : await api.assets.create(form);
      onSaved(saved);
    } catch (err) {
      setError(String(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal title={isEdit ? 'Edit Asset' : 'New Asset'} onClose={onClose} width="max-w-2xl">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <Field label="Name" required>
            <Input
              required
              autoFocus
              placeholder="e.g. Swiss Gold Bars"
              value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
            />
          </Field>
          <Field label="Asset Class" required>
            <Select
              value={form.asset_class}
              onChange={e => setForm(f => ({ ...f, asset_class: e.target.value as AssetClass }))}
            >
              {ASSET_CLASSES.map(cls => (
                <option key={cls} value={cls}>{ASSET_CLASS_LABELS[cls]}</option>
              ))}
            </Select>
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Entity" required>
            <Select
              value={form.entity_id}
              onChange={e => setForm(f => ({ ...f, entity_id: Number(e.target.value) }))}
            >
              {entities.map(ent => (
                <option key={ent.id} value={ent.id}>{ent.name}</option>
              ))}
            </Select>
          </Field>
          <Field label="Current Value (EUR)" required>
            <Input
              required
              type="number"
              min="0"
              step="0.01"
              placeholder="0.00"
              value={form.current_value}
              onChange={e => setForm(f => ({ ...f, current_value: e.target.value }))}
            />
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Custodial Location">
            <Select
              value={form.location_id ?? ''}
              onChange={e => setForm(f => ({ ...f, location_id: e.target.value ? Number(e.target.value) : null }))}
            >
              <option value="">— No location —</option>
              {locations.map(loc => (
                <option key={loc.id} value={loc.id}>{loc.name}</option>
              ))}
            </Select>
          </Field>
          <Field label="Security Class">
            <Select
              value={form.security_class}
              onChange={e => setForm(f => ({ ...f, security_class: e.target.value as SecurityClass }))}
            >
              <option value="high_security">High Security</option>
              <option value="medium_security">Medium Security</option>
              <option value="standard">Standard</option>
            </Select>
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Audit Frequency">
            <Select
              value={form.audit_frequency}
              onChange={e => setForm(f => ({ ...f, audit_frequency: e.target.value as AuditFrequency }))}
            >
              <option value="quarterly">Quarterly</option>
              <option value="semi_annual">Semi-Annual</option>
              <option value="annual">Annual</option>
            </Select>
          </Field>
          <Field label="Last Audit Date">
            <Input
              type="date"
              value={form.last_audit_date ?? ''}
              onChange={e => setForm(f => ({ ...f, last_audit_date: e.target.value || null }))}
            />
          </Field>
        </div>
        {form.asset_class === 'precious_metals' && (
          <Field label="Weight per Unit (grams)">
            <Input
              type="number"
              min="0"
              step="0.0001"
              placeholder="e.g. 31.1035 for 1 troy oz"
              value={form.weight_per_unit_grams ?? ''}
              onChange={e => setForm(f => ({ ...f, weight_per_unit_grams: e.target.value || null }))}
            />
          </Field>
        )}
        <Field label="Sovereign Tier">
          <Select
            value={form.tier != null ? String(form.tier) : ''}
            onChange={e => setForm(f => ({
              ...f,
              tier: e.target.value !== '' ? Number(e.target.value) : null,
            }))}
          >
            <option value="">— Unassigned —</option>
            <option value="0">Tier 0 — Grid-Down Baseline</option>
            <option value="1">Tier 1 — Digital Liquidity</option>
            <option value="2">Tier 2 — The Vaults</option>
            <option value="3">Tier 3 — Uncensorable Frontier</option>
          </Select>
        </Field>
        <Field label="Description">
          <Textarea
            rows={2}
            placeholder="Optional notes…"
            value={form.description ?? ''}
            onChange={e => setForm(f => ({ ...f, description: e.target.value || null }))}
          />
        </Field>
        {error && <ErrorMessage message={error} />}
        <FormActions onCancel={onClose} loading={saving} submitLabel={isEdit ? 'Update' : 'Create'} />
      </form>
    </Modal>
  );
}
