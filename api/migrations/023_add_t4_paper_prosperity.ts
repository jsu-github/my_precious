import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex('tier_config')
    .insert([
      {
        tier_id: 4,
        entity_scope: 'personal',
        tier_name: 'Paper Prosperity',
        target_pct: 10,
        min_pct: 0,
        max_pct: 20,
        description: 'Stocks, bonds, ETFs — conventional markets. Counterparty-dependent; first to freeze in a crisis.',
      },
      {
        tier_id: 4,
        entity_scope: 'business',
        tier_name: 'Paper Prosperity',
        target_pct: 10,
        min_pct: 0,
        max_pct: 20,
        description: 'Stocks, bonds, ETFs — conventional markets. Counterparty-dependent; first to freeze in a crisis.',
      },
    ])
    .onConflict(['tier_id', 'entity_scope'])
    .ignore();
}

export async function down(knex: Knex): Promise<void> {
  await knex('tier_config').where({ tier_id: 4 }).delete();
}
