"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const sensorController_1 = require("../controllers/sensorController");
const router = (0, express_1.Router)();
// Rutas de control de simulación
router.get('/status', sensorController_1.getSimulationStatus);
router.post('/start', sensorController_1.startSimulation);
router.post('/stop', sensorController_1.stopSimulation);
// Rutas de datos de sensores
router.get('/room/:spaceGuid', sensorController_1.getRoomSensorData);
router.get('/rooms', sensorController_1.getMultipleRoomsSensorData);
router.get('/statistics', sensorController_1.getSensorStatistics);
router.get('/rooms-with-sensors', sensorController_1.getRoomsWithSensors);
router.get('/current-readings', sensorController_1.getCurrentReadings);
// Rutas de mantenimiento
router.delete('/data/:spaceGuid', sensorController_1.deleteSensorData);
router.post('/cleanup', sensorController_1.cleanupOldSensorData);
router.get('/database-stats', sensorController_1.getDatabaseStats);
exports.default = router;
