# 🚀 Inicio Rápido - Despliegue Completo

## ✅ Lo que ya está hecho

- ✅ Frontend desplegado: https://ccspt.netlify.app
- ✅ CORS configurado para Netlify
- ✅ JWT_SECRET generado
- ✅ Scripts de build optimizados
- ✅ Archivos de configuración creados

## 🎯 Lo que necesitas hacer ahora (15-20 minutos)

### PASO 1: Crear Base de Datos (5 min) ⏱️

**Ve a Supabase:**
1. Abre: https://supabase.com
2. Crea cuenta (puedes usar GitHub)
3. "New Project"
4. Name: `ccspt-backend`
5. Password: Genera una segura (guárdala)
6. Region: La más cercana
7. "Create new project"
8. Espera 2-3 minutos
9. Settings → Database
10. Connection string → Selecciona "URI"
11. Copia la URL
12. Reemplaza `[YOUR-PASSWORD]` con tu contraseña
13. ✅ **Guarda esta URL**

---

### PASO 2: Desplegar Backend (10 min) ⏱️

**Ve a Railway:**
1. Abre: https://railway.app
2. "Start a New Project" → Login con GitHub
3. "New Project" → "Deploy from GitHub repo"
4. Selecciona `CCSPT-FM`
5. **Root Directory**: `backend` ⚠️ IMPORTANTE
6. "Deploy"

**Agregar PostgreSQL:**
7. "New" → "Database" → "Add PostgreSQL"
8. Anota el nombre del servicio (ej: "Postgres")

**Variables de entorno:**
9. Click en tu servicio **backend** (no PostgreSQL)
10. Pestaña "Variables"
11. Agrega estas 4 variables:

| Name | Value |
|------|-------|
| `DATABASE_URL` | `${{Postgres.DATABASE_URL}}` *(reemplaza "Postgres" con el nombre de tu servicio)* |
| `JWT_SECRET` | `23bf0917864a9052f58ed2306d14387afab1a8435efb4e5e3424f715bf8d871a` |
| `NODE_ENV` | `production` |
| `FRONTEND_URL` | `https://ccspt.netlify.app` |

**Ejecutar migraciones:**
12. Backend → "Deployments" → ⋯ → "Open in Shell"
13. Ejecuta: `npx prisma migrate deploy`
14. Espera a que termine

**Obtener URL:**
15. Backend → "Settings" → "Networking"
16. "Generate Domain"
17. ✅ **Copia la URL** (ej: `https://ccspt-backend.railway.app`)

---

### PASO 3: Conectar Frontend con Backend (2 min) ⏱️

1. Abre `netlify.toml`
2. Línea 17: Reemplaza `https://tu-backend-url.com` con tu URL de Railway
3. Línea 24: Reemplaza `https://tu-backend-url.com` con tu URL de Railway
4. Guarda el archivo
5. Ejecuta: `npx netlify deploy --prod`

---

## ✅ Verificar que Funciona

1. **Backend**: Visita `https://tu-backend.railway.app/api/ifcbuildings`
   - Deberías ver `[]` o una lista (no error)

2. **Frontend**: Visita `https://ccspt.netlify.app`
   - Abre consola (F12)
   - No deberías ver errores de "Unexpected token '<'"

---

## 🔑 Credenciales Importantes

**JWT_SECRET:**
```
23bf0917864a9052f58ed2306d14387afab1a8435efb4e5e3424f715bf8d871a
```

**Guarda esto de forma segura** - lo necesitarás para Railway.

---

## 📞 ¿Problemas?

- **Error de conexión a BD**: Verifica que `DATABASE_URL` use el formato `${{NombreServicio.DATABASE_URL}}`
- **CORS bloqueado**: Verifica que `FRONTEND_URL` sea exactamente `https://ccspt.netlify.app`
- **APIs devuelven HTML**: Verifica que la URL en `netlify.toml` sea correcta

---

## 🎉 ¡Listo!

Una vez completados estos pasos, tu aplicación estará completamente desplegada y funcionando.

