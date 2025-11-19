// Script para ejecutar migraciones de Prisma
// Se ejecuta automáticamente al iniciar el servidor en producción

import { PrismaClient } from '@prisma/client';
import { execSync } from 'child_process';

const prisma = new PrismaClient();

async function runMigrations() {
  try {
    console.log('Ejecutando migraciones de base de datos...');
    execSync('npx prisma migrate deploy', { stdio: 'inherit' });
    console.log('Migraciones completadas exitosamente');
  } catch (error) {
    console.error('Error ejecutando migraciones:', error);
    // No lanzamos el error para que el servidor pueda iniciar
    // Las migraciones se pueden ejecutar manualmente si es necesario
  }
}

// Solo ejecutar en producción
if (process.env.NODE_ENV === 'production') {
  runMigrations()
    .then(() => {
      prisma.$disconnect();
    })
    .catch((error) => {
      console.error('Error en migraciones:', error);
      prisma.$disconnect();
    });
}

export default runMigrations;

