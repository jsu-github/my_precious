import React, { useEffect, useState } from 'react';
import { api } from '../api';
import type { Tag } from '../types';

interface Props {
  onBack: () => void;
  onNavigateToOverview: () => void;
}

export function TagsPage({ onBack, onNavigateToOverview }: Props): React.JSX.Element {
  const [tags, setTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newName, setNewName] = useState('');
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    api.tags
      .list()
      .then(setTags)
      .catch(() => setError('Failed to load tags'))
      .finally(() => setLoading(false));
  }, []);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newName.trim();
    if (!trimmed) return;
    setAdding(true);
    setAddError(null);
    try {
      const created = await api.tags.create({ name: trimmed });
      setTags((prev) => [...prev, created].sort((a, b) => a.name.localeCompare(b.name)));
      setNewName('');
    } catch (err) {
      setAddError(err instanceof Error ? err.message : 'Failed to create tag');
    } finally {
      setAdding(false);
    }
  };

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    setError(null);
    try {
      await api.tags.delete(id);
      setTags((prev) => prev.filter((t) => t.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete tag');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div style={{ maxWidth: 760, margin: '0 auto', padding: '2rem 1.5rem' }}>
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
          Tags
        </h1>
        <button
          onClick={onNavigateToOverview}
          style={{
            background: 'none',
            border: '1px solid #334155',
            color: '#94a3b8',
            borderRadius: 6,
            padding: '0.375rem 0.75rem',
            cursor: 'pointer',
            fontSize: '0.875rem',
            fontFamily: 'inherit',
            marginLeft: 'auto',
          }}
        >
          📊 Overview
        </button>
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
      ) : (
        <div
          style={{
            background: '#1e293b',
            borderRadius: 10,
            border: '1px solid #334155',
            overflow: 'hidden',
            marginBottom: '2rem',
          }}
        >
          {tags.length === 0 ? (
            <p
              style={{
                color: '#64748b',
                textAlign: 'center',
                padding: '3rem 1rem',
                margin: 0,
              }}
            >
              No tags yet. Add your first tag below.
            </p>
          ) : (
            tags.map((tag, idx) => (
              <div
                key={tag.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '0.875rem 1.25rem',
                  borderBottom: idx < tags.length - 1 ? '1px solid #334155' : 'none',
                }}
              >
                <span style={{ color: '#f1f5f9', fontWeight: 500 }}>🏷 {tag.name}</span>
                <button
                  onClick={() => void handleDelete(tag.id)}
                  disabled={deletingId === tag.id}
                  style={{
                    background: 'none',
                    border: '1px solid #7f1d1d',
                    color: '#f87171',
                    borderRadius: 6,
                    padding: '0.25rem 0.625rem',
                    cursor: 'pointer',
                    fontSize: '0.8125rem',
                    opacity: deletingId === tag.id ? 0.5 : 1,
                    fontFamily: 'inherit',
                  }}
                >
                  {deletingId === tag.id ? '…' : 'Delete'}
                </button>
              </div>
            ))
          )}
        </div>
      )}

      <div
        style={{
          background: '#1e293b',
          borderRadius: 10,
          border: '1px solid #334155',
          padding: '1.25rem',
        }}
      >
        <h2
          style={{
            margin: '0 0 1rem',
            fontSize: '1rem',
            fontWeight: 600,
            color: '#cbd5e1',
          }}
        >
          Create Tag
        </h2>
        {addError && (
          <p style={{ color: '#fca5a5', fontSize: '0.875rem', margin: '0 0 0.75rem' }}>
            {addError}
          </p>
        )}
        <form onSubmit={(e) => void handleAdd(e)} style={{ display: 'flex', gap: '0.75rem' }}>
          <input
            type="text"
            placeholder="Tag name (e.g. EU jurisdiction)"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            required
            style={{
              flex: 1,
              background: '#0f172a',
              border: '1px solid #334155',
              borderRadius: 6,
              color: '#f1f5f9',
              padding: '0.5rem 0.75rem',
              fontSize: '0.9375rem',
              outline: 'none',
              fontFamily: 'inherit',
            }}
          />
          <button
            type="submit"
            disabled={adding || !newName.trim()}
            style={{
              background: adding || !newName.trim() ? '#334155' : '#3b82f6',
              border: 'none',
              borderRadius: 6,
              color: '#fff',
              padding: '0.5rem 1.25rem',
              fontWeight: 600,
              fontSize: '0.9375rem',
              cursor: adding || !newName.trim() ? 'not-allowed' : 'pointer',
              fontFamily: 'inherit',
              flexShrink: 0,
            }}
          >
            {adding ? 'Creating…' : 'Create'}
          </button>
        </form>
      </div>
    </div>
  );
}
