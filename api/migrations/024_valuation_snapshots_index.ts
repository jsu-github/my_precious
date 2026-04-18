import type { Knex } from 'knex';

// Add index on valuation_snapshots(asset_id, snapshotted_at DESC).
// The dashboard /history query uses a CROSS JOIN LATERAL that performs a
// DESC scan of this table per (asset × bucket) combination. Without an index,
// each lateral subquery does a full sequential scan of the snapshots table.
// This composite index covers both the WHERE asset_id = ? filter and the
// ORDER BY snapshotted_at DESC LIMIT 1 sort in a single index-only scan.

export async function up(knex: Knex): Promise<void> {
  await knex.schema.table('valuation_snapshots', (table) => {
    table.index(['asset_id', 'snapshotted_at'], 'idx_valuation_snapshots_asset_date');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.table('valuation_snapshots', (table) => {
    table.dropIndex(['asset_id', 'snapshotted_at'], 'idx_valuation_snapshots_asset_date');
  });
}
