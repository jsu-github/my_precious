import type { Knex } from 'knex';

// asset_class values: precious_metals | real_estate | equities | crypto |
//                     private_equity | fixed_income | cash | exotics
// security_class values: high_security | medium_security | standard
// audit_frequency values: annual | semi_annual | quarterly
// MONETARY COLUMNS: current_value uses NUMERIC(20,2) — NEVER float/double

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTableIfNotExists('assets', (table) => {
    table.increments('id').primary();
    table
      .integer('entity_id')
      .notNullable()
      .references('id')
      .inTable('entities')
      .onDelete('CASCADE');
    table
      .integer('location_id')
      .nullable()
      .references('id')
      .inTable('asset_locations')
      .onDelete('SET NULL');
    table.string('name', 255).notNullable();
    table.string('asset_class', 50).notNullable();
    table.decimal('current_value', 20, 2).notNullable().defaultTo(0);
    table.string('security_class', 30).notNullable().defaultTo('standard');
    table.string('audit_frequency', 20).notNullable().defaultTo('annual');
    table.date('last_audit_date').nullable();
    table.text('description').nullable();
    table.timestamps(true, true);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('assets');
}
