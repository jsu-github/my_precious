import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('assets', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    table.string('name', 255).notNullable();
    table.text('description').nullable();
    // Free-text label — no enum. Examples: "Physical Gold", "Crypto", "Real Estate"
    table.string('type_label', 100).notNullable().defaultTo('');
    // DECIMAL(18,8) supports crypto quantities like 0.00000001 BTC
    table.decimal('value', 18, 8).notNullable().defaultTo(0);
    // Free-text currency/unit. Examples: "EUR", "USD", "OZ", "BTC"
    table.string('currency', 20).notNullable().defaultTo('EUR');
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at').notNullable().defaultTo(knex.fn.now());
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('assets');
}
