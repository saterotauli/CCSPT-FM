import axios from './axiosConfig';
import { User } from './authService';
import { API_BASE_URL } from '@/config/api';

export interface CreateUserRequest {
  nombre: string;
  apellidos?: string;
  email: string;
  telefono?: string;
  password: string;
  rol: string;
}

export interface UpdateUserRequest {
  nombre?: string;
  apellidos?: string;
  email?: string;
  telefono?: string;
  rol?: string;
  activo?: boolean;
}

export interface UsersResponse {
  usuarios: User[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export interface UserWithStats extends User {
  _count: {
    tareasAsignadas: number;
    tareasCreadas: number;
    mensajesEnviados?: number;
  };
}

class UserService {
  async getUsers(params?: {
    rol?: string;
    activo?: boolean;
    page?: number;
    limit?: number;
  }): Promise<UsersResponse> {
    try {
      const response = await axios.get(`${API_BASE_URL}/usuarios`, { params });
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Error obteniendo usuarios');
    }
  }

  async getUser(id: number): Promise<{ usuario: UserWithStats }> {
    try {
      const response = await axios.get(`${API_BASE_URL}/usuarios/${id}`);
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Error obteniendo usuario');
    }
  }

  async createUser(userData: CreateUserRequest): Promise<{ message: string; usuario: User }> {
    try {
      const response = await axios.post(`${API_BASE_URL}/usuarios`, userData);
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Error creando usuario');
    }
  }

  async updateUser(id: number, userData: UpdateUserRequest): Promise<{ message: string; usuario: User }> {
    try {
      const response = await axios.put(`${API_BASE_URL}/usuarios/${id}`, userData);
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Error actualizando usuario');
    }
  }

  async deleteUser(id: number): Promise<{ message: string }> {
    try {
      const response = await axios.delete(`${API_BASE_URL}/usuarios/${id}`);
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Error eliminando usuario');
    }
  }

  async resetPassword(id: number, newPassword: string): Promise<{ message: string }> {
    try {
      const response = await axios.put(`${API_BASE_URL}/usuarios/${id}/reset-password`, {
        newPassword
      });
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Error restableciendo contraseña');
    }
  }

  async getOperarios(): Promise<{ operarios: UserWithStats[] }> {
    try {
      const response = await axios.get(`${API_BASE_URL}/usuarios/operarios`);
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Error obteniendo operarios');
    }
  }
}

export const userService = new UserService();
