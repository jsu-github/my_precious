/** Shared field primitives used across all CRUD modals */

import type { InputHTMLAttributes, SelectHTMLAttributes, TextareaHTMLAttributes } from 'react';

interface FieldProps {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}

export function Field({ label, required, children }: FieldProps) {
  return (
    <div>
      <label className="block text-[11px] font-medium text-on-surface-variant/60 uppercase tracking-wider mb-1.5">
        {label}{required && <span className="text-error ml-0.5">*</span>}
      </label>
      {children}
    </div>
  );
}

const inputClass =
  'w-full bg-surface-highest border border-outline-variant/40 rounded px-3 py-2 text-sm text-on-surface ' +
  'placeholder-on-surface-variant/30 focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-colors';

export function Input(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={inputClass} />;
}

export function Select(props: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={inputClass + ' cursor-pointer'} />;
}

export function Textarea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={inputClass + ' resize-none'} />;
}

interface FormActionsProps {
  onCancel: () => void;
  submitLabel?: string;
  loading?: boolean;
  disabled?: boolean;
}

export function FormActions({ onCancel, submitLabel = 'Save', loading, disabled }: FormActionsProps) {
  return (
    <div className="flex justify-end gap-3 pt-4 mt-2 border-t border-outline-variant/20">
      <button
        type="button"
        onClick={onCancel}
        className="px-4 py-2 text-sm text-on-surface-variant/60 hover:text-on-surface transition-colors"
        disabled={loading}
      >
        Cancel
      </button>
      <button
        type="submit"
        disabled={disabled || loading}
        className="px-5 py-2 bg-primary/15 border border-primary/30 rounded text-sm text-primary hover:bg-primary/20 transition-colors disabled:opacity-40 font-medium"
      >
        {loading ? 'Saving…' : submitLabel}
      </button>
    </div>
  );
}

export function ErrorMessage({ message }: { message: string }) {
  return (
    <p className="text-xs text-error bg-error/10 border border-error/20 rounded px-3 py-2">{message}</p>
  );
}
