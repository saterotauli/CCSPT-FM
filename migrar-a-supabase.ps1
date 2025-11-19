# Script para migrar base de datos PostgreSQL a Supabase
# Uso: .\migrar-a-supabase.ps1

param(
    [Parameter(Mandatory=$true)]
    [string]$SourceDatabaseUrl,
    
    [Parameter(Mandatory=$true)]
    [string]$SupabaseUrl,
    
    [Parameter(Mandatory=$false)]
    [string]$BackupFile = "backup_migracion_$(Get-Date -Format 'yyyyMMdd_HHmmss').sql"
)

Write-Host ""
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "  MIGRACION DE BASE DE DATOS A SUPABASE" -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host ""

# Verificar que pg_dump esté disponible
Write-Host "[1/5] Verificando herramientas..." -ForegroundColor Yellow
try {
    $pgDumpVersion = & pg_dump --version 2>&1
    Write-Host "  OK: pg_dump encontrado: $pgDumpVersion" -ForegroundColor Green
} catch {
    Write-Host "  ERROR: pg_dump no encontrado" -ForegroundColor Red
    Write-Host "  Instala PostgreSQL para obtener pg_dump" -ForegroundColor Yellow
    exit 1
}

try {
    $psqlVersion = & psql --version 2>&1
    Write-Host "  OK: psql encontrado: $psqlVersion" -ForegroundColor Green
} catch {
    Write-Host "  ERROR: psql no encontrado" -ForegroundColor Red
    Write-Host "  Instala PostgreSQL para obtener psql" -ForegroundColor Yellow
    exit 1
}
Write-Host ""

# Crear backup
Write-Host "[2/5] Creando backup de la base de datos..." -ForegroundColor Yellow
Write-Host "  Base de datos origen: $SourceDatabaseUrl" -ForegroundColor White
Write-Host "  Archivo de backup: $BackupFile" -ForegroundColor White
Write-Host ""

try {
    $env:PGPASSWORD = ($SourceDatabaseUrl -split ':')[2] -replace '@.*', ''
    
    & pg_dump $SourceDatabaseUrl `
        --schema=public `
        --schema=patrimoni `
        --no-owner `
        --no-acl `
        --clean `
        --if-exists `
        -f $BackupFile 2>&1 | Out-String
    
    if ($LASTEXITCODE -eq 0) {
        $fileSize = (Get-Item $BackupFile).Length / 1MB
        Write-Host "  OK: Backup creado exitosamente ($([math]::Round($fileSize, 2)) MB)" -ForegroundColor Green
    } else {
        Write-Host "  ERROR: Fallo al crear el backup" -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host "  ERROR: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}
Write-Host ""

# Verificar que el schema patrimoni exista en Supabase
Write-Host "[3/5] Preparando Supabase..." -ForegroundColor Yellow
Write-Host "  Verificando schemas en Supabase..." -ForegroundColor White

$createSchemaSQL = @"
CREATE SCHEMA IF NOT EXISTS patrimoni;
"@

try {
    $env:PGPASSWORD = ($SupabaseUrl -split ':')[2] -replace '@.*', ''
    echo $createSchemaSQL | & psql $SupabaseUrl -q 2>&1 | Out-Null
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "  OK: Schema patrimoni verificado/creado" -ForegroundColor Green
    } else {
        Write-Host "  ADVERTENCIA: No se pudo crear el schema patrimoni" -ForegroundColor Yellow
        Write-Host "  Puedes crearlo manualmente en el SQL Editor de Supabase" -ForegroundColor Yellow
    }
} catch {
    Write-Host "  ADVERTENCIA: No se pudo verificar schemas: $($_.Exception.Message)" -ForegroundColor Yellow
}
Write-Host ""

# Restaurar en Supabase
Write-Host "[4/5] Restaurando backup en Supabase..." -ForegroundColor Yellow
Write-Host "  URL de Supabase: $SupabaseUrl" -ForegroundColor White
Write-Host "  Esto puede tardar varios minutos..." -ForegroundColor White
Write-Host ""

$confirm = Read-Host "  ¿Continuar con la restauración? (S/N)"
if ($confirm -ne 'S' -and $confirm -ne 's') {
    Write-Host "  Migración cancelada" -ForegroundColor Yellow
    exit 0
}

try {
    $env:PGPASSWORD = ($SupabaseUrl -split ':')[2] -replace '@.*', ''
    
    & psql $SupabaseUrl -f $BackupFile 2>&1 | Tee-Object -Variable restoreOutput
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "  OK: Restauración completada" -ForegroundColor Green
    } else {
        Write-Host "  ADVERTENCIA: La restauración puede haber tenido errores" -ForegroundColor Yellow
        Write-Host "  Revisa los mensajes anteriores" -ForegroundColor Yellow
    }
} catch {
    Write-Host "  ERROR: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "  Revisa el archivo de backup y la URL de Supabase" -ForegroundColor Yellow
    exit 1
}
Write-Host ""

# Verificar migración
Write-Host "[5/5] Verificando migración..." -ForegroundColor Yellow

$verifySQL = @"
SELECT 
    schema_name,
    (SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = schema_name) as table_count
FROM information_schema.schemata 
WHERE schema_name IN ('public', 'patrimoni')
ORDER BY schema_name;
"@

try {
    $env:PGPASSWORD = ($SupabaseUrl -split ':')[2] -replace '@.*', ''
    $verifyResult = echo $verifySQL | & psql $SupabaseUrl -t -A -F'|' 2>&1
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "  OK: Verificación completada" -ForegroundColor Green
        Write-Host ""
        Write-Host "  Schemas encontrados:" -ForegroundColor White
        $verifyResult | ForEach-Object {
            if ($_ -match '^(.+)\|(\d+)$') {
                Write-Host "    - $($matches[1]): $($matches[2]) tablas" -ForegroundColor Cyan
            }
        }
    } else {
        Write-Host "  ADVERTENCIA: No se pudo verificar completamente" -ForegroundColor Yellow
    }
} catch {
    Write-Host "  ADVERTENCIA: Error en verificación: $($_.Exception.Message)" -ForegroundColor Yellow
}
Write-Host ""

# Resumen
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "  MIGRACION COMPLETADA" -ForegroundColor Green
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Próximos pasos:" -ForegroundColor Yellow
Write-Host "  1. Verifica los datos en el dashboard de Supabase" -ForegroundColor White
Write-Host "  2. Actualiza DATABASE_URL en Railway o .env" -ForegroundColor White
Write-Host "  3. Ejecuta: npx prisma migrate deploy" -ForegroundColor White
Write-Host "  4. Prueba la aplicación" -ForegroundColor White
Write-Host ""
Write-Host "Archivo de backup guardado en: $BackupFile" -ForegroundColor Cyan
Write-Host "  (Guárdalo por seguridad)" -ForegroundColor Yellow
Write-Host ""

