import { Router } from 'express';
import { knex } from '../db';

const router = Router();

const TIER_NAMES: Record<number, string> = {
  0: 'Grid-Down Baseline',
  1: 'Digital Liquidity',
  2: 'The Vaults',
  3: 'Uncensorable Frontier',
  4: 'Paper Prosperity',
};

type TierStatus = 'green' | 'amber' | 'red';

function tierStatus(currentPct: number, minPct: number, maxPct: number): TierStatus {
  if (currentPct >= minPct && currentPct <= maxPct) return 'green';
  const distance = currentPct < minPct ? minPct - currentPct : currentPct - maxPct;
  return distance <= 5 ? 'amber' : 'red';
}

// GET /api/dashboard/summary?entity_id=N (optional)
router.get('/summary', async (req, res, next) => {
  try {
    const { entity_id } = req.query;

    let entityIdNum: number | undefined;
    if (entity_id) {
      entityIdNum = parseInt(entity_id as string, 10);
      if (isNaN(entityIdNum) || entityIdNum < 0) {
        return res.status(400).json({ error: { message: 'Invalid entity_id', status: 400 } });
      }
    }

    let q = knex('assets');
    if (entityIdNum !== undefined) q = q.where('entity_id', entityIdNum);

    const [totals] = await q.clone()
      .sum({ total_value: 'current_value' })
      .count({ asset_count: 'id' })
      .select();

    const byClass = await q.clone()
      .select('asset_class')
      .sum({ total_value: 'current_value' })
      .count({ count: 'id' })
      .groupBy('asset_class')
      .orderBy('total_value', 'desc');

    // ── Tier summary ──────────────────────────────────────────────────────────
    const tierRows = await q.clone()
      .select('tier')
      .sum({ tier_value: 'current_value' })
      .whereNotNull('tier')
      .groupBy('tier');

    const tierConfigs = await knex('tier_config').orderBy('tier_id');
    const totalValue = parseFloat(totals.total_value as string ?? '0');

    const tierMap: Record<number, number> = {};
    tierRows.forEach((r: any) => {
      if (r.tier != null) {
        tierMap[Number(r.tier)] = parseFloat(r.tier_value as string ?? '0');
      }
    });

    const tiers = tierConfigs.map((tc: any) => {
      const tierValue = tierMap[tc.tier_id] ?? 0;
      const currentPct = totalValue > 0 ? (tierValue / totalValue) * 100 : 0;
      return {
        tier_id: tc.tier_id,
        name: TIER_NAMES[tc.tier_id] ?? tc.tier_name,
        current_pct: currentPct,
        status: tierStatus(currentPct, parseFloat(tc.min_pct), parseFloat(tc.max_pct)),
      };
    });

    const in_range = tiers.filter(t => t.status === 'green').length;

    res.json({
      total_value: totals.total_value ?? '0',
      asset_count: Number(totals.asset_count),
      entity_id: entityIdNum ?? null,
      by_asset_class: byClass.map((r: any) => ({
        asset_class: r.asset_class,
        total_value: r.total_value,
        count: Number(r.count),
      })),
      tier_summary: { tiers, in_range },
    });
  } catch (err) { next(err); }
});

// Validated period → SQL config (values are hardcoded — safe to interpolate)
const PERIOD_CONFIG: Record<string, { trunc: string; interval: string | null; bucketInterval: string }> = {
  '1M':  { trunc: 'day',   interval: '30 days',  bucketInterval: '1 day'   },
  '6M':  { trunc: 'week',  interval: '6 months', bucketInterval: '1 week'  },
  '1Y':  { trunc: 'month', interval: '1 year',   bucketInterval: '1 month' },
  '5Y':  { trunc: 'month', interval: '5 years',  bucketInterval: '1 month' },
  'ALL': { trunc: 'month', interval: null,        bucketInterval: '1 month' },
};

