# Guía de Despliegue en Netlify

## 📋 Configuración Inicial

### 1. Configuración en Netlify Dashboard

1. Ve a tu proyecto en Netlify
2. Ve a **Site settings** → **Build & deploy**
3. Configura lo siguiente:
   - **Base directory**: `frontend`
   - **Build command**: `npm run build`
   - **Publish directory**: `frontend/dist`

### 2. Variables de Entorno

Si tu aplicación necesita variables de entorno, agrégalas en:
**Site settings** → **Environment variables**

Ejemplos comunes:
```
VITE_API_URL=https://tu-backend-url.com
VITE_FIREBASE_API_KEY=tu-api-key
```

### 3. Configuración del Backend

⚠️ **IMPORTANTE**: El archivo `netlify.toml` tiene redirecciones de API que apuntan a tu backend.

**Debes actualizar las URLs en `netlify.toml`:**

```toml
[[redirects]]
  from = "/api/*"
  to = "https://TU-BACKEND-URL.com/api/:splat"  # ← Cambia esto
  status = 200
  force = true

[[redirects]]
  from = "/uploads/*"
  to = "https://TU-BACKEND-URL.com/uploads/:splat"  # ← Cambia esto
  status = 200
  force = true
```

### 4. Opciones para el Backend

#### Opción A: Backend en otro servidor
- Actualiza las URLs en `netlify.toml` con la URL de tu backend
- Asegúrate de que tu backend tenga CORS configurado para aceptar peticiones desde tu dominio de Netlify

#### Opción B: Usar Netlify Functions (recomendado para producción)
Si quieres manejar el backend en Netlify, puedes crear Netlify Functions. Esto requiere reestructurar el backend.

#### Opción C: Backend local (solo desarrollo)
Si estás en desarrollo, puedes usar un servicio como ngrok para exponer tu backend local.

## 🔧 Solución de Problemas Comunes

### Error: "Module not found" o errores de importación
- Verifica que todas las rutas de importación usen rutas relativas o los alias configurados
- Asegúrate de que `tsc` no tenga errores antes del build

### Error: "404 en rutas de React Router"
- Verifica que el archivo `frontend/public/_redirects` esté presente
- Asegúrate de que `netlify.toml` tenga la redirección `/*` a `/index.html`

### Error: "API calls fallan"
- Verifica que las URLs en `netlify.toml` sean correctas
- Revisa la consola del navegador para ver errores de CORS
- Asegúrate de que tu backend esté accesible públicamente

### Error: "Build fails"
- Revisa los logs de build en Netlify
- Asegúrate de que Node.js versión 18 esté configurada
- Verifica que todas las dependencias estén en `package.json`

### Assets no se cargan (imágenes, modelos, etc.)
- Verifica que los archivos estén en `frontend/public/`
- Asegúrate de usar rutas absolutas (empezando con `/`) para assets públicos
- Revisa que `vite.config.ts` tenga `base: "/"` (no `"./"`)

## 📝 Checklist Pre-Deploy

- [ ] Actualizar URLs del backend en `netlify.toml`
- [ ] Verificar que el build funciona localmente: `cd frontend && npm run build`
- [ ] Revisar que no haya errores de TypeScript: `cd frontend && npx tsc --noEmit`
- [ ] Verificar que los assets públicos estén en `frontend/public/`
- [ ] Configurar variables de entorno en Netlify si son necesarias
- [ ] Verificar configuración de CORS en el backend
- [ ] Probar que las rutas de React Router funcionan correctamente

## 🚀 Comandos Útiles

```bash
# Build local para probar
cd frontend
npm run build

# Preview del build
npm run preview

# Verificar TypeScript
npx tsc --noEmit
```

## 📞 Soporte

Si sigues teniendo problemas:
1. Revisa los logs de build en Netlify
2. Revisa la consola del navegador en producción
3. Verifica la configuración de redirecciones en Netlify Dashboard

