import { Router } from 'express';
import { 
  getConversaciones,
  getConversacion,
  createConversacion,
  enviarMensaje,
  getNotificaciones,
  marcarNotificacionLeida,
  marcarTodasNotificacionesLeidas
} from '../controllers/mensajeriaController';
import { authenticateToken } from '../middleware/auth';

const router = Router();

// Todas las rutas requieren autenticación
router.use(authenticateToken);

// Rutas de conversaciones
router.get('/conversaciones', getConversaciones);
router.post('/conversaciones', createConversacion);
router.get('/conversaciones/:id', getConversacion);
router.post('/conversaciones/:id/mensajes', enviarMensaje);

// Rutas de notificaciones
router.get('/notificaciones', getNotificaciones);
router.put('/notificaciones/:id/leida', marcarNotificacionLeida);
router.put('/notificaciones/marcar-todas-leidas', marcarTodasNotificacionesLeidas);

export default router;
