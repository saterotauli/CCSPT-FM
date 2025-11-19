"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const mobileAssetsController_1 = require("../controllers/mobileAssetsController");
const router = (0, express_1.Router)();
// POST /api/mobile-assets -> upsert current location for an asset id
router.post('/', mobileAssetsController_1.upsertMobileAsset);
// GET /api/mobile-assets -> list all current locations
router.get('/', mobileAssetsController_1.listMobileAssets);
// GET /api/mobile-assets/:id -> get one
router.get('/:id', mobileAssetsController_1.getMobileAssetById);
// DELETE /api/mobile-assets/:id -> delete one
router.delete('/:id', mobileAssetsController_1.deleteMobileAsset);
exports.default = router;
