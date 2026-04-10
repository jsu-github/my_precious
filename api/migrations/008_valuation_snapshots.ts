import type { Knex } from 'knex';

// Immutable point-in-time asset value records — no updated_at
// Auto-created when current_value is updated (Phase 10 triggers this)
// value uses NUMERIC(20,2) — NEVER float

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTableIfNotExists('valuation_snapshots', (table) => {
    table.increments('id').primary();
    table
      .integer('asset_id')
      .notNullable()
      .references('id')
      .inTable('assets')
      .onDelete('CASCADE');
    table.decimal('value', 20, 2).notNullable();
    table.timestamp('snapshotted_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('valuation_snapshots');
}
