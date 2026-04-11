/**
 * Central API client — ALL fetch calls go through request<T>().
 * Never call fetch() inline in components.
 *
 * Error shape from the server: { error: { message: string, status: number } }
 * On non-OK responses, request() throws the error message as a plain Error.
 */
import type {
  Entity, CreateEntity, UpdateEntity,
  AssetLocation, CreateAssetLocation, UpdateAssetLocation,
  Asset, CreateAsset, UpdateAsset,
  Acquisition, CreateAcquisition, UpdateAcquisition,
  FiscalTag, CreateFiscalTag, UpdateFiscalTag,
  Transfer, CreateTransfer,
  ValuationSnapshot, CreateValuationSnapshot,
  DashboardSummary,
  LedgerRow,
  Dealer, TierConfig,
} from './types';

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`/api${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
    ...options,
  });

  if (!res.ok) {
    const body = await res
      .json()
      .catch(() => ({ error: { message: 'Network error', status: res.status } }));
    throw new Error(body.error?.message ?? 'Request failed');
  }

  return res.json() as Promise<T>;
}

export const api = {
  entities: {
    list: () => request<Entity[]>('/entities'),
    get: (id: number) => request<Entity>(`/entities/${id}`),
    create: (body: CreateEntity) =>
      request<Entity>('/entities', { method: 'POST', body: JSON.stringify(body) }),
    update: (id: number, body: UpdateEntity) =>
      request<Entity>(`/entities/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
    delete: (id: number) =>
      request<void>(`/entities/${id}`, { method: 'DELETE' }),
  },

  locations: {
    list: () => request<AssetLocation[]>('/asset-locations'),
    get: (id: number) => request<AssetLocation>(`/asset-locations/${id}`),
    create: (body: CreateAssetLocation) =>
      request<AssetLocation>('/asset-locations', { method: 'POST', body: JSON.stringify(body) }),
    update: (id: number, body: UpdateAssetLocation) =>
      request<AssetLocation>(`/asset-locations/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
    delete: (id: number) =>
      request<void>(`/asset-locations/${id}`, { method: 'DELETE' }),
  },

  assets: {
    list: (entityId?: number) =>
      request<Asset[]>(`/assets${entityId ? `?entity_id=${entityId}` : ''}`),
    get: (id: number) => request<Asset>(`/assets/${id}`),
    create: (body: CreateAsset) =>
      request<Asset>('/assets', { method: 'POST', body: JSON.stringify(body) }),
    update: (id: number, body: UpdateAsset) =>
      request<Asset>(`/assets/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
    delete: (id: number) =>
      request<void>(`/assets/${id}`, { method: 'DELETE' }),
    acquisitions: {
      list: (assetId: number) =>
        request<Acquisition[]>(`/assets/${assetId}/acquisitions`),
      create: (assetId: number, body: CreateAcquisition) =>
        request<Acquisition>(`/assets/${assetId}/acquisitions`, { method: 'POST', body: JSON.stringify(body) }),
      update: (assetId: number, id: number, body: UpdateAcquisition) =>
        request<Acquisition>(`/assets/${assetId}/acquisitions/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
      delete: (assetId: number, id: number) =>
        request<void>(`/assets/${assetId}/acquisitions/${id}`, { method: 'DELETE' }),
    },
    fiscalTags: {
      list: (assetId: number) =>
        request<FiscalTag[]>(`/assets/${assetId}/fiscal-tags`),
      create: (assetId: number, body: CreateFiscalTag) =>
        request<FiscalTag>(`/assets/${assetId}/fiscal-tags`, { method: 'POST', body: JSON.stringify(body) }),
      update: (assetId: number, id: number, body: UpdateFiscalTag) =>
        request<FiscalTag>(`/assets/${assetId}/fiscal-tags/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
      delete: (assetId: number, id: number) =>
        request<void>(`/assets/${assetId}/fiscal-tags/${id}`, { method: 'DELETE' }),
    },
    snapshots: {
      list: (assetId: number) =>
        request<ValuationSnapshot[]>(`/assets/${assetId}/valuation-snapshots`),
      create: (assetId: number, body: CreateValuationSnapshot) =>
        request<ValuationSnapshot>(`/assets/${assetId}/valuation-snapshots`, {
          method: 'POST',
          body: JSON.stringify(body),
        }),
    },
  },

  transfers: {
    list: () => request<Transfer[]>('/transfers'),
    get: (id: number) => request<Transfer>(`/transfers/${id}`),
    create: (body: CreateTransfer) =>
      request<Transfer>('/transfers', { method: 'POST', body: JSON.stringify(body) }),
    delete: (id: number) =>
      request<void>(`/transfers/${id}`, { method: 'DELETE' }),
  },

  dashboard: {
    summary: (entityId?: number) =>
      request<DashboardSummary>(`/dashboard/summary${entityId ? `?entity_id=${entityId}` : ''}`),
  },

  ledger: {
    list: (filters?: { entity_type?: string; asset_class?: string; tax_status?: string }) => {
      const params = new URLSearchParams();
      if (filters?.entity_type) params.set('entity_type', filters.entity_type);
      if (filters?.asset_class) params.set('asset_class', filters.asset_class);
      if (filters?.tax_status) params.set('tax_status', filters.tax_status);
      const qs = params.toString();
      return request<LedgerRow[]>(`/ledger${qs ? `?${qs}` : ''}`);
    },
  },

  dealers: {
    list: () => request<Dealer[]>('/dealers'),
    create: (data: Pick<Dealer, 'name' | 'contact_notes' | 'we_buy_gold_per_gram' | 'we_buy_gold_coin_per_gram' | 'we_buy_silver_bar_per_gram' | 'we_buy_silver_coin_per_gram' | 'we_buy_platinum_per_gram' | 'we_buy_palladium_per_gram'>) =>
      request<Dealer>('/dealers', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: number, data: Partial<Pick<Dealer, 'name' | 'contact_notes' | 'we_buy_gold_per_gram' | 'we_buy_gold_coin_per_gram' | 'we_buy_silver_bar_per_gram' | 'we_buy_silver_coin_per_gram' | 'we_buy_platinum_per_gram' | 'we_buy_palladium_per_gram'>>) =>
      request<Dealer>(`/dealers/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id: number) =>
      request<void>(`/dealers/${id}`, { method: 'DELETE' }),
  },

  tierConfig: {
    list: () => request<TierConfig[]>('/tier-config'),
    update: (tierId: number, data: Pick<TierConfig, 'target_pct' | 'min_pct' | 'max_pct'>) =>
      request<TierConfig>(`/tier-config/${tierId}`, { method: 'PUT', body: JSON.stringify(data) }),
  },
} as const;
