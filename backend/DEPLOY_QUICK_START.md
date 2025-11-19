# 🚀 Despliegue Rápido del Backend

## Paso 1: Crear Base de Datos PostgreSQL (5 minutos)

### Opción A: Supabase (Recomendado - Más fácil)

1. Ve a https://supabase.com y crea una cuenta
2. Click en "New Project"
3. Completa:
   - **Name**: `ccspt-backend` (o el nombre que prefieras)
   - **Database Password**: Genera una contraseña segura (guárdala)
   - **Region**: Elige la más cercana
4. Espera 2-3 minutos a que se cree el proyecto
5. Ve a **Settings** → **Database**
6. En "Connection string", selecciona **URI**
7. Copia la URL completa (se ve así: `postgresql://postgres:[YOUR-PASSWORD]@db.xxxxx.supabase.co:5432/postgres`)
8. **Reemplaza `[YOUR-PASSWORD]`** con la contraseña que creaste
9. **Guarda esta URL** - la necesitarás en el siguiente paso

### Opción B: Neon (Alternativa)

1. Ve a https://neon.tech y crea una cuenta
2. Click en "Create a project"
3. Completa el formulario
4. Copia la connection string que te dan
5. **Guarda esta URL**

## Paso 2: Desplegar Backend en Railway (10 minutos)

### 2.1 Crear cuenta y proyecto

1. Ve a https://railway.app
2. Click en "Start a New Project" → "Login with GitHub"
3. Autoriza Railway a acceder a tu repositorio

### 2.2 Desplegar el backend

1. En Railway, click en "New Project"
2. Selecciona "Deploy from GitHub repo"
3. Busca y selecciona tu repositorio `CCSPT-FM`
4. Railway detectará automáticamente que hay un backend
5. **IMPORTANTE**: En "Root Directory", escribe: `backend`
6. Click en "Deploy"

### 2.3 Agregar PostgreSQL

1. En tu proyecto de Railway, click en "New"
2. Selecciona "Database" → "Add PostgreSQL"
3. Railway creará automáticamente una base de datos
4. **Guarda el nombre del servicio** (ej: "Postgres")

### 2.4 Configurar Variables de Entorno

1. Click en tu servicio del backend (no en PostgreSQL)
2. Ve a la pestaña "Variables"
3. Agrega las siguientes variables:

```
DATABASE_URL = ${{Postgres.DATABASE_URL}}
```

(Para agregar esto, click en "New Variable", nombre: `DATABASE_URL`, valor: `${{Postgres.DATABASE_URL}}` - reemplaza "Postgres" con el nombre exacto de tu servicio PostgreSQL)

```
JWT_SECRET = [PEGA_AQUI_EL_SECRETO_GENERADO]
```

```
NODE_ENV = production
```

```
FRONTEND_URL = https://ccspt.netlify.app
```

4. Railway reiniciará automáticamente el servicio

### 2.5 Ejecutar Migraciones

1. En Railway, click en tu servicio backend
2. Ve a la pestaña "Deployments"
3. Click en los tres puntos (⋯) del último deployment
4. Selecciona "Open in Shell"
5. Ejecuta:
   ```bash
   npx prisma migrate deploy
   ```
6. Espera a que termine (debería decir "All migrations have been applied")

### 2.6 Obtener la URL del Backend

1. En Railway, click en tu servicio backend
2. Ve a la pestaña "Settings"
3. Scroll hasta "Networking"
4. Click en "Generate Domain"
5. **Copia la URL** (ej: `https://tu-backend.railway.app`)

## Paso 3: Actualizar Netlify

1. Abre `netlify.toml` en la raíz del proyecto
2. Reemplaza las líneas 17 y 24 con tu URL de Railway:

```toml
[[redirects]]
  from = "/api/*"
  to = "https://TU-BACKEND-RAILWAY.railway.app/api/:splat"
  status = 200
  force = true

[[redirects]]
  from = "/uploads/*"
  to = "https://TU-BACKEND-RAILWAY.railway.app/uploads/:splat"
  status = 200
  force = true
```

3. Guarda el archivo
4. Redesplega:
   ```bash
   npx netlify deploy --prod
   ```

## ✅ Verificar que Funciona

1. Visita: `https://TU-BACKEND-RAILWAY.railway.app/api/ifcbuildings`
2. Deberías ver `[]` o una lista de edificios (no un error)
3. Visita: `https://ccspt.netlify.app`
4. Abre la consola del navegador (F12)
5. No deberías ver errores de CORS o "Unexpected token '<'"

## 🆘 Si algo falla

### Error: "Cannot connect to database"
- Verifica que `DATABASE_URL` esté correcta en Railway
- Asegúrate de que el servicio PostgreSQL esté corriendo
- Verifica que la contraseña en la URL sea correcta

### Error: "Prisma Client not generated"
- Railway debería ejecutar `postinstall` automáticamente
- Si no, en Railway → Settings → Build Command: `npm install && npm run build`

### Error de CORS
- Verifica que `FRONTEND_URL` esté configurada en Railway
- Asegúrate de que la URL sea exactamente `https://ccspt.netlify.app` (sin barra final)

### Las APIs devuelven HTML en lugar de JSON
- Verifica que la URL en `netlify.toml` sea correcta
- Asegúrate de que el backend esté corriendo en Railway
- Revisa los logs de Railway para ver si hay errores

