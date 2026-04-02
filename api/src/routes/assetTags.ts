import { Router, Request, Response, NextFunction } from 'express';
import { db } from '../db';

// mergeParams: true so :id (asset ID) from assetsRouter is accessible
export const assetTagsRouter = Router({ mergeParams: true });

// GET /api/assets/:id/tags — list tags assigned to asset
assetTagsRouter.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const assetId = req.params.id;

    const asset = await db('assets').where({ id: assetId }).first();
    if (!asset) {
      res.status(404).json({ error: { message: 'Asset not found', status: 404 } });
      return;
    }

    const tags = await db('asset_tags')
      .join('tags', 'asset_tags.tag_id', 'tags.id')
      .where({ asset_id: assetId })
      .select('tags.id as tag_id', 'tags.name as tag_name')
      .orderBy('tags.name', 'asc');

    res.json(tags);
  } catch (err) {
    next(err);
  }
});

// POST /api/assets/:id/tags — assign a tag to asset
// body: { tag_id: string }
assetTagsRouter.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const assetId = req.params.id;
    const { tag_id } = req.body as { tag_id: string };

    if (!tag_id) {
      res.status(400).json({ error: { message: 'tag_id is required', status: 400 } });
      return;
    }

    const [asset, tag] = await Promise.all([
      db('assets').where({ id: assetId }).first(),
      db('tags').where({ id: tag_id }).first(),
    ]);

    if (!asset) {
      res.status(404).json({ error: { message: 'Asset not found', status: 404 } });
      return;
    }
    if (!tag) {
      res.status(404).json({ error: { message: 'Tag not found', status: 404 } });
      return;
    }

    // Insert — ignore duplicate (idempotent assignment)
    await db('asset_tags').insert({ tag_id, asset_id: assetId }).onConflict().ignore();

    res.status(201).json({ tag_id, tag_name: tag.name });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/assets/:id/tags/:tagId — remove tag from asset
assetTagsRouter.delete('/:tagId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id: assetId, tagId } = req.params;

    const deleted = await db('asset_tags')
      .where({ tag_id: tagId, asset_id: assetId })
      .delete();

    if (!deleted) {
      res.status(404).json({ error: { message: 'Tag assignment not found', status: 404 } });
      return;
    }

    res.status(204).send();
  } catch (err) {
    next(err);
  }
});
