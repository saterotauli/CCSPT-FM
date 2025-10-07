/**
 * @fileoverview AlertsPanel.tsx - Componente independiente para mostrar Alertes de sensores
 * 
 * Este componente proporciona una interfaz reutilizable para mostrar Alertes
 * de sensores organizadas por severidad. Es completamente independiente y
 * puede ser usado en cualquier parte de la aplicación.
 * 
 * Características:
 * - Visualización de Alertes por tipo de parámetro (temperatura, humedad, CO₂)
 * - Organización automática por severidad (alto, medio, bajo)
 * - Indicadores visuales de color por nivel de severidad
 * - Información detallada de cada alerta (edificio, planta, departamento, dispositivo)
 * - Interfaz responsive y accesible
 * 
 * @author Sistema de Gestión de Edificios CCSPT
 * @version 1.0.0
 */

import React from 'react';
import { CodeBall } from '@shared/components/common';
import { ALERT_COLORS } from '../../../../globals';
import styles from './AlertsPanel.module.css';

/**
 * Niveles de severidad para Alertes de sensores
 * @typedef {'ok' | 'baix' | 'mitjà' | 'alt'} Severity
 */
export type Severity = 'ok' | 'baix' | 'mitjà' | 'alt';

/**
 * Tipos de parámetros soportados
 * @typedef {'all' | 'temperatura' | 'humitat' | 'ppm'} ParamType
 */
export type ParamType = 'all' | 'temperatura' | 'humitat' | 'ppm';

/**
 * Elemento de alerta generado por valores de sensores fuera de Rang
 * @interface AlertItem
 */
export interface AlertItem {
  /** Identificador único de la alerta */
  id: string;
  /** Código del edificio */
  buildingCode: string;
  /** Color asociado al edificio */
  buildingColor: string;
  /** Planta donde se encuentra la alerta */
  planta: string;
  /** Departamento afectado */
  departament: string;
  /** Dispositivo sensor que generó la alerta */
  dispositiu: string;
  /** Valor medido que causó la alerta */
  value: number;
  /** Nivel de severidad de la alerta */
  severity: Severity;
  /** Porcentaje de desviación del rango óptimo (opcional) */
  deviation?: number;
  /** Tipo de parámetro de la alerta (opcional) */
  paramType?: ParamType;
}

/**
 * Tipos de filtros de parámetros incluyendo 'all' para mostrar todos
 * @typedef {'all' | 'temperatura' | 'humitat' | 'ppm'} FilterType
 */
export type FilterType = 'all' | 'temperatura' | 'humitat' | 'ppm';

/**
 * Propiedades del componente AlertsPanel
 * @interface AlertsPanelProps
 */
export interface AlertsPanelProps {
  /** Array de Alertes a mostrar */
  alerts: AlertItem[];
  /** Tipo de parámetro actual (para mostrar la unidad correcta) */
  paramType: ParamType;
  /** Callback para cambiar el parámetro activo (opcional) */
  onParamChange?: (param: ParamType) => void;
  /** Título personalizado del panel (opcional) */
  title?: string;
  /** Subtítulo o descripción del panel (opcional) */
  subtitle?: string;
  /** Clase CSS adicional para el contenedor (opcional) */
  className?: string;
  /** Estilo inline adicional para el contenedor (opcional) */
  style?: React.CSSProperties;
  /** Callback cuando se hace clic en una alerta (opcional) */
  onAlertClick?: (alert: AlertItem) => void;
  /** Mensaje a mostrar cuando no hay Alertes (opcional) */
  emptyMessage?: string;
  /** Mostrar contador de Alertes en el título (opcional, por defecto true) */
  showCount?: boolean;
  /** Mostrar código de edificio (opcional, por defecto true) */
  showBuildingCode?: boolean;
  /** Habilitar filtros de parámetros (opcional, por defecto false) */
  enableParameterFilter?: boolean;
  /** Filtro de severitat activo (opcional) */
  severityFilter?: Array<'ok'|'baix'|'mitjà'|'alt'>;
  /** Callback para cambiar el filtro de severitat (opcional) */
  onSeverityFilterChange?: (filter: Array<'ok'|'baix'|'mitjà'|'alt'>) => void;
}

/**
 * Componente independiente para mostrar Alertes de sensores
 * 
 * @component
 * @param {AlertsPanelProps} props - Propiedades del componente
 * @returns {JSX.Element} Panel de Alertes con lista organizada por severidad
 * 
 * @description
 * Proporciona una interfaz reutilizable para mostrar Alertes de sensores con:
 * - Organización automática por severidad
 * - Indicadores visuales de color
 * - Información detallada de cada alerta
 * - Interfaz responsive y accesible
 * - Soporte para interacciones personalizadas
 */
