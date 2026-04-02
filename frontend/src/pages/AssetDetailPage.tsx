import React, { useEffect, useState } from 'react';
import { api } from '../api';
import type { Asset, AssetScore, Mitigation, Tag, AssetTagEntry } from '../types';

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
  const [mitigations, setMitigations] = useState<Record<string, Mitigation[]>>({});
  const [addingMitFor, setAddingMitFor] = useState<string | null>(null);
  const [newMitText, setNewMitText] = useState('');
  const [savingMit, setSavingMit] = useState(false);
  const [editingMitId, setEditingMitId] = useState<string | null>(null);
  const [editMitText, setEditMitText] = useState('');
  const [allTags, setAllTags] = useState<Tag[]>([]);
  const [assetTags, setAssetTags] = useState<Set<string>>(new Set());
  const [togglingTagId, setTogglingTagId] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      api.assets.get(assetId),
      api.scores.listForAsset(assetId),
      api.mitigations.listForAsset(assetId),
      api.tags.list(),
      api.assetTags.list(assetId),
    ])
      .then(([a, s, mits, tags, assignedTags]) => {
        setAsset(a);
        setScores(s);
        const grouped: Record<string, Mitigation[]> = {};
        mits.forEach((m) => {
          if (!grouped[m.dimension_id]) grouped[m.dimension_id] = [];
          grouped[m.dimension_id].push(m);
        });
        setMitigations(grouped);
        setAllTags(tags);
        setAssetTags(new Set((assignedTags as AssetTagEntry[]).map((t) => t.tag_id)));
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

  const handleAddMitigation = async (dimensionId: string) => {
    const text = newMitText.trim();
    if (!text) return;
    setSavingMit(true);
    try {
      const created = await api.mitigations.create(assetId, dimensionId, text);
      setMitigations((prev) => ({
        ...prev,
        [dimensionId]: [...(prev[dimensionId] ?? []), created],
      }));
      setNewMitText('');
      setAddingMitFor(null);
    } catch {
      // silently ignore
    } finally {
      setSavingMit(false);
    }
  };

  const handleDeleteMitigation = async (dimensionId: string, mitId: string) => {
    try {
      await api.mitigations.delete(assetId, mitId);
      setMitigations((prev) => ({
        ...prev,
        [dimensionId]: (prev[dimensionId] ?? []).filter((m) => m.id !== mitId),
      }));
    } catch {
      // silently ignore
    }
  };

  const handleUpdateMitigation = async (dimensionId: string, mitId: string) => {
    const text = editMitText.trim();
    if (!text) { setEditingMitId(null); return; }
    try {
      const updated = await api.mitigations.update(assetId, mitId, text);
      setMitigations((prev) => ({
        ...prev,
        [dimensionId]: (prev[dimensionId] ?? []).map((m) => (m.id === mitId ? updated : m)),
      }));
    } catch {
      // silently ignore
    } finally {
      setEditingMitId(null);
    }
  };

  const handleToggleTag = async (tagId: string) => {
    setTogglingTagId(tagId);
    const isAssigned = assetTags.has(tagId);
    try {
      if (isAssigned) {
        await api.assetTags.remove(assetId, tagId);
        setAssetTags((prev) => {
          const next = new Set(prev);
          next.delete(tagId);
          return next;
        });
      } else {
        await api.assetTags.assign(assetId, tagId);
        setAssetTags((prev) => new Set(prev).add(tagId));
      }
    } catch {
      // silently ignore — state stays unchanged
    } finally {
      setTogglingTagId(null);
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
              scores.map((score, idx) => {
                const dimMitigations = mitigations[score.dimension_id] ?? [];
                return (
                  <div
                    key={score.dimension_id}
                    style={{
                      borderBottom: idx < scores.length - 1 ? '1px solid #0f172a' : 'none',
                    }}
                  >
                    {/* Score row */}
                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns: '1fr 1fr 1fr',
                        alignItems: 'center',
                        padding: '0.875rem 1.25rem',
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

                    {/* Mitigations sub-row */}
                    <div style={{ padding: '0 1.25rem 0.875rem', paddingTop: 0 }}>
                      {dimMitigations.map((m) => (
                        <div
                          key={m.id}
                          style={{
                            display: 'flex', alignItems: 'flex-start', gap: '0.5rem',
                            marginBottom: '0.375rem',
                          }}
                        >
                          <span style={{ color: '#475569', fontSize: '0.75rem', marginTop: 3 }}>▸</span>
                          {editingMitId === m.id ? (
                            <textarea
                              autoFocus
                              value={editMitText}
                              onChange={(e) => setEditMitText(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter' && !e.shiftKey) {
                                  e.preventDefault();
                                  void handleUpdateMitigation(score.dimension_id, m.id);
                                }
                                if (e.key === 'Escape') setEditingMitId(null);
                              }}
                              rows={2}
                              style={{
                                flex: 1, background: '#0f172a', border: '1px solid #3b82f6',
                                borderRadius: 5, color: '#f1f5f9', padding: '0.25rem 0.5rem',
                                fontSize: '0.8125rem', resize: 'vertical', fontFamily: 'inherit',
                                outline: 'none',
                              }}
                            />
                          ) : (
                            <span
                              style={{
                                flex: 1, color: '#94a3b8', fontSize: '0.8125rem',
                                lineHeight: 1.5, cursor: 'pointer',
                              }}
                              onClick={() => { setEditingMitId(m.id); setEditMitText(m.description); }}
                              title="Click to edit"
                            >
                              {m.description}
                            </span>
                          )}
                          <button
                            onClick={() => void handleDeleteMitigation(score.dimension_id, m.id)}
                            style={{
                              background: 'none', border: 'none', color: '#475569',
                              cursor: 'pointer', fontSize: '0.875rem', padding: '0 0.125rem',
                              lineHeight: 1, flexShrink: 0, fontFamily: 'inherit',
                            }}
                            title="Remove mitigation"
                          >
                            ×
                          </button>
                        </div>
                      ))}

                      {addingMitFor === score.dimension_id ? (
                        <div style={{ display: 'flex', gap: '0.5rem', marginTop: 4 }}>
                          <textarea
                            autoFocus
                            placeholder="Describe this mitigation…"
                            value={newMitText}
                            onChange={(e) => setNewMitText(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault();
                                void handleAddMitigation(score.dimension_id);
                              }
                              if (e.key === 'Escape') { setAddingMitFor(null); setNewMitText(''); }
                            }}
                            rows={2}
                            disabled={savingMit}
                            style={{
                              flex: 1, background: '#0f172a', border: '1px solid #334155',
                              borderRadius: 5, color: '#f1f5f9', padding: '0.25rem 0.5rem',
                              fontSize: '0.8125rem', resize: 'vertical', fontFamily: 'inherit',
                              outline: 'none',
                            }}
                          />
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                            <button
                              onClick={() => void handleAddMitigation(score.dimension_id)}
                              disabled={savingMit || !newMitText.trim()}
                              style={{
                                background: savingMit || !newMitText.trim() ? '#334155' : '#3b82f6',
                                border: 'none', borderRadius: 5, color: '#fff',
                                padding: '0.25rem 0.625rem', fontSize: '0.75rem', cursor: 'pointer',
                                fontFamily: 'inherit', fontWeight: 500,
                              }}
                            >
                              Save
                            </button>
                            <button
                              onClick={() => { setAddingMitFor(null); setNewMitText(''); }}
                              style={{
                                background: 'none', border: '1px solid #334155', borderRadius: 5,
                                color: '#64748b', padding: '0.25rem 0.625rem',
                                fontSize: '0.75rem', cursor: 'pointer', fontFamily: 'inherit',
                              }}
                            >
                              Esc
                            </button>
                          </div>
                        </div>
                      ) : (
                        <button
                          onClick={() => {
                            setAddingMitFor(score.dimension_id);
                            setEditingMitId(null);
                          }}
                          style={{
                            background: 'none', border: 'none', color: '#475569',
                            cursor: 'pointer', fontSize: '0.75rem', padding: '0.125rem 0',
                            fontFamily: 'inherit', marginTop: dimMitigations.length > 0 ? 4 : 0,
                          }}
                        >
                          + mitigation
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
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

          {/* Tag assignment section */}
          {allTags.length > 0 && (
            <div style={{ marginTop: '2rem' }}>
              <h2
                style={{
                  margin: '0 0 0.875rem',
                  fontSize: '1rem',
                  fontWeight: 600,
                  color: '#cbd5e1',
                }}
              >
                Tags
              </h2>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                {allTags.map((tag) => {
                  const assigned = assetTags.has(tag.id);
                  const toggling = togglingTagId === tag.id;
                  return (
                    <button
                      key={tag.id}
                      disabled={toggling}
                      onClick={() => void handleToggleTag(tag.id)}
                      style={{
                        border: `1px solid ${assigned ? '#3b82f6' : '#334155'}`,
                        background: assigned ? '#1e3a5f' : 'transparent',
                        color: assigned ? '#93c5fd' : '#64748b',
                        borderRadius: 20,
                        padding: '0.3rem 0.875rem',
                        fontSize: '0.875rem',
                        fontWeight: assigned ? 600 : 400,
                        cursor: toggling ? 'not-allowed' : 'pointer',
                        opacity: toggling ? 0.5 : 1,
                        transition: 'all 0.1s',
                        fontFamily: 'inherit',
                      }}
                    >
                      {assigned ? '✓ ' : ''}🏷 {tag.name}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
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
