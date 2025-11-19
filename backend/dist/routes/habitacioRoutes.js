"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const habitacioController_1 = require("../controllers/habitacioController");
const router = express_1.default.Router();
// GET /api/ifcspace/search?departament=valor
router.get('/ifcspace/search', habitacioController_1.buscarPorDepartamento);
// GET /api/ifcspace/devices?guids=guid1,guid2,guid3&edifici=CQA
router.get('/ifcspace/devices', habitacioController_1.getDevicesByGuids);
// GET /api/ifcspace/search-all?query=texto
router.get('/ifcspace/search-all', habitacioController_1.searchDepartmentsAndDevices);
// GET /api/ifcspace
router.get('/ifcspace', habitacioController_1.getHabitacions);
// GET /api/ifcspace/departaments?edifici=CQA
router.get('/ifcspace/departaments', habitacioController_1.getDepartamentsByEdifici);
// POST /api/ifcspace
router.post('/ifcspace', habitacioController_1.updateHabitacions);
// PATCH /api/ifcspace/item
router.patch('/ifcspace/item', habitacioController_1.updateIfcSpaceFields);
// POST /api/ifcspace/summary
const habitacioController_2 = require("../controllers/habitacioController");
router.post('/ifcspace/summary', habitacioController_2.summaryHabitacions);
exports.default = router;
