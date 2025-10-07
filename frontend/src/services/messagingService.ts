import axios from './axiosConfig';
import { User } from './authService';

const API_BASE_URL = 'http://localhost:4000/api/v2';

export interface Conversation {
  id: string;
  nombre?: string;
  esGrupal: boolean;
  createdAt: string;
  updatedAt: string;
  participantes: ConversationParticipant[];
  mensajes: Message[];
  _count: {
    mensajes: number;
  };
}

export interface ConversationParticipant {
  id: string;
  conversacionId: string;
  usuarioId: number;
  fechaUnion: string;
  ultimaLectura?: string;
  usuario: Pick<User, 'id' | 'nombre' | 'apellidos' | 'avatar'>;
}

export interface Message {
  id: string;
  conversacionId: string;
  remitenteId: number;
  destinatarioId?: number;
  contenido: string;
  leido: boolean;
  createdAt: string;
  remitente: Pick<User, 'id' | 'nombre' | 'apellidos' | 'avatar'>;
}

export interface Notification {
  id: string;
  usuarioId: number;
  tipo: 'TAREA_ASIGNADA' | 'TAREA_VENCIDA' | 'MENSAJE_NUEVO' | 'ALARMA_CRITICA' | 'SISTEMA';
  titulo: string;
  mensaje: string;
  leida: boolean;
  tareaId?: string;
  createdAt: string;
  tarea?: {
    id: string;
    titulo: string;
    prioridad: string;
  };
}

export interface NotificationsResponse {
  notificaciones: Notification[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
  noLeidas: number;
}

export interface CreateConversationRequest {
  participanteIds: number[];
  nombre?: string;
  esGrupal?: boolean;
}

class MessagingService {
  // Conversaciones
  async getConversations(): Promise<{ conversaciones: Conversation[] }> {
    try {
      const response = await axios.get(`${API_BASE_URL}/mensajeria/conversaciones`);
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Error obteniendo conversaciones');
    }
  }

  async getConversation(id: string, params?: {
    page?: number;
    limit?: number;
  }): Promise<{ conversacion: Conversation; mensajes: Message[] }> {
    try {
      const response = await axios.get(`${API_BASE_URL}/mensajeria/conversaciones/${id}`, { params });
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Error obteniendo conversación');
    }
  }

  async createConversation(data: CreateConversationRequest): Promise<{ message: string; conversacion: Conversation }> {
    try {
      const response = await axios.post(`${API_BASE_URL}/mensajeria/conversaciones`, data);
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Error creando conversación');
    }
  }

  async sendMessage(conversationId: string, contenido: string): Promise<{ message: string; mensaje: Message }> {
    try {
      const response = await axios.post(`${API_BASE_URL}/mensajeria/conversaciones/${conversationId}/mensajes`, {
        contenido
      });
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Error enviando mensaje');
    }
  }

  // Notificaciones
  async getNotifications(params?: {
    page?: number;
    limit?: number;
    leida?: boolean;
  }): Promise<NotificationsResponse> {
    try {
      const response = await axios.get(`${API_BASE_URL}/mensajeria/notificaciones`, { params });
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Error obteniendo notificaciones');
    }
  }

  async markNotificationAsRead(id: string): Promise<{ message: string; notificacion: Notification }> {
    try {
      const response = await axios.put(`${API_BASE_URL}/mensajeria/notificaciones/${id}/leida`);
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Error marcando notificación');
    }
  }

  async markAllNotificationsAsRead(): Promise<{ message: string }> {
    try {
      const response = await axios.put(`${API_BASE_URL}/mensajeria/notificaciones/marcar-todas-leidas`);
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Error marcando notificaciones');
    }
  }

  // Utilidades
  getNotificationIcon(tipo: string): string {
    switch (tipo) {
      case 'TAREA_ASIGNADA':
        return '📋';
      case 'TAREA_VENCIDA':
        return '⏰';
      case 'MENSAJE_NUEVO':
        return '💬';
      case 'ALARMA_CRITICA':
        return '🚨';
      case 'SISTEMA':
        return 'ℹ️';
      default:
        return '🔔';
    }
  }

  getNotificationColor(tipo: string): string {
    switch (tipo) {
      case 'TAREA_ASIGNADA':
        return '#3b82f6'; // blue-500
      case 'TAREA_VENCIDA':
        return '#f59e0b'; // amber-500
      case 'MENSAJE_NUEVO':
        return '#10b981'; // emerald-500
      case 'ALARMA_CRITICA':
        return '#ef4444'; // red-500
      case 'SISTEMA':
        return '#6b7280'; // gray-500
      default:
        return '#6b7280';
    }
  }

  formatTimeAgo(dateString: string): string {
    const now = new Date();
    const date = new Date(dateString);
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) {
      return 'Hace un momento';
    } else if (diffInSeconds < 3600) {
      const minutes = Math.floor(diffInSeconds / 60);
      return `Hace ${minutes} minuto${minutes > 1 ? 's' : ''}`;
    } else if (diffInSeconds < 86400) {
      const hours = Math.floor(diffInSeconds / 3600);
      return `Hace ${hours} hora${hours > 1 ? 's' : ''}`;
    } else if (diffInSeconds < 604800) {
      const days = Math.floor(diffInSeconds / 86400);
      return `Hace ${days} día${days > 1 ? 's' : ''}`;
    } else {
      return date.toLocaleDateString('es-ES', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });
    }
  }
}

export const messagingService = new MessagingService();
