import type { Knex } from 'knex';

// tax_status values: 'settled' | 'pending'
// cost_basis and quantity use exact decimal types — NEVER float
// quantity supports fractional units (e.g. oz of gold, BTC) — 6 decimal places

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTableIfNotExists('acquisitions', (table) => {
    table.increments('id').primary();
    table
      .integer('asset_id')
      .notNullable()
      .references('id')
      .inTable('assets')
      .onDelete('CASCADE');
    table.date('purchase_date').notNullable();
    table.decimal('cost_basis', 20, 2).notNullable();
    table.decimal('quantity', 20, 6).notNullable().defaultTo(1);
    table.string('tax_status', 20).notNullable().defaultTo('pending');
    table.text('description').nullable();
    table.timestamps(true, true);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('acquisitions');
}
