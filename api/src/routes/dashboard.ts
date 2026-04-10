import { Router } from 'express';
import { knex } from '../db';

const router = Router();

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

    res.json({
      total_value: totals.total_value ?? '0',
      asset_count: Number(totals.asset_count),
      entity_id: entity_id ? Number(entity_id) : null,
      by_asset_class: byClass.map((r) => ({
        asset_class: r.asset_class,
        total_value: r.total_value,
        count: Number(r.count),
      })),
    });
  } catch (err) { next(err); }
});

export default router;
