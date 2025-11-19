# Migración a Supabase sin pg_dump/psql

Si no tienes `pg_dump` y `psql` instalados, aquí tienes alternativas para migrar tu base de datos a Supabase.

## Opción 1: Instalar PostgreSQL (Recomendado)

### Windows

1. Descarga PostgreSQL desde: https://www.postgresql.org/download/windows/
2. O usa el instalador gráfico: https://www.enterprisedb.com/downloads/postgres-postgresql-downloads
3. Durante la instalación, asegúrate de incluir las herramientas de línea de comandos
4. Reinicia tu terminal después de instalar
5. Verifica la instalación:
   ```powershell
   pg_dump --version
   psql --version
   ```

### Alternativa: Usar Chocolatey

```powershell
choco install postgresql
```

## Opción 2: Usar Prisma para Crear el Schema

El script `migrar-con-prisma.ps1` crea las tablas en Supabase usando Prisma:

```powershell
.\migrar-con-prisma.ps1 `
  -SourceDatabaseUrl "postgresql://user:pass@host:5432/db" `
  -SupabaseUrl "postgresql://postgres:PASS@db.xxx.supabase.co:5432/postgres"
```

Esto crea las tablas vacías. Luego necesitas migrar los datos.

## Opción 3: Usar Herramientas GUI

### DBeaver (Gratis)

1. Descarga DBeaver: https://dbeaver.io/download/
2. Conecta a tu base de datos actual
3. Conecta a Supabase
4. Usa "Export Data" y "Import Data" para migrar

### pgAdmin

1. Descarga pgAdmin: https://www.pgadmin.org/download/
2. Conecta a ambas bases de datos
3. Usa "Backup" y "Restore" para migrar

## Opción 4: Migración Manual con Prisma Studio

### Paso 1: Crear tablas en Supabase

```powershell
cd backend
# Actualiza .env con DATABASE_URL de Supabase
npx prisma migrate deploy
```

### Paso 2: Exportar datos desde base de datos actual

Usa Prisma Studio o una herramienta GUI para exportar los datos a CSV/JSON:

```powershell
# Abre Prisma Studio conectado a tu BD actual
npx prisma studio
```

### Paso 3: Importar datos a Supabase

1. Cambia `DATABASE_URL` en `.env` a Supabase
2. Abre Prisma Studio:
   ```powershell
   npx prisma studio
   ```
3. Importa los datos manualmente o usa scripts

## Opción 5: Usar Docker (Si tienes Docker)

```powershell
# Ejecutar pg_dump desde Docker
docker run --rm -e PGPASSWORD=tu_password postgres:latest \
  pg_dump -h tu-host -U usuario -d database \
  --schema=public --schema=patrimoni \
  -f backup.sql

# Restaurar en Supabase
docker run --rm -i -e PGPASSWORD=supabase_pass postgres:latest \
  psql -h db.xxx.supabase.co -U postgres -d postgres < backup.sql
```

## Opción 6: Script de Migración con Node.js

Si prefieres usar Node.js en lugar de herramientas de PostgreSQL:

```javascript
// migrate-data.js
const { PrismaClient } = require('@prisma/client');
const sourcePrisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.SOURCE_DATABASE_URL
    }
  }
});
const targetPrisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.SUPABASE_URL
    }
  }
});

async function migrate() {
  // Migrar usuarios
  const usuarios = await sourcePrisma.usuario.findMany();
  for (const usuario of usuarios) {
    await targetPrisma.usuario.create({ data: usuario });
  }
  
  // Repetir para otras tablas...
  
  await sourcePrisma.$disconnect();
  await targetPrisma.$disconnect();
}

migrate();
```

## Recomendación

**La forma más fácil es instalar PostgreSQL** para obtener `pg_dump` y `psql`, ya que son las herramientas estándar para migraciones de PostgreSQL.

Si no puedes instalar PostgreSQL, usa **DBeaver** (Opción 3) que es gratuito y tiene una interfaz gráfica fácil de usar.

## Verificación Post-Migración

Después de migrar, verifica:

```sql
-- En Supabase SQL Editor
SELECT COUNT(*) FROM public."Usuario";
SELECT COUNT(*) FROM public."Tarea";
SELECT COUNT(*) FROM patrimoni.actius;
```

