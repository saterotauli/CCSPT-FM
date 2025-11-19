# Script para actualizar netlify.toml con la URL del backend
# Uso: .\ACTUALIZAR_NETLIFY.ps1

param(
    [Parameter(Mandatory=$true)]
    [string]$BackendUrl
)

Write-Host "📝 Actualizando netlify.toml..." -ForegroundColor Yellow

if (-not (Test-Path "netlify.toml")) {
    Write-Host "❌ Error: No se encuentra netlify.toml" -ForegroundColor Red
    exit 1
}

# Leer el archivo
$content = Get-Content "netlify.toml" -Raw

# Reemplazar las URLs
$content = $content -replace "https://tu-backend-url\.com", $BackendUrl

# Guardar
Set-Content "netlify.toml" -Value $content

Write-Host "✅ netlify.toml actualizado" -ForegroundColor Green
Write-Host "   Backend URL: $BackendUrl" -ForegroundColor Cyan
Write-Host ""
Write-Host "🚀 Ahora ejecuta: npx netlify deploy --prod" -ForegroundColor Yellow

