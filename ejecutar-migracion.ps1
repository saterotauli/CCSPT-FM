# Script interactivo para ejecutar la migración completa
# Uso: .\ejecutar-migracion.ps1

Write-Host ""
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "  MIGRACION A SUPABASE" -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host ""

# URL de origen (ya la tenemos)
$SOURCE_DB_URL = "postgresql://satero:T0t0r0@localhost:5432/CCSPT"
$SUPABASE_PROJECT = "xowzybvqhvozwvhojkil"

Write-Host "Base de datos origen:" -ForegroundColor Yellow
Write-Host "  $SOURCE_DB_URL" -ForegroundColor Green
Write-Host ""

Write-Host "Proyecto Supabase:" -ForegroundColor Yellow
Write-Host "  https://$SUPABASE_PROJECT.supabase.co" -ForegroundColor Green
Write-Host ""

# Solicitar connection string de Supabase
Write-Host "Necesito la connection string completa de Supabase:" -ForegroundColor Yellow
Write-Host "  Formato: postgresql://postgres:PASSWORD@db.$SUPABASE_PROJECT.supabase.co:5432/postgres" -ForegroundColor White
Write-Host ""
Write-Host "Para obtenerla:" -ForegroundColor Cyan
Write-Host "  1. Ve a: https://supabase.com/dashboard/project/$SUPABASE_PROJECT" -ForegroundColor White
Write-Host "  2. Settings -> Database -> Connection string -> URI" -ForegroundColor White
Write-Host "  3. Reemplaza [YOUR-PASSWORD] con tu contraseña" -ForegroundColor White
Write-Host ""

$SUPABASE_URL = Read-Host "Pega aquí la connection string completa de Supabase"

if ([string]::IsNullOrWhiteSpace($SUPABASE_URL)) {
    Write-Host "ERROR: Connection string requerida" -ForegroundColor Red
    exit 1
}

# Verificar formato
if (-not $SUPABASE_URL.StartsWith("postgresql://")) {
    Write-Host "ADVERTENCIA: La URL no parece ser una connection string válida" -ForegroundColor Yellow
    Write-Host "  Debería empezar con: postgresql://" -ForegroundColor White
    $continue = Read-Host "¿Continuar de todas formas? (S/N)"
    if ($continue -ne 'S' -and $continue -ne 's') {
        exit 0
    }
}

# Agregar SSL si no está presente
if ($SUPABASE_URL -notmatch '\?') {
    $SUPABASE_URL = "$SUPABASE_URL?sslmode=require"
    Write-Host "Agregado SSL a la connection string" -ForegroundColor Green
} elseif ($SUPABASE_URL -notmatch 'sslmode') {
    $SUPABASE_URL = "$SUPABASE_URL&sslmode=require"
    Write-Host "Agregado SSL a la connection string" -ForegroundColor Green
}

Write-Host ""
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "  PASO 1: Crear Schema en Supabase" -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host ""

# Backup del .env actual
if (Test-Path "backend\.env") {
    $envBackup = "backend\.env.backup_$(Get-Date -Format 'yyyyMMdd_HHmmss')"
    Copy-Item "backend\.env" $envBackup
    Write-Host "Backup de .env creado: $envBackup" -ForegroundColor Green
}

# Crear .env temporal con Supabase
Write-Host "Configurando .env con Supabase..." -ForegroundColor Yellow
Set-Location "backend"

$envContent = @"
DATABASE_URL="$SUPABASE_URL"
JWT_SECRET="temp_secret_for_migration"
NODE_ENV=production
"@

Set-Content ".env" -Value $envContent
Write-Host "OK: .env configurado" -ForegroundColor Green
Write-Host ""

# Ejecutar migraciones
Write-Host "Ejecutando migraciones para crear tablas..." -ForegroundColor Yellow
Write-Host "  Esto puede tardar unos minutos..." -ForegroundColor White
Write-Host ""

try {
    $migrateOutput = & npm run migrate 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "OK: Tablas creadas en Supabase" -ForegroundColor Green
    } else {
        Write-Host "ADVERTENCIA: Puede haber errores" -ForegroundColor Yellow
        Write-Host $migrateOutput
    }
} catch {
    Write-Host "ERROR: $($_.Exception.Message)" -ForegroundColor Red
    Set-Location ".."
    exit 1
}

Set-Location ".."
Write-Host ""

# Confirmar migración de datos
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "  PASO 2: Migrar Datos" -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host ""

$confirm = Read-Host "¿Migrar los datos ahora? (S/N)"
if ($confirm -ne 'S' -and $confirm -ne 's') {
    Write-Host "Migración de datos cancelada" -ForegroundColor Yellow
    Write-Host "Puedes ejecutarla después con:" -ForegroundColor White
    Write-Host "  `$env:SUPABASE_URL=`"$SUPABASE_URL`"" -ForegroundColor Cyan
    Write-Host "  node migrar-datos-con-prisma.js" -ForegroundColor Cyan
    exit 0
}

Write-Host ""
Write-Host "Migrando datos..." -ForegroundColor Yellow
Write-Host "  Esto puede tardar varios minutos dependiendo del tamaño..." -ForegroundColor White
Write-Host ""

# Configurar variables de entorno y ejecutar script
$env:SOURCE_DATABASE_URL = $SOURCE_DB_URL
$env:SUPABASE_URL = $SUPABASE_URL

try {
    node migrar-datos-con-prisma.cjs
    if ($LASTEXITCODE -eq 0) {
        Write-Host ""
        Write-Host "============================================================" -ForegroundColor Cyan
        Write-Host "  MIGRACION COMPLETADA" -ForegroundColor Green
        Write-Host "============================================================" -ForegroundColor Cyan
        Write-Host ""
        Write-Host "Próximos pasos:" -ForegroundColor Yellow
        Write-Host "  1. Verifica los datos en Supabase Dashboard" -ForegroundColor White
        Write-Host "  2. Actualiza DATABASE_URL en Railway o .env de producción" -ForegroundColor White
        Write-Host "  3. Prueba la aplicación" -ForegroundColor White
        Write-Host ""
    } else {
        Write-Host ""
        Write-Host "ADVERTENCIA: La migración puede haber tenido errores" -ForegroundColor Yellow
        Write-Host "Revisa los mensajes anteriores" -ForegroundColor White
    }
} catch {
    Write-Host ""
    Write-Host "ERROR durante la migración: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""

