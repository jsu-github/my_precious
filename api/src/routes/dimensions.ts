import { Router, Request, Response, NextFunction } from 'express';
import { db } from '../db';

export const dimensionsRouter = Router();

// GET /api/dimensions — list all
dimensionsRouter.get('/', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const dims = await db('risk_dimensions')
      .select('*')
      .orderBy([{ column: 'is_default', order: 'desc' }, { column: 'name', order: 'asc' }]);
    res.json(dims);
  } catch (err) {
    next(err);
  }
});

// POST /api/dimensions — create custom dimension
dimensionsRouter.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name, description } = req.body as { name: string; description?: string };
    if (!name || name.trim() === '') {
      res.status(400).json({ error: { message: 'name is required', status: 400 } });
      return;
    }

    const [created] = await db('risk_dimensions')
      .insert({
        name: name.trim(),
        description: description?.trim() ?? null,
        is_default: false,
      })
      .returning('*');

    res.status(201).json(created);
  } catch (err) {
    next(err);
  }
});

// PUT /api/dimensions/:id — rename (works for both default and custom)
dimensionsRouter.put('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name, description } = req.body as { name?: string; description?: string };

    const existing = await db('risk_dimensions').where({ id: req.params.id }).first();
    if (!existing) {
      res.status(404).json({ error: { message: 'Dimension not found', status: 404 } });
      return;
    }

    const updateData: Record<string, unknown> = { updated_at: db.fn.now() };
    if (name !== undefined) {
      if (name.trim() === '') {
        res.status(400).json({ error: { message: 'name cannot be empty', status: 400 } });
        return;
      }
      updateData.name = name.trim();
    }
    if (description !== undefined) {
      updateData.description = description?.trim() ?? null;
    }

    const [updated] = await db('risk_dimensions')
      .where({ id: req.params.id })
      .update(updateData)
      .returning('*');

    res.json(updated);
  } catch (err) {
    next(err);
  }
});

// DELETE /api/dimensions/:id — only custom dimensions (not defaults)
dimensionsRouter.delete('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const existing = await db('risk_dimensions').where({ id: req.params.id }).first();
    if (!existing) {
      res.status(404).json({ error: { message: 'Dimension not found', status: 404 } });
      return;
    }
    if (existing.is_default) {
      res.status(400).json({ error: { message: 'Cannot delete a default dimension', status: 400 } });
      return;
    }

    await db('risk_dimensions').where({ id: req.params.id }).delete();
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});
