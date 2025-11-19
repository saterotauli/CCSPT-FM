# Migración Rápida a Supabase

## Pasos Rápidos

### 1. Crear Proyecto en Supabase

1. Ve a https://supabase.com
2. Crea cuenta/proyecto
3. Settings → Database → Connection string → URI
4. Copia la URL y reemplaza `[YOUR-PASSWORD]`

### 2. Ejecutar Script de Migración

**Windows (PowerShell):**
```powershell
.\migrar-a-supabase.ps1 `
  -SourceDatabaseUrl "postgresql://user:pass@host:5432/db" `
  -SupabaseUrl "postgresql://postgres:TU_PASSWORD@db.xxxxx.supabase.co:5432/postgres"
```

**Linux/Mac (Bash):**
```bash
chmod +x migrar-a-supabase.sh
./migrar-a-supabase.sh \
  "postgresql://user:pass@host:5432/db" \
  "postgresql://postgres:TU_PASSWORD@db.xxxxx.supabase.co:5432/postgres"
```

### 3. Actualizar Variables de Entorno

Actualiza `DATABASE_URL` en Railway o `.env` con la nueva URL de Supabase:

```env
# Con SSL (recomendado)
DATABASE_URL="postgresql://postgres:TU_PASSWORD@db.xxxxx.supabase.co:5432/postgres?sslmode=require"
```

**Nota**: Tu backend usa Prisma (no Edge Functions), así que usa la connection string estándar. Ver `CONEXION_SUPABASE.md` para más detalles.

### 4. Ejecutar Migraciones de Prisma

```bash
cd backend
npx prisma migrate deploy
```

## Ejemplo Completo

```powershell
# 1. Backup y migración
.\migrar-a-supabase.ps1 `
  -SourceDatabaseUrl "postgresql://postgres:mipass@localhost:5432/ccspt" `
  -SupabaseUrl "postgresql://postgres:SUPABASE_PASS@db.abc123.supabase.co:5432/postgres"

# 2. Actualizar .env
# Edita backend/.env y cambia DATABASE_URL

# 3. Verificar
cd backend
npx prisma migrate deploy
npm run dev
```

## Notas

- El script crea un backup automáticamente
- Incluye ambos schemas: `public` y `patrimoni`
- Verifica la migración al finalizar

Para más detalles, ver `MIGRAR_A_SUPABASE.md`.

