import { Router } from 'express';
import { knex } from '../db';

const router = Router();

// GET /api/asset-locations
router.get('/', async (_req, res, next) => {
  try {
    const rows = await knex('asset_locations').orderBy('id');
    res.json(rows);
  } catch (err) { next(err); }
});

// GET /api/asset-locations/:id
router.get('/:id', async (req, res, next) => {
  try {
    const row = await knex('asset_locations').where({ id: req.params.id }).first();
    if (!row) {
      const e: any = new Error('Asset location not found'); e.status = 404; throw e;
    }
    res.json(row);
  } catch (err) { next(err); }
});

// POST /api/asset-locations
router.post('/', async (req, res, next) => {
  try {
    const [row] = await knex('asset_locations').insert(req.body).returning('*');
    res.status(201).json(row);
  } catch (err) { next(err); }
});

// PUT /api/asset-locations/:id
router.put('/:id', async (req, res, next) => {
  try {
    const [row] = await knex('asset_locations')
      .where({ id: req.params.id })
      .update({ ...req.body, updated_at: knex.fn.now() })
      .returning('*');
    if (!row) {
      const e: any = new Error('Asset location not found'); e.status = 404; throw e;
    }
    res.json(row);
  } catch (err) { next(err); }
});

// DELETE /api/asset-locations/:id
router.delete('/:id', async (req, res, next) => {
  try {
    const deleted = await knex('asset_locations').where({ id: req.params.id }).delete();
    if (!deleted) {
      const e: any = new Error('Asset location not found'); e.status = 404; throw e;
    }
    res.status(204).send();
  } catch (err) { next(err); }
});

export default router;
