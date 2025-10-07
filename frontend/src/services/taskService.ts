import axios from './axiosConfig';
import { User } from './authService';

const API_BASE_URL = 'http://localhost:4000/api/v2';

export interface Task {
  id: string;
  titulo: string;
  descripcion?: string;
  tipo: 'MANTENIMIENTO' | 'REPARACION' | 'INSPECCION' | 'ALARMA' | 'EMERGENCIA';
  prioridad: 'BAJA' | 'MEDIA' | 'ALTA' | 'CRITICA';
  estado: 'PENDIENTE' | 'EN_PROGRESO' | 'COMPLETADA' | 'CANCELADA';
  edifici?: string;
  planta?: string;
  zona?: string;
  ubicacio?: string;
  fechaCreacion: string;
  fechaAsignacion?: string;
  fechaInicio?: string;
  fechaVencimiento?: string;
  fechaCompletada?: string;
  creadoPorId: number;
  asignadoAId?: number;
  actiuGuid?: string;
  observaciones?: string;
  tiempoEstimado?: number;
  tiempoReal?: number;
  creadoPor: Pick<User, 'id' | 'nombre' | 'apellidos' | 'email'>;
  asignadoA?: Pick<User, 'id' | 'nombre' | 'apellidos' | 'email'>;
  actiu?: {
    guid: string;
    tipus: string;
    subtipus?: string;
  };
  _count?: {
    comentarios: number;
    adjuntos: number;
  };
}

export interface TaskComment {
  id: string;
  tareaId: string;
  usuarioId: number;
  contenido: string;
  createdAt: string;
  usuario: Pick<User, 'id' | 'nombre' | 'apellidos' | 'avatar'>;
}

export interface TaskAttachment {
  id: string;
  tareaId: string;
  filename: string;
  url: string;
  mime: string;
  size: number;
  uploadedBy: number;
  createdAt: string;
  usuario: Pick<User, 'id' | 'nombre' | 'apellidos'>;
}

export interface TaskDetail extends Task {
  adjuntos: TaskAttachment[];
  comentarios: TaskComment[];
}

export interface CreateTaskRequest {
  titulo: string;
  descripcion?: string;
  tipo?: string;
  prioridad?: string;
  edifici?: string;
  planta?: string;
  zona?: string;
  ubicacio?: string;
  fechaVencimiento?: string;
  asignadoAId?: number;
  actiuGuid?: string;
  tiempoEstimado?: number;
}

export interface UpdateTaskRequest {
  titulo?: string;
  descripcion?: string;
  tipo?: string;
  prioridad?: string;
  estado?: string;
  edifici?: string;
  planta?: string;
  zona?: string;
  ubicacio?: string;
  fechaVencimiento?: string;
  asignadoAId?: number;
  observaciones?: string;
  tiempoReal?: number;
}

export interface TasksResponse {
  tareas: Task[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

class TaskService {
  async getTasks(params?: {
    estado?: string;
    prioridad?: string;
    tipo?: string;
    asignadoA?: number;
    creadoPor?: number;
    edifici?: string;
    page?: number;
    limit?: number;
  }): Promise<TasksResponse> {
    try {
      const response = await axios.get(`${API_BASE_URL}/tareas`, { params });
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Error obteniendo tareas');
    }
  }

  async getTask(id: string): Promise<{ tarea: TaskDetail }> {
    try {
      const response = await axios.get(`${API_BASE_URL}/tareas/${id}`);
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Error obteniendo tarea');
    }
  }

  async createTask(taskData: CreateTaskRequest): Promise<{ message: string; tarea: Task }> {
    try {
      const response = await axios.post(`${API_BASE_URL}/tareas`, taskData);
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Error creando tarea');
    }
  }

  async updateTask(id: string, taskData: UpdateTaskRequest): Promise<{ message: string; tarea: Task }> {
    try {
      const response = await axios.put(`${API_BASE_URL}/tareas/${id}`, taskData);
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Error actualizando tarea');
    }
  }

  async deleteTask(id: string): Promise<{ message: string }> {
    try {
      const response = await axios.delete(`${API_BASE_URL}/tareas/${id}`);
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Error eliminando tarea');
    }
  }

  async addComment(taskId: string, contenido: string): Promise<{ message: string; comentario: TaskComment }> {
    try {
      const response = await axios.post(`${API_BASE_URL}/tareas/${taskId}/comentarios`, {
        contenido
      });
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Error agregando comentario');
    }
  }

  async getMyTasks(params?: {
    estado?: string;
    page?: number;
    limit?: number;
  }): Promise<TasksResponse> {
    try {
      const response = await axios.get(`${API_BASE_URL}/tareas/mis-tareas`, { params });
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Error obteniendo mis tareas');
    }
  }

  // Métodos de utilidad para el estado de las tareas
  getTaskStatusColor(estado: string): string {
    switch (estado) {
      case 'PENDIENTE':
        return '#fbbf24'; // yellow-400
      case 'EN_PROGRESO':
        return '#3b82f6'; // blue-500
      case 'COMPLETADA':
        return '#10b981'; // emerald-500
      case 'CANCELADA':
        return '#ef4444'; // red-500
      default:
        return '#6b7280'; // gray-500
    }
  }

  getPriorityColor(prioridad: string): string {
    switch (prioridad) {
      case 'BAJA':
        return '#10b981'; // emerald-500
      case 'MEDIA':
        return '#f59e0b'; // amber-500
      case 'ALTA':
        return '#f97316'; // orange-500
      case 'CRITICA':
        return '#ef4444'; // red-500
      default:
        return '#6b7280'; // gray-500
    }
  }

  getTypeIcon(tipo: string): string {
    switch (tipo) {
      case 'MANTENIMIENTO':
        return '🔧';
      case 'REPARACION':
        return '🛠️';
      case 'INSPECCION':
        return '🔍';
      case 'ALARMA':
        return '🚨';
      case 'EMERGENCIA':
        return '🚑';
      default:
        return '📝';
    }
  }
}

export const taskService = new TaskService();
