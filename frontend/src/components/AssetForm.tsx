import React, { useState } from 'react';
import { api } from '../api';
import type { Asset, AssetCreateInput } from '../types';

interface Props {
  /** When provided, form is in edit mode and pre-fills fields */
  asset?: Asset;
  onSuccess: (saved: Asset) => void;
  onCancel: () => void;
}

export function AssetForm({ asset, onSuccess, onCancel }: Props): React.JSX.Element {
  const isEdit = asset !== undefined;

  const [name, setName] = useState(asset?.name ?? '');
  const [description, setDescription] = useState(asset?.description ?? '');
  const [typeLabel, setTypeLabel] = useState(asset?.type_label ?? '');
  const [value, setValue] = useState(asset ? String(asset.value) : '');
  const [currency, setCurrency] = useState(asset?.currency ?? 'EUR');
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<{ name?: string; value?: string }>({});

  function validate(): boolean {
    const next: typeof errors = {};
    if (!name.trim()) next.name = 'Name is required';
    if (!value || isNaN(Number(value))) next.value = 'A valid number is required';
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function handleSubmit(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    if (!validate()) return;

    const data: AssetCreateInput = {
      name: name.trim(),
      description: description.trim() || null,
      type_label: typeLabel.trim(),
      value: Number(value),
      currency: currency.trim() || 'EUR',
    };

    setSubmitting(true);
    try {
      const saved = isEdit
        ? await api.assets.update(asset!.id, data)
        : await api.assets.create(data);
      onSuccess(saved);
    } catch (err) {
      setErrors({ name: (err as Error).message });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} style={styles.form} noValidate>
      <h2 style={styles.heading}>{isEdit ? 'Edit asset' : 'Add asset'}</h2>

      <div style={styles.row}>
        <label style={styles.label} htmlFor="af-name">Name *</label>
        <input
          id="af-name"
          style={{ ...styles.input, ...(errors.name ? styles.inputError : {}) }}
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. 5× Krugerrand 1oz"
          autoFocus
        />
        {errors.name && <span style={styles.error}>{errors.name}</span>}
      </div>

      <div style={styles.row}>
        <label style={styles.label} htmlFor="af-type">Type</label>
        <input
          id="af-type"
          style={styles.input}
          value={typeLabel}
          onChange={(e) => setTypeLabel(e.target.value)}
          placeholder="e.g. Physical Gold"
        />
      </div>

      <div style={styles.twoCol}>
        <div style={styles.row}>
          <label style={styles.label} htmlFor="af-value">Value *</label>
          <input
            id="af-value"
            type="number"
            step="any"
            min="0"
            style={{ ...styles.input, ...(errors.value ? styles.inputError : {}) }}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="0.00"
          />
          {errors.value && <span style={styles.error}>{errors.value}</span>}
        </div>
        <div style={styles.row}>
          <label style={styles.label} htmlFor="af-currency">Currency / Unit</label>
          <input
            id="af-currency"
            style={styles.input}
            value={currency}
            onChange={(e) => setCurrency(e.target.value)}
            placeholder="EUR"
          />
        </div>
      </div>

      <div style={styles.row}>
        <label style={styles.label} htmlFor="af-desc">Description</label>
        <textarea
          id="af-desc"
          style={{ ...styles.input, ...styles.textarea }}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Optional notes about this asset"
          rows={2}
        />
      </div>

      <div style={styles.actions}>
        <button type="button" onClick={onCancel} style={styles.cancelBtn}>
          Cancel
        </button>
        <button type="submit" disabled={submitting} style={styles.submitBtn}>
          {submitting ? 'Saving…' : isEdit ? 'Save changes' : 'Add asset'}
        </button>
      </div>
    </form>
  );
}

const styles = {
  form: {
    background: '#0f172a',
    border: '1px solid #1e293b',
    borderRadius: '8px',
    padding: '1.5rem',
    marginBottom: '2rem',
  } as React.CSSProperties,
  heading: {
    fontSize: '1rem',
    fontWeight: 600,
    color: '#e2e8f0',
    marginBottom: '1.25rem',
  } as React.CSSProperties,
  row: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '0.3rem',
    marginBottom: '1rem',
  } as React.CSSProperties,
  twoCol: {
    display: 'grid',
    gridTemplateColumns: '2fr 1fr',
    gap: '0.75rem',
  } as React.CSSProperties,
  label: {
    fontSize: '0.75rem',
    fontWeight: 500,
    color: '#64748b',
    letterSpacing: '0.05em',
    textTransform: 'uppercase' as const,
  } as React.CSSProperties,
  input: {
    background: '#1e293b',
    border: '1px solid #334155',
    borderRadius: '6px',
    color: '#e2e8f0',
    fontSize: '0.9rem',
    padding: '0.5rem 0.75rem',
    outline: 'none',
    width: '100%',
    boxSizing: 'border-box' as const,
    fontFamily: 'inherit',
  } as React.CSSProperties,
  inputError: {
    borderColor: '#ef4444',
  } as React.CSSProperties,
  textarea: {
    resize: 'vertical' as const,
    minHeight: '60px',
  } as React.CSSProperties,
  error: {
    fontSize: '0.75rem',
    color: '#ef4444',
  } as React.CSSProperties,
  actions: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '0.75rem',
    marginTop: '0.5rem',
  } as React.CSSProperties,
  cancelBtn: {
    background: 'transparent',
    border: '1px solid #334155',
    borderRadius: '6px',
    color: '#94a3b8',
    cursor: 'pointer',
    fontSize: '0.875rem',
    padding: '0.5rem 1rem',
    fontFamily: 'inherit',
  } as React.CSSProperties,
  submitBtn: {
    background: '#3b82f6',
    border: 'none',
    borderRadius: '6px',
    color: '#fff',
    cursor: 'pointer',
    fontSize: '0.875rem',
    fontWeight: 500,
    padding: '0.5rem 1.25rem',
    fontFamily: 'inherit',
  } as React.CSSProperties,
} satisfies Record<string, React.CSSProperties>;
