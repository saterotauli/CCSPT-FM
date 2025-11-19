# Cómo Conectar tu Backend a Supabase

## Diferencia entre Edge Functions y tu Backend

La documentación de Supabase sobre [conectar a Postgres desde Edge Functions](https://supabase.com/docs/guides/functions/connect-to-postgres) es para **Supabase Edge Functions** (que usan Deno), pero tu backend usa **Node.js con Prisma ORM**.

Tu backend se conecta directamente a Supabase usando la connection string estándar de PostgreSQL, no necesitas usar el cliente de Supabase.

## Configuración con Prisma

### 1. Obtener Connection String de Supabase

1. Ve a tu proyecto en Supabase
2. **Settings** → **Database**
3. Busca "Connection string"
4. Selecciona la pestaña **URI**
5. Copia la URL y reemplaza `[YOUR-PASSWORD]` con tu contraseña

### 2. Configurar DATABASE_URL

Tu `prisma/schema.prisma` ya está configurado para usar `DATABASE_URL`:

```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
  schemas  = ["public", "patrimoni"]
}
```

Solo necesitas actualizar la variable de entorno:

```env
# Conexión básica
DATABASE_URL="postgresql://postgres:TU_PASSWORD@db.xxxxx.supabase.co:5432/postgres"

# Con SSL (recomendado para producción)
DATABASE_URL="postgresql://postgres:TU_PASSWORD@db.xxxxx.supabase.co:5432/postgres?sslmode=require"
```

### 3. Prisma se Conecta Automáticamente

Prisma maneja automáticamente:
- ✅ Conexiones SSL cuando usas `?sslmode=require`
- ✅ Pool de conexiones
- ✅ Reintentos en caso de error
- ✅ Múltiples schemas (`public` y `patrimoni`)

## Comparación: Edge Functions vs Tu Backend

| Aspecto | Edge Functions (Supabase) | Tu Backend (Node.js + Prisma) |
|---------|---------------------------|-------------------------------|
| Runtime | Deno | Node.js |
| Cliente DB | `@supabase/supabase-js` o `deno-postgres` | Prisma Client |
| Connection | Variables de entorno especiales | `DATABASE_URL` estándar |
| SSL | Automático | `?sslmode=require` en URL |
| Uso | Funciones serverless | Servidor Express completo |

## Ejemplo de Código

### En tu Backend (Node.js + Prisma)

```typescript
// backend/src/controllers/usuarioController.ts
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Prisma ya está conectado usando DATABASE_URL
export async function getUsuarios() {
  return await prisma.usuario.findMany();
}
```

**No necesitas** hacer esto (eso es para Edge Functions):

```typescript
// ❌ NO necesitas esto (eso es para Edge Functions)
import { createClient } from '@supabase/supabase-js';
const supabase = createClient(url, key);
```

## Conexión SSL

### Producción (Railway, etc.)

Prisma maneja SSL automáticamente cuando usas `?sslmode=require`:

```env
DATABASE_URL="postgresql://postgres:pass@db.xxx.supabase.co:5432/postgres?sslmode=require"
```

### Desarrollo Local

Para desarrollo local, puedes usar:

```env
# Sin SSL (más rápido para desarrollo)
DATABASE_URL="postgresql://postgres:pass@db.xxx.supabase.co:5432/postgres"

# O con SSL (igual que producción)
DATABASE_URL="postgresql://postgres:pass@db.xxx.supabase.co:5432/postgres?sslmode=require"
```

## Verificar Conexión

### 1. Probar con Prisma Studio

```bash
cd backend
npx prisma studio
```

Esto abrirá una interfaz web donde puedes ver y editar tus datos.

### 2. Probar con Prisma CLI

```bash
cd backend
npx prisma db pull  # Sincroniza schema desde la BD
npx prisma generate # Genera el cliente
```

### 3. Probar desde el código

```typescript
// backend/src/test-connection.ts
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function testConnection() {
  try {
    const result = await prisma.$queryRaw`SELECT 1 as test`;
    console.log('✅ Conexión exitosa:', result);
  } catch (error) {
    console.error('❌ Error de conexión:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testConnection();
```

## Troubleshooting

### Error: "SSL connection required"

Agrega `?sslmode=require` a tu `DATABASE_URL`:

```env
DATABASE_URL="postgresql://postgres:pass@db.xxx.supabase.co:5432/postgres?sslmode=require"
```

### Error: "password authentication failed"

- Verifica que la contraseña en la URL sea correcta
- Asegúrate de haber reemplazado `[YOUR-PASSWORD]` en la connection string

### Error: "schema 'patrimoni' does not exist"

Crea el schema manualmente en Supabase:

```sql
CREATE SCHEMA IF NOT EXISTS patrimoni;
```

### Error: "connection timeout"

- Verifica que tu IP esté permitida en Supabase (Settings → Database → Connection Pooling)
- Verifica que la URL sea correcta
- Prueba desde otro lugar para descartar problemas de red

## Recursos

- [Documentación de Prisma sobre PostgreSQL](https://www.prisma.io/docs/concepts/database-connectors/postgresql)
- [Supabase Database Connection](https://supabase.com/docs/guides/database/connecting-to-postgres)
- [Supabase Edge Functions (para referencia)](https://supabase.com/docs/guides/functions/connect-to-postgres)

