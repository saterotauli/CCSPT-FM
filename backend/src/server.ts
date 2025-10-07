import { createServer } from 'http';
import app from './app';
import { sensorSimulationService } from './services/sensorSimulationService';
import { ephemeralSensorService } from './services/ephemeralSensorService';
import { initializeSocketService } from './services/socketService';

const PORT = process.env.PORT || 4000;

// Crear servidor HTTP
const server = createServer(app);

// Inicializar Socket.IO
const socketService = initializeSocketService(server);

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log('Socket.IO service initialized');
  
  // Inicializar servicio efímero (sin persistencia)
  console.log('Inicializando sensores efímeros...');
  ephemeralSensorService.getServiceStatus(); // Esto inicializa el servicio
  
  // Solo iniciar simulación persistente si está configurado
  if (process.env.ENABLE_PERSISTENT_SENSORS === 'true') {
    console.log('Iniciando simulación de sensores persistentes...');
    sensorSimulationService.startSimulation();
  } else {
    console.log('Sensores efímeros activos - sin persistencia en BD');
  }
});
