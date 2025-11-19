#!/usr/bin/env node
/**
 * Script para generar un archivo .env con valores por defecto
 * Uso: node setup-env.js
 */

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '.env');
const envExamplePath = path.join(__dirname, '.env.example');

// Generar JWT_SECRET aleatorio
const jwtSecret = crypto.randomBytes(32).toString('hex');

const envContent = `# Base de datos PostgreSQL
# Reemplaza con tu connection string real
DATABASE_URL="postgresql://usuario:password@localhost:5432/nombre_db?schema=public"

# JWT Secret (generado automáticamente - CÁMBIALO en producción)
JWT_SECRET="${jwtSecret}"

# Puerto del servidor
PORT=4000

# Entorno
NODE_ENV=development

# Frontend URL para CORS
FRONTEND_URL="https://ccspt.netlify.app"

# Firebase (opcional - para notificaciones push)
# FIREBASE_SERVICE_ACCOUNT_KEY='{"type":"service_account",...}'
# FIREBASE_PROJECT_ID="tu-project-id"

# OpenAI (opcional - para consultas con IA)
# OPENAI_API_KEY="sk-..."
# OPENAI_MODEL="gpt-3.5-turbo"

# Sensores (opcional)
# ENABLE_PERSISTENT_SENSORS=false
# SENSOR_UPDATE_INTERVAL=120000
`;

if (fs.existsSync(envPath)) {
  console.log('⚠️  El archivo .env ya existe. No se sobrescribirá.');
  console.log('   Si quieres regenerarlo, elimínalo primero.');
} else {
  fs.writeFileSync(envPath, envContent);
  console.log('✅ Archivo .env creado exitosamente');
  console.log(`   JWT_SECRET generado: ${jwtSecret.substring(0, 20)}...`);
  console.log('\n📝 IMPORTANTE:');
  console.log('   1. Actualiza DATABASE_URL con tu connection string real');
  console.log('   2. En producción, usa un JWT_SECRET diferente y más seguro');
}

