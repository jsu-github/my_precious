import type { Knex } from 'knex';

// Replaces the hand-rolled SVG % offsets (map_x_pct / map_y_pct) with real
// geographic coordinates (lon / lat) required by react-simple-maps / Mercator.
// Existing % values are not meaningful as lat/lon — locations must be re-entered.

export async function up(knex: Knex): Promise<void> {
  await knex.schema.table('asset_locations', (table) => {
    table.renameColumn('map_x_pct', 'lon');
  });
  await knex.schema.table('asset_locations', (table) => {
    table.renameColumn('map_y_pct', 'lat');
  });
  // Widen precision from decimal(5,2) to decimal(9,6) for geographic accuracy
  await knex.raw('ALTER TABLE asset_locations ALTER COLUMN lon TYPE decimal(9,6)');
  await knex.raw('ALTER TABLE asset_locations ALTER COLUMN lat TYPE decimal(9,6)');
}

export async function down(knex: Knex): Promise<void> {
  await knex.raw('ALTER TABLE asset_locations ALTER COLUMN lat TYPE decimal(5,2)');
  await knex.raw('ALTER TABLE asset_locations ALTER COLUMN lon TYPE decimal(5,2)');
  await knex.schema.table('asset_locations', (table) => {
    table.renameColumn('lat', 'map_y_pct');
  });
  await knex.schema.table('asset_locations', (table) => {
    table.renameColumn('lon', 'map_x_pct');
  });
}
