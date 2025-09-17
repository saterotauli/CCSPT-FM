import React, { useState } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  TimeScale,
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import 'chartjs-adapter-date-fns';

// Registrar los componentes necesarios
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  TimeScale
);

interface SensorDataPoint {
  timestamp: Date;
  temperature: number;
  humidity: number;
  ppm: number;
  minTemp?: number;
  maxTemp?: number;
  minHumidity?: number;
  maxHumidity?: number;
  minPpm?: number;
  maxPpm?: number;
}

// Tipos de severidad
type Severity = 'ok' | 'mitjà' | 'alt';

// Rangos de severidad para cada parámetro
const SEVERITY_RANGES = {
  temperatura: {
    min: 18,
    max: 26,
    range: 8
  },
  humitat: {
    min: 30,
    max: 70,
    range: 40
  },
  ppm: {
    min: 300,
    max: 800,
    range: 500
  }
};

interface SensorHistoryChartProps {
  data: SensorDataPoint[];
  deviceName: string;
  isVisible: boolean;
  onClose: () => void;
  activeParameter: 'temperatura' | 'humitat' | 'ppm';
  roomInfo?: {
    spaceGuid?: string;
    roomType?: string;
    planta?: string;
    departament?: string;
    edifici?: string;
  };
}

const SensorHistoryChart: React.FC<SensorHistoryChartProps> = ({
  data,
  deviceName,
  isVisible,
  onClose,
  activeParameter,
  roomInfo
}) => {
  const [timeScale, setTimeScale] = useState<'realtime' | 'hour' | 'day' | 'week' | 'month'>('realtime');

  // Función para calcular la severidad de un valor
  const calculateSeverity = (value: number, parameter: 'temperatura' | 'humitat' | 'ppm'): Severity => {
    const ranges = SEVERITY_RANGES[parameter];
    const range10Percent = ranges.range * 0.1;
    
    if (value > ranges.max + range10Percent || value < ranges.min - range10Percent) {
      return 'alt';
    } else if (value > ranges.max || value < ranges.min) {
      return 'mitjà';
    } else {
      return 'ok';
    }
  };

  // Función para obtener el color según la severidad
  const getSeverityColor = (severity: Severity): string => {
    switch (severity) {
      case 'ok': return '#36a2eb'; // Azul normal
      case 'mitjà': return '#ff9f40'; // Naranja
      case 'alt': return '#ff6384'; // Rojo
      default: return '#36a2eb';
    }
  };

  // Función para obtener valores base específicos de la habitación
  const getRoomSpecificBaseValues = () => {
    if (!roomInfo) {
      return { temperature: 22.0, humidity: 50.0, ppm: 450.0 };
    }

    const roomType = roomInfo.roomType?.toLowerCase() || '';
    const planta = roomInfo.planta?.toLowerCase() || '';
    const departament = roomInfo.departament?.toLowerCase() || '';
    const edifici = roomInfo.edifici?.toLowerCase() || '';
    
    // Valores base según tipo de habitación
    let baseValues = { temperature: 22.0, humidity: 50.0, ppm: 450.0 };
    
    if (roomType.includes('quiròfan') || roomType.includes('quirofan')) {
      baseValues = { temperature: 20.0, humidity: 50.0, ppm: 400.0 };
    } else if (roomType.includes('hospit') || roomType.includes('habitació')) {
      baseValues = { temperature: 22.0, humidity: 50.0, ppm: 450.0 };
    } else if (roomType.includes('magatzem') || roomType.includes('mgtz')) {
      baseValues = { temperature: 20.0, humidity: 45.0, ppm: 500.0 };
    } else if (roomType.includes('oficina') || roomType.includes('despatx')) {
      baseValues = { temperature: 23.0, humidity: 50.0, ppm: 480.0 };
    } else if (roomType.includes('cuina') || roomType.includes('cocina')) {
      baseValues = { temperature: 25.0, humidity: 60.0, ppm: 700.0 };
    } else if (roomType.includes('bany') || roomType.includes('aseo')) {
      baseValues = { temperature: 22.0, humidity: 65.0, ppm: 600.0 };
    } else if (roomType.includes('sala') && roomType.includes('màquines')) {
      baseValues = { temperature: 24.0, humidity: 45.0, ppm: 550.0 };
    } else if (roomType.includes('comitè') || roomType.includes('reunió')) {
      baseValues = { temperature: 21.0, humidity: 55.0, ppm: 500.0 };
    }
    
    // Ajustes según planta (pisos más altos suelen ser más cálidos)
    if (planta.includes('p') && !isNaN(parseInt(planta.replace('p', '')))) {
      const floorNumber = parseInt(planta.replace('p', ''));
      baseValues.temperature += floorNumber * 0.5; // +0.5°C por piso
    }
    
    // Ajustes según departamento
    if (departament.includes('informàtic') || departament.includes('informatic')) {
      baseValues.temperature += 1.0; // Salas de informática más cálidas
      baseValues.ppm += 50; // Más CO2 por equipos
    } else if (departament.includes('mèdic') || departament.includes('medic')) {
      baseValues.temperature -= 0.5; // Áreas médicas más frías
      baseValues.humidity -= 5; // Menos humedad
    }
    
    // Ajustes según edificio
    if (edifici.includes('tau')) {
      baseValues.temperature += 0.5; // Edificio TAU ligeramente más cálido
    }
    
    // Agregar variación única basada en el GUID de la habitación
    if (roomInfo.spaceGuid) {
      const guidHash = roomInfo.spaceGuid.split('').reduce((a, b) => {
        a = ((a << 5) - a) + b.charCodeAt(0);
        return a & a;
      }, 0);
      
      const variation = (Math.abs(guidHash) % 100) / 100; // 0-1
      baseValues.temperature += (variation - 0.5) * 2; // ±1°C
      baseValues.humidity += (variation - 0.5) * 10; // ±5%
      baseValues.ppm += (variation - 0.5) * 100; // ±50 ppm
    }
    
    return baseValues;
  };
  
  if (!isVisible) return null;

  // Función para obtener patrones de variación específicos de la habitación
  const getRoomVariationPattern = () => {
    if (!roomInfo) {
      return {
        dailyAmplitude: 3,
        randomVariation: 2,
        phaseShift: 0,
        frequency: 1,
        noiseLevel: 0.5
      };
    }

    const roomType = roomInfo.roomType?.toLowerCase() || '';
    const planta = roomInfo.planta?.toLowerCase() || '';
    const departament = roomInfo.departament?.toLowerCase() || '';
    
    // Patrones base según tipo de habitación
    let pattern = {
      dailyAmplitude: 3,    // Variación diaria en °C
      randomVariation: 2,   // Variación aleatoria
      phaseShift: 0,        // Desplazamiento de fase (horas)
      frequency: 1,         // Frecuencia de variación
      noiseLevel: 0.5       // Nivel de ruido
    };
    
    // Patrones específicos por tipo de habitación
    if (roomType.includes('quiròfan') || roomType.includes('quirofan')) {
      pattern = { dailyAmplitude: 1, randomVariation: 0.5, phaseShift: 0, frequency: 0.5, noiseLevel: 0.2 };
    } else if (roomType.includes('hospit') || roomType.includes('habitació')) {
      pattern = { dailyAmplitude: 2, randomVariation: 1, phaseShift: 1, frequency: 0.8, noiseLevel: 0.3 };
    } else if (roomType.includes('magatzem') || roomType.includes('mgtz')) {
      pattern = { dailyAmplitude: 1.5, randomVariation: 0.8, phaseShift: 2, frequency: 0.6, noiseLevel: 0.4 };
    } else if (roomType.includes('oficina') || roomType.includes('despatx')) {
      pattern = { dailyAmplitude: 4, randomVariation: 2.5, phaseShift: 3, frequency: 1.2, noiseLevel: 0.8 };
    } else if (roomType.includes('cuina') || roomType.includes('cocina')) {
      pattern = { dailyAmplitude: 6, randomVariation: 3, phaseShift: 4, frequency: 1.5, noiseLevel: 1.0 };
    } else if (roomType.includes('bany') || roomType.includes('aseo')) {
      pattern = { dailyAmplitude: 2.5, randomVariation: 1.5, phaseShift: 5, frequency: 0.9, noiseLevel: 0.6 };
    } else if (roomType.includes('sala') && roomType.includes('màquines')) {
      pattern = { dailyAmplitude: 5, randomVariation: 2, phaseShift: 6, frequency: 1.3, noiseLevel: 0.7 };
    } else if (roomType.includes('comitè') || roomType.includes('reunió')) {
      pattern = { dailyAmplitude: 3.5, randomVariation: 1.8, phaseShift: 7, frequency: 1.1, noiseLevel: 0.5 };
    }
    
    // Ajustes según planta
    if (planta.includes('p') && !isNaN(parseInt(planta.replace('p', '')))) {
      const floorNumber = parseInt(planta.replace('p', ''));
      pattern.dailyAmplitude += floorNumber * 0.3; // Pisos más altos más variables
      pattern.phaseShift += floorNumber * 0.5; // Diferente timing por piso
    }
    
    // Ajustes según departamento
    if (departament.includes('informàtic') || departament.includes('informatic')) {
      pattern.dailyAmplitude += 1; // Más variación por equipos
      pattern.randomVariation += 0.5;
    } else if (departament.includes('mèdic') || departament.includes('medic')) {
      pattern.dailyAmplitude *= 0.7; // Menos variación en áreas médicas
      pattern.randomVariation *= 0.6;
    }
    
    // Variación única basada en el GUID
    if (roomInfo.spaceGuid) {
      const guidHash = roomInfo.spaceGuid.split('').reduce((a, b) => {
        a = ((a << 5) - a) + b.charCodeAt(0);
        return a & a;
      }, 0);
      
      const variation = (Math.abs(guidHash) % 100) / 100;
      pattern.phaseShift += variation * 12; // 0-12 horas de desplazamiento
      pattern.frequency += (variation - 0.5) * 0.5; // ±0.25 en frecuencia
      pattern.noiseLevel += (variation - 0.5) * 0.3; // ±0.15 en ruido
    }
    
    return pattern;
  };

  // Función para obtener variación entre períodos (días, semanas, meses)
  const getPeriodVariation = (periodIndex: number, scale: string) => {
    if (!roomInfo) {
      return { tempVariation: 0, humidityVariation: 0, ppmVariation: 0 };
    }

    // Crear un seed único para cada período basado en el GUID de la habitación
    const guidHash = roomInfo.spaceGuid ? 
      roomInfo.spaceGuid.split('').reduce((a, b) => { a = ((a << 5) - a) + b.charCodeAt(0); return a & a; }, 0) : 0;
    
    const periodSeed = guidHash + periodIndex * 1000;
    
    // Variación diferente según la escala
    let baseVariation = 0;
    switch (scale) {
      case 'day':
        baseVariation = 3; // ±3°C entre días
        break;
      case 'week':
        baseVariation = 5; // ±5°C entre semanas
        break;
      case 'month':
        baseVariation = 8; // ±8°C entre meses
        break;
      default:
        baseVariation = 1;
    }
    
    // Generar variación pseudo-aleatoria pero consistente
    const tempVariation = (Math.sin(periodSeed * 0.1) * baseVariation) + 
                         (Math.sin(periodSeed * 0.3) * baseVariation * 0.5);
    const humidityVariation = (Math.cos(periodSeed * 0.15) * baseVariation * 2) + 
                             (Math.cos(periodSeed * 0.25) * baseVariation);
    const ppmVariation = (Math.sin(periodSeed * 0.2) * baseVariation * 20) + 
                        (Math.sin(periodSeed * 0.4) * baseVariation * 10);
    
    return { tempVariation, humidityVariation, ppmVariation };
  };

  // Función para generar datos jerárquicos por escala
  const generateHierarchicalData = (baseData: SensorDataPoint[], scale: string) => {
    const sampleData: any[] = [];
    
    // Usar valores específicos de la habitación si están disponibles
    const roomBaseValues = getRoomSpecificBaseValues();
    const baseTemp = baseData.length > 0 ? baseData[0]?.temperature || roomBaseValues.temperature : roomBaseValues.temperature;
    const baseHumidity = baseData.length > 0 ? baseData[0]?.humidity || roomBaseValues.humidity : roomBaseValues.humidity;
    const basePpm = baseData.length > 0 ? baseData[0]?.ppm || roomBaseValues.ppm : roomBaseValues.ppm;
    
    // Obtener patrón de variación específico de la habitación
    const variationPattern = getRoomVariationPattern();
    
    const now = new Date();
    
    if (scale === 'realtime') {
      // Temps real: 12 puntos cada 5 minutos (última hora)
      const startTime = new Date(now.getTime() - 60 * 60 * 1000);
      
      for (let j = 0; j < 12; j++) {
        const pointTime = new Date(startTime.getTime() + (j * 5 * 60 * 1000));
        const hour = pointTime.getHours();
        const seed = Math.floor(pointTime.getTime() / (5 * 60 * 1000));
        
        // Usar patrones específicos de la habitación
        const adjustedHour = (hour + variationPattern.phaseShift) % 24;
        const dailyVariation = Math.sin((adjustedHour - 6) * Math.PI / 12) * variationPattern.dailyAmplitude;
        const pseudoRandom1 = Math.sin(seed * 0.1 * variationPattern.frequency) * 0.5 + 0.5;
        const pseudoRandom2 = Math.sin(seed * 0.15 * variationPattern.frequency) * 0.5 + 0.5;
        const pseudoRandom3 = Math.sin(seed * 0.2 * variationPattern.frequency) * 0.5 + 0.5;
        
        const randomVariation = (pseudoRandom1 - 0.5) * variationPattern.randomVariation;
        const intraHourVariation = (pseudoRandom2 - 0.5) * variationPattern.noiseLevel;
        const humidityVariation = (pseudoRandom3 - 0.5) * variationPattern.noiseLevel * 10;
        
        const finalTemperature = Math.max(15, Math.min(35, baseTemp + dailyVariation + randomVariation + intraHourVariation));
        const finalHumidity = Math.max(20, Math.min(80, baseHumidity + humidityVariation));
        const finalPpm = Math.max(300, Math.min(800, basePpm + (pseudoRandom1 - 0.5) * variationPattern.noiseLevel * 100));
        
        sampleData.push({
          timestamp: pointTime,
          temperature: Math.round(finalTemperature * 10) / 10,
          humidity: Math.round(finalHumidity * 10) / 10,
          ppm: Math.round(finalPpm),
        });
      }
    } else if (scale === 'hour') {
      // Hores: 24 registros con min/max/promedio por hora
      for (let i = 0; i < 24; i++) {
        const hourTimestamp = new Date(now.getTime() - (23 - i) * 60 * 60 * 1000);
        const hour = hourTimestamp.getHours();
        const hourSeed = Math.floor(hourTimestamp.getTime() / (60 * 60 * 1000));
        
        // Generar datos de 6 puntos por hora (cada 10 minutos) para calcular min/max/promedio
        const hourlyData: SensorDataPoint[] = [];
        
        for (let m = 0; m < 6; m++) {
          const minuteTimestamp = new Date(hourTimestamp.getTime() + m * 10 * 60 * 1000);
          const minuteSeed = hourSeed * 6 + m;
          
          // Usar patrones específicos de la habitación
          const adjustedHour = (hour + variationPattern.phaseShift) % 24;
          const dailyVariation = Math.sin((adjustedHour - 6) * Math.PI / 12) * variationPattern.dailyAmplitude;
          const pseudoRandom1 = Math.sin(minuteSeed * 0.1 * variationPattern.frequency) * 0.5 + 0.5;
          const pseudoRandom2 = Math.sin(minuteSeed * 0.15 * variationPattern.frequency) * 0.5 + 0.5;
          const pseudoRandom3 = Math.sin(minuteSeed * 0.2 * variationPattern.frequency) * 0.5 + 0.5;
          
          const randomVariation = (pseudoRandom1 - 0.5) * variationPattern.randomVariation;
          const intraHourVariation = (pseudoRandom2 - 0.5) * variationPattern.noiseLevel;
          const humidityVariation = (pseudoRandom3 - 0.5) * variationPattern.noiseLevel * 10;
          
          const finalTemperature = Math.max(15, Math.min(35, baseTemp + dailyVariation + randomVariation + intraHourVariation));
          const finalHumidity = Math.max(20, Math.min(80, baseHumidity + humidityVariation));
          const finalPpm = Math.max(300, Math.min(800, basePpm + (pseudoRandom1 - 0.5) * variationPattern.noiseLevel * 100));
          
          hourlyData.push({
            timestamp: minuteTimestamp,
            temperature: finalTemperature,
            humidity: finalHumidity,
            ppm: finalPpm,
          });
        }
        
        // Calcular min/max/promedio para esta hora
        const avgTimestamp = new Date(hourTimestamp.getTime() + 30 * 60 * 1000); // Mitad de la hora
        
        sampleData.push({
          timestamp: avgTimestamp,
          temperature: Math.round((hourlyData.reduce((sum, p) => sum + p.temperature, 0) / hourlyData.length) * 10) / 10,
          humidity: Math.round((hourlyData.reduce((sum, p) => sum + p.humidity, 0) / hourlyData.length) * 10) / 10,
          ppm: Math.round(hourlyData.reduce((sum, p) => sum + p.ppm, 0) / hourlyData.length),
          minTemp: Math.round(Math.min(...hourlyData.map(p => p.temperature)) * 10) / 10,
          maxTemp: Math.round(Math.max(...hourlyData.map(p => p.temperature)) * 10) / 10,
          minHumidity: Math.round(Math.min(...hourlyData.map(p => p.humidity)) * 10) / 10,
          maxHumidity: Math.round(Math.max(...hourlyData.map(p => p.humidity)) * 10) / 10,
          minPpm: Math.round(Math.min(...hourlyData.map(p => p.ppm))),
          maxPpm: Math.round(Math.max(...hourlyData.map(p => p.ppm))),
        });
      }
    } else if (scale === 'day') {
      // Dies: 7 registros (uno por día de la semana)
      for (let i = 0; i < 7; i++) {
        const dayTimestamp = new Date(now.getTime() - (6 - i) * 24 * 60 * 60 * 1000);
        const daySeed = Math.floor(dayTimestamp.getTime() / (24 * 60 * 60 * 1000));
        
        // Obtener variación específica para este día
        const periodVariation = getPeriodVariation(i, 'day');
        const adjustedBaseTemp = baseTemp + periodVariation.tempVariation;
        const adjustedBaseHumidity = baseHumidity + periodVariation.humidityVariation;
        const adjustedBasePpm = basePpm + periodVariation.ppmVariation;
        
        // Agregar datos de 24 horas para calcular min/max/promedio
        const dailyData: SensorDataPoint[] = [];
        
        for (let h = 0; h < 24; h++) {
          const hourTimestamp = new Date(dayTimestamp.getTime() + h * 60 * 60 * 1000);
          const hour = hourTimestamp.getHours();
          const hourSeed = daySeed * 24 + h;
          
          // Usar patrones específicos de la habitación
          const adjustedHour = (hour + variationPattern.phaseShift) % 24;
          const dailyVariation = Math.sin((adjustedHour - 6) * Math.PI / 12) * variationPattern.dailyAmplitude;
          const pseudoRandom1 = Math.sin(hourSeed * 0.1 * variationPattern.frequency) * 0.5 + 0.5;
          const pseudoRandom2 = Math.sin(hourSeed * 0.15 * variationPattern.frequency) * 0.5 + 0.5;
          const pseudoRandom3 = Math.sin(hourSeed * 0.2 * variationPattern.frequency) * 0.5 + 0.5;
          
          const randomVariation = (pseudoRandom1 - 0.5) * variationPattern.randomVariation;
          const intraHourVariation = (pseudoRandom2 - 0.5) * variationPattern.noiseLevel;
          const humidityVariation = (pseudoRandom3 - 0.5) * variationPattern.noiseLevel * 10;
          
          const finalTemperature = Math.max(15, Math.min(35, adjustedBaseTemp + dailyVariation + randomVariation + intraHourVariation));
          const finalHumidity = Math.max(20, Math.min(80, adjustedBaseHumidity + humidityVariation));
          const finalPpm = Math.max(300, Math.min(800, adjustedBasePpm + (pseudoRandom1 - 0.5) * variationPattern.noiseLevel * 100));
          
          dailyData.push({
            timestamp: hourTimestamp,
            temperature: finalTemperature,
            humidity: finalHumidity,
            ppm: finalPpm,
          });
        }
        
        // Calcular min/max/promedio para este día - posicionar en las 14:00 para mejor centrado visual
        const avgTimestamp = new Date(dayTimestamp.getTime() + 14 * 60 * 60 * 1000); // 14:00
        
        // Calcular valores con validación para asegurar min < max
        const temperatures = dailyData.map(p => p.temperature);
        const humidities = dailyData.map(p => p.humidity);
        const ppms = dailyData.map(p => p.ppm);
        
        const minTemp = Math.min(...temperatures);
        const maxTemp = Math.max(...temperatures);
        const avgTemp = temperatures.reduce((sum, t) => sum + t, 0) / temperatures.length;
        
        // Asegurar que minTemp < maxTemp con una diferencia mínima
        const finalMinTemp = Math.min(minTemp, avgTemp - 0.5);
        const finalMaxTemp = Math.max(maxTemp, avgTemp + 0.5);
        
        sampleData.push({
          timestamp: avgTimestamp,
          temperature: Math.round(avgTemp * 10) / 10,
          humidity: Math.round((humidities.reduce((sum, h) => sum + h, 0) / humidities.length) * 10) / 10,
          ppm: Math.round(ppms.reduce((sum, p) => sum + p, 0) / ppms.length),
          minTemp: Math.round(finalMinTemp * 10) / 10,
          maxTemp: Math.round(finalMaxTemp * 10) / 10,
          minHumidity: Math.round(Math.min(...humidities) * 10) / 10,
          maxHumidity: Math.round(Math.max(...humidities) * 10) / 10,
          minPpm: Math.round(Math.min(...ppms)),
          maxPpm: Math.round(Math.max(...ppms)),
        });
      }
    } else if (scale === 'week') {
      // Setmanes: 5 registros (una semana cada una)
      for (let i = 0; i < 5; i++) {
        const weekStart = new Date(now.getTime() - (4 - i) * 7 * 24 * 60 * 60 * 1000);
        const weekSeed = Math.floor(weekStart.getTime() / (7 * 24 * 60 * 60 * 1000));
        
        // Obtener variación específica para esta semana
        const periodVariation = getPeriodVariation(i, 'week');
        const adjustedBaseTemp = baseTemp + periodVariation.tempVariation;
        const adjustedBaseHumidity = baseHumidity + periodVariation.humidityVariation;
        const adjustedBasePpm = basePpm + periodVariation.ppmVariation;
        
        // Agregar datos de 7 días para calcular min/max/promedio
        const weeklyData: SensorDataPoint[] = [];
        
        for (let d = 0; d < 7; d++) {
          const dayTimestamp = new Date(weekStart.getTime() + d * 24 * 60 * 60 * 1000);
          const daySeed = weekSeed * 7 + d;
          
          // Muestrear 3 horas por día (mañana, mediodía, noche)
          for (let h of [6, 12, 18]) {
            const hourTimestamp = new Date(dayTimestamp.getTime() + h * 60 * 60 * 1000);
            const hourSeed = daySeed * 3 + (h / 6 - 1);
            
            // Usar patrones específicos de la habitación
            const adjustedHour = (h + variationPattern.phaseShift) % 24;
            const dailyVariation = Math.sin((adjustedHour - 6) * Math.PI / 12) * variationPattern.dailyAmplitude;
            const pseudoRandom1 = Math.sin(hourSeed * 0.1 * variationPattern.frequency) * 0.5 + 0.5;
            const pseudoRandom2 = Math.sin(hourSeed * 0.15 * variationPattern.frequency) * 0.5 + 0.5;
            const pseudoRandom3 = Math.sin(hourSeed * 0.2 * variationPattern.frequency) * 0.5 + 0.5;
            
            const randomVariation = (pseudoRandom1 - 0.5) * variationPattern.randomVariation;
            const intraHourVariation = (pseudoRandom2 - 0.5) * variationPattern.noiseLevel;
            const humidityVariation = (pseudoRandom3 - 0.5) * variationPattern.noiseLevel * 10;
            
            const finalTemperature = Math.max(15, Math.min(35, adjustedBaseTemp + dailyVariation + randomVariation + intraHourVariation));
            const finalHumidity = Math.max(20, Math.min(80, adjustedBaseHumidity + humidityVariation));
            const finalPpm = Math.max(300, Math.min(800, adjustedBasePpm + (pseudoRandom1 - 0.5) * variationPattern.noiseLevel * 100));
            
            weeklyData.push({
              timestamp: hourTimestamp,
              temperature: finalTemperature,
              humidity: finalHumidity,
              ppm: finalPpm,
            });
          }
        }
        
        // Calcular min/max/promedio para esta semana - posicionar en el día 4 para mejor centrado visual
        const avgTimestamp = new Date(weekStart.getTime() + 4 * 24 * 60 * 60 * 1000); // Día 4 de la semana
        
        // Calcular valores con validación para asegurar min < max
        const temperatures = weeklyData.map(p => p.temperature);
        const humidities = weeklyData.map(p => p.humidity);
        const ppms = weeklyData.map(p => p.ppm);
        
        const minTemp = Math.min(...temperatures);
        const maxTemp = Math.max(...temperatures);
        const avgTemp = temperatures.reduce((sum, t) => sum + t, 0) / temperatures.length;
        
        // Asegurar que minTemp < maxTemp con una diferencia mínima
        const finalMinTemp = Math.min(minTemp, avgTemp - 0.8);
        const finalMaxTemp = Math.max(maxTemp, avgTemp + 0.8);
        
        sampleData.push({
          timestamp: avgTimestamp,
          temperature: Math.round(avgTemp * 10) / 10,
          humidity: Math.round((humidities.reduce((sum, h) => sum + h, 0) / humidities.length) * 10) / 10,
          ppm: Math.round(ppms.reduce((sum, p) => sum + p, 0) / ppms.length),
          minTemp: Math.round(finalMinTemp * 10) / 10,
          maxTemp: Math.round(finalMaxTemp * 10) / 10,
          minHumidity: Math.round(Math.min(...humidities) * 10) / 10,
          maxHumidity: Math.round(Math.max(...humidities) * 10) / 10,
          minPpm: Math.round(Math.min(...ppms)),
          maxPpm: Math.round(Math.max(...ppms)),
        });
      }
    } else if (scale === 'month') {
      // Mesos: 12 registros (últimos 12 meses)
      for (let i = 0; i < 12; i++) {
        const monthStart = new Date(now.getFullYear(), now.getMonth() - (11 - i), 1);
        const monthSeed = monthStart.getFullYear() * 12 + monthStart.getMonth();
        
        // Obtener variación específica para este mes
        const periodVariation = getPeriodVariation(i, 'month');
        const adjustedBaseTemp = baseTemp + periodVariation.tempVariation;
        const adjustedBaseHumidity = baseHumidity + periodVariation.humidityVariation;
        const adjustedBasePpm = basePpm + periodVariation.ppmVariation;
        
        // Agregar datos de 4 semanas para calcular min/max/promedio
        const monthlyData: SensorDataPoint[] = [];
        
        for (let w = 0; w < 4; w++) {
          const weekStart = new Date(monthStart.getTime() + w * 7 * 24 * 60 * 60 * 1000);
          const weekSeed = monthSeed * 4 + w;
          
          // Muestrear 1 día por semana (miércoles)
          const dayTimestamp = new Date(weekStart.getTime() + 3 * 24 * 60 * 60 * 1000);
          const daySeed = weekSeed;
          
          // Muestrear 3 horas por día
          for (let h of [6, 12, 18]) {
            const hourTimestamp = new Date(dayTimestamp.getTime() + h * 60 * 60 * 1000);
            const hourSeed = daySeed * 3 + (h / 6 - 1);
            
            // Usar patrones específicos de la habitación
            const adjustedHour = (h + variationPattern.phaseShift) % 24;
            const dailyVariation = Math.sin((adjustedHour - 6) * Math.PI / 12) * variationPattern.dailyAmplitude;
            const pseudoRandom1 = Math.sin(hourSeed * 0.1 * variationPattern.frequency) * 0.5 + 0.5;
            const pseudoRandom2 = Math.sin(hourSeed * 0.15 * variationPattern.frequency) * 0.5 + 0.5;
            const pseudoRandom3 = Math.sin(hourSeed * 0.2 * variationPattern.frequency) * 0.5 + 0.5;
            
            const randomVariation = (pseudoRandom1 - 0.5) * variationPattern.randomVariation;
            const intraHourVariation = (pseudoRandom2 - 0.5) * variationPattern.noiseLevel;
            const humidityVariation = (pseudoRandom3 - 0.5) * variationPattern.noiseLevel * 10;
            
            const finalTemperature = Math.max(15, Math.min(35, adjustedBaseTemp + dailyVariation + randomVariation + intraHourVariation));
            const finalHumidity = Math.max(20, Math.min(80, adjustedBaseHumidity + humidityVariation));
            const finalPpm = Math.max(300, Math.min(800, adjustedBasePpm + (pseudoRandom1 - 0.5) * variationPattern.noiseLevel * 100));
            
            monthlyData.push({
              timestamp: hourTimestamp,
              temperature: finalTemperature,
              humidity: finalHumidity,
              ppm: finalPpm,
            });
          }
        }
        
        // Calcular min/max/promedio para este mes - posicionar en el día 20 para mejor centrado visual
        const avgTimestamp = new Date(monthStart.getTime() + 20 * 24 * 60 * 60 * 1000); // Día 20 del mes
        
        // Calcular valores con validación para asegurar min < max
        const temperatures = monthlyData.map(p => p.temperature);
        const humidities = monthlyData.map(p => p.humidity);
        const ppms = monthlyData.map(p => p.ppm);
        
        const minTemp = Math.min(...temperatures);
        const maxTemp = Math.max(...temperatures);
        const avgTemp = temperatures.reduce((sum, t) => sum + t, 0) / temperatures.length;
        
        // Asegurar que minTemp < maxTemp con una diferencia mínima
        const finalMinTemp = Math.min(minTemp, avgTemp - 1);
        const finalMaxTemp = Math.max(maxTemp, avgTemp + 1);
        
        sampleData.push({
          timestamp: avgTimestamp,
          temperature: Math.round(avgTemp * 10) / 10,
          humidity: Math.round((humidities.reduce((sum, h) => sum + h, 0) / humidities.length) * 10) / 10,
          ppm: Math.round(ppms.reduce((sum, p) => sum + p, 0) / ppms.length),
          minTemp: Math.round(finalMinTemp * 10) / 10,
          maxTemp: Math.round(finalMaxTemp * 10) / 10,
          minHumidity: Math.round(Math.min(...humidities) * 10) / 10,
          maxHumidity: Math.round(Math.max(...humidities) * 10) / 10,
          minPpm: Math.round(Math.min(...ppms)),
          maxPpm: Math.round(Math.max(...ppms)),
        });
      }
    }
    
    return sampleData;
  };

  // Función para agrupar datos por período según la escala de tiempo
  const groupDataByTimeScale = (data: SensorDataPoint[], scale: string) => {
    // Usar la nueva función de datos jerárquicos
    return generateHierarchicalData(data, scale);
  };

  // Procesar datos según la escala de tiempo
  const processedData = groupDataByTimeScale(data, timeScale);
  
  // Debug: mostrar los datos procesados
  console.log('Processed data for', activeParameter, ':', processedData.slice(0, 3));
  if (activeParameter === 'temperatura' && processedData.length > 0) {
    console.log('Temperature data sample:', {
      min: processedData[0].minTemp,
      max: processedData[0].maxTemp,
      avg: processedData[0].temperature
    });
  }

  // Función para obtener la configuración del dataset según el parámetro activo
  const getDatasetConfig = (): any[] => {
    switch (activeParameter) {
      case 'temperatura':
        if (timeScale === 'realtime') {
          // Para tiempo real, mostrar solo línea de temperatura actual con colores de severidad
          const temperatureData = processedData.map(point => point.temperature);
          const pointBackgroundColors = temperatureData.map(value => 
            getSeverityColor(calculateSeverity(value, 'temperatura'))
          );
          const pointBorderColors = temperatureData.map(value => 
            getSeverityColor(calculateSeverity(value, 'temperatura'))
          );
          
          return [{
            label: 'Temperatura (°C)',
            data: temperatureData,
            borderColor: 'rgb(54, 162, 235)',
            backgroundColor: 'rgba(54, 162, 235, 0.1)',
            pointBackgroundColor: pointBackgroundColors,
            pointBorderColor: pointBorderColors,
            pointRadius: 6,
            pointHoverRadius: 8,
            yAxisID: 'y',
            tension: 0.1,
            type: 'line' as const,
          }];
        } else {
          // Para escalas históricas, mostrar min/max/promedio con indicadores de severidad
          const minTempData = processedData.map(point => (point as any).minTemp || point.temperature);
          const maxTempData = processedData.map(point => (point as any).maxTemp || point.temperature);
          const avgTempData = processedData.map(point => point.temperature);
          
          const avgTempColors = avgTempData.map(value => 
            getSeverityColor(calculateSeverity(value, 'temperatura'))
          );
          
          return [
            {
              label: 'Temperatura Mínima (°C)',
              data: minTempData,
              borderColor: 'rgb(75, 192, 192)',
              backgroundColor: 'rgba(75, 192, 192, 0.3)',
              yAxisID: 'y',
              type: 'bar' as const,
              barThickness: 15,
              maxBarThickness: 15,
            },
            {
              label: 'Temperatura Máxima (°C)',
              data: maxTempData,
              borderColor: 'rgb(255, 99, 132)',
              backgroundColor: 'rgba(255, 99, 132, 0.3)',
              yAxisID: 'y',
              type: 'bar' as const,
              barThickness: 15,
              maxBarThickness: 15,
            },
            {
              label: 'Temperatura Promedio (°C)',
              data: avgTempData,
              borderColor: 'rgb(128, 0, 128)',
              backgroundColor: 'rgba(128, 0, 128, 0.1)',
              pointBackgroundColor: avgTempColors,
              pointBorderColor: avgTempColors,
              pointRadius: 6,
              pointHoverRadius: 8,
              yAxisID: 'y',
              tension: 0.1,
              type: 'line' as const,
            }
          ];
        }
      case 'humitat':
        const humidityData = processedData.map(point => point.humidity);
        const humidityPointColors = humidityData.map(value => 
          getSeverityColor(calculateSeverity(value, 'humitat'))
        );
        
        return [{
          label: 'Humitat (%)',
          data: humidityData,
          borderColor: 'rgb(255, 159, 64)',
          backgroundColor: 'rgba(255, 159, 64, 0.1)',
          pointBackgroundColor: humidityPointColors,
          pointBorderColor: humidityPointColors,
          pointRadius: 6,
          pointHoverRadius: 8,
          yAxisID: 'y',
          tension: 0.1,
          type: 'line' as const,
        }];
      case 'ppm':
        const ppmData = processedData.map(point => point.ppm);
        const ppmPointColors = ppmData.map(value => 
          getSeverityColor(calculateSeverity(value, 'ppm'))
        );
        
        return [{
          label: 'CO₂ (PPM)',
          data: ppmData,
          borderColor: 'rgb(75, 192, 192)',
          backgroundColor: 'rgba(75, 192, 192, 0.1)',
          pointBackgroundColor: ppmPointColors,
          pointBorderColor: ppmPointColors,
          pointRadius: 6,
          pointHoverRadius: 8,
          yAxisID: 'y',
          tension: 0.1,
          type: 'line' as const,
        }];
      default:
        const defaultData = processedData.map(point => point.temperature);
        const defaultPointColors = defaultData.map(value => 
          getSeverityColor(calculateSeverity(value, 'temperatura'))
        );
        
        return [{
          label: 'Temperatura (°C)',
          data: defaultData,
          borderColor: 'rgb(54, 162, 235)',
          backgroundColor: 'rgba(54, 162, 235, 0.1)',
          pointBackgroundColor: defaultPointColors,
          pointBorderColor: defaultPointColors,
          pointRadius: 6,
          pointHoverRadius: 8,
          yAxisID: 'y',
          tension: 0.1,
          type: 'line' as const,
        }];
    }
  };

  // Preparar datos para el gráfico
  const chartData = {
    labels: processedData.map(point => point.timestamp),
    datasets: getDatasetConfig(),
  };

  // Función para obtener la configuración de la escala Y según el parámetro activo
  const getYScaleConfig = () => {
    switch (activeParameter) {
      case 'temperatura':
        return {
          type: 'linear' as const,
          display: true,
          position: 'left' as const,
          title: {
            display: true,
            text: 'Temperatura (°C)'
          },
          min: 15,
          max: 35,
        };
      case 'humitat':
        return {
          type: 'linear' as const,
          display: true,
          position: 'left' as const,
          title: {
            display: true,
            text: 'Humitat (%)'
          },
          min: 0,
          max: 100,
        };
      case 'ppm':
        return {
          type: 'linear' as const,
          display: true,
          position: 'left' as const,
          title: {
            display: true,
            text: 'CO₂ (PPM)'
          },
          min: 0,
          max: 1000,
        };
      default:
        return {
          type: 'linear' as const,
          display: true,
          position: 'left' as const,
          title: {
            display: true,
            text: 'Temperatura (°C)'
          },
          min: 15,
          max: 35,
        };
    }
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      mode: 'index' as const,
      intersect: false,
    },
    layout: {
      padding: {
        left: 10,
        right: 10,
        top: 10,
        bottom: 10
      }
    },
    plugins: {
      title: {
        display: true,
        text: `${deviceName} - ${activeParameter === 'temperatura' ? 'Temperatura' : activeParameter === 'humitat' ? 'Humitat' : 'CO₂'}`,
        font: {
          size: 24,
          weight: 'bold' as const,
        },
      },
      legend: {
        display: true,
        position: 'top' as const,
      },
      tooltip: {
        callbacks: {
          title: function(context: any) {
            try {
              // Obtener el timestamp del punto de datos
              const dataIndex = context[0].dataIndex;
              const timestamp = processedData[dataIndex]?.timestamp;
              
              if (timestamp) {
                const date = new Date(timestamp);
                if (!isNaN(date.getTime())) {
                  // Nombres de meses en catalán
                  const monthNames = ['gen', 'feb', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'oct', 'nov', 'des'];
                  const month = monthNames[date.getMonth()];
                  const day = date.getDate();
                  const year = date.getFullYear();
                  const hours = date.getHours().toString().padStart(2, '0');
                  const minutes = date.getMinutes().toString().padStart(2, '0');
                  
                  return `${day} ${month} ${year}, ${hours}:${minutes}`;
                }
              }
              
              // Fallback: usar el label si está disponible
              const label = context[0].label;
              if (label) {
                const date = new Date(label);
                if (!isNaN(date.getTime())) {
                  const monthNames = ['gen', 'feb', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'oct', 'nov', 'des'];
                  const month = monthNames[date.getMonth()];
                  const day = date.getDate();
                  const year = date.getFullYear();
                  const hours = date.getHours().toString().padStart(2, '0');
                  const minutes = date.getMinutes().toString().padStart(2, '0');
                  
                  return `${day} ${month} ${year}, ${hours}:${minutes}`;
                }
              }
              
              return 'Data no disponible';
            } catch (error) {
              console.error('Error formatting tooltip date:', error);
              return 'Data no disponible';
            }
          },
          label: function(context: any) {
            const value = context.parsed.y;
            const severity = calculateSeverity(value, activeParameter);
            const severityText = severity === 'ok' ? 'Normal' : 
                                severity === 'mitjà' ? 'Mitjà' : 'Alt';
            
            return `${context.dataset.label}: ${value} (${severityText})`;
          }
        }
      }
    },
    scales: {
      x: {
        type: 'time' as const,
        time: {
          unit: timeScale === 'realtime' ? 'minute' as const : timeScale as 'hour' | 'day' | 'week' | 'month',
          stepSize: timeScale === 'realtime' ? 5 : undefined, // Mostrar cada 5 minutos para tiempo real
          displayFormats: {
            minute: 'HH:mm',
            hour: 'HH:mm',
            day: 'dd MMM',
            week: 'dd MMM',
            month: 'MMM yyyy'
          }
        },
        offset: false, // Desactivar offset para mejor posicionamiento
        ticks: {
          stepSize: timeScale === 'realtime' ? 5 : undefined, // Forzar cada 5 minutos en las etiquetas
          maxRotation: 0,
          minRotation: 0,
          callback: function(value: any) {
            const date = new Date(value);
            
            if (timeScale === 'month') {
              const monthNames = ['GEN', 'FEB', 'MAR', 'ABR', 'MAI', 'JUN', 'JUL', 'AGO', 'SET', 'OCT', 'NOV', 'DES'];
              const month = monthNames[date.getMonth()];
              const year = date.getFullYear();
              return `${month} ${year}`;
            } else if (timeScale === 'day') {
              const dayNames = ['Dg', 'Dl', 'Dt', 'Dc', 'Dj', 'Dv', 'Ds'];
              const dayName = dayNames[date.getDay()];
              const day = date.getDate();
              const month = date.getMonth() + 1;
              return `${dayName} ${day}/${month}`;
            } else if (timeScale === 'week') {
              const day = date.getDate();
              const month = date.getMonth() + 1;
              const year = date.getFullYear();
              return `${day}/${month}/${year}`;
            } else if (timeScale === 'hour') {
              return date.toLocaleTimeString('ca-ES', { hour: '2-digit', minute: '2-digit' });
            }
            return value;
          }
        },
        title: {
          display: false
        }
      },
      y: getYScaleConfig(),
    },
  };

  return (
    <div 
      className="sensor-history-chart"
      style={{
        position: 'fixed',
        bottom: 0,
        left: 'calc(5rem + max(300px, min(400px, 25vw)) + 1rem)',
        right: 'calc(max(300px, min(400px, 25vw)) + 1.25rem)',
        height: '40vh',
        background: '#fff',
        borderTop: '2px solid #e0e6ef',
        zIndex: 2000,
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '0 -4px 12px rgba(0, 0, 0, 0.1)',
        width: 'auto',
        maxWidth: 'none'
      }}
    >
      {/* Header del panel */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '12px 20px',
        borderBottom: '1px solid #e0e6ef',
        background: '#f8f9fa'
      }}>
        <h3 style={{
          margin: 0,
          fontSize: '18px',
          color: '#333',
          fontWeight: 'bold'
        }}>
          Històric de Sensors
        </h3>
        
        {/* Controles de escala de tiempo */}
        <div style={{
          display: 'flex',
          gap: '8px',
          alignItems: 'center'
        }}>
          <span style={{
            fontSize: '14px',
            color: '#666',
            marginRight: '8px'
          }}>
            Escala:
          </span>
          {(['realtime', 'hour', 'day', 'week', 'month'] as const).map((scale) => (
            <button
              key={scale}
              onClick={() => setTimeScale(scale)}
              style={{
                background: timeScale === scale ? '#4179b5' : '#e0e6ef',
                color: timeScale === scale ? 'white' : '#333',
                border: 'none',
                borderRadius: '4px',
                padding: '6px 12px',
                cursor: 'pointer',
                fontSize: '12px',
                fontWeight: 'bold',
                transition: 'all 0.2s ease'
              }}
            >
              {scale === 'realtime' ? 'Temps real' :
               scale === 'hour' ? 'Hores' : 
               scale === 'day' ? 'Dies' : 
               scale === 'week' ? 'Setmanes' : 'Mesos'}
            </button>
          ))}
        </div>

        <button
          onClick={onClose}
          style={{
            background: '#dc3545',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            padding: '8px 12px',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: 'bold'
          }}
        >
          ✕ Tancar
        </button>
      </div>

      {/* Leyenda de severidad */}
      <div style={{
        padding: '10px 20px',
        borderBottom: '1px solid #e0e6ef',
        background: '#f8f9fa',
        display: 'flex',
        alignItems: 'center',
        gap: '20px',
        flexWrap: 'wrap'
      }}>
        <span style={{
          fontSize: '14px',
          fontWeight: '600',
          color: '#333'
        }}>
          Indicadors de Severitat:
        </span>
        <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <div style={{
              width: '12px',
              height: '12px',
              borderRadius: '50%',
              backgroundColor: '#36a2eb'
            }}></div>
            <span style={{ fontSize: '12px', color: '#666' }}>Normal</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <div style={{
              width: '12px',
              height: '12px',
              borderRadius: '50%',
              backgroundColor: '#ff9f40'
            }}></div>
            <span style={{ fontSize: '12px', color: '#666' }}>Mitjà</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <div style={{
              width: '12px',
              height: '12px',
              borderRadius: '50%',
              backgroundColor: '#ff6384'
            }}></div>
            <span style={{ fontSize: '12px', color: '#666' }}>Alt</span>
          </div>
        </div>
      </div>

      {/* Contenido del gráfico */}
      <div style={{
        flex: 1,
        padding: '20px',
        position: 'relative'
      }}>
        <Line data={chartData} options={options} />
      </div>
    </div>
  );
};

export default SensorHistoryChart;
