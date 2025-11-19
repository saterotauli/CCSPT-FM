"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const http_1 = require("http");
const app_1 = __importDefault(require("./app"));
const sensorSimulationService_1 = require("./services/sensorSimulationService");
const ephemeralSensorService_1 = require("./services/ephemeralSensorService");
const socketService_1 = require("./services/socketService");
const PORT = process.env.PORT || 4000;
// Ejecutar migraciones en producción antes de iniciar el servidor
if (process.env.NODE_ENV === 'production') {
    try {
        console.log('Ejecutando migraciones de base de datos...');
        const { execSync } = require('child_process');
        execSync('npx prisma migrate deploy', { stdio: 'inherit' });
        console.log('Migraciones completadas');
    }
    catch (error) {
        console.warn('Advertencia: Error ejecutando migraciones automáticas:', error);
        console.warn('Puedes ejecutarlas manualmente con: npx prisma migrate deploy');
    }
}
// Crear servidor HTTP
const server = (0, http_1.createServer)(app_1.default);
// Inicializar Socket.IO
const socketService = (0, socketService_1.initializeSocketService)(server);
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log('Socket.IO service initialized');
    // Inicializar servicio efímero (sin persistencia)
    console.log('Inicializando sensores efímeros...');
    ephemeralSensorService_1.ephemeralSensorService.getServiceStatus(); // Esto inicializa el servicio
    // Solo iniciar simulación persistente si está configurado
    if (process.env.ENABLE_PERSISTENT_SENSORS === 'true') {
        console.log('Iniciando simulación de sensores persistentes...');
        sensorSimulationService_1.sensorSimulationService.startSimulation();
    }
    else {
        console.log('Sensores efímeros activos - sin persistencia en BD');
    }
});
