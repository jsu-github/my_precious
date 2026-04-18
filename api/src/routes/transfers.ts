import { Router } from 'express';
import { knex } from '../db';
import { HttpError } from '../middleware/errorHandler';

const router = Router();

// GET /api/transfers — includes joined entity names
router.get('/', async (_req, res, next) => {
  try {
    const rows = await knex('transfers as t')
      .join('entities as fe', 'fe.id', 't.from_entity_id')
      .join('entities as te', 'te.id', 't.to_entity_id')
      .select(
        't.*',
        'fe.name as from_entity_name',
        'te.name as to_entity_name',
      )
      .orderBy('t.transfer_date', 'desc');
    res.json(rows);
  } catch (err) { next(err); }
});

// GET /api/transfers/:id
router.get('/:id', async (req, res, next) => {
  try {
    const row = await knex('transfers as t')
      .join('entities as fe', 'fe.id', 't.from_entity_id')
      .join('entities as te', 'te.id', 't.to_entity_id')
      .select('t.*', 'fe.name as from_entity_name', 'te.name as to_entity_name')
      .where('t.id', req.params.id)
      .first();
    if (!row) throw new HttpError(404, 'Transfer not found');
    res.json(row);
  } catch (err) { next(err); }
});

// POST /api/transfers
router.post('/', async (req, res, next) => {
  try {
    const { from_entity_id, to_entity_id, amount, transfer_date, description } = req.body;
    const [row] = await knex('transfers').insert({ from_entity_id, to_entity_id, amount, transfer_date, description }).returning('*');
    res.status(201).json(row);
  } catch (err) { next(err); }
});

// PUT /api/transfers/:id
router.put('/:id', async (req, res, next) => {
  try {
    const { from_entity_id, to_entity_id, amount, transfer_date, description } = req.body;
    const [row] = await knex('transfers')
      .where({ id: req.params.id })
      .update({ from_entity_id, to_entity_id, amount, transfer_date, description, updated_at: knex.fn.now() })
      .returning('*');
    if (!row) throw new HttpError(404, 'Transfer not found');
    res.json(row);
  } catch (err) { next(err); }
});

// DELETE /api/transfers/:id
router.delete('/:id', async (req, res, next) => {
  try {
    const deleted = await knex('transfers').where({ id: req.params.id }).delete();
    if (!deleted) throw new HttpError(404, 'Transfer not found');
    res.status(204).send();
  } catch (err) { next(err); }
});

export default router;
