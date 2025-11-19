# Script de despliegue automatizado del backend (PowerShell)
# Uso: .\DEPLOY_BACKEND.ps1

Write-Host "🚀 Iniciando despliegue del backend..." -ForegroundColor Cyan
Write-Host ""

# Verificar que estamos en el directorio correcto
if (-not (Test-Path "backend")) {
    Write-Host "❌ Error: No se encuentra la carpeta 'backend'" -ForegroundColor Red
    Write-Host "   Ejecuta este script desde la raíz del proyecto" -ForegroundColor Yellow
    exit 1
}

Set-Location backend

# Verificar que existe package.json
if (-not (Test-Path "package.json")) {
    Write-Host "❌ Error: No se encuentra package.json en backend/" -ForegroundColor Red
    exit 1
}

Write-Host "✅ Estructura del proyecto verificada" -ForegroundColor Green
Write-Host ""

# Generar JWT_SECRET
$jwtSecret = -join ((48..57) + (97..102) | Get-Random -Count 64 | ForEach-Object {[char]$_})
$jwtSecret = (1..64 | ForEach-Object {Get-Random -InputObject @('0','1','2','3','4','5','6','7','8','9','a','b','c','d','e','f')}) -join ''

# Generar usando Node.js si está disponible
try {
    $jwtSecret = node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
} catch {
    Write-Host "⚠️  Node.js no disponible, usando generador alternativo" -ForegroundColor Yellow
}

Write-Host "📋 Checklist de despliegue:" -ForegroundColor Cyan
Write-Host ""
Write-Host "1. ✅ Base de datos PostgreSQL creada" -ForegroundColor Green
Write-Host "   - Opción recomendada: https://supabase.com" -ForegroundColor Yellow
Write-Host "   - O: https://neon.tech" -ForegroundColor Yellow
Write-Host ""
Write-Host "2. ⏳ Desplegar en Railway:" -ForegroundColor Yellow
Write-Host "   - Ve a: https://railway.app" -ForegroundColor White
Write-Host "   - New Project → Deploy from GitHub" -ForegroundColor White
Write-Host "   - Root Directory: backend" -ForegroundColor White
Write-Host "   - Agrega PostgreSQL como servicio" -ForegroundColor White
Write-Host ""
Write-Host "3. ⏳ Configurar variables de entorno en Railway:" -ForegroundColor Yellow
Write-Host "   - DATABASE_URL = `${{Postgres.DATABASE_URL}}" -ForegroundColor White
Write-Host "   - JWT_SECRET = [el secreto generado abajo]" -ForegroundColor White
Write-Host "   - NODE_ENV = production" -ForegroundColor White
Write-Host "   - FRONTEND_URL = https://ccspt.netlify.app" -ForegroundColor White
Write-Host ""
Write-Host "4. ⏳ Ejecutar migraciones:" -ForegroundColor Yellow
Write-Host "   - En Railway: Open in Shell" -ForegroundColor White
Write-Host "   - Ejecuta: npx prisma migrate deploy" -ForegroundColor White
Write-Host ""
Write-Host "5. ⏳ Actualizar netlify.toml con la URL de Railway" -ForegroundColor Yellow
Write-Host ""
Write-Host "6. ⏳ Redesplegar frontend: npx netlify deploy --prod" -ForegroundColor Yellow
Write-Host ""

Write-Host "🔑 JWT_SECRET generado para producción:" -ForegroundColor Cyan
Write-Host "   $jwtSecret" -ForegroundColor White
Write-Host ""
Write-Host "⚠️  IMPORTANTE: Guarda este secreto de forma segura" -ForegroundColor Yellow
Write-Host "   Lo necesitarás para configurar Railway" -ForegroundColor Yellow
Write-Host ""

Set-Location ..

