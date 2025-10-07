import { useState, useEffect } from 'react';
import { sensorService, RoomInfo } from '../services/sensorService';

interface UseEnrichedSensorsProps {
  edifici?: string;
  interval?: number;
  autoStart?: boolean;
}

export const useEnrichedSensors = ({ 
  edifici, 
  interval = 20000, 
  autoStart = true 
}: UseEnrichedSensorsProps) => {
  const [data, setData] = useState<RoomInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchEnrichedData = async () => {
    if (!autoStart) return;
    
    setLoading(true);
    setError(null);
    
    try {
      let result: RoomInfo[];
      if (edifici) {
        result = await sensorService.getReadingsByBuilding(edifici);
      } else {
        result = await sensorService.getAllReadings();
      }
      setData(result);
      console.log(`[useEnrichedSensors] Loaded ${result.length} enriched sensors for ${edifici || 'all buildings'}`);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error desconocido';
      setError(errorMessage);
      console.error('[useEnrichedSensors] Error:', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Initial fetch
  useEffect(() => {
    fetchEnrichedData();
  }, [edifici, autoStart]);

  // Interval fetch
  useEffect(() => {
    if (!autoStart || !interval) return;

    const intervalId = setInterval(fetchEnrichedData, interval);
    return () => clearInterval(intervalId);
  }, [edifici, interval, autoStart]);

  return {
    data,
    loading,
    error,
    refetch: fetchEnrichedData
  };
};
