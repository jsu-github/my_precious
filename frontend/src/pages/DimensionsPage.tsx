import React, { useEffect, useRef, useState } from 'react';
import { api } from '../api';
import type { Dimension } from '../types';

interface Props {
  onBack: () => void;
}

export function DimensionsPage({ onBack }: Props): React.JSX.Element {
  const [dimensions, setDimensions] = useState<Dimension[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Inline editing state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const editInputRef = useRef<HTMLInputElement>(null);

  // Add form state
  const [addName, setAddName] = useState('');
  const [addDesc, setAddDesc] = useState('');
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);

  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    api.dimensions.list()
      .then(setDimensions)
      .catch(() => setError('Failed to load dimensions'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (editingId && editInputRef.current) {
      editInputRef.current.focus();
      editInputRef.current.select();
    }
  }, [editingId]);

  const startEdit = (dim: Dimension) => {
    setEditingId(dim.id);
    setEditName(dim.name);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditName('');
  };

  const commitEdit = async (id: string) => {
    const trimmed = editName.trim();
    if (!trimmed) return cancelEdit();
    try {
      const updated = await api.dimensions.update(id, { name: trimmed });
      setDimensions((prev) => prev.map((d) => (d.id === id ? updated : d)));
      setEditingId(null);
    } catch {
      // Keep editing open so user can retry
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent, id: string) => {
    if (e.key === 'Enter') void commitEdit(id);
    if (e.key === 'Escape') cancelEdit();
  };

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try {
      await api.dimensions.delete(id);
      setDimensions((prev) => prev.filter((d) => d.id !== id));
    } catch {
      setError('Failed to delete dimension');
    } finally {
      setDeletingId(null);
    }
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = addName.trim();
    if (!trimmedName) return;
    setAdding(true);
    setAddError(null);
    try {
      const created = await api.dimensions.create({
        name: trimmedName,
        description: addDesc.trim() || null,
      });
      setDimensions((prev) => [...prev, created]);
      setAddName('');
      setAddDesc('');
    } catch {
      setAddError('Failed to add dimension');
    } finally {
      setAdding(false);
    }
  };

  return (
    <div style={{ maxWidth: 760, margin: '0 auto', padding: '2rem 1.5rem' }}>
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
        <h1 style={{ margin: 0, fontSize: '1.375rem', fontWeight: 600, color: '#f1f5f9' }}>
          Risk Dimensions
        </h1>
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
        <div style={{
          background: '#1e293b', borderRadius: 10, border: '1px solid #334155', overflow: 'hidden',
          marginBottom: '2rem',
        }}>
          {dimensions.length === 0 ? (
            <p style={{ color: '#64748b', textAlign: 'center', padding: '3rem 1rem', margin: 0 }}>
              No dimensions yet.
            </p>
          ) : (
            dimensions.map((dim, idx) => (
              <div
                key={dim.id}
                style={{
                  display: 'flex', alignItems: 'center', gap: '0.75rem',
                  padding: '0.875rem 1.25rem',
                  borderBottom: idx < dimensions.length - 1 ? '1px solid #334155' : 'none',
                  minHeight: 56,
                }}
              >
                <span
                  title={dim.is_default ? 'Built-in dimension — cannot be deleted' : 'Custom dimension'}
                  style={{ fontSize: '1rem', flexShrink: 0, color: dim.is_default ? '#f59e0b' : '#475569' }}
                >
                  {dim.is_default ? '🔒' : '◈'}
                </span>

                <div style={{ flex: 1, minWidth: 0 }}>
                  {editingId === dim.id ? (
                    <input
                      ref={editInputRef}
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      onBlur={() => void commitEdit(dim.id)}
                      onKeyDown={(e) => handleKeyDown(e, dim.id)}
                      style={{
                        background: '#0f172a', border: '1px solid #3b82f6', borderRadius: 6,
                        color: '#f1f5f9', padding: '0.25rem 0.5rem', fontSize: '0.9375rem',
                        width: '100%', outline: 'none', fontFamily: 'inherit',
                      }}
                    />
                  ) : (
                    <button
                      onClick={() => startEdit(dim)}
                      title="Click to rename"
                      style={{
                        background: 'none', border: 'none', cursor: 'pointer',
                        color: '#f1f5f9', fontSize: '0.9375rem', fontWeight: 500,
                        padding: 0, textAlign: 'left', width: '100%', fontFamily: 'inherit',
                      }}
                    >
                      {dim.name}
                    </button>
                  )}
                </div>

                {!dim.is_default && (
                  <button
                    onClick={() => void handleDelete(dim.id)}
                    disabled={deletingId === dim.id}
                    style={{
                      background: 'none', border: '1px solid #7f1d1d', color: '#f87171',
                      borderRadius: 6, padding: '0.25rem 0.625rem', cursor: 'pointer',
                      fontSize: '0.8125rem', flexShrink: 0,
                      opacity: deletingId === dim.id ? 0.5 : 1,
                      fontFamily: 'inherit',
                    }}
                  >
                    {deletingId === dim.id ? '…' : 'Delete'}
                  </button>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {/* Add custom dimension form */}
      <div style={{
        background: '#1e293b', borderRadius: 10, border: '1px solid #334155', padding: '1.25rem',
      }}>
        <h2 style={{ margin: '0 0 1rem', fontSize: '1rem', fontWeight: 600, color: '#cbd5e1' }}>
          Add Custom Dimension
        </h2>
        {addError && (
          <p style={{ color: '#fca5a5', fontSize: '0.875rem', margin: '0 0 0.75rem' }}>{addError}</p>
        )}
        <form onSubmit={(e) => void handleAdd(e)} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <input
            type="text"
            placeholder="Dimension name (required)"
            value={addName}
            onChange={(e) => setAddName(e.target.value)}
            required
            style={{
              background: '#0f172a', border: '1px solid #334155', borderRadius: 6,
              color: '#f1f5f9', padding: '0.5rem 0.75rem', fontSize: '0.9375rem',
              outline: 'none', fontFamily: 'inherit',
            }}
          />
          <input
            type="text"
            placeholder="Description (optional)"
            value={addDesc}
            onChange={(e) => setAddDesc(e.target.value)}
            style={{
              background: '#0f172a', border: '1px solid #334155', borderRadius: 6,
              color: '#f1f5f9', padding: '0.5rem 0.75rem', fontSize: '0.9375rem',
              outline: 'none', fontFamily: 'inherit',
            }}
          />
          <button
            type="submit"
            disabled={adding || !addName.trim()}
            style={{
              background: adding || !addName.trim() ? '#334155' : '#3b82f6',
              border: 'none', borderRadius: 6, color: '#fff',
              padding: '0.5rem 1.25rem', fontWeight: 600, fontSize: '0.9375rem',
              cursor: adding || !addName.trim() ? 'not-allowed' : 'pointer',
              alignSelf: 'flex-start', fontFamily: 'inherit',
            }}
          >
            {adding ? 'Adding…' : '+ Add Dimension'}
          </button>
        </form>
      </div>
    </div>
  );
}
