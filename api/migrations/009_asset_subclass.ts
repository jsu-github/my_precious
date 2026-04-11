import type { Knex } from 'knex';

// sub_class: finer grain within asset_class (e.g. 'gold', 'silver', 'platinum')
// product_type: physical form (e.g. 'bar', 'coin', 'etf', 'fund', 'property')

export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable('assets', (table) => {
    table.string('sub_class', 50).nullable();
    table.string('product_type', 50).nullable();
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('assets', (table) => {
    table.dropColumn('sub_class');
    table.dropColumn('product_type');
  });
}
