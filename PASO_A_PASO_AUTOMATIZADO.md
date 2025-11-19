# 🤖 Despliegue Semi-Automatizado

He preparado todo para que solo tengas que seguir estos pasos simples:

## ⚡ Inicio Rápido (3 pasos)

### PASO 1: Crear Base de Datos (5 min)

1. **Abre**: https://supabase.com
2. **Crea cuenta** (puedes usar GitHub)
3. **"New Project"**
4. Completa:
   - Name: `ccspt-backend`
   - Password: Genera una (guárdala)
   - Region: La más cercana
5. **Espera** 2-3 minutos
6. **Settings** → **Database** → **Connection string** → **URI**
7. **Copia la URL** y reemplaza `[YOUR-PASSWORD]` con tu contraseña
8. ✅ **Guarda esta URL**

---

### PASO 2: Desplegar en Railway (10 min)

#### 2.1 Crear Proyecto

1. **Abre**: https://railway.app
2. **"Start a New Project"** → **Login with GitHub**
3. **"New Project"** → **"Deploy from GitHub repo"**
4. Selecciona `CCSPT-FM`
5. ⚠️ **IMPORTANTE**: En "Root Directory" escribe: `backend`
6. **"Deploy"**

#### 2.2 Agregar PostgreSQL

1. En tu proyecto Railway, click **"New"** (botón verde)
2. **"Database"** → **"Add PostgreSQL"**
3. Railway creará la base de datos automáticamente
4. **Anota el nombre del servicio** (ej: "Postgres" o "PostgreSQL")

#### 2.3 Configurar Variables

1. Click en tu servicio **backend** (no en PostgreSQL)
2. Pestaña **"Variables"**
3. Click **"New Variable"** y agrega estas 4 variables:

**Abre el archivo `VARIABLES_RAILWAY.txt` y copia/pega cada variable**

O manualmente:

| Name | Value |
|------|-------|
| `DATABASE_URL` | `${{Postgres.DATABASE_URL}}` *(reemplaza "Postgres" con el nombre de tu servicio)* |
| `JWT_SECRET` | `23bf0917864a9052f58ed2306d14387afab1a8435efb4e5e3424f715bf8d871a` |
| `NODE_ENV` | `production` |
| `FRONTEND_URL` | `https://ccspt.netlify.app` |

4. Railway reiniciará automáticamente

#### 2.4 Ejecutar Migraciones

1. Railway → Backend → **"Deployments"**
2. Click en los tres puntos (⋯) del último deployment
3. **"Open in Shell"**
4. Ejecuta el comando del archivo `COMANDOS_RAILWAY.txt`:

```bash
npx prisma migrate deploy
```

5. Espera a que termine (debería decir "All migrations have been successfully applied")

#### 2.5 Obtener URL

1. Railway → Backend → **"Settings"**
2. Scroll hasta **"Networking"**
3. Click **"Generate Domain"**
4. **Copia la URL completa** (ej: `https://ccspt-backend-production.up.railway.app`)

---

### PASO 3: Conectar Frontend (2 min)

**Opción A: Usar el script automatizado**

```powershell
.\ACTUALIZAR_NETLIFY.ps1 -BackendUrl "https://tu-backend.railway.app"
npx netlify deploy --prod
```

**Opción B: Manual**

1. Abre `netlify.toml`
2. Línea 17: Reemplaza `https://tu-backend-url.com` con tu URL de Railway
3. Línea 24: Reemplaza `https://tu-backend-url.com` con tu URL de Railway
4. Guarda
5. Ejecuta: `npx netlify deploy --prod`

---

## ✅ Verificar

1. **Backend**: Visita `https://tu-backend.railway.app/api/ifcbuildings`
   - Deberías ver `[]` o una lista (no error)

2. **Frontend**: Visita `https://ccspt.netlify.app`
   - Abre consola (F12)
   - No deberías ver errores de "Unexpected token '<'"

---

## 📁 Archivos de Ayuda Creados

- `VARIABLES_RAILWAY.txt` - Variables listas para copiar/pegar
- `COMANDOS_RAILWAY.txt` - Comandos para ejecutar en Railway
- `ACTUALIZAR_NETLIFY.ps1` - Script para actualizar netlify.toml
- `deploy-backend-automated.ps1` - Script interactivo completo

---

## 🎯 Resumen

1. ✅ Crear PostgreSQL en Supabase → Copiar URL
2. ✅ Desplegar backend en Railway → Configurar variables
3. ✅ Ejecutar migraciones → Obtener URL
4. ✅ Actualizar netlify.toml → Redesplegar

**Tiempo total: 15-20 minutos**

