import { Router } from 'express';
import {
  getSimulationStatus,
  startSimulation,
  stopSimulation,
  getRoomSensorData,
  getMultipleRoomsSensorData,
  getSensorStatistics,
  getRoomsWithSensors,
  getCurrentReadings,
  deleteSensorData,
  cleanupOldSensorData,
  getDatabaseStats
} from '../controllers/sensorController';

const router = Router();

// Rutas de control de simulación
router.get('/status', getSimulationStatus);
router.post('/start', startSimulation);
router.post('/stop', stopSimulation);

// Rutas de datos de sensores
router.get('/room/:spaceGuid', getRoomSensorData);
router.get('/rooms', getMultipleRoomsSensorData);
router.get('/statistics', getSensorStatistics);
router.get('/rooms-with-sensors', getRoomsWithSensors);
router.get('/current-readings', getCurrentReadings);

// Rutas de mantenimiento
router.delete('/data/:spaceGuid', deleteSensorData);
router.post('/cleanup', cleanupOldSensorData);
router.get('/database-stats', getDatabaseStats);

export default router;
