import Knex from 'knex';
import knexConfig from '../knexfile';

const env = process.env.NODE_ENV || 'development';

export const db = Knex(knexConfig[env]);

export async function runMigrations(): Promise<void> {
  console.log('[db] Running migrations...');
  await db.migrate.latest();
  const version = await db.migrate.currentVersion();
  console.log(`[db] Migration complete — version: ${version}`);
}
