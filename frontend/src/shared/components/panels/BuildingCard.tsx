/**
 * @fileoverview BuildingCard.tsx - Componente de card individual para edificios
 * 
 * Este componente encapsula la presentación y funcionalidad de una card
 * de edificio individual, incluyendo estadísticas, Alertes y navegación.
 * 
 * Características:
 * - Visualización de estadísticas del edificio
 * - Indicadores de severidad con colores
 * - Navegación al hacer clic
 * - Formato responsive y accesible
 * - Soporte para diferentes tipos de parámetros
 * 
 * @author Sistema de Gestión de Edificios CCSPT
 * @version 1.0.0
 */

import React from 'react';
import { type Severity, type ParamType } from './AlertsPanel';

/**
 * Estadísticas de un edificio
 * @interface BuildingStat
 */
export interface BuildingStat {
  /** Código del edificio */
  code: string;
  /** Etiqueta/nombre del edificio */
  label: string;
  /** Color asociado al edificio */
  color: string;
  /** Valor Mitjana del parámetro */
  avg: number;
  /** Valor mínimo registrado */
  min: number;
  /** Valor máximo registrado */
  max: number;
  /** Número de zonas con valores incorrectos */
  incorrectZones: number;
  /** Última actualización (HH:mm:ss) */
  lastUpdate: string;
  /** Nivel de severidad general */
  severity: Severity;
}

/**
 * Propiedades del componente BuildingCard
 * @interface BuildingCardProps
 */
export interface BuildingCardProps {
  /** Estadísticas del edificio a mostrar */
  buildingStat: BuildingStat;
  /** Tipo de parámetro actual (para mostrar la unidad correcta) */
  paramType: ParamType;
  /** Callback cuando se hace clic en la card */
  onClick?: (buildingCode: string) => void;
  /** Clase CSS adicional (opcional) */
  className?: string;
  /** Estilo inline adicional (opcional) */
  style?: React.CSSProperties;
  /** Si la card es clickeable (por defecto true) */
  clickable?: boolean;
}

/**
 * Componente de card individual para edificios
 * 
 * @component
 * @param {BuildingCardProps} props - Propiedades del componente
 * @returns {JSX.Element} Card de edificio con estadísticas y navegación
 * 
 * @description
 * Proporciona una card individual para mostrar estadísticas de un edificio:
 * - Información básica (código, nombre, color)
 * - Métricas principales (Mitjana, Rang, zonas Incorrectes)
 * - Indicador de severidad
 * - Timestamp de última actualización
 * - Navegación al hacer clic
 */
const BuildingCard: React.FC<BuildingCardProps> = ({
  buildingStat,
  paramType,
  onClick,
  className = '',
  style,
  clickable = true
}) => {
  /**
   * Obtiene la unidad correspondiente al tipo de parámetro
   * 
   * @param {ParamType} param - Tipo de parámetro
   * @returns {string} Unidad de medida
   */
  const getParamUnit = (param: ParamType): string => {
    switch (param) {
      case 'temperatura': return '°C';
      case 'humitat': return '%';
      case 'ppm': return 'ppm';
      default: return '';
    }
  };

  /**
   * Maneja el clic en la card
   */
  const handleClick = () => {
    if (clickable && onClick) {
      onClick(buildingStat.code);
    }
  };

  /**
   * Maneja la navegación por teclado
   * 
   * @param {React.KeyboardEvent} e - Evento de teclado
   */
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (clickable && (e.key === 'Enter' || e.key === ' ')) {
      e.preventDefault();
      handleClick();
    }
  };

  const unit = getParamUnit(paramType);

  return (
    <div
      className={`building-card sev-${buildingStat.severity} ${className}`}
      onClick={handleClick}
      role={clickable ? 'button' : undefined}
      tabIndex={clickable ? 0 : undefined}
      onKeyDown={handleKeyDown}
      style={{
        cursor: clickable ? 'pointer' : 'default',
        border: `2px solid ${buildingStat.color}`,
        backgroundColor: `${buildingStat.color}10`, // 40% de opacidad
        ...style
      }}
      title={clickable ? `Hacer clic para ver detalles de ${buildingStat.label}` : undefined}
    >
      {/* Header de la card con código y nombre */}
      <div className="card-header">
        <div 
          className="codeball" 
          style={{ background: buildingStat.color }}
          title={`Edificio ${buildingStat.code}`}
        >
          <span>{buildingStat.code}</span>
        </div>
        <h3 className="card-title" title={buildingStat.label}>
          {buildingStat.label}
        </h3>
      </div>
      
      {/* Métricas principales */}
      <div className="metrics">
        <div className="metric-box">
          <div className="mtitle">Mitjana</div>
          <div className="mval" title={`Mitjana: ${buildingStat.avg.toFixed(1)}${unit}`}>
            {buildingStat.avg.toFixed(1)}{unit}
          </div>
        </div>
        <div className="metric-box">
          <div className="mtitle">Rang</div>
          <div className="mval" title={`Rang: ${buildingStat.min.toFixed(1)} - ${buildingStat.max.toFixed(1)}${unit}`}>
            {buildingStat.min.toFixed(1)} - {buildingStat.max.toFixed(1)}{unit}
          </div>
        </div>
        <div className="metric-box">
          <div className="mtitle">Incorrectes</div>
          <div className="mval" title={`Zonas con valores incorrectos: ${buildingStat.incorrectZones}`}>
            {buildingStat.incorrectZones}
          </div>
        </div>
      </div>
      
      {/* Footer con timestamp y badge de severidad */}
      <div className="card-footer">
        <span title={`Última actualización: ${buildingStat.lastUpdate}`}>
          {buildingStat.lastUpdate}
        </span>
        <span 
          className={`badge badge-${buildingStat.severity}`}
          title={`Nivel de severidad: ${buildingStat.severity.toUpperCase()}`}
        >
          {buildingStat.severity.toUpperCase()}
        </span>
      </div>
    </div>
  );
};

export default BuildingCard;

/**
 * @fileoverview Notas de implementación:
 * 
 * - Componente completamente reutilizable e independiente
 * - Soporte para diferentes tipos de parámetros (temp, hum, ppm)
 * - Navegación accesible por teclado y mouse
 * - Tooltips informativos para mejor UX
 * - Indicadores visuales de severidad con colores
 * - Formato responsive compatible con el sistema de diseño
 * - Props configurables para diferentes casos de uso
 */
