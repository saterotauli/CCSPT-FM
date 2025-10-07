import { Request, Response } from 'express';
import { PrismaClient, Rol } from '@prisma/client';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { AuthRequest } from '../middleware/auth';
import { FirebaseService } from '../services/firebaseService';

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || 'supersecret';

export const register = async (req: Request, res: Response) => {
  const { nombre, apellidos, email, password, telefono, rol } = req.body;
  
  try {
    // Verificar si el email ya existe
    const existingUser = await prisma.usuario.findUnique({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ error: 'El email ya está registrado' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const usuario = await prisma.usuario.create({
      data: { 
        nombre, 
        apellidos,
        email, 
        password: hashedPassword, 
        telefono,
        rol: rol || 'VISOR'
      },
      select: {
        id: true,
        nombre: true,
        apellidos: true,
        email: true,
        telefono: true,
        rol: true,
        activo: true,
        createdAt: true
      }
    });

    res.status(201).json({ 
      message: 'Usuario registrado exitosamente', 
      usuario 
    });
  } catch (error) {
    console.error('Error en registro:', error);
    res.status(400).json({ error: 'No se pudo registrar el usuario', details: error });
  }
};

export const login = async (req: Request, res: Response) => {
  const { email, password, fcmToken } = req.body;
  
  try {
    const usuario = await prisma.usuario.findUnique({ 
      where: { email },
      select: {
        id: true,
        nombre: true,
        apellidos: true,
        email: true,
        telefono: true,
        password: true,
        rol: true,
        activo: true,
        avatar: true
      }
    });

    if (!usuario) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    if (!usuario.activo) {
      return res.status(401).json({ error: 'Cuenta desactivada' });
    }

    const valid = await bcrypt.compare(password, usuario.password);
    if (!valid) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    // Actualizar último acceso y token FCM si se proporciona
    const updateData: any = { ultimoAcceso: new Date() };
    if (fcmToken) {
      updateData.fcmToken = fcmToken;
    }

    await prisma.usuario.update({
      where: { id: usuario.id },
      data: updateData
    });

    const token = jwt.sign(
      { id: usuario.id, email: usuario.email, rol: usuario.rol }, 
      JWT_SECRET, 
      { expiresIn: '24h' }
    );

    const { password: _, ...usuarioSinPassword } = usuario;

    res.json({ 
      token, 
      usuario: usuarioSinPassword,
      message: 'Inicio de sesión exitoso'
    });
  } catch (error) {
    console.error('Error en login:', error);
    res.status(400).json({ error: 'No se pudo iniciar sesión', details: error });
  }
};

export const updateFCMToken = async (req: AuthRequest, res: Response) => {
  const { fcmToken } = req.body;
  
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'No autenticado' });
    }

    await FirebaseService.updateUserFCMToken(req.user.id, fcmToken);
    
    res.json({ message: 'Token FCM actualizado exitosamente' });
  } catch (error) {
    console.error('Error actualizando token FCM:', error);
    res.status(400).json({ error: 'No se pudo actualizar el token FCM' });
  }
};

export const getProfile = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'No autenticado' });
    }

    const usuario = await prisma.usuario.findUnique({
      where: { id: req.user.id },
      select: {
        id: true,
        nombre: true,
        apellidos: true,
        email: true,
        telefono: true,
        rol: true,
        activo: true,
        avatar: true,
        ultimoAcceso: true,
        createdAt: true
      }
    });

    if (!usuario) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    res.json({ usuario });
  } catch (error) {
    console.error('Error obteniendo perfil:', error);
    res.status(400).json({ error: 'No se pudo obtener el perfil' });
  }
};

export const updateProfile = async (req: AuthRequest, res: Response) => {
  const { nombre, apellidos, telefono } = req.body;
  
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'No autenticado' });
    }

    const usuario = await prisma.usuario.update({
      where: { id: req.user.id },
      data: {
        nombre,
        apellidos,
        telefono
      },
      select: {
        id: true,
        nombre: true,
        apellidos: true,
        email: true,
        telefono: true,
        rol: true,
        avatar: true
      }
    });

    res.json({ 
      message: 'Perfil actualizado exitosamente',
      usuario 
    });
  } catch (error) {
    console.error('Error actualizando perfil:', error);
    res.status(400).json({ error: 'No se pudo actualizar el perfil' });
  }
};

export const changePassword = async (req: AuthRequest, res: Response) => {
  const { currentPassword, newPassword } = req.body;
  
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'No autenticado' });
    }

    // Verificar contraseña actual
    const usuario = await prisma.usuario.findUnique({
      where: { id: req.user.id },
      select: { password: true }
    });

    if (!usuario) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    const valid = await bcrypt.compare(currentPassword, usuario.password);
    if (!valid) {
      return res.status(400).json({ error: 'Contraseña actual incorrecta' });
    }

    // Actualizar contraseña
    const hashedNewPassword = await bcrypt.hash(newPassword, 10);
    await prisma.usuario.update({
      where: { id: req.user.id },
      data: { password: hashedNewPassword }
    });

    res.json({ message: 'Contraseña actualizada exitosamente' });
  } catch (error) {
    console.error('Error cambiando contraseña:', error);
    res.status(400).json({ error: 'No se pudo cambiar la contraseña' });
  }
};
