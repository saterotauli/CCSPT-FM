# Script alternativo para migrar usando Prisma
# Este script usa Prisma para sincronizar el schema y luego puedes migrar los datos manualmente

param(
    [Parameter(Mandatory=$true)]
    [string]$SourceDatabaseUrl,
    
    [Parameter(Mandatory=$true)]
    [string]$SupabaseUrl
)

Write-Host ""
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "  MIGRACION A SUPABASE USANDO PRISMA" -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Este script te ayudara a migrar usando Prisma" -ForegroundColor Yellow
Write-Host ""

# Paso 1: Verificar Prisma
Write-Host "[1/4] Verificando Prisma..." -ForegroundColor Yellow
if (-not (Test-Path "backend\node_modules\.bin\prisma.cmd")) {
    Write-Host "  ERROR: Prisma no encontrado" -ForegroundColor Red
    Write-Host "  Ejecuta: cd backend; npm install" -ForegroundColor Yellow
    exit 1
}
Write-Host "  OK: Prisma encontrado" -ForegroundColor Green
Write-Host ""

# Paso 2: Crear backup temporal del .env
Write-Host "[2/4] Preparando entorno..." -ForegroundColor Yellow
$envBackup = "backend\.env.backup_$(Get-Date -Format 'yyyyMMdd_HHmmss')"
if (Test-Path "backend\.env") {
    Copy-Item "backend\.env" $envBackup
    Write-Host "  OK: Backup de .env creado: $envBackup" -ForegroundColor Green
} else {
    Write-Host "  ADVERTENCIA: No se encuentra .env, creando uno nuevo" -ForegroundColor Yellow
}
Write-Host ""

# Paso 3: Configurar .env temporal con Supabase
Write-Host "[3/4] Configurando conexion a Supabase..." -ForegroundColor Yellow
$envContent = @"
DATABASE_URL="$SupabaseUrl"
JWT_SECRET="temp_secret"
NODE_ENV=production
"@

Set-Location "backend"
Set-Content ".env" -Value $envContent
Write-Host "  OK: .env configurado con Supabase" -ForegroundColor Green
Write-Host ""

# Paso 4: Ejecutar migraciones
Write-Host "[4/4] Ejecutando migraciones en Supabase..." -ForegroundColor Yellow
Write-Host "  Esto creara las tablas en Supabase..." -ForegroundColor White
Write-Host ""

try {
    $migrateOutput = & npm run migrate 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "  OK: Migraciones aplicadas exitosamente" -ForegroundColor Green
    } else {
        Write-Host "  ADVERTENCIA: Puede haber errores en las migraciones" -ForegroundColor Yellow
        Write-Host $migrateOutput
    }
} catch {
    Write-Host "  ERROR: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "  Intenta ejecutar manualmente: npm run migrate" -ForegroundColor Yellow
}

Set-Location ".."
Write-Host ""

# Resumen
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "  PRIMERA PARTE COMPLETADA" -ForegroundColor Green
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Las tablas han sido creadas en Supabase." -ForegroundColor Green
Write-Host ""
Write-Host "PROXIMOS PASOS:" -ForegroundColor Yellow
Write-Host "  1. Migra los DATOS desde tu base de datos actual" -ForegroundColor White
Write-Host "     Opcion A: Usa pg_dump/psql (necesitas instalar PostgreSQL)" -ForegroundColor White
Write-Host "     Opcion B: Usa una herramienta GUI como pgAdmin o DBeaver" -ForegroundColor White
Write-Host "     Opcion C: Exporta/importa datos manualmente" -ForegroundColor White
Write-Host ""
Write-Host "  2. Para migrar datos con pg_dump:" -ForegroundColor White
Write-Host "     pg_dump `"$SourceDatabaseUrl`" --data-only --schema=public --schema=patrimoni -f datos.sql" -ForegroundColor Cyan
Write-Host "     psql `"$SupabaseUrl`" -f datos.sql" -ForegroundColor Cyan
Write-Host ""
Write-Host "  3. Restaura el .env original si es necesario" -ForegroundColor White
Write-Host ""

