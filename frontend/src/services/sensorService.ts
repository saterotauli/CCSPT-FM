import React from 'react';

// Servicio para conectar con los sensores efímeros del backend

const API_BASE_URL = 'http://localhost:4000/api';

export interface SensorReading {
  temperature: number;
  humidity: number;
  ppm: number;
  timestamp: string;
}

export interface RoomInfo {
  spaceGuid: string;
  dispositiu: string;
  edifici: string;
  planta: string;
  departament: string;
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
  private baseUrl: string;

  constructor(baseUrl: string = API_BASE_URL) {
    this.baseUrl = baseUrl;
  }

  /**
   * Obtiene el estado del servicio efímero
   */
  async getStatus(): Promise<EphemeralStatus> {
    const response = await fetch(`${this.baseUrl}/ephemeral-sensors/status`);
    if (!response.ok) {
      throw new Error(`Error obteniendo estado: ${response.statusText}`);
    }
    return response.json();
  }

  /**
   * Obtiene estadísticas generales de todos los sensores
   */
  async getStatistics(): Promise<SensorStatistics> {
    const response = await fetch(`${this.baseUrl}/ephemeral-sensors/statistics`);
    if (!response.ok) {
      throw new Error(`Error obteniendo estadísticas: ${response.statusText}`);
    }
    return response.json();
  }

  /**
   * Obtiene lecturas actuales de todas las habitaciones
   */
  async getAllReadings(): Promise<RoomInfo[]> {
    const response = await fetch(`${this.baseUrl}/ephemeral-sensors/rooms-with-info`);
    if (!response.ok) {
      throw new Error(`Error obteniendo lecturas: ${response.statusText}`);
    }
    return response.json();
  }

  /**
   * Obtiene lecturas filtradas por edificio
   */
  async getReadingsByBuilding(edifici: string): Promise<RoomInfo[]> {
    const response = await fetch(`${this.baseUrl}/ephemeral-sensors/rooms-with-info?edifici=${encodeURIComponent(edifici)}`);
    if (!response.ok) {
      throw new Error(`Error obteniendo lecturas del edificio: ${response.statusText}`);
    }
    return response.json();
  }

  /**
   * Obtiene lecturas filtradas por edificio y planta
   */
  async getReadingsByBuildingAndFloor(edifici: string, planta: string): Promise<RoomInfo[]> {
    const response = await fetch(`${this.baseUrl}/ephemeral-sensors/rooms-with-info?edifici=${encodeURIComponent(edifici)}&planta=${encodeURIComponent(planta)}`);
    if (!response.ok) {
      throw new Error(`Error obteniendo lecturas: ${response.statusText}`);
    }
    return response.json();
  }

  /**
   * Obtiene la lectura actual de una habitación específica
   */
  async getRoomReading(spaceGuid: string): Promise<SensorReading> {
    const response = await fetch(`${this.baseUrl}/ephemeral-sensors/room/${encodeURIComponent(spaceGuid)}`);
    if (!response.ok) {
      throw new Error(`Error obteniendo lectura de habitación: ${response.statusText}`);
    }
    return response.json();
  }

  /**
   * Obtiene el historial simulado de una habitación
   */
  async getRoomHistory(spaceGuid: string, count: number = 10): Promise<SensorReading[]> {
    const response = await fetch(`${this.baseUrl}/ephemeral-sensors/room/${encodeURIComponent(spaceGuid)}/history?count=${count}`);
    if (!response.ok) {
      throw new Error(`Error obteniendo historial: ${response.statusText}`);
    }
    return response.json();
  }

  /**
   * Obtiene lecturas de múltiples habitaciones específicas
   */
  async getMultipleRoomReadings(spaceGuids: string[]): Promise<Array<{ spaceGuid: string; reading: SensorReading | null }>> {
    const response = await fetch(`${this.baseUrl}/ephemeral-sensors/rooms?spaceGuids=${spaceGuids.join(',')}`);
    if (!response.ok) {
      throw new Error(`Error obteniendo lecturas múltiples: ${response.statusText}`);
    }
    return response.json();
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
