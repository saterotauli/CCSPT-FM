import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface SensorReading {
  temperature: number;
  humidity: number;
  ppm: number;
  timestamp: Date;
}

interface RoomSensorState {
  spaceGuid: string;
  baseTemperature: number;
  baseHumidity: number;
  basePpm: number;
  temperatureTrend: number;
  humidityTrend: number;
  ppmTrend: number;
  lastUpdate: Date;
}

class EphemeralSensorService {
  private roomStates: Map<string, RoomSensorState> = new Map();
  private isInitialized: boolean = false;

  /**
   * Inicializa los estados base de los sensores para cada habitación
   */
  private async initializeRoomStates(): Promise<void> {
    if (this.isInitialized) return;

    try {
      const rooms = await prisma.ifcspace.findMany({
        select: {
          guid: true,
          dispositiu: true,
          edifici: true,
          planta: true
        }
      });

      console.log(`[EphemeralSensors] Inicializando ${rooms.length} habitaciones en memoria`);

      for (const room of rooms) {
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

      this.isInitialized = true;
      console.log(`[EphemeralSensors] Estados inicializados para ${this.roomStates.size} habitaciones`);
    } catch (error) {
      console.error('[EphemeralSensors] Error inicializando estados:', error);
    }
  }

  /**
   * Obtiene valores base según el tipo de habitación
   * Valores ajustados para generar alertas realistas según los nuevos umbrales
   */
  private getBaseValuesForRoomType(roomType: string): { temperature: number; humidity: number; ppm: number } {
    const type = roomType.toLowerCase();

    if (type.includes('quiròfan') || type.includes('quirofan')) {
      return { temperature: 20.0, humidity: 50.0, ppm: 400.0 };
    } else if (type.includes('hospit') || type.includes('habitació')) {
      return { temperature: 22.0, humidity: 50.0, ppm: 450.0 };
    } else if (type.includes('magatzem') || type.includes('mgtz')) {
      return { temperature: 20.0, humidity: 45.0, ppm: 500.0 };
    } else if (type.includes('oficina') || type.includes('despatx')) {
      return { temperature: 23.0, humidity: 50.0, ppm: 480.0 };
    } else if (type.includes('cuina') || type.includes('cocina')) {
      return { temperature: 25.0, humidity: 60.0, ppm: 700.0 };
    } else if (type.includes('bany') || type.includes('aseo')) {
      return { temperature: 22.0, humidity: 65.0, ppm: 600.0 };
    } else {
      return { temperature: 22.0, humidity: 50.0, ppm: 450.0 };
    }
  }

  /**
   * Genera una lectura de sensor realista en tiempo real
   * Ajustado para generar alertas realistas según los nuevos umbrales
   */
  private generateSensorReading(state: RoomSensorState): SensorReading {
    const now = new Date();
    const timeSinceLastUpdate = (now.getTime() - state.lastUpdate.getTime()) / 1000;

    // Variaciones naturales basadas en el tiempo (más amplias para generar alertas)
    const timeVariation = Math.sin(now.getHours() * Math.PI / 12) * 1.0;
    const randomVariation = (Math.random() - 0.5) * 4; // Aumentado para más variación

    // Actualizar tendencias ocasionalmente (más frecuente y con mayor impacto)
    if (Math.random() < 0.15) {
      state.temperatureTrend = (Math.random() - 0.5) * 0.5;
      state.humidityTrend = (Math.random() - 0.5) * 0.8;
      state.ppmTrend = (Math.random() - 0.5) * 30;
    }

    // Calcular valores con variaciones más amplias para generar alertas
    const temperature = Math.max(15, Math.min(35, 
      state.baseTemperature + 
      timeVariation + 
      randomVariation + 
      state.temperatureTrend * timeSinceLastUpdate
    ));

    const humidity = Math.max(25, Math.min(85, 
      state.baseHumidity + 
      (timeVariation * 3) + 
      (randomVariation * 2) + 
      state.humidityTrend * timeSinceLastUpdate
    ));

    const ppm = Math.max(200, Math.min(1200, 
      state.basePpm + 
      (randomVariation * 40) + 
      state.ppmTrend * timeSinceLastUpdate
    ));

    // Actualizar estado
    state.lastUpdate = now;

    return {
      temperature: Math.round(temperature * 10) / 10,
      humidity: Math.round(humidity * 10) / 10,
      ppm: Math.round(ppm),
      timestamp: now
    };
  }

  /**
   * Obtiene lecturas actuales de sensores para una habitación específica
   */
  public async getCurrentSensorReading(spaceGuid: string): Promise<SensorReading | null> {
    await this.initializeRoomStates();
    
    const state = this.roomStates.get(spaceGuid);
    if (!state) return null;

    return this.generateSensorReading(state);
  }

  /**
   * Obtiene lecturas actuales para múltiples habitaciones
   */
  public async getCurrentSensorReadings(spaceGuids: string[]): Promise<Array<{ spaceGuid: string; reading: SensorReading | null }>> {
    await this.initializeRoomStates();
    
    return spaceGuids.map(spaceGuid => {
      const state = this.roomStates.get(spaceGuid);
      return {
        spaceGuid,
        reading: state ? this.generateSensorReading(state) : null
      };
    });
  }

  /**
   * Obtiene lecturas actuales para todas las habitaciones
   */
  public async getAllCurrentSensorReadings(): Promise<Array<{ spaceGuid: string; reading: SensorReading }>> {
    await this.initializeRoomStates();
    
    const readings: Array<{ spaceGuid: string; reading: SensorReading }> = [];
    
    for (const [spaceGuid, state] of this.roomStates) {
      readings.push({
        spaceGuid,
        reading: this.generateSensorReading(state)
      });
    }

    return readings;
  }

  /**
   * Obtiene lecturas actuales filtradas por edificio y/o planta
   */
  public async getCurrentSensorReadingsFiltered(edifici?: string, planta?: string): Promise<Array<{ spaceGuid: string; reading: SensorReading; roomInfo: any }>> {
    await this.initializeRoomStates();
    
    const readings: Array<{ spaceGuid: string; reading: SensorReading; roomInfo: any }> = [];
    
    // Obtener habitaciones filtradas
    const rooms = await prisma.ifcspace.findMany({
      where: {
        ...(edifici && { edifici }),
        ...(planta && { planta })
      },
      select: {
        guid: true,
        dispositiu: true,
        edifici: true,
        planta: true,
        departament: true
      }
    });

    for (const room of rooms) {
      const state = this.roomStates.get(room.guid);
      if (state) {
        readings.push({
          spaceGuid: room.guid,
          reading: this.generateSensorReading(state),
          roomInfo: {
            dispositiu: room.dispositiu,
            edifici: room.edifici,
            planta: room.planta,
            departament: room.departament
          }
        });
      }
    }

    return readings;
  }

  /**
   * Simula un historial de lecturas para una habitación (últimas N lecturas)
   */
  public async getSensorHistory(spaceGuid: string, count: number = 10): Promise<SensorReading[]> {
    await this.initializeRoomStates();
    
    const state = this.roomStates.get(spaceGuid);
    if (!state) return [];

    const history: SensorReading[] = [];
    const now = new Date();
    
    // Generar lecturas hacia atrás en el tiempo
    for (let i = 0; i < count; i++) {
      const timeOffset = i * 2000; // Cada 2 segundos hacia atrás
      const timestamp = new Date(now.getTime() - timeOffset);
      
      // Crear un estado temporal para esta lectura histórica
      const tempState = { ...state };
      tempState.lastUpdate = new Date(timestamp.getTime() - 2000);
      
      const reading = this.generateSensorReading(tempState);
      reading.timestamp = timestamp;
      history.push(reading);
    }

    return history.reverse(); // Más antiguo primero
  }

  /**
   * Obtiene estadísticas de los sensores efímeros
   */
  public async getEphemeralStats(): Promise<any> {
    await this.initializeRoomStates();
    
    const allReadings = await this.getAllCurrentSensorReadings();
    
    if (allReadings.length === 0) {
      return {
        totalRooms: 0,
        averageTemperature: 0,
        averageHumidity: 0,
        averagePpm: 0,
        temperatureRange: { min: 0, max: 0 },
        humidityRange: { min: 0, max: 0 },
        ppmRange: { min: 0, max: 0 }
      };
    }

    const temperatures = allReadings.map(r => r.reading.temperature);
    const humidities = allReadings.map(r => r.reading.humidity);
    const ppms = allReadings.map(r => r.reading.ppm);

    return {
      totalRooms: allReadings.length,
      averageTemperature: temperatures.reduce((a, b) => a + b, 0) / temperatures.length,
      averageHumidity: humidities.reduce((a, b) => a + b, 0) / humidities.length,
      averagePpm: ppms.reduce((a, b) => a + b, 0) / ppms.length,
      temperatureRange: { 
        min: Math.min(...temperatures), 
        max: Math.max(...temperatures) 
      },
      humidityRange: { 
        min: Math.min(...humidities), 
        max: Math.max(...humidities) 
      },
      ppmRange: { 
        min: Math.min(...ppms), 
        max: Math.max(...ppms) 
      }
    };
  }

  /**
   * Obtiene el estado del servicio efímero
   */
  public getServiceStatus(): { isInitialized: boolean; roomCount: number } {
    return {
      isInitialized: this.isInitialized,
      roomCount: this.roomStates.size
    };
  }
}

// Instancia singleton
export const ephemeralSensorService = new EphemeralSensorService();
