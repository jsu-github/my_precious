import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable('dealers', (table) => {
    table.decimal('we_buy_gold_coin_per_gram', 10, 4).nullable();  // Au coins — typically 0.5% lower than bars
    table.decimal('we_buy_silver_bar_per_gram', 10, 4).nullable();
    table.decimal('we_buy_silver_coin_per_gram', 10, 4).nullable();
    table.decimal('we_buy_platinum_per_gram', 10, 4).nullable();
    table.decimal('we_buy_palladium_per_gram', 10, 4).nullable();
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('dealers', (table) => {
    table.dropColumn('we_buy_gold_coin_per_gram');
    table.dropColumn('we_buy_silver_bar_per_gram');
    table.dropColumn('we_buy_silver_coin_per_gram');
    table.dropColumn('we_buy_platinum_per_gram');
    table.dropColumn('we_buy_palladium_per_gram');
  });
}
