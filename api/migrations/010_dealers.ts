import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTableIfNotExists('dealers', (table) => {
    table.increments('id').primary();
    table.string('name').notNullable();
    table.text('contact_notes').nullable();
    table.decimal('we_buy_gold_per_gram', 10, 4).nullable();
    table.timestamp('updated_at').defaultTo(knex.fn.now());
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('dealers');
}
