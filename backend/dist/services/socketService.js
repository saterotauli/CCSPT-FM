"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getSocketService = exports.initializeSocketService = exports.SocketService = void 0;
const socket_io_1 = require("socket.io");
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || 'supersecret';
class SocketService {
    constructor(server) {
        this.connectedUsers = new Map(); // userId -> socketId
        this.io = new socket_io_1.Server(server, {
            cors: {
                origin: process.env.FRONTEND_URL || "http://localhost:3000",
                methods: ["GET", "POST"]
            }
        });
        this.setupMiddleware();
        this.setupEventHandlers();
    }
    setupMiddleware() {
        // Middleware de autenticación
        this.io.use(async (socket, next) => {
            try {
                const token = socket.handshake.auth.token;
                if (!token) {
                    return next(new Error('Token requerido'));
                }
                const decoded = jsonwebtoken_1.default.verify(token, JWT_SECRET);
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
            }
            catch (error) {
                next(new Error('Token inválido'));
            }
        });
    }
    setupEventHandlers() {
        this.io.on('connection', (socket) => {
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
            socket.on('join-conversation', (conversationId) => {
                socket.join(`conversation-${conversationId}`);
                console.log(`Usuario ${socket.userId} se unió a conversación ${conversationId}`);
            });
            // Manejar salir de conversación
            socket.on('leave-conversation', (conversationId) => {
                socket.leave(`conversation-${conversationId}`);
                console.log(`Usuario ${socket.userId} salió de conversación ${conversationId}`);
            });
            // Manejar mensaje en tiempo real (opcional, ya que se maneja por HTTP)
            socket.on('send-message', async (data) => {
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
                }
                catch (error) {
                    console.error('Error enviando mensaje:', error);
                    socket.emit('error', { message: 'Error enviando mensaje' });
                }
            });
            // Manejar typing indicators
            socket.on('typing-start', (conversationId) => {
                socket.to(`conversation-${conversationId}`).emit('user-typing', {
                    userId: socket.userId,
                    conversationId
                });
            });
            socket.on('typing-stop', (conversationId) => {
                socket.to(`conversation-${conversationId}`).emit('user-stopped-typing', {
                    userId: socket.userId,
                    conversationId
                });
            });
        });
    }
    async joinUserConversations(socket) {
        if (!socket.userId)
            return;
        try {
            const conversations = await prisma.conversacionParticipante.findMany({
                where: { usuarioId: socket.userId },
                select: { conversacionId: true }
            });
            conversations.forEach(conv => {
                socket.join(`conversation-${conv.conversacionId}`);
            });
            console.log(`Usuario ${socket.userId} se unió a ${conversations.length} conversaciones`);
        }
        catch (error) {
            console.error('Error uniendo usuario a conversaciones:', error);
        }
    }
    // Métodos públicos para enviar notificaciones
    notifyNewMessage(conversationId, message) {
        this.io.to(`conversation-${conversationId}`).emit('new-message', message);
    }
    notifyTaskAssigned(userId, task) {
        const socketId = this.connectedUsers.get(userId);
        if (socketId) {
            this.io.to(socketId).emit('task-assigned', task);
        }
    }
    notifyTaskUpdated(taskId, update) {
        // Notificar a todos los usuarios conectados que tengan acceso a la tarea
        this.io.emit('task-updated', { taskId, update });
    }
    notifyUserStatusChange(userId, status) {
        this.io.emit('user-status-change', { userId, status });
    }
    sendNotificationToUser(userId, notification) {
        const socketId = this.connectedUsers.get(userId);
        if (socketId) {
            this.io.to(socketId).emit('notification', notification);
        }
    }
    sendNotificationToRole(role, notification) {
        // Enviar a todos los usuarios conectados con el rol específico
        this.connectedUsers.forEach((socketId, userId) => {
            const socket = this.io.sockets.sockets.get(socketId);
            if (socket && socket.userRole === role) {
                socket.emit('notification', notification);
            }
        });
    }
    getConnectedUsers() {
        return Array.from(this.connectedUsers.keys());
    }
    isUserConnected(userId) {
        return this.connectedUsers.has(userId);
    }
}
exports.SocketService = SocketService;
let socketService;
const initializeSocketService = (server) => {
    socketService = new SocketService(server);
    return socketService;
};
exports.initializeSocketService = initializeSocketService;
const getSocketService = () => {
    if (!socketService) {
        throw new Error('SocketService no ha sido inicializado');
    }
    return socketService;
};
exports.getSocketService = getSocketService;
