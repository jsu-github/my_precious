import React from 'react';

interface Props {
  assetName: string;
  deleting: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function DeleteConfirmDialog({
  assetName,
  deleting,
  onConfirm,
  onCancel,
}: Props): React.JSX.Element {
  return (
    <div style={styles.overlay} role="dialog" aria-modal="true" aria-label="Confirm deletion">
      <div style={styles.dialog}>
        <p style={styles.message}>
          Delete <strong style={styles.name}>{assetName}</strong>?
        </p>
        <p style={styles.hint}>This cannot be undone.</p>
        <div style={styles.actions}>
          <button
            type="button"
            onClick={onCancel}
            disabled={deleting}
            style={styles.cancelBtn}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={deleting}
            style={styles.deleteBtn}
          >
            {deleting ? 'Deleting…' : 'Delete'}
          </button>
        </div>
      </div>
    </div>
  );
}

const styles = {
  overlay: {
    position: 'fixed' as const,
    inset: 0,
    background: 'rgba(2, 6, 23, 0.8)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 50,
  } as React.CSSProperties,
  dialog: {
    background: '#0f172a',
    border: '1px solid #1e293b',
    borderRadius: '8px',
    padding: '1.5rem',
    maxWidth: '380px',
    width: '90%',
    boxShadow: '0 4px 32px rgba(0,0,0,0.5)',
  } as React.CSSProperties,
  message: {
    fontSize: '1rem',
    color: '#e2e8f0',
    marginBottom: '0.25rem',
  } as React.CSSProperties,
  name: {
    color: '#f1f5f9',
  } as React.CSSProperties,
  hint: {
    fontSize: '0.8rem',
    color: '#64748b',
    marginBottom: '1.5rem',
  } as React.CSSProperties,
  actions: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '0.75rem',
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
  deleteBtn: {
    background: '#dc2626',
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
