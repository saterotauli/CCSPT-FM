import React, { useState, useEffect } from 'react';
import { taskService, Task } from '../../../../services/taskService';
import { userService } from '../../../../services/userService';
import { messagingService, Notification } from '../../../../services/messagingService';
import { authService } from '../../../../services/authService';

interface DashboardStats {
  totalTasks: number;
  pendingTasks: number;
  inProgressTasks: number;
  completedTasks: number;
  criticalTasks: number;
  overdueTasks: number;
  totalUsers: number;
  activeUsers: number;
  unreadNotifications: number;
}

const Dashboard: React.FC = () => {
  const [stats, setStats] = useState<DashboardStats>({
    totalTasks: 0,
    pendingTasks: 0,
    inProgressTasks: 0,
    completedTasks: 0,
    criticalTasks: 0,
    overdueTasks: 0,
    totalUsers: 0,
    activeUsers: 0,
    unreadNotifications: 0
  });
  const [recentTasks, setRecentTasks] = useState<Task[]>([]);
  const [recentNotifications, setRecentNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const currentUser = authService.getUser();

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      await Promise.all([
        loadTaskStats(),
        loadUserStats(),
        loadNotificationStats(),
        loadRecentTasks(),
        loadRecentNotifications()
      ]);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const loadTaskStats = async () => {
    try {
      const response = await taskService.getTasks({ limit: 1000 });
      const tasks = response.tareas;
      
      const now = new Date();
      const overdue = tasks.filter(task => 
        task.fechaVencimiento && 
        new Date(task.fechaVencimiento) < now && 
        task.estado !== 'COMPLETADA'
      ).length;

      setStats(prev => ({
        ...prev,
        totalTasks: tasks.length,
        pendingTasks: tasks.filter(t => t.estado === 'PENDIENTE').length,
        inProgressTasks: tasks.filter(t => t.estado === 'EN_PROGRESO').length,
        completedTasks: tasks.filter(t => t.estado === 'COMPLETADA').length,
        criticalTasks: tasks.filter(t => t.prioridad === 'CRITICA').length,
        overdueTasks: overdue
      }));
    } catch (error) {
      console.error('Error loading task stats:', error);
    }
  };

  const loadUserStats = async () => {
    if (!authService.isAdmin()) return;
    
    try {
      const response = await userService.getUsers({ limit: 1000 });
      const users = response.usuarios;
      
      setStats(prev => ({
        ...prev,
        totalUsers: users.length,
        activeUsers: users.filter(u => u.activo).length
      }));
    } catch (error) {
      console.error('Error loading user stats:', error);
    }
  };

  const loadNotificationStats = async () => {
    try {
      const response = await messagingService.getNotifications({ 
        leida: false, 
        limit: 1 
      });
      
      setStats(prev => ({
        ...prev,
        unreadNotifications: response.noLeidas
      }));
    } catch (error) {
      console.error('Error loading notification stats:', error);
    }
  };

  const loadRecentTasks = async () => {
    try {
      let response;
      if (authService.isOperario()) {
        response = await taskService.getMyTasks({ limit: 5 });
      } else {
        response = await taskService.getTasks({ limit: 5 });
      }
      setRecentTasks(response.tareas);
    } catch (error) {
      console.error('Error loading recent tasks:', error);
    }
  };

  const loadRecentNotifications = async () => {
    try {
      const response = await messagingService.getNotifications({ limit: 5 });
      setRecentNotifications(response.notificaciones);
    } catch (error) {
      console.error('Error loading recent notifications:', error);
    }
  };

  const getGreeting = (): string => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Buenos días';
    if (hour < 18) return 'Buenas tardes';
    return 'Buenas noches';
  };

  const getStatusText = (estado: string): string => {
    switch (estado) {
      case 'PENDIENTE': return 'Pendiente';
      case 'EN_PROGRESO': return 'En Progreso';
      case 'COMPLETADA': return 'Completada';
      case 'CANCELADA': return 'Cancelada';
      default: return estado;
    }
  };

  const getPriorityText = (prioridad: string): string => {
    switch (prioridad) {
      case 'BAJA': return 'Baja';
      case 'MEDIA': return 'Media';
      case 'ALTA': return 'Alta';
      case 'CRITICA': return 'Crítica';
      default: return prioridad;
    }
  };

  if (loading) {
    return (
      <div className="dashboard">
        <div className="loading">Cargando dashboard...</div>
      </div>
    );
  }

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <div className="welcome-section">
          <h1>{getGreeting()}, {currentUser?.nombre}!</h1>
          <p>Aquí tienes un resumen de la actividad del sistema</p>
        </div>
        <div className="date-section">
          <div className="current-date">
            {new Date().toLocaleDateString('es-ES', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            })}
          </div>
        </div>
      </div>

      {error && (
        <div className="error-message">
          {error}
          <button onClick={() => setError(null)}>×</button>
        </div>
      )}

      <div className="stats-grid">
        <div className="stat-card tasks">
          <div className="stat-icon">📋</div>
          <div className="stat-content">
            <div className="stat-number">{stats.totalTasks}</div>
            <div className="stat-label">Total Tareas</div>
          </div>
        </div>

        <div className="stat-card pending">
          <div className="stat-icon">⏳</div>
          <div className="stat-content">
            <div className="stat-number">{stats.pendingTasks}</div>
            <div className="stat-label">Pendientes</div>
          </div>
        </div>

        <div className="stat-card progress">
          <div className="stat-icon">🔄</div>
          <div className="stat-content">
            <div className="stat-number">{stats.inProgressTasks}</div>
            <div className="stat-label">En Progreso</div>
          </div>
        </div>

        <div className="stat-card completed">
          <div className="stat-icon">✅</div>
          <div className="stat-content">
            <div className="stat-number">{stats.completedTasks}</div>
            <div className="stat-label">Completadas</div>
          </div>
        </div>

        <div className="stat-card critical">
          <div className="stat-icon">🚨</div>
          <div className="stat-content">
            <div className="stat-number">{stats.criticalTasks}</div>
            <div className="stat-label">Críticas</div>
          </div>
        </div>

        <div className="stat-card overdue">
          <div className="stat-icon">⚠️</div>
          <div className="stat-content">
            <div className="stat-number">{stats.overdueTasks}</div>
            <div className="stat-label">Vencidas</div>
          </div>
        </div>

        {authService.isAdmin() && (
          <>
            <div className="stat-card users">
              <div className="stat-icon">👥</div>
              <div className="stat-content">
                <div className="stat-number">{stats.totalUsers}</div>
                <div className="stat-label">Total Usuarios</div>
              </div>
            </div>

            <div className="stat-card active-users">
              <div className="stat-icon">👤</div>
              <div className="stat-content">
                <div className="stat-number">{stats.activeUsers}</div>
                <div className="stat-label">Usuarios Activos</div>
              </div>
            </div>
          </>
        )}

        <div className="stat-card notifications">
          <div className="stat-icon">🔔</div>
          <div className="stat-content">
            <div className="stat-number">{stats.unreadNotifications}</div>
            <div className="stat-label">Notificaciones</div>
          </div>
        </div>
      </div>

      <div className="dashboard-content">
        <div className="dashboard-section">
          <div className="section-header">
            <h2>Tareas Recientes</h2>
            <button className="view-all-btn">Ver todas</button>
          </div>
          <div className="recent-tasks">
            {recentTasks.length === 0 ? (
              <div className="empty-state">
                <p>No hay tareas recientes</p>
              </div>
            ) : (
              recentTasks.map(task => (
                <div key={task.id} className="task-item">
                  <div className="task-info">
                    <div className="task-title">{task.titulo}</div>
                    <div className="task-meta">
                      <span className="task-type">
                        {taskService.getTypeIcon(task.tipo)}
                      </span>
                      <span 
                        className="task-priority"
                        style={{ color: taskService.getPriorityColor(task.prioridad) }}
                      >
                        {getPriorityText(task.prioridad)}
                      </span>
                      <span className="task-assignee">
                        {task.asignadoA ? 
                          `${task.asignadoA.nombre} ${task.asignadoA.apellidos}` : 
                          'Sin asignar'
                        }
                      </span>
                    </div>
                  </div>
                  <div className="task-status">
                    <span 
                      className="status-badge"
                      style={{ backgroundColor: taskService.getTaskStatusColor(task.estado) }}
                    >
                      {getStatusText(task.estado)}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="dashboard-section">
          <div className="section-header">
            <h2>Notificaciones Recientes</h2>
            <button className="view-all-btn">Ver todas</button>
          </div>
          <div className="recent-notifications">
            {recentNotifications.length === 0 ? (
              <div className="empty-state">
                <p>No hay notificaciones recientes</p>
              </div>
            ) : (
              recentNotifications.map(notification => (
                <div key={notification.id} className={`notification-item ${!notification.leida ? 'unread' : ''}`}>
                  <div className="notification-icon">
                    {messagingService.getNotificationIcon(notification.tipo)}
                  </div>
                  <div className="notification-content">
                    <div className="notification-title">{notification.titulo}</div>
                    <div className="notification-message">{notification.mensaje}</div>
                    <div className="notification-time">
                      {messagingService.formatTimeAgo(notification.createdAt)}
                    </div>
                  </div>
                  {!notification.leida && (
                    <div className="unread-indicator"></div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
