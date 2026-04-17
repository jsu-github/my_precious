import { Router } from 'express';
import { knex } from '../db';

const router = Router();

/**
 * GET /api/ledger
 * Returns all acquisition records joined with asset + entity info.
 * Query params:
 *   - entity_type: 'personal' | 'business'
 *   - asset_class: AssetClass string
 *   - tax_status: 'settled' | 'pending'
 */
router.get('/', async (req, res, next) => {
  try {
    let q = knex('acquisitions as acq')
      .join('assets as a', 'a.id', 'acq.asset_id')
      .join('entities as e', 'e.id', 'a.entity_id')
      .leftJoin('asset_locations as loc', 'loc.id', 'a.location_id')
      .select(
        'acq.id',
        'acq.asset_id',
        'acq.purchase_date',
        'acq.cost_basis',
        'acq.quantity',
        'acq.tax_status',
        'acq.description',
        'acq.created_at',
        'acq.updated_at',
        'a.name as asset_name',
        'a.asset_class',
        'a.sub_class',
        'a.product_type',
        'a.weight_per_unit',
        'a.weight_unit',
        'a.current_value as asset_current_value',
        'e.name as entity_name',
        'e.type as entity_type',
        'loc.name as location_name',
      )
      .orderBy('acq.purchase_date', 'desc');

    if (req.query.entity_type) {
      q = q.where('e.type', req.query.entity_type as string);
    }
    if (req.query.asset_class) {
      q = q.where('a.asset_class', req.query.asset_class as string);
    }
    if (req.query.tax_status) {
      q = q.where('acq.tax_status', req.query.tax_status as string);
    }

    res.json(await q);
  } catch (err) { next(err); }
});

export default router;
