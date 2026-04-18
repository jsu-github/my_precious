import { Router } from 'express';
import https from 'https';
import { knex as db } from '../db';

const router = Router();

const HG_BASE_URL = 'https://www.hollandgold.nl';

type ReferenceProduct = {
  field: string;
  path: string;
  candidates: Array<{ name: string; weightGrams: number }>;
};

const REFERENCE_PRODUCTS: ReferenceProduct[] = [
  {
    field: 'we_buy_gold_per_gram',
    path: '/verkopen/goudbaren.html',
    candidates: [
      { name: 'C. Hafner 1 gram goudbaar', weightGrams: 1.0 },
      { name: 'Umicore 1 gram goudbaar', weightGrams: 1.0 },
      { name: 'Goud per gram in verzekerde opslag', weightGrams: 1.0 },
    ],
  },
  {
    field: 'we_buy_gold_1oz_bar_per_gram',
    path: '/verkopen/goudbaren.html',
    candidates: [
      { name: 'C. Hafner 1 troy ounce goudbaar', weightGrams: 31.1035 },
      { name: 'Umicore 1 troy ounce goudbaar', weightGrams: 31.1035 },
      { name: 'Argor Heraeus 1 troy ounce goudbaar', weightGrams: 31.1035 },
    ],
  },
  {
    field: 'we_buy_gold_50g_bar_per_gram',
    path: '/verkopen/goudbaren.html',
    candidates: [
      { name: 'C. Hafner 50 gram goudbaar', weightGrams: 50.0 },
      { name: 'Umicore 50 gram goudbaar', weightGrams: 50.0 },
      { name: 'Argor Heraeus 50 gram goudbaar', weightGrams: 50.0 },
    ],
  },
  {
    field: 'we_buy_gold_100g_bar_per_gram',
    path: '/verkopen/goudbaren.html',
    candidates: [
      { name: 'C. Hafner 100 gram goudbaar', weightGrams: 100.0 },
      { name: 'Umicore 100 gram goudbaar', weightGrams: 100.0 },
      { name: 'Argor Heraeus 100 gram goudbaar', weightGrams: 100.0 },
    ],
  },
  {
    field: 'we_buy_gold_coin_per_gram',
    path: '/verkopen/gouden-munten.html',
    candidates: [
      { name: 'Maple Leaf 1 troy ounce gouden munt - diverse jaartallen', weightGrams: 31.1035 },
      { name: 'Krugerrand 1 troy ounce gouden munt - diverse jaartallen', weightGrams: 31.1035 },
      { name: 'Britannia 1 troy ounce gouden munt - diverse jaartallen', weightGrams: 31.1035 },
      { name: 'Philharmoniker 1 troy ounce gouden munt - diverse jaartallen', weightGrams: 31.1035 },
    ],
  },
  {
    field: 'we_buy_silver_bar_per_gram',
    path: '/verkopen/zilverbaren.html',
    candidates: [
      { name: 'Zilver per gram in verzekerde opslag btw-vrij Zwitserland', weightGrams: 1.0 },
    ],
  },
  {
    field: 'we_buy_silver_100oz_bar_per_gram',
    path: '/verkopen/zilverbaren.html',
    candidates: [
      { name: 'Zilverbaar 100 troy ounce btw-vrij Zwitserland', weightGrams: 3110.35 },
    ],
  },
  {
    field: 'we_buy_silver_coin_per_gram',
    path: '/verkopen/zilveren-munten.html',
    candidates: [
      { name: 'Krugerrand 1 troy ounce zilveren munt - diverse jaartallen', weightGrams: 31.1035 },
      { name: 'Maple Leaf 1 troy ounce zilveren munt - diverse jaartallen', weightGrams: 31.1035 },
      { name: 'Britannia 1 troy ounce zilveren munt - diverse jaartallen', weightGrams: 31.1035 },
    ],
  },
  {
    field: 'we_buy_platinum_per_gram',
    path: '/verkopen/platina-palladium.html',
    candidates: [
      { name: 'Platina per gram in verzekerde opslag', weightGrams: 1.0 },
    ],
  },
  {
    field: 'we_buy_palladium_per_gram',
    path: '/verkopen/platina-palladium.html',
    candidates: [
      { name: 'Palladium per gram in verzekerde opslag', weightGrams: 1.0 },
    ],
  },
];

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function htmlToText(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&euro;/gi, '€')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function fetchText(url: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const req = https
      .get(url, (res) => {
        if (res.statusCode && res.statusCode >= 400) {
          reject(new Error(`HTTP ${res.statusCode} for ${url}`));
          return;
        }
        const chunks: Buffer[] = [];
        res.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
        res.on('end', () => resolve(Buffer.concat(chunks).toString('utf-8')));
      })
      .on('error', reject);
    req.setTimeout(10_000, () => {
      req.destroy(new Error(`Timeout fetching ${url}`));
    });
  });
}

