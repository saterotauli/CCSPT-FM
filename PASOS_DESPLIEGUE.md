# 🚀 Pasos de Despliegue Completos

## JWT_SECRET Generado

**Guarda este secreto de forma segura:**
```
23bf0917864a9052f58ed2306d14387afab1a8435efb4e5e3424f715bf8d871a
```

## 📝 Paso a Paso

### 1️⃣ Crear Base de Datos PostgreSQL (5 min)

**Opción más fácil: Supabase**

1. Ve a https://supabase.com
2. Click "Start your project" → Crea cuenta (puedes usar GitHub)
3. Click "New Project"
4. Completa:
   - **Name**: `ccspt-backend`
   - **Database Password**: Genera una y **guárdala**
   - **Region**: Elige la más cercana (ej: `West US`)
5. Click "Create new project"
6. Espera 2-3 minutos
7. Ve a **Settings** (⚙️) → **Database**
8. Scroll hasta "Connection string"
9. Selecciona **URI** (no "Session mode")
10. Copia la URL (ej: `postgresql://postgres:[YOUR-PASSWORD]@db.xxxxx.supabase.co:5432/postgres`)
11. **Reemplaza `[YOUR-PASSWORD]`** con tu contraseña
12. **Guarda esta URL completa** - la necesitarás

### 2️⃣ Desplegar Backend en Railway (10 min)

1. Ve a https://railway.app
2. Click "Start a New Project" → "Login with GitHub"
3. Autoriza Railway
4. Click "New Project"
5. Selecciona "Deploy from GitHub repo"
6. Busca `CCSPT-FM` y selecciónalo
7. **IMPORTANTE**: En "Configure Service", busca "Root Directory"
8. Escribe: `backend`
9. Click "Deploy"
10. Espera a que termine el build (verás logs en tiempo real)

### 3️⃣ Agregar PostgreSQL en Railway

1. En tu proyecto de Railway, click en "New" (botón verde)
2. Selecciona "Database" → "Add PostgreSQL"
3. Railway creará automáticamente la base de datos
4. **Anota el nombre del servicio** (ej: "Postgres" o "PostgreSQL")

### 4️⃣ Configurar Variables de Entorno

1. Click en tu servicio del **backend** (no en PostgreSQL)
2. Ve a la pestaña "Variables"
3. Click en "New Variable"
4. Agrega estas variables una por una:

**Variable 1:**
- Name: `DATABASE_URL`
- Value: `${{Postgres.DATABASE_URL}}`
  *(Reemplaza "Postgres" con el nombre exacto de tu servicio PostgreSQL)*

**Variable 2:**
- Name: `JWT_SECRET`
- Value: `23bf0917864a9052f58ed2306d14387afab1a8435efb4e5e3424f715bf8d871a`

**Variable 3:**
- Name: `NODE_ENV`
- Value: `production`

**Variable 4:**
- Name: `FRONTEND_URL`
- Value: `https://ccspt.netlify.app`

5. Railway reiniciará automáticamente

### 5️⃣ Ejecutar Migraciones

1. En Railway, click en tu servicio backend
2. Ve a "Deployments"
3. Click en los tres puntos (⋯) del último deployment
4. Selecciona "Open in Shell"
5. En la terminal que se abre, escribe:
   ```bash
   npx prisma migrate deploy
   ```
6. Presiona Enter
7. Deberías ver: "All migrations have been successfully applied"

### 6️⃣ Obtener URL del Backend

1. En Railway, click en tu servicio backend
2. Ve a "Settings"
3. Scroll hasta "Networking"
4. Click en "Generate Domain"
5. **Copia la URL completa** (ej: `https://ccspt-backend-production.up.railway.app`)

### 7️⃣ Actualizar netlify.toml

1. Abre `netlify.toml` en la raíz del proyecto
2. Busca las líneas 17 y 24
3. Reemplaza `https://tu-backend-url.com` con tu URL de Railway
4. Guarda el archivo

### 8️⃣ Redesplegar Frontend

```bash
npx netlify deploy --prod
```

## ✅ Verificar

1. Visita tu URL de Railway: `https://tu-backend.railway.app/api/ifcbuildings`
   - Deberías ver `[]` o una lista (no un error)
2. Visita: `https://ccspt.netlify.app`
   - Abre la consola (F12)
   - No deberías ver errores de "Unexpected token '<'"

## 🆘 Problemas Comunes

### "Cannot connect to database"
- Verifica que `DATABASE_URL` en Railway use el formato correcto: `${{NombreDelServicio.DATABASE_URL}}`
- Asegúrate de que el servicio PostgreSQL esté corriendo

### "Prisma Client not generated"
- Railway debería ejecutar `postinstall` automáticamente
- Si no, en Settings → Build Command: `npm install && npm run build`

### APIs devuelven HTML
- Verifica que la URL en `netlify.toml` sea correcta
- Asegúrate de que el backend esté corriendo (revisa logs en Railway)

