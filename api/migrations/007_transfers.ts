import type { Knex } from 'knex';

// Records inter-entity fund movements for audit purposes
// amount uses NUMERIC(20,2) — NEVER float

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTableIfNotExists('transfers', (table) => {
    table.increments('id').primary();
    table
      .integer('from_entity_id')
      .notNullable()
      .references('id')
      .inTable('entities')
      .onDelete('CASCADE');
    table
      .integer('to_entity_id')
      .notNullable()
      .references('id')
      .inTable('entities')
      .onDelete('CASCADE');
    table.decimal('amount', 20, 2).notNullable();
    table.date('transfer_date').notNullable();
    table.text('description').nullable();
    table.timestamps(true, true);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('transfers');
}
