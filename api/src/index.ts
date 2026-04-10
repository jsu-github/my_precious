import express from 'express';
import cors from 'cors';
import { runMigrations } from './db';
import routes from './routes';
import { errorHandler } from './middleware/errorHandler';

const app = express();
const PORT = Number(process.env.PORT) || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Health check — NOT prefixed with /api (per copilot-instructions)
app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

// All /api/* routes
app.use('/api', routes);

// Error handler — MUST be last middleware (4-arg signature = Express error handler)
app.use(errorHandler);

async function start(): Promise<void> {
  // Auto-run migrations BEFORE starting the server (INFRA-03)
  await runMigrations();
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[api] Listening on :${PORT}`);
  });
}

start().catch((err) => {
  console.error('[api] Failed to start:', err);
  process.exit(1);
});

export { app };
