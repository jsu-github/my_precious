import type { Request, Response, NextFunction } from 'express';

export interface AppError extends Error {
  status?: number;
}

export class HttpError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
    this.name = 'HttpError';
  }
}

/**
 * Centralized error handler — must be registered LAST in index.ts via app.use(errorHandler).
 * Returns the canonical error shape: { error: { message: string, status: number } }
 * This shape is expected by the frontend api.ts request() helper.
 */
export function errorHandler(
  err: AppError,
  _req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _next: NextFunction
): void {
  const status = err.status || 500;
  const message = err.message || 'Internal server error';

  if (status >= 500) {
    console.error('[error]', err);
  }

  res.status(status).json({
    error: {
      message,
      status,
    },
  });
}
