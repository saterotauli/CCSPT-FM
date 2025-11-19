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
import { CodeBall } from '@shared/components/common';
import { type Severity, type ParamType } from '../AlertsPanel/AlertsPanel';
import { ALERT_COLORS } from '../../../../globals';
import styles from './BuildingCard.module.css';

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
  /** Número de alertas de nivel mitjà (opcional) */
  alertsMitja?: number;
  /** Número de alertas de nivel alt (opcional) */
  alertsAlt?: number;
  /** Número de alertas de nivel baix (opcional) */
  alertsBaix?: number;
  /** Consumo actual en kW (opcional) */
  consumption?: number;
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
  paramType: _paramType,
  onClick,
  className = '',
  style,
  clickable = true
}) => {
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

  return (
    <div
      className={`${styles.buildingCard} ${className}`}
      onClick={handleClick}
      role={clickable ? 'button' : undefined}
      tabIndex={clickable ? 0 : undefined}
      onKeyDown={handleKeyDown}
      style={style}
      title={clickable ? `Hacer clic para ver detalles de ${buildingStat.label}` : undefined}
    >
      {/* Header de la card con código y nombre */}
      <div className={styles.cardHeader}>
        <CodeBall code={buildingStat.code} color={buildingStat.color} size={38} title={`Edificio ${buildingStat.code}`} />
        <h3 className={styles.cardTitle} title={buildingStat.label}>
          {buildingStat.label}
        </h3>
      </div>
      
      {/* Estadísticas de alertas con puntitos */}
      <div className={styles.stats}>
        {(buildingStat.alertsAlt || 0) > 0 && (
          <div className={styles.alertStat} title="Alertas de nivel alto">
            <div className={styles.alertDot} style={{ background: ALERT_COLORS.ALT }}></div>
            <span className={styles.alertCount}>{buildingStat.alertsAlt}</span>
          </div>
        )}
        {(buildingStat.alertsMitja || 0) > 0 && (
          <div className={styles.alertStat} title="Alertas de nivel medio">
            <div className={styles.alertDot} style={{ background: ALERT_COLORS.MITJA }}></div>
            <span className={styles.alertCount}>{buildingStat.alertsMitja}</span>
          </div>
        )}
        {(buildingStat.alertsBaix || 0) > 0 && (
          <div className={styles.alertStat} title="Alertas de nivel bajo">
            <div className={styles.alertDot} style={{ background: ALERT_COLORS.BAIX }}></div>
            <span className={styles.alertCount}>{buildingStat.alertsBaix}</span>
          </div>
        )}
        {(buildingStat.alertsAlt || 0) === 0 && (buildingStat.alertsMitja || 0) === 0 && (buildingStat.alertsBaix || 0) === 0 && (
          <div className={styles.alertStat} title="Sin alertas activas">
            <div className={styles.alertDot} style={{ background: '#10b981' }}></div>
            <span className={styles.alertCount} style={{ color: '#10b981' }}>OK</span>
          </div>
        )}
      </div>
      
      {/* Consumo actual */}
      <div className={styles.consumption}>
        <span className={styles.consumptionIcon}>⚡</span>
        <span className={styles.consumptionValue}>{(buildingStat.consumption || 0).toFixed(1)} kW</span>
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
