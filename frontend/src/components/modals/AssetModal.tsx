import { useState, useMemo } from 'react';
import { api } from '../../api';
import type { Asset, CreateAsset, AssetClass, SecurityClass, AuditFrequency, Entity, AssetLocation, TierConfig } from '../../types';
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

const ASSET_CLASS_TIER_DEFAULTS: Partial<Record<AssetClass, number>> = {
  precious_metals: 2,
  crypto: 3,
  cash: 1,
};

interface Props {
  asset?: Asset;
  entities: Entity[];
  locations: AssetLocation[];
  tierConfigs: TierConfig[];
  onSaved: (asset: Asset) => void;
  onClose: () => void;
}

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function buildAssetName(brand: string, metal: string, type: string, weight: string, unit: string): string {
  const parts = [
    brand.trim() || null,
    metal ? capitalize(metal) : null,
    type  ? capitalize(type)  : null,
    weight                    ? `${weight}${unit}` : null,
  ].filter(Boolean) as string[];
  return parts.join(' ');
}

export default function AssetModal({ asset, entities, locations, tierConfigs, onSaved, onClose }: Props) {
  const isEdit = !!asset;
  const [form, setForm] = useState<CreateAsset>({
    entity_id: asset?.entity_id ?? (entities[0]?.id ?? 0),
    location_id: asset?.location_id ?? null,
    name: asset?.name ?? '',
    asset_class: asset?.asset_class ?? 'precious_metals',
    sub_class: asset?.sub_class ?? null,
    product_type: asset?.product_type ?? null,
    brand: asset?.brand ?? null,
    weight_per_unit: asset?.weight_per_unit ?? null,
    weight_unit: asset?.weight_unit ?? 'g',
    tier: asset?.tier ?? null,
    current_value: asset?.current_value ?? '',
    security_class: asset?.security_class ?? 'standard',
    audit_frequency: asset?.audit_frequency ?? 'annual',
    last_audit_date: asset?.last_audit_date ?? null,
    description: asset?.description ?? null,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const derivedName = useMemo(() => {
    if (form.asset_class !== 'precious_metals') return '';
    return buildAssetName(
      form.brand ?? '',
      form.sub_class ?? '',
      form.product_type ?? '',
      form.weight_per_unit ?? '',
      form.weight_unit ?? 'g',
    );
  }, [form.asset_class, form.brand, form.sub_class, form.product_type, form.weight_per_unit, form.weight_unit]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const payload = form.asset_class === 'precious_metals'
        ? { ...form, name: derivedName || 'Precious Metal' }
        : form;
      const saved = isEdit
        ? await api.assets.update(asset!.id, payload)
        : await api.assets.create(payload);
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
        {/* Row 1: Name (non-PM) or Asset Class alone — then PM identity block */}
        {form.asset_class !== 'precious_metals' ? (
          <div className="grid grid-cols-2 gap-4">
            <Field label="Name" required>
              <Input
                required
                autoFocus
                placeholder="e.g. Swiss Government Bonds"
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              />
            </Field>
            <Field label="Asset Class" required>
              <Select
                value={form.asset_class}
                onChange={e => setForm(f => {
                  const cls = e.target.value as AssetClass;
                  const def = ASSET_CLASS_TIER_DEFAULTS[cls];
                  return { ...f, asset_class: cls, tier: f.tier == null && def != null ? def : f.tier };
                })}
              >
                {ASSET_CLASSES.map(cls => (
                  <option key={cls} value={cls}>{ASSET_CLASS_LABELS[cls]}</option>
                ))}
              </Select>
            </Field>
          </div>
        ) : (
          <Field label="Asset Class" required>
            <Select
              value={form.asset_class}
              onChange={e => setForm(f => {
                const cls = e.target.value as AssetClass;
                const def = ASSET_CLASS_TIER_DEFAULTS[cls];
                return { ...f, asset_class: cls, tier: f.tier == null && def != null ? def : f.tier };
              })}
            >
              {ASSET_CLASSES.map(cls => (
                <option key={cls} value={cls}>{ASSET_CLASS_LABELS[cls]}</option>
              ))}
            </Select>
          </Field>
        )}

        {/* Precious metals identity block */}
        {form.asset_class === 'precious_metals' && (
          <div className="border border-outline-variant/20 rounded-lg bg-surface-high/20 p-4 space-y-3">
            <p className="text-[10px] text-on-surface-variant/35 uppercase tracking-wider mb-1">Product Identity</p>
            <div className="grid grid-cols-3 gap-3">
              <Field label="Metal" required>
                <Select
                  value={form.sub_class ?? ''}
                  onChange={e => setForm(f => ({ ...f, sub_class: e.target.value || null }))}
                >
                  <option value="">— Select —</option>
                  <option value="gold">Gold</option>
                  <option value="silver">Silver</option>
                  <option value="platinum">Platinum</option>
                  <option value="palladium">Palladium</option>
                </Select>
              </Field>
              <Field label="Type" required>
                <Select
                  value={form.product_type ?? ''}
                  onChange={e => setForm(f => ({ ...f, product_type: e.target.value || null }))}
                >
                  <option value="">— Select —</option>
                  <option value="bar">Bar</option>
                  <option value="coin">Coin</option>
                </Select>
              </Field>
              <Field label="Brand">
                <Input
                  type="text"
                  placeholder="e.g. Maple Leaf, Umicore"
                  value={form.brand ?? ''}
                  onChange={e => setForm(f => ({ ...f, brand: e.target.value || null }))}
                />
              </Field>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <Field label="Weight">
                <Input
                  type="number"
                  min="0"
                  step="any"
                  placeholder="e.g. 1, 100"
                  value={form.weight_per_unit ?? ''}
                  onChange={e => setForm(f => ({ ...f, weight_per_unit: e.target.value || null }))}
                />
              </Field>
              <Field label="Unit">
                <Select
                  value={form.weight_unit ?? 'g'}
                  onChange={e => setForm(f => ({ ...f, weight_unit: e.target.value }))}
                >
                  <option value="g">Grams (g)</option>
                  <option value="oz">Troy Oz (oz)</option>
                </Select>
              </Field>
              <div>
                <label className="block text-[11px] font-medium text-on-surface-variant/60 uppercase tracking-wider mb-1.5">Name Preview</label>
                <div className="w-full min-h-[38px] flex items-center bg-surface-highest border border-outline-variant/40 rounded px-3 py-2 text-sm font-mono truncate">
                  {derivedName
                    ? <span className="text-on-surface">{derivedName}</span>
                    : <span className="text-on-surface-variant/25 text-xs italic">Fill fields above…</span>
                  }
                </div>
              </div>
            </div>
          </div>
        )}
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
        <Field label="Sovereign Tier">
          <Select
            value={form.tier != null ? String(form.tier) : ''}
            onChange={e => setForm(f => ({
              ...f,
              tier: e.target.value !== '' ? Number(e.target.value) : null,
            }))}
          >
            <option value="">— Unassigned —</option>
            {tierConfigs.map(tc => (
              <option key={tc.tier_id} value={String(tc.tier_id)}>
                Tier {tc.tier_id} — {tc.tier_name}
              </option>
            ))}
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
