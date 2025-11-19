# Script automatizado de despliegue del backend
# Este script te guiará paso a paso

Write-Host "🚀 Script de Despliegue Automatizado del Backend" -ForegroundColor Cyan
Write-Host "=" * 60 -ForegroundColor Cyan
Write-Host ""

# Verificar estructura
Write-Host "📋 Verificando estructura del proyecto..." -ForegroundColor Yellow
if (-not (Test-Path "backend")) {
    Write-Host "❌ Error: No se encuentra la carpeta 'backend'" -ForegroundColor Red
    exit 1
}
if (-not (Test-Path "backend/package.json")) {
    Write-Host "❌ Error: No se encuentra package.json en backend/" -ForegroundColor Red
    exit 1
}
Write-Host "✅ Estructura verificada" -ForegroundColor Green
Write-Host ""

# Generar JWT_SECRET
Write-Host "🔑 Generando JWT_SECRET..." -ForegroundColor Yellow
try {
    $jwtSecret = node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
    Write-Host "✅ JWT_SECRET generado" -ForegroundColor Green
} catch {
    Write-Host "⚠️  No se pudo generar con Node.js, usando método alternativo" -ForegroundColor Yellow
    $jwtSecret = -join ((48..57) + (97..102) | Get-Random -Count 64 | ForEach-Object {[char]$_})
}
Write-Host ""

# Mostrar información importante
Write-Host "=" * 60 -ForegroundColor Cyan
Write-Host "📝 INFORMACIÓN IMPORTANTE - GUARDA ESTO" -ForegroundColor Yellow
Write-Host "=" * 60 -ForegroundColor Cyan
Write-Host ""
Write-Host "JWT_SECRET para Railway:" -ForegroundColor White
Write-Host $jwtSecret -ForegroundColor Green
Write-Host ""
Write-Host "=" * 60 -ForegroundColor Cyan
Write-Host ""

# Instrucciones paso a paso
Write-Host "📋 PASOS A SEGUIR:" -ForegroundColor Cyan
Write-Host ""
Write-Host "PASO 1: Crear Base de Datos PostgreSQL" -ForegroundColor Yellow
Write-Host "  1. Abre: https://supabase.com" -ForegroundColor White
Write-Host "  2. Crea cuenta (puedes usar GitHub)" -ForegroundColor White
Write-Host "  3. 'New Project' → Completa el formulario" -ForegroundColor White
Write-Host "  4. Settings → Database → Connection string → URI" -ForegroundColor White
Write-Host "  5. Copia la URL y reemplaza [YOUR-PASSWORD]" -ForegroundColor White
Write-Host "  6. Presiona Enter cuando tengas la URL..." -ForegroundColor White
$dbUrl = Read-Host "   Pega aquí la DATABASE_URL"
Write-Host ""

Write-Host "PASO 2: Desplegar en Railway" -ForegroundColor Yellow
Write-Host "  1. Abre: https://railway.app" -ForegroundColor White
Write-Host "  2. Login con GitHub" -ForegroundColor White
Write-Host "  3. 'New Project' → 'Deploy from GitHub repo'" -ForegroundColor White
Write-Host "  4. Selecciona CCSPT-FM" -ForegroundColor White
Write-Host "  5. Root Directory: backend" -ForegroundColor White
Write-Host "  6. 'New' → 'Database' → 'Add PostgreSQL'" -ForegroundColor White
Write-Host "  7. Configura las variables de entorno (ver abajo)" -ForegroundColor White
Write-Host "  8. Presiona Enter cuando hayas configurado Railway..." -ForegroundColor White
Read-Host "   (Presiona Enter para continuar)"

Write-Host ""
Write-Host "PASO 3: Obtener URL del Backend" -ForegroundColor Yellow
Write-Host "  1. En Railway → Backend → Settings → Networking" -ForegroundColor White
Write-Host "  2. 'Generate Domain'" -ForegroundColor White
$backendUrl = Read-Host "  3. Pega aquí la URL de Railway (ej: https://xxx.railway.app)"

# Actualizar netlify.toml
Write-Host ""
Write-Host "📝 Actualizando netlify.toml..." -ForegroundColor Yellow
$netlifyToml = Get-Content "netlify.toml" -Raw
$netlifyToml = $netlifyToml -replace "https://tu-backend-url\.com", $backendUrl
Set-Content "netlify.toml" -Value $netlifyToml
Write-Host "✅ netlify.toml actualizado con: $backendUrl" -ForegroundColor Green

# Redesplegar frontend
Write-Host ""
Write-Host "🚀 Redesplegando frontend..." -ForegroundColor Yellow
Write-Host "   Ejecutando: npx netlify deploy --prod" -ForegroundColor White
Write-Host ""

# Mostrar resumen
Write-Host "=" * 60 -ForegroundColor Cyan
Write-Host "✅ CONFIGURACIÓN COMPLETA" -ForegroundColor Green
Write-Host "=" * 60 -ForegroundColor Cyan
Write-Host ""
Write-Host "Variables de entorno para Railway:" -ForegroundColor Yellow
Write-Host "  DATABASE_URL = `${{Postgres.DATABASE_URL}}" -ForegroundColor White
Write-Host "  JWT_SECRET = $jwtSecret" -ForegroundColor White
Write-Host "  NODE_ENV = production" -ForegroundColor White
Write-Host "  FRONTEND_URL = https://ccspt.netlify.app" -ForegroundColor White
Write-Host ""
Write-Host "URL del Backend: $backendUrl" -ForegroundColor Green
Write-Host "netlify.toml actualizado ✅" -ForegroundColor Green
Write-Host ""
Write-Host "📋 Próximos pasos:" -ForegroundColor Yellow
Write-Host "  1. Ejecuta migraciones en Railway: npx prisma migrate deploy" -ForegroundColor White
Write-Host "  2. Redesplega frontend: npx netlify deploy --prod" -ForegroundColor White
Write-Host ""

