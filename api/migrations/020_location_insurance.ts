import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.table('asset_locations', (table) => {
    table.decimal('insurance_amount', 15, 2).nullable().defaultTo(null);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.table('asset_locations', (table) => {
    table.dropColumn('insurance_amount');
  });
}
