import { Router } from 'express';
import { knex as db } from '../db';

const router = Router();

router.get('/', async (req, res, next) => {
  try {
    const rows = await db('dealers').select('*').orderBy('name');
    res.json(rows);
  } catch (e) { next(e); }
});

router.post('/', async (req, res, next) => {
  try {
    const { name, contact_notes, we_buy_gold_per_gram } = req.body;
    const [row] = await db('dealers')
      .insert({ name, contact_notes, we_buy_gold_per_gram, updated_at: db.fn.now() })
      .returning('*');
    res.status(201).json(row);
  } catch (e) { next(e); }
});

router.put('/:id', async (req, res, next) => {
  try {
    const { name, contact_notes, we_buy_gold_per_gram } = req.body;
    const [row] = await db('dealers')
      .where({ id: req.params.id })
      .update({ name, contact_notes, we_buy_gold_per_gram, updated_at: db.fn.now() })
      .returning('*');
    if (!row) return res.status(404).json({ error: { message: 'Not found', status: 404 } });
    res.json(row);
  } catch (e) { next(e); }
});

router.delete('/:id', async (req, res, next) => {
  try {
    await db('dealers').where({ id: req.params.id }).delete();
    res.status(204).end();
  } catch (e) { next(e); }
});

export default router;
