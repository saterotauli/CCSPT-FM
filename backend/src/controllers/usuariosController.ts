import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { AuthRequest } from '../middleware/auth';

const prisma = new PrismaClient();

export const getUsuarios = async (req: AuthRequest, res: Response) => {
  try {
    const { rol, activo, page = 1, limit = 10 } = req.query;
    
    const where: any = {};
    if (rol) where.rol = rol;
    if (activo !== undefined) where.activo = activo === 'true';

    const skip = (Number(page) - 1) * Number(limit);

    const [usuarios, total] = await Promise.all([
      prisma.usuario.findMany({
        where,
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
          createdAt: true,
          _count: {
            select: {
              tareasAsignadas: { where: { estado: { not: 'COMPLETADA' } } },
              tareasCreadas: true
            }
          }
        },
        skip,
        take: Number(limit),
        orderBy: { createdAt: 'desc' }
      }),
      prisma.usuario.count({ where })
    ]);

    res.json({
      usuarios,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit))
      }
    });
  } catch (error) {
    console.error('Error obteniendo usuarios:', error);
    res.status(400).json({ error: 'No se pudieron obtener los usuarios' });
  }
};

export const getUsuario = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const usuario = await prisma.usuario.findUnique({
      where: { id: Number(id) },
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
        createdAt: true,
        _count: {
          select: {
            tareasAsignadas: { where: { estado: { not: 'COMPLETADA' } } },
            tareasCreadas: true,
            mensajesEnviados: true
          }
        }
      }
    });

    if (!usuario) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    res.json({ usuario });
  } catch (error) {
    console.error('Error obteniendo usuario:', error);
    res.status(400).json({ error: 'No se pudo obtener el usuario' });
  }
};

export const createUsuario = async (req: AuthRequest, res: Response) => {
  try {
    const { nombre, apellidos, email, telefono, password, rol } = req.body;

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
        telefono,
        password: hashedPassword,
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
      message: 'Usuario creado exitosamente',
      usuario
    });
  } catch (error) {
    console.error('Error creando usuario:', error);
    res.status(400).json({ error: 'No se pudo crear el usuario' });
  }
};

export const updateUsuario = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { nombre, apellidos, email, telefono, rol, activo } = req.body;

    // Verificar que el usuario existe
    const existingUser = await prisma.usuario.findUnique({ where: { id: Number(id) } });
    if (!existingUser) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    // Verificar si el email ya existe en otro usuario
    if (email && email !== existingUser.email) {
      const emailExists = await prisma.usuario.findUnique({ where: { email } });
      if (emailExists) {
        return res.status(400).json({ error: 'El email ya está registrado' });
      }
    }

    const usuario = await prisma.usuario.update({
      where: { id: Number(id) },
      data: {
        nombre,
        apellidos,
        email,
        telefono,
        rol,
        activo
      },
      select: {
        id: true,
        nombre: true,
        apellidos: true,
        email: true,
        telefono: true,
        rol: true,
        activo: true,
        updatedAt: true
      }
    });

    res.json({
      message: 'Usuario actualizado exitosamente',
      usuario
    });
  } catch (error) {
    console.error('Error actualizando usuario:', error);
    res.status(400).json({ error: 'No se pudo actualizar el usuario' });
  }
};

export const deleteUsuario = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    // Verificar que el usuario existe
    const existingUser = await prisma.usuario.findUnique({ where: { id: Number(id) } });
    if (!existingUser) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    // No permitir eliminar el propio usuario
    if (req.user && req.user.id === Number(id)) {
      return res.status(400).json({ error: 'No puedes eliminar tu propia cuenta' });
    }

    // En lugar de eliminar, desactivar el usuario para mantener integridad referencial
    await prisma.usuario.update({
      where: { id: Number(id) },
      data: { activo: false }
    });

    res.json({ message: 'Usuario desactivado exitosamente' });
  } catch (error) {
    console.error('Error eliminando usuario:', error);
    res.status(400).json({ error: 'No se pudo eliminar el usuario' });
  }
};

export const resetPassword = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { newPassword } = req.body;

    // Verificar que el usuario existe
    const existingUser = await prisma.usuario.findUnique({ where: { id: Number(id) } });
    if (!existingUser) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await prisma.usuario.update({
      where: { id: Number(id) },
      data: { password: hashedPassword }
    });

    res.json({ message: 'Contraseña restablecida exitosamente' });
  } catch (error) {
    console.error('Error restableciendo contraseña:', error);
    res.status(400).json({ error: 'No se pudo restablecer la contraseña' });
  }
};

export const getOperarios = async (req: AuthRequest, res: Response) => {
  try {
    const operarios = await prisma.usuario.findMany({
      where: {
        rol: 'OPERARIO',
        activo: true
      },
      select: {
        id: true,
        nombre: true,
        apellidos: true,
        email: true,
        telefono: true,
        avatar: true,
        _count: {
          select: {
            tareasAsignadas: { where: { estado: { not: 'COMPLETADA' } } }
          }
        }
      },
      orderBy: { nombre: 'asc' }
    });

    res.json({ operarios });
  } catch (error) {
    console.error('Error obteniendo operarios:', error);
    res.status(400).json({ error: 'No se pudieron obtener los operarios' });
  }
};
