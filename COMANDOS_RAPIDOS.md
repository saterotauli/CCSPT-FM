# Comandos Rápidos para Despliegue

## Estado Actual

✅ Backend compila correctamente
✅ Frontend configurado para usar API centralizado
✅ Scripts de despliegue listos

## Pasos para Desplegar

### 1. Crear Base de Datos PostgreSQL

**Opción A: Supabase (Recomendado - Gratis)**
1. Ve a https://supabase.com
2. Crea cuenta y proyecto
3. Settings → Database → Connection string → URI
4. Copia la URL completa (reemplaza [YOUR-PASSWORD])

**Opción B: Railway PostgreSQL**
- Se crea automáticamente al agregar Database en Railway

### 2. Desplegar Backend en Railway

1. Ve a https://railway.app
2. Login con GitHub
3. New Project → Deploy from GitHub repo
4. Selecciona tu repositorio CCSPT-FM
5. Configura Root Directory: `backend`
6. Agrega variables de entorno:
   ```
   DATABASE_URL = [URL de tu base de datos]
   JWT_SECRET = c65f1206d5135f52578881c9e1d5d25255a0491193c65b6cf1388cff51497793
   NODE_ENV = production
   FRONTEND_URL = https://ccspt.netlify.app
   ```
7. Settings → Networking → Generate Domain
8. Copia la URL generada (ej: https://xxx.railway.app)

### 3. Actualizar Netlify con URL del Backend

```powershell
.\actualizar-backend-url.ps1 -BackendUrl "https://tu-backend.railway.app"
```

O edita manualmente `netlify.toml` y reemplaza `BACKEND_URL_PLACEHOLDER`

### 4. Redesplegar Frontend

```bash
npx netlify deploy --prod
```

## Verificación Local

### Compilar Backend
```bash
cd backend
npm run build
```

### Verificar Frontend
```bash
cd frontend
npm run build
```

## Información Importante

- **JWT_SECRET**: `c65f1206d5135f52578881c9e1d5d25255a0491193c65b6cf1388cff51497793`
- **Frontend URL**: `https://ccspt.netlify.app`
- **Migraciones**: Se ejecutan automáticamente al iniciar el backend en producción

## Troubleshooting

### Backend no inicia
- Verifica que `DATABASE_URL` esté correcta
- Revisa los logs en Railway
- Verifica que las migraciones se ejecutaron

### CORS errors
- Verifica que `FRONTEND_URL` en Railway sea `https://ccspt.netlify.app`
- Verifica que el backend tenga CORS configurado

### API no responde
- Verifica que `netlify.toml` tenga la URL correcta del backend
- Verifica que Railway esté desplegado y funcionando

## Documentación Completa

- `PASOS_RAILWAY.md` - Guía detallada paso a paso
- `RESUMEN_DESPLIEGUE.md` - Resumen completo del proceso

