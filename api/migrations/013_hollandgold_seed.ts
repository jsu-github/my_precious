import type { Knex } from 'knex';

// NOTE: Despite the "_hollandgold_seed" filename, this migration is a SCHEMA CHANGE,
// not a seed. It was misnamed at the time of creation. The filename cannot be changed
// after the DB has been migrated (Knex tracks migration history by filename).
// This migration aligns the schema with the final design:
//   - rename we_buy_silver_per_gram → we_buy_silver_bar_per_gram
//   - add we_buy_gold_coin_per_gram (Au coins: typically ~0.5% below bar rate)
//   - add we_buy_silver_coin_per_gram

export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable('dealers', (table) => {
    table.renameColumn('we_buy_silver_per_gram', 'we_buy_silver_bar_per_gram');
  });
  await knex.schema.alterTable('dealers', (table) => {
    table.decimal('we_buy_gold_coin_per_gram', 10, 4).nullable();
    table.decimal('we_buy_silver_coin_per_gram', 10, 4).nullable();
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('dealers', (table) => {
    table.dropColumn('we_buy_gold_coin_per_gram');
    table.dropColumn('we_buy_silver_coin_per_gram');
  });
  await knex.schema.alterTable('dealers', (table) => {
    table.renameColumn('we_buy_silver_bar_per_gram', 'we_buy_silver_per_gram');
  });
}
