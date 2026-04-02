import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('mitigations', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    table
      .uuid('asset_id')
      .notNullable()
      .references('id')
      .inTable('assets')
      .onDelete('CASCADE');
    table
      .uuid('dimension_id')
      .notNullable()
      .references('id')
      .inTable('risk_dimensions')
      .onDelete('CASCADE');
    // Free-text description of the mitigation action taken
    table.text('description').notNullable();
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at').notNullable().defaultTo(knex.fn.now());
    // No UNIQUE constraint — multiple mitigations per asset-dimension pair are allowed
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('mitigations');
}