// GET /api/dashboard/history?period=1Y&entity_type=personal
router.get('/history', async (req, res, next) => {
  try {
    const period = typeof req.query.period === 'string' ? req.query.period : '1Y';
    const config = PERIOD_CONFIG[period] ?? PERIOD_CONFIG['1Y'];

    // Validate entity_type against enum — used as parameterized query binding, never interpolated
    const rawEntityType = req.query.entity_type as string | undefined;
    const entityType: string | null = (rawEntityType === 'personal' || rawEntityType === 'business')
      ? rawEntityType : null;

    const intervalClause = config.interval
      ? `date_trunc('${config.trunc}', NOW() - INTERVAL '${config.interval}')`
      : `date_trunc('${config.trunc}', (SELECT MIN(snapshotted_at) FROM valuation_snapshots))`;

    // Use generate_series to produce EVERY bucket in the window — not just months with events.
    // Then for each (bucket × asset), fill-forward the last known snapshot value.
    // This gives a continuous chart with no missing months.
    const historyResult = await knex.raw(`
      WITH
      bucket_series AS (
        SELECT generate_series(
          ${intervalClause},
          date_trunc('${config.trunc}', NOW()),
          INTERVAL '${config.bucketInterval}'
        ) AS bucket
      ),
      asset_ids AS (
        SELECT DISTINCT a.id AS asset_id
        FROM assets a
        INNER JOIN entities e ON e.id = a.entity_id
        WHERE (?::text IS NULL OR e.type = ?)
      )
      SELECT
        to_char(b.bucket, 'YYYY-MM-DD"T"HH24:MI:SS"Z"') AS bucket,
        SUM(latest.value)::text AS value
      FROM bucket_series b
      CROSS JOIN asset_ids ai
      CROSS JOIN LATERAL (
        SELECT vs.value
        FROM valuation_snapshots vs
        WHERE vs.asset_id = ai.asset_id
          AND vs.snapshotted_at < b.bucket + INTERVAL '${config.bucketInterval}'
        ORDER BY vs.snapshotted_at DESC
        LIMIT 1
      ) latest
      GROUP BY b.bucket
      ORDER BY b.bucket ASC
    `, [entityType, entityType]);

    const points: Array<{ bucket: string; value: string }> = historyResult.rows;

    const growth_pct = points.length >= 2
      ? ((parseFloat(points[points.length - 1].value) - parseFloat(points[0].value)) / parseFloat(points[0].value)) * 100
      : null;

    // Annual growth: compare current asset total vs latest snapshot per asset from ≥1 year ago
    const yearAgoResult = await knex.raw(`
      WITH latest_year_ago AS (
        SELECT vs.asset_id, vs.value,
          ROW_NUMBER() OVER (PARTITION BY vs.asset_id ORDER BY vs.snapshotted_at DESC) AS rn
        FROM valuation_snapshots vs
        INNER JOIN assets a ON a.id = vs.asset_id
        INNER JOIN entities e ON e.id = a.entity_id
        WHERE vs.snapshotted_at <= NOW() - INTERVAL '1 year'
          AND (?::text IS NULL OR e.type = ?)
      )
      SELECT SUM(value)::numeric AS total
      FROM latest_year_ago
      WHERE rn = 1
    `, [entityType, entityType]);

    const currentResult = await knex('assets')
      .join('entities', 'entities.id', 'assets.entity_id')
      .modify((q: any) => { if (entityType) q.where('entities.type', entityType); })
      .sum({ total: 'assets.current_value' })
      .first();

    const yearAgoTotal = yearAgoResult.rows[0]?.total != null
      ? parseFloat(yearAgoResult.rows[0].total) : null;
    const currentTotal = currentResult?.total != null
      ? parseFloat(currentResult.total as string) : null;

    const growth_1y_pct = yearAgoTotal != null && currentTotal != null && yearAgoTotal > 0
      ? ((currentTotal - yearAgoTotal) / yearAgoTotal) * 100
      : null;

    res.json({ points, growth_pct, growth_1y_pct });
  } catch (err) { next(err); }
});

// POST /api/dashboard/recalculate-history
// Rebuilds valuation_snapshots as cumulative cost-basis per asset per acquisition date.
// This gives a true "invested capital over time" staircase — growing only when new
// acquisitions are made, with no current-market-value distortion.
router.post('/recalculate-history', async (req, res, next) => {
  try {
    await knex.transaction(async trx => {
      // 1. Wipe existing snapshots
      await trx('valuation_snapshots').delete();

      // 2. Insert one snapshot per asset per acquisition date using cumulative cost_basis.
      //    Each row = total invested in that asset as of that purchase date.
      await trx.raw(`
        INSERT INTO valuation_snapshots (asset_id, value, snapshotted_at, created_at)
        SELECT
          asset_id,
          SUM(cost_basis) OVER (
            PARTITION BY asset_id
            ORDER BY purchase_date
            ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
          ) AS value,
          (purchase_date::timestamp + INTERVAL '12 hours') AS snapshotted_at,
          NOW() AS created_at
        FROM (
          SELECT
            asset_id,
            purchase_date,
            SUM(cost_basis) AS cost_basis
          FROM acquisitions
          GROUP BY asset_id, purchase_date
          ORDER BY asset_id, purchase_date
        ) agg
      `);
    });

    const [{ count }] = await knex('valuation_snapshots').count({ count: '*' });
    res.json({ ok: true, snapshots_created: Number(count) });
  } catch (err) { next(err); }
});

// GET /api/dashboard/recent-activity?limit=5&entity_type=personal
// Returns N most recent acquisitions with a gain/loss flag derived from the
// lot's proportional share of the parent asset's current value.
router.get('/recent-activity', async (req, res, next) => {
  try {
    const rawEntityType = req.query.entity_type as string | undefined;
    const entityType: string | null = (rawEntityType === 'personal' || rawEntityType === 'business')
      ? rawEntityType : null;

    const rawLimit = parseInt(req.query.limit as string, 10);
    const limit = Number.isFinite(rawLimit) && rawLimit > 0 && rawLimit <= 50 ? rawLimit : 5;

    const result = await knex.raw(`
      SELECT
        acq.id,
        acq.purchase_date,
        acq.cost_basis,
        a.name   AS asset_name,
        a.asset_class,
        e.name   AS entity_name,
        (acq.quantity / SUM(acq.quantity) OVER (PARTITION BY acq.asset_id))
          * a.current_value >= acq.cost_basis AS is_gain
      FROM acquisitions acq
      JOIN assets    a ON a.id = acq.asset_id
      JOIN entities  e ON e.id = a.entity_id
      WHERE (?::text IS NULL OR e.type = ?)
      ORDER BY acq.purchase_date DESC
      LIMIT ?
    `, [entityType, entityType, limit]);

    res.json(result.rows);
  } catch (err) { next(err); }
});

export default router;
