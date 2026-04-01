import type { Asset, AssetCreateInput, AssetUpdateInput } from './types';

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
};
