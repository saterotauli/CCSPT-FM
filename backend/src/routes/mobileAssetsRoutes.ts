import { Router } from 'express';
import { upsertMobileAsset, listMobileAssets, getMobileAssetById, deleteMobileAsset } from '../controllers/mobileAssetsController';

const router = Router();

// POST /api/mobile-assets -> upsert current location for an asset id
router.post('/', upsertMobileAsset);

// GET /api/mobile-assets -> list all current locations
router.get('/', listMobileAssets);

// GET /api/mobile-assets/:id -> get one
router.get('/:id', getMobileAssetById);

// DELETE /api/mobile-assets/:id -> delete one
router.delete('/:id', deleteMobileAsset);

export default router;
