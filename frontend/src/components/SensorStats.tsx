import React from 'react';
import { useRealTimeStatistics } from '../hooks/useRealTimeSensors';

interface SensorStatsProps {
  className?: string;
}

const SensorStats: React.FC<SensorStatsProps> = ({ className = '' }) => {
  const { stats, loading, error, isConnected } = useRealTimeStatistics(5000); // Actualizar cada 5 segundos

  if (loading && !stats) {
    return (
      <div className={`sensor-stats ${className}`}>
        <div className="loading">Cargando estadísticas...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`sensor-stats ${className}`}>
        <div className="error">Error: {error}</div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className={`sensor-stats ${className}`}>
        <div className="no-data">No hay datos disponibles</div>
      </div>
    );
  }

  return (
    <div className={`sensor-stats ${className}`}>
      <div className="stats-header">
        <h3>Estadísticas de Sensores</h3>
        <div className={`connection-status ${isConnected ? 'connected' : 'disconnected'}`}>
          {isConnected ? '🟢 Conectado' : '🔴 Desconectado'}
        </div>
      </div>
      
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-label">Total Habitaciones</div>
          <div className="stat-value">{stats.totalRooms}</div>
        </div>
        
        <div className="stat-card">
          <div className="stat-label">Temperatura Mitjana</div>
          <div className="stat-value">{stats.averageTemperature.toFixed(1)}°C</div>
          <div className="stat-range">
            {stats.temperatureRange.min.toFixed(1)}°C - {stats.temperatureRange.max.toFixed(1)}°C
          </div>
        </div>
        
        <div className="stat-card">
          <div className="stat-label">Humedad Mitjana</div>
          <div className="stat-value">{stats.averageHumidity.toFixed(1)}%</div>
          <div className="stat-range">
            {stats.humidityRange.min.toFixed(1)}% - {stats.humidityRange.max.toFixed(1)}%
          </div>
        </div>
        
        <div className="stat-card">
          <div className="stat-label">PPM Mitjana</div>
          <div className="stat-value">{stats.averagePpm.toFixed(0)}</div>
          <div className="stat-range">
            {stats.ppmRange.min} - {stats.ppmRange.max}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SensorStats;
