import admin from 'firebase-admin';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Inicializar Firebase Admin SDK
if (!admin.apps.length) {
  // En producción, usar las credenciales del archivo JSON
  // En desarrollo, usar variables de entorno
  if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      projectId: process.env.FIREBASE_PROJECT_ID
    });
  } else {
    console.warn('Firebase no configurado - Las notificaciones push no funcionarán');
  }
}

export interface NotificationPayload {
  title: string;
  body: string;
  data?: { [key: string]: string };
}

export class FirebaseService {
  static async sendNotificationToUser(userId: number, payload: NotificationPayload) {
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
            priority: 'high' as const
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
      const response = await admin.messaging().send(message);
      console.log(`Notificación enviada exitosamente a ${user.nombre}:`, response);
      return true;

    } catch (error: any) {
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

  static async sendNotificationToMultipleUsers(userIds: number[], payload: NotificationPayload) {
    const results = await Promise.allSettled(
      userIds.map(userId => this.sendNotificationToUser(userId, payload))
    );
    
    const successful = results.filter(result => 
      result.status === 'fulfilled' && result.value === true
    ).length;
    
    console.log(`Notificaciones enviadas: ${successful}/${userIds.length}`);
    return successful;
  }

  static async sendNotificationToRole(rol: string, payload: NotificationPayload) {
    try {
      const users = await prisma.usuario.findMany({
        where: { 
          rol: rol as any, 
          activo: true,
          fcmToken: { not: null }
        },
        select: { id: true }
      });

      const userIds = users.map(user => user.id);
      return await this.sendNotificationToMultipleUsers(userIds, payload);
    } catch (error) {
      console.error('Error enviando notificaciones por rol:', error);
      return 0;
    }
  }

  static async updateUserFCMToken(userId: number, fcmToken: string) {
    try {
      await prisma.usuario.update({
        where: { id: userId },
        data: { fcmToken }
      });
      console.log(`Token FCM actualizado para usuario ${userId}`);
      return true;
    } catch (error) {
      console.error('Error actualizando token FCM:', error);
      return false;
    }
  }
}
