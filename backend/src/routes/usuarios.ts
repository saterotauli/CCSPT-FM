import { Router } from 'express';
import { 
  getUsuarios,
  getUsuario,
  createUsuario,
  updateUsuario,
  deleteUsuario,
  resetPassword,
  getOperarios
} from '../controllers/usuariosController';
import { authenticateToken, requireAdmin, requireCoordinador } from '../middleware/auth';

const router = Router();

// Todas las rutas requieren autenticación
router.use(authenticateToken);

// Rutas para coordinadores y admins
router.get('/', requireCoordinador, getUsuarios);
router.get('/operarios', requireCoordinador, getOperarios);
router.get('/:id', requireCoordinador, getUsuario);
router.post('/', requireAdmin, createUsuario);
router.put('/:id', requireAdmin, updateUsuario);
router.delete('/:id', requireAdmin, deleteUsuario);
router.put('/:id/reset-password', requireAdmin, resetPassword);

export default router;
