"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const ephemeralSensorController_1 = require("../controllers/ephemeralSensorController");
const router = (0, express_1.Router)();
// Rutas de estado
router.get('/status', ephemeralSensorController_1.getEphemeralStatus);
// Rutas de lecturas individuales
router.get('/room/:spaceGuid', ephemeralSensorController_1.getEphemeralRoomReading);
router.get('/room/:spaceGuid/history', ephemeralSensorController_1.getEphemeralRoomHistory);
// Rutas de lecturas múltiples
router.get('/rooms', ephemeralSensorController_1.getEphemeralMultipleRooms);
router.get('/all', ephemeralSensorController_1.getAllEphemeralReadings);
router.get('/filtered', ephemeralSensorController_1.getEphemeralFilteredReadings);
router.get('/rooms-with-info', ephemeralSensorController_1.getEphemeralRoomsWithInfo);
// Rutas de estadísticas
router.get('/statistics', ephemeralSensorController_1.getEphemeralStatistics);
exports.default = router;
