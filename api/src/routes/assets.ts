import { Router } from 'express';
import { knex } from '../db';
import { HttpError } from '../middleware/errorHandler';

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
        knex.raw('(SELECT COALESCE(SUM(quantity::numeric), 0) FROM acquisitions WHERE asset_id = a.id) as total_quantity'),
      )
      .orderBy('a.current_value', 'desc');

    if (req.query.entity_id) {
      const entityId = parseInt(req.query.entity_id as string, 10);
      if (isNaN(entityId) || entityId < 0) return res.status(400).json({ error: { message: 'Invalid entity_id', status: 400 } });
      q = q.where('a.entity_id', entityId);
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

    if (!asset) throw new HttpError(404, 'Asset not found');

    asset.acquisitions = await knex('acquisitions').where({ asset_id: asset.id }).orderBy('purchase_date', 'desc');
    res.json(asset);
  } catch (err) { next(err); }
});

// POST /api/assets
router.post('/', async (req, res, next) => {
  try {
    const {
      entity_id, location_id, name, asset_class, sub_class, product_type,
      current_value, security_class, audit_frequency, last_audit_date, description,
      tier, weight_per_unit, weight_unit, brand,
    } = req.body;
    const [row] = await knex('assets').insert({
      entity_id, location_id, name, asset_class, sub_class, product_type,
      current_value, security_class, audit_frequency, last_audit_date, description,
      tier, weight_per_unit, weight_unit, brand,
    }).returning('*');
    res.status(201).json(row);
  } catch (err) { next(err); }
});

// PUT /api/assets/:id
router.put('/:id', async (req, res, next) => {
  try {
    const existing = await knex('assets').where({ id: req.params.id }).first();
    if (!existing) throw new HttpError(404, 'Asset not found');

    const {
      entity_id, location_id, name, asset_class, sub_class, product_type,
      current_value, security_class, audit_frequency, last_audit_date, description,
      tier, weight_per_unit, weight_unit, brand,
    } = req.body;

    const updated = await knex.transaction(async trx => {
      const [row] = await trx('assets')
        .where({ id: req.params.id })
        .update({
          entity_id, location_id, name, asset_class, sub_class, product_type,
          current_value, security_class, audit_frequency, last_audit_date, description,
          tier, weight_per_unit, weight_unit, brand,
          updated_at: trx.fn.now(),
        })
        .returning('*');

      // Snapshot current_value when it changes
      const newValue = req.body.current_value;
      if (newValue !== undefined && String(newValue) !== String(existing.current_value)) {
        await trx('valuation_snapshots').insert({ asset_id: req.params.id, value: newValue });
      }

      return row;
    });

    res.json(updated);
  } catch (err) { next(err); }
});

// DELETE /api/assets/:id (cascade handles acquisitions, fiscalTags, snapshots)
router.delete('/:id', async (req, res, next) => {
  try {
    const deleted = await knex('assets').where({ id: req.params.id }).delete();
    if (!deleted) throw new HttpError(404, 'Asset not found');
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
    const { purchase_date, cost_basis, quantity, tax_status, description } = req.body;
    const [row] = await knex('acquisitions')
      .insert({ purchase_date, cost_basis, quantity, tax_status, description, asset_id: req.params.assetId })
      .returning('*');
    res.status(201).json(row);
  } catch (err) { next(err); }
});

// PUT /api/assets/:assetId/acquisitions/:id
router.put('/:assetId/acquisitions/:id', async (req, res, next) => {
  try {
    const { purchase_date, cost_basis, quantity, tax_status, description } = req.body;
    const [row] = await knex('acquisitions')
      .where({ id: req.params.id, asset_id: req.params.assetId })
      .update({ purchase_date, cost_basis, quantity, tax_status, description, updated_at: knex.fn.now() })
      .returning('*');
    if (!row) throw new HttpError(404, 'Acquisition not found');
    res.json(row);
  } catch (err) { next(err); }
});

// DELETE /api/assets/:assetId/acquisitions/:id
router.delete('/:assetId/acquisitions/:id', async (req, res, next) => {
  try {
    const deleted = await knex('acquisitions')
      .where({ id: req.params.id, asset_id: req.params.assetId })
      .delete();
    if (!deleted) throw new HttpError(404, 'Acquisition not found');
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
    const { fiscal_year, fiscal_category, jurisdiction, notes } = req.body;
    const [row] = await knex('fiscal_tags')
      .insert({ fiscal_year, fiscal_category, jurisdiction, notes, asset_id: req.params.assetId })
      .returning('*');
    res.status(201).json(row);
  } catch (err) { next(err); }
});

// PUT /api/assets/:assetId/fiscal-tags/:id
router.put('/:assetId/fiscal-tags/:id', async (req, res, next) => {
  try {
    const { fiscal_year, fiscal_category, jurisdiction, notes } = req.body;
    const [row] = await knex('fiscal_tags')
      .where({ id: req.params.id, asset_id: req.params.assetId })
      .update({ fiscal_year, fiscal_category, jurisdiction, notes, updated_at: knex.fn.now() })
      .returning('*');
    if (!row) throw new HttpError(404, 'Fiscal tag not found');
    res.json(row);
  } catch (err) { next(err); }
});

// DELETE /api/assets/:assetId/fiscal-tags/:id
router.delete('/:assetId/fiscal-tags/:id', async (req, res, next) => {
  try {
    const deleted = await knex('fiscal_tags')
      .where({ id: req.params.id, asset_id: req.params.assetId })
      .delete();
    if (!deleted) throw new HttpError(404, 'Fiscal tag not found');
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
