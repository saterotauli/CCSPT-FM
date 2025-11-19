# Script para actualizar la URL del backend en netlify.toml
# Uso: .\actualizar-backend-url.ps1

param(
    [Parameter(Mandatory=$true)]
    [string]$BackendUrl
)

Write-Host ""
Write-Host "Actualizando netlify.toml con URL del backend..." -ForegroundColor Yellow
Write-Host "URL del backend: $BackendUrl" -ForegroundColor Cyan
Write-Host ""

if (-not (Test-Path "netlify.toml")) {
    Write-Host "ERROR: No se encuentra netlify.toml" -ForegroundColor Red
    exit 1
}

# Leer el contenido
$content = Get-Content "netlify.toml" -Raw

# Asegurarse de que la URL termine sin barra final
$BackendUrl = $BackendUrl.TrimEnd('/')

# Reemplazar el placeholder
$content = $content -replace "BACKEND_URL_PLACEHOLDER", $BackendUrl

# Guardar
Set-Content "netlify.toml" -Value $content

Write-Host "OK: netlify.toml actualizado" -ForegroundColor Green
Write-Host ""
Write-Host "Próximo paso: Redesplegar en Netlify" -ForegroundColor Yellow
Write-Host "  npx netlify deploy --prod" -ForegroundColor White
Write-Host ""

