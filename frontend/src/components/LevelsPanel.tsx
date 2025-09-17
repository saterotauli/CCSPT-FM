/**
 * @fileoverview LevelsPanel.tsx - Componente de panel de niveles y departamentos
 * 
 * Este componente encapsula la funcionalidad de navegación por plantas
 * y departamentos, incluyendo aislamiento visual y expansión/contracción.
 * 
 * Características:
 * - Navegación por plantas y departamentos
 * - Aislamiento visual de espacios específicos
 * - Expansión/contracción de plantas
 * - Botón para mostrar todo
 * - Estética similar al panel de alertas
 * 
 * @author Sistema de Gestión de Edificios CCSPT
 * @version 1.0.0
 */

import React from 'react';

/**
 * Información de un espacio (compatible con IfcSpaceRow)
 * @interface SpaceInfo
 */
export interface SpaceInfo {
  /** GUID del espacio */
  guid?: string | null;
  /** Planta del espacio */
  planta?: string | null;
  /** Departamento del espacio */
  departament?: string | null;
  /** Nombre del espacio */
  name?: string | null;
}

/**
 * Estado de aislamiento actual (compatible con el existente)
 * @interface IsolationState
 */
export interface IsolationState {
  /** Tipo de aislamiento */
  type: 'none' | 'floor' | 'dept';
  /** Clave del aislamiento (planta o departamento) */
  key?: string;
}

/**
 * Propiedades del componente LevelsPanel
 * @interface LevelsPanelProps
 */
export interface LevelsPanelProps {
  /** Plantas disponibles */
  floors: string[];
  /** Espacios agrupados por planta */
  spacesByFloor: Record<string, SpaceInfo[]>;
  /** Plantas expandidas */
  expandedFloors: Record<string, boolean>;
  /** Estado de aislamiento actual */
  currentIsolation: IsolationState;
  /** Callback para alternar expansión de planta */
  onToggleFloor: (floor: string) => void;
  /** Callback para aislar una planta */
  onIsolateLevel: (floor: string) => void;
  /** Callback para aislar un departamento */
  onIsolateDepartment: (floor: string, department: string) => void;
  /** Callback para limpiar aislamiento */
  onClearIsolation: () => void;
  /** Clase CSS adicional (opcional) */
  className?: string;
  /** Estilo inline adicional (opcional) */
  style?: React.CSSProperties;
}

/**
 * Componente de panel de niveles y departamentos
 * 
 * @component
 * @param {LevelsPanelProps} props - Propiedades del componente
 * @returns {JSX.Element} Panel de navegación por plantas y departamentos
 * 
 * @description
 * Proporciona un panel para navegar por plantas y departamentos:
 * - Lista de plantas con botones de expansión
 * - Departamentos agrupados por planta
 * - Aislamiento visual de espacios específicos
 * - Botón para mostrar todo
 * - Estética consistente con el sistema de diseño
 */
