import { Router } from 'express';
import { knex as db } from '../db';

const router = Router();

router.get('/', async (req, res, next) => {
  try {
    const rows = await db('tier_config').select('*').orderBy('tier_id');
    res.json(rows);
  } catch (e) { next(e); }
});

router.put('/:tierId', async (req, res, next) => {
  try {
    const { target_pct, min_pct, max_pct } = req.body;
    const [row] = await db('tier_config')
      .where({ tier_id: req.params.tierId })
      .update({ target_pct, min_pct, max_pct })
      .returning('*');
    if (!row) return res.status(404).json({ error: { message: 'Not found', status: 404 } });
    res.json(row);
  } catch (e) { next(e); }
});

export default router;
