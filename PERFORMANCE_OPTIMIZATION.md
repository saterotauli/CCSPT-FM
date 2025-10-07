# 🚀 Guía de Optimización de Rendimiento - CCSPT-FM

## 📊 Problemas Identificados y Solucionados

### 1. **Frontend - ControlGeneral.tsx**
**Problemas:**
- Actualización cada 20 segundos de TODOS los sensores
- Re-renderizado masivo de componentes
- Generación constante de eventos históricos
- Cálculos complejos ejecutándose sin optimización

**Soluciones Implementadas:**
- ✅ Intervalo de actualización aumentado de 20s a 60s
- ✅ Optimización de regeneración de eventos históricos (solo cuando cambian significativamente)
- ✅ Intervalo por defecto de sensores aumentado a 30s

### 2. **Backend - SensorSimulationService**
**Problemas:**
- Simulación escribiendo constantemente a la BD cada 30s
- Procesamiento de todas las habitaciones simultáneamente
- Falta de modo lote optimizado

**Soluciones Implementadas:**
- ✅ Intervalo de actualización aumentado de 30s a 2 minutos
- ✅ Modo lote habilitado por defecto
- ✅ Tamaño de lote reducido a 25 habitaciones máximo
- ✅ Procesamiento por lotes para reducir carga de BD

### 3. **Configuración Recomendada**

#### Variables de Entorno (.env)
```bash
# Simulación de sensores - Optimizaciones
SENSOR_UPDATE_INTERVAL=120000  # 2 minutos
SENSOR_BATCH_SIZE=25           # 25 habitaciones por lote
SENSOR_BATCH_MODE=true         # Modo lote habilitado

# Base de datos
DATABASE_POOL_SIZE=5
DATABASE_CONNECTION_TIMEOUT=30000

# Limpieza automática
AUTO_CLEANUP_ENABLED=true
DATA_RETENTION_DAYS=7
```

## 📈 Mejoras de Rendimiento Esperadas

### CPU
- **Antes:** 100% constante
- **Después:** Reducción estimada del 60-70%

### Memoria
- **Antes:** Crecimiento constante por re-renderizados
- **Después:** Uso más estable con caché optimizado

### Disco
- **Antes:** Escrituras cada 30 segundos
- **Después:** Escrituras cada 2 minutos, solo 25 habitaciones por vez

## 🔧 Comandos de Optimización Adicionales

### Limpiar datos antiguos de sensores
```bash
# Desde el backend
curl -X POST http://localhost:4000/api/sensors/cleanup \
  -H "Content-Type: application/json" \
  -d '{"days": 7}'
```

### Verificar estado de simulación
```bash
curl http://localhost:4000/api/sensors/status
```

### Estadísticas de base de datos
```bash
curl http://localhost:4000/api/sensors/database-stats
```

## ⚠️ Recomendaciones Adicionales

1. **Monitoreo:** Implementar logs de rendimiento
2. **Caché:** Considerar Redis para caché de consultas frecuentes
3. **BD:** Indexar campos de timestamp en sensor_data
4. **Frontend:** Implementar virtualización para listas largas
5. **Servidor:** Considerar cluster mode para Node.js

## 🎯 Resultados Esperados

- **CPU:** Reducción del 60-70%
- **Memoria:** Uso más estable
- **Disco:** Reducción del 75% en escrituras
- **Responsividad:** Mejora significativa en la interfaz
