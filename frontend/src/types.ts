// All shared types live here — single source of truth.
// Phase 2 will add entity types (Asset, Entity, Location, etc.)

/**
 * Shape of every error response from the API.
 * The request() helper in api.ts extracts error.message and throws it.
 */
export interface ApiError {
  error: {
    message: string;
    status: number;
  };
}
