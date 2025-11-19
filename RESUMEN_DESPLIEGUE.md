# Resumen del Despliegue - CCSPT-FM

## Estado Actual

✅ **Frontend**: Desplegado en Netlify (https://ccspt.netlify.app)
✅ **Configuración del API**: Centralizada en `frontend/src/config/api.ts`
✅ **Scripts de despliegue**: Creados y listos para usar

## Próximos Pasos

### 1. Crear Base de Datos PostgreSQL

**Opción Recomendada: Supabase (Gratis)**
- Ve a https://supabase.com
- Crea proyecto y obtén la `DATABASE_URL`
- Ver `PASOS_RAILWAY.md` para instrucciones detalladas

### 2. Desplegar Backend en Railway

1. **Crear proyecto en Railway**
   - https://railway.app → New Project → Deploy from GitHub
   - Selecciona tu repositorio CCSPT-FM
   - Configura Root Directory: `backend`

2. **Configurar Variables de Entorno**
   ```
   DATABASE_URL = [URL de tu base de datos]
   JWT_SECRET = c65f1206d5135f52578881c9e1d5d25255a0491193c65b6cf1388cff51497793
   NODE_ENV = production
   FRONTEND_URL = https://ccspt.netlify.app
   ```

3. **Generar Dominio Público**
   - Settings → Networking → Generate Domain
   - Copia la URL generada

### 3. Actualizar Netlify con URL del Backend

```powershell
.\actualizar-backend-url.ps1 -BackendUrl "https://tu-backend.railway.app"
```

O manualmente edita `netlify.toml` y reemplaza `BACKEND_URL_PLACEHOLDER`

### 4. Redesplegar Frontend

```bash
npx netlify deploy --prod
```

## Archivos Importantes

### Configuración del Frontend
- `frontend/src/config/api.ts` - Configuración centralizada del API
- `netlify.toml` - Configuración de Netlify (redirecciones al backend)

### Scripts de Ayuda
- `deploy-backend.ps1` - Script interactivo para guiar el despliegue
- `actualizar-backend-url.ps1` - Actualiza la URL del backend en netlify.toml

### Documentación
- `PASOS_RAILWAY.md` - Guía detallada para Railway
- `VARIABLES_RAILWAY.txt` - Variables de entorno necesarias

## Cambios Realizados

### Frontend
1. ✅ Creado `frontend/src/config/api.ts` para configuración centralizada
2. ✅ Actualizados servicios para usar la configuración centralizada:
   - `authService.ts`
   - `taskService.ts`
   - `userService.ts`
   - `messagingService.ts`
3. ✅ Configurado `netlify.toml` con placeholders para el backend

### Backend
1. ✅ Configurado CORS para aceptar requests de Netlify
2. ✅ Agregado script `postinstall` para generar Prisma client
3. ✅ Agregado script `migrate` para ejecutar migraciones
4. ✅ Configurado para ejecutar migraciones automáticamente en producción
5. ✅ Creado `railway.json` para configuración de Railway

## Variables de Entorno Necesarias

### Railway (Backend)
```
DATABASE_URL = [URL de PostgreSQL]
JWT_SECRET = c65f1206d5135f52578881c9e1d5d25255a0491193c65b6cf1388cff51497793
NODE_ENV = production
FRONTEND_URL = https://ccspt.netlify.app
```

### Netlify (Frontend) - Opcional
```
VITE_API_BASE_URL = [URL del backend] (solo si no usas redirects)
```

## Verificación

Después del despliegue, verifica:

1. ✅ El backend responde en Railway
2. ✅ Las migraciones se ejecutaron correctamente
3. ✅ El frontend puede hacer requests al backend
4. ✅ El login funciona
5. ✅ Las rutas del API funcionan correctamente

## Troubleshooting

Ver `PASOS_RAILWAY.md` para soluciones a problemas comunes.

## Contacto y Soporte

Si encuentras problemas:
1. Revisa los logs en Railway
2. Revisa los logs en Netlify
3. Verifica las variables de entorno
4. Verifica que CORS esté configurado correctamente

