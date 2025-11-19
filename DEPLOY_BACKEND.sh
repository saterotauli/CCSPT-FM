#!/bin/bash
# Script de despliegue automatizado del backend
# Uso: bash DEPLOY_BACKEND.sh

echo "🚀 Iniciando despliegue del backend..."
echo ""

# Verificar que estamos en el directorio correcto
if [ ! -d "backend" ]; then
    echo "❌ Error: No se encuentra la carpeta 'backend'"
    echo "   Ejecuta este script desde la raíz del proyecto"
    exit 1
fi

cd backend

# Verificar que existe package.json
if [ ! -f "package.json" ]; then
    echo "❌ Error: No se encuentra package.json en backend/"
    exit 1
fi

echo "✅ Estructura del proyecto verificada"
echo ""

# Generar JWT_SECRET si no existe
if [ ! -f ".env" ]; then
    echo "📝 Generando archivo .env..."
    node setup-env.js
    echo ""
fi

echo "📋 Checklist de despliegue:"
echo ""
echo "1. ✅ Base de datos PostgreSQL creada"
echo "   - Opción recomendada: https://supabase.com"
echo "   - O: https://neon.tech"
echo ""
echo "2. ⏳ Desplegar en Railway:"
echo "   - Ve a: https://railway.app"
echo "   - New Project → Deploy from GitHub"
echo "   - Root Directory: backend"
echo "   - Agrega PostgreSQL como servicio"
echo ""
echo "3. ⏳ Configurar variables de entorno en Railway:"
echo "   - DATABASE_URL = \${{Postgres.DATABASE_URL}}"
echo "   - JWT_SECRET = [el secreto generado]"
echo "   - NODE_ENV = production"
echo "   - FRONTEND_URL = https://ccspt.netlify.app"
echo ""
echo "4. ⏳ Ejecutar migraciones:"
echo "   - En Railway: Open in Shell"
echo "   - Ejecuta: npx prisma migrate deploy"
echo ""
echo "5. ⏳ Actualizar netlify.toml con la URL de Railway"
echo ""
echo "6. ⏳ Redesplegar frontend: npx netlify deploy --prod"
echo ""

JWT_SECRET=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
echo "🔑 JWT_SECRET generado para producción:"
echo "   $JWT_SECRET"
echo ""
echo "⚠️  IMPORTANTE: Guarda este secreto de forma segura"
echo "   Lo necesitarás para configurar Railway"
echo ""

