import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('risk_scores', (table) => {
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
    // 1=Extra Low, 2=Low, 3=Medium, 4=High, 5=Critical; null = not yet scored
    table.smallint('gross_score').nullable();
    table.smallint('net_score').nullable();
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at').notNullable().defaultTo(knex.fn.now());

    // One score row per asset-dimension pair
    table.unique(['asset_id', 'dimension_id']);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('risk_scores');
}
