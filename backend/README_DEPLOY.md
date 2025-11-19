# Configuración del Backend para Despliegue

## Variables de Entorno Requeridas

Crea un archivo `.env` en la carpeta `backend/` con las siguientes variables:

```env
# Base de datos PostgreSQL (REQUERIDO)
DATABASE_URL="postgresql://usuario:password@host:puerto/database?schema=public"

# JWT Secret (REQUERIDO)
# Genera uno seguro con: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
JWT_SECRET="tu_secreto_super_seguro_aqui"

# Puerto (opcional, default: 4000)
PORT=4000

# Entorno
NODE_ENV=production

# Frontend URL para CORS (opcional)
FRONTEND_URL="https://ccspt.netlify.app"
```

## Pasos Rápidos para Desplegar

### 1. Crear Base de Datos PostgreSQL

**Opción más fácil: Supabase (Gratis)**
1. Ve a [supabase.com](https://supabase.com)
2. Crea una cuenta y un nuevo proyecto
3. Ve a "Settings" → "Database"
4. Copia la "Connection string" (URI)
5. Reemplaza `[YOUR-PASSWORD]` con tu contraseña

### 2. Desplegar Backend en Railway (Recomendado)

1. Ve a [railway.app](https://railway.app) y crea cuenta
2. "New Project" → "Deploy from GitHub repo"
3. Selecciona tu repositorio y la carpeta `backend`
4. Railway detectará automáticamente Node.js
5. Agrega PostgreSQL:
   - "New" → "Database" → "PostgreSQL"
6. Configura variables de entorno:
   - `DATABASE_URL` → Usa la variable automática de Railway: `${{Postgres.DATABASE_URL}}`
   - `JWT_SECRET` → Genera uno y pégalo
   - `NODE_ENV=production`
7. Railway desplegará automáticamente

### 3. Ejecutar Migraciones

Una vez desplegado, ejecuta las migraciones:

```bash
# Desde tu máquina local (con Railway CLI)
railway run npx prisma migrate deploy

# O desde el dashboard de Railway:
# Ve a tu servicio → "Deployments" → "View Logs" → Ejecuta el comando
```

### 4. Actualizar netlify.toml

Una vez que Railway te dé la URL de tu backend (ej: `https://tu-backend.railway.app`), actualiza `netlify.toml`:

```toml
[[redirects]]
  from = "/api/*"
  to = "https://tu-backend.railway.app/api/:splat"
  status = 200
  force = true
```

## Verificar que Funciona

1. Visita: `https://tu-backend.railway.app/api/ifcbuildings`
2. Deberías ver una respuesta JSON (puede estar vacía, pero no un error)
3. Si ves HTML o un error 404, verifica la URL

## Solución de Problemas

### Error: "Cannot connect to database"
- Verifica que `DATABASE_URL` esté correcta
- Asegúrate de que la base de datos esté accesible desde internet
- En Supabase, verifica que "Connection pooling" esté habilitado

### Error: "Prisma Client not generated"
Railway debería ejecutar `postinstall` automáticamente. Si no:
- Agrega en Railway: Build Command: `npm install && npm run build`

### Error de CORS
- Verifica que `https://ccspt.netlify.app` esté en los orígenes permitidos
- O agrega `FRONTEND_URL` en las variables de entorno

