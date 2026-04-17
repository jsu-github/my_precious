import type { Knex } from 'knex';

// Restructure precious metals asset model:
//   - Rename weight_per_unit_grams → weight_per_unit
//     (value is now unit-agnostic: could be grams or troy oz; see weight_unit)
//   - Add brand   VARCHAR(100) — e.g. "Maple Leaf", "Umicore", "C. Hafner"
//   - Add weight_unit VARCHAR(10) — 'g' or 'oz'
//
// Data fix: existing rows that already have a weight value were stored in grams
// (the old column was weight_per_unit_GRAMS), so we set weight_unit = 'g' for those.

export async function up(knex: Knex): Promise<void> {
  // Step 1: rename existing column (value preserved as-is)
  await knex.schema.alterTable('assets', (table) => {
    table.renameColumn('weight_per_unit_grams', 'weight_per_unit');
  });

  // Step 2: add new columns
  await knex.schema.alterTable('assets', (table) => {
    table.string('brand', 100).nullable();
    table.string('weight_unit', 10).nullable().defaultTo('g');
  });

  // Step 3: data fix — all pre-existing weight values were stored in grams
  await knex('assets')
    .whereNotNull('weight_per_unit')
    .update({ weight_unit: 'g' });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('assets', (table) => {
    table.dropColumn('brand');
    table.dropColumn('weight_unit');
  });
  await knex.schema.alterTable('assets', (table) => {
    table.renameColumn('weight_per_unit', 'weight_per_unit_grams');
  });
}
