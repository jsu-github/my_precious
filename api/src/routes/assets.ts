import { Router } from 'express';
import { knex } from '../db';

const router = Router();

// ─── Assets CRUD ──────────────────────────────────────────────────────────────

// GET /api/assets?entity_id=N
router.get('/', async (req, res, next) => {
  try {
    let q = knex('assets as a')
      .leftJoin('entities as e', 'e.id', 'a.entity_id')
      .leftJoin('asset_locations as al', 'al.id', 'a.location_id')
      .select(
        'a.*',
        'e.name as entity_name',
        'e.type as entity_type',
        'al.name as location_name',
        'al.custodian_name',
      )
      .orderBy('a.current_value', 'desc');

    if (req.query.entity_id) {
      q = q.where('a.entity_id', req.query.entity_id as string);
    }

    res.json(await q);
  } catch (err) { next(err); }
});

// GET /api/assets/:id — includes acquisitions array
router.get('/:id', async (req, res, next) => {
  try {
    const asset = await knex('assets as a')
      .leftJoin('entities as e', 'e.id', 'a.entity_id')
      .leftJoin('asset_locations as al', 'al.id', 'a.location_id')
      .select(
        'a.*',
        'e.name as entity_name',
        'e.type as entity_type',
        'al.name as location_name',
        'al.custodian_name',
      )
      .where('a.id', req.params.id)
      .first();

    if (!asset) {
      const e: any = new Error('Asset not found'); e.status = 404; throw e;
    }

    asset.acquisitions = await knex('acquisitions').where({ asset_id: asset.id }).orderBy('purchase_date', 'desc');
    res.json(asset);
  } catch (err) { next(err); }
});

// POST /api/assets
router.post('/', async (req, res, next) => {
  try {
    const [row] = await knex('assets').insert(req.body).returning('*');
    res.status(201).json(row);
  } catch (err) { next(err); }
});

// PUT /api/assets/:id
router.put('/:id', async (req, res, next) => {
  try {
    const [row] = await knex('assets')
      .where({ id: req.params.id })
      .update({ ...req.body, updated_at: knex.fn.now() })
      .returning('*');
    if (!row) {
      const e: any = new Error('Asset not found'); e.status = 404; throw e;
    }
    res.json(row);
  } catch (err) { next(err); }
});

// DELETE /api/assets/:id (cascade handles acquisitions, fiscalTags, snapshots)
router.delete('/:id', async (req, res, next) => {
  try {
    const deleted = await knex('assets').where({ id: req.params.id }).delete();
    if (!deleted) {
      const e: any = new Error('Asset not found'); e.status = 404; throw e;
    }
    res.status(204).send();
  } catch (err) { next(err); }
});

// ─── Acquisitions sub-resource ────────────────────────────────────────────────

// GET /api/assets/:assetId/acquisitions
router.get('/:assetId/acquisitions', async (req, res, next) => {
  try {
    const rows = await knex('acquisitions')
      .where({ asset_id: req.params.assetId })
      .orderBy('purchase_date', 'desc');
    res.json(rows);
  } catch (err) { next(err); }
});

// POST /api/assets/:assetId/acquisitions
router.post('/:assetId/acquisitions', async (req, res, next) => {
  try {
    const [row] = await knex('acquisitions')
      .insert({ ...req.body, asset_id: req.params.assetId })
      .returning('*');
    res.status(201).json(row);
  } catch (err) { next(err); }
});

// PUT /api/assets/:assetId/acquisitions/:id
router.put('/:assetId/acquisitions/:id', async (req, res, next) => {
  try {
    const [row] = await knex('acquisitions')
      .where({ id: req.params.id, asset_id: req.params.assetId })
      .update({ ...req.body, updated_at: knex.fn.now() })
      .returning('*');
    if (!row) {
      const e: any = new Error('Acquisition not found'); e.status = 404; throw e;
    }
    res.json(row);
  } catch (err) { next(err); }
});

// DELETE /api/assets/:assetId/acquisitions/:id
router.delete('/:assetId/acquisitions/:id', async (req, res, next) => {
  try {
    const deleted = await knex('acquisitions')
      .where({ id: req.params.id, asset_id: req.params.assetId })
      .delete();
    if (!deleted) {
      const e: any = new Error('Acquisition not found'); e.status = 404; throw e;
    }
    res.status(204).send();
  } catch (err) { next(err); }
});

// ─── Fiscal tags sub-resource ─────────────────────────────────────────────────

// GET /api/assets/:assetId/fiscal-tags
router.get('/:assetId/fiscal-tags', async (req, res, next) => {
  try {
    const rows = await knex('fiscal_tags')
      .where({ asset_id: req.params.assetId })
      .orderBy('fiscal_year', 'desc');
    res.json(rows);
  } catch (err) { next(err); }
});

// POST /api/assets/:assetId/fiscal-tags
router.post('/:assetId/fiscal-tags', async (req, res, next) => {
  try {
    const [row] = await knex('fiscal_tags')
      .insert({ ...req.body, asset_id: req.params.assetId })
      .returning('*');
    res.status(201).json(row);
  } catch (err) { next(err); }
});

// PUT /api/assets/:assetId/fiscal-tags/:id
router.put('/:assetId/fiscal-tags/:id', async (req, res, next) => {
  try {
    const [row] = await knex('fiscal_tags')
      .where({ id: req.params.id, asset_id: req.params.assetId })
      .update({ ...req.body, updated_at: knex.fn.now() })
      .returning('*');
    if (!row) {
      const e: any = new Error('Fiscal tag not found'); e.status = 404; throw e;
    }
    res.json(row);
  } catch (err) { next(err); }
});

// DELETE /api/assets/:assetId/fiscal-tags/:id
router.delete('/:assetId/fiscal-tags/:id', async (req, res, next) => {
  try {
    const deleted = await knex('fiscal_tags')
      .where({ id: req.params.id, asset_id: req.params.assetId })
      .delete();
    if (!deleted) {
      const e: any = new Error('Fiscal tag not found'); e.status = 404; throw e;
    }
    res.status(204).send();
  } catch (err) { next(err); }
});

// ─── Valuation snapshots sub-resource ────────────────────────────────────────

// GET /api/assets/:assetId/valuation-snapshots
router.get('/:assetId/valuation-snapshots', async (req, res, next) => {
  try {
    const rows = await knex('valuation_snapshots')
      .where({ asset_id: req.params.assetId })
      .orderBy('snapshotted_at', 'desc');
    res.json(rows);
  } catch (err) { next(err); }
});

// POST /api/assets/:assetId/valuation-snapshots
router.post('/:assetId/valuation-snapshots', async (req, res, next) => {
  try {
    const [row] = await knex('valuation_snapshots')
      .insert({ asset_id: req.params.assetId, value: req.body.value })
      .returning('*');
    res.status(201).json(row);
  } catch (err) { next(err); }
});

export default router;
