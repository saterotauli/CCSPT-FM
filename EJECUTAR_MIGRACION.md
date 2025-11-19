# Ejecutar Migración a Supabase

## Paso 1: Crear Schema en Supabase

Primero, necesitamos crear las tablas en Supabase usando Prisma:

```powershell
cd backend

# Configurar .env temporalmente con Supabase
# Edita .env y cambia DATABASE_URL a tu URL de Supabase
# DATABASE_URL="postgresql://postgres:TU_PASSWORD@db.xxxxx.supabase.co:5432/postgres?sslmode=require"

# Ejecutar migraciones para crear las tablas
npm run migrate
```

## Paso 2: Obtener URL de Supabase

1. Ve a tu proyecto en Supabase
2. **Settings** → **Database**
3. Busca "Connection string" → **URI**
4. Copia la URL y reemplaza `[YOUR-PASSWORD]` con tu contraseña
5. Ejemplo: `postgresql://postgres:TU_PASSWORD@db.xxxxx.supabase.co:5432/postgres`

## Paso 3: Migrar los Datos

### Opción A: Usar Script de Node.js (Recomendado si no tienes pg_dump)

```powershell
# Configurar variable de entorno con URL de Supabase
$env:SUPABASE_URL="postgresql://postgres:TU_PASSWORD@db.xxxxx.supabase.co:5432/postgres?sslmode=require"

# Ejecutar script de migración
node migrar-datos-con-prisma.js
```

### Opción B: Instalar PostgreSQL y usar pg_dump

1. Instala PostgreSQL: https://www.postgresql.org/download/windows/
2. Ejecuta:
   ```powershell
   # Hacer backup de datos
   pg_dump "postgresql://satero:T0t0r0@localhost:5432/CCSPT" --data-only --schema=public --schema=patrimoni -f datos.sql
   
   # Restaurar en Supabase
   psql "postgresql://postgres:TU_PASSWORD@db.xxxxx.supabase.co:5432/postgres" -f datos.sql
   ```

## Paso 4: Verificar Migración

```sql
-- En Supabase SQL Editor
SELECT COUNT(*) FROM public."Usuario";
SELECT COUNT(*) FROM public."Tarea";
SELECT COUNT(*) FROM patrimoni.actius;
```

## Paso 5: Actualizar Variables de Entorno

Una vez verificada la migración, actualiza `DATABASE_URL` en:
- Railway (si usas Railway)
- `backend/.env` (para desarrollo local)

