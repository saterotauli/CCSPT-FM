"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
const path_1 = __importDefault(require("path"));
const usuarioRoutes_1 = __importDefault(require("./routes/usuarioRoutes"));
const authRoutes_1 = __importDefault(require("./routes/authRoutes"));
const ifcBuildingRoutes_1 = __importDefault(require("./routes/ifcBuildingRoutes"));
const habitacioRoutes_1 = __importDefault(require("./routes/habitacioRoutes"));
const actiusRoutes_1 = __importDefault(require("./routes/actiusRoutes"));
const consultesRoutes_1 = __importDefault(require("./routes/consultesRoutes"));
const maintenanceRoutes_1 = __importDefault(require("./routes/maintenanceRoutes"));
const sensorRoutes_1 = __importDefault(require("./routes/sensorRoutes"));
const ephemeralSensorRoutes_1 = __importDefault(require("./routes/ephemeralSensorRoutes"));
const mobileAssetsRoutes_1 = __importDefault(require("./routes/mobileAssetsRoutes"));
// Nuevas rutas del sistema de gestión de usuarios
const auth_1 = __importDefault(require("./routes/auth"));
const usuarios_1 = __importDefault(require("./routes/usuarios"));
const tareas_1 = __importDefault(require("./routes/tareas"));
const mensajeria_1 = __importDefault(require("./routes/mensajeria"));
dotenv_1.default.config();
const app = (0, express_1.default)();
// Configurar CORS
const allowedOrigins = [
    'http://localhost:3000',
    'http://localhost:5173',
    'http://127.0.0.1:3000',
    'http://127.0.0.1:5173',
    'https://ccspt.netlify.app', // Dominio de Netlify
    ...(process.env.FRONTEND_URL ? [process.env.FRONTEND_URL] : []), // URL adicional desde variables de entorno
    ...(process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : []) // Múltiples orígenes separados por coma
];
app.use((0, cors_1.default)({
    origin: (origin, callback) => {
        // Permitir requests sin origin (mobile apps, Postman, etc.)
        if (!origin)
            return callback(null, true);
        if (allowedOrigins.includes(origin)) {
            callback(null, true);
        }
        else {
            console.warn(`CORS: Origin bloqueada: ${origin}`);
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept']
}));
app.use(express_1.default.json({ limit: '20mb' }));
app.use(express_1.default.urlencoded({ limit: '20mb', extended: true }));
// Static files for uploaded images
const uploadsDir = path_1.default.resolve(__dirname, '..', 'uploads');
app.use('/uploads', express_1.default.static(uploadsDir));
// Rutas existentes
app.use('/api/usuarios', usuarioRoutes_1.default);
app.use('/api/auth', authRoutes_1.default);
app.use('/api/ifcbuildings', ifcBuildingRoutes_1.default);
app.use('/api', habitacioRoutes_1.default);
app.use('/api', actiusRoutes_1.default);
app.use('/api', consultesRoutes_1.default);
app.use('/api', maintenanceRoutes_1.default);
app.use('/api/sensors', sensorRoutes_1.default);
app.use('/api/ephemeral-sensors', ephemeralSensorRoutes_1.default);
app.use('/api/mobile-assets', mobileAssetsRoutes_1.default);
// Nuevas rutas del sistema de gestión
app.use('/api/v2/auth', auth_1.default);
app.use('/api/v2/usuarios', usuarios_1.default);
app.use('/api/v2/tareas', tareas_1.default);
app.use('/api/v2/mensajeria', mensajeria_1.default);
exports.default = app;
