# ✅ Checklist de Despliegue - Sigue este orden

## 📋 Estado Actual

- [x] Frontend desplegado en Netlify: https://ccspt.netlify.app
- [x] CORS actualizado para aceptar Netlify
- [x] JWT_SECRET generado
- [x] Scripts de build configurados
- [ ] Base de datos PostgreSQL creada
- [ ] Backend desplegado en Railway
- [ ] Migraciones ejecutadas
- [ ] netlify.toml actualizado con URL del backend

## 🎯 Siguiente Paso: Crear Base de Datos

### Opción 1: Supabase (Recomendado - 5 minutos)

1. **Abre**: https://supabase.com
2. **Click**: "Start your project" → "Sign up" (puedes usar GitHub)
3. **Click**: "New Project"
4. **Completa**:
   - Name: `ccspt-backend`
   - Database Password: **Genera una y guárdala** (ej: usa un generador de contraseñas)
   - Region: Elige la más cercana
5. **Click**: "Create new project"
6. **Espera** 2-3 minutos
7. **Ve a**: Settings (⚙️) → Database
8. **Scroll** hasta "Connection string"
9. **Selecciona**: "URI" (no "Session mode")
10. **Copia** la URL completa
11. **Reemplaza** `[YOUR-PASSWORD]` con tu contraseña real
12. **Guarda** esta URL - la necesitarás

**Ejemplo de URL final:**
```
postgresql://postgres.xxxxx:TU_PASSWORD@aws-0-eu-central-1.pooler.supabase.com:6543/postgres
```

### Opción 2: Neon (Alternativa)

1. Ve a https://neon.tech
2. Crea cuenta → "Create a project"
3. Copia la connection string que te dan

---

## 🚂 Paso Siguiente: Desplegar en Railway

Una vez que tengas la base de datos, continúa aquí:

### 1. Crear cuenta en Railway

1. Ve a https://railway.app
2. Click "Start a New Project"
3. Selecciona "Login with GitHub"
4. Autoriza Railway

### 2. Desplegar el backend

1. Click "New Project"
2. Selecciona "Deploy from GitHub repo"
3. Busca `CCSPT-FM` y selecciónalo
4. **IMPORTANTE**: En la configuración, busca "Root Directory"
5. Escribe: `backend`
6. Click "Deploy"

### 3. Agregar PostgreSQL

1. En tu proyecto, click "New" (botón verde)
2. "Database" → "Add PostgreSQL"
3. Railway creará la base de datos automáticamente

### 4. Configurar Variables

En el servicio del backend → "Variables" → Agrega:

```
DATABASE_URL = ${{Postgres.DATABASE_URL}}
JWT_SECRET = 23bf0917864a9052f58ed2306d14387afab1a8435efb4e5e3424f715bf8d871a
NODE_ENV = production
FRONTEND_URL = https://ccspt.netlify.app
```

### 5. Ejecutar Migraciones

Railway → Backend → Deployments → ⋯ → "Open in Shell":
```bash
npx prisma migrate deploy
```

### 6. Obtener URL

Railway → Backend → Settings → Networking → "Generate Domain"

### 7. Actualizar Netlify

Actualiza `netlify.toml` con la URL de Railway y redesplega.

---

## 📞 ¿Necesitas ayuda?

Si te quedas atascado en algún paso, dime en qué paso estás y te ayudo.

