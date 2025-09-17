import { Router } from 'express';
import {
  getEphemeralStatus,
  getEphemeralRoomReading,
  getEphemeralRoomHistory,
  getEphemeralMultipleRooms,
  getAllEphemeralReadings,
  getEphemeralFilteredReadings,
  getEphemeralStatistics,
  getEphemeralRoomsWithInfo
} from '../controllers/ephemeralSensorController';

const router = Router();

// Rutas de estado
router.get('/status', getEphemeralStatus);

// Rutas de lecturas individuales
router.get('/room/:spaceGuid', getEphemeralRoomReading);
router.get('/room/:spaceGuid/history', getEphemeralRoomHistory);

// Rutas de lecturas múltiples
router.get('/rooms', getEphemeralMultipleRooms);
router.get('/all', getAllEphemeralReadings);
router.get('/filtered', getEphemeralFilteredReadings);
router.get('/rooms-with-info', getEphemeralRoomsWithInfo);

// Rutas de estadísticas
router.get('/statistics', getEphemeralStatistics);

export default router;
