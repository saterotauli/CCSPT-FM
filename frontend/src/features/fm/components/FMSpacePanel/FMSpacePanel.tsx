import React from 'react';
import { BasePanel } from '@shared/components/panels';

// Temporary mock data while fixing module issues
const mockSpaces = [
  {
    guid: 'space-1',
    name: 'Sala de Reuniones A',
    type: 'Oficina',
    building: 'Edificio A',
    floor: '2',
    area: 45.2,
    capacity: 12,
    status: 'Disponible'
  },
  {
    guid: 'space-2', 
    name: 'Laboratorio Principal',
    type: 'Laboratorio',
    building: 'Edificio B',
    floor: '1',
    area: 120.8,
    capacity: 20,
    status: 'Ocupado'
  }
];

const FMSpacePanel: React.FC = () => {
  const [loading, setLoading] = React.useState(false);
  const [error] = React.useState<string | undefined>(undefined);

  const handleRefresh = () => {
    setLoading(true);
    setTimeout(() => setLoading(false), 1000);
  };

  const actions = (
    <button 
      onClick={handleRefresh}
      className="btn-secondary"
      disabled={loading}
    >
      Actualizar
    </button>
  );

  return (
    <BasePanel 
      title="Espacios FM" 
      loading={loading} 
      error={error}
      actions={actions}
    >
      <div className="fm-space-list">
        {mockSpaces.map((space) => (
          <div key={space.guid} className="fm-space-item">
            <div className="space-header">
              <span className="space-name">{space.name}</span>
              <span className="space-type">{space.type}</span>
            </div>
            <div className="space-details">
              <span className="space-building">{space.building}</span>
              <span className="space-floor">Planta {space.floor}</span>
            </div>
            <div className="space-metrics">
              <span className="space-area">{space.area.toFixed(1)} m²</span>
              <span className="space-capacity">
                Capacidad: {space.capacity} personas
              </span>
              <span className={`space-status ${space.status.toLowerCase()}`}>
                {space.status}
              </span>
            </div>
          </div>
        ))}
        
        {mockSpaces.length === 0 && !loading && (
          <div className="empty-state">
            <span>🏢</span>
            <p>No hay espacios disponibles</p>
          </div>
        )}
      </div>
    </BasePanel>
  );
};

export default FMSpacePanel;
