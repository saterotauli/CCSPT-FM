import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface SensorReading {
  temperature: number;
  humidity: number;
  ppm: number;
}

interface RoomSensorState {
  spaceGuid: string;
  baseTemperature: number;
  baseHumidity: number;
  basePpm: number;
  temperatureTrend: number; // -1, 0, 1 para tendencia
  humidityTrend: number;
  ppmTrend: number;
  lastUpdate: Date;
}

class SensorSimulationService {
  private roomStates: Map<string, RoomSensorState> = new Map();
  private isRunning: boolean = false;
  private intervalId: NodeJS.Timeout | null = null;
  private readonly UPDATE_INTERVAL = parseInt(process.env.SENSOR_UPDATE_INTERVAL || '30000'); // 30 segundos por defecto
  private readonly MAX_ROOMS_PER_BATCH = parseInt(process.env.SENSOR_BATCH_SIZE || '50'); // Procesar máximo 50 habitaciones por vez
  private readonly ENABLE_BATCH_MODE = process.env.SENSOR_BATCH_MODE === 'true'; // Modo lote para reducir carga

  constructor() {
    this.initializeRoomStates();
  }

  /**
   * Inicializa los estados base de los sensores para cada habitación
   */
  private async initializeRoomStates(): Promise<void> {
    try {
      const rooms = await prisma.ifcspace.findMany({
        select: {
          guid: true,
          dispositiu: true,
          edifici: true,
          planta: true
        }
      });

      console.log(`[SensorSimulation] Inicializando ${rooms.length} habitaciones`);

      for (const room of rooms) {
        // Valores base realistas según el tipo de habitación
        const baseValues = this.getBaseValuesForRoomType(room.dispositiu);
        
        this.roomStates.set(room.guid, {
          spaceGuid: room.guid,
          baseTemperature: baseValues.temperature,
          baseHumidity: baseValues.humidity,
          basePpm: baseValues.ppm,
          temperatureTrend: 0,
          humidityTrend: 0,
          ppmTrend: 0,
          lastUpdate: new Date()
        });
      }

      console.log(`[SensorSimulation] Estados inicializados para ${this.roomStates.size} habitaciones`);
    } catch (error) {
      console.error('[SensorSimulation] Error inicializando estados:', error);
    }
  }

  /**
   * Obtiene valores base según el tipo de habitación
   */
  private getBaseValuesForRoomType(roomType: string): { temperature: number; humidity: number; ppm: number } {
    const type = roomType.toLowerCase();

    // Valores base según tipo de habitación
    if (type.includes('quiròfan') || type.includes('quirofan')) {
      return { temperature: 20.0, humidity: 50.0, ppm: 400.0 }; // Quirófanos: fríos, controlados
    } else if (type.includes('hospit') || type.includes('habitació')) {
      return { temperature: 22.0, humidity: 45.0, ppm: 450.0 }; // Habitaciones: confort
    } else if (type.includes('magatzem') || type.includes('mgtz')) {
      return { temperature: 18.0, humidity: 40.0, ppm: 500.0 }; // Almacenes: más fríos
    } else if (type.includes('oficina') || type.includes('despatx')) {
      return { temperature: 23.0, humidity: 50.0, ppm: 480.0 }; // Oficinas: más cálidas
    } else if (type.includes('cuina') || type.includes('cocina')) {
      return { temperature: 24.0, humidity: 60.0, ppm: 600.0 }; // Cocinas: más húmedas
    } else if (type.includes('bany') || type.includes('aseo')) {
      return { temperature: 21.0, humidity: 70.0, ppm: 550.0 }; // Baños: muy húmedos
    } else {
      return { temperature: 22.0, humidity: 50.0, ppm: 450.0 }; // Por defecto
    }
  }

