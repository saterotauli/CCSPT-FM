import { Router } from 'express';
import { 
  getTareas,
  getTarea,
  createTarea,
  updateTarea,
  deleteTarea,
  addComentario,
  getMisTareas
} from '../controllers/tareasController';
import { authenticateToken, requireCoordinador, requireOperario } from '../middleware/auth';

const router = Router();

// Todas las rutas requieren autenticación
router.use(authenticateToken);

// Rutas para operarios y superiores
router.get('/mis-tareas', requireOperario, getMisTareas);
router.get('/:id', requireOperario, getTarea);
router.put('/:id', requireOperario, updateTarea);
router.post('/:id/comentarios', requireOperario, addComentario);

// Rutas para coordinadores y admins
router.get('/', requireCoordinador, getTareas);
router.post('/', requireCoordinador, createTarea);
router.delete('/:id', requireCoordinador, deleteTarea);

export default router;
