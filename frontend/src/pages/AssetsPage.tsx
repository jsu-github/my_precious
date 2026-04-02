import React, { useEffect, useState } from 'react';
import { api } from '../api';
import type { Asset } from '../types';
import { AssetForm } from '../components/AssetForm';
import { DeleteConfirmDialog } from '../components/DeleteConfirmDialog';

type FormMode = { type: 'create' } | { type: 'edit'; asset: Asset } | null;

interface Props {
  onNavigateToDimensions: () => void;
  onNavigateToTags: () => void;
  onNavigateToAsset: (assetId: string) => void;
}

export function AssetsPage({ onNavigateToDimensions, onNavigateToTags, onNavigateToAsset }: Props): React.JSX.Element {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [formMode, setFormMode] = useState<FormMode>(null);
  const [pendingDelete, setPendingDelete] = useState<Asset | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    api.assets.list()
      .then(setAssets)
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  function handleSaved(saved: Asset): void {
    setAssets((prev) => {
      const idx = prev.findIndex((a) => a.id === saved.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = saved;
        return next;
      }
      return [...prev, saved];
    });
    // Refresh weights from server after any change
    api.assets.list().then(setAssets).catch(() => null);
    setFormMode(null);
  }

  async function handleDelete(): Promise<void> {
    if (!pendingDelete) return;
    setDeleting(true);
    try {
      await api.assets.delete(pendingDelete.id);
      setAssets((prev) => prev.filter((a) => a.id !== pendingDelete.id));
      setPendingDelete(null);
    } catch (err) {
      console.error('Delete failed', err);
    } finally {
      setDeleting(false);
    }
  }

  if (loading) {
    return (
      <div style={styles.centred}>
        <span style={styles.muted}>Loading portfolio…</span>
      </div>
    );
  }

  if (error) {
    return (
      <div style={styles.centred}>
        <span style={{ color: '#ef4444' }}>Error: {error}</span>
      </div>
    );
  }

  return (
    <div style={styles.page}>
      <header style={styles.header}>
        <div>
          <h1 style={styles.title}>Portfolio</h1>
          <span style={styles.count}>
            {assets.length} {assets.length === 1 ? 'asset' : 'assets'}
          </span>
        </div>
        {formMode === null && (
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <button
              style={styles.dimBtn}
              onClick={onNavigateToDimensions}
            >
              ⚙ Dimensions
            </button>
            <button
              style={styles.dimBtn}
              onClick={onNavigateToTags}
            >
              🏷 Tags
            </button>
            <button
              style={styles.addBtn}
              onClick={() => setFormMode({ type: 'create' })}
            >
              + Add asset
            </button>
          </div>
        )}
      </header>

      {pendingDelete && (
        <DeleteConfirmDialog
          assetName={pendingDelete.name}
          deleting={deleting}
          onConfirm={handleDelete}
          onCancel={() => setPendingDelete(null)}
        />
      )}

      {formMode !== null && (
        <AssetForm
          asset={formMode.type === 'edit' ? formMode.asset : undefined}
          onSuccess={handleSaved}
          onCancel={() => setFormMode(null)}
        />
      )}

      {assets.length === 0 && formMode === null ? (
        <div style={styles.empty}>
          <p style={styles.emptyText}>No assets yet.</p>
          <p style={styles.muted}>Add your first asset to start tracking sovereign risk.</p>
        </div>
      ) : assets.length > 0 ? (
        <table style={styles.table}>
          <thead>
            <tr>
              <th style={styles.th}>Asset</th>
              <th style={{ ...styles.th, ...styles.right }}>Value</th>
              <th style={{ ...styles.th, ...styles.right }}>Weight</th>
              <th style={{ ...styles.th, ...styles.right }}>Net Risk</th>
              <th style={styles.th} />
            </tr>
          </thead>
          <tbody>
            {assets.map((asset) => (
              <tr key={asset.id} style={styles.row}>
                <td style={styles.td}>
                  <button
                    onClick={() => onNavigateToAsset(asset.id)}
                    style={styles.assetNameBtn}
                  >
                    {asset.name}
                  </button>
                  {asset.type_label && (
                    <span style={styles.typeLabel}>{asset.type_label}</span>
                  )}
                </td>
                <td style={{ ...styles.td, ...styles.right }}>
                  <span style={styles.value}>
                    {asset.value.toLocaleString('nl-NL', {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 8,
                    })}
                  </span>
                  <span style={styles.currency}>{asset.currency}</span>
                </td>
                <td style={{ ...styles.td, ...styles.right }}>
                  <span style={styles.weight}>
                    {(asset.capital_weight_pct ?? 0).toFixed(1)}%
                  </span>
                </td>
                <td style={{ ...styles.td, ...styles.right }}>
                  <span style={styles.placeholder}>—</span>
                </td>
                <td style={{ ...styles.td, textAlign: 'right' }}>
                  <button
                    style={styles.editBtn}
                    onClick={() => setFormMode({ type: 'edit', asset })}
                  >
                    Edit
                  </button>
                  <button
                    style={{ ...styles.editBtn, ...styles.deleteRowBtn }}
                    onClick={() => setPendingDelete(asset)}
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : null}
    </div>
  );
}

const styles = {
  page: {
    maxWidth: '900px',
    margin: '0 auto',
    padding: '2rem 1.5rem',
  } as React.CSSProperties,
  header: {
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: '2rem',
    borderBottom: '1px solid #1e293b',
    paddingBottom: '1rem',
  } as React.CSSProperties,
  title: {
    fontSize: '1.5rem',
    fontWeight: 600,
    color: '#f1f5f9',
    letterSpacing: '-0.02em',
  } as React.CSSProperties,
  count: {
    fontSize: '0.875rem',
    color: '#64748b',
    display: 'block',
    marginTop: '0.125rem',
  } as React.CSSProperties,
  addBtn: {
    background: '#3b82f6',
    border: 'none',
    borderRadius: '6px',
    color: '#fff',
    cursor: 'pointer',
    fontSize: '0.875rem',
    fontWeight: 500,
    padding: '0.5rem 1rem',
    fontFamily: 'inherit',
    whiteSpace: 'nowrap' as const,
  } as React.CSSProperties,
  centred: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '60vh',
  } as React.CSSProperties,
  muted: {
    color: '#64748b',
    fontSize: '0.875rem',
  } as React.CSSProperties,
  empty: {
    textAlign: 'center' as const,
    padding: '4rem 0',
  } as React.CSSProperties,
  emptyText: {
    color: '#94a3b8',
    fontSize: '1rem',
    marginBottom: '0.5rem',
  } as React.CSSProperties,
  table: {
    width: '100%',
    borderCollapse: 'collapse' as const,
    fontSize: '0.9rem',
  } as React.CSSProperties,
  th: {
    padding: '0.5rem 0.75rem',
    fontSize: '0.75rem',
    fontWeight: 500,
    color: '#64748b',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.07em',
    borderBottom: '1px solid #1e293b',
    textAlign: 'left' as const,
  } as React.CSSProperties,
  td: {
    padding: '0.875rem 0.75rem',
    borderBottom: '1px solid #0f172a',
    verticalAlign: 'middle',
  } as React.CSSProperties,
  row: {
    background: '#0f172a',
    transition: 'background 0.1s',
  } as React.CSSProperties,
  right: { textAlign: 'right' as const },
  assetName: {
    display: 'block',
    color: '#e2e8f0',
    fontWeight: 500,
  } as React.CSSProperties,
  typeLabel: {
    display: 'block',
    fontSize: '0.75rem',
    color: '#475569',
    marginTop: '0.1rem',
  } as React.CSSProperties,
  value: {
    color: '#e2e8f0',
    fontVariantNumeric: 'tabular-nums',
  } as React.CSSProperties,
  currency: {
    marginLeft: '0.3rem',
    fontSize: '0.75rem',
    color: '#64748b',
  } as React.CSSProperties,
  weight: {
    color: '#94a3b8',
    fontVariantNumeric: 'tabular-nums',
  } as React.CSSProperties,
  placeholder: {
    color: '#334155',
  } as React.CSSProperties,
  editBtn: {
    background: 'transparent',
    border: '1px solid #334155',
    borderRadius: '4px',
    color: '#64748b',
    cursor: 'pointer',
    fontSize: '0.75rem',
    padding: '0.25rem 0.6rem',
    fontFamily: 'inherit',
  } as React.CSSProperties,
  deleteRowBtn: {
    color: '#ef4444',
    borderColor: '#450a0a',
    marginLeft: '0.5rem',
  } as React.CSSProperties,
  dimBtn: {
    background: 'transparent',
    border: '1px solid #334155',
    borderRadius: '6px',
    color: '#94a3b8',
    cursor: 'pointer',
    fontSize: '0.875rem',
    fontWeight: 500,
    padding: '0.5rem 1rem',
    fontFamily: 'inherit',
    whiteSpace: 'nowrap' as const,
  } as React.CSSProperties,
  assetNameBtn: {
    display: 'block',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    color: '#93c5fd',
    fontSize: 'inherit',
    fontWeight: 500,
    padding: 0,
    textDecoration: 'underline',
    textDecorationColor: '#1e40af',
    textUnderlineOffset: '3px',
    fontFamily: 'inherit',
    textAlign: 'left' as const,
  } as React.CSSProperties,
} satisfies Record<string, React.CSSProperties>;
