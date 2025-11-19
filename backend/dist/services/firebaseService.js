"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.FirebaseService = void 0;
const firebase_admin_1 = __importDefault(require("firebase-admin"));
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
// Inicializar Firebase Admin SDK
if (!firebase_admin_1.default.apps.length) {
    // En producción, usar las credenciales del archivo JSON
    // En desarrollo, usar variables de entorno
    if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
        const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
        firebase_admin_1.default.initializeApp({
            credential: firebase_admin_1.default.credential.cert(serviceAccount),
            projectId: process.env.FIREBASE_PROJECT_ID
        });
    }
    else {
        console.warn('Firebase no configurado - Las notificaciones push no funcionarán');
    }
}
class FirebaseService {
    static async sendNotificationToUser(userId, payload) {
        try {
            // Obtener el token FCM del usuario
            const user = await prisma.usuario.findUnique({
                where: { id: userId },
                select: { fcmToken: true, nombre: true }
            });
            if (!user?.fcmToken) {
                console.log(`Usuario ${userId} no tiene token FCM registrado`);
                return false;
            }
            // Crear el mensaje para Firebase
            const message = {
                token: user.fcmToken,
                notification: {
                    title: payload.title,
                    body: payload.body
                },
                data: payload.data || {},
                android: {
                    notification: {
                        sound: 'default',
                        priority: 'high'
                    }
                },
                apns: {
                    payload: {
                        aps: {
                            sound: 'default',
                            badge: 1
                        }
                    }
                }
            };
            // Enviar la notificación
            const response = await firebase_admin_1.default.messaging().send(message);
            console.log(`Notificación enviada exitosamente a ${user.nombre}:`, response);
            return true;
        }
        catch (error) {
            console.error('Error enviando notificación:', error);
            // Si el token es inválido, eliminarlo de la base de datos
            if (error.code === 'messaging/invalid-registration-token' ||
                error.code === 'messaging/registration-token-not-registered') {
                await prisma.usuario.update({
                    where: { id: userId },
                    data: { fcmToken: null }
                });
                console.log(`Token FCM inválido eliminado para usuario ${userId}`);
            }
            return false;
        }
    }
    static async sendNotificationToMultipleUsers(userIds, payload) {
        const results = await Promise.allSettled(userIds.map(userId => this.sendNotificationToUser(userId, payload)));
        const successful = results.filter(result => result.status === 'fulfilled' && result.value === true).length;
        console.log(`Notificaciones enviadas: ${successful}/${userIds.length}`);
        return successful;
    }
    static async sendNotificationToRole(rol, payload) {
        try {
            const users = await prisma.usuario.findMany({
                where: {
                    rol: rol,
                    activo: true,
                    fcmToken: { not: null }
                },
                select: { id: true }
            });
            const userIds = users.map(user => user.id);
            return await this.sendNotificationToMultipleUsers(userIds, payload);
        }
        catch (error) {
            console.error('Error enviando notificaciones por rol:', error);
            return 0;
        }
    }
    static async updateUserFCMToken(userId, fcmToken) {
        try {
            await prisma.usuario.update({
                where: { id: userId },
                data: { fcmToken }
            });
            console.log(`Token FCM actualizado para usuario ${userId}`);
            return true;
        }
        catch (error) {
            console.error('Error actualizando token FCM:', error);
            return false;
        }
    }
}
exports.FirebaseService = FirebaseService;
