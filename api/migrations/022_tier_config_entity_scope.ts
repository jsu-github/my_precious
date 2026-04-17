import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // 1. Read current config before dropping
  const existing = await knex('tier_config').select('*').orderBy('tier_id');

  // 2. Drop and recreate with entity_scope column + composite PK
  await knex.schema.dropTableIfExists('tier_config');
  await knex.schema.createTable('tier_config', (table) => {
    table.integer('tier_id').notNullable();
    table.string('entity_scope').notNullable(); // 'personal' | 'business'
    table.string('tier_name').notNullable();
    table.decimal('target_pct', 5, 2).notNullable().defaultTo(0);
    table.decimal('min_pct', 5, 2).notNullable().defaultTo(0);
    table.decimal('max_pct', 5, 2).notNullable().defaultTo(100);
    table.text('description').nullable();
    table.primary(['tier_id', 'entity_scope']);
  });

  // 3. Seed both scopes from existing values (fall back to defaults if empty)
  const defaults = [
    { tier_id: 0, tier_name: 'Grid-Down Baseline',    target_pct: 5,  min_pct: 2,  max_pct: 10, description: 'Physical cash and hard assets accessible in a grid-down scenario' },
    { tier_id: 1, tier_name: 'Digital Liquidity',     target_pct: 5,  min_pct: 2,  max_pct: 60, description: 'Highly liquid digital and near-cash positions' },
    { tier_id: 2, tier_name: 'The Vaults',            target_pct: 70, min_pct: 50, max_pct: 90, description: 'Long-term store of value: gold, silver, real estate' },
    { tier_id: 3, tier_name: 'Uncensorable Frontier', target_pct: 20, min_pct: 10, max_pct: 30, description: 'Sovereign-grade digital assets beyond seizure' },
  ];

  const source = existing.length > 0 ? existing : defaults;

  const rows = source.flatMap((row: any) => [
    { tier_id: row.tier_id, entity_scope: 'personal', tier_name: row.tier_name, target_pct: row.target_pct, min_pct: row.min_pct, max_pct: row.max_pct, description: row.description ?? null },
    { tier_id: row.tier_id, entity_scope: 'business', tier_name: row.tier_name, target_pct: row.target_pct, min_pct: row.min_pct, max_pct: row.max_pct, description: row.description ?? null },
  ]);

  await knex('tier_config').insert(rows);
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('tier_config');
  await knex.schema.createTable('tier_config', (table) => {
    table.integer('tier_id').primary();
    table.string('tier_name').notNullable();
    table.decimal('target_pct', 5, 2).notNullable();
    table.decimal('min_pct', 5, 2).notNullable();
    table.decimal('max_pct', 5, 2).notNullable();
    table.text('description').nullable();
  });
  await knex('tier_config').insert([
    { tier_id: 0, tier_name: 'Grid-Down Baseline',    target_pct: 5,  min_pct: 2,  max_pct: 10 },
    { tier_id: 1, tier_name: 'Digital Liquidity',     target_pct: 5,  min_pct: 2,  max_pct: 60 },
    { tier_id: 2, tier_name: 'The Vaults',            target_pct: 70, min_pct: 50, max_pct: 90 },
    { tier_id: 3, tier_name: 'Uncensorable Frontier', target_pct: 20, min_pct: 10, max_pct: 30 },
  ]);
}
