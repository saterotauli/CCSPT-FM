/**
 * @fileoverview ControlGeneral.tsx - Página de control general con resumen de todos los edificios
 * 
 * Este componente proporciona una vista general del estado de todos los edificios
 * del sistema, mostrando estadísticas, Alertes y permitiendo navegar a edificios
 * específicos haciendo clic en las cards.
 * 
 * Características:
 * - Resumen estadístico de todos los edificios
 * - Alertes consolidadas por severidad
 * - Navegación a edificios específicos
 * - Control de parámetros (temperatura, humedad, CO₂)
 * - Actualización en tiempo real de datos de sensores
 * 
 * @author Sistema de Gestión de Edificios CCSPT
 * @version 1.0.0
 */

import React from 'react';
import { useNavigate } from 'react-router-dom';
import '@styles/Pages.css';
import { useRealTimeSensors } from '../../../hooks/useRealTimeSensors';
import { AlertsPanel, BuildingCard, AlarmDetailsPanel } from '@shared/components/panels';
import type { AlertItem, Severity, ParamType, BuildingStat } from '@shared/components/panels';
import { ALERT_COLORS, modelStore } from '../../../globals';

/**
 * Información básica de un edificio desde la base de datos
 * @interface BuildingRow
 */
interface BuildingRow {
  /** GUID único del edificio */
  guid?: string;
  /** Nombre del edificio */
  nom?: string;
  /** Código del edificio */
  codi?: string;
  /** Color asociado al edificio */
  color?: string;
}

// La interfaz BuildingStat ahora se importa desde el componente BuildingCard

/**
 * Interfaz para eventos históricos del sistema
 */
interface HistoricalEvent {
  id: string;
  timestamp: Date;
  type: 'alert_start' | 'alert_resolved';
  severity: Severity;
  buildingCode: string;
  buildingColor: string;
  planta: string;
  departament: string;
  dispositiu: string;
  spaceGuid?: string;
  value: number;
  paramType: ParamType;
  message: string;
  status: StatusType;
}

type StatusType = 'Obert' | 'Assignat' | 'Pendent' | 'Completat' | 'Tancat' | 'Cancel·lat';

/**
 * Componente principal de control general
 * 
 * @component
 * @returns {JSX.Element} Interfaz de control general con resumen de edificios
 * 
 * @description
 * Proporciona una vista consolidada del estado de todos los edificios:
 * - Estadísticas generales por edificio
 * - Alertes consolidadas
 * - Navegación a vistas específicas
 * - Control de parámetros de monitoreo
 */
