# Guía para Migrar Base de Datos a Supabase

Esta guía te ayudará a migrar tu base de datos PostgreSQL existente a Supabase.

## Requisitos Previos

- Acceso a tu base de datos PostgreSQL actual
- `pg_dump` instalado (viene con PostgreSQL)
- `psql` instalado (viene con PostgreSQL)
- Cuenta en Supabase (https://supabase.com)

## Paso 1: Crear Proyecto en Supabase

1. Ve a https://supabase.com
2. Crea una cuenta o inicia sesión
3. Click en "New Project"
4. Completa el formulario:
   - **Name**: `ccspt-db` (o el nombre que prefieras)
   - **Database Password**: Genera una contraseña segura (GUÁRDALA)
   - **Region**: Elige la más cercana
5. Espera 2-3 minutos a que se cree el proyecto

## Paso 2: Obtener Connection String de Supabase

1. En tu proyecto de Supabase, ve a **Settings** → **Database**
2. Busca "Connection string"
3. Selecciona la pestaña **URI**
4. Copia la URL (se ve así: `postgresql://postgres:[YOUR-PASSWORD]@db.xxxxx.supabase.co:5432/postgres`)
5. **Reemplaza `[YOUR-PASSWORD]`** con la contraseña que creaste en el Paso 1
6. **Guarda esta URL completa** - la necesitarás más adelante

## Paso 3: Hacer Backup de tu Base de Datos Actual

### Opción A: Desde línea de comandos (Recomendado)

```bash
# Reemplaza estos valores con los de tu base de datos actual
PGHOST=tu-host
PGPORT=5432
PGUSER=tu-usuario
PGPASSWORD=tu-password
PGDATABASE=tu-database

# Hacer dump completo (incluye datos y estructura)
pg_dump -h $PGHOST -p $PGPORT -U $PGUSER -d $PGDATABASE \
  --schema=public \
  --schema=patrimoni \
  --no-owner \
  --no-acl \
  --clean \
  --if-exists \
  -f backup_completo.sql
```

### Opción B: Usando Connection String

```bash
# Si tienes la connection string completa
pg_dump "postgresql://usuario:password@host:5432/database" \
  --schema=public \
  --schema=patrimoni \
  --no-owner \
  --no-acl \
  --clean \
  --if-exists \
  -f backup_completo.sql
```

### Opción C: Solo estructura (sin datos)

Si solo quieres migrar la estructura:

```bash
pg_dump "postgresql://usuario:password@host:5432/database" \
  --schema=public \
  --schema=patrimoni \
  --schema-only \
  --no-owner \
  --no-acl \
  -f backup_estructura.sql
```

## Paso 4: Preparar el Backup para Supabase

Supabase usa el schema `public` por defecto, pero tu base de datos tiene dos schemas (`public` y `patrimoni`). Necesitamos asegurarnos de que ambos se migren correctamente.

1. Abre el archivo `backup_completo.sql` en un editor
2. Busca y reemplaza (si es necesario):
   - Asegúrate de que los schemas `public` y `patrimoni` estén incluidos
   - Verifica que no haya referencias a usuarios específicos de tu servidor anterior

## Paso 5: Restaurar en Supabase

### Opción A: Desde línea de comandos

```bash
# Usa la connection string de Supabase que obtuviste en el Paso 2
psql "postgresql://postgres:TU_PASSWORD@db.xxxxx.supabase.co:5432/postgres" \
  -f backup_completo.sql
```

### Opción B: Desde el Dashboard de Supabase

1. Ve a **SQL Editor** en Supabase
2. Click en "New query"
3. Abre el archivo `backup_completo.sql`
4. Copia y pega el contenido
5. Click en "Run" o presiona Ctrl+Enter

**Nota**: Si el archivo es muy grande, usa la opción A (línea de comandos).

## Paso 6: Verificar la Migración

### Verificar schemas

```sql
-- Ejecuta esto en el SQL Editor de Supabase
SELECT schema_name 
FROM information_schema.schemata 
WHERE schema_name IN ('public', 'patrimoni');
```

### Verificar tablas

```sql
-- Tablas en schema public
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public';

-- Tablas en schema patrimoni
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'patrimoni';
```

### Verificar datos

```sql
-- Contar registros en algunas tablas clave
SELECT COUNT(*) FROM public."Usuario";
SELECT COUNT(*) FROM public."Tarea";
SELECT COUNT(*) FROM patrimoni.actius;
```

## Paso 7: Actualizar Variables de Entorno

### Conexión a Supabase con Prisma

Tu backend usa **Prisma ORM** (no Edge Functions), por lo que la conexión es directa a través de `DATABASE_URL`. Prisma maneja automáticamente las conexiones SSL en producción.

**Nota**: La documentación de Supabase sobre [conectar a Postgres desde Edge Functions](https://supabase.com/docs/guides/functions/connect-to-postgres) es para Edge Functions (Deno), pero tu backend usa Node.js con Prisma, que se conecta directamente usando la connection string.

### Si usas Railway

1. Ve a tu proyecto en Railway
2. Selecciona el servicio del backend
3. Ve a **Variables**
4. Actualiza `DATABASE_URL` con la nueva URL de Supabase:
   ```
   DATABASE_URL = postgresql://postgres:TU_PASSWORD@db.xxxxx.supabase.co:5432/postgres
   ```
   
   **Importante**: Para conexiones SSL (recomendado en producción), agrega `?sslmode=require`:
   ```
   DATABASE_URL = postgresql://postgres:TU_PASSWORD@db.xxxxx.supabase.co:5432/postgres?sslmode=require
   ```
5. Railway reiniciará automáticamente el servicio

### Si usas localmente

1. Abre `backend/.env`
2. Actualiza `DATABASE_URL`:
   ```env
   # Conexión básica
   DATABASE_URL="postgresql://postgres:TU_PASSWORD@db.xxxxx.supabase.co:5432/postgres"
   
   # O con SSL (recomendado)
   DATABASE_URL="postgresql://postgres:TU_PASSWORD@db.xxxxx.supabase.co:5432/postgres?sslmode=require"
   ```
3. Reinicia tu servidor

### Configuración de SSL

Prisma y PostgreSQL manejan SSL automáticamente cuando usas `?sslmode=require` en la connection string. No necesitas configuración adicional.

**Opciones de SSL mode**:
- `sslmode=require` - Requiere SSL (recomendado para producción)
- `sslmode=prefer` - Prefiere SSL pero permite conexiones sin SSL
- `sslmode=disable` - Desactiva SSL (solo para desarrollo local)

## Paso 8: Ejecutar Migraciones de Prisma

Aunque ya migraste los datos, es buena práctica ejecutar las migraciones de Prisma para asegurar que todo esté sincronizado:

```bash
cd backend
npx prisma migrate deploy
```

O si estás en Railway:

```bash
railway run npx prisma migrate deploy
```

**Nota**: Si Prisma detecta que las tablas ya existen (porque migraste los datos), las migraciones se marcarán como aplicadas sin modificar los datos existentes.

## Paso 9: Verificar que Todo Funciona

1. Verifica que el backend se conecte correctamente
2. Prueba algunas operaciones:
   - Login de usuarios
   - Crear/leer tareas
   - Consultar activos
3. Revisa los logs del backend para asegurarte de que no hay errores

## Troubleshooting

### Error: "schema 'patrimoni' does not exist"

Supabase puede requerir que crees el schema manualmente:

```sql
CREATE SCHEMA IF NOT EXISTS patrimoni;
```

Luego vuelve a ejecutar el restore.

### Error: "permission denied for schema"

Asegúrate de usar el usuario `postgres` que es el superusuario en Supabase.

### Error: "relation already exists"

Esto significa que algunas tablas ya existen. Puedes:
- Eliminar las tablas existentes primero
- O usar `--clean --if-exists` en el pg_dump

### Datos no aparecen

1. Verifica que el backup incluya datos (no solo estructura)
2. Verifica que el restore se completó sin errores
3. Revisa los logs de Supabase

### Problemas con secuencias (auto-increment)

Si los IDs no se generan correctamente, resincroniza las secuencias:

```sql
-- Para tablas en schema public
SELECT setval(pg_get_serial_sequence('"Usuario"', 'id'), (SELECT MAX(id) FROM "Usuario"));
SELECT setval(pg_get_serial_sequence('actius', 'id'), (SELECT MAX(id) FROM patrimoni.actius));

-- Repite para otras tablas con auto-increment
```

## Scripts Automatizados

Ver también:
- `migrar-a-supabase.ps1` - Script de PowerShell para Windows
- `migrar-a-supabase.sh` - Script de Bash para Linux/Mac

## Notas Importantes

1. **Backup primero**: Siempre haz un backup completo antes de migrar
2. **Prueba en desarrollo**: Si es posible, prueba primero en un proyecto de Supabase de prueba
3. **Downtime**: Planifica un tiempo de inactividad para la migración
4. **Verificación**: Verifica exhaustivamente después de la migración
5. **Rollback**: Mantén tu base de datos original hasta confirmar que todo funciona

## Siguiente Paso

Una vez que la migración esté completa y verificada:
- Actualiza la documentación con la nueva URL de Supabase
- Considera eliminar la base de datos antigua (solo después de confirmar que todo funciona)
- Actualiza los scripts de despliegue si es necesario

