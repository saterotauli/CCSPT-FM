# Sistema de Simulación de Sensores

Este sistema simula sensores de temperatura, humedad y PPM (partes por millón) para cada habitación del hospital.

## Características

- **Simulación realista**: Los valores se generan basándose en el tipo de habitación
- **Variaciones naturales**: Los sensores muestran variaciones diarias y aleatorias
- **Actualización automática**: Los datos se generan cada 2 segundos
- **Persistencia**: Todos los datos se almacenan en la base de datos

## Tipos de Habitaciones y Valores Base

| Tipo de Habitación | Temperatura | Humedad | PPM |
|-------------------|-------------|---------|-----|
| Quirófanos | 20.0°C | 50% | 400 |
| Habitaciones | 22.0°C | 45% | 450 |
| Almacenes | 18.0°C | 40% | 500 |
| Oficinas | 23.0°C | 50% | 480 |
| Cocinas | 24.0°C | 60% | 600 |
| Baños | 21.0°C | 70% | 550 |

## API Endpoints

### Control de Simulación

#### `GET /api/sensors/status`
Obtiene el estado actual de la simulación.

**Respuesta:**
```json
{
  "isRunning": true,
  "roomCount": 150,
  "interval": 2000
}
```

#### `POST /api/sensors/start`
Inicia la simulación de sensores.

#### `POST /api/sensors/stop`
Detiene la simulación de sensores.

### Datos de Sensores

#### `GET /api/sensors/room/:spaceGuid`
Obtiene las últimas lecturas de sensores para una habitación específica.

**Parámetros:**
- `spaceGuid`: GUID de la habitación
- `limit` (query): Número de lecturas a obtener (1-100, por defecto 10)

**Ejemplo:**
```
GET /api/sensors/room/abc123?limit=5
```

#### `GET /api/sensors/rooms`
Obtiene datos de sensores para múltiples habitaciones.

**Parámetros:**
- `spaceGuids` (query): Array de GUIDs separados por comas
- `limit` (query): Número de lecturas por habitación (1-50, por defecto 5)

**Ejemplo:**
```
GET /api/sensors/rooms?spaceGuids=abc123,def456,ghi789&limit=3
```

#### `GET /api/sensors/current-readings`
Obtiene las lecturas más recientes de todos los sensores.

**Parámetros opcionales:**
- `edifici` (query): Filtrar por edificio
- `planta` (query): Filtrar por planta

**Ejemplo:**
```
GET /api/sensors/current-readings?edifici=CQA&planta=P01
```

#### `GET /api/sensors/rooms-with-sensors`
Obtiene la lista de habitaciones que tienen datos de sensores.

**Parámetros opcionales:**
- `edifici` (query): Filtrar por edificio
- `planta` (query): Filtrar por planta

#### `GET /api/sensors/statistics`
Obtiene estadísticas de sensores para todas las habitaciones.

### Mantenimiento

#### `DELETE /api/sensors/data/:spaceGuid`
Elimina datos históricos de sensores para una habitación específica.

**Parámetros:**
- `spaceGuid`: GUID de la habitación
- `days` (query): Días de antigüedad para eliminar (por defecto 30)

## Estructura de la Base de Datos

### Tabla `sensor_data`

```sql
CREATE TABLE "patrimoni"."sensor_data" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  "spaceGuid" TEXT NOT NULL REFERENCES "patrimoni"."ifcspace"("guid") ON DELETE CASCADE,
  "temperature" DOUBLE PRECISION NOT NULL,
  "humidity" DOUBLE PRECISION NOT NULL,
  "ppm" DOUBLE PRECISION NOT NULL,
  "timestamp" TIMESTAMP DEFAULT NOW()
);

CREATE INDEX ON "patrimoni"."sensor_data"("spaceGuid", "timestamp");
CREATE INDEX ON "patrimoni"."sensor_data"("timestamp");
```

## Inicio Automático

La simulación se inicia automáticamente cuando se arranca el servidor. Para desactivar esto, comenta las líneas en `server.ts`:

```typescript
// console.log('Iniciando simulación de sensores...');
// sensorSimulationService.startSimulation();
```

## Configuración

### Intervalo de Actualización

Para cambiar el intervalo de actualización (por defecto 2 segundos), modifica la constante `UPDATE_INTERVAL` en `sensorSimulationService.ts`:

```typescript
private readonly UPDATE_INTERVAL = 5000; // 5 segundos
```

### Valores Base por Tipo de Habitación

Para modificar los valores base, edita el método `getBaseValuesForRoomType` en `sensorSimulationService.ts`.

## Monitoreo

### Logs

El sistema genera logs detallados:
- Inicialización de habitaciones
- Guardado de lecturas
- Errores de base de datos

### Métricas

Puedes obtener estadísticas en tiempo real usando el endpoint `/api/sensors/statistics`.

## Consideraciones de Rendimiento

- Los datos se guardan en paralelo para todas las habitaciones
- Se usan índices optimizados en la base de datos
- La simulación se ejecuta en un proceso separado
- Los datos antiguos se pueden limpiar usando el endpoint de eliminación

## Próximos Pasos

1. **Migración de base de datos**: Ejecutar `npx prisma migrate dev` cuando la BD esté disponible
2. **Configuración de intervalos**: Ajustar el intervalo según necesidades
3. **Integración con frontend**: Crear componentes para visualizar los datos
4. **Alertes**: Implementar sistema de Alertes para valores anómalos
5. **Histórico**: Crear dashboards para análisis de tendencias
