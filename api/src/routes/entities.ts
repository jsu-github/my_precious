import { Router } from 'express';
import { knex } from '../db';

const router = Router();

// GET /api/entities
router.get('/', async (_req, res, next) => {
  try {
    const rows = await knex('entities').orderBy('id');
    res.json(rows);
  } catch (err) { next(err); }
});

// GET /api/entities/:id
router.get('/:id', async (req, res, next) => {
  try {
    const row = await knex('entities').where({ id: req.params.id }).first();
    if (!row) {
      const e: any = new Error('Entity not found'); e.status = 404; throw e;
    }
    res.json(row);
  } catch (err) { next(err); }
});

// POST /api/entities
router.post('/', async (req, res, next) => {
  try {
    const [row] = await knex('entities').insert(req.body).returning('*');
    res.status(201).json(row);
  } catch (err) { next(err); }
});

// PUT /api/entities/:id
router.put('/:id', async (req, res, next) => {
  try {
    const [row] = await knex('entities')
      .where({ id: req.params.id })
      .update({ ...req.body, updated_at: knex.fn.now() })
      .returning('*');
    if (!row) {
      const e: any = new Error('Entity not found'); e.status = 404; throw e;
    }
    res.json(row);
  } catch (err) { next(err); }
});

// DELETE /api/entities/:id
router.delete('/:id', async (req, res, next) => {
  try {
    const deleted = await knex('entities').where({ id: req.params.id }).delete();
    if (!deleted) {
      const e: any = new Error('Entity not found'); e.status = 404; throw e;
    }
    res.status(204).send();
  } catch (err) { next(err); }
});

export default router;
