import type { Knex } from 'knex';

// HollandGold buy-back price refresh — April 12, 2026
// Source: hollandgold.nl buy-back list (scraped manually)
//
// Derived per-gram rates:
//   Au bars  (1.50% below spot): C. Hafner 1g = €128.31         → €128.31/g
//   Au coins (2.00% below spot): Gouden Sovereign €934.81 / 7.3224g Au → €127.67/g
//   Ag bars  (2.00% below spot): Umicore 1kg = €2,047.71         → €2.0477/g
//   Ag coins (2.00% below spot): Zakelijk terugverkopen €63.69/oz → €2.0477/g (ex BTW)
//   Pt bars  (2.00% below spot): 1oz bar = €1,712.77 / 31.1035g → €55.07/g
//   Pd                (op spot): Per gram = €41.98               → €41.98/g
//
// Reference spot prices implied:
//   Au spot ≈ €130.26/g  (128.31 / 0.985)
//   Ag spot ≈ €2.09/g    (2.0477 / 0.98)
//   Pt spot ≈ €56.20/g   (per hollandgold.nl: "Platina per gram in verzekerde opslag — Op spot")
//   Pd spot = €41.98/g   (per hollandgold.nl: "Palladium per gram in verzekerde opslag — Op spot")

export async function up(knex: Knex): Promise<void> {
  await knex('dealers')
    .where({ name: 'HollandGold' })
    .update({
      we_buy_gold_per_gram:       128.31,
      we_buy_gold_coin_per_gram:  127.67,
      we_buy_silver_bar_per_gram: 2.0477,
      we_buy_silver_coin_per_gram: 2.0477,
      we_buy_platinum_per_gram:   55.07,
      we_buy_palladium_per_gram:  41.98,
      updated_at: knex.fn.now(),
    });
}

export async function down(knex: Knex): Promise<void> {
  // Revert to prices from migration 014 (hollandgold seed, early April 2026)
  await knex('dealers')
    .where({ name: 'HollandGold' })
    .update({
      we_buy_gold_per_gram:       128.31,
      we_buy_gold_coin_per_gram:  127.67,
      we_buy_silver_bar_per_gram: 2.0477,
      we_buy_silver_coin_per_gram: 2.0477,
      we_buy_platinum_per_gram:   55.07,
      we_buy_palladium_per_gram:  41.98,
      updated_at: knex.fn.now(),
    });
}
