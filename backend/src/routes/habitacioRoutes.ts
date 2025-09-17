import express from 'express';
import { updateHabitacions, getHabitacions, buscarPorDepartamento, getDepartamentsByEdifici, getDevicesByGuids, searchDepartmentsAndDevices, updateIfcSpaceFields } from '../controllers/habitacioController';

const router = express.Router();

// GET /api/ifcspace/search?departament=valor
router.get('/ifcspace/search', buscarPorDepartamento);
// GET /api/ifcspace/devices?guids=guid1,guid2,guid3&edifici=CQA
router.get('/ifcspace/devices', getDevicesByGuids);
// GET /api/ifcspace/search-all?query=texto
router.get('/ifcspace/search-all', searchDepartmentsAndDevices);
// GET /api/ifcspace
router.get('/ifcspace', getHabitacions);
// GET /api/ifcspace/departaments?edifici=CQA
router.get('/ifcspace/departaments', getDepartamentsByEdifici);
// POST /api/ifcspace
router.post('/ifcspace', updateHabitacions);
// PATCH /api/ifcspace/item
router.patch('/ifcspace/item', updateIfcSpaceFields);
// POST /api/ifcspace/summary
import { summaryHabitacions } from '../controllers/habitacioController';
router.post('/ifcspace/summary', summaryHabitacions);

export default router;
