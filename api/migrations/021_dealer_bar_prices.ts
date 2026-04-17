import type { Knex } from 'knex';

// Add weight-specific per-gram buyback rates for bar products.
// Different bar sizes carry different premiums, so one generic
// we_buy_gold_per_gram rate cannot accurately price a 50g and a 1oz bar.
export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable('dealers', (table) => {
    table.decimal('we_buy_gold_1oz_bar_per_gram', 10, 4).nullable();   // Au 1 troy oz bars (31.1035 g)
    table.decimal('we_buy_gold_50g_bar_per_gram', 10, 4).nullable();   // Au 50 g bars
    table.decimal('we_buy_gold_100g_bar_per_gram', 10, 4).nullable();  // Au 100 g bars
    table.decimal('we_buy_silver_100oz_bar_per_gram', 10, 4).nullable(); // Ag 100 troy oz bars (3110.35 g)
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('dealers', (table) => {
    table.dropColumn('we_buy_gold_1oz_bar_per_gram');
    table.dropColumn('we_buy_gold_50g_bar_per_gram');
    table.dropColumn('we_buy_gold_100g_bar_per_gram');
    table.dropColumn('we_buy_silver_100oz_bar_per_gram');
  });
}
