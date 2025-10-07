import { Router } from 'express';
import { 
  register, 
  login, 
  updateFCMToken, 
  getProfile, 
  updateProfile, 
  changePassword 
} from '../controllers/authController';
import { authenticateToken } from '../middleware/auth';

const router = Router();

// Rutas públicas
router.post('/register', register);
router.post('/login', login);

// Rutas protegidas
router.use(authenticateToken);
router.post('/fcm-token', updateFCMToken);
router.get('/profile', getProfile);
router.put('/profile', updateProfile);
router.put('/change-password', changePassword);

export default router;
