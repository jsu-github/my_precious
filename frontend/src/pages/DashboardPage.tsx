import React, { useState, useEffect, useCallback } from 'react';
import { api } from '../api';
import type { PortfolioSummary } from '../types';
import { RadarChart } from '../components/RadarChart';

interface Props {
  onBack: () => void;
}

const scoreColor = (s: number | null): string => {
  if (s === null) return '#64748b';
  if (s <= 2) return '#22c55e';
  if (s === 3) return '#f59e0b';
  return '#ef4444';
};

const scoreLabel = (s: number | null): string => {
  if (s === null) return 'No scores';
  const names = ['', 'Extra Low', 'Low', 'Medium', 'High', 'Critical'];
  return `${s.toFixed(2)} — ${names[Math.round(s)] ?? ''}`;
};

const fmtValue = (v: number): string => {
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'EUR',
      maximumFractionDigits: 0,
    }).format(v);
  } catch {
    return `€${v.toLocaleString()}`;
  }
};

export function DashboardPage({ onBack }: Props): React.JSX.Element {
  const [data, setData] = useState<PortfolioSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = useCallback(() => {
    setRefreshing(true);
    api.portfolio
      .summary()
      .then(setData)
      .catch(() => setError('Failed to load portfolio summary'))
      .finally(() => {
        setLoading(false);
        setRefreshing(false);
      });
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', padding: '2rem 1.5rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2rem' }}>
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
        <h1
          style={{
            margin: 0,
            fontSize: '1.375rem',
            fontWeight: 600,
            color: '#f1f5f9',
            flexGrow: 1,
          }}
        >
          📊 Portfolio Dashboard
        </h1>
        <button
          onClick={() => void fetchData()}
          disabled={refreshing}
          style={{
            background: 'none',
            border: '1px solid #334155',
            color: refreshing ? '#475569' : '#94a3b8',
            borderRadius: 6,
            padding: '0.375rem 0.75rem',
            cursor: refreshing ? 'default' : 'pointer',
            fontSize: '0.875rem',
            fontFamily: 'inherit',
          }}
        >
          {refreshing ? '…' : '↻ Refresh'}
        </button>
      </div>

      {/* Error */}
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
      ) : data === null ? null : data.asset_count === 0 ? (
        <p style={{ color: '#64748b', textAlign: 'center', paddingTop: '3rem' }}>
          No assets in portfolio yet. Add assets and score them to see dashboard metrics.
        </p>
      ) : (
        <>
          {/* Metrics strip — 4 cards */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(4, 1fr)',
              gap: '1rem',
              marginBottom: '1.5rem',
            }}
          >
            {/* Total Portfolio */}
            <MetricCard
              label="Total Portfolio"
              value={fmtValue(data.total_value)}
              valueColor="#f1f5f9"
              subtitle={`${data.asset_count} asset${data.asset_count !== 1 ? 's' : ''}`}
            />
            {/* Net Risk Score */}
            <MetricCard
              label="Net Risk Score"
              value={data.weighted_net !== null ? data.weighted_net.toFixed(2) : '—'}
              valueColor={scoreColor(data.weighted_net)}
              subtitle={scoreLabel(data.weighted_net)}
            />
            {/* Gross Risk Score */}
            <MetricCard
              label="Gross Risk Score"
              value={data.weighted_gross !== null ? data.weighted_gross.toFixed(2) : '—'}
              valueColor={scoreColor(data.weighted_gross)}
              subtitle={scoreLabel(data.weighted_gross)}
            />
            {/* Dimensions */}
            <MetricCard
              label="Dimensions"
              value={String(data.by_dimension.length)}
              valueColor="#f1f5f9"
              subtitle={`${data.by_dimension.filter((d) => d.scored_asset_count > 0).length} scored`}
            />
          </div>

          {/* Two-column section */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '1.5rem',
            }}
          >
            {/* Left: Risk Heatmap */}
            <div
              style={{
                background: '#1e293b',
                border: '1px solid #334155',
                borderRadius: 10,
                padding: '1.25rem 1.5rem',
              }}
            >
              <h2
                style={{
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  color: '#64748b',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  marginTop: 0,
                  marginBottom: '1.25rem',
                }}
              >
                Risk Heatmap
              </h2>
              <div style={{ display: 'flex', justifyContent: 'center' }}>
                <RadarChart
                  points={data.by_dimension.map((d) => ({
                    label: d.dimension_name,
                    gross: d.weighted_gross,
                    net: d.weighted_net,
                  }))}
                  size={260}
                />
              </div>
              {/* Legend */}
              <div
                style={{
                  display: 'flex',
                  gap: '1.5rem',
                  justifyContent: 'center',
                  marginTop: '1rem',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <div
                    style={{ width: 16, height: 3, background: '#f59e0b', borderRadius: 2 }}
                  />
                  <span style={{ fontSize: '0.8125rem', color: '#94a3b8' }}>Gross Risk</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <div
                    style={{ width: 16, height: 3, background: '#3b82f6', borderRadius: 2 }}
                  />
                  <span style={{ fontSize: '0.8125rem', color: '#94a3b8' }}>Net Risk</span>
                </div>
              </div>
            </div>

            {/* Right: Gross vs Net Breakdown */}
            <div
              style={{
                background: '#1e293b',
                border: '1px solid #334155',
                borderRadius: 10,
                padding: '1.25rem 1.5rem',
              }}
            >
              <h2
                style={{
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  color: '#64748b',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  marginTop: 0,
                  marginBottom: '1rem',
                }}
              >
                Gross vs Net Breakdown
              </h2>

              {/* Column headers */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 5.5rem 5.5rem 5rem',
                  padding: '0.375rem 0.75rem',
                  fontSize: '0.6875rem',
                  color: '#64748b',
                  fontWeight: 500,
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em',
                  background: '#0f172a',
                  borderRadius: 6,
                  marginBottom: '0.25rem',
                }}
              >
                <span>Dimension</span>
                <span style={{ textAlign: 'right', color: '#f59e0b' }}>Gross</span>
                <span style={{ textAlign: 'right', color: '#3b82f6' }}>Net</span>
                <span style={{ textAlign: 'right' }}>Δ Saved</span>
              </div>

              {/* Per-dimension rows */}
              {data.by_dimension.map((d, idx) => {
                const delta =
                  d.weighted_gross !== null && d.weighted_net !== null
                    ? d.weighted_gross - d.weighted_net
                    : null;
                return (
                  <div
                    key={d.dimension_id}
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '1fr 5.5rem 5.5rem 5rem',
                      padding: '0.5rem 0.75rem',
                      borderBottom:
                        idx < data.by_dimension.length - 1 ? '1px solid #0f172a' : 'none',
                      fontSize: '0.875rem',
                    }}
                  >
                    <span style={{ color: d.is_default ? '#f59e0b' : '#e2e8f0' }}>
                      {d.dimension_name}
                      {d.scored_asset_count === 0 && (
                        <span style={{ color: '#64748b', fontSize: '0.75rem', marginLeft: 4 }}>
                          (unscored)
                        </span>
                      )}
                    </span>
                    <span
                      style={{
                        textAlign: 'right',
                        color: scoreColor(d.weighted_gross),
                        fontVariantNumeric: 'tabular-nums',
                      }}
                    >
                      {d.weighted_gross !== null ? d.weighted_gross.toFixed(2) : '—'}
                    </span>
                    <span
                      style={{
                        textAlign: 'right',
                        color: scoreColor(d.weighted_net),
                        fontVariantNumeric: 'tabular-nums',
                      }}
                    >
                      {d.weighted_net !== null ? d.weighted_net.toFixed(2) : '—'}
                    </span>
                    <span
                      style={{
                        textAlign: 'right',
                        fontVariantNumeric: 'tabular-nums',
                        color:
                          delta === null ? '#64748b' : delta > 0 ? '#22c55e' : '#64748b',
                      }}
                    >
                      {delta === null
                        ? '—'
                        : delta > 0
                          ? `−${delta.toFixed(2)}`
                          : '0'}
                    </span>
                  </div>
                );
              })}

              {/* Portfolio total footer row */}
              {data.weighted_gross !== null && data.weighted_net !== null && (
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 5.5rem 5.5rem 5rem',
                    padding: '0.5rem 0.75rem',
                    borderTop: '1px solid #334155',
                    marginTop: '0.25rem',
                    background: '#162032',
                    borderRadius: '0 0 6px 6px',
                    fontSize: '0.875rem',
                  }}
                >
                  <span style={{ color: '#3b82f6', fontWeight: 600 }}>Portfolio Total</span>
                  <span
                    style={{
                      textAlign: 'right',
                      color: scoreColor(data.weighted_gross),
                      fontWeight: 600,
                      fontVariantNumeric: 'tabular-nums',
                    }}
                  >
                    {data.weighted_gross.toFixed(2)}
                  </span>
                  <span
                    style={{
                      textAlign: 'right',
                      color: scoreColor(data.weighted_net),
                      fontWeight: 600,
                      fontVariantNumeric: 'tabular-nums',
                    }}
                  >
                    {data.weighted_net.toFixed(2)}
                  </span>
                  <span
                    style={{
                      textAlign: 'right',
                      color:
                        data.weighted_gross - data.weighted_net > 0 ? '#22c55e' : '#64748b',
                      fontWeight: 600,
                      fontVariantNumeric: 'tabular-nums',
                    }}
                  >
                    {data.weighted_gross - data.weighted_net > 0
                      ? `−${(data.weighted_gross - data.weighted_net).toFixed(2)}`
                      : '0'}
                  </span>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ── Small helper component ──────────────────────────────────────────────────

interface MetricCardProps {
  label: string;
  value: string;
  valueColor: string;
  subtitle?: string;
}

function MetricCard({ label, value, valueColor, subtitle }: MetricCardProps): React.JSX.Element {
  return (
    <div
      style={{
        background: '#1e293b',
        border: '1px solid #334155',
        borderRadius: 10,
        padding: '1.25rem 1.5rem',
      }}
    >
      <div
        style={{
          fontSize: '0.75rem',
          fontWeight: 500,
          color: '#64748b',
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
          marginBottom: '0.5rem',
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontSize: '1.625rem',
          fontWeight: 700,
          color: valueColor,
          lineHeight: 1.2,
          fontVariantNumeric: 'tabular-nums',
        }}
      >
        {value}
      </div>
      {subtitle && (
        <div style={{ fontSize: '0.8125rem', color: '#64748b', marginTop: '0.25rem' }}>
          {subtitle}
        </div>
      )}
    </div>
  );
}
