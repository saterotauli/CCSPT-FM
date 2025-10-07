import React from 'react';
import { ifcSpaceService } from './ifcSpaceService';
import SENSOR_DATA from '@/data/sensor-readings.json';

// Servicio para consumir datos de sensores desde una API simulada (estática)
// Los JSON están servidos desde public/api/ephemeral-sensors
const STATIC_BASE = '/api/ephemeral-sensors';

export interface SensorReading {
  spaceGuid: string;
  temperature: number;
  humidity: number;
  ppm: number;
  timestamp: string;
}

export interface RoomInfo {
  spaceGuid: string;
  dispositiu?: string; // Nombre del espacio/dispositivo (obtenido de ifcspace)
  edifici?: string; // Obtenido de ifcspace
  planta?: string; // Obtenido de ifcspace
  departament?: string; // Obtenido de ifcspace
  temperature: number;
  humidity: number;
  ppm: number;
  timestamp: string;
}

const FALLBACK_STATISTICS = {
  "totalRooms": 13,
  "averageTemperature": 25.2,
  "averageHumidity": 46.8,
  "averagePpm": 720.4,
  "temperatureRange": { "min": 21.7, "max": 31.0 },
  "humidityRange": { "min": 35.0, "max": 55.2 },
  "ppmRange": { "min": 480, "max": 1400 }
};

export interface SensorReading {
  spaceGuid: string;
  temperature: number;
  humidity: number;
  ppm: number;
  timestamp: string;
}

export interface RoomInfo {
  spaceGuid: string;
  dispositiu?: string; // Nombre del espacio/dispositivo (obtenido de ifcspace)
  edifici?: string; // Obtenido de ifcspace
  planta?: string; // Obtenido de ifcspace
  departament?: string; // Obtenido de ifcspace
  temperature: number;
  humidity: number;
  ppm: number;
  timestamp: string;
}

export interface SensorStatistics {
  totalRooms: number;
  averageTemperature: number;
  averageHumidity: number;
  averagePpm: number;
  temperatureRange: { min: number; max: number };
  humidityRange: { min: number; max: number };
  ppmRange: { min: number; max: number };
}

export interface EphemeralStatus {
  isInitialized: boolean;
  roomCount: number;
}

class SensorService {
  // En modo estático no necesitamos baseUrl dinámico
  constructor() {}

  /**
   * Obtiene el estado del servicio efímero
   */
  async getStatus(): Promise<EphemeralStatus> {
    // Simulación estática: derivar estado de rooms JSON
    const rooms = await this.getAllReadings();
    return {
      isInitialized: true,
      roomCount: rooms.length,
    };
  }

  /**
   * Obtiene estadísticas generales de todos los sensores
   */
  async getStatistics(): Promise<SensorStatistics> {
    try {
      const response = await fetch(`${STATIC_BASE}/statistics.json`);
      if (response.ok) {
        return response.json();
      }
    } catch (error) {
      console.warn('[SensorService] Failed to load statistics from public/, using fallback data');
    }
    return FALLBACK_STATISTICS;
  }

  /**
   * Obtiene lecturas actuales de todas las habitaciones
   */
  async getAllReadings(): Promise<RoomInfo[]> {
    // Ahora que los datos se importan, ya no necesitamos `fetch`.
    // Devolvemos una promesa para mantener la asincronía de la función.
    const sensorData: SensorReading[] = SENSOR_DATA;
    return Promise.resolve(this.enrichWithIfcSpaceData(sensorData));
  }

