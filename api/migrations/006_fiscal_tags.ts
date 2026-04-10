import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTableIfNotExists('fiscal_tags', (table) => {
    table.increments('id').primary();
    table
      .integer('asset_id')
      .notNullable()
      .references('id')
      .inTable('assets')
      .onDelete('CASCADE');
    table.integer('fiscal_year').notNullable();
    table.string('fiscal_category', 100).notNullable();
    table.string('jurisdiction', 100).notNullable();
    table.text('notes').nullable();
    table.timestamps(true, true);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('fiscal_tags');
}
