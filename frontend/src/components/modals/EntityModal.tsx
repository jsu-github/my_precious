import { useState } from 'react';
import { api } from '../../api';
import type { Entity, CreateEntity, EntityType } from '../../types';
import Modal from './Modal';
import { Field, Input, Select, Textarea, FormActions, ErrorMessage } from './FormFields';

interface Props {
  entity?: Entity; // undefined = create mode
  onSaved: (entity: Entity) => void;
  onClose: () => void;
}

export default function EntityModal({ entity, onSaved, onClose }: Props) {
  const isEdit = !!entity;
  const [form, setForm] = useState<CreateEntity>({
    type: entity?.type ?? 'personal',
    name: entity?.name ?? '',
    description: entity?.description ?? null,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const saved = isEdit
        ? await api.entities.update(entity!.id, form)
        : await api.entities.create(form);
      onSaved(saved);
    } catch (err) {
      setError(String(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal title={isEdit ? 'Edit Entity' : 'New Entity'} onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <Field label="Name" required>
          <Input
            required
            autoFocus
            placeholder="e.g. Montana Family Trust"
            value={form.name}
            onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
          />
        </Field>
        <Field label="Type" required>
          <Select
            value={form.type}
            onChange={e => setForm(f => ({ ...f, type: e.target.value as EntityType }))}
          >
            <option value="personal">Personal</option>
            <option value="business">Business</option>
          </Select>
        </Field>
        <Field label="Description">
          <Textarea
            rows={3}
            placeholder="Optional notes about this entity…"
            value={form.description ?? ''}
            onChange={e => setForm(f => ({ ...f, description: e.target.value || null }))}
          />
        </Field>
        {error && <ErrorMessage message={error} />}
        <FormActions onCancel={onClose} loading={saving} submitLabel={isEdit ? 'Update' : 'Create'} />
      </form>
    </Modal>
  );
}
