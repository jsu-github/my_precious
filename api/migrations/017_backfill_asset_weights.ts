import type { Knex } from 'knex';

// Backfill weight_per_unit for all precious metal assets whose weights are
// embedded in their names but were never stored in the DB column.
// Units are set to 'oz' for troy-ounce products, 'g' for gram products.

const WEIGHTS: { name: string; weight: number; unit: string }[] = [
  // ─── Gold bars (grams) ────────────────────────────────────────────────────
  { name: 'Umicore 50 gram goudbaar',          weight: 50,     unit: 'g'  },
  { name: 'C. Haffner 100gr',                  weight: 100,    unit: 'g'  },
  { name: 'Umicore 100gr',                     weight: 100,    unit: 'g'  },
  { name: 'Umicore 50gr',                      weight: 50,     unit: 'g'  },

  // ─── Gold bars (troy ounce) ───────────────────────────────────────────────
  { name: 'Umicore 1oz goudbaar',              weight: 1,      unit: 'oz' },
  { name: 'C. Hafner 1 t/oz goudbaar (Privé)', weight: 1,      unit: 'oz' },
  { name: 'Umicore 1 t/oz goudbaar (Privé)',   weight: 1,      unit: 'oz' },

  // ─── Gold coins (troy ounce) ──────────────────────────────────────────────
  { name: 'Maple Leaf 2022 1 troy ounce gouden munt',  weight: 1, unit: 'oz' },
  { name: 'Maple Leaf 1 troy ounce gouden munt (Privé)', weight: 1, unit: 'oz' },

  // ─── Silver bars (troy ounce) ─────────────────────────────────────────────
  { name: 'Zilverbaar 100 troy ounce btw-vrij',        weight: 100, unit: 'oz' },

  // ─── Silver coins (troy ounce) ────────────────────────────────────────────
  { name: 'Philharmoniker 1oz munten (Zwitserland)',   weight: 1, unit: 'oz' },
  { name: 'Philharmoniker 1oz munten (Nederland)',     weight: 1, unit: 'oz' },
  { name: 'Krugerrand 2022 1 troy ounce zilveren munt (Thuis)', weight: 1, unit: 'oz' },
  { name: 'Krugerrand 2022 1 troy ounce zilveren munt (Gouda)', weight: 1, unit: 'oz' },
  { name: 'Britannia 1 troy ounce zilveren munt (Privé)', weight: 1, unit: 'oz' },
  { name: 'Philharmoniker 1oz zilveren munt (Privé)',  weight: 1, unit: 'oz' },

  // ─── Platinum coins (troy ounce) ─────────────────────────────────────────
  { name: 'Britannia 1 troy ounce platina munt',       weight: 1, unit: 'oz' },
  { name: 'Kangaroo 1oz platina munt',                 weight: 1, unit: 'oz' },
  { name: 'Kangaroo 1oz platina munt (Privé)',         weight: 1, unit: 'oz' },
];

export async function up(knex: Knex): Promise<void> {
  for (const row of WEIGHTS) {
    await knex('assets')
      .where({ name: row.name })
      .whereNull('weight_per_unit')      // only touch unset rows — never overwrite manual edits
      .update({ weight_per_unit: row.weight, weight_unit: row.unit });
  }
}

export async function down(knex: Knex): Promise<void> {
  const names = WEIGHTS.map(r => r.name);
  await knex('assets').whereIn('name', names).update({ weight_per_unit: null });
}
