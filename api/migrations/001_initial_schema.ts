import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // Enable UUID extension
  await knex.raw('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"');

  // The assets, risk_dimensions, risk_scores, mitigations, and tags tables
  // will be added in subsequent phases. This migration establishes the
  // schema versioning baseline.
  await knex.schema.createTableIfNotExists('_schema_info', (table) => {
    table.string('key').primary();
    table.string('value').notNullable();
    table.timestamp('updated_at').defaultTo(knex.fn.now());
  });

  await knex('_schema_info').insert({
    key: 'initialized_at',
    value: new Date().toISOString(),
  }).onConflict('key').ignore();
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('_schema_info');
}
