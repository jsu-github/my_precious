import Knex from 'knex';
import path from 'path';

export const knex = Knex({
  client: 'pg',
  connection: process.env.DATABASE_URL || 'postgres://precious:precious@localhost:5432/precious',
  migrations: {
    directory: path.join(__dirname, '../migrations'),
    // ts-node-dev runs .ts migrations directly; build output uses .js
    extension: process.env.NODE_ENV === 'production' ? 'js' : 'ts',
  },
});

/**
 * Run all pending Knex migrations.
 * Called automatically at API startup in src/index.ts.
 *
 * MONETARY COLUMN CONVENTION (INFRA-05):
 *   All money columns MUST use: table.decimal('column_name', 20, 2)
 *   This maps to PostgreSQL NUMERIC(20, 2) — exact decimal arithmetic.
 *   NEVER use: table.float() or table.double() for monetary values.
 */
export async function runMigrations(): Promise<void> {
  await knex.migrate.latest();
  console.log('[db] Migrations complete');
}
