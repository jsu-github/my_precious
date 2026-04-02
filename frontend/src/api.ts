import type { Asset, AssetCreateInput, AssetUpdateInput, Dimension, DimensionCreateInput, DimensionUpdateInput, AssetScore, UpdateScoreInput, Mitigation, Tag, TagCreateInput, AssetTagEntry, TagOverview } from './types';

const BASE = (import.meta.env.VITE_API_URL as string | undefined) ?? '';

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error((body as { error?: { message?: string } }).error?.message ?? `HTTP ${res.status}`);
  }
  if (res.status === 204) return undefined as unknown as T;
  return res.json() as Promise<T>;
}

export const api = {
  assets: {
    list: () => request<Asset[]>('/api/assets'),
    get: (id: string) => request<Asset>(`/api/assets/${id}`),
    create: (data: AssetCreateInput) =>
      request<Asset>('/api/assets', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: AssetUpdateInput) =>
      request<Asset>(`/api/assets/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id: string) =>
      request<void>(`/api/assets/${id}`, { method: 'DELETE' }),
  },
  dimensions: {
    list: () => request<Dimension[]>('/api/dimensions'),
    create: (data: DimensionCreateInput) =>
      request<Dimension>('/api/dimensions', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: DimensionUpdateInput) =>
      request<Dimension>(`/api/dimensions/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id: string) =>
      request<void>(`/api/dimensions/${id}`, { method: 'DELETE' }),
  },
  scores: {
    listForAsset: (assetId: string) =>
      request<AssetScore[]>(`/api/assets/${assetId}/scores`),
    updateScore: (assetId: string, dimensionId: string, data: UpdateScoreInput) =>
      request<AssetScore>(`/api/assets/${assetId}/scores/${dimensionId}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
  },
  mitigations: {
    listForAsset: (assetId: string) =>
      request<Mitigation[]>(`/api/assets/${assetId}/mitigations`),
    create: (assetId: string, dimensionId: string, description: string) =>
      request<Mitigation>(`/api/assets/${assetId}/mitigations`, {
        method: 'POST',
        body: JSON.stringify({ dimension_id: dimensionId, description }),
      }),
    update: (assetId: string, mitId: string, description: string) =>
      request<Mitigation>(`/api/assets/${assetId}/mitigations/${mitId}`, {
        method: 'PUT',
        body: JSON.stringify({ description }),
      }),
    delete: (assetId: string, mitId: string) =>
      request<void>(`/api/assets/${assetId}/mitigations/${mitId}`, { method: 'DELETE' }),
  },
  tags: {
    list: () => request<Tag[]>('/api/tags'),
    overview: () => request<TagOverview[]>('/api/tags/overview'),
    create: (data: TagCreateInput) =>
      request<Tag>('/api/tags', { method: 'POST', body: JSON.stringify(data) }),
    delete: (id: string) =>
      request<void>(`/api/tags/${id}`, { method: 'DELETE' }),
  },
  assetTags: {
    list: (assetId: string) =>
      request<AssetTagEntry[]>(`/api/assets/${assetId}/tags`),
    assign: (assetId: string, tagId: string) =>
      request<AssetTagEntry>(`/api/assets/${assetId}/tags`, {
        method: 'POST',
        body: JSON.stringify({ tag_id: tagId }),
      }),
    remove: (assetId: string, tagId: string) =>
      request<void>(`/api/assets/${assetId}/tags/${tagId}`, { method: 'DELETE' }),
  },
};
