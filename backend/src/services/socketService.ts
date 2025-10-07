import { Server as HttpServer } from 'http';
import { Server as SocketIOServer, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || 'supersecret';

interface AuthenticatedSocket extends Socket {
  userId?: number;
  userRole?: string;
}

export class SocketService {
  private io: SocketIOServer;
  private connectedUsers: Map<number, string> = new Map(); // userId -> socketId

  constructor(server: HttpServer) {
    this.io = new SocketIOServer(server, {
      cors: {
        origin: process.env.FRONTEND_URL || "http://localhost:3000",
        methods: ["GET", "POST"]
      }
    });

    this.setupMiddleware();
    this.setupEventHandlers();
  }

  private setupMiddleware() {
    // Middleware de autenticación
    this.io.use(async (socket: AuthenticatedSocket, next) => {
      try {
        const token = socket.handshake.auth.token;
        if (!token) {
          return next(new Error('Token requerido'));
        }

        const decoded = jwt.verify(token, JWT_SECRET) as any;
        
        // Verificar que el usuario existe y está activo
        const user = await prisma.usuario.findUnique({
          where: { id: decoded.id, activo: true },
          select: { id: true, rol: true }
        });

        if (!user) {
          return next(new Error('Usuario no válido'));
        }

        socket.userId = user.id;
        socket.userRole = user.rol;
        next();
      } catch (error) {
        next(new Error('Token inválido'));
      }
    });
  }

  private setupEventHandlers() {
    this.io.on('connection', (socket: AuthenticatedSocket) => {
      console.log(`Usuario ${socket.userId} conectado (${socket.id})`);
      
      if (socket.userId) {
        // Registrar usuario conectado
        this.connectedUsers.set(socket.userId, socket.id);
        
        // Unirse a salas de conversaciones del usuario
        this.joinUserConversations(socket);
      }

      // Manejar desconexión
      socket.on('disconnect', () => {
        console.log(`Usuario ${socket.userId} desconectado`);
        if (socket.userId) {
          this.connectedUsers.delete(socket.userId);
        }
      });

      // Manejar unirse a conversación
      socket.on('join-conversation', (conversationId: string) => {
        socket.join(`conversation-${conversationId}`);
        console.log(`Usuario ${socket.userId} se unió a conversación ${conversationId}`);
      });

      // Manejar salir de conversación
      socket.on('leave-conversation', (conversationId: string) => {
        socket.leave(`conversation-${conversationId}`);
        console.log(`Usuario ${socket.userId} salió de conversación ${conversationId}`);
      });

      // Manejar mensaje en tiempo real (opcional, ya que se maneja por HTTP)
      socket.on('send-message', async (data: { conversationId: string, content: string }) => {
        try {
          // Verificar que el usuario pertenece a la conversación
          const participant = await prisma.conversacionParticipante.findFirst({
            where: {
              conversacionId: data.conversationId,
              usuarioId: socket.userId
            }
          });

          if (!participant) {
            socket.emit('error', { message: 'No tienes acceso a esta conversación' });
            return;
          }

          // El mensaje se crea via HTTP API, aquí solo notificamos
          socket.to(`conversation-${data.conversationId}`).emit('new-message', {
            conversationId: data.conversationId,
            senderId: socket.userId,
            content: data.content,
            timestamp: new Date()
          });
        } catch (error) {
          console.error('Error enviando mensaje:', error);
          socket.emit('error', { message: 'Error enviando mensaje' });
        }
      });

      // Manejar typing indicators
      socket.on('typing-start', (conversationId: string) => {
        socket.to(`conversation-${conversationId}`).emit('user-typing', {
          userId: socket.userId,
          conversationId
        });
      });

      socket.on('typing-stop', (conversationId: string) => {
        socket.to(`conversation-${conversationId}`).emit('user-stopped-typing', {
          userId: socket.userId,
          conversationId
        });
      });
    });
  }

  private async joinUserConversations(socket: AuthenticatedSocket) {
    if (!socket.userId) return;

    try {
      const conversations = await prisma.conversacionParticipante.findMany({
        where: { usuarioId: socket.userId },
        select: { conversacionId: true }
      });

      conversations.forEach(conv => {
        socket.join(`conversation-${conv.conversacionId}`);
      });

      console.log(`Usuario ${socket.userId} se unió a ${conversations.length} conversaciones`);
    } catch (error) {
      console.error('Error uniendo usuario a conversaciones:', error);
    }
  }

  // Métodos públicos para enviar notificaciones
  public notifyNewMessage(conversationId: string, message: any) {
    this.io.to(`conversation-${conversationId}`).emit('new-message', message);
  }

  public notifyTaskAssigned(userId: number, task: any) {
    const socketId = this.connectedUsers.get(userId);
    if (socketId) {
      this.io.to(socketId).emit('task-assigned', task);
    }
  }

  public notifyTaskUpdated(taskId: string, update: any) {
    // Notificar a todos los usuarios conectados que tengan acceso a la tarea
    this.io.emit('task-updated', { taskId, update });
  }

  public notifyUserStatusChange(userId: number, status: 'online' | 'offline') {
    this.io.emit('user-status-change', { userId, status });
  }

  public sendNotificationToUser(userId: number, notification: any) {
    const socketId = this.connectedUsers.get(userId);
    if (socketId) {
      this.io.to(socketId).emit('notification', notification);
    }
  }

  public sendNotificationToRole(role: string, notification: any) {
    // Enviar a todos los usuarios conectados con el rol específico
    this.connectedUsers.forEach((socketId, userId) => {
      const socket = this.io.sockets.sockets.get(socketId) as AuthenticatedSocket;
      if (socket && socket.userRole === role) {
        socket.emit('notification', notification);
      }
    });
  }

  public getConnectedUsers(): number[] {
    return Array.from(this.connectedUsers.keys());
  }

  public isUserConnected(userId: number): boolean {
    return this.connectedUsers.has(userId);
  }
}

let socketService: SocketService;

export const initializeSocketService = (server: HttpServer): SocketService => {
  socketService = new SocketService(server);
  return socketService;
};

export const getSocketService = (): SocketService => {
  if (!socketService) {
    throw new Error('SocketService no ha sido inicializado');
  }
  return socketService;
};
