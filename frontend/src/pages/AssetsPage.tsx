import React, { useEffect, useState } from 'react';
import { api } from '../api';
import type { Asset } from '../types';

export function AssetsPage(): React.JSX.Element {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.assets.list()
      .then(setAssets)
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

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
        <h1 style={styles.title}>Portfolio</h1>
        <span style={styles.count}>
          {assets.length} {assets.length === 1 ? 'asset' : 'assets'}
        </span>
      </header>

      {assets.length === 0 ? (
        <div style={styles.empty}>
          <p style={styles.emptyText}>No assets yet.</p>
          <p style={styles.muted}>Add your first asset to start tracking sovereign risk.</p>
        </div>
      ) : (
        <table style={styles.table}>
          <thead>
            <tr>
              <th style={styles.th}>Asset</th>
              <th style={{ ...styles.th, ...styles.right }}>Value</th>
              <th style={{ ...styles.th, ...styles.right }}>Weight</th>
              <th style={{ ...styles.th, ...styles.right }}>Net Risk</th>
            </tr>
          </thead>
          <tbody>
            {assets.map((asset) => (
              <tr key={asset.id} style={styles.row}>
                <td style={styles.td}>
                  <span style={styles.assetName}>{asset.name}</span>
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
              </tr>
            ))}
          </tbody>
        </table>
      )}
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
    alignItems: 'baseline',
    gap: '1rem',
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
} satisfies Record<string, React.CSSProperties>;