  /**
   * Genera una lectura de sensor realista con variaciones naturales
   */
  private generateSensorReading(state: RoomSensorState): SensorReading {
    const now = new Date();
    const timeSinceLastUpdate = (now.getTime() - state.lastUpdate.getTime()) / 1000; // segundos

    // Variaciones naturales basadas en el tiempo
    const timeVariation = Math.sin(now.getHours() * Math.PI / 12) * 0.5; // Variación diaria
    const randomVariation = (Math.random() - 0.5) * 2; // Variación aleatoria ±1

    // Actualizar tendencias ocasionalmente
    if (Math.random() < 0.1) { // 10% de probabilidad
      state.temperatureTrend = (Math.random() - 0.5) * 0.2;
      state.humidityTrend = (Math.random() - 0.5) * 0.3;
      state.ppmTrend = (Math.random() - 0.5) * 10;
    }

    // Calcular valores con variaciones
    const temperature = Math.max(15, Math.min(30, 
      state.baseTemperature + 
      timeVariation + 
      randomVariation + 
      state.temperatureTrend * timeSinceLastUpdate
    ));

    const humidity = Math.max(20, Math.min(80, 
      state.baseHumidity + 
      (timeVariation * 2) + 
      (randomVariation * 1.5) + 
      state.humidityTrend * timeSinceLastUpdate
    ));

    const ppm = Math.max(300, Math.min(1000, 
      state.basePpm + 
      (randomVariation * 20) + 
      state.ppmTrend * timeSinceLastUpdate
    ));

    // Actualizar estado
    state.lastUpdate = now;

    return {
      temperature: Math.round(temperature * 10) / 10, // 1 decimal
      humidity: Math.round(humidity * 10) / 10,
      ppm: Math.round(ppm)
    };
  }

  /**
   * Guarda una lectura de sensor en la base de datos
   */
  private async saveSensorReading(spaceGuid: string, reading: SensorReading): Promise<void> {
    try {
      await prisma.sensor_data.create({
        data: {
          spaceGuid,
          temperature: reading.temperature,
          humidity: reading.humidity,
          ppm: reading.ppm,
          timestamp: new Date()
        }
      });
    } catch (error) {
      console.error(`[SensorSimulation] Error guardando lectura para ${spaceGuid}:`, error);
    }
  }

  /**
   * Procesa una iteración de simulación
   */
  private async processSimulationIteration(): Promise<void> {
    if (this.ENABLE_BATCH_MODE) {
      await this.processBatchSimulation();
    } else {
      await this.processFullSimulation();
    }
  }

  /**
   * Procesa simulación completa (todas las habitaciones)
   */
  private async processFullSimulation(): Promise<void> {
    const readings: Array<{ spaceGuid: string; reading: SensorReading }> = [];

    // Generar lecturas para todas las habitaciones
    for (const [spaceGuid, state] of this.roomStates) {
      const reading = this.generateSensorReading(state);
      readings.push({ spaceGuid, reading });
    }

    // Guardar todas las lecturas en paralelo
    const savePromises = readings.map(({ spaceGuid, reading }) => 
      this.saveSensorReading(spaceGuid, reading)
    );

    try {
      await Promise.all(savePromises);
      console.log(`[SensorSimulation] Guardadas ${readings.length} lecturas de sensores`);
    } catch (error) {
      console.error('[SensorSimulation] Error en iteración de simulación:', error);
    }
  }

  /**
   * Procesa simulación por lotes (solo algunas habitaciones por vez)
   */
  private async processBatchSimulation(): Promise<void> {
    const roomEntries = Array.from(this.roomStates.entries());
    const selectedRooms = this.selectRandomRooms(roomEntries, this.MAX_ROOMS_PER_BATCH);
    
    const readings: Array<{ spaceGuid: string; reading: SensorReading }> = [];

    // Generar lecturas solo para las habitaciones seleccionadas
    for (const [spaceGuid, state] of selectedRooms) {
      const reading = this.generateSensorReading(state);
      readings.push({ spaceGuid, reading });
    }

    // Guardar todas las lecturas en paralelo
    const savePromises = readings.map(({ spaceGuid, reading }) => 
      this.saveSensorReading(spaceGuid, reading)
    );

    try {
      await Promise.all(savePromises);
      console.log(`[SensorSimulation] Guardadas ${readings.length} lecturas de sensores (modo lote)`);
    } catch (error) {
      console.error('[SensorSimulation] Error en iteración de simulación:', error);
    }
  }

  /**
   * Selecciona habitaciones aleatorias para el modo lote
   */
  private selectRandomRooms(roomEntries: Array<[string, RoomSensorState]>, count: number): Array<[string, RoomSensorState]> {
    const shuffled = roomEntries.sort(() => 0.5 - Math.random());
    return shuffled.slice(0, Math.min(count, roomEntries.length));
  }