  /**
   * Enriquece los datos de sensores con información de ifcspace
   */
  private async enrichWithIfcSpaceData(sensorData: SensorReading[]): Promise<RoomInfo[]> {
    console.log(`[SensorService] Enriching ${sensorData.length} sensor readings`);
    const enrichedData: RoomInfo[] = [];
    
    for (const sensor of sensorData) {
      console.log(`[SensorService] Processing sensor: ${sensor.spaceGuid}`);
      const spaceInfo = await ifcSpaceService.getSpaceByGuid(sensor.spaceGuid);
      
      // Extraer información del edificio desde spaceGuid si no hay datos en ifcspace
      let edifici = spaceInfo?.edifici;
      let planta = spaceInfo?.planta;
      let departament = spaceInfo?.departament;
      
      if (!edifici && sensor.spaceGuid) {
        // Extraer código del edificio desde spaceGuid (formato: VEU-P00-013)
        const guidParts = sensor.spaceGuid.split('-');
        if (guidParts.length >= 2) {
          edifici = guidParts[0]; // VEU
          planta = guidParts[1];  // P00
        }
      }
      
      const enrichedSensor: RoomInfo = {
        spaceGuid: sensor.spaceGuid,
        temperature: sensor.temperature,
        humidity: sensor.humidity,
        ppm: sensor.ppm,
        timestamp: sensor.timestamp,
        // Información obtenida de ifcspace - usar 'dispositiu' (nombre visible). Nunca usar 'codi'.
        dispositiu: spaceInfo?.dispositiu || spaceInfo?.nom || spaceInfo?.codi || `Espacio ${sensor.spaceGuid}`,
        edifici: edifici,
        planta: planta,
        departament: departament
      };
      
      console.log(`[SensorService] Enriched sensor:`, {
        spaceGuid: enrichedSensor.spaceGuid,
        dispositiu: enrichedSensor.dispositiu,
        edifici: enrichedSensor.edifici,
        planta: enrichedSensor.planta,
        foundInIfcSpace: !!spaceInfo
      });
      
      enrichedData.push(enrichedSensor);
    }
    
    console.log(`[SensorService] Enrichment complete. ${enrichedData.length} sensors processed`);
    return enrichedData;
  }

  /**
   * Obtiene lecturas filtradas por edificio
   */
  async getReadingsByBuilding(edifici: string): Promise<RoomInfo[]> {
    const all = await this.getAllReadings();
    return all.filter(r => r.edifici === edifici);
  }

  /**
   * Obtiene lecturas filtradas por edificio y planta
   */
  async getReadingsByBuildingAndFloor(edifici: string, planta: string): Promise<RoomInfo[]> {
    const all = await this.getAllReadings();
    return all.filter(r => r.edifici === edifici && r.planta === planta);
  }

  /**
   * Obtiene la lectura actual de una habitación específica
   */
  async getRoomReading(spaceGuid: string): Promise<SensorReading> {
    const all = await this.getAllReadings();
    const room = all.find(r => r.spaceGuid === spaceGuid);
    if (!room) throw new Error('Habitación no encontrada');
    return {
      spaceGuid: room.spaceGuid,
      temperature: room.temperature,
      humidity: room.humidity,
      ppm: room.ppm,
      timestamp: room.timestamp,
    };
  }

  /**
   * Obtiene el historial simulado de una habitación
   */
  async getRoomHistory(spaceGuid: string, count: number = 10): Promise<SensorReading[]> {
    // Simulación estática: devolver un único punto (o repetir el mismo)
    const reading = await this.getRoomReading(spaceGuid);
    return Array.from({ length: Math.max(1, Math.min(count, 10)) }, () => reading);
  }

  /**
   * Obtiene lecturas de múltiples habitaciones específicas
   */
  async getMultipleRoomReadings(spaceGuids: string[]): Promise<Array<{ spaceGuid: string; reading: SensorReading | null }>> {
    const all = await this.getAllReadings();
    return spaceGuids.map(g => {
      const room = all.find(r => r.spaceGuid === g);
      return {
        spaceGuid: g,
        reading: room
          ? { 
              spaceGuid: room.spaceGuid,
              temperature: room.temperature, 
              humidity: room.humidity, 
              ppm: room.ppm, 
              timestamp: room.timestamp 
            }
          : null,
      };
    });
  }
}

// Instancia singleton
export const sensorService = new SensorService();

// Hook personalizado para usar en React
export const useSensorData = () => {
  const [data, setData] = React.useState<RoomInfo[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const fetchData = React.useCallback(async (edifici?: string, planta?: string) => {
    setLoading(true);
    setError(null);
    try {
      let result: RoomInfo[];
      if (edifici && planta) {
        result = await sensorService.getReadingsByBuildingAndFloor(edifici, planta);
      } else if (edifici) {
        result = await sensorService.getReadingsByBuilding(edifici);
      } else {
        result = await sensorService.getAllReadings();
      }
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setLoading(false);
    }
  }, []);

  return { data, loading, error, fetchData };
};

// Hook para estadísticas
export const useSensorStatistics = () => {
  const [stats, setStats] = React.useState<SensorStatistics | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const fetchStats = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await sensorService.getStatistics();
      setStats(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setLoading(false);
    }
  }, []);

  return { stats, loading, error, fetchStats };
};
