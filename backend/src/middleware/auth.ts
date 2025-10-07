import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export interface AuthRequest extends Request {
  user?: {
    id: number;
    email: string;
    rol: string;
  };
}

export const authenticateToken = async (req: AuthRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Token de acceso requerido' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;
    
    // Verificar que el usuario existe y está activo
    const user = await prisma.usuario.findUnique({
      where: { id: decoded.id, activo: true },
      select: { id: true, email: true, rol: true }
    });

    if (!user) {
      return res.status(401).json({ error: 'Usuario no válido' });
    }

    req.user = user;
    next();
  } catch (error) {
    return res.status(403).json({ error: 'Token no válido' });
  }
};

export const requireRole = (roles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'No autenticado' });
    }

    if (!roles.includes(req.user.rol)) {
      return res.status(403).json({ error: 'Permisos insuficientes' });
    }

    next();
  };
};

export const requireAdmin = requireRole(['ADMIN']);
export const requireCoordinador = requireRole(['ADMIN', 'COORDINADOR']);
export const requireOperario = requireRole(['ADMIN', 'COORDINADOR', 'OPERARIO']);
