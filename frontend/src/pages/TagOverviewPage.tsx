import React, { useEffect, useState } from 'react';
import { api } from '../api';
import type { TagOverview } from '../types';

interface Props {
  onBack: () => void;
}

function fmt(value: number, currency: string): string {
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      maximumFractionDigits: 0,
    }).format(value);
  } catch {
    return `${currency} ${value.toLocaleString()}`;
  }
}

export function TagOverviewPage({ onBack }: Props): React.JSX.Element {
  const [overview, setOverview] = useState<TagOverview[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  useEffect(() => {
    api.tags
      .overview()
      .then((data) => {
        setOverview(data);
        // Auto-expand tags that have assets
        setExpanded(new Set(data.filter((t) => t.asset_count > 0).map((t) => t.tag_id)));
      })
      .catch(() => setError('Failed to load tag overview'))
      .finally(() => setLoading(false));
  }, []);

  const toggleExpand = (tagId: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(tagId) ? next.delete(tagId) : next.add(tagId);
      return next;
    });
  };

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: '2rem 1.5rem' }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '1rem',
          marginBottom: '2rem',
        }}
      >
        <button
          onClick={onBack}
          style={{
            background: 'none',
            border: '1px solid #334155',
            color: '#94a3b8',
            borderRadius: 6,
            padding: '0.375rem 0.75rem',
            cursor: 'pointer',
            fontSize: '0.875rem',
            fontFamily: 'inherit',
          }}
        >
          ← Back
        </button>
        <h1 style={{ margin: 0, fontSize: '1.375rem', fontWeight: 600, color: '#f1f5f9' }}>
          Tag Overview
        </h1>
      </div>

      {error && (
        <div
          style={{
            background: '#450a0a',
            border: '1px solid #7f1d1d',
            color: '#fca5a5',
            borderRadius: 8,
            padding: '0.75rem 1rem',
            marginBottom: '1.5rem',
            fontSize: '0.875rem',
          }}
        >
          {error}
        </div>
      )}

      {loading ? (
        <p style={{ color: '#64748b', textAlign: 'center', paddingTop: '3rem' }}>Loading…</p>
      ) : overview.length === 0 ? (
        <p style={{ color: '#64748b', textAlign: 'center', paddingTop: '3rem' }}>
          No tags found. Create tags and assign them to assets first.
        </p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {overview.map((tag) => {
            const isExpanded = expanded.has(tag.tag_id);
            const hasAssets = tag.asset_count > 0;
            return (
              <div
                key={tag.tag_id}
                style={{
                  background: '#1e293b',
                  borderRadius: 10,
                  border: '1px solid #334155',
                  overflow: 'hidden',
                }}
              >
                {/* Tag header row */}
                <button
                  onClick={() => hasAssets && toggleExpand(tag.tag_id)}
                  style={{
                    width: '100%',
                    textAlign: 'left',
                    background: 'none',
                    border: 'none',
                    cursor: hasAssets ? 'pointer' : 'default',
                    padding: '1rem 1.25rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '1rem',
                    color: 'inherit',
                    fontFamily: 'inherit',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <span style={{ fontSize: '1rem', color: '#f1f5f9', fontWeight: 600 }}>
                      🏷 {tag.tag_name}
                    </span>
                    <span
                      style={{
                        fontSize: '0.8125rem',
                        color: '#64748b',
                        background: '#0f172a',
                        borderRadius: 12,
                        padding: '0.125rem 0.625rem',
                        border: '1px solid #1e293b',
                      }}
                    >
                      {tag.asset_count} asset{tag.asset_count !== 1 ? 's' : ''}
                    </span>
                  </div>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'baseline',
                      gap: '1rem',
                      flexShrink: 0,
                    }}
                  >
                    {hasAssets ? (
                      <>
                        <span
                          style={{
                            fontSize: '0.9375rem',
                            color: '#e2e8f0',
                            fontVariantNumeric: 'tabular-nums',
                          }}
                        >
                          {tag.portfolio_pct.toFixed(1)}% of portfolio
                        </span>
                        <span style={{ color: '#64748b', fontSize: '0.875rem' }}>
                          {isExpanded ? '▲' : '▼'}
                        </span>
                      </>
                    ) : (
                      <span style={{ color: '#64748b', fontSize: '0.875rem' }}>
                        No assets assigned
                      </span>
                    )}
                  </div>
                </button>

                {/* Expanded asset rows */}
                {isExpanded && hasAssets && (
                  <div style={{ borderTop: '1px solid #334155' }}>
                    {/* Column headers */}
                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns: '1fr 11rem 7rem',
                        padding: '0.5rem 1.25rem',
                        background: '#0f172a',
                        fontSize: '0.75rem',
                        color: '#64748b',
                        fontWeight: 500,
                        textTransform: 'uppercase',
                        letterSpacing: '0.04em',
                      }}
                    >
                      <span>Asset</span>
                      <span style={{ textAlign: 'right' }}>Capital Value</span>
                      <span style={{ textAlign: 'right' }}>Portfolio %</span>
                    </div>

                    {/* Asset rows */}
                    {tag.assets.map((asset, idx) => (
                      <div
                        key={asset.id}
                        style={{
                          display: 'grid',
                          gridTemplateColumns: '1fr 11rem 7rem',
                          padding: '0.625rem 1.25rem',
                          alignItems: 'center',
                          borderTop: idx > 0 ? '1px solid #1e293b' : 'none',
                        }}
                      >
                        <span style={{ color: '#cbd5e1', fontSize: '0.9375rem' }}>
                          {asset.name}
                        </span>
                        <span
                          style={{
                            textAlign: 'right',
                            color: '#e2e8f0',
                            fontSize: '0.9375rem',
                            fontVariantNumeric: 'tabular-nums',
                          }}
                        >
                          {fmt(asset.value, asset.currency)}
                        </span>
                        <span
                          style={{
                            textAlign: 'right',
                            color: '#94a3b8',
                            fontSize: '0.875rem',
                            fontVariantNumeric: 'tabular-nums',
                          }}
                        >
                          {asset.capital_weight_pct.toFixed(1)}%
                        </span>
                      </div>
                    ))}

                    {/* Combined total row */}
                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns: '1fr 11rem 7rem',
                        padding: '0.625rem 1.25rem',
                        borderTop: '1px solid #334155',
                        background: '#0f172a',
                      }}
                    >
                      <span
                        style={{ color: '#64748b', fontSize: '0.875rem', fontWeight: 600 }}
                      >
                        Combined
                      </span>
                      <span
                        style={{
                          textAlign: 'right',
                          color: '#60a5fa',
                          fontWeight: 600,
                          fontSize: '0.9375rem',
                          fontVariantNumeric: 'tabular-nums',
                        }}
                      >
                        {fmt(tag.combined_value, tag.assets[0]?.currency ?? 'EUR')}
                      </span>
                      <span
                        style={{
                          textAlign: 'right',
                          color: '#60a5fa',
                          fontWeight: 600,
                          fontSize: '0.875rem',
                          fontVariantNumeric: 'tabular-nums',
                        }}
                      >
                        {tag.portfolio_pct.toFixed(1)}%
                      </span>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
