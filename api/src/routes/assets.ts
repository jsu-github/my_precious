import { Router, Request, Response, NextFunction } from 'express';
import { db } from '../db';
import { scoresRouter } from './scores';

export const assetsRouter = Router();

// GET /api/assets — list all with capital_weight_pct
assetsRouter.get('/', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const assets = await db('assets').select('*').orderBy('created_at', 'asc');

    const totalValue = assets.reduce((sum, a) => sum + parseFloat(a.value), 0);

    const withWeight = assets.map((a) => ({
      ...a,
      value: parseFloat(a.value),
      capital_weight_pct: totalValue > 0
        ? Math.round((parseFloat(a.value) / totalValue) * 10000) / 100
        : 0,
    }));

    res.json(withWeight);
  } catch (err) {
    next(err);
  }
});

// GET /api/assets/:id
assetsRouter.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const asset = await db('assets').where({ id: req.params.id }).first();
    if (!asset) {
      res.status(404).json({ error: { message: 'Asset not found', status: 404 } });
      return;
    }
    res.json({ ...asset, value: parseFloat(asset.value) });
  } catch (err) {
    next(err);
  }
});

// POST /api/assets
assetsRouter.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name, description, type_label, value, currency } = req.body as {
      name: string;
      description?: string;
      type_label: string;
      value: number;
      currency: string;
    };

    if (!name || name.trim() === '') {
      res.status(400).json({ error: { message: 'name is required', status: 400 } });
      return;
    }
    if (value === undefined || value === null || isNaN(Number(value))) {
      res.status(400).json({ error: { message: 'value must be a number', status: 400 } });
      return;
    }

    const [created] = await db('assets')
      .insert({
        name: name.trim(),
        description: description?.trim() ?? null,
        type_label: (type_label ?? '').trim(),
        value: Number(value),
        currency: (currency ?? 'EUR').trim(),
      })
      .returning('*');

    res.status(201).json({ ...created, value: parseFloat(created.value) });
  } catch (err) {
    next(err);
  }
});

// PUT /api/assets/:id
assetsRouter.put('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name, description, type_label, value, currency } = req.body as {
      name: string;
      description?: string;
      type_label: string;
      value: number;
      currency: string;
    };

    if (!name || name.trim() === '') {
      res.status(400).json({ error: { message: 'name is required', status: 400 } });
      return;
    }

    const [updated] = await db('assets')
      .where({ id: req.params.id })
      .update({
        name: name.trim(),
        description: description?.trim() ?? null,
        type_label: (type_label ?? '').trim(),
        value: Number(value),
        currency: (currency ?? 'EUR').trim(),
        updated_at: db.fn.now(),
      })
      .returning('*');

    if (!updated) {
      res.status(404).json({ error: { message: 'Asset not found', status: 404 } });
      return;
    }

    res.json({ ...updated, value: parseFloat(updated.value) });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/assets/:id
assetsRouter.delete('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const deleted = await db('assets').where({ id: req.params.id }).delete();
    if (!deleted) {
      res.status(404).json({ error: { message: 'Asset not found', status: 404 } });
      return;
    }
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

// Nested scores routes: GET /api/assets/:id/scores, PUT /api/assets/:id/scores/:dimensionId
assetsRouter.use('/:id/scores', scoresRouter);
