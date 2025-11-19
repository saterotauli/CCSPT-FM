# Pasos para Desplegar el Backend en Railway

## 1. Crear Base de Datos PostgreSQL

### Opción A: Usar Supabase (Recomendado - Gratis)

1. Ve a https://supabase.com
2. Crea una cuenta (puedes usar GitHub)
3. Click en "New Project"
4. Completa el formulario:
   - **Name**: `ccspt-db` (o el nombre que prefieras)
   - **Database Password**: Genera una contraseña segura (GUÁRDALA)
   - **Region**: Elige la más cercana
5. Espera a que se cree el proyecto (2-3 minutos)
6. Ve a **Settings** → **Database**
7. Busca **Connection string** → **URI**
8. Copia la URL, será algo como:
   ```
   postgresql://postgres:[YOUR-PASSWORD]@db.xxxxx.supabase.co:5432/postgres
   ```
9. Reemplaza `[YOUR-PASSWORD]` con la contraseña que generaste
10. **GUARDA ESTA URL COMPLETA** - la necesitarás para Railway

### Opción B: Usar Railway PostgreSQL

Railway también ofrece bases de datos PostgreSQL. Si eliges esta opción:
1. En Railway, después de crear el proyecto
2. Click en "New" → "Database" → "Add PostgreSQL"
3. Railway generará automáticamente la variable `DATABASE_URL`
4. No necesitas configurarla manualmente

## 2. Desplegar Backend en Railway

### Paso 1: Crear Proyecto en Railway

1. Ve a https://railway.app
2. Login con GitHub
3. Click en "New Project"
4. Selecciona "Deploy from GitHub repo"
5. Autoriza Railway si es necesario
6. Selecciona tu repositorio **CCSPT-FM**

### Paso 2: Configurar el Servicio Backend

1. Railway detectará automáticamente el proyecto
2. Click en el servicio que se creó
3. Ve a **Settings** → **Root Directory**
4. Cambia a: `backend`
5. Guarda los cambios

### Paso 3: Configurar Variables de Entorno

1. En el servicio del backend, ve a **Variables**
2. Agrega las siguientes variables:

#### Si usas Supabase (Opción A):
```
DATABASE_URL = postgresql://postgres:TU_PASSWORD@db.xxxxx.supabase.co:5432/postgres
JWT_SECRET = c65f1206d5135f52578881c9e1d5d25255a0491193c65b6cf1388cff51497793
NODE_ENV = production
FRONTEND_URL = https://ccspt.netlify.app
```

#### Si usas Railway PostgreSQL (Opción B):
```
DATABASE_URL = ${{Postgres.DATABASE_URL}}
JWT_SECRET = c65f1206d5135f52578881c9e1d5d25255a0491193c65b6cf1388cff51497793
NODE_ENV = production
FRONTEND_URL = https://ccspt.netlify.app
```

**Nota**: El `JWT_SECRET` debe ser el mismo que generó el script `deploy-backend.ps1`

### Paso 4: Generar Dominio Público

1. En el servicio del backend, ve a **Settings** → **Networking**
2. Click en "Generate Domain"
3. Railway generará una URL como: `https://tu-backend-production.up.railway.app`
4. **COPIA ESTA URL** - la necesitarás para actualizar Netlify

### Paso 5: Ejecutar Migraciones de Base de Datos

1. En Railway, ve al servicio del backend
2. Click en "Deployments" → Selecciona el último deployment
3. Click en "View Logs"
4. Verifica que el build se completó correctamente
5. Para ejecutar las migraciones, puedes:
   - **Opción A**: Usar Railway CLI
     ```bash
     railway run npx prisma migrate deploy
     ```
   - **Opción B**: Agregar un script de inicio que ejecute las migraciones automáticamente

## 3. Actualizar Netlify con la URL del Backend

Una vez que tengas la URL del backend de Railway:

1. Ejecuta el script:
   ```powershell
   .\actualizar-backend-url.ps1 -BackendUrl "https://tu-backend.railway.app"
   ```

2. O manualmente edita `netlify.toml` y reemplaza `BACKEND_URL_PLACEHOLDER` con tu URL

3. Redesplega en Netlify:
   ```bash
   npx netlify deploy --prod
   ```

## 4. Verificar que Todo Funciona

1. Abre tu frontend en Netlify: https://ccspt.netlify.app
2. Intenta hacer login
3. Verifica que las peticiones al API funcionan
4. Revisa los logs en Railway para ver si hay errores

## Troubleshooting

### Error: "Cannot connect to database"
- Verifica que `DATABASE_URL` esté correctamente configurada
- Asegúrate de que la contraseña en la URL sea correcta
- Si usas Supabase, verifica que el proyecto esté activo

### Error: "CORS policy"
- Verifica que `FRONTEND_URL` en Railway sea `https://ccspt.netlify.app`
- Revisa que el backend tenga configurado CORS correctamente

### Error: "JWT_SECRET is not defined"
- Verifica que la variable `JWT_SECRET` esté configurada en Railway
- Debe ser el mismo valor que generó el script

### Las migraciones no se ejecutan
- Railway ejecuta `postinstall` automáticamente, que genera el cliente Prisma
- Para ejecutar migraciones, usa: `railway run npx prisma migrate deploy`
- O agrega un script de inicio que ejecute las migraciones

## Scripts Útiles

### Ver logs del backend en Railway
```bash
railway logs
```

### Ejecutar comandos en Railway
```bash
railway run <comando>
```

### Conectar a la base de datos
```bash
railway connect postgres
```

