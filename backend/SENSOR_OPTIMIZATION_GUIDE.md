# Guía de Optimización de Sensores

## Problema Original
- **1974 habitaciones** × **cada 2 segundos** = **3.5 millones de registros por hora**
- **84 millones de registros por día** = Base de datos insostenible

## Soluciones Implementadas

### 1. **Configuración por Variables de Entorno**

Añade estas variables a tu archivo `.env`:

```env
# Intervalo de actualización (en milisegundos)
SENSOR_UPDATE_INTERVAL=30000  # 30 segundos (por defecto)

# Modo lote para reducir carga
SENSOR_BATCH_MODE=true        # Activar modo lote
SENSOR_BATCH_SIZE=50          # Máximo 50 habitaciones por vez
```

### 2. **Modos de Operación**

#### **Modo Completo** (SENSOR_BATCH_MODE=false)
- Procesa todas las habitaciones cada intervalo
- **30 segundos**: ~236,000 registros/hora
- **60 segundos**: ~118,000 registros/hora

#### **Modo Lote** (SENSOR_BATCH_MODE=true)
- Procesa solo 50 habitaciones aleatorias cada intervalo
- **30 segundos**: ~6,000 registros/hora
- **60 segundos**: ~3,000 registros/hora

### 3. **Configuraciones Recomendadas**

#### **Para Desarrollo/Pruebas**
```env
SENSOR_UPDATE_INTERVAL=60000    # 1 minuto
SENSOR_BATCH_MODE=true
SENSOR_BATCH_SIZE=20            # Solo 20 habitaciones
```
**Resultado**: ~1,200 registros/hora

#### **Para Demostración**
```env
SENSOR_UPDATE_INTERVAL=30000    # 30 segundos
SENSOR_BATCH_MODE=true
SENSOR_BATCH_SIZE=50            # 50 habitaciones
```
**Resultado**: ~6,000 registros/hora

#### **Para Producción (Simulada)**
```env
SENSOR_UPDATE_INTERVAL=300000   # 5 minutos
SENSOR_BATCH_MODE=false         # Todas las habitaciones
```
**Resultado**: ~23,600 registros/hora

### 4. **Nuevos Endpoints de Control**

#### **Estado de Simulación Mejorado**
```
GET /api/sensors/status
```
Respuesta:
```json
{
  "isRunning": true,
  "roomCount": 1974,
  "interval": 30000,
  "batchMode": true,
  "batchSize": 50
}
```

#### **Estadísticas de Base de Datos**
```
GET /api/sensors/database-stats
```
Respuesta:
```json
{
  "totalRecords": 15000,
  "oldestRecord": "2024-01-01T10:00:00Z",
  "newestRecord": "2024-01-01T12:00:00Z",
  "estimatedRecordsPerHour": 6000
}
```

#### **Limpieza Automática**
```
POST /api/sensors/cleanup
Content-Type: application/json

{
  "days": 7
}
```

### 5. **Comparación de Rendimiento**

| Configuración | Registros/Hora | Registros/Día | Tamaño Estimado/Día |
|---------------|----------------|---------------|-------------------|
| **Original** (2s, todas) | 3,550,000 | 85,200,000 | ~8.5 GB |
| **Optimizada** (30s, lote 50) | 6,000 | 144,000 | ~14 MB |
| **Desarrollo** (1min, lote 20) | 1,200 | 28,800 | ~3 MB |

### 6. **Comandos de Mantenimiento**

#### **Limpiar datos antiguos**
```bash
curl -X POST http://localhost:4000/api/sensors/cleanup \
  -H "Content-Type: application/json" \
  -d '{"days": 7}'
```

#### **Ver estadísticas**
```bash
curl http://localhost:4000/api/sensors/database-stats
```

#### **Cambiar configuración**
1. Editar `.env`
2. Reiniciar servidor
3. Verificar con `/api/sensors/status`

### 7. **Recomendaciones**

1. **Para pruebas**: Usa modo lote con 20-50 habitaciones
2. **Para demos**: Usa intervalo de 30-60 segundos
3. **Limpieza**: Ejecuta limpieza semanal automática
4. **Monitoreo**: Revisa estadísticas regularmente
5. **Escalabilidad**: Considera particionado de tablas para producción real

### 8. **Script de Limpieza Automática**

Puedes crear un cron job o tarea programada:

```bash
# Limpiar datos de más de 7 días cada domingo a las 2 AM
0 2 * * 0 curl -X POST http://localhost:4000/api/sensors/cleanup -d '{"days": 7}'
```

## Resultado Final

Con estas optimizaciones, el sistema pasa de generar **85 millones de registros por día** a solo **144,000 registros por día** (una reducción del 99.8%), manteniendo la funcionalidad completa para pruebas y demostraciones.