function extractPrice(text: string, productName: string): number | null {
  const pattern = new RegExp(
    `${escapeRegex(productName)}[^€]{0,300}€\\s*([\\d.]+),\\s*(\\d{2})`,
    'i',
  );
  const match = text.match(pattern);
  if (!match) return null;
  const intPart = match[1].replace(/\./g, '');
  return Number(`${intPart}.${match[2]}`);
}

async function scrapeHollandGoldPrices(): Promise<Record<string, number>> {
  const pageCache = new Map<string, string>();
  const prices: Record<string, number> = {};

  for (const ref of REFERENCE_PRODUCTS) {
    const url = `${HG_BASE_URL}${ref.path}`;
    let text = pageCache.get(url);
    if (!text) {
      const html = await fetchText(url);
      text = htmlToText(html);
      pageCache.set(url, text);
    }

    for (const candidate of ref.candidates) {
      const rawPrice = extractPrice(text, candidate.name);
      if (rawPrice == null) continue;
      prices[ref.field] = Number((rawPrice / candidate.weightGrams).toFixed(4));
      break;
    }
  }

  return prices;
}

router.get('/', async (req, res, next) => {
  try {
    const rows = await db('dealers').select('*').orderBy('name');
    res.json(rows);
  } catch (e) { next(e); }
});

router.post('/', async (req, res, next) => {
  try {
    const {
      name,
      contact_notes,
      we_buy_gold_per_gram,
      we_buy_gold_1oz_bar_per_gram,
      we_buy_gold_50g_bar_per_gram,
      we_buy_gold_100g_bar_per_gram,
      we_buy_gold_coin_per_gram,
      we_buy_silver_bar_per_gram,
      we_buy_silver_100oz_bar_per_gram,
      we_buy_silver_coin_per_gram,
      we_buy_platinum_per_gram,
      we_buy_palladium_per_gram,
    } = req.body;
    const [row] = await db('dealers')
      .insert({
        name,
        contact_notes,
        we_buy_gold_per_gram,
        we_buy_gold_1oz_bar_per_gram,
        we_buy_gold_50g_bar_per_gram,
        we_buy_gold_100g_bar_per_gram,
        we_buy_gold_coin_per_gram,
        we_buy_silver_bar_per_gram,
        we_buy_silver_100oz_bar_per_gram,
        we_buy_silver_coin_per_gram,
        we_buy_platinum_per_gram,
        we_buy_palladium_per_gram,
        updated_at: db.fn.now(),
      })
      .returning('*');
    res.status(201).json(row);
  } catch (e) { next(e); }
});

router.put('/:id', async (req, res, next) => {
  try {
    const {
      name,
      contact_notes,
      we_buy_gold_per_gram,
      we_buy_gold_1oz_bar_per_gram,
      we_buy_gold_50g_bar_per_gram,
      we_buy_gold_100g_bar_per_gram,
      we_buy_gold_coin_per_gram,
      we_buy_silver_bar_per_gram,
      we_buy_silver_100oz_bar_per_gram,
      we_buy_silver_coin_per_gram,
      we_buy_platinum_per_gram,
      we_buy_palladium_per_gram,
    } = req.body;
    const [row] = await db('dealers')
      .where({ id: req.params.id })
      .update({
        name,
        contact_notes,
        we_buy_gold_per_gram,
        we_buy_gold_1oz_bar_per_gram,
        we_buy_gold_50g_bar_per_gram,
        we_buy_gold_100g_bar_per_gram,
        we_buy_gold_coin_per_gram,
        we_buy_silver_bar_per_gram,
        we_buy_silver_100oz_bar_per_gram,
        we_buy_silver_coin_per_gram,
        we_buy_platinum_per_gram,
        we_buy_palladium_per_gram,
        updated_at: db.fn.now(),
      })
      .returning('*');
    if (!row) return res.status(404).json({ error: { message: 'Not found', status: 404 } });
    res.json(row);
  } catch (e) { next(e); }
});

