/**
 * Central API client — ALL fetch calls go through request<T>().
 * Never call fetch() inline in components.
 *
 * Error shape from the server: { error: { message: string, status: number } }
 * On non-OK responses, request() throws the error message as a plain Error.
 */
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

// Entity namespaces added in Phase 2:
// assets, entities, locations, acquisitions, fiscalTags, transfers, dashboard, analytics

export const api = {
  // Placeholder — Phase 2 will populate entity namespaces
  _request: request,
} as const;
