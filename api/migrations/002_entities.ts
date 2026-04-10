import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTableIfNotExists('entities', (table) => {
    table.increments('id').primary();
    table.string('type', 20).notNullable(); // 'personal' | 'business'
    table.string('name', 255).notNullable();
    table.text('description').nullable();
    table.timestamps(true, true);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('entities');
}
