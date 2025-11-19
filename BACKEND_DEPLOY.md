# Guía de Despliegue del Backend

## 📋 Requisitos

El backend necesita:
- **Base de datos PostgreSQL** (puede ser local o en la nube)
- **Node.js 18+**
- **Variables de entorno** configuradas

## 🗄️ Opción 1: Base de Datos PostgreSQL en la Nube (Recomendado)

### Opciones de hosting de PostgreSQL:

1. **Supabase** (Gratis hasta cierto límite)
   - Ve a [supabase.com](https://supabase.com)
   - Crea un proyecto
   - Obtén la connection string de la sección "Database" → "Connection string"

2. **Neon** (Gratis tier disponible)
   - Ve a [neon.tech](https://neon.tech)
   - Crea un proyecto
   - Copia la connection string

3. **Railway** (Gratis tier disponible)
   - Ve a [railway.app](https://railway.app)
   - Crea un proyecto PostgreSQL
   - Obtén la connection string

4. **Render** (Gratis tier disponible)
   - Ve a [render.com](https://render.com)
   - Crea una base de datos PostgreSQL
   - Obtén la connection string

### Formato de DATABASE_URL:
```
postgresql://usuario:password@host:puerto/database?schema=public
```

## 🚀 Opción 2: Desplegar Backend en la Nube

### Opción A: Railway (Recomendado - Fácil)

1. Ve a [railway.app](https://railway.app)
2. Crea una cuenta y un nuevo proyecto
3. **Agrega PostgreSQL:**
   - Click en "New" → "Database" → "PostgreSQL"
   - Railway creará automáticamente la base de datos
4. **Agrega el backend:**
   - Click en "New" → "GitHub Repo"
   - Conecta tu repositorio
   - Selecciona la carpeta `backend`
5. **Configura las variables de entorno:**
   - Ve a tu servicio backend → "Variables"
   - Agrega:
     ```
     DATABASE_URL=<connection_string_de_postgresql>
     JWT_SECRET=<tu_secreto_jwt>
     PORT=4000
     NODE_ENV=production
     ```
6. **Configura el build:**
   - Build Command: `npm run build`
   - Start Command: `npm start`
7. Railway desplegará automáticamente

### Opción B: Render

1. Ve a [render.com](https://render.com)
2. Crea una cuenta
3. **Crea PostgreSQL:**
   - "New" → "PostgreSQL"
   - Copia la "Internal Database URL"
4. **Crea Web Service:**
   - "New" → "Web Service"
   - Conecta tu repositorio
   - Root Directory: `backend`
   - Build Command: `npm install && npm run build`
   - Start Command: `npm start`
5. **Variables de entorno:**
   ```
   DATABASE_URL=<internal_database_url>
   JWT_SECRET=<tu_secreto>
   PORT=4000
   NODE_ENV=production
   ```

### Opción C: Heroku

1. Instala Heroku CLI
2. Login: `heroku login`
3. Crea app: `heroku create tu-app-backend`
4. Agrega PostgreSQL: `heroku addons:create heroku-postgresql:mini`
5. Configura variables:
   ```bash
   heroku config:set JWT_SECRET=tu_secreto
   heroku config:set NODE_ENV=production
   ```
6. Despliega: `git push heroku main`

## 🔧 Configuración Local para Desarrollo

Crea un archivo `.env` en la carpeta `backend/`:

```env
# Base de datos PostgreSQL
DATABASE_URL="postgresql://usuario:password@localhost:5432/nombre_db?schema=public"

# JWT Secret (cambia esto por un valor seguro)
JWT_SECRET="tu_secreto_super_seguro_aqui"

# Puerto del servidor
PORT=4000

# Entorno
NODE_ENV=development

# Firebase (opcional, para notificaciones)
FIREBASE_SERVICE_ACCOUNT_KEY='{"type":"service_account",...}'
FIREBASE_PROJECT_ID="tu-project-id"

# OpenAI (opcional, para consultas)
OPENAI_API_KEY="sk-..."
OPENAI_MODEL="gpt-3.5-turbo"

# Sensores (opcional)
ENABLE_PERSISTENT_SENSORS=false
SENSOR_UPDATE_INTERVAL=120000
```

## 📝 Pasos para Configurar la Base de Datos

### 1. Crear la base de datos

Si usas PostgreSQL local:
```bash
createdb nombre_db
```

O desde psql:
```sql
CREATE DATABASE nombre_db;
```

### 2. Ejecutar migraciones de Prisma

```bash
cd backend
npm install
npx prisma migrate deploy
# O para desarrollo:
npx prisma migrate dev
```

### 3. Generar el cliente de Prisma

```bash
npx prisma generate
```

### 4. Verificar la conexión

```bash
npx prisma studio
```

Esto abrirá una interfaz web para ver tus datos.

## 🔄 Actualizar CORS para Netlify

El backend necesita aceptar peticiones desde tu dominio de Netlify. Actualiza `backend/src/app.ts`:

```typescript
app.use(cors({
  origin: [
    'http://localhost:3000',
    'http://localhost:5173',
    'https://ccspt.netlify.app',
    'https://tu-dominio-personalizado.com'
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept']
}));
```

## 🔗 Actualizar netlify.toml

Una vez que tengas la URL de tu backend desplegado, actualiza `netlify.toml`:

```toml
[[redirects]]
  from = "/api/*"
  to = "https://tu-backend.railway.app/api/:splat"  # ← Tu URL real
  status = 200
  force = true

[[redirects]]
  from = "/uploads/*"
  to = "https://tu-backend.railway.app/uploads/:splat"  # ← Tu URL real
  status = 200
  force = true
```

## ✅ Checklist de Despliegue

- [ ] Base de datos PostgreSQL creada y accesible
- [ ] Variables de entorno configuradas en el servicio de hosting
- [ ] Migraciones de Prisma ejecutadas (`prisma migrate deploy`)
- [ ] CORS actualizado con el dominio de Netlify
- [ ] Backend desplegado y funcionando
- [ ] `netlify.toml` actualizado con la URL del backend
- [ ] Probado que las APIs responden correctamente

## 🐛 Solución de Problemas

### Error: "Cannot connect to database"
- Verifica que `DATABASE_URL` esté correctamente configurada
- Asegúrate de que la base de datos esté accesible desde internet (no solo localhost)
- Verifica que el firewall permita conexiones

### Error: "Prisma Client not generated"
```bash
cd backend
npx prisma generate
```

### Error: "Migration not applied"
```bash
cd backend
npx prisma migrate deploy
```

### Error de CORS
- Verifica que el dominio de Netlify esté en la lista de `origin` en CORS
- Asegúrate de que `credentials: true` esté configurado