/** Pick the per-gram buy rate for a precious metal asset, mirroring frontend getDealerRate. */
function getDealerRatePerGram(
  dealer: Record<string, any>,
  subClass: string | null,
  productType: string | null,
  weightGrams: number | null,
): number | null {
  if (!subClass) return null;
  const pt = productType?.toLowerCase();

  switch (subClass.toLowerCase()) {
    case 'gold':
      if (pt === 'coin' && dealer.we_buy_gold_coin_per_gram)
        return parseFloat(dealer.we_buy_gold_coin_per_gram);
      if (weightGrams != null) {
        if (Math.abs(weightGrams - 31.1035) < 0.01 && dealer.we_buy_gold_1oz_bar_per_gram)
          return parseFloat(dealer.we_buy_gold_1oz_bar_per_gram);
        if (Math.abs(weightGrams - 50) < 0.01 && dealer.we_buy_gold_50g_bar_per_gram)
          return parseFloat(dealer.we_buy_gold_50g_bar_per_gram);
        if (Math.abs(weightGrams - 100) < 0.01 && dealer.we_buy_gold_100g_bar_per_gram)
          return parseFloat(dealer.we_buy_gold_100g_bar_per_gram);
      }
      return dealer.we_buy_gold_per_gram ? parseFloat(dealer.we_buy_gold_per_gram) : null;
    case 'silver':
      if (pt === 'coin' && dealer.we_buy_silver_coin_per_gram)
        return parseFloat(dealer.we_buy_silver_coin_per_gram);
      if (weightGrams != null && Math.abs(weightGrams - 3110.35) < 1.0 && dealer.we_buy_silver_100oz_bar_per_gram)
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

router.post('/:id/refresh-prices', async (req, res, next) => {
  try {
    const [dealer] = await db('dealers').select('*').where({ id: req.params.id });
    if (!dealer) {
      return res.status(404).json({ error: { message: 'Not found', status: 404 } });
    }

    // Cooldown: reject if prices were updated less than 5 minutes ago
    const FIVE_MINUTES_MS = 5 * 60 * 1000;
    const lastUpdated = dealer.updated_at ? new Date(dealer.updated_at).getTime() : 0;
    if (Date.now() - lastUpdated < FIVE_MINUTES_MS) {
      return res.status(429).json({ error: { message: 'Prices updated recently. Try again in a few minutes.', status: 429 } });
    }

    const prices = await scrapeHollandGoldPrices();
    if (Object.keys(prices).length === 0) {
      return res.status(502).json({ error: { message: 'Failed to scrape HollandGold prices', status: 502 } });
    }

    const [row] = await db('dealers')
      .where({ id: req.params.id })
      .update({ ...prices, updated_at: db.fn.now() })
      .returning('*');

    // Recalculate current_value for all precious metal assets using new rates
    const assets = await db('assets as a')
      .select(
        'a.id',
        'a.sub_class',
        'a.product_type',
        'a.weight_per_unit',
        'a.weight_unit',
        'a.current_value',
        db.raw('COALESCE((SELECT SUM(quantity::numeric) FROM acquisitions WHERE asset_id = a.id), 0) AS total_quantity'),
      )
      .whereIn('a.sub_class', ['gold', 'silver', 'platinum', 'palladium'])
      .whereNotNull('a.weight_per_unit');

    const snapshotInserts: Array<{ asset_id: number; value: number }> = [];

    for (const asset of assets) {
      const weightGrams =
        asset.weight_unit === 'oz'
          ? parseFloat(asset.weight_per_unit) * 31.1035
          : parseFloat(asset.weight_per_unit);
      const ratePerGram = getDealerRatePerGram(row, asset.sub_class, asset.product_type, weightGrams);
      if (ratePerGram == null) continue;

      const totalQty = parseFloat(asset.total_quantity);
      const newValue = parseFloat((totalQty * weightGrams * ratePerGram).toFixed(2));
      const oldValue = parseFloat(asset.current_value);

      if (Math.abs(newValue - oldValue) < 0.01) continue;

      await db('assets').where({ id: asset.id }).update({ current_value: newValue });
      snapshotInserts.push({ asset_id: asset.id, value: newValue });
    }

    if (snapshotInserts.length > 0) {
      await db('valuation_snapshots').insert(snapshotInserts);
    }

    res.json(row);
  } catch (e) { next(e); }
});

router.delete('/:id', async (req, res, next) => {
  try {
    await db('dealers').where({ id: req.params.id }).delete();
    res.status(204).end();
  } catch (e) { next(e); }
});

export default router;
