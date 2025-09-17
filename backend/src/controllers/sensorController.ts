import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { sensorSimulationService } from '../services/sensorSimulationService';

const prisma = new PrismaClient();

/**
 * GET /api/sensors/status
 * Obtiene el estado actual de la simulación de sensores
 */
export const getSimulationStatus = async (req: Request, res: Response) => {
  try {
    const status = sensorSimulationService.getSimulationStatus();
    res.json(status);
  } catch (error: any) {
    console.error('Error obteniendo estado de simulación:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

/**
 * POST /api/sensors/start
 * Inicia la simulación de sensores
 */
export const startSimulation = async (req: Request, res: Response) => {
  try {
    sensorSimulationService.startSimulation();
    const status = sensorSimulationService.getSimulationStatus();
    res.json({ 
      message: 'Simulación de sensores iniciada', 
      status 
    });
  } catch (error: any) {
    console.error('Error iniciando simulación:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

/**
 * POST /api/sensors/stop
 * Detiene la simulación de sensores
 */
export const stopSimulation = async (req: Request, res: Response) => {
  try {
    sensorSimulationService.stopSimulation();
    const status = sensorSimulationService.getSimulationStatus();
    res.json({ 
      message: 'Simulación de sensores detenida', 
      status 
    });
  } catch (error: any) {
    console.error('Error deteniendo simulación:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

/**
 * GET /api/sensors/room/:spaceGuid
 * Obtiene las últimas lecturas de sensores para una habitación específica
 */
export const getRoomSensorData = async (req: Request, res: Response) => {
  try {
    const { spaceGuid } = req.params;
    const { limit = '10' } = req.query;

    if (!spaceGuid) {
      return res.status(400).json({ error: 'spaceGuid es requerido' });
    }

    const limitNum = parseInt(limit as string, 10);
    if (isNaN(limitNum) || limitNum < 1 || limitNum > 100) {
      return res.status(400).json({ error: 'limit debe ser un número entre 1 y 100' });
    }

    const data = await sensorSimulationService.getLatestSensorData(spaceGuid, limitNum);
    res.json(data);
  } catch (error: any) {
    console.error('Error obteniendo datos de sensores:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

/**
 * GET /api/sensors/rooms
 * Obtiene datos de sensores para múltiples habitaciones
 */
export const getMultipleRoomsSensorData = async (req: Request, res: Response) => {
  try {
    const { spaceGuids, limit = '5' } = req.query;

    if (!spaceGuids || typeof spaceGuids !== 'string') {
      return res.status(400).json({ error: 'spaceGuids es requerido (array de GUIDs separados por comas)' });
    }

    const guidArray = spaceGuids.split(',').map(guid => guid.trim());
    const limitNum = parseInt(limit as string, 10);
    
    if (isNaN(limitNum) || limitNum < 1 || limitNum > 50) {
      return res.status(400).json({ error: 'limit debe ser un número entre 1 y 50' });
    }

    const results = await Promise.all(
      guidArray.map(async (spaceGuid) => {
        const data = await sensorSimulationService.getLatestSensorData(spaceGuid, limitNum);
        return {
          spaceGuid,
          data: data.length > 0 ? data[0] : null, // Solo la más reciente
          count: data.length
        };
      })
    );

    res.json(results);
  } catch (error: any) {
    console.error('Error obteniendo datos de múltiples habitaciones:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

/**
 * GET /api/sensors/statistics
 * Obtiene estadísticas de sensores para todas las habitaciones
 */
export const getSensorStatistics = async (req: Request, res: Response) => {
  try {
    const statistics = await sensorSimulationService.getSensorStatistics();
    res.json(statistics);
  } catch (error: any) {
    console.error('Error obteniendo estadísticas:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

/**
 * GET /api/sensors/rooms-with-sensors
 * Obtiene la lista de habitaciones que tienen datos de sensores
 */
export const getRoomsWithSensors = async (req: Request, res: Response) => {
  try {
    const { edifici, planta } = req.query;

    let whereClause = '';
    const params: any[] = [];

    if (edifici) {
      whereClause += ' AND s.edifici = $1';
      params.push(edifici);
    }

    if (planta) {
      whereClause += ` AND s.planta = $${params.length + 1}`;
      params.push(planta);
    }

    const query = `
      SELECT DISTINCT 
        s.guid,
        s.dispositiu,
        s.edifici,
        s.planta,
        s.departament,
        s.area,
        sd.temperature as last_temperature,
        sd.humidity as last_humidity,
        sd.ppm as last_ppm,
        sd.timestamp as last_reading
      FROM "patrimoni"."ifcspace" s
      INNER JOIN "patrimoni"."sensor_data" sd ON s.guid = sd."spaceGuid"
      WHERE 1=1 ${whereClause}
      ORDER BY s.edifici, s.planta, s.dispositiu
    `;

    const rooms = await prisma.$queryRawUnsafe(query, ...params);
    res.json(rooms);
  } catch (error: any) {
    console.error('Error obteniendo habitaciones con sensores:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

/**
 * GET /api/sensors/current-readings
 * Obtiene las lecturas más recientes de todos los sensores
 */
export const getCurrentReadings = async (req: Request, res: Response) => {
  try {
    const { edifici, planta } = req.query;

    let whereClause = '';
    const params: any[] = [];

    if (edifici) {
      whereClause += ' AND s.edifici = $1';
      params.push(edifici);
    }

    if (planta) {
      whereClause += ` AND s.planta = $${params.length + 1}`;
      params.push(planta);
    }

    const query = `
      SELECT DISTINCT ON (s.guid)
        s.guid,
        s.dispositiu,
        s.edifici,
        s.planta,
        s.departament,
        sd.temperature,
        sd.humidity,
        sd.ppm,
        sd.timestamp
      FROM "patrimoni"."ifcspace" s
      INNER JOIN "patrimoni"."sensor_data" sd ON s.guid = sd."spaceGuid"
      WHERE 1=1 ${whereClause}
      ORDER BY s.guid, sd.timestamp DESC
    `;

    const readings = await prisma.$queryRawUnsafe(query, ...params);
    res.json(readings);
  } catch (error: any) {
    console.error('Error obteniendo lecturas actuales:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

/**
 * DELETE /api/sensors/data/:spaceGuid
 * Elimina datos históricos de sensores para una habitación específica
 */
export const deleteSensorData = async (req: Request, res: Response) => {
  try {
    const { spaceGuid } = req.params;
    const { days = '30' } = req.query;

    if (!spaceGuid) {
      return res.status(400).json({ error: 'spaceGuid es requerido' });
    }

    const daysNum = parseInt(days as string, 10);
    if (isNaN(daysNum) || daysNum < 1) {
      return res.status(400).json({ error: 'days debe ser un número positivo' });
    }

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysNum);

    const result = await prisma.sensor_data.deleteMany({
      where: {
        spaceGuid,
        timestamp: {
          lt: cutoffDate
        }
      }
    });

    res.json({ 
      message: `Eliminados ${result.count} registros de sensores anteriores a ${cutoffDate.toISOString()}`,
      deletedCount: result.count
    });
  } catch (error: any) {
    console.error('Error eliminando datos de sensores:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

/**
 * POST /api/sensors/cleanup
 * Limpia datos antiguos de todos los sensores
 */
export const cleanupOldSensorData = async (req: Request, res: Response) => {
  try {
    const { days = '7' } = req.body;

    const daysNum = parseInt(days as string, 10);
    if (isNaN(daysNum) || daysNum < 1) {
      return res.status(400).json({ error: 'days debe ser un número positivo' });
    }

    const deletedCount = await sensorSimulationService.cleanupOldData(daysNum);
    
    res.json({ 
      message: `Limpieza completada: eliminados ${deletedCount} registros antiguos`,
      deletedCount
    });
  } catch (error: any) {
    console.error('Error en limpieza de datos:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

/**
 * GET /api/sensors/database-stats
 * Obtiene estadísticas de uso de la base de datos
 */
export const getDatabaseStats = async (req: Request, res: Response) => {
  try {
    const stats = await sensorSimulationService.getDatabaseStats();
    res.json(stats);
  } catch (error: any) {
    console.error('Error obteniendo estadísticas de BD:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};
