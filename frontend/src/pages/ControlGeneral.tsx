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
import './Pages.css';
import { useRealTimeSensors } from '../hooks/useRealTimeSensors';
import AlertsPanel, { type AlertItem, type Severity, type ParamType } from '../components/AlertsPanel';
import BuildingCard, { type BuildingStat } from '../components/BuildingCard';
import MiniSpaceViewer from '../components/MiniSpaceViewer';

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
  const [selectedEvent, setSelectedEvent] = React.useState<HistoricalEvent | null>(null);
  const [historicalEvents, setHistoricalEvents] = React.useState<HistoricalEvent[]>([]);
  // Filters for historial
  const [selectedBuildings, setSelectedBuildings] = React.useState<string[]>([]);
  const [selectedSeverities, setSelectedSeverities] = React.useState<Severity[]>(['ok','mitjà','alt']);
  const [selectedStatuses, setSelectedStatuses] = React.useState<StatusType[]>(['Obert','Assignat','Pendent','Completat','Tancat','Cancel·lat']);
  const [buildingsDropdownOpen, setBuildingsDropdownOpen] = React.useState(false);
  const [buildingsFilterActive, setBuildingsFilterActive] = React.useState(false);
  const [severityDropdownOpen, setSeverityDropdownOpen] = React.useState(false);
  const [statusDropdownOpen, setStatusDropdownOpen] = React.useState(false);
  const [sortBy, setSortBy] = React.useState<'date'|'param'|'building'|'planta'|'departament'|'zone'|'value'|'severity'|'status'>('date');
  const [sortDir, setSortDir] = React.useState<'asc'|'desc'>('desc');
  // Columns: Data | Edifici | Planta | Departament | Zona (dispositiu) | Par | Valor | Nivell | Estat
  const tableGrid = '140px 120px 90px 220px 1fr 36px 160px 110px 140px';
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

  // Usar datos reales de sensores para todos los edificios
  const { data: sensorData, loading: sensorLoading, error: sensorError } = useRealTimeSensors({
    edifici: '', // Vacío para obtener todos los edificios
    interval: 20000,
    autoStart: true
  });

  // Generate and persist historical events for the session; merge to preserve edited statuses
  React.useEffect(() => {
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
    
    if (deviationPercent > 0.50) return 'alt';    // >50% fuera del rango: Alta severidad
    if (deviationPercent > 0.25) return 'mitjà';  // 25-50% fuera del rango: Media severidad
    return 'ok';                                   // <25% fuera del rango: Normal
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
    
    sensorData.forEach(room => {
      const value = param === 'temperatura' ? room.temperature : param === 'humitat' ? room.humidity : room.ppm;
      const severity = computeSeverity(param, value);
      
      // Debug: mostrar valores y severidad para ppm
      if (param === 'ppm' && value != null) {
        console.log(`CO₂ Alert Check - ${room.dispositiu}: ${value}ppm -> ${severity}`);
      }
      
      // Solo incluir en Alertes si hay algún problema (no 'ok')
      if (severity !== 'ok') {
        // Calcular desviación del rango óptimo (porcentaje)
        if (param === 'all') return alerts; // Skip deviation calculation for 'all' parameter
        
        const currentThreshold = thresholds[param as keyof typeof thresholds];
        const range = currentThreshold.max - currentThreshold.min;
        const center = (currentThreshold.max + currentThreshold.min) / 2;
        const deviation = Math.abs(value - center) / range;
        
        alerts.push({
          id: `${room.edifici}-${room.spaceGuid}`,
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
    
    // Debug: mostrar resumen de Alertes generadas
    if (param === 'ppm') {
      console.log(`Alertes CO₂ generadas: ${alerts.length} de ${sensorData.length} sensores`);
    }
    
    // No ordenar aquí - se ordenará globalmente después de combinar todas las alertas
    return alerts;
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
        alerts: []
      };
    }

    const values = buildingSensorData.map(room => 
      param === 'temperatura' ? room.temperature : param === 'humitat' ? room.humidity : room.ppm
    ).filter(v => v != null && !isNaN(v));

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
        alerts: []
      };
    }

    const avg = values.reduce((sum, val) => sum + val, 0) / values.length;
    const min = Math.min(...values);
    const max = Math.max(...values);
    
    // Calcular zonas Incorrectes
    const incorrectZones = values.filter(val => computeSeverity(param, val) !== 'ok').length;
    
    // Determinar severidad general
    let severity: Severity = 'ok';
    if (incorrectZones >= 3) severity = 'alt';
    else if (incorrectZones === 2) severity = 'mitjà';
    // Eliminado nivel 'baix' - solo mantenemos 'ok', 'mitjà' y 'alt'

    // Generar Alertes específicas del edificio
    const buildingAlerts = generateAlertsFromSensorData(buildingSensorData, param);

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
      alerts: buildingAlerts
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

  // Calcular estadísticas cuando cambien los datos de sensores o el parámetro
  React.useEffect(() => {
    if (sensorData && buildings.length > 0) {
      const stats: (BuildingStat & { alerts?: AlertItem[] })[] = [];
      const allAlertsList: AlertItem[] = [];

      // Agrupar datos de sensores por edificio
      const sensorDataByBuilding: Record<string, any[]> = {};
      sensorData.forEach(room => {
        const buildingCode = room.edifici;
        if (!sensorDataByBuilding[buildingCode]) {
          sensorDataByBuilding[buildingCode] = [];
        }
        sensorDataByBuilding[buildingCode].push(room);
      });

      // Debug: mostrar códigos de edificios encontrados en sensores
      console.log('Códigos de edificios en datos de sensores:', Object.keys(sensorDataByBuilding));
      console.log('Edificios en base de datos:', buildings.map(b => ({ codi: b.codi, nom: b.nom })));

      // Calcular estadísticas para cada edificio
      Object.entries(sensorDataByBuilding).forEach(([buildingCode, buildingSensorData]) => {
        // Verificar si el edificio existe en la base de datos
        const buildingExists = buildings.some(b => (b.codi || b.nom) === buildingCode);
        
        if (buildingExists) {
          const stat = calculateBuildingStats(buildingCode, buildingSensorData, param);
          stats.push(stat);
          
          // Generar alertas para todos los parámetros, no solo el actual
          const paramTypes: ParamType[] = ['temperatura', 'humitat', 'ppm'];
          paramTypes.forEach(paramType => {
            const paramAlerts = generateAlertsFromSensorData(buildingSensorData, paramType);
            allAlertsList.push(...paramAlerts);
          });
        } else {
          // Log para debugging - edificio no encontrado en BD
          console.warn(`Edificio "${buildingCode}" encontrado en datos de sensores pero no en base de datos. Datos ignorados.`);
        }
      });

      // Ordenar todas las alertas globalmente por severidad y desviación
      const severityOrder: Record<'alt' | 'mitjà', number> = { 'alt': 3, 'mitjà': 2 };
      allAlertsList.sort((a, b) => {
        // Primero por severidad (mayor número = más grave)
        const severityDiff = (severityOrder[b.severity as keyof typeof severityOrder] || 0) - (severityOrder[a.severity as keyof typeof severityOrder] || 0);
        if (severityDiff !== 0) return severityDiff;
        
        // Si la severidad es igual, ordenar por desvío (mayor desvío primero)
        return (b.deviation || 0) - (a.deviation || 0);
      });

      setBuildingStats(stats);
      setAllAlerts(allAlertsList);
    }
  }, [sensorData, buildings, param]);

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
   * Genera eventos históricos simulados basados en las alertas actuales
   */
  const generateHistoricalEvents = (): HistoricalEvent[] => {
    const events: HistoricalEvent[] = [];
    const now = new Date();
    
    // Generar eventos de las últimas 24 horas basados en alertas actuales
    allAlerts.forEach((alert) => {
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

      // Algunos eventos de resolución (30% de probabilidad)
      if (Math.random() < 0.3) {
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
  };

  /**
   * Renderiza la vista de historial de eventos
   */
  const renderHistorialView = () => {
    const events = historicalEvents;
    const buildingOptions = Array.from(new Set(events.map(e => e.buildingCode))).sort((a, b) => a.localeCompare(b));
    const effectiveSelectedBuildings = buildingsFilterActive ? selectedBuildings : buildingOptions;

    // Helpers to toggle filters
    const toggleFromArray = <T,>(arr: T[], setArr: (v: T[]) => void, value: T) => {
      setArr(arr.includes(value) ? arr.filter(v => v !== value) : [...arr, value]);
      if (!buildingsFilterActive && setArr === setSelectedBuildings) setBuildingsFilterActive(true);
    };

    // UI shows baix/mitjà/alt; map baix -> ok internally
    const severityUi: Array<{label: 'baix' | 'mitjà' | 'alt'; value: Severity}> = [
      { label: 'baix', value: 'ok' },
      { label: 'mitjà', value: 'mitjà' },
      { label: 'alt', value: 'alt' }
    ];
    const statusOptions: StatusType[] = ['Obert','Assignat','Pendent','Completat','Tancat','Cancel·lat'];

    let filtered = param === 'all' ? events : events.filter(e => e.paramType === param);
    // Buildings filter: by default all buildings selected; if user cleared (Cap), show none
    filtered = effectiveSelectedBuildings.length > 0
      ? filtered.filter(e => effectiveSelectedBuildings.includes(e.buildingCode))
      : [];
    if (selectedSeverities.length > 0) {
      filtered = filtered.filter(e => selectedSeverities.includes(e.severity));
    }
    if (selectedStatuses.length > 0) {
      filtered = filtered.filter(e => selectedStatuses.includes(e.status));
    }

    // Sorting based on selected column
    const sevOrder: Record<Severity, number> = { alt: 3, 'mitjà': 2, ok: 1 };
    filtered.sort((a, b) => {
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
    
    return (
      <div style={{ display: 'grid', gridTemplateColumns: '70% 30%', gap: '16px', width: '100%', boxSizing: 'border-box' }}>
          <div style={{ 
            background: '#fff', 
            border: '1px solid #e6ecf5', 
            borderRadius: '0.9rem', 
            overflow: 'visible'
          }}>
            <div style={{ 
              padding: '1rem 1.5rem', 
              borderBottom: '1px solid #e6ecf5',
              background: '#f8fafc'
            }}>
              <h3 style={{ margin: 0, color: '#0f172a', fontSize: '16px' }}>
                Historial d'Esdeveniments - {getParamTitle(param)}
              </h3>
              <p style={{ margin: '4px 0 0 0', color: '#6b7280', fontSize: '14px' }}>
                Registre cronològic d'alertes i esdeveniments del sistema
              </p>
            </div>
            {/* Filters Bar */}
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center', padding: '10px 12px', borderBottom: '1px solid #e6ecf5' }}>
              {/* Buildings multiselect (dropdown) */}
              <div style={{ position: 'relative' }}>
                <button onClick={() => setBuildingsDropdownOpen(!buildingsDropdownOpen)} style={{ padding: '6px 10px', border: '1px solid #e6ecf5', background: '#fff', borderRadius: 6, cursor: 'pointer' }}>
                  Edificis ({effectiveSelectedBuildings.length}) ▾
                </button>
                {buildingsDropdownOpen && (
                  <div style={{ position: 'absolute', top: '36px', left: 0, background: '#fff', border: '1px solid #e6ecf5', borderRadius: 6, boxShadow: '0 8px 20px rgba(0,0,0,0.06)', padding: '8px', zIndex: 10, maxHeight: 260, overflowY: 'auto', minWidth: 220 }}>
                    {/* Select/Deselect all */}
                    <div style={{ padding: '6px 4px', borderBottom: '1px solid #eef2f7', marginBottom: 6, display: 'flex', gap: 6 }}>
                      <button onClick={() => { setSelectedBuildings(buildingOptions); setBuildingsFilterActive(true); }} style={{ padding: '4px 8px', border: '1px solid #e6ecf5', background: '#f8fafc', borderRadius: 4, cursor: 'pointer' }}>Tots</button>
                      <button onClick={() => { setSelectedBuildings([]); setBuildingsFilterActive(true); }} style={{ padding: '4px 8px', border: '1px solid #e6ecf5', background: '#f8fafc', borderRadius: 4, cursor: 'pointer' }}>Cap</button>
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
                <button type="button" onClick={() => setSeverityDropdownOpen(v => !v)} style={{ padding: '6px 10px', border: '1px solid #e6ecf5', background: '#fff', borderRadius: 6, cursor: 'pointer' }}>
                  Nivell ({selectedSeverities.length}) ▾
                </button>
                {severityDropdownOpen && (
                  <div style={{ position: 'absolute', top: '36px', left: 0, background: '#fff', border: '1px solid #e6ecf5', borderRadius: 6, boxShadow: '0 8px 20px rgba(0,0,0,0.06)', padding: '8px', zIndex: 1000, minWidth: 200 }}>
                    <div style={{ padding: '6px 4px', borderBottom: '1px solid #eef2f7', marginBottom: 6, display: 'flex', gap: 6 }}>
                      <button onClick={() => setSelectedSeverities(severityUi.map(s => s.value))} style={{ padding: '4px 8px', border: '1px solid #e6ecf5', background: '#f8fafc', borderRadius: 4, cursor: 'pointer' }}>Tots</button>
                      <button onClick={() => setSelectedSeverities([])} style={{ padding: '4px 8px', border: '1px solid #e6ecf5', background: '#f8fafc', borderRadius: 4, cursor: 'pointer' }}>Cap</button>
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
                <button type="button" onClick={() => setStatusDropdownOpen(v => !v)} style={{ padding: '6px 10px', border: '1px solid #e6ecf5', background: '#fff', borderRadius: 6, cursor: 'pointer' }}>
                  Estat ({selectedStatuses.length}) ▾
                </button>
                {statusDropdownOpen && (
                  <div style={{ position: 'absolute', top: '36px', left: 0, background: '#fff', border: '1px solid #e6ecf5', borderRadius: 6, boxShadow: '0 8px 20px rgba(0,0,0,0.06)', padding: '8px', zIndex: 1000, minWidth: 220 }}>
                    <div style={{ padding: '6px 4px', borderBottom: '1px solid #eef2f7', marginBottom: 6, display: 'flex', gap: 6 }}>
                      <button onClick={() => setSelectedStatuses(statusOptions)} style={{ padding: '4px 8px', border: '1px solid #e6ecf5', background: '#f8fafc', borderRadius: 4, cursor: 'pointer' }}>Tots</button>
                      <button onClick={() => setSelectedStatuses([])} style={{ padding: '4px 8px', border: '1px solid #e6ecf5', background: '#f8fafc', borderRadius: 4, cursor: 'pointer' }}>Cap</button>
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
            
            {/* Scroll container including sticky header and rows (to avoid scrollbar misalignment) */}
            <div style={{ maxHeight: 'calc(100vh - 280px)', overflowY: 'auto' }}>
              {/* Table header for sorting */}
              <div style={{ display: 'grid', gridTemplateColumns: tableGrid, gap: '12px', alignItems: 'center', padding: '12px 14px', borderBottom: '1px solid #e6ecf5', background: '#fcfdff', position: 'sticky', top: 0, zIndex: 5 }}>
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
              {filtered.length === 0 ? (
                <div style={{ 
                  padding: '2rem', 
                  textAlign: 'center', 
                  color: '#6b7280' 
                }}>
                  No hi ha esdeveniments registrats
                </div>
              ) : (
                filtered.map((event) => (
                  <div
                    key={event.id}
                    onClick={() => setSelectedEvent(event)}
                    style={{ 
                      display: 'grid',
                      gridTemplateColumns: tableGrid,
                      alignItems: 'center',
                      gap: '12px',
                      padding: '10px 12px',
                      borderBottom: '1px solid #f1f5f9',
                      cursor: 'pointer',
                      background: selectedEvent?.id === event.id ? '#f0f7ff' : '#fff',
                      transition: 'background-color 0.2s ease, box-shadow 0.2s ease'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = '#fdea80';
                      e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.08)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.boxShadow = 'none';
                      e.currentTarget.style.backgroundColor = (selectedEvent?.id === event.id ? '#f0f7ff' : '#fff');
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
                      <span style={{ width: '13px', height: '13px', borderRadius: '50%', display: 'inline-block', background: event.severity === 'alt' ? '#ef4444' : event.severity === 'mitjà' ? '#f59e0b' : '#22c55e' }}></span>
                      <span style={{ fontSize: 13, color: '#64748b', textTransform: 'capitalize' }}>{event.severity === 'ok' ? 'baix' : event.severity}</span>
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
                ))
              )}
            </div>
          </div>

          {/* Right detail panel */}
          <aside style={{
            background: '#fff',
            border: '1px solid #e6ecf5',
            borderRadius: '12px',
            padding: '16px',
            height: 'fit-content',
            boxShadow: '0 1px 2px rgba(16,24,40,0.04)'
          }}>
            {!!selectedEvent && (
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16, marginBottom: 16 }}>
                <div style={{
                  width: 56,
                  height: 56,
                  borderRadius: 10,
                  background: selectedEvent.buildingColor,
                  color: '#fff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 900,
                  fontSize: 18,
                  letterSpacing: 0.8,
                  flex: '0 0 auto'
                }}>{selectedEvent.buildingCode}</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4, lineHeight: 1.25 }}>
                  {/* 1) PLANTA - DEPARTAMENT (línea pequeña) */}
                  <div style={{ fontSize: 14, fontWeight: 600, color: '#334155' }}>
                    {`${selectedEvent.planta || ''}${selectedEvent.planta ? ' - ' : ''}${selectedEvent.departament || ''}`}
                  </div>
                  {/* 2) Dispositiu destacado en grande (p. ej., TERRASSA) */}
                  <div style={{ fontSize: 20, fontWeight: 900, color: '#0f172a', textTransform: 'uppercase' }}>
                    {selectedEvent.dispositiu}
                  </div>
                </div>
              </div>
            )}
            {!selectedEvent ? (
              <div style={{ color: '#64748b', fontSize: '13px' }}>Selecciona un esdeveniment per veure els detalls</div>
            ) : (
              <div style={{ display: 'grid', rowGap: '14px', color: '#0f172a' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', rowGap: 12, columnGap: 12, fontSize: 15 }}>
                  {/* Edifici y Planta se muestran en cabecera. Se eliminan del listado */}
                  {/* Departament already shown above as subtitle */}
                  <div style={{ color: '#64748b', fontSize: 14 }}>Paràmetre</div>
                  <div style={{ fontWeight: 600 }}>{getParamTitle(selectedEvent.paramType)}</div>
                  <div style={{ color: '#64748b', fontSize: 14 }}>Nivell</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ width: '12px', height: '12px', borderRadius: '50%', display: 'inline-block', background: selectedEvent.severity === 'alt' ? '#ef4444' : selectedEvent.severity === 'mitjà' ? '#f59e0b' : '#22c55e' }}></span>
                    <span style={{ fontWeight: 700, textTransform: 'capitalize', color: '#475569' }}>{selectedEvent.severity === 'ok' ? 'baix' : selectedEvent.severity}</span>
                  </div>
                  <div style={{ color: '#64748b', fontSize: 14 }}>Valor</div>
                  <div style={{ fontWeight: 700 }}>{selectedEvent.value}{selectedEvent.paramType === 'ppm' ? 'ppm' : selectedEvent.paramType === 'temperatura' ? '°C' : '%'}</div>
                  <div style={{ color: '#64748b', fontSize: 14 }}>Hora</div>
                  <div style={{ fontSize: 15 }}>{selectedEvent.timestamp.toLocaleString('ca-ES', { hour12: false })}</div>
                  <div style={{ color: '#64748b', alignSelf: 'center', fontSize: 14 }}>Estat</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                    {(() => {
                      const { label, style } = getStatusView(selectedEvent.status);
                      return (
                        <span style={{ padding: '5px 10px', borderRadius: 10, border: `1px solid ${style.border}`, background: style.bg, color: style.color, fontSize: 13, fontWeight: 700 }}>{label}</span>
                      );
                    })()}
                    <select
                      value={selectedEvent.status}
                      onChange={(e) => {
                        const newStatus = e.target.value as StatusType;
                        setSelectedEvent(prev => prev ? { ...prev, status: newStatus } : prev);
                      }}
                      style={{ padding: '8px 10px', borderRadius: 8, border: '1px solid #e6ecf5', background: '#fff', fontSize: 14 }}
                    >
                      {(['Obert','Assignat','Pendent','Completat','Tancat','Cancel·lat'] as StatusType[]).map(opt => (
                        <option key={opt} value={opt}>{opt === 'Obert' ? 'Canviar estat' : opt}</option>
                      ))}
                    </select>
                  </div>
                </div>
                {/* Mini preview using shared model from ModelViewer */}
                <div>
                  <div style={{ fontSize: 14, color: '#64748b', marginBottom: 6 }}>Previsualització</div>
                  <MiniSpaceViewer
                    buildingCode={selectedEvent.buildingCode}
                    spaceGuid={selectedEvent.spaceGuid}
                    severity={selectedEvent.severity as any}
                    paramType={selectedEvent.paramType as any}
                    value={selectedEvent.value}
                    dispositiu={selectedEvent.dispositiu}
                    planta={selectedEvent.planta}
                    sensorData={sensorData}
                  />
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 8 }}>
                  <button
                    onClick={() => {
                      if (!selectedEvent) return;
                      setHistoricalEvents(prev => prev.map(ev => ev.id === selectedEvent.id ? { ...ev, status: selectedEvent.status } : ev));
                    }}
                    disabled={(() => { const orig = historicalEvents.find(e => e.id === selectedEvent.id)?.status; return orig === selectedEvent.status; })()}
                    style={{ padding: '12px 16px', background: (() => { const disabled = (historicalEvents.find(e => e.id === selectedEvent.id)?.status) === selectedEvent.status; return disabled ? '#9db6d1' : '#4179b5'; })(), color: '#fff', border: 'none', borderRadius: 10, cursor: 'pointer', fontSize: 14, fontWeight: 700 }}
                  >
                    Aplicar Canvis
                  </button>
                </div>
              </div>
            )}
          </aside>
      </div>
    );
  };

  return (
    <div style={{ 
      display: 'flex', 
      height: '100vh', 
      background: '#f8f9fa',
      fontFamily: 'Arial, sans-serif'
    }}>
      {/* Header */}
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: '60px',
        background: '#fff',
        borderBottom: '1px solid #e0e6ef',
        display: 'grid',
        gridTemplateColumns: 'auto 1fr auto',
        alignItems: 'center',
        gap: '16px',
        padding: '0 20px',
        zIndex: 1000
      }}>
        {/* Resum/Historial toggle - far left */}
        <div style={{ display: 'flex', border: '1px solid #e0e6ef', borderRadius: '6px', overflow: 'hidden', justifySelf: 'start' }}>
          <button
            onClick={() => setCurrentView('resum')}
            style={{
              padding: '8px 16px',
              border: 'none',
              background: currentView === 'resum' ? '#4179b5' : '#fff',
              color: currentView === 'resum' ? '#fff' : '#333',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
          >
            Resum
          </button>
          <button
            onClick={() => setCurrentView('historial')}
            style={{
              padding: '8px 16px',
              border: 'none',
              background: currentView === 'historial' ? '#4179b5' : '#fff',
              color: currentView === 'historial' ? '#fff' : '#333',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
          >
            Historial
          </button>
        </div>

        {/* Summary stats centered */}
        <div style={{ display: 'flex', gap: '20px', justifySelf: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#28a745' }}></div>
            <span style={{ fontSize: '14px', color: '#666' }}>
              {buildingStats.filter(s => s.severity === 'ok').length} OK
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#ffc107' }}></div>
            <span style={{ fontSize: '14px', color: '#666' }}>
              {allAlerts.filter(a => a.severity === 'mitjà').length} Mitjà
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#dc3545' }}></div>
            <span style={{ fontSize: '14px', color: '#666' }}>
              {allAlerts.filter(a => a.severity === 'alt').length} Alt
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '14px', color: '#666', fontWeight: 600 }}>
              Total: {buildingStats.length} edificis
            </span>
          </div>
        </div>

        {/* Parameter icons group */}
        <div style={{ display: 'flex', gap: '12px', justifySelf: 'end' }}>
          <div 
            onClick={() => setParam('all' as ParamType)}
            style={{
              width: '40px',
              height: '40px',
              borderRadius: '50%',
              background: param === 'all' ? '#4179b5' : '#e0e6ef',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              transition: 'background-color 0.2s'
            }}
          >
            📊
          </div>
          <div 
            onClick={() => setParam('temperatura')}
            style={{
              width: '40px',
              height: '40px',
              borderRadius: '50%',
              background: param === 'temperatura' ? '#4179b5' : '#e0e6ef',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              transition: 'background-color 0.2s'
            }}
          >
            🌡️
          </div>
          <div 
            onClick={() => setParam('humitat')}
            style={{
              width: '40px',
              height: '40px',
              borderRadius: '50%',
              background: param === 'humitat' ? '#4179b5' : '#e0e6ef',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              transition: 'background-color 0.2s'
            }}
          >
            💧
          </div>
          <div 
            onClick={() => setParam('ppm')}
            style={{
              width: '40px',
              height: '40px',
              borderRadius: '50%',
              background: param === 'ppm' ? '#4179b5' : '#e0e6ef',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              transition: 'background-color 0.2s'
            }}
          >
            ⚗️
          </div>
        </div>
      </div>

      {/* Main content with top margin for fixed header */}
      <div className="page-container control-fullpage" style={{ marginTop: '60px', height: 'calc(100vh - 60px)', width: currentView === 'historial' ? '100vw' : undefined, boxSizing: 'border-box' }}>
        <div className="page-content" style={currentView === 'historial' ? { maxWidth: 'none', width: '100%', margin: 0, padding: 0, boxSizing: 'border-box' } : undefined}>
          {/* Removed extra parameter title to tighten spacing */}

          {/* Loading / Error */}
          <div>
            {sensorLoading && <span style={{ color: '#666' }}>Cargando sensores...</span>}
            {sensorError && <span style={{ color: '#d32f2f' }}>Error: {sensorError}</span>}
          </div>

          {/* Conditional rendering based on current view */}
          {currentView === 'resum' ? (
            <div className="content-card flat">
              <div className="control-two-col">
                <main className="main-content">
                  <div className="building-cards-grid fill-height">
                    {buildingStats.map((stat) => (
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
                  alerts={allAlerts}
                  paramType={param}
                  title="Alertes Globals"
                  subtitle="Resum d'alertes a tots els edificis."
                  className="alerts-panel"
                  emptyMessage="Sin Alertes en el sistema."
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
    </div>
  );
};

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
