import express from 'express';
import cors from 'cors';
import { runMigrations } from './db';
import { healthRouter } from './routes/health';
import { assetsRouter } from './routes/assets';
import { errorHandler } from './middleware/errorHandler';

const app = express();
const PORT = parseInt(process.env.PORT || '3001', 10);

// Trust proxy for running behind nginx/Docker
app.set('trust proxy', 1);

// Middleware
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/health', healthRouter);
app.use('/api/assets', assetsRouter);

// Error handler — must be last
app.use(errorHandler);

async function start(): Promise<void> {
  try {
    await runMigrations();
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`[api] Precious Dashboard API running on port ${PORT}`);
    });
  } catch (err) {
    console.error('[api] Fatal startup error:', err);
    process.exit(1);
  }
}

start();
