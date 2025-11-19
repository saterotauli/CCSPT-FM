# Script de despliegue del backend - Versión mejorada
# Uso: .\deploy-backend.ps1

Write-Host ""
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "  DESPLIEGUE DEL BACKEND - GUIA INTERACTIVA" -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host ""

# Verificar estructura
Write-Host "[1/5] Verificando estructura del proyecto..." -ForegroundColor Yellow
if (-not (Test-Path "backend")) {
    Write-Host "  ERROR: No se encuentra la carpeta 'backend'" -ForegroundColor Red
    exit 1
}
if (-not (Test-Path "backend\package.json")) {
    Write-Host "  ERROR: No se encuentra package.json" -ForegroundColor Red
    exit 1
}
Write-Host "  OK: Estructura verificada" -ForegroundColor Green
Write-Host ""

# Generar JWT_SECRET
Write-Host "[2/5] Generando JWT_SECRET..." -ForegroundColor Yellow
try {
    $jwtSecret = node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
    Write-Host "  OK: JWT_SECRET generado" -ForegroundColor Green
} catch {
    Write-Host "  ADVERTENCIA: No se pudo generar con Node.js" -ForegroundColor Yellow
    $jwtSecret = "23bf0917864a9052f58ed2306d14387afab1a8435efb4e5e3424f715bf8d871a"
}
Write-Host ""

# Mostrar información
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "  INFORMACION IMPORTANTE" -ForegroundColor Yellow
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "JWT_SECRET para Railway:" -ForegroundColor White
Write-Host "  $jwtSecret" -ForegroundColor Green
Write-Host ""
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host ""

# Instrucciones
Write-Host "[3/5] PASO 1: Crear Base de Datos PostgreSQL" -ForegroundColor Cyan
Write-Host "  1. Abre: https://supabase.com" -ForegroundColor White
Write-Host "  2. Crea cuenta (puedes usar GitHub)" -ForegroundColor White
Write-Host "  3. New Project -> Completa el formulario" -ForegroundColor White
Write-Host "  4. Settings -> Database -> Connection string -> URI" -ForegroundColor White
Write-Host "  5. Copia la URL y reemplaza [YOUR-PASSWORD]" -ForegroundColor White
Write-Host ""
Write-Host "  Presiona Enter cuando tengas la URL de la base de datos..." -ForegroundColor Yellow
$dbUrl = Read-Host "  DATABASE_URL"

Write-Host ""
Write-Host "[4/5] PASO 2: Desplegar en Railway" -ForegroundColor Cyan
Write-Host "  1. Abre: https://railway.app" -ForegroundColor White
Write-Host "  2. Login con GitHub" -ForegroundColor White
Write-Host "  3. New Project -> Deploy from GitHub repo" -ForegroundColor White
Write-Host "  4. Selecciona CCSPT-FM" -ForegroundColor White
Write-Host "  5. Root Directory: backend" -ForegroundColor White
Write-Host "  6. New -> Database -> Add PostgreSQL" -ForegroundColor White
Write-Host "  7. Configura las variables (ver VARIABLES_RAILWAY.txt)" -ForegroundColor White
Write-Host ""
Write-Host "  Presiona Enter cuando hayas configurado Railway..." -ForegroundColor Yellow
Read-Host "  (Presiona Enter para continuar)"

Write-Host ""
Write-Host "[5/5] PASO 3: Obtener URL del Backend" -ForegroundColor Cyan
Write-Host "  1. Railway -> Backend -> Settings -> Networking" -ForegroundColor White
Write-Host "  2. Generate Domain" -ForegroundColor White
$backendUrl = Read-Host "  3. Pega aqui la URL de Railway"

# Actualizar netlify.toml
Write-Host ""
Write-Host "Actualizando netlify.toml..." -ForegroundColor Yellow
if (Test-Path "netlify.toml") {
    $content = Get-Content "netlify.toml" -Raw
    $content = $content -replace "https://tu-backend-url\.com", $backendUrl
    Set-Content "netlify.toml" -Value $content
    Write-Host "  OK: netlify.toml actualizado con: $backendUrl" -ForegroundColor Green
} else {
    Write-Host "  ADVERTENCIA: No se encuentra netlify.toml" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "  RESUMEN" -ForegroundColor Green
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Variables para Railway:" -ForegroundColor Yellow
Write-Host "  DATABASE_URL = `${{Postgres.DATABASE_URL}}" -ForegroundColor White
Write-Host "  JWT_SECRET = $jwtSecret" -ForegroundColor White
Write-Host "  NODE_ENV = production" -ForegroundColor White
Write-Host "  FRONTEND_URL = https://ccspt.netlify.app" -ForegroundColor White
Write-Host ""
Write-Host "URL del Backend: $backendUrl" -ForegroundColor Green
Write-Host ""
Write-Host "Proximos pasos:" -ForegroundColor Yellow
Write-Host "  1. Ejecuta migraciones en Railway: npx prisma migrate deploy" -ForegroundColor White
Write-Host "  2. Redesplega frontend: npx netlify deploy --prod" -ForegroundColor White
Write-Host ""