const LevelsPanel: React.FC<LevelsPanelProps> = ({
  floors,
  spacesByFloor,
  expandedFloors,
  currentIsolation,
  onToggleFloor,
  onIsolateLevel,
  onIsolateDepartment,
  onClearIsolation,
  className = '',
  style
}) => {
  /**
   * Maneja la navegación por teclado en departamentos
   * 
   * @param {React.KeyboardEvent} e - Evento de teclado
   * @param {string} floor - Planta
   * @param {string} department - Departamento
   */
  const handleKeyDown = (e: React.KeyboardEvent, floor: string, department: string) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onIsolateDepartment(floor, department);
    }
  };

  return (
    <div 
      className={`levels-panel ${className}`}
      style={{
        background: '#fff',
        border: '1px solid #e6ecf5',
        borderRadius: '0.9rem',
        padding: '1rem',
        display: 'flex',
        flexDirection: 'column',
        minHeight: 0,
        maxHeight: '50vh',
        ...style
      }}
    >
      {/* Título del panel */}
      <div style={{ marginBottom: '1rem' }}>
        <h3 style={{ 
          fontWeight: 800, 
          color: '#0f172a', 
          margin: 0, 
          fontSize: '1.1rem' 
        }}>
          Nivells i Departaments
        </h3>
        <p style={{ 
          color: '#6b7280', 
          fontSize: '0.85rem', 
          margin: '0.3rem 0 0 0' 
        }}>
          Navega per plantes i departaments
        </p>
      </div>

      {/* Acciones del panel */}
      <div className="levels-actions" style={{ 
        display: 'flex', 
        gap: '0.5rem', 
        marginBottom: '1rem' 
      }}>
        <button
          className={`btn small ${currentIsolation.type === 'none' ? 'active' : ''}`}
          onClick={onClearIsolation}
          style={{
            padding: '0.5rem 1rem',
            borderRadius: '0.5rem',
            border: '1px solid #e1e6ef',
            background: currentIsolation.type === 'none' ? '#4179b5' : '#fff',
            color: currentIsolation.type === 'none' ? '#fff' : '#374151',
            fontSize: '0.85rem',
            fontWeight: '600',
            cursor: 'pointer',
            transition: 'all 0.2s ease'
          }}
        >
          Mostrar tot
        </button>
      </div>

      {/* Lista de plantas */}
      <div className="floors-list" style={{ 
        overflowY: 'auto', 
        flex: 1,
        paddingRight: '10px'
      }}>
        {floors.map((floor, idx) => {
          const departments = Array.from(
            new Set(
              (spacesByFloor[floor] || [])
                .map((s) => s.departament || 'Sin departamento')
            )
          ).sort();

          return (
            <div key={floor} className="floor-group" style={{ marginBottom: '0.5rem' }}>
              {/* Título de la planta */}
              <div className="floor-title" style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '0.5rem', 
                padding: '0.5rem 0',
                borderBottom: '1px solid #f1f5f9'
              }}>
                <button 
                  className="btn icon small" 
                  onClick={() => onToggleFloor(floor)} 
                  aria-label={expandedFloors[floor] ? 'Contraer' : 'Expandir'}
                  style={{
                    width: '24px',
                    height: '24px',
                    borderRadius: '4px',
                    border: '1px solid #e1e6ef',
                    background: '#fff',
                    color: '#374151',
                    fontSize: '0.9rem',
                    fontWeight: 'bold',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'all 0.2s ease'
                  }}
                >
                  {expandedFloors[floor] ? '−' : '+'}
                </button>
                <button
                  className={`btn link ${currentIsolation.type === 'floor' && currentIsolation.key === floor ? 'active' : ''}`}
                  onClick={() => onIsolateLevel(floor)}
                  style={{ 
                    fontWeight: 'bold',
                    padding: '0.25rem 0.5rem',
                    borderRadius: '0.25rem',
                    border: 'none',
                    background: currentIsolation.type === 'floor' && currentIsolation.key === floor ? '#4179b5' : 'transparent',
                    color: currentIsolation.type === 'floor' && currentIsolation.key === floor ? '#fff' : '#374151',
                    cursor: 'pointer',
                    fontSize: '0.9rem',
                    transition: 'all 0.2s ease'
                  }}
                >
                  {floor}
                </button>
              </div>

              {/* Departamentos de la planta */}
              {expandedFloors[floor] && (
                <div className="floor-spaces" style={{ 
                  marginLeft: '2rem', 
                  marginTop: '0.5rem' 
                }}>
                  {departments.map((dept) => (
                    <div
                      key={dept}
                      className="dept-item"
                      role="button"
                      tabIndex={0}
                      onClick={() => onIsolateDepartment(floor, dept)}
                      onKeyDown={(e) => handleKeyDown(e, floor, dept)}
                      style={{
                        padding: '0.5rem 0.75rem',
                        marginBottom: '0.25rem',
                        borderRadius: '0.375rem',
                        border: '1px solid #f1f5f9',
                        background: '#f8fafc',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                        fontSize: '0.85rem',
                        color: '#475569'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = '#e2e8f0';
                        e.currentTarget.style.borderColor = '#cbd5e1';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = '#f8fafc';
                        e.currentTarget.style.borderColor = '#f1f5f9';
                      }}
                    >
                      <span className="dept-name" style={{ fontWeight: '500' }}>
                        {dept}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {/* Separador entre plantas */}
              {idx < floors.length - 1 && (
                <div className="floor-separator" style={{ 
                  height: '1px', 
                  background: '#e2e8f0', 
                  margin: '0.75rem 0' 
                }} />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default LevelsPanel;

/**
 * @fileoverview Notas de implementación:
 * 
 * - Componente completamente reutilizable e independiente
 * - Estética consistente con AlertsPanel
 * - Navegación accesible por teclado y mouse
 * - Estados visuales claros para aislamiento
 * - Scroll interno para listas largas
 * - Hover effects para mejor UX
 * - Props configurables para diferentes casos de uso
 */
