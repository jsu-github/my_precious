import { Router, Request, Response, NextFunction } from 'express';
import { db } from '../db';

// mergeParams: true so :id from assetsRouter is accessible as req.params.id
export const mitigationsRouter = Router({ mergeParams: true });

// GET /api/assets/:id/mitigations
// Returns all mitigations for asset; optional ?dimension_id= filter
mitigationsRouter.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const assetId = req.params.id;

    const asset = await db('assets').where({ id: assetId }).first();
    if (!asset) {
      res.status(404).json({ error: { message: 'Asset not found', status: 404 } });
      return;
    }

    const query = db('mitigations')
      .where({ asset_id: assetId })
      .orderBy('created_at', 'asc');

    if (req.query.dimension_id) {
      void query.where({ dimension_id: req.query.dimension_id as string });
    }

    const rows = await query;
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

// POST /api/assets/:id/mitigations
mitigationsRouter.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const assetId = req.params.id;
    const { dimension_id, description } = req.body as {
      dimension_id: string;
      description: string;
    };

    if (!dimension_id) {
      res.status(400).json({ error: { message: 'dimension_id is required', status: 400 } });
      return;
    }
    if (!description || description.trim() === '') {
      res.status(400).json({ error: { message: 'description is required', status: 400 } });
      return;
    }

    const [asset, dimension] = await Promise.all([
      db('assets').where({ id: assetId }).first(),
      db('risk_dimensions').where({ id: dimension_id }).first(),
    ]);

    if (!asset) {
      res.status(404).json({ error: { message: 'Asset not found', status: 404 } });
      return;
    }
    if (!dimension) {
      res.status(404).json({ error: { message: 'Dimension not found', status: 404 } });
      return;
    }

    const [created] = await db('mitigations')
      .insert({ asset_id: assetId, dimension_id, description: description.trim() })
      .returning('*');

    res.status(201).json(created);
  } catch (err) {
    next(err);
  }
});

// PUT /api/assets/:id/mitigations/:mitigationId
mitigationsRouter.put(
  '/:mitigationId',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id: assetId, mitigationId } = req.params;
      const { description } = req.body as { description: string };

      if (!description || description.trim() === '') {
        res.status(400).json({ error: { message: 'description is required', status: 400 } });
        return;
      }

      const existing = await db('mitigations')
        .where({ id: mitigationId, asset_id: assetId })
        .first();
      if (!existing) {
        res.status(404).json({ error: { message: 'Mitigation not found', status: 404 } });
        return;
      }

      const [updated] = await db('mitigations')
        .where({ id: mitigationId })
        .update({ description: description.trim(), updated_at: db.fn.now() })
        .returning('*');

      res.json(updated);
    } catch (err) {
      next(err);
    }
  },
);

// DELETE /api/assets/:id/mitigations/:mitigationId
mitigationsRouter.delete(
  '/:mitigationId',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id: assetId, mitigationId } = req.params;

      const deleted = await db('mitigations')
        .where({ id: mitigationId, asset_id: assetId })
        .delete();

      if (!deleted) {
        res.status(404).json({ error: { message: 'Mitigation not found', status: 404 } });
        return;
      }

      res.status(204).send();
    } catch (err) {
      next(err);
    }
  },
);
