import type { Knex } from 'knex';

// Seed HollandGold buy-back prices (from hollandgold.nl buy-back list, April 2026)
//
// Prices derived from published buy-back rates:
//   Au bars  : C. Hafner 50g = €6415.52 → €128.31/g  (1.50% below spot)
//   Au coins : Gouden Sovereign €934.80 / 7.3224g Au  = €127.67/g (2.00% below spot)
//   Ag bars  : Umicore 1kg = €2047.71 → €2.0477/g     (2.00% below spot)
//   Ag coins : Zakelijk terugverkopen €63.69/oz        = €2.0477/g (2.00% below spot, ex BTW)
//   Pt       : 1oz bar CH = €1712.77 / 31.1035g       = €55.07/g  (2.00% below spot)
//   Pd       : Per gram at spot                        = €41.98/g

export async function up(knex: Knex): Promise<void> {
  const existing = await knex('dealers').where({ name: 'HollandGold' }).first();
  if (!existing) {
    await knex('dealers').insert({
      name: 'HollandGold',
      contact_notes: 'hollandgold.nl · Amsterdam, Amersfoort, Eindhoven, Gouda & Rotterdam',
      we_buy_gold_per_gram: 128.31,
      we_buy_gold_coin_per_gram: 127.67,
      we_buy_silver_bar_per_gram: 2.0477,
      we_buy_silver_coin_per_gram: 2.0477,
      we_buy_platinum_per_gram: 55.07,
      we_buy_palladium_per_gram: 41.98,
      updated_at: knex.fn.now(),
    });
  }
}

export async function down(knex: Knex): Promise<void> {
  await knex('dealers').where({ name: 'HollandGold' }).delete();
}
