import { useState, useEffect, useCallback, useRef } from 'react';
import { sensorService, RoomInfo, SensorStatistics } from '../services/sensorService';

interface UseRealTimeSensorsOptions {
  edifici?: string;
  planta?: string;
  interval?: number; // en milisegundos
  autoStart?: boolean;
}

interface UseRealTimeSensorsReturn {
  data: RoomInfo[];
  stats: SensorStatistics | null;
  loading: boolean;
  error: string | null;
  isConnected: boolean;
  start: () => void;
  stop: () => void;
  refresh: () => Promise<void>;
}

export const useRealTimeSensors = (options: UseRealTimeSensorsOptions = {}): UseRealTimeSensorsReturn => {
  const {
    edifici,
    planta,
    interval = 2000, // 2 segundos por defecto
    autoStart = true
  } = options;

  const [data, setData] = useState<RoomInfo[]>([]);
  const [stats, setStats] = useState<SensorStatistics | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const isActiveRef = useRef(false);

  const fetchData = useCallback(async () => {
    if (!isActiveRef.current) return;

    try {
      setError(null);
      
      // Obtener datos de sensores
      let sensorData: RoomInfo[];
      if (edifici && planta) {
        sensorData = await sensorService.getReadingsByBuildingAndFloor(edifici, planta);
      } else if (edifici) {
        sensorData = await sensorService.getReadingsByBuilding(edifici);
      } else {
        sensorData = await sensorService.getAllReadings();
      }
      
      setData(sensorData);

      // Obtener estadísticas (solo si no hay filtros específicos)
      if (!edifici && !planta) {
        const statistics = await sensorService.getStatistics();
        setStats(statistics);
      }

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error desconocido';
      setError(errorMessage);
      console.error('Error fetching sensor data:', err);
    }
  }, [edifici, planta]);

  const start = useCallback(() => {
    if (intervalRef.current) return; // Ya está corriendo

    isActiveRef.current = true;
    setIsConnected(true);
    setLoading(true);

    // Primera carga inmediata
    fetchData().finally(() => setLoading(false));

    // Configurar intervalo
    intervalRef.current = setInterval(() => {
      fetchData();
    }, interval);

  }, [fetchData, interval]);

  const stop = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    isActiveRef.current = false;
    setIsConnected(false);
  }, []);

  const refresh = useCallback(async () => {
    setLoading(true);
    await fetchData();
    setLoading(false);
  }, [fetchData]);

  // Auto-start si está habilitado
  useEffect(() => {
    if (autoStart) {
      start();
    }

    return () => {
      stop();
    };
  }, [autoStart, start, stop]);

  // Limpiar al desmontar
  useEffect(() => {
    return () => {
      stop();
    };
  }, [stop]);

  return {
    data,
    stats,
    loading,
    error,
    isConnected,
    start,
    stop,
    refresh
  };
};

// Hook específico para estadísticas en tiempo real
export const useRealTimeStatistics = (interval: number = 5000) => {
  const [stats, setStats] = useState<SensorStatistics | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const isActiveRef = useRef(false);

  const fetchStats = useCallback(async () => {
    if (!isActiveRef.current) return;

    try {
      setError(null);
      const statistics = await sensorService.getStatistics();
      setStats(statistics);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error desconocido';
      setError(errorMessage);
      console.error('Error fetching statistics:', err);
    }
  }, []);

  const start = useCallback(() => {
    if (intervalRef.current) return;

    isActiveRef.current = true;
    setIsConnected(true);
    setLoading(true);

    fetchStats().finally(() => setLoading(false));

    intervalRef.current = setInterval(fetchStats, interval);
  }, [fetchStats, interval]);

  const stop = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    isActiveRef.current = false;
    setIsConnected(false);
  }, []);

  useEffect(() => {
    start();
    return stop;
  }, [start, stop]);

  return { stats, loading, error, isConnected, start, stop };
};
