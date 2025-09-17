import express from 'express';
import { updateActius, getActius } from '../controllers/actiusController';
import { searchActius, getDistinctPlantes } from '../controllers/actiusController';
import { getActiuByGuid } from '../controllers/actiusController';
import { listActiuImages, uploadActiuImages, deleteActiuImage, multerUpload } from '../controllers/actiuImagesController';

const router = express.Router();

// GET /api/actius
router.get('/actius', getActius);
// GET /api/actius/search-all
router.get('/actius/search-all', searchActius);
// GET /api/actius/plantes
router.get('/actius/plantes', getDistinctPlantes);
// Images for actius (must be before the generic :guid route)
router.get('/actius/:guid/images', listActiuImages);
router.post('/actius/:guid/images', multerUpload, uploadActiuImages);
router.delete('/actius/images/:id', deleteActiuImage);
// GET /api/actius/:guid  (must be after specific routes like /search-all and /:guid/images)
router.get('/actius/:guid', getActiuByGuid);
// POST /api/actius
router.post('/actius', updateActius);
// POST /api/actius/summary
import { summaryActius } from '../controllers/actiusController';
router.post('/actius/summary', summaryActius);

export default router;
