import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('risk_dimensions', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    table.string('name', 100).notNullable();
    table.text('description').nullable();
    // true for the 3 permanent defaults — cannot be deleted
    table.boolean('is_default').notNullable().defaultTo(false);
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at').notNullable().defaultTo(knex.fn.now());
  });

  // Seed the 3 mandatory defaults
  await knex('risk_dimensions').insert([
    {
      name: 'Counterparty',
      description: 'Risk from depending on another party — exchange, custodian, broker, or issuer. If they fail, your access to the asset may be lost.',
      is_default: true,
    },
    {
      name: 'Liquidity',
      description: 'Risk of not being able to sell or access the asset in time of need. Illiquid assets may be stuck even if nominally valuable.',
      is_default: true,
    },
    {
      name: 'Geography',
      description: 'Risk related to the political, regulatory, and legal environment where the asset is domiciled, stored, or issued.',
      is_default: true,
    },
  ]);
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('risk_dimensions');
}
