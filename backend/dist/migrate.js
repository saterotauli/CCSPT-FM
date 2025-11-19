"use strict";
// Script para ejecutar migraciones de Prisma
// Se ejecuta automáticamente al iniciar el servidor en producción
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const child_process_1 = require("child_process");
const prisma = new client_1.PrismaClient();
async function runMigrations() {
    try {
        console.log('Ejecutando migraciones de base de datos...');
        (0, child_process_1.execSync)('npx prisma migrate deploy', { stdio: 'inherit' });
        console.log('Migraciones completadas exitosamente');
    }
    catch (error) {
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
exports.default = runMigrations;
