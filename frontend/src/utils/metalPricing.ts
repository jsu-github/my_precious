import type { Dealer } from '../types';

/** Pick the right per-gram buy rate for an asset's sub_class + product_type + weight.
 *  Weight is used to select the size-specific rate (different bar sizes carry different premiums). */
export function getDealerRate(
  dealer: Dealer,
  subClass: string | null,
  productType: string | null,
  weightPerUnit?: number | null,
  weightUnit?: string | null,
): number | null {
  if (!subClass) return null;
  const pt = productType?.toLowerCase();
  const grams = weightPerUnit != null ? toGrams(weightPerUnit, weightUnit ?? null) : null;

  switch (subClass.toLowerCase()) {
    case 'gold':
      if (pt === 'coin' && dealer.we_buy_gold_coin_per_gram)
        return parseFloat(dealer.we_buy_gold_coin_per_gram);
      // Bars: pick the rate that matches this exact weight class
      if (grams != null) {
        if (Math.abs(grams - 31.1035) < 0.01 && dealer.we_buy_gold_1oz_bar_per_gram)
          return parseFloat(dealer.we_buy_gold_1oz_bar_per_gram);
        if (Math.abs(grams - 50) < 0.01 && dealer.we_buy_gold_50g_bar_per_gram)
          return parseFloat(dealer.we_buy_gold_50g_bar_per_gram);
        if (Math.abs(grams - 100) < 0.01 && dealer.we_buy_gold_100g_bar_per_gram)
          return parseFloat(dealer.we_buy_gold_100g_bar_per_gram);
      }
      return dealer.we_buy_gold_per_gram ? parseFloat(dealer.we_buy_gold_per_gram) : null;
    case 'silver':
      if (pt === 'coin' && dealer.we_buy_silver_coin_per_gram)
        return parseFloat(dealer.we_buy_silver_coin_per_gram);
      // Bars: 100oz physical bar has its own rate
      if (grams != null && Math.abs(grams - 3110.35) < 1.0 && dealer.we_buy_silver_100oz_bar_per_gram)
        return parseFloat(dealer.we_buy_silver_100oz_bar_per_gram);
      return dealer.we_buy_silver_bar_per_gram ? parseFloat(dealer.we_buy_silver_bar_per_gram) : null;
    case 'platinum':
      return dealer.we_buy_platinum_per_gram ? parseFloat(dealer.we_buy_platinum_per_gram) : null;
    case 'palladium':
      return dealer.we_buy_palladium_per_gram ? parseFloat(dealer.we_buy_palladium_per_gram) : null;
    default:
      return null;
  }
}

/** Convert a weight value to grams (troy oz → grams if unit is 'oz') */
export function toGrams(weight: number, unit: string | null): number {
  return unit === 'oz' ? weight * 31.1035 : weight;
}
