import type { Knex } from 'knex';

// map_x_pct / map_y_pct are percentage offsets on the world map image (0–100)
// Used by Phase 7 (Asset Locations screen) to position gold pulse pins

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTableIfNotExists('asset_locations', (table) => {
    table.increments('id').primary();
    table.string('name', 255).notNullable();
    table.string('country_code', 3).notNullable();
    table.string('custodian_name', 255).notNullable();
    table.decimal('map_x_pct', 5, 2).notNullable().defaultTo(50);
    table.decimal('map_y_pct', 5, 2).notNullable().defaultTo(50);
    table.timestamps(true, true);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('asset_locations');
}
