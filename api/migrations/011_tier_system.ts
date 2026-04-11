import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable('assets', (table) => {
    table.decimal('weight_per_unit_grams', 10, 4).nullable();
    table.integer('tier').nullable();
  });

  await knex.schema.createTableIfNotExists('tier_config', (table) => {
    table.integer('tier_id').primary();
    table.string('tier_name').notNullable();
    table.decimal('target_pct', 5, 2).notNullable();
    table.decimal('min_pct', 5, 2).notNullable();
    table.decimal('max_pct', 5, 2).notNullable();
    table.text('description').nullable();
  });

  await knex('tier_config')
    .insert([
      { tier_id: 0, tier_name: 'Grid-Down Baseline',    target_pct: 2,  min_pct: 0,  max_pct: 5,  description: 'Physical cash at home — immediate liquidity' },
      { tier_id: 1, tier_name: 'Digital Liquidity',     target_pct: 8,  min_pct: 4,  max_pct: 12, description: 'Bank accounts — 6-12 months living expenses' },
      { tier_id: 2, tier_name: 'The Vaults',            target_pct: 70, min_pct: 60, max_pct: 80, description: 'Physical gold in vaults — wealth anchor' },
      { tier_id: 3, tier_name: 'Uncensorable Frontier', target_pct: 20, min_pct: 10, max_pct: 30, description: 'Crypto — BTC/XMR on hardware wallets' },
    ])
    .onConflict('tier_id')
    .ignore();
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('tier_config');
  await knex.schema.alterTable('assets', (table) => {
    table.dropColumn('weight_per_unit_grams');
    table.dropColumn('tier');
  });
}
