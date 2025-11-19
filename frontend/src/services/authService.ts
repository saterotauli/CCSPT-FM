import { API_BASE_URL } from '@/config/api';

export interface User {
  id: number;
  nombre: string;
  apellidos?: string;
  email: string;
  telefono?: string;
  rol: 'ADMIN' | 'COORDINADOR' | 'OPERARIO' | 'VISOR' | 'EDITOR' | 'CONSULTOR';
  activo: boolean;
  avatar?: string;
  ultimoAcceso?: string;
  createdAt: string;
}

export interface LoginRequest {
  email: string;
  password: string;
  fcmToken?: string;
}

export interface LoginResponse {
  token: string;
  usuario: User;
  message: string;
}

export interface RegisterRequest {
  nombre: string;
  apellidos?: string;
  email: string;
  telefono?: string;
  password: string;
  rol?: string;
}

class AuthService {
  private token: string | null = null;
  private user: User | null = null;

  constructor() {
    // Cargar datos del localStorage al inicializar
    this.token = localStorage.getItem('auth_token');
    const userData = localStorage.getItem('auth_user');
    
    if (userData) {
      try {
        this.user = JSON.parse(userData);
      } catch (error) {
        console.error('Error parsing user data:', error);
        this.clearAuth();
      }
    }
  }

  private async fetchWithAuth(url: string, options: RequestInit = {}): Promise<Response> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    };

    if (this.token) {
      headers.Authorization = `Bearer ${this.token}`;
    }

    const response = await fetch(url, {
      ...options,
      headers,
    });

    if (response.status === 401) {
      this.clearAuth();
      window.location.reload();
    }

    return response;
  }

  async login(credentials: LoginRequest): Promise<LoginResponse> {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(credentials),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Error en el login');
      }

      const data: LoginResponse = await response.json();
      
      this.token = data.token;
      this.user = data.usuario;
      
      // Guardar en localStorage
      localStorage.setItem('auth_token', this.token);
      localStorage.setItem('auth_user', JSON.stringify(this.user));
      
      return data;
    } catch (error: any) {
      throw new Error(error.message || 'Error en el login');
    }
  }

  async register(userData: RegisterRequest): Promise<{ message: string; usuario: User }> {
    try {
      const response = await this.fetchWithAuth(`${API_BASE_URL}/auth/register`, {
        method: 'POST',
        body: JSON.stringify(userData),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Error en el registro');
      }

      return await response.json();
    } catch (error: any) {
      throw new Error(error.message || 'Error en el registro');
    }
  }

  logout(): void {
    this.clearAuth();
    window.location.reload();
  }

  private clearAuth(): void {
    this.token = null;
    this.user = null;
    localStorage.removeItem('auth_token');
    localStorage.removeItem('auth_user');
  }

  isAuthenticated(): boolean {
    return this.token !== null && this.user !== null;
  }

  getUser(): User | null {
    return this.user;
  }

  getToken(): string | null {
    return this.token;
  }

  hasRole(roles: string[]): boolean {
    return this.user ? roles.includes(this.user.rol) : false;
  }

  isAdmin(): boolean {
    const user = this.getUser();
    return user?.rol === 'ADMIN';
  }

  isCoordinador(): boolean {
    const user = this.getUser();
    return user?.rol === 'COORDINADOR' || user?.rol === 'ADMIN';
  }

  isOperario(): boolean {
    const user = this.getUser();
    return user?.rol === 'OPERARIO' || user?.rol === 'COORDINADOR' || user?.rol === 'ADMIN';
  }

  isVisor(): boolean {
    const user = this.getUser();
    return user !== null; // Cualquier usuario autenticado puede ver
  }

  // Funciones para roles legacy
  isEditor(): boolean {
    const user = this.getUser();
    return user?.rol === 'EDITOR' || user?.rol === 'COORDINADOR' || user?.rol === 'ADMIN';
  }

  isConsultor(): boolean {
    const user = this.getUser();
    return user?.rol === 'CONSULTOR' || user?.rol === 'VISOR' || user?.rol === 'EDITOR' || user?.rol === 'COORDINADOR' || user?.rol === 'ADMIN';
  }
}

export const authService = new AuthService();