  /**
   * Inicia la simulación de sensores
   */
  public startSimulation(): void {
    if (this.isRunning) {
      console.log('[SensorSimulation] La simulación ya está ejecutándose');
      return;
    }

    console.log('[SensorSimulation] Iniciando simulación de sensores...');
    this.isRunning = true;

    // Ejecutar inmediatamente una vez
    this.processSimulationIteration();

    // Configurar intervalo
    this.intervalId = setInterval(() => {
      this.processSimulationIteration();
    }, this.UPDATE_INTERVAL);

    console.log(`[SensorSimulation] Simulación iniciada con intervalo de ${this.UPDATE_INTERVAL}ms`);
  }

  /**
   * Detiene la simulación de sensores
   */
  public stopSimulation(): void {
    if (!this.isRunning) {
      console.log('[SensorSimulation] La simulación no está ejecutándose');
      return;
    }

    console.log('[SensorSimulation] Deteniendo simulación de sensores...');
    this.isRunning = false;

    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }

    console.log('[SensorSimulation] Simulación detenida');
  }

  /**
   * Obtiene el estado actual de la simulación
   */
  public getSimulationStatus(): { isRunning: boolean; roomCount: number; interval: number; batchMode: boolean; batchSize: number } {
    return {
      isRunning: this.isRunning,
      roomCount: this.roomStates.size,
      interval: this.UPDATE_INTERVAL,
      batchMode: this.ENABLE_BATCH_MODE,
      batchSize: this.MAX_ROOMS_PER_BATCH
    };
  }

  /**
   * Limpia datos antiguos de sensores
   */
  public async cleanupOldData(daysToKeep: number = 7): Promise<number> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

      const result = await prisma.sensor_data.deleteMany({
        where: {
          timestamp: {
            lt: cutoffDate
          }
        }
      });

      console.log(`[SensorSimulation] Limpieza completada: eliminados ${result.count} registros anteriores a ${cutoffDate.toISOString()}`);
      return result.count;
    } catch (error) {
      console.error('[SensorSimulation] Error en limpieza de datos:', error);
      return 0;
    }
  }

  /**
   * Obtiene estadísticas de uso de la base de datos
   */
  public async getDatabaseStats(): Promise<any> {
    try {
      const totalRecords = await prisma.sensor_data.count();
      const oldestRecord = await prisma.sensor_data.findFirst({
        orderBy: { timestamp: 'asc' },
        select: { timestamp: true }
      });
      const newestRecord = await prisma.sensor_data.findFirst({
        orderBy: { timestamp: 'desc' },
        select: { timestamp: true }
      });

      return {
        totalRecords,
        oldestRecord: oldestRecord?.timestamp,
        newestRecord: newestRecord?.timestamp,
        estimatedRecordsPerHour: this.ENABLE_BATCH_MODE 
          ? (this.MAX_ROOMS_PER_BATCH * 3600) / (this.UPDATE_INTERVAL / 1000)
          : (this.roomStates.size * 3600) / (this.UPDATE_INTERVAL / 1000)
      };
    } catch (error) {
      console.error('[SensorSimulation] Error obteniendo estadísticas de BD:', error);
      return null;
    }
  }

  /**
   * Obtiene las últimas lecturas de sensores para una habitación específica
   */
  public async getLatestSensorData(spaceGuid: string, limit: number = 10): Promise<any[]> {
    try {
      return await prisma.sensor_data.findMany({
        where: { spaceGuid },
        orderBy: { timestamp: 'desc' },
        take: limit,
        include: {
          space: {
            select: {
              dispositiu: true,
              edifici: true,
              planta: true
            }
          }
        }
      });
    } catch (error) {
      console.error(`[SensorSimulation] Error obteniendo datos para ${spaceGuid}:`, error);
      return [];
    }
  }

  /**
   * Obtiene estadísticas de sensores para todas las habitaciones
   */
  public async getSensorStatistics(): Promise<any> {
    try {
      const stats = await prisma.sensor_data.groupBy({
        by: ['spaceGuid'],
        _avg: {
          temperature: true,
          humidity: true,
          ppm: true
        },
        _max: {
          temperature: true,
          humidity: true,
          ppm: true
        },
        _min: {
          temperature: true,
          humidity: true,
          ppm: true
        },
        _count: {
          id: true
        },
        orderBy: {
          _count: {
            id: 'desc'
          }
        }
      });

      return stats;
    } catch (error) {
      console.error('[SensorSimulation] Error obteniendo estadísticas:', error);
      return [];
    }
  }
}

// Instancia singleton
export const sensorSimulationService = new SensorSimulationService();