const ControlGeneral: React.FC = () => {
  const navigate = useNavigate();
  const [param, setParam] = React.useState<ParamType>('all');
  const [buildings, setBuildings] = React.useState<BuildingRow[]>([]);
  const [buildingStats, setBuildingStats] = React.useState<(BuildingStat & { alerts?: AlertItem[] })[]>([]);
  const [allAlerts, setAllAlerts] = React.useState<AlertItem[]>([]);
  const [currentView, setCurrentView] = React.useState<'resum' | 'historial'>('resum');
  const [buildingFilter, setBuildingFilter] = React.useState<'tots' | 'amb-alertes'>('tots');
  const [selectedEvent, setSelectedEvent] = React.useState<HistoricalEvent | null>(null);
  const [historicalEvents, setHistoricalEvents] = React.useState<HistoricalEvent[]>([]);
  const [showAlarmPanel, setShowAlarmPanel] = React.useState(false);
  const [alarmTab, setAlarmTab] = React.useState<'info' | 'historic' | 'sistemes'>('info');
  // Filters for historial
  const [selectedBuildings, setSelectedBuildings] = React.useState<string[]>([]);
  const [selectedSeverities, setSelectedSeverities] = React.useState<Severity[]>(['ok','mitjà','alt']);
  const [selectedStatuses, setSelectedStatuses] = React.useState<StatusType[]>(['Obert','Assignat','Pendent','Completat','Tancat','Cancel·lat']);
  const [buildingsDropdownOpen, setBuildingsDropdownOpen] = React.useState(false);
  const [buildingsFilterActive, setBuildingsFilterActive] = React.useState(false);
  const [severityDropdownOpen, setSeverityDropdownOpen] = React.useState(false);
  const [statusDropdownOpen, setStatusDropdownOpen] = React.useState(false);
  const [sortBy, setSortBy] = React.useState<'date'|'param'|'building'|'planta'|'departament'|'zone'|'value'|'severity'|'status'>('severity');
  const [sortDir, setSortDir] = React.useState<'asc'|'desc'>('desc');
  // Responsive: detect mobile to adjust sticky offset
  const [isMobile, setIsMobile] = React.useState<boolean>(() => {
    try { return window.innerWidth <= 768; } catch { return false; }
  });
  React.useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);
  // Columns: Data | Edifici | Planta | Departament | Zona (dispositiu) | Par | Valor | Nivell | Estat
  const tableGrid = '140px 120px 90px 220px 1fr 36px 160px 110px 140px';
  // Función para obtener estilos de estado (usada en el renderizado)
  const getStatusView = (status: StatusType) => {
    const label = status === 'Obert' ? 'Alerta' : status;
    const styles: Record<string, {bg: string; color: string; border: string}> = {
      'Alerta': { bg: '#fee2e2', color: '#b91c1c', border: '#fca5a5' },
      'Assignat': { bg: '#dbeafe', color: '#1d4ed8', border: '#93c5fd' },
      'Pendent': { bg: '#fef3c7', color: '#b45309', border: '#fde68a' },
      'Completat': { bg: '#dcfce7', color: '#166534', border: '#86efac' },
      'Tancat': { bg: '#dcfce7', color: '#166534', border: '#86efac' },
      'Cancel·lat': { bg: '#e5e7eb', color: '#374151', border: '#d1d5db' }
    };
    return { label, style: styles[label] || styles['Cancel·lat'] };
  };

  // Usar datos reales de sensores para todos los edificios - OPTIMIZADO
  const { data: sensorData } = useRealTimeSensors({
    edifici: '', // Vacío para obtener todos los edificios
    interval: 60000, // Aumentado de 20s a 60s para reducir carga
    autoStart: true
  });

  // Referencia persistente para el alertKey anterior
  const prevAlertKeyRef = React.useRef<string>('');
  
  // Generate and persist historical events for the session; merge to preserve edited statuses
  // OPTIMIZACIÓN: Solo regenerar eventos cuando realmente cambien las alertas significativamente
  React.useEffect(() => {
    // Solo regenerar si hay cambios significativos en las alertas
    const alertKey = allAlerts.map(a => `${a.id}-${a.severity}`).sort().join('|');
    
    if (alertKey !== prevAlertKeyRef.current) {
      prevAlertKeyRef.current = alertKey;
      
      const newGenerated = generateHistoricalEvents();
      setHistoricalEvents(prev => {
        const prevMap = new Map(prev.map(e => [e.id, e]));
        const merged = newGenerated.map(e => prevMap.get(e.id) ? { ...e, status: prevMap.get(e.id)!.status } : e);
        // Keep also any prev events that no longer appear (persist during session)
        const prevOnly = prev.filter(e => !merged.find(m => m.id === e.id));
        const all = [...merged, ...prevOnly];
        // Sort by timestamp desc initially
        return all.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
      });
    }
  }, [allAlerts]);

  /**
   * Calcula el nivel de severidad basado en el tipo de parámetro y su valor
   * 
   * @param {ParamType} p - Tipo de parámetro (temperatura, humedad o CO₂)
   * @param {number} value - Valor medido del parámetro
   * @returns {Severity} Nivel de severidad calculado
   */
  const computeSeverity = (p: ParamType, value: number): Severity => {
    const thresholds = {
      temperatura: { min: 19, max: 25 },
      humitat: { min: 40, max: 60 },
      ppm: { min: 0, max: 600 }
    };

    if (p === 'all') return 'ok'; // No severity calculation for 'all' parameter
    
    const currentThreshold = thresholds[p as keyof typeof thresholds];
    
    // Si el valor está dentro del rango óptimo, no hay alerta
    if (value >= currentThreshold.min && value <= currentThreshold.max) {
      return 'ok';
    }
    
    // Si está fuera del rango, calcular la severidad según qué tan lejos esté
    const range = currentThreshold.max - currentThreshold.min;
    let deviationPercent: number;
    
    if (value < currentThreshold.min) {
      // Valor por debajo del mínimo
      deviationPercent = (currentThreshold.min - value) / range;
    } else {
      // Valor por encima del máximo
      deviationPercent = (value - currentThreshold.max) / range;
    }
    
    if (deviationPercent > 1.00) return 'alt';    // >100% fuera del rango: Alta severidad
    if (deviationPercent > 0.60) return 'mitjà';  // 60-100% fuera del rango: Media severidad
    if (deviationPercent > 0.25) return 'baix';   // 25-60% fuera del rango: Baja severidad
    return 'ok';                                   // <25% fuera del rango: Normal (no se mostrará como alerta)
  };

  /**
   * Genera Alertes basadas en datos reales de sensores
   * 
   * @param {any[]} sensorData - Datos de sensores en tiempo real
   * @param {ParamType} param - Tipo de parámetro a evaluar
   * @returns {AlertItem[]} Array de Alertes ordenadas por severidad
   */
  const generateAlertsFromSensorData = (sensorData: any[], param: ParamType): AlertItem[] => {
    const alerts: AlertItem[] = [];
    
    // Definir umbrales óptimos para cálculo de desviación
    const thresholds = {
      temperatura: { min: 19, max: 25 }, // Rango óptimo
      humitat: { min: 40, max: 60 }, // Rango óptimo
      ppm: { min: 0, max: 600 } // Rango óptimo
    };
    
    sensorData.forEach((room: any) => {
      const value = param === 'temperatura' ? room.temperature : param === 'humitat' ? room.humidity : room.ppm;
      const severity = computeSeverity(param, value);
      
      /*// Debug: mostrar valores y severidad para ppm
      if (param === 'ppm' && value != null) {
        console.log(`CO₂ Alert Check - ${room.dispositiu}: ${value}ppm -> ${severity}`);
      }*/
      
      // Incluir todas las alertas con cualquier nivel de severidad (incluye 'ok' = Baix)
      if (value !== null) {
        // Para 'ok' (Baix), solo incluir si hay desviación real del centro óptimo
        if (severity === 'ok') {
          if (param === 'all') return alerts;
          const currentThreshold = thresholds[param as keyof typeof thresholds];
          const center = (currentThreshold.max + currentThreshold.min) / 2;
          // Solo incluir si hay desviación del centro (aunque esté en rango)
          if (Math.abs(value - center) < 0.1) return; // Muy cerca del centro, no mostrar
        }
        // Calcular desviación del rango óptimo (porcentaje)
        if (param === 'all') return alerts; // Skip deviation calculation for 'all' parameter
        
        const currentThreshold = thresholds[param as keyof typeof thresholds];
        const range = currentThreshold.max - currentThreshold.min;
        const center = (currentThreshold.max + currentThreshold.min) / 2;
        const deviation = Math.abs(value - center) / range;
        
        alerts.push({
          id: `${room.spaceGuid}-${param}`,
          buildingCode: room.edifici || 'UNK',
          buildingColor: getBuildingColor(room.edifici),
          planta: room.planta || 'P00',
          departament: room.departament || '—',
          dispositiu: room.dispositiu || '—',
          value,
          severity,
          deviation: deviation,
          paramType: param
        });
      }
    });
    
    // De-duplicate by id: keep highest severity and, if equal, highest deviation
    const rank: Record<'mitjà' | 'alt' | 'ok', number> = { ok: 0, mitjà: 1, alt: 2 };
    const map = new Map<string, AlertItem>();
    for (const a of alerts) {
      const prev = map.get(a.id);
      if (!prev) { map.set(a.id, a); continue; }
      const pr = rank[prev.severity];
      const cr = rank[a.severity];
      if (cr > pr || (cr === pr && (a.deviation ?? 0) > (prev.deviation ?? 0))) {
        map.set(a.id, a);
      }
    }
    const deduped = Array.from(map.values());

    // Debug: mostrar resumen de Alertes generadas
    /*if (param === 'ppm') {
      console.log(`Alertes CO₂ generadas: ${alerts.length} de ${sensorData.length} sensores`);
    }*/
    
    // Devolver la lista deduplicada
    return deduped;
  };

  /**
   * Obtiene el color de un edificio por su código
   * 
   * @param {string} buildingCode - Código del edificio
   * @returns {string} Color en formato hexadecimal
   */
  const getBuildingColor = (buildingCode: string): string => {
    const building = buildings.find(b => (b.codi || b.nom) === buildingCode);
    return building?.color || '#9aa0a6';
  };

  /**
   * Calcula estadísticas de un edificio basándose en datos de sensores
   * 
   * @param {string} buildingCode - Código del edificio
   * @param {any[]} buildingSensorData - Datos de sensores del edificio
   * @param {ParamType} param - Tipo de parámetro
   * @returns {BuildingStat & { alerts?: AlertItem[] }} Estadísticas del edificio con Alertes
   */
  const calculateBuildingStats = (buildingCode: string, buildingSensorData: any[], param: ParamType): BuildingStat & { alerts?: AlertItem[] } => {
    const building = buildings.find(b => (b.codi || b.nom) === buildingCode);
    
    if (!building) {
      throw new Error(`Edificio "${buildingCode}" no encontrado en la base de datos`);
    }
    
    const code = buildingCode;
    const label = building.nom || building.codi || buildingCode;
    const color = building.color || '#9aa0a6';

    if (buildingSensorData.length === 0) {
      return {
        code,
        label,
        color,
        avg: 0,
        min: 0,
        max: 0,
        incorrectZones: 0,
        lastUpdate: new Date().toLocaleTimeString('es-ES', { hour12: false }),
        severity: 'ok',
        alerts: [],
        alertsMitja: 0,
        alertsAlt: 0,
        consumption: Math.random() * 150 + 50
      };
    }

    const values = buildingSensorData.map((room: any) => param === 'temperatura' ? room.temperature : param === 'humitat' ? room.humidity : room.ppm).filter((v: any) => v != null && !isNaN(v));

    if (values.length === 0) {
      return {
        code,
        label,
        color,
        avg: 0,
        min: 0,
        max: 0,
        incorrectZones: 0,
        lastUpdate: new Date().toLocaleTimeString('es-ES', { hour12: false }),
        severity: 'ok',
        alerts: [],
        alertsMitja: 0,
        alertsAlt: 0,
        consumption: Math.random() * 150 + 50
      };
    }

    const avg = values.reduce((sum, val) => sum + val, 0) / values.length;
    const min = Math.min(...values);
    const max = Math.max(...values);
    
    // Calcular zonas Incorrectes
    const incorrectZones = values.filter(val => computeSeverity(param, val) !== 'ok').length;
    
    // Generar Alertes para TODOS los parámetros (no solo el actual)
    const allParamAlerts: AlertItem[] = [];
    const paramTypes: ParamType[] = ['temperatura', 'humitat', 'ppm'];
    paramTypes.forEach(paramType => {
      const paramAlerts = generateAlertsFromSensorData(buildingSensorData, paramType);
      allParamAlerts.push(...paramAlerts);
    });
    
    // Las alertas del parámetro actual para la card (usar todas las alertas, no solo el parámetro actual)
    const buildingAlerts = allParamAlerts;
    
    // Determinar severidad general basada en alertas (se recalculará después de la deduplicación)
    let severity: Severity = 'ok';

    return {
      code,
      label,
      color,
      avg: Math.round(avg * 10) / 10,
      min: Math.round(min * 10) / 10,
      max: Math.round(max * 10) / 10,
      incorrectZones,
      lastUpdate: new Date().toLocaleTimeString('es-ES', { hour12: false }),
      severity,
      alerts: buildingAlerts,
      alertsMitja: 0, // Se calculará después de la deduplicación
      alertsAlt: 0,   // Se calculará después de la deduplicación
      alertsBaix: 0,  // Se calculará después de la deduplicación
      consumption: Math.random() * 150 + 50 // Valor inventado entre 50-200 kW
    };
  };

  /**
   * Carga la lista de edificios desde la API
   */
  const loadBuildings = React.useCallback(async () => {
    try {
      const res = await fetch('/api/ifcbuildings', { headers: { Accept: 'application/json' } });
      const rows: BuildingRow[] = res.ok ? await res.json() : [];
      setBuildings(rows);
    } catch {
      setBuildings([]);
    }
  }, []);

  // Cargar edificios al montar el componente
  React.useEffect(() => {
    loadBuildings();
  }, [loadBuildings]);

  // Calcular estadísticas y alertas cuando cambien los datos de sensores
  React.useEffect(() => {
    if (sensorData && buildings.length > 0) {
      // 1. Agrupar sensores por edificio
      const sensorDataByBuilding: Record<string, any[]> = {};
      sensorData.forEach((room: any) => {
        if (room.edifici) {
          if (!sensorDataByBuilding[room.edifici]) {
            sensorDataByBuilding[room.edifici] = [];
          }
          sensorDataByBuilding[room.edifici].push(room);
        }
      });

      // 2. Calcular estadísticas y generar alertas para cada edificio
      const statsList: (BuildingStat & { alerts?: AlertItem[] })[] = [];
      let combinedAlerts: AlertItem[] = [];

      buildings.forEach(building => {
        const buildingCode = building.codi || building.nom || '';
        const buildingSensorData = sensorDataByBuilding[buildingCode] || [];
        const stat = calculateBuildingStats(buildingCode, buildingSensorData, param);
        statsList.push(stat);
        if (stat.alerts) {
          combinedAlerts.push(...stat.alerts);
        }
      });

      // 3. Deduplicación final de todas las alertas generadas
      const finalAlertsMap = new Map<string, AlertItem>();
      const rank: Record<Severity, number> = { ok: 0, baix: 1, mitjà: 2, alt: 3 };

      for (const alert of combinedAlerts) {
        const existing = finalAlertsMap.get(alert.id);
        if (!existing) {
          finalAlertsMap.set(alert.id, alert);
        } else {
          const existingRank = rank[existing.severity];
          const currentRank = rank[alert.severity];
          if (currentRank > existingRank) {
            finalAlertsMap.set(alert.id, alert);
          } else if (currentRank === existingRank && (alert.deviation ?? 0) > (existing.deviation ?? 0)) {
            finalAlertsMap.set(alert.id, alert);
          }
        }
      }

      const uniqueAlerts = Array.from(finalAlertsMap.values());

      // 4. Ordenar la lista final de alertas
      uniqueAlerts.sort((a, b) => {
        const severityDiff = rank[b.severity] - rank[a.severity];
        if (severityDiff !== 0) return severityDiff;
        return (b.deviation ?? 0) - (a.deviation ?? 0);
      });

      // 5. Recalcular estadísticas de edificios con alertas deduplicadas
      const updatedStatsList = statsList.map(stat => {
        const buildingAlerts = uniqueAlerts.filter(alert => alert.buildingCode === stat.code);
        const alertsMitja = buildingAlerts.filter(a => a.severity === 'mitjà').length;
        const alertsAlt = buildingAlerts.filter(a => a.severity === 'alt').length;
        const alertsBaix = buildingAlerts.filter(a => a.severity === 'baix').length;
        
        return {
          ...stat,
          alerts: buildingAlerts,
          alertsMitja,
          alertsAlt,
          alertsBaix
        };
      });

      setBuildingStats(updatedStatsList);
      setAllAlerts(uniqueAlerts);
      
      // Almacenar datos en el store global para consistencia
      modelStore.setSensorData(sensorData);
      modelStore.setAllAlerts(uniqueAlerts);
    }
  }, [sensorData, buildings]);

  /**
   * Maneja el clic en una card de edificio para navegar a su vista específica
   * 
   * @param {string} buildingCode - Código del edificio
   */
  const handleBuildingClick = (buildingCode: string) => {
    navigate(`/modelo/${buildingCode}`);
  };

  /**
   * Maneja el clic en una alerta para navegar al edificio específico
   * 
   * @param {AlertItem} alert - Alerta clickeada
   */
  const handleAlertClick = (alert: AlertItem) => {
    // Navegar al edificio con información de la alerta en el estado
    navigate(`/modelo/${alert.buildingCode}`, {
      state: {
        alertData: {
          spaceGuid: alert.id.split('-')[1], // Extraer el spaceGuid del ID
          planta: alert.planta,
          departament: alert.departament,
          dispositiu: alert.dispositiu,
          paramType: param,
          severity: alert.severity,
          value: alert.value
        }
      }
    });
  };

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
      case 'all': return 'Tots els Paràmetres';
      default: return 'Parámetro';
    }
  };

  /**
   * Genera datos de histórico de sensores simulados para el gráfico
   */
  const generateSensorHistory = (event: HistoricalEvent) => {
    const now = new Date();
    const history = [];
    const baseValue = event.value;
    
    // Generar 24 puntos de datos (últimas 24 horas)
    for (let i = 23; i >= 0; i--) {
      const timestamp = new Date(now.getTime() - i * 60 * 60 * 1000); // cada hora
      
      // Simular variación realista alrededor del valor base
      const variation = (Math.random() - 0.5) * 0.2 * baseValue; // ±10% de variación
      let value = baseValue + variation;
      
      // Asegurar valores realistas según el tipo de parámetro
      if (event.paramType === 'temperatura') {
        value = Math.max(15, Math.min(35, value)); // 15-35°C
      } else if (event.paramType === 'humitat') {
        value = Math.max(20, Math.min(80, value)); // 20-80%
      } else if (event.paramType === 'ppm') {
        value = Math.max(300, Math.min(1200, value)); // 300-1200 ppm
      }
      
      history.push({
        timestamp: timestamp.toISOString(),
        value: Math.round(value * 10) / 10, // redondear a 1 decimal
        paramType: event.paramType
      });
    }
    
    return history;
  };

  /**
   * Genera eventos históricos simulados basados en las alertas actuales - OPTIMIZADO
   */
  const generateHistoricalEvents = React.useCallback((): HistoricalEvent[] => {
    const events: HistoricalEvent[] = [];
    const now = new Date();
    
    // OPTIMIZACIÓN: Limitar el número de eventos generados para mejorar rendimiento
    const maxEventsPerAlert = 2; // Solo generar 2 eventos por alerta máximo
    const processedAlerts = allAlerts.slice(0, 100); // Limitar a 100 alertas máximo
    
    // Generar eventos de las últimas 24 horas basados en alertas actuales
    processedAlerts.forEach((alert) => {
      // Evento de inicio de alerta (hace 1-24 horas)
      const startTime = new Date(now.getTime() - Math.random() * 24 * 60 * 60 * 1000);
      events.push({
        id: `event-${alert.id}-${alert.paramType || 'temperatura'}-start`,
        timestamp: startTime,
        type: 'alert_start',
        severity: alert.severity,
        buildingCode: alert.buildingCode,
        buildingColor: alert.buildingColor,
        planta: alert.planta,
        departament: alert.departament,
        dispositiu: alert.dispositiu,
        spaceGuid: (alert.id.includes('-') ? alert.id.split('-')[1] : undefined),
        value: alert.value,
        paramType: alert.paramType || 'temperatura',
        message: `Alerta iniciada: ${alert.dispositiu} - ${getParamTitle(alert.paramType || 'temperatura')} ${alert.value}${(alert.paramType || 'temperatura') === 'ppm' ? 'ppm' : (alert.paramType || 'temperatura') === 'temperatura' ? '°C' : '%'}`,
        status: 'Obert'
      });

      // Algunos eventos de resolución (30% de probabilidad) - Solo si no hemos alcanzado el límite
      if (events.length < maxEventsPerAlert && Math.random() < 0.3) {
        const resolveTime = new Date(startTime.getTime() + Math.random() * 2 * 60 * 60 * 1000);
        if (resolveTime < now) {
          events.push({
            id: `event-${alert.id}-${alert.paramType || 'temperatura'}-resolved`,
            timestamp: resolveTime,
            type: 'alert_resolved',
            severity: 'ok' as Severity,
            buildingCode: alert.buildingCode,
            buildingColor: alert.buildingColor,
            planta: alert.planta,
            departament: alert.departament,
            dispositiu: alert.dispositiu,
            spaceGuid: (alert.id.includes('-') ? alert.id.split('-')[1] : undefined),
            value: alert.value,
            paramType: alert.paramType || 'temperatura',
            message: `Alerta resolta: ${alert.dispositiu} - Valors normalitzats`,
            status: 'Obert'
          });
        }
      }
    });

    // Ordenar por timestamp descendente (más reciente primero)
    return events.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }, [allAlerts]);

  // OPTIMIZACIÓN: Memoizar cálculos costosos del historial
  const buildingOptions = React.useMemo(() => {
    return Array.from(new Set(historicalEvents.map(e => e.buildingCode))).sort((a, b) => a.localeCompare(b));
  }, [historicalEvents]);

  const effectiveSelectedBuildings = React.useMemo(() => {
    return buildingsFilterActive ? selectedBuildings : buildingOptions;
  }, [buildingsFilterActive, selectedBuildings, buildingOptions]);

  // OPTIMIZACIÓN: Memoizar filtros y ordenamiento
  const filteredEvents = React.useMemo(() => {
    let filtered = param === 'all' ? historicalEvents : historicalEvents.filter(e => e.paramType === param);
    
    // Buildings filter
    filtered = effectiveSelectedBuildings.length > 0
      ? filtered.filter(e => effectiveSelectedBuildings.includes(e.buildingCode))
      : [];
      
    if (selectedSeverities.length > 0) {
      filtered = filtered.filter(e => selectedSeverities.includes(e.severity));
    }
    if (selectedStatuses.length > 0) {
      filtered = filtered.filter(e => selectedStatuses.includes(e.status));
    }

    // Sorting
    const sevOrder: Record<Severity, number> = { alt: 3, 'mitjà': 2, ok: 1 };
    return filtered.sort((a, b) => {
      let cmp = 0;
      if (sortBy === 'date') {
        cmp = a.timestamp.getTime() - b.timestamp.getTime();
      } else if (sortBy === 'param') {
        cmp = a.paramType.localeCompare(b.paramType);
      } else if (sortBy === 'building') {
        cmp = a.buildingCode.localeCompare(b.buildingCode);
      } else if (sortBy === 'planta') {
        cmp = (a.planta || '').localeCompare(b.planta || '');
      } else if (sortBy === 'departament') {
        cmp = (a.departament || '').localeCompare(b.departament || '');
      } else if (sortBy === 'zone') {
        const za = (a.dispositiu || '');
        const zb = (b.dispositiu || '');
        cmp = za.localeCompare(zb);
      } else if (sortBy === 'value') {
        cmp = (a.value ?? 0) - (b.value ?? 0);
      } else if (sortBy === 'severity') {
        cmp = sevOrder[a.severity] - sevOrder[b.severity];
      } else if (sortBy === 'status') {
        cmp = (a.status || '').localeCompare(b.status || '');
      }
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [historicalEvents, param, effectiveSelectedBuildings, selectedSeverities, selectedStatuses, sortBy, sortDir]);

  // OPTIMIZACIÓN: Memoizar funciones de toggle
  const toggleFromArray = React.useCallback((arr: any[], setArr: (v: any[]) => void, value: any) => {
    setArr(arr.includes(value) ? arr.filter((v: any) => v !== value) : [...arr, value]);
    if (!buildingsFilterActive && setArr === setSelectedBuildings) setBuildingsFilterActive(true);
  }, [buildingsFilterActive, selectedBuildings]);

  // Constantes memoizadas
  const severityUi: Array<{label: 'baix' | 'mitjà' | 'alt'; value: Severity}> = React.useMemo(() => [
    { label: 'baix', value: 'ok' },
    { label: 'mitjà', value: 'mitjà' },
    { label: 'alt', value: 'alt' }
  ], []);

  const statusOptions: StatusType[] = React.useMemo(() => 
    ['Obert','Assignat','Pendent','Completat','Tancat','Cancel·lat'], []
  );

  /**
   * Renderiza la vista de historial de eventos - OPTIMIZADO
   */
  const renderHistorialView = () => {
    
    return (
      <div style={{ display: 'flex', flexDirection: 'column', width: '100%', boxSizing: 'border-box' }}>
          <div style={{ 
            background: '#fff', 
            border: 'var(--border-width) solid var(--border-color)', 
            borderRadius: 'var(--border-radius)', 
            overflow: 'hidden'
          }}>
            <div style={{ 
              padding: '1rem 1.5rem', 
              borderBottom: 'var(--border-width) solid var(--border-color)',
              background: '#f8fafc',
              borderRadius: 'var(--border-radius) var(--border-radius) 0 0',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <div>
                <h3 style={{ margin: 0, color: '#0f172a', fontSize: '16px' }}>
                  Historial d'Alarmes - {filteredEvents.length} {filteredEvents.length === 1 ? 'alerta' : 'alertes'}
                </h3>
                <p style={{ margin: '4px 0 0 0', color: '#6b7280', fontSize: '14px' }}>
                  Registre cronològic d'alertes i esdeveniments del sistema
                </p>
              </div>
              <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                {(() => {
                  const altCount = filteredEvents.filter(e => e.severity === 'alt').length;
                  const mitjaCount = filteredEvents.filter(e => e.severity === 'mitjà').length;
                  const baixCount = filteredEvents.filter(e => e.severity === 'ok').length;
                  return (
                    <>
                      {altCount > 0 && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 12px', background: ALERT_COLORS.ALT_BG, borderRadius: '8px', border: `1px solid ${ALERT_COLORS.ALT}` }}>
                          <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: ALERT_COLORS.ALT }}></div>
                          <span style={{ fontSize: '13px', fontWeight: 700, color: ALERT_COLORS.ALT_TEXT }}>{altCount} Alt</span>
                        </div>
                      )}
                      {mitjaCount > 0 && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 12px', background: ALERT_COLORS.MITJA_BG, borderRadius: '8px', border: `1px solid ${ALERT_COLORS.MITJA}` }}>
                          <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: ALERT_COLORS.MITJA }}></div>
                          <span style={{ fontSize: '13px', fontWeight: 700, color: ALERT_COLORS.MITJA_TEXT }}>{mitjaCount} Mitjà</span>
                        </div>
                      )}
                      {baixCount > 0 && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 12px', background: ALERT_COLORS.BAIX_BG, borderRadius: '8px', border: `1px solid ${ALERT_COLORS.BAIX}` }}>
                          <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: ALERT_COLORS.BAIX }}></div>
                          <span style={{ fontSize: '13px', fontWeight: 700, color: ALERT_COLORS.BAIX_TEXT }}>{baixCount} Baix</span>
                        </div>
                      )}
                    </>
                  );
                })()}
              </div>
            </div>
            {/* Filters Bar */}
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center', padding: '10px 12px', borderBottom: 'var(--border-width) solid var(--border-color)' }}>
              {/* Buildings multiselect (dropdown) */}
              <div style={{ position: 'relative' }}>
                <button onClick={() => setBuildingsDropdownOpen(!buildingsDropdownOpen)} style={{ padding: '6px 10px', border: 'var(--border-width) solid var(--border-color)', background: '#fff', borderRadius: 6, cursor: 'pointer' }}>
                  Edificis ({effectiveSelectedBuildings.length}) ▾
                </button>
                {buildingsDropdownOpen && (
                  <div style={{ position: 'absolute', top: '36px', left: 0, background: '#fff', border: 'var(--border-width) solid var(--border-color)', borderRadius: 6, boxShadow: '0 8px 20px rgba(0,0,0,0.06)', padding: '8px', zIndex: 10, maxHeight: 260, overflowY: 'auto', minWidth: 220 }}>
                    {/* Select/Deselect all */}
                    <div style={{ padding: '6px 4px', borderBottom: '1px solid #eef2f7', marginBottom: 6, display: 'flex', gap: 6 }}>
                      <button onClick={() => { setSelectedBuildings(buildingOptions); setBuildingsFilterActive(true); }} style={{ padding: '4px 8px', border: 'var(--border-width) solid var(--border-color)', background: '#f8fafc', borderRadius: 4, cursor: 'pointer' }}>Tots</button>
                      <button onClick={() => { setSelectedBuildings([]); setBuildingsFilterActive(true); }} style={{ padding: '4px 8px', border: 'var(--border-width) solid var(--border-color)', background: '#f8fafc', borderRadius: 4, cursor: 'pointer' }}>Cap</button>
                    </div>
                    {buildingOptions.map(code => (
                      <label key={code} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 4px', cursor: 'pointer' }}>
                        <input
                          type="checkbox"
                          checked={effectiveSelectedBuildings.includes(code)}
                          onChange={() => toggleFromArray(selectedBuildings, setSelectedBuildings, code)}
                        />
                        <span style={{ fontSize: 13 }}>{code}</span>
                      </label>
                    ))}
                  </div>
                )}
              </div>

              {/* Severity multiselect (dropdown) */}
              <div style={{ position: 'relative' }}>
                <button type="button" onClick={() => setSeverityDropdownOpen(v => !v)} style={{ padding: '6px 10px', border: 'var(--border-width) solid var(--border-color)', background: '#fff', borderRadius: 6, cursor: 'pointer' }}>
                  Nivell ({selectedSeverities.length}) ▾
                </button>
                {severityDropdownOpen && (
                  <div style={{ position: 'absolute', top: '36px', left: 0, background: '#fff', border: 'var(--border-width) solid var(--border-color)', borderRadius: 6, boxShadow: '0 8px 20px rgba(0,0,0,0.06)', padding: '8px', zIndex: 1000, minWidth: 200 }}>
                    <div style={{ padding: '6px 4px', borderBottom: '1px solid #eef2f7', marginBottom: 6, display: 'flex', gap: 6 }}>
                      <button onClick={() => setSelectedSeverities(severityUi.map(s => s.value))} style={{ padding: '4px 8px', border: 'var(--border-width) solid var(--border-color)', background: '#f8fafc', borderRadius: 4, cursor: 'pointer' }}>Tots</button>
                      <button onClick={() => setSelectedSeverities([])} style={{ padding: '4px 8px', border: 'var(--border-width) solid var(--border-color)', background: '#f8fafc', borderRadius: 4, cursor: 'pointer' }}>Cap</button>
                    </div>
                    {severityUi.map(({label, value}) => (
                      <label key={label} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 4px', cursor: 'pointer' }}>
                        <input type="checkbox" checked={selectedSeverities.includes(value)} onChange={() => toggleFromArray(selectedSeverities, setSelectedSeverities, value)} />
                        <span style={{ fontSize: 13, textTransform: 'capitalize' }}>{label}</span>
                      </label>
                    ))}
                  </div>
                )}
              </div>

              {/* Status multiselect (dropdown) */}
              <div style={{ position: 'relative' }}>
                <button type="button" onClick={() => setStatusDropdownOpen(v => !v)} style={{ padding: '6px 10px', border: 'var(--border-width) solid var(--border-color)', background: '#fff', borderRadius: 6, cursor: 'pointer' }}>
                  Estat ({selectedStatuses.length}) ▾
                </button>
                {statusDropdownOpen && (
                  <div style={{ position: 'absolute', top: '36px', left: 0, background: '#fff', border: 'var(--border-width) solid var(--border-color)', borderRadius: 6, boxShadow: '0 8px 20px rgba(0,0,0,0.06)', padding: '8px', zIndex: 1000, minWidth: 220 }}>
                    <div style={{ padding: '6px 4px', borderBottom: '1px solid #eef2f7', marginBottom: 6, display: 'flex', gap: 6 }}>
                      <button onClick={() => setSelectedStatuses(statusOptions)} style={{ padding: '4px 8px', border: 'var(--border-width) solid var(--border-color)', background: '#f8fafc', borderRadius: 4, cursor: 'pointer' }}>Tots</button>
                      <button onClick={() => setSelectedStatuses([])} style={{ padding: '4px 8px', border: 'var(--border-width) solid var(--border-color)', background: '#f8fafc', borderRadius: 4, cursor: 'pointer' }}>Cap</button>
                    </div>
                    {statusOptions.map(st => (
                  <label key={st} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 4px', cursor: 'pointer' }}>
                    <input type="checkbox" checked={selectedStatuses.includes(st)} onChange={() => toggleFromArray(selectedStatuses, setSelectedStatuses, st)} />
                    <span style={{ fontSize: 13 }}>{st === 'Obert' ? 'Alerta' : st}</span>
                  </label>
                ))}
                  </div>
                )}
              </div>
            </div>
            
            {/* Scroll container including sticky header and rows (to avoid scrollbar misalignment) - OPTIMIZADO */}
            <div style={{ maxHeight: 'calc(100vh - 280px)', overflowY: 'auto' }}>
              {/* Table header for sorting */}
              <div style={{ display: 'grid', gridTemplateColumns: tableGrid, gap: '12px', alignItems: 'center', padding: '12px 14px', borderBottom: 'var(--border-width) solid var(--border-color)', background: '#fcfdff', position: 'sticky', top: 0, zIndex: 5 }}>
                <button onClick={() => { setSortBy('date'); setSortDir(sortBy==='date' && sortDir==='asc' ? 'desc' : 'asc'); }} style={{ background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', color: '#334155', fontWeight: 700, fontSize: 15 }}>Data</button>
                <button onClick={() => { setSortBy('building'); setSortDir(sortBy==='building' && sortDir==='asc' ? 'desc' : 'asc'); }} style={{ background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', color: '#334155', fontWeight: 700, fontSize: 15 }}>Edifici</button>
                <button onClick={() => { setSortBy('planta'); setSortDir(sortBy==='planta' && sortDir==='asc' ? 'desc' : 'asc'); }} style={{ background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', color: '#334155', fontWeight: 700, fontSize: 15 }}>Planta</button>
                <button onClick={() => { setSortBy('departament'); setSortDir(sortBy==='departament' && sortDir==='asc' ? 'desc' : 'asc'); }} style={{ background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', color: '#334155', fontWeight: 700, fontSize: 15 }}>Departament</button>
                <button onClick={() => { setSortBy('zone'); setSortDir(sortBy==='zone' && sortDir==='asc' ? 'desc' : 'asc'); }} style={{ background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', color: '#334155', fontWeight: 700, fontSize: 15 }}>Zona d'alerta</button>
                <button title="Paràmetre" aria-label="Paràmetre" onClick={() => { setSortBy('param'); setSortDir(sortBy==='param' && sortDir==='asc' ? 'desc' : 'asc'); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#334155', fontWeight: 700, fontSize: 15, textAlign: 'center' }}></button>
                <button onClick={() => { setSortBy('value'); setSortDir(sortBy==='value' && sortDir==='asc' ? 'desc' : 'asc'); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#334155', fontWeight: 700, fontSize: 15, textAlign: 'left' }}>Tipus d'alerta</button>
                <button onClick={() => { setSortBy('severity'); setSortDir(sortBy==='severity' && sortDir==='asc' ? 'desc' : 'asc'); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#334155', fontWeight: 700, fontSize: 15, textAlign: 'center' }}>Nivell</button>
                <button onClick={() => { setSortBy('status'); setSortDir(sortBy==='status' && sortDir==='asc' ? 'desc' : 'asc'); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#334155', fontWeight: 700, fontSize: 15, textAlign: 'center' }}>Estat</button>
              </div>
              {filteredEvents.length === 0 ? (
                <div style={{ 
                  padding: '2rem', 
                  textAlign: 'center', 
                  color: '#6b7280' 
                }}>
                  No hi ha esdeveniments registrats
                </div>
              ) : (
                filteredEvents.slice(0, 200).map((event) => (
                  <HistorialEventRow
                    key={event.id}
                    event={event}
                    tableGrid={tableGrid}
                    selectedEvent={selectedEvent}
                    onEventClick={() => { setSelectedEvent(event); setShowAlarmPanel(true); setAlarmTab('info'); }}
                  />
                ))
              )}
            </div>
          </div>
        </div>
    );
  };

  return (
    <div style={{ 
      display: 'flex', 
      flexDirection: 'column',
      height: '100%', 
      background: '#f8f9fa',
      fontFamily: 'Arial, sans-serif'
    }}>
      {/* Top controls bar (below global Header) */}
      <div style={{
        position: 'sticky',
        top: isMobile ? 0 : 52,
        left: 0,
        right: 0,
        height: '60px',
        background: '#fff',
        borderBottom: '1px solid #e0e6ef',
        zIndex: 10,
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        padding: isMobile ? '10px 12px' : '12px 20px'
      }}>
          {/* Resum/Historial toggle - centered */}
          <div style={{ 
            display: 'inline-flex',
            border: '2px solid var(--border-color)', 
            borderRadius: '10px',
            overflow: 'hidden',
            background: '#fff'
          }}>
            <button
              onClick={() => setCurrentView('resum')}
              style={{
                padding: '8px 16px',
                border: 'none',
                borderRight: '1px solid var(--border-color)',
                background: currentView === 'resum' ? '#4179b5' : 'transparent',
                color: currentView === 'resum' ? '#fff' : '#333',
                cursor: 'pointer',
                transition: 'all 0.2s',
                fontWeight: 600
              }}
            >
              Resum
            </button>
            <button
              onClick={() => setCurrentView('historial')}
              style={{
                padding: '8px 16px',
                border: 'none',
                background: currentView === 'historial' ? '#4179b5' : 'transparent',
                color: currentView === 'historial' ? '#fff' : '#333',
                cursor: 'pointer',
                transition: 'all 0.2s',
                fontWeight: 600
              }}
            >
              Historial
            </button>
          </div>

      </div>

      {/* Main content (flows under sticky bar) */}
      <div className="page-container control-fullpage" style={{ flex: 1, width: '100%', boxSizing: 'border-box', paddingTop: 8 }}>
        <div className="page-content" style={currentView === 'historial' ? { maxWidth: 'none', width: '100%', margin: 0, padding: 0, boxSizing: 'border-box' } : undefined}>
          {/* Removed extra parameter title to tighten spacing */}


          {/* Conditional rendering based on current view */}
          {currentView === 'resum' ? (
            <div className="content-card flat">
              {/* Filtro: Tots / Amb alertes */}
              <div style={{ padding: '12px 20px', borderBottom: '1px solid #e5e7eb', display: 'flex', gap: '8px' }}>
                <button
                  onClick={() => setBuildingFilter('tots')}
                  style={{
                    padding: '6px 16px',
                    background: buildingFilter === 'tots' ? '#4179b5' : '#e0e6ef',
                    color: buildingFilter === 'tots' ? 'white' : '#333',
                    border: 'none',
                    borderRadius: '6px',
                    fontWeight: 600,
                    fontSize: '13px',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                >
                  Tots els edificis ({buildingStats.length})
                </button>
                <button
                  onClick={() => setBuildingFilter('amb-alertes')}
                  style={{
                    padding: '6px 16px',
                    background: buildingFilter === 'amb-alertes' ? '#4179b5' : '#e0e6ef',
                    color: buildingFilter === 'amb-alertes' ? 'white' : '#333',
                    border: 'none',
                    borderRadius: '6px',
                    fontWeight: 600,
                    fontSize: '13px',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                >
                  Amb alertes ({buildingStats.filter(s => (s.alertsAlt || 0) > 0 || (s.alertsMitja || 0) > 0 || (s.alertsBaix || 0) > 0).length})
                </button>
              </div>
              
              <div className="control-two-col">
                <main className="main-content">
                  <div className="building-cards-grid fill-height">
                    {buildingStats
                      .filter(stat => buildingFilter === 'tots' || ((stat.alertsAlt || 0) > 0 || (stat.alertsMitja || 0) > 0 || (stat.alertsBaix || 0) > 0))
                      .sort((a, b) => {
                        // 1. Primero ordenar por alertas Alt (más a menos)
                        const altA = a.alertsAlt || 0;
                        const altB = b.alertsAlt || 0;
                        if (altB !== altA) return altB - altA;
                        
                        // 2. Si tienen las mismas alertas Alt, ordenar por alertas Mitjà (más a menos)
                        const mitjaA = a.alertsMitja || 0;
                        const mitjaB = b.alertsMitja || 0;
                        if (mitjaB !== mitjaA) return mitjaB - mitjaA;
                        
                        // 3. Si tienen las mismas alertas Alt y Mitjà, ordenar por alertas Baix (más a menos)
                        const baixA = a.alertsBaix || 0;
                        const baixB = b.alertsBaix || 0;
                        if (baixB !== baixA) return baixB - baixA;
                        
                        // 3. Si tienen el mismo número de alertas, orden alfabético
                        return a.label.localeCompare(b.label);
                      })
                      .map((stat) => (
                        <BuildingCard
                          key={stat.code}
                          buildingStat={stat}
                          paramType={param}
                          onClick={handleBuildingClick}
                        />
                      ))}
                  </div>
                </main>
                <AlertsPanel
                  alerts={allAlerts.filter(alert => alert.severity === 'alt')}
                  paramType={param}
                  onParamChange={setParam}
                  title="Alertes Globals"
                  subtitle="Només alertes de severitat alta."
                  className="alerts-panel"
                  emptyMessage="Sense alertes d'alta severitat en el sistema."
                  showCount={true}
                  onAlertClick={handleAlertClick}
                />
              </div>
            </div>
          ) : (
            <div style={{ paddingRight: '8px' }}>
              {renderHistorialView()}
            </div>
          )}
        </div>
      </div>
      {/* Floating unified Alarm Details Panel (fixed overlay) */}
      <AlarmDetailsPanel
        visible={showAlarmPanel && !!selectedEvent}
        onClose={() => setShowAlarmPanel(false)}
        activeTab={alarmTab}
        onTabChange={setAlarmTab}
        activeParameter={(selectedEvent?.paramType || 'temperatura') as 'temperatura' | 'humitat' | 'ppm'}
        selectedSensor={selectedEvent ? {
          dispositiu: selectedEvent.dispositiu,
          planta: selectedEvent.planta,
          departament: selectedEvent.departament,
          edifici: selectedEvent.buildingCode,
          spaceGuid: selectedEvent.spaceGuid,
          roomType: undefined,
          severity: selectedEvent.severity,
          value: selectedEvent.value,
          timestamp: selectedEvent.timestamp,
        } : undefined}
        selectedElement={undefined}
        sensorHistory={selectedEvent ? generateSensorHistory(selectedEvent) : []}
        buildingColor={selectedEvent?.buildingColor}
        overlayInViewer={false}
      />
    </div>
  );
};

// Componente optimizado para renderizar filas de eventos históricos
const HistorialEventRow = React.memo(({ 
  event, 
  tableGrid, 
  selectedEvent, 
  onEventClick 
}: { 
  event: HistoricalEvent; 
  tableGrid: string; 
  selectedEvent: HistoricalEvent | null; 
  onEventClick: () => void; 
}) => {
  const isSelected = selectedEvent?.id === event.id;
  
  return (
    <div
      onClick={onEventClick}
      style={{ 
        display: 'grid',
        gridTemplateColumns: tableGrid,
        alignItems: 'center',
        gap: '12px',
        padding: '10px 12px',
        borderBottom: '1px solid #f1f5f9',
        cursor: 'pointer',
        background: isSelected ? '#f0f7ff' : '#fff',
        transition: 'background-color 0.2s ease, box-shadow 0.2s ease'
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.backgroundColor = '#fdea80';
        e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.08)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.boxShadow = 'none';
        e.currentTarget.style.backgroundColor = isSelected ? '#f0f7ff' : '#fff';
      }}
    >
      {/* Timestamp */}
      <div style={{ color: '#6b7280', fontSize: '15px' }}>
        {event.timestamp.toLocaleDateString('ca-ES')}<br/>
        <span style={{ fontSize: '14px' }}>{event.timestamp.toLocaleTimeString('ca-ES', { hour12: false })}</span>
      </div>

      {/* Building code with color dot */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ width: 10, height: 10, borderRadius: '50%', display: 'inline-block', background: event.buildingColor }}></span>
        <span style={{ fontSize: 14, color: '#334155', fontWeight: 700 }}>{event.buildingCode}</span>
      </div>

      {/* Planta */}
      <div style={{ fontSize: 15, color: '#475569' }}>{event.planta}</div>

      {/* Departament */}
      <div style={{ fontSize: 15, color: '#64748b' }}>{event.departament}</div>

      {/* Zona d'alerta -> dispositiu */}
      <div style={{ fontSize: '16px', color: '#374151', fontWeight: 700 }}>{event.dispositiu}</div>

      {/* Parameter icon */}
      <div style={{ fontSize: '18px', textAlign: 'center', justifySelf: 'center' }}>
        {event.paramType === 'temperatura' ? '🌡️' : event.paramType === 'humitat' ? '💧' : '⚗️'}
      </div>

      {/* Value string */}
      <div style={{ fontSize: 16, color: '#111827', fontWeight: 700 }}>
        {event.paramType === 'temperatura' ? `Temperatura ${event.value}°C` : event.paramType === 'humitat' ? `Humitat ${event.value}%` : `CO₂ ${event.value}ppm`}
      </div>

      {/* Severity dot (color for level) */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, justifySelf: 'center' }}>
        <span style={{ width: '13px', height: '13px', borderRadius: '50%', display: 'inline-block', background: event.severity === 'alt' ? ALERT_COLORS.ALT : event.severity === 'mitjà' ? ALERT_COLORS.MITJA : ALERT_COLORS.BAIX }}></span>
        <span style={{ fontSize: 13, color: '#64748b', textTransform: 'capitalize' }}>{event.severity === 'ok' ? 'Baix' : event.severity}</span>
      </div>

      {/* Status badge with colors */}
      {(() => {
        const label = event.status === 'Obert' ? 'Alerta' : event.status;
        const styles: Record<string, {bg: string; color: string; border: string}> = {
          'Alerta': { bg: '#fee2e2', color: '#b91c1c', border: '#fca5a5' },
          'Assignat': { bg: '#dbeafe', color: '#1d4ed8', border: '#93c5fd' },
          'Pendent': { bg: '#fef3c7', color: '#b45309', border: '#fde68a' },
          'Completat': { bg: '#dcfce7', color: '#166534', border: '#86efac' },
          'Tancat': { bg: '#dcfce7', color: '#166534', border: '#86efac' },
          'Cancel·lat': { bg: '#e5e7eb', color: '#374151', border: '#d1d5db' }
        };
        const s = styles[label] || styles['Cancel·lat'];
        return (
          <div style={{
            padding: '7px 12px',
            borderRadius: '12px',
            fontSize: '13px',
            fontWeight: 600,
            background: s.bg,
            color: s.color,
            border: `1px solid ${s.border}`,
            justifySelf: 'center',
            textAlign: 'center'
          }}>
            {label}
          </div>
        );
      })()}
    </div>
  );
});

export default ControlGeneral;

/**
 * @fileoverview Notas de implementación:
 * 
 * - Vista consolidada del estado de todos los edificios
 * - Navegación a edificios específicos mediante cards clickeables
 * - Estadísticas en tiempo real basadas en datos de sensores
 * - Resum d'alertes a tots els edificis
 * - Control de parámetros (temperatura, humedad, CO₂)
 * - Interfaz responsive con grid adaptativo
 */

