# Sistema de Sensores Efímeros

## ¿Qué son los Sensores Efímeros?

Los **sensores efímeros** generan datos de temperatura, humedad y PPM **en tiempo real** sin guardarlos en la base de datos. Cada vez que solicitas datos, se generan valores realistas basados en:

- Tipo de habitación
- Hora del día
- Variaciones naturales
- Tendencias temporales

## Ventajas del Sistema Efímero

✅ **Cero persistencia**: No se guarda nada en la base de datos  
✅ **Datos siempre frescos**: Cada consulta genera valores actuales  
✅ **Rendimiento óptimo**: Sin I/O de base de datos  
✅ **Escalabilidad**: Funciona con cualquier número de habitaciones  
✅ **Realismo**: Mantiene variaciones naturales y tendencias  

## API Endpoints

### Estado del Servicio
```
GET /api/ephemeral-sensors/status
```
Respuesta:
```json
{
  "isInitialized": true,
  "roomCount": 1974
}
```

### Lectura de una Habitación
```
GET /api/ephemeral-sensors/room/{spaceGuid}
```
Respuesta:
```json
{
  "temperature": 22.3,
  "humidity": 47.2,
  "ppm": 445,
  "timestamp": "2024-01-15T14:30:25.123Z"
}
```

### Historial Simulado
```
GET /api/ephemeral-sensors/room/{spaceGuid}/history?count=10
```
Genera las últimas 10 lecturas (cada 2 segundos hacia atrás)

### Múltiples Habitaciones
```
GET /api/ephemeral-sensors/rooms?spaceGuids=guid1,guid2,guid3
```

### Todas las Habitaciones
```
GET /api/ephemeral-sensors/all
```

### Filtrado por Edificio/Planta
```
GET /api/ephemeral-sensors/filtered?edifici=CQA&planta=P01
```

### Habitaciones con Información Completa
```
GET /api/ephemeral-sensors/rooms-with-info?edifici=CQA
```
Respuesta:
```json
[
  {
    "spaceGuid": "abc123",
    "dispositiu": "Habitació 101",
    "edifici": "CQA",
    "planta": "P01",
    "departament": "Cirurgia",
    "temperature": 22.1,
    "humidity": 45.8,
    "ppm": 442,
    "timestamp": "2024-01-15T14:30:25.123Z"
  }
]
```

### Estadísticas en Tiempo Real
```
GET /api/ephemeral-sensors/statistics
```
Respuesta:
```json
{
  "totalRooms": 1974,
  "averageTemperature": 21.8,
  "averageHumidity": 48.2,
  "averagePpm": 456,
  "temperatureRange": { "min": 18.2, "max": 24.1 },
  "humidityRange": { "min": 35.1, "max": 72.3 },
  "ppmRange": { "min": 380, "max": 650 }
}
```

## Configuración

### Variables de Entorno

```env
# Activar sensores persistentes (opcional)
ENABLE_PERSISTENT_SENSORS=false

# Puerto del servidor
PORT=4000
```

### Modos de Operación

#### **Solo Efímero** (Recomendado para pruebas)
```env
ENABLE_PERSISTENT_SENSORS=false
```
- Solo sensores efímeros
- Sin persistencia en BD
- Máximo rendimiento

#### **Híbrido** (Efímero + Persistente)
```env
ENABLE_PERSISTENT_SENSORS=true
SENSOR_UPDATE_INTERVAL=60000
SENSOR_BATCH_MODE=true
SENSOR_BATCH_SIZE=20
```
- Sensores efímeros para consultas rápidas
- Sensores persistentes para historial limitado

## Ejemplos de Uso

### 1. Dashboard en Tiempo Real
```javascript
// Obtener todas las habitaciones de un edificio
const response = await fetch('/api/ephemeral-sensors/rooms-with-info?edifici=CQA');
const rooms = await response.json();

// Actualizar cada 2 segundos
setInterval(async () => {
  const freshData = await fetch('/api/ephemeral-sensors/rooms-with-info?edifici=CQA');
  const updatedRooms = await freshData.json();
  updateDashboard(updatedRooms);
}, 2000);
```

### 2. Monitoreo de una Habitación Específica
```javascript
// Obtener lectura actual
const current = await fetch('/api/ephemeral-sensors/room/abc123');
const reading = await current.json();

// Obtener historial simulado
const history = await fetch('/api/ephemeral-sensors/room/abc123/history?count=20');
const readings = await history.json();
```

### 3. Estadísticas Globales
```javascript
const stats = await fetch('/api/ephemeral-sensors/statistics');
const data = await stats.json();
console.log(`Temperatura Mitjana: ${data.averageTemperature}°C`);
```

## Comparación de Sistemas

| Característica | Sensores Efímeros | Sensores Persistentes |
|----------------|-------------------|----------------------|
| **Persistencia** | ❌ No | ✅ Sí |
| **Rendimiento** | ⚡ Muy alto | 🐌 Medio |
| **Escalabilidad** | ✅ Ilimitada | ⚠️ Limitada |
| **Historial** | 🔄 Simulado | 📊 Real |
| **Uso de BD** | ❌ Cero | 💾 Alto |
| **Tiempo real** | ✅ Perfecto | ⏱️ Dependiente |

## Casos de Uso Ideales

### ✅ **Usar Efímeros para:**
- Dashboards en tiempo real
- Demostraciones
- Pruebas de rendimiento
- Prototipos
- Monitoreo activo

### ✅ **Usar Persistentes para:**
- Análisis histórico
- Reportes
- Auditorías
- Tendencias a largo plazo

## Rendimiento

### Sensores Efímeros
- **Latencia**: < 10ms por consulta
- **Throughput**: Ilimitado
- **Memoria**: ~50MB para 2000 habitaciones
- **CPU**: Mínimo

### Sensores Persistentes (con optimización)
- **Latencia**: 100-500ms por consulta
- **Throughput**: Limitado por BD
- **Memoria**: Variable según datos
- **CPU**: Medio

## Recomendación Final

Para **pruebas y desarrollo**, usa **solo sensores efímeros**:

```env
ENABLE_PERSISTENT_SENSORS=false
```

Esto te da:
- ✅ Datos realistas en tiempo real
- ✅ Cero impacto en la base de datos
- ✅ Rendimiento óptimo
- ✅ Fácil de probar y demostrar

¡Perfecto para simular sensores reales sin la complejidad de la persistencia!