const AlertsPanel: React.FC<AlertsPanelProps> = ({
  alerts,
  paramType,
  onParamChange,
  title,
  subtitle,
  className = '',
  style,
  onAlertClick,
  emptyMessage = 'Sense Alertes.',
  showCount = true,
  showBuildingCode = true,
  enableParameterFilter: _enableParameterFilter = false,
  severityFilter,
  onSeverityFilterChange
}) => {
  /**
   * Obtiene el título del parámetro para mostrar en la interfaz
   * 
   * @param {ParamType} param - Tipo de parámetro
   * @returns {string} Título legible del parámetro
   */
  const getParamTitle = (param: ParamType): string => {
    switch (param) {
      case 'temperatura': return 'Temperatura';
      case 'humitat': return 'Humedad';
      case 'ppm': return 'CO₂';
      default: return 'Parámetro';
    }
  };

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
   * Formatea un valor numérico con su unidad correspondiente
   * 
   * @param {number} value - Valor a formatear
   * @param {ParamType} param - Tipo de parámetro
   * @returns {string} Valor formateado con unidad
   */
  const formatValue = (value: number, param: ParamType): string => {
    if (param === 'ppm') {
      return `${Math.round(value)}${getParamUnit(param)}`;
    }
    return `${value.toFixed(1)}${getParamUnit(param)}`;
  };

  /**
   * Obtiene el icono correspondiente al tipo de parámetro
   * 
   * @param {ParamType | FilterType} param - Tipo de parámetro
   * @returns {string} Emoji del icono
   */
  const getParamIcon = (param: ParamType | FilterType): string => {
    switch (param) {
      case 'temperatura': return '🌡️';
      case 'humitat': return '💧';
      case 'ppm': return '⚗️';
      case 'all': return '📊';
      default: return '📊';
    }
  };

  // Filtrar por parámetro seleccionado en el header (mostrar todos si es 'all')
  const filteredAlerts = React.useMemo(() => {
    if (paramType === 'all') return alerts;
    return alerts.filter(a => (a.paramType || paramType) === paramType);
  }, [alerts, paramType]);


  /**
   * Maneja el clic en una alerta individual
   * 
   * @param {AlertItem} alert - Alerta que fue clickeada
   */
  const handleAlertClick = (alert: AlertItem) => {
    console.log('Alert clicked:', alert);
    if (onAlertClick) {
      onAlertClick(alert);
    }
  };

  /**
   * Renderiza una alerta individual
   * 
   * @param {AlertItem} alert - Alerta a renderizar
   * @returns {JSX.Element} Elemento de alerta
   */
  const renderAlert = (alert: AlertItem): JSX.Element => {
    const alertElement = (
      <div 
        className={`${styles.alertItem} ${styles['sev' + alert.severity]} ${styles.clickable}`}
        onClick={() => handleAlertClick(alert)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            handleAlertClick(alert);
          }
        }}
      >
        <div className={styles.left}>
          {showBuildingCode && (
            <CodeBall code={alert.buildingCode} color={alert.buildingColor} title={`Edificio ${alert.buildingCode}`} />
          )}
          <div className={styles.alertItemDetails}>
            <div className={styles.detailRow}>
              <span className={styles.dispositiu} title="Dispositivo">{alert.dispositiu}</span>
            </div>
            <div className={styles.detailRow}>
              <span className={`${styles.badge} ${styles.badgePlanta}`} title="Planta">{alert.planta}</span>
              <span className={`${styles.badge} ${styles.badgeDepartament}`} title="Departament">{alert.departament}</span>
            </div>
          </div>
        </div>
        <div className={styles.right}>
          <div className={styles.valueContainer}>
            <span
              className={`${styles.val} ${styles['val' + alert.severity]}`}
              title={`Valor: ${formatValue(alert.value, alert.paramType || paramType)}`}
            >
              {formatValue(alert.value, alert.paramType || paramType)}
            </span>
            {alert.deviation !== undefined && (
              <div className={styles.deviationValue}>
                {(() => {
                  // Calcular el centro del rango óptimo según el tipo de parámetro
                  const alertParamType = alert.paramType || paramType;
                  if (alertParamType === 'all') return '';
                  
                  const thresholds: Record<'temperatura' | 'humitat' | 'ppm', { min: number; max: number }> = {
                    temperatura: { min: 19, max: 25 },
                    humitat: { min: 40, max: 60 },
                    ppm: { min: 0, max: 600 }
                  };
                  const center = (thresholds[alertParamType as keyof typeof thresholds].max + thresholds[alertParamType as keyof typeof thresholds].min) / 2;
                  const sign = alert.value > center ? '+' : '-';
                  const deviationValue = Math.abs(alert.value - center);
                  return `${sign}${deviationValue.toFixed(1)}`;
                })()}
              </div>
            )}
          </div>
          {/* Parameter icon */}
          <div style={{
            width: '48px',
            height: '48px',
            borderRadius: '50%',
            background: '#f8fafc',
            border: '1px solid #e6ecf5',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '24px',
            marginLeft: '8px'
          }}>
            {getParamIcon(alert.paramType || paramType)}
          </div>
        </div>
      </div>
    );

    return alertElement;
  };

  // Título del panel con contador opcional
  const panelTitle = title || `Alertes (${getParamTitle(paramType)})`;
  const titleWithCount = showCount ? `${panelTitle} (${filteredAlerts.length})` : panelTitle;

  // Establecer variables CSS para los colores de alerta
  const alertPanelStyle = {
    ...style,
    '--alert-alt-color': ALERT_COLORS.ALT,
    '--alert-mitja-color': ALERT_COLORS.MITJA,
    '--alert-baix-color': ALERT_COLORS.BAIX,
    '--alert-alt-bg': ALERT_COLORS.ALT_BG,
    '--alert-mitja-bg': ALERT_COLORS.MITJA_BG,
    '--alert-baix-bg': ALERT_COLORS.BAIX_BG,
    '--alert-alt-text': ALERT_COLORS.ALT_TEXT,
    '--alert-mitja-text': ALERT_COLORS.MITJA_TEXT,
    '--alert-baix-text': ALERT_COLORS.BAIX_TEXT,
  } as React.CSSProperties;

  return (
    <aside 
      className={`${styles.alertsPanel} ${className}`} 
      style={alertPanelStyle}
    >
      <div className={styles.alertsTitle}>{titleWithCount}</div>
      {subtitle && <div className={styles.alertsSub}>{subtitle}</div>}
      
      {/* Parameter selector icons */}
      {onParamChange && (
        <div className={styles.paramSelector}>
          <div 
            onClick={() => onParamChange('all' as ParamType)}
            className={`${styles.paramIcon} ${paramType === 'all' ? styles.paramIconActive : ''}`}
            title="Tots els paràmetres"
          >
            📊
          </div>
          <div 
            onClick={() => onParamChange('temperatura')}
            className={`${styles.paramIcon} ${paramType === 'temperatura' ? styles.paramIconActive : ''}`}
            title="Temperatura"
          >
            🌡️
          </div>
          <div 
            onClick={() => onParamChange('humitat')}
            className={`${styles.paramIcon} ${paramType === 'humitat' ? styles.paramIconActive : ''}`}
            title="Humitat"
          >
            💧
          </div>
          <div 
            onClick={() => onParamChange('ppm')}
            className={`${styles.paramIcon} ${paramType === 'ppm' ? styles.paramIconActive : ''}`}
            title="CO₂"
          >
            ⚗️
          </div>
        </div>
      )}
      {/* Severity filter directly under parameter icons (if provided) */}
      {onSeverityFilterChange && (
        <div style={{ display: 'flex', gap: 8, padding: '8px 0 12px 0', alignItems: 'center' }}>
          <span style={{ fontSize: 12, color: '#6b7280', marginRight: 6 }}>Severitat:</span>
          {([
            { key: 'alt',   color: ALERT_COLORS.ALT,   bg: ALERT_COLORS.ALT_BG,   label: 'Alt' },
            { key: 'mitjà', color: ALERT_COLORS.MITJA, bg: ALERT_COLORS.MITJA_BG, label: 'Mitjà' },
            { key: 'baix',  color: ALERT_COLORS.BAIX,  bg: ALERT_COLORS.BAIX_BG,  label: 'Baix' },
            { key: 'ok',    color: ALERT_COLORS.OK,    bg: ALERT_COLORS.OK_BG,    label: 'OK' },
          ] as const).map((s) => {
            const active = (severityFilter || []).includes(s.key);
            return (
              <button
                key={s.key}
                onClick={() => onSeverityFilterChange(
                  active ? (severityFilter || []).filter(v => v !== s.key) : [ ...(severityFilter || []), s.key ]
                )}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 8,
                  borderRadius: 999,
                  border: active ? `1px solid ${s.color}` : '1px solid #d1d5db',
                  padding: '6px 10px',
                  background: active ? s.bg : '#f3f4f6',
                  color: active ? (s.key==='alt'?ALERT_COLORS.ALT_TEXT:s.key==='mitjà'?ALERT_COLORS.MITJA_TEXT:ALERT_COLORS.BAIX_TEXT) : '#9ca3af',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
                title={s.label}
              >
                <span style={{ fontSize: 12 }}>{s.label}</span>
              </button>
            );
          })}
        </div>
      )}
      
      <div className={styles.alertsList} style={{ flex: 1, overflowY: 'auto' }}>
        {filteredAlerts.length === 0 ? (
          <div className={styles.empty}>{emptyMessage}</div>
        ) : (
          filteredAlerts.map((alert, index) => (
            <div key={(alert.id ? `${alert.id}` : `alert-${index}`)}>
              {renderAlert(alert)}
            </div>
          ))
        )}
      </div>
    </aside>
  );
};

export default AlertsPanel;

/**
 * @fileoverview Notas de implementación:
 * 
 * - Componente completamente reutilizable e independiente
 * - Soporte para diferentes tipos de parámetros (temp, hum, ppm)
 * - Organización automática por severidad
 * - Interfaz accesible con roles ARIA y navegación por teclado
 * - Formateo automático de valores según el tipo de parámetro
 * - Soporte para callbacks de interacción personalizados
 * - Estilos CSS compatibles con el sistema de diseño existente
 */
