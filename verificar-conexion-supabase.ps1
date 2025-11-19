# Script para verificar conexión a Supabase
param(
    [Parameter(Mandatory=$true)]
    [string]$SupabaseUrl
)

Write-Host ""
Write-Host "Verificando conexion a Supabase..." -ForegroundColor Yellow
Write-Host "URL: $($SupabaseUrl -replace ':[^:@]+@', ':****@')" -ForegroundColor White
Write-Host ""

# Probar con psql si está disponible
if (Get-Command psql -ErrorAction SilentlyContinue) {
    Write-Host "Probando con psql..." -ForegroundColor Cyan
    $testQuery = "SELECT version();"
    echo $testQuery | psql $SupabaseUrl 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "OK: Conexion exitosa con psql" -ForegroundColor Green
    } else {
        Write-Host "ERROR: No se pudo conectar con psql" -ForegroundColor Red
    }
} else {
    Write-Host "psql no disponible, probando con Prisma..." -ForegroundColor Yellow
    
    # Crear script temporal de prueba
    $testScript = @"
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.TEST_URL
    }
  }
});

async function test() {
  try {
    await prisma.`$queryRaw`SELECT 1 as test`;
    console.log('OK: Conexion exitosa');
    process.exit(0);
  } catch (error) {
    console.error('ERROR:', error.message);
    process.exit(1);
  } finally {
    await prisma.`$disconnect();
  }
}

test();
"@
    
    Set-Content "test-connection.cjs" -Value $testScript
    $env:TEST_URL = $SupabaseUrl
    node test-connection.cjs
    Remove-Item "test-connection.cjs" -ErrorAction SilentlyContinue
}

Write-Host ""

