# Script de verificación pre-despliegue
# Verifica que todo esté listo para el despliegue

Write-Host ""
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "  VERIFICACIÓN PRE-DESPLIEGUE" -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host ""

$errors = 0
$warnings = 0

# 1. Verificar estructura del proyecto
Write-Host "[1/6] Verificando estructura del proyecto..." -ForegroundColor Yellow
if (-not (Test-Path "backend")) {
    Write-Host "  ERROR: No se encuentra la carpeta 'backend'" -ForegroundColor Red
    $errors++
} else {
    Write-Host "  OK: Carpeta backend existe" -ForegroundColor Green
}

if (-not (Test-Path "frontend")) {
    Write-Host "  ERROR: No se encuentra la carpeta 'frontend'" -ForegroundColor Red
    $errors++
} else {
    Write-Host "  OK: Carpeta frontend existe" -ForegroundColor Green
}

if (-not (Test-Path "backend\package.json")) {
    Write-Host "  ERROR: No se encuentra package.json en backend" -ForegroundColor Red
    $errors++
} else {
    Write-Host "  OK: package.json del backend existe" -ForegroundColor Green
}

if (-not (Test-Path "frontend\package.json")) {
    Write-Host "  ERROR: No se encuentra package.json en frontend" -ForegroundColor Red
    $errors++
} else {
    Write-Host "  OK: package.json del frontend existe" -ForegroundColor Green
}

Write-Host ""

# 2. Verificar que el backend compile
Write-Host "[2/6] Verificando compilación del backend..." -ForegroundColor Yellow
Set-Location "backend"
try {
    $buildOutput = npm run build 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "  OK: Backend compila correctamente" -ForegroundColor Green
    } else {
        Write-Host "  ERROR: El backend no compila" -ForegroundColor Red
        $errors++
    }
} catch {
    Write-Host "  ERROR: No se pudo compilar el backend" -ForegroundColor Red
    $errors++
}
Set-Location ".."
Write-Host ""

# 3. Verificar archivos de configuración
Write-Host "[3/6] Verificando archivos de configuración..." -ForegroundColor Yellow
if (-not (Test-Path "netlify.toml")) {
    Write-Host "  ADVERTENCIA: No se encuentra netlify.toml" -ForegroundColor Yellow
    $warnings++
} else {
    $netlifyContent = Get-Content "netlify.toml" -Raw
    if ($netlifyContent -match "BACKEND_URL_PLACEHOLDER") {
        Write-Host "  ADVERTENCIA: netlify.toml aún tiene BACKEND_URL_PLACEHOLDER" -ForegroundColor Yellow
        Write-Host "    Ejecuta: .\actualizar-backend-url.ps1 -BackendUrl 'TU_URL'" -ForegroundColor White
        $warnings++
    } else {
        Write-Host "  OK: netlify.toml configurado" -ForegroundColor Green
    }
}

if (-not (Test-Path "backend\railway.json")) {
    Write-Host "  ADVERTENCIA: No se encuentra railway.json" -ForegroundColor Yellow
    $warnings++
} else {
    Write-Host "  OK: railway.json existe" -ForegroundColor Green
}

if (-not (Test-Path "backend\Procfile")) {
    Write-Host "  ADVERTENCIA: No se encuentra Procfile" -ForegroundColor Yellow
    $warnings++
} else {
    Write-Host "  OK: Procfile existe" -ForegroundColor Green
}
Write-Host ""

# 4. Verificar migraciones de Prisma
Write-Host "[4/6] Verificando migraciones de Prisma..." -ForegroundColor Yellow
if (Test-Path "backend\prisma\migrations") {
    $migrations = Get-ChildItem "backend\prisma\migrations" -Directory
    if ($migrations.Count -gt 0) {
        Write-Host "  OK: Se encontraron $($migrations.Count) migraciones" -ForegroundColor Green
    } else {
        Write-Host "  ADVERTENCIA: No se encontraron migraciones" -ForegroundColor Yellow
        $warnings++
    }
} else {
    Write-Host "  ADVERTENCIA: No se encuentra la carpeta de migraciones" -ForegroundColor Yellow
    $warnings++
}
Write-Host ""

# 5. Verificar configuración del API en frontend
Write-Host "[5/6] Verificando configuración del API..." -ForegroundColor Yellow
if (Test-Path "frontend\src\config\api.ts") {
    Write-Host "  OK: Configuración del API existe" -ForegroundColor Green
} else {
    Write-Host "  ERROR: No se encuentra frontend\src\config\api.ts" -ForegroundColor Red
    $errors++
}
Write-Host ""

# 6. Verificar scripts de despliegue
Write-Host "[6/6] Verificando scripts de despliegue..." -ForegroundColor Yellow
if (Test-Path "deploy-backend.ps1") {
    Write-Host "  OK: deploy-backend.ps1 existe" -ForegroundColor Green
} else {
    Write-Host "  ADVERTENCIA: No se encuentra deploy-backend.ps1" -ForegroundColor Yellow
    $warnings++
}

if (Test-Path "actualizar-backend-url.ps1") {
    Write-Host "  OK: actualizar-backend-url.ps1 existe" -ForegroundColor Green
} else {
    Write-Host "  ADVERTENCIA: No se encuentra actualizar-backend-url.ps1" -ForegroundColor Yellow
    $warnings++
}
Write-Host ""

# Resumen
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "  RESUMEN" -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host ""

if ($errors -eq 0 -and $warnings -eq 0) {
    Write-Host "  Todo está listo para el despliegue!" -ForegroundColor Green
} elseif ($errors -eq 0) {
    Write-Host "  Listo para despliegue con $warnings advertencia(s)" -ForegroundColor Yellow
    Write-Host "  Revisa las advertencias antes de continuar" -ForegroundColor Yellow
} else {
    Write-Host "  ERRORES ENCONTRADOS: $errors" -ForegroundColor Red
    Write-Host "  ADVERTENCIAS: $warnings" -ForegroundColor Yellow
    Write-Host '  Corrige los errores antes de continuar' -ForegroundColor Red
}

Write-Host ""
Write-Host 'Proximos pasos:' -ForegroundColor Cyan
Write-Host '  1. Crea la base de datos (Supabase o Railway)' -ForegroundColor White
Write-Host '  2. Despliega el backend en Railway' -ForegroundColor White
Write-Host '  3. Actualiza netlify.toml con la URL del backend' -ForegroundColor White
Write-Host '  4. Redesplega el frontend en Netlify' -ForegroundColor White
Write-Host ''
Write-Host 'Ver PASOS_RAILWAY.md para instrucciones detalladas' -ForegroundColor Yellow
Write-Host ''

