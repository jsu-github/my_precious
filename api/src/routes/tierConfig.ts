import { Router } from 'express';
import { knex as db } from '../db';

const router = Router();

// GET /api/tier-config?scope=personal|business
router.get('/', async (req, res, next) => {
  try {
    const scope = req.query.scope as string | undefined;
    if (!scope || !['personal', 'business'].includes(scope)) {
      return res.status(400).json({ error: { message: 'scope query param required: personal or business', status: 400 } });
    }
    const rows = await db('tier_config').where({ entity_scope: scope }).orderBy('tier_id');
    res.json(rows);
  } catch (e) { next(e); }
});

// PUT /api/tier-config/:tierId?scope=personal|business
router.put('/:tierId', async (req, res, next) => {
  try {
    const scope = req.query.scope as string | undefined;
    if (!scope || !['personal', 'business'].includes(scope)) {
      return res.status(400).json({ error: { message: 'scope query param required: personal or business', status: 400 } });
    }
    const { target_pct, min_pct, max_pct } = req.body;
    const [row] = await db('tier_config')
      .where({ tier_id: req.params.tierId, entity_scope: scope })
      .update({ target_pct, min_pct, max_pct })
      .returning('*');
    if (!row) return res.status(404).json({ error: { message: 'Not found', status: 404 } });
    res.json(row);
  } catch (e) { next(e); }
});

export default router;
