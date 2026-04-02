import { Router, Request, Response, NextFunction } from 'express';
import { db } from '../db';

export const portfolioRouter = Router();

// GET /api/portfolio/summary
// Returns capital-weighted portfolio risk scores overall and per dimension.
// Capital-weighting: assets with higher value have proportionally more influence.
// Formula per dimension: SUM(asset.value × score) / SUM(asset.value) for scored pairs only.
portfolioRouter.get('/summary', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    // Total portfolio value and asset count
    const [totals] = await db('assets').select(
      db.raw('COALESCE(SUM(value), 0)::float AS total_value'),
      db.raw('COUNT(*)::int AS asset_count'),
    );

    // Per-dimension capital-weighted gross and net scores
    // Assets with null score are excluded from both numerator and denominator
    const dimensionRows = await db('risk_dimensions as rd')
      .leftJoin('risk_scores as rs', 'rs.dimension_id', 'rd.id')
      .leftJoin('assets as a', 'a.id', 'rs.asset_id')
      .select(
        'rd.id as dimension_id',
        'rd.name as dimension_name',
        db.raw('rd.is_default::boolean as is_default'),
        db.raw(`
          SUM(CASE WHEN rs.gross_score IS NOT NULL THEN a.value * rs.gross_score ELSE 0 END)::float
          / NULLIF(SUM(CASE WHEN rs.gross_score IS NOT NULL THEN a.value ELSE 0 END), 0)
          AS weighted_gross
        `),
        db.raw(`
          SUM(CASE WHEN rs.net_score IS NOT NULL THEN a.value * rs.net_score ELSE 0 END)::float
          / NULLIF(SUM(CASE WHEN rs.net_score IS NOT NULL THEN a.value ELSE 0 END), 0)
          AS weighted_net
        `),
        db.raw(`COUNT(CASE WHEN rs.net_score IS NOT NULL THEN 1 END)::int AS scored_asset_count`),
      )
      .groupBy('rd.id', 'rd.name', 'rd.is_default')
      .orderBy([{ column: 'rd.is_default', order: 'desc' }, { column: 'rd.name', order: 'asc' }]);

    // Overall capital-weighted gross score across all asset × dimension pairs
    const [overallGross] = await db('risk_scores as rs')
      .join('assets as a', 'a.id', 'rs.asset_id')
      .whereNotNull('rs.gross_score')
      .select(
        db.raw(`SUM(a.value::float * rs.gross_score) / NULLIF(SUM(a.value), 0) AS value`),
      );

    // Overall capital-weighted net score across all asset × dimension pairs
    const [overallNet] = await db('risk_scores as rs')
      .join('assets as a', 'a.id', 'rs.asset_id')
      .whereNotNull('rs.net_score')
      .select(
        db.raw(`SUM(a.value::float * rs.net_score) / NULLIF(SUM(a.value), 0) AS value`),
      );

    const round2 = (v: unknown): number | null =>
      v != null && Number(v) === Number(v) ? Math.round(Number(v) * 100) / 100 : null;

    res.json({
      total_value: Number(totals.total_value) || 0,
      asset_count: totals.asset_count,
      weighted_gross: round2(overallGross?.value),
      weighted_net: round2(overallNet?.value),
      by_dimension: dimensionRows.map((row) => ({
        dimension_id: row.dimension_id,
        dimension_name: row.dimension_name,
        is_default: row.is_default,
        weighted_gross: round2(row.weighted_gross),
        weighted_net: round2(row.weighted_net),
        scored_asset_count: row.scored_asset_count,
      })),
    });
  } catch (err) {
    next(err);
  }
});
