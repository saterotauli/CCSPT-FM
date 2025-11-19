"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const actiusController_1 = require("../controllers/actiusController");
const actiusController_2 = require("../controllers/actiusController");
const actiusController_3 = require("../controllers/actiusController");
const actiuImagesController_1 = require("../controllers/actiuImagesController");
const router = express_1.default.Router();
// GET /api/actius
router.get('/actius', actiusController_1.getActius);
// GET /api/actius/search-all
router.get('/actius/search-all', actiusController_2.searchActius);
// GET /api/actius/plantes
router.get('/actius/plantes', actiusController_2.getDistinctPlantes);
// Images for actius (must be before the generic :guid route)
router.get('/actius/:guid/images', actiuImagesController_1.listActiuImages);
router.post('/actius/:guid/images', actiuImagesController_1.multerUpload, actiuImagesController_1.uploadActiuImages);
router.delete('/actius/images/:id', actiuImagesController_1.deleteActiuImage);
// GET /api/actius/:guid  (must be after specific routes like /search-all and /:guid/images)
router.get('/actius/:guid', actiusController_3.getActiuByGuid);
// POST /api/actius
router.post('/actius', actiusController_1.updateActius);
// POST /api/actius/summary
const actiusController_4 = require("../controllers/actiusController");
router.post('/actius/summary', actiusController_4.summaryActius);
exports.default = router;
