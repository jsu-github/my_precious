import { Router, Request, Response, NextFunction } from 'express';
import { db } from '../db';

// mergeParams: true so :id from assetsRouter is accessible as req.params.id
export const scoresRouter = Router({ mergeParams: true });

// GET /api/assets/:id/scores
// Returns ALL dimensions with scores for this asset (LEFT JOIN so every dimension appears)
scoresRouter.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const assetId = req.params.id;

    // Verify asset exists
    const asset = await db('assets').where({ id: assetId }).first();
    if (!asset) {
      res.status(404).json({ error: { message: 'Asset not found', status: 404 } });
      return;
    }

    const rows = await db('risk_dimensions as rd')
      .leftJoin('risk_scores as rs', function () {
        this.on('rs.dimension_id', '=', 'rd.id').andOn(
          db.raw('rs.asset_id = ?', [assetId]),
        );
      })
      .select(
        'rd.id as dimension_id',
        'rd.name as dimension_name',
        'rd.is_default',
        'rs.id as score_id',
        db.raw('rs.gross_score::int as gross_score'),
        db.raw('rs.net_score::int as net_score'),
      )
      .orderBy([{ column: 'rd.is_default', order: 'desc' }, { column: 'rd.name', order: 'asc' }]);

    res.json(rows);
  } catch (err) {
    next(err);
  }
});

// PUT /api/assets/:id/scores/:dimensionId — upsert gross_score and net_score
scoresRouter.put('/:dimensionId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const assetId = req.params.id;
    const dimensionId = req.params.dimensionId;
    const { gross_score, net_score } = req.body as {
      gross_score: number | null;
      net_score: number | null;
    };

    // Validate score values: 1–5 or null
    const validScore = (v: unknown) =>
      v === null || v === undefined ||
      (Number.isInteger(v) && (v as number) >= 1 && (v as number) <= 5);

    if (!validScore(gross_score) || !validScore(net_score)) {
      res.status(400).json({ error: { message: 'Scores must be 1–5 or null', status: 400 } });
      return;
    }

    // Verify asset and dimension exist
    const [asset, dimension] = await Promise.all([
      db('assets').where({ id: assetId }).first(),
      db('risk_dimensions').where({ id: dimensionId }).first(),
    ]);

    if (!asset) {
      res.status(404).json({ error: { message: 'Asset not found', status: 404 } });
      return;
    }
    if (!dimension) {
      res.status(404).json({ error: { message: 'Dimension not found', status: 404 } });
      return;
    }

    // Upsert via PostgreSQL ON CONFLICT
    await db('risk_scores')
      .insert({
        asset_id: assetId,
        dimension_id: dimensionId,
        gross_score: gross_score ?? null,
        net_score: net_score ?? null,
      })
      .onConflict(['asset_id', 'dimension_id'])
      .merge(['gross_score', 'net_score', 'updated_at']);

    // Return the full row with dimension info
    const [row] = await db('risk_dimensions as rd')
      .leftJoin('risk_scores as rs', function () {
        this.on('rs.dimension_id', '=', 'rd.id').andOn(
          db.raw('rs.asset_id = ?', [assetId]),
        );
      })
      .select(
        'rd.id as dimension_id',
        'rd.name as dimension_name',
        'rd.is_default',
        'rs.id as score_id',
        db.raw('rs.gross_score::int as gross_score'),
        db.raw('rs.net_score::int as net_score'),
      )
      .where('rd.id', dimensionId);

    res.json(row);
  } catch (err) {
    next(err);
  }
});
