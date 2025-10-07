import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import usuarioRoutes from './routes/usuarioRoutes';
import authRoutes from './routes/authRoutes';
import ifcBuildingRoutes from './routes/ifcBuildingRoutes';
import habitacioRoutes from './routes/habitacioRoutes';
import actiusRoutes from './routes/actiusRoutes';
import consultesRoutes from './routes/consultesRoutes';
import maintenanceRoutes from './routes/maintenanceRoutes';
import sensorRoutes from './routes/sensorRoutes';
import ephemeralSensorRoutes from './routes/ephemeralSensorRoutes';
import mobileAssetsRoutes from './routes/mobileAssetsRoutes';

// Nuevas rutas del sistema de gestión de usuarios
import newAuthRoutes from './routes/auth';
import newUsuariosRoutes from './routes/usuarios';
import tareasRoutes from './routes/tareas';
import mensajeriaRoutes from './routes/mensajeria';

dotenv.config();

const app = express();

// Configurar CORS
app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:5173', 'http://127.0.0.1:3000', 'http://127.0.0.1:5173'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept']
}));

app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ limit: '20mb', extended: true }));

// Static files for uploaded images
const uploadsDir = path.resolve(__dirname, '..', 'uploads');
app.use('/uploads', express.static(uploadsDir));

// Rutas existentes
app.use('/api/usuarios', usuarioRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/ifcbuildings', ifcBuildingRoutes);
app.use('/api', habitacioRoutes);
app.use('/api', actiusRoutes);
app.use('/api', consultesRoutes);
app.use('/api', maintenanceRoutes);
app.use('/api/sensors', sensorRoutes);
app.use('/api/ephemeral-sensors', ephemeralSensorRoutes);
app.use('/api/mobile-assets', mobileAssetsRoutes);

// Nuevas rutas del sistema de gestión
app.use('/api/v2/auth', newAuthRoutes);
app.use('/api/v2/usuarios', newUsuariosRoutes);
app.use('/api/v2/tareas', tareasRoutes);
app.use('/api/v2/mensajeria', mensajeriaRoutes);

export default app;

