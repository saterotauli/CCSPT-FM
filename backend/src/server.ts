import app from './app';
import { sensorSimulationService } from './services/sensorSimulationService';
import { ephemeralSensorService } from './services/ephemeralSensorService';

const PORT = process.env.PORT || 4000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  
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
