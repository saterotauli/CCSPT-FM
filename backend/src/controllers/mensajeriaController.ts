import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthRequest } from '../middleware/auth';
import { FirebaseService } from '../services/firebaseService';

const prisma = new PrismaClient();

export const getConversaciones = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'No autenticado' });
    }

    const conversaciones = await prisma.conversacion.findMany({
      where: {
        participantes: {
          some: { usuarioId: req.user.id }
        }
      },
      include: {
        participantes: {
          include: {
            usuario: {
              select: { id: true, nombre: true, apellidos: true, avatar: true }
            }
          }
        },
        mensajes: {
          take: 1,
          orderBy: { createdAt: 'desc' },
          include: {
            remitente: {
              select: { id: true, nombre: true, apellidos: true }
            }
          }
        },
        _count: {
          select: {
            mensajes: {
              where: {
                destinatarioId: req.user.id,
                leido: false
              }
            }
          }
        }
      },
      orderBy: { updatedAt: 'desc' }
    });

    res.json({ conversaciones });
  } catch (error) {
    console.error('Error obteniendo conversaciones:', error);
    res.status(400).json({ error: 'No se pudieron obtener las conversaciones' });
  }
};

export const getConversacion = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { page = 1, limit = 50 } = req.query;

    if (!req.user) {
      return res.status(401).json({ error: 'No autenticado' });
    }

    // Verificar que el usuario es participante de la conversación
    const participante = await prisma.conversacionParticipante.findFirst({
      where: {
        conversacionId: id,
        usuarioId: req.user.id
      }
    });

    if (!participante) {
      return res.status(403).json({ error: 'No tienes acceso a esta conversación' });
    }

    const skip = (Number(page) - 1) * Number(limit);

    const [conversacion, mensajes] = await Promise.all([
      prisma.conversacion.findUnique({
        where: { id },
        include: {
          participantes: {
            include: {
              usuario: {
                select: { id: true, nombre: true, apellidos: true, avatar: true, rol: true }
              }
            }
          }
        }
      }),
      prisma.mensaje.findMany({
        where: { conversacionId: id },
        include: {
          remitente: {
            select: { id: true, nombre: true, apellidos: true, avatar: true }
          }
        },
        skip,
        take: Number(limit),
        orderBy: { createdAt: 'desc' }
      })
    ]);

    // Marcar mensajes como leídos
    await prisma.mensaje.updateMany({
      where: {
        conversacionId: id,
        destinatarioId: req.user.id,
        leido: false
      },
      data: { leido: true }
    });

    // Actualizar última lectura
    await prisma.conversacionParticipante.update({
      where: {
        conversacionId_usuarioId: {
          conversacionId: id,
          usuarioId: req.user.id
        }
      },
      data: { ultimaLectura: new Date() }
    });

    res.json({
      conversacion,
      mensajes: mensajes.reverse() // Mostrar del más antiguo al más reciente
    });
  } catch (error) {
    console.error('Error obteniendo conversación:', error);
    res.status(400).json({ error: 'No se pudo obtener la conversación' });
  }
};

export const createConversacion = async (req: AuthRequest, res: Response) => {
  try {
    const { participanteIds, nombre, esGrupal = false } = req.body;

    if (!req.user) {
      return res.status(401).json({ error: 'No autenticado' });
    }

    // Incluir al usuario actual en los participantes
    const todosParticipantes = [...new Set([req.user.id, ...participanteIds])];

    // Para conversaciones 1:1, verificar si ya existe
    if (!esGrupal && todosParticipantes.length === 2) {
      const conversacionExistente = await prisma.conversacion.findFirst({
        where: {
          esGrupal: false,
          participantes: {
            every: {
              usuarioId: { in: todosParticipantes }
            }
          }
        },
        include: {
          participantes: true
        }
      });

      if (conversacionExistente && conversacionExistente.participantes.length === 2) {
        return res.json({
          message: 'Conversación ya existe',
          conversacion: conversacionExistente
        });
      }
    }

    const conversacion = await prisma.conversacion.create({
      data: {
        nombre,
        esGrupal,
        participantes: {
          create: todosParticipantes.map(usuarioId => ({
            usuarioId,
            fechaUnion: new Date()
          }))
        }
      },
      include: {
        participantes: {
          include: {
            usuario: {
              select: { id: true, nombre: true, apellidos: true, avatar: true }
            }
          }
        }
      }
    });

    res.status(201).json({
      message: 'Conversación creada exitosamente',
      conversacion
    });
  } catch (error) {
    console.error('Error creando conversación:', error);
    res.status(400).json({ error: 'No se pudo crear la conversación' });
  }
};

