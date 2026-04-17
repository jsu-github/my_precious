import { Knex } from 'knex';

// Seed one initial snapshot per asset from their current_value.
// Only inserts for assets that have no snapshots yet.
// This gives immediate chart data without manually re-saving every asset.
export async function up(knex: Knex): Promise<void> {
  await knex.raw(`
    INSERT INTO valuation_snapshots (asset_id, value, snapshotted_at, created_at)
    SELECT id, current_value, NOW(), NOW()
    FROM assets
    WHERE current_value IS NOT NULL
      AND id NOT IN (SELECT DISTINCT asset_id FROM valuation_snapshots)
  `);
}

export async function down(_knex: Knex): Promise<void> {
  // Seeded rows cannot be safely removed — no-op
}
