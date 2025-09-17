import { Request, Response } from 'express';
import { ephemeralSensorService } from '../services/ephemeralSensorService';

/**
 * GET /api/ephemeral-sensors/status
 * Obtiene el estado del servicio efímero
 */
export const getEphemeralStatus = async (req: Request, res: Response) => {
  try {
    const status = ephemeralSensorService.getServiceStatus();
    res.json(status);
  } catch (error: any) {
    console.error('Error obteniendo estado efímero:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

/**
 * GET /api/ephemeral-sensors/room/:spaceGuid
 * Obtiene la lectura actual de sensores para una habitación específica
 */
export const getEphemeralRoomReading = async (req: Request, res: Response) => {
  try {
    const { spaceGuid } = req.params;

    if (!spaceGuid) {
      return res.status(400).json({ error: 'spaceGuid es requerido' });
    }

    const reading = await ephemeralSensorService.getCurrentSensorReading(spaceGuid);
    
    if (!reading) {
      return res.status(404).json({ error: 'Habitación no encontrada' });
    }

    res.json(reading);
  } catch (error: any) {
    console.error('Error obteniendo lectura efímera:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

/**
 * GET /api/ephemeral-sensors/room/:spaceGuid/history
 * Obtiene un historial simulado de lecturas para una habitación
 */
export const getEphemeralRoomHistory = async (req: Request, res: Response) => {
  try {
    const { spaceGuid } = req.params;
    const { count = '10' } = req.query;

    if (!spaceGuid) {
      return res.status(400).json({ error: 'spaceGuid es requerido' });
    }

    const countNum = parseInt(count as string, 10);
    if (isNaN(countNum) || countNum < 1 || countNum > 100) {
      return res.status(400).json({ error: 'count debe ser un número entre 1 y 100' });
    }

    const history = await ephemeralSensorService.getSensorHistory(spaceGuid, countNum);
    res.json(history);
  } catch (error: any) {
    console.error('Error obteniendo historial efímero:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

/**
 * GET /api/ephemeral-sensors/rooms
 * Obtiene lecturas actuales para múltiples habitaciones
 */
export const getEphemeralMultipleRooms = async (req: Request, res: Response) => {
  try {
    const { spaceGuids } = req.query;

    if (!spaceGuids || typeof spaceGuids !== 'string') {
      return res.status(400).json({ error: 'spaceGuids es requerido (array de GUIDs separados por comas)' });
    }

    const guidArray = spaceGuids.split(',').map(guid => guid.trim());
    
    if (guidArray.length > 100) {
      return res.status(400).json({ error: 'Máximo 100 habitaciones por consulta' });
    }

    const readings = await ephemeralSensorService.getCurrentSensorReadings(guidArray);
    res.json(readings);
  } catch (error: any) {
    console.error('Error obteniendo lecturas múltiples efímeras:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

/**
 * GET /api/ephemeral-sensors/all
 * Obtiene lecturas actuales para todas las habitaciones
 */
export const getAllEphemeralReadings = async (req: Request, res: Response) => {
  try {
    const readings = await ephemeralSensorService.getAllCurrentSensorReadings();
    res.json(readings);
  } catch (error: any) {
    console.error('Error obteniendo todas las lecturas efímeras:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

/**
 * GET /api/ephemeral-sensors/filtered
 * Obtiene lecturas actuales filtradas por edificio y/o planta
 */
export const getEphemeralFilteredReadings = async (req: Request, res: Response) => {
  try {
    const { edifici, planta } = req.query;

    const readings = await ephemeralSensorService.getCurrentSensorReadingsFiltered(
      edifici as string,
      planta as string
    );
    
    res.json(readings);
  } catch (error: any) {
    console.error('Error obteniendo lecturas filtradas efímeras:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

/**
 * GET /api/ephemeral-sensors/statistics
 * Obtiene estadísticas de los sensores efímeros
 */
export const getEphemeralStatistics = async (req: Request, res: Response) => {
  try {
    const stats = await ephemeralSensorService.getEphemeralStats();
    res.json(stats);
  } catch (error: any) {
    console.error('Error obteniendo estadísticas efímeras:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

/**
 * GET /api/ephemeral-sensors/rooms-with-info
 * Obtiene habitaciones con información y lecturas actuales
 */
export const getEphemeralRoomsWithInfo = async (req: Request, res: Response) => {
  try {
    const { edifici, planta } = req.query;

    const readings = await ephemeralSensorService.getCurrentSensorReadingsFiltered(
      edifici as string,
      planta as string
    );
    
    // Formatear respuesta con información completa
    const formattedReadings = readings.map(({ spaceGuid, reading, roomInfo }) => ({
      spaceGuid,
      ...roomInfo,
      temperature: reading.temperature,
      humidity: reading.humidity,
      ppm: reading.ppm,
      timestamp: reading.timestamp
    }));

    res.json(formattedReadings);
  } catch (error: any) {
    console.error('Error obteniendo habitaciones con info efímera:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};