export const enviarMensaje = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params; // ID de la conversación
    const { contenido } = req.body;

    if (!req.user) {
      return res.status(401).json({ error: 'No autenticado' });
    }

    // Verificar que el usuario es participante de la conversación
    const participante = await prisma.conversacionParticipante.findFirst({
      where: {
        conversacionId: id,
        usuarioId: req.user.id
      }
    });

    if (!participante) {
      return res.status(403).json({ error: 'No tienes acceso a esta conversación' });
    }

    // Obtener otros participantes para notificaciones
    const otrosParticipantes = await prisma.conversacionParticipante.findMany({
      where: {
        conversacionId: id,
        usuarioId: { not: req.user.id }
      },
      include: {
        usuario: {
          select: { id: true, nombre: true, apellidos: true }
        }
      }
    });

    const mensaje = await prisma.mensaje.create({
      data: {
        conversacionId: id,
        remitenteId: req.user.id,
        contenido
      },
      include: {
        remitente: {
          select: { id: true, nombre: true, apellidos: true, avatar: true }
        }
      }
    });

    // Actualizar timestamp de la conversación
    await prisma.conversacion.update({
      where: { id },
      data: { updatedAt: new Date() }
    });

    // Obtener nombre del remitente
    const nombreRemitente = mensaje.remitente.nombre + (mensaje.remitente.apellidos ? ` ${mensaje.remitente.apellidos}` : '');

    // Enviar notificaciones a otros participantes
    const notificacionesPromises = otrosParticipantes.map(async (participante) => {
      await Promise.all([
        // Crear notificación en base de datos
        prisma.notificacion.create({
          data: {
            usuarioId: participante.usuarioId,
            tipo: 'MENSAJE_NUEVO',
            titulo: 'Nuevo mensaje',
            mensaje: `${nombreRemitente}: ${contenido.substring(0, 50)}${contenido.length > 50 ? '...' : ''}`
          }
        }),
        // Enviar notificación push
        FirebaseService.sendNotificationToUser(participante.usuarioId, {
          title: `Mensaje de ${nombreRemitente}`,
          body: contenido.substring(0, 100),
          data: { 
            conversacionId: id, 
            tipo: 'MENSAJE_NUEVO',
            remitenteId: req.user?.id.toString() || ''
          }
        })
      ]);
    });

    await Promise.allSettled(notificacionesPromises);

    res.status(201).json({
      message: 'Mensaje enviado exitosamente',
      mensaje
    });
  } catch (error) {
    console.error('Error enviando mensaje:', error);
    res.status(400).json({ error: 'No se pudo enviar el mensaje' });
  }
};

export const getNotificaciones = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'No autenticado' });
    }

    const { page = 1, limit = 20, leida } = req.query;

    const where: any = { usuarioId: req.user.id };
    if (leida !== undefined) where.leida = leida === 'true';

    const skip = (Number(page) - 1) * Number(limit);

    const [notificaciones, total, noLeidas] = await Promise.all([
      prisma.notificacion.findMany({
        where,
        include: {
          tarea: {
            select: { id: true, titulo: true, prioridad: true }
          }
        },
        skip,
        take: Number(limit),
        orderBy: { createdAt: 'desc' }
      }),
      prisma.notificacion.count({ where }),
      prisma.notificacion.count({
        where: { usuarioId: req.user.id, leida: false }
      })
    ]);

    res.json({
      notificaciones,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit))
      },
      noLeidas
    });
  } catch (error) {
    console.error('Error obteniendo notificaciones:', error);
    res.status(400).json({ error: 'No se pudieron obtener las notificaciones' });
  }
};

export const marcarNotificacionLeida = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    if (!req.user) {
      return res.status(401).json({ error: 'No autenticado' });
    }

    const notificacion = await prisma.notificacion.update({
      where: {
        id,
        usuarioId: req.user.id
      },
      data: { leida: true }
    });

    res.json({
      message: 'Notificación marcada como leída',
      notificacion
    });
  } catch (error) {
    console.error('Error marcando notificación:', error);
    res.status(400).json({ error: 'No se pudo marcar la notificación' });
  }
};

export const marcarTodasNotificacionesLeidas = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'No autenticado' });
    }

    await prisma.notificacion.updateMany({
      where: {
        usuarioId: req.user.id,
        leida: false
      },
      data: { leida: true }
    });

    res.json({ message: 'Todas las notificaciones marcadas como leídas' });
  } catch (error) {
    console.error('Error marcando notificaciones:', error);
    res.status(400).json({ error: 'No se pudieron marcar las notificaciones' });
  }
};
