import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // Global tags table — unique names
  await knex.schema.createTable('tags', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    table.string('name', 100).notNullable().unique();
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
  });

  // Many-to-many join table: tags ↔ assets
  await knex.schema.createTable('asset_tags', (table) => {
    table
      .uuid('tag_id')
      .notNullable()
      .references('id')
      .inTable('tags')
      .onDelete('CASCADE');
    table
      .uuid('asset_id')
      .notNullable()
      .references('id')
      .inTable('assets')
      .onDelete('CASCADE');
    table.primary(['tag_id', 'asset_id']);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('asset_tags');
  await knex.schema.dropTableIfExists('tags');
}
