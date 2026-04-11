import { Router } from 'express';
import { knex } from '../db';

const router = Router();

const TIER_NAMES: Record<number, string> = {
  0: 'Grid-Down Baseline',
  1: 'Digital Liquidity',
  2: 'The Vaults',
  3: 'Uncensorable Frontier',
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

    let q = knex('assets');
    if (entity_id) q = q.where('entity_id', entity_id as string);

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
      entity_id: entity_id ? Number(entity_id) : null,
      by_asset_class: byClass.map((r: any) => ({
        asset_class: r.asset_class,
        total_value: r.total_value,
        count: Number(r.count),
      })),
      tier_summary: { tiers, in_range },
    });
  } catch (err) { next(err); }
});

export default router;
