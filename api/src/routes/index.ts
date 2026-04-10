import { Router } from 'express';
import entitiesRouter from './entities';
import assetLocationsRouter from './assetLocations';
import assetsRouter from './assets';
import transfersRouter from './transfers';
import dashboardRouter from './dashboard';
import ledgerRouter from './ledger';

const router = Router();

router.use('/entities', entitiesRouter);
router.use('/asset-locations', assetLocationsRouter);
router.use('/assets', assetsRouter);
router.use('/transfers', transfersRouter);
router.use('/dashboard', dashboardRouter);
router.use('/ledger', ledgerRouter);

export default router;
