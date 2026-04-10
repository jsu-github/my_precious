import type { Knex } from 'knex';

/**
 * 001_initial — confirms migration pipeline.
 * Phase 2 will add entity tables.
 *
 * MONETARY COLUMN CONVENTION (INFRA-05):
 *   ALL money/currency columns MUST use: table.decimal('column_name', 20, 2)
 *   This maps to PostgreSQL NUMERIC(20, 2) — exact decimal arithmetic.
 *   NEVER use: table.float() or table.double() for monetary values.
 *   Example: table.decimal('current_value', 20, 2).notNullable()
 */
export async function up(_knex: Knex): Promise<void> {
  // Intentionally empty — confirms the migration pipeline works.
  // See Phase 2 plans for entity table creation.
}

export async function down(_knex: Knex): Promise<void> {
  // Nothing to roll back.
}
