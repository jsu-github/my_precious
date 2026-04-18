import { Router } from 'express';
import { knex } from '../db';
import { HttpError } from '../middleware/errorHandler';

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
    if (!row) throw new HttpError(404, 'Entity not found');
    res.json(row);
  } catch (err) { next(err); }
});

// POST /api/entities
router.post('/', async (req, res, next) => {
  try {
    const { name, type, description } = req.body;
    const [row] = await knex('entities').insert({ name, type, description }).returning('*');
    res.status(201).json(row);
  } catch (err) { next(err); }
});

// PUT /api/entities/:id
router.put('/:id', async (req, res, next) => {
  try {
    const { name, type, description } = req.body;
    const [row] = await knex('entities')
      .where({ id: req.params.id })
      .update({ name, type, description, updated_at: knex.fn.now() })
      .returning('*');
    if (!row) throw new HttpError(404, 'Entity not found');
    res.json(row);
  } catch (err) { next(err); }
});

// DELETE /api/entities/:id
router.delete('/:id', async (req, res, next) => {
  try {
    const deleted = await knex('entities').where({ id: req.params.id }).delete();
    if (!deleted) throw new HttpError(404, 'Entity not found');
    res.status(204).send();
  } catch (err) { next(err); }
});

export default router;
