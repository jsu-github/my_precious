import React, { useEffect, useState } from 'react';
import { api } from '../api';
import type { Asset, AssetScore } from '../types';

const SCORE_LABELS = ['Extra Low', 'Low', 'Medium', 'High', 'Critical'] as const;
const SCORE_COLORS = ['#22c55e', '#84cc16', '#eab308', '#f97316', '#ef4444'] as const;

interface Props {
  assetId: string;
  onBack: () => void;
}

type ScoreType = 'gross' | 'net';
type SavingKey = `${string}:${ScoreType}`;

export function AssetDetailPage({ assetId, onBack }: Props): React.JSX.Element {
  const [asset, setAsset] = useState<Asset | null>(null);
  const [scores, setScores] = useState<AssetScore[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState<Set<SavingKey>>(new Set());

  useEffect(() => {
    Promise.all([
      api.assets.get(assetId),
      api.scores.listForAsset(assetId),
    ])
      .then(([a, s]) => {
        setAsset(a);
        setScores(s);
      })
      .catch(() => setError('Failed to load asset'))
      .finally(() => setLoading(false));
  }, [assetId]);

  const handleScore = async (
    dimensionId: string,
    type: ScoreType,
    currentScore: number | null,
    clicked: number,
  ) => {
    const newScore = currentScore === clicked ? null : clicked;
    const key: SavingKey = `${dimensionId}:${type}`;

    setSaving((prev) => new Set(prev).add(key));

    // Capture existing scores before optimistic update
    const existing = scores.find((s) => s.dimension_id === dimensionId);

    // Optimistic update
    setScores((prev) =>
      prev.map((s) => {
        if (s.dimension_id !== dimensionId) return s;
        return type === 'gross'
          ? { ...s, gross_score: newScore }
          : { ...s, net_score: newScore };
      }),
    );

    try {
      const updatedRow = await api.scores.updateScore(assetId, dimensionId, {
        gross_score: type === 'gross' ? newScore : (existing?.gross_score ?? null),
        net_score: type === 'net' ? newScore : (existing?.net_score ?? null),
      });
      setScores((prev) =>
        prev.map((s) => (s.dimension_id === dimensionId ? updatedRow : s)),
      );
    } catch {
      // Revert optimistic update on failure
      setScores((prev) =>
        prev.map((s) => {
          if (s.dimension_id !== dimensionId) return s;
          return type === 'gross'
            ? { ...s, gross_score: currentScore }
            : { ...s, net_score: currentScore };
        }),
      );
    } finally {
      setSaving((prev) => {
        const next = new Set(prev);
        next.delete(key);
        return next;
      });
    }
  };

  const formatValue = (a: Asset) => {
    try {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: a.currency,
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }).format(Number(a.value));
    } catch {
      return `${a.currency} ${a.value}`;
    }
  };

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: '2rem 1.5rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem', marginBottom: '2rem' }}>
        <button
          onClick={onBack}
          style={{
            background: 'none', border: '1px solid #334155', color: '#94a3b8',
            borderRadius: 6, padding: '0.375rem 0.75rem', cursor: 'pointer',
            fontSize: '0.875rem', flexShrink: 0, marginTop: 4, fontFamily: 'inherit',
          }}
        >
          ← Back
        </button>
        {asset && (
          <div>
            <h1 style={{ margin: '0 0 0.25rem', fontSize: '1.5rem', fontWeight: 700, color: '#f1f5f9' }}>
              {asset.name}
            </h1>
            <div style={{ display: 'flex', gap: '1rem', color: '#94a3b8', fontSize: '0.9rem' }}>
              <span>{asset.type_label}</span>
              <span>·</span>
              <span style={{ color: '#cbd5e1', fontWeight: 500 }}>{formatValue(asset)}</span>
            </div>
          </div>
        )}
      </div>

      {error && (
        <div style={{
          background: '#450a0a', border: '1px solid #7f1d1d', color: '#fca5a5',
          borderRadius: 8, padding: '0.75rem 1rem', marginBottom: '1.5rem', fontSize: '0.875rem',
        }}>
          {error}
        </div>
      )}

      {loading ? (
        <p style={{ color: '#64748b', textAlign: 'center', paddingTop: '3rem' }}>Loading…</p>
      ) : (
        <>
          <div style={{
            background: '#1e293b', borderRadius: 10, border: '1px solid #334155', overflow: 'hidden',
          }}>
            {/* Table header */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr 1fr',
              padding: '0.625rem 1.25rem',
              borderBottom: '1px solid #334155',
              background: '#0f172a',
            }}>
              {(['Dimension', 'Gross Risk', 'Net Risk'] as const).map((label, i) => (
                <span
                  key={label}
                  style={{
                    color: '#64748b', fontSize: '0.8125rem', fontWeight: 600,
                    textTransform: 'uppercase', letterSpacing: '0.05em',
                    textAlign: i === 0 ? 'left' : 'center',
                  }}
                >
                  {label}
                </span>
              ))}
            </div>

            {scores.length === 0 ? (
              <p style={{ color: '#64748b', textAlign: 'center', padding: '3rem 1rem', margin: 0 }}>
                No risk dimensions configured. Add dimensions first.
              </p>
            ) : (
              scores.map((score, idx) => (
                <div
                  key={score.dimension_id}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr 1fr',
                    alignItems: 'center',
                    padding: '0.875rem 1.25rem',
                    borderBottom: idx < scores.length - 1 ? '1px solid #0f172a' : 'none',
                    gap: '1rem',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{ fontSize: '0.875rem', color: score.is_default ? '#f59e0b' : '#475569' }}>
                      {score.is_default ? '🔒' : '◈'}
                    </span>
                    <span style={{ color: '#e2e8f0', fontWeight: 500, fontSize: '0.9375rem' }}>
                      {score.dimension_name}
                    </span>
                  </div>

                  <ScoreButtonGroup
                    value={score.gross_score}
                    saving={saving.has(`${score.dimension_id}:gross`)}
                    onSelect={(v) => void handleScore(score.dimension_id, 'gross', score.gross_score, v)}
                  />

                  <ScoreButtonGroup
                    value={score.net_score}
                    saving={saving.has(`${score.dimension_id}:net`)}
                    onSelect={(v) => void handleScore(score.dimension_id, 'net', score.net_score, v)}
                  />
                </div>
              ))
            )}
          </div>

          {/* Legend */}
          <div style={{ display: 'flex', gap: '1.5rem', marginTop: '1.25rem', flexWrap: 'wrap' }}>
            {SCORE_LABELS.map((label, i) => (
              <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                <span style={{
                  width: 12, height: 12, borderRadius: 3, background: SCORE_COLORS[i],
                  display: 'inline-block', flexShrink: 0,
                }} />
                <span style={{ color: '#64748b', fontSize: '0.8125rem' }}>
                  {i + 1} = {label}
                </span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

interface ScoreButtonGroupProps {
  value: number | null;
  saving: boolean;
  onSelect: (score: number) => void;
}

function ScoreButtonGroup({ value, saving, onSelect }: ScoreButtonGroupProps): React.JSX.Element {
  return (
    <div style={{ display: 'flex', gap: 4, justifyContent: 'center', flexWrap: 'wrap', opacity: saving ? 0.6 : 1 }}>
      {SCORE_LABELS.map((label, i) => {
        const score = i + 1;
        const isActive = value === score;
        return (
          <button
            key={score}
            title={`${score} — ${label}`}
            disabled={saving}
            onClick={() => onSelect(score)}
            style={{
              width: 32,
              height: 32,
              borderRadius: 6,
              border: isActive ? `2px solid ${SCORE_COLORS[i]}` : '2px solid transparent',
              background: isActive ? `${SCORE_COLORS[i]}33` : '#0f172a',
              color: isActive ? SCORE_COLORS[i] : '#475569',
              fontWeight: 700,
              fontSize: '0.8125rem',
              cursor: saving ? 'not-allowed' : 'pointer',
              transition: 'all 0.1s',
              fontFamily: 'inherit',
            }}
          >
            {score}
          </button>
        );
      })}
    </div>
  );
}
