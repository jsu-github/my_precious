import { Router, Request, Response, NextFunction } from 'express';
import { db } from '../db';

export const tagsRouter = Router();

// GET /api/tags — list all tags sorted by name
tagsRouter.get('/', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const tags = await db('tags').select('*').orderBy('name', 'asc');
    res.json(tags);
  } catch (err) {
    next(err);
  }
});

// GET /api/tags/overview — each tag with assets and combined capital exposure
// IMPORTANT: must be declared before /:id to avoid route conflict
tagsRouter.get('/overview', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const [{ total }] = await db('assets').sum({ total: 'value' });
    const portfolioTotal = Number(total) || 0;

    const rows = await db('tags')
      .leftJoin('asset_tags', 'tags.id', 'asset_tags.tag_id')
      .leftJoin('assets', 'asset_tags.asset_id', 'assets.id')
      .select(
        'tags.id as tag_id',
        'tags.name as tag_name',
        'assets.id as asset_id',
        'assets.name as asset_name',
        'assets.value as asset_value',
        'assets.currency',
      )
      .orderBy(['tags.name', 'assets.name']);

    // Group by tag
    const tagMap = new Map<
      string,
      {
        tag_id: string;
        tag_name: string;
        assets: Array<{
          id: string;
          name: string;
          value: number;
          currency: string;
          capital_weight_pct: number;
        }>;
      }
    >();

    for (const row of rows) {
      if (!tagMap.has(row.tag_id)) {
        tagMap.set(row.tag_id, { tag_id: row.tag_id, tag_name: row.tag_name, assets: [] });
      }
      if (row.asset_id) {
        const assetValue = Number(row.asset_value) || 0;
        tagMap.get(row.tag_id)!.assets.push({
          id: row.asset_id,
          name: row.asset_name,
          value: assetValue,
          currency: row.currency ?? 'EUR',
          capital_weight_pct:
            portfolioTotal > 0
              ? Math.round((assetValue / portfolioTotal) * 10000) / 100
              : 0,
        });
      }
    }

    const result = Array.from(tagMap.values()).map((tag) => {
      const combinedValue = tag.assets.reduce((sum, a) => sum + a.value, 0);
      return {
        tag_id: tag.tag_id,
        tag_name: tag.tag_name,
        asset_count: tag.assets.length,
        combined_value: combinedValue,
        portfolio_pct:
          portfolioTotal > 0
            ? Math.round((combinedValue / portfolioTotal) * 10000) / 100
            : 0,
        assets: tag.assets,
      };
    });

    res.json(result);
  } catch (err) {
    next(err);
  }
});

// POST /api/tags — create a new tag
tagsRouter.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name } = req.body as { name: string };

    if (!name || name.trim() === '') {
      res.status(400).json({ error: { message: 'name is required', status: 400 } });
      return;
    }

    const [created] = await db('tags').insert({ name: name.trim() }).returning('*');
    res.status(201).json(created);
  } catch (err: unknown) {
    // Unique violation (PostgreSQL code 23505)
    const pgErr = err as { code?: string };
    if (pgErr?.code === '23505') {
      res.status(409).json({ error: { message: 'Tag name already exists', status: 409 } });
      return;
    }
    next(err);
  }
});

// DELETE /api/tags/:id — delete tag; returns 409 if tag still has any asset assignments
tagsRouter.delete('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tagId = req.params.id;

    const assignmentCount = await db('asset_tags').where({ tag_id: tagId }).count('tag_id as c');
    const count = Number(assignmentCount[0]?.c ?? 0);

    if (count > 0) {
      res
        .status(409)
        .json({
          error: {
            message: `Cannot delete tag: it is assigned to ${count} asset(s)`,
            status: 409,
          },
        });
      return;
    }

    const deleted = await db('tags').where({ id: tagId }).delete();
    if (!deleted) {
      res.status(404).json({ error: { message: 'Tag not found', status: 404 } });
      return;
    }

    res.status(204).send();
  } catch (err) {
    next(err);
  }
});


