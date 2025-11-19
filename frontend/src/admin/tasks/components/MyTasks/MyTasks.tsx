import React, { useState, useEffect } from 'react';
import { taskService, Task, TaskDetail } from '../../../../services/taskService';
import { authService } from '../../../../services/authService';

interface MyTasksProps {}

const MyTasks: React.FC<MyTasksProps> = () => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [selectedTask, setSelectedTask] = useState<TaskDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'pending' | 'in_progress' | 'completed'>('all');
  const [showTaskDetail, setShowTaskDetail] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    pages: 0
  });


  useEffect(() => {
    loadMyTasks();
  }, [filter, pagination.page]);

  const loadMyTasks = async () => {
    try {
      setLoading(true);
      const params: any = {
        page: pagination.page,
        limit: pagination.limit
      };
      
      if (filter !== 'all') {
        switch (filter) {
          case 'pending':
            params.estado = 'PENDIENTE';
            break;
          case 'in_progress':
            params.estado = 'EN_PROGRESO';
            break;
          case 'completed':
            params.estado = 'COMPLETADA';
            break;
        }
      }

      const response = await taskService.getMyTasks(params);
      setTasks(response.tareas);
      setPagination(prev => ({
        ...prev,
        total: response.pagination.total,
        pages: response.pagination.pages
      }));
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const loadTaskDetail = async (taskId: string) => {
    try {
      const response = await taskService.getTask(taskId);
      setSelectedTask(response.tarea);
      setShowTaskDetail(true);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleUpdateTaskStatus = async (taskId: string, estado: string) => {
    try {
      const updateData: any = { estado };
      
      if (estado === 'EN_PROGRESO') {
        updateData.fechaInicio = new Date().toISOString();
      } else if (estado === 'COMPLETADA') {
        updateData.fechaCompletada = new Date().toISOString();
      }

      await taskService.updateTask(taskId, updateData);
      loadMyTasks();
      
      if (selectedTask && selectedTask.id === taskId) {
        loadTaskDetail(taskId);
      }
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleAddComment = async () => {
    if (!selectedTask || !newComment.trim()) return;
    
    try {
      await taskService.addComment(selectedTask.id, newComment.trim());
      setNewComment('');
      loadTaskDetail(selectedTask.id);
    } catch (err: any) {
      setError(err.message);
    }
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

  const getTypeText = (tipo: string): string => {
    switch (tipo) {
      case 'MANTENIMIENTO': return 'Mantenimiento';
      case 'REPARACION': return 'Reparación';
      case 'INSPECCION': return 'Inspección';
      case 'ALARMA': return 'Alarma';
      case 'EMERGENCIA': return 'Emergencia';
      default: return tipo;
    }
  };

  const canUpdateStatus = (currentStatus: string, newStatus: string): boolean => {
    if (currentStatus === 'COMPLETADA' || currentStatus === 'CANCELADA') {
      return false;
    }
    
    if (currentStatus === 'PENDIENTE' && (newStatus === 'EN_PROGRESO' || newStatus === 'COMPLETADA')) {
      return true;
    }
    
    if (currentStatus === 'EN_PROGRESO' && newStatus === 'COMPLETADA') {
      return true;
    }
    
    return false;
  };

  if (!authService.isOperario() && !authService.isCoordinador() && !authService.isAdmin()) {
    return (
      <div className="my-tasks">
        <div className="access-denied">
          <h2>Acceso Denegado</h2>
          <p>No tienes permisos para ver las tareas.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="my-tasks">
      <div className="my-tasks-header">
        <h1>Mis Tareas</h1>
        <div className="task-stats">
          <div className="stat">
            <span className="stat-number">{tasks.filter(t => t.estado === 'PENDIENTE').length}</span>
            <span className="stat-label">Pendientes</span>
          </div>
          <div className="stat">
            <span className="stat-number">{tasks.filter(t => t.estado === 'EN_PROGRESO').length}</span>
            <span className="stat-label">En Progreso</span>
          </div>
          <div className="stat">
            <span className="stat-number">{tasks.filter(t => t.estado === 'COMPLETADA').length}</span>
            <span className="stat-label">Completadas</span>
          </div>
        </div>
      </div>

      {error && (
        <div className="error-message">
          {error}
          <button onClick={() => setError(null)}>×</button>
        </div>
      )}

      <div className="task-filters">
        <button 
          className={`filter-btn ${filter === 'all' ? 'active' : ''}`}
          onClick={() => setFilter('all')}
        >
          Todas
        </button>
        <button 
          className={`filter-btn ${filter === 'pending' ? 'active' : ''}`}
          onClick={() => setFilter('pending')}
        >
          Pendientes
        </button>
        <button 
          className={`filter-btn ${filter === 'in_progress' ? 'active' : ''}`}
          onClick={() => setFilter('in_progress')}
        >
          En Progreso
        </button>
        <button 
          className={`filter-btn ${filter === 'completed' ? 'active' : ''}`}
          onClick={() => setFilter('completed')}
        >
          Completadas
        </button>
      </div>

      {loading ? (
        <div className="loading">Cargando tareas...</div>
      ) : tasks.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">📋</div>
          <h3>No hay tareas</h3>
          <p>No tienes tareas asignadas en este momento.</p>
        </div>
      ) : (
        <>
          <div className="tasks-grid">
            {tasks.map(task => (
              <div key={task.id} className="task-card">
                <div className="task-card-header">
                  <div className="task-title">{task.titulo}</div>
                  <div className="task-badges">
                    <span 
                      className="priority-badge"
                      style={{ backgroundColor: taskService.getPriorityColor(task.prioridad) }}
                    >
                      {getPriorityText(task.prioridad)}
                    </span>
                    <span 
                      className="status-badge"
                      style={{ backgroundColor: taskService.getTaskStatusColor(task.estado) }}
                    >
                      {getStatusText(task.estado)}
                    </span>
                  </div>
                </div>

                <div className="task-card-body">
                  <div className="task-type">
                    {taskService.getTypeIcon(task.tipo)} {getTypeText(task.tipo)}
                  </div>
                  
                  {task.descripcion && (
                    <div className="task-description">
                      {task.descripcion.length > 100 
                        ? `${task.descripcion.substring(0, 100)}...`
                        : task.descripcion
                      }
                    </div>
                  )}

                  {(task.edifici || task.planta) && (
                    <div className="task-location">
                      <span>📍</span>
                      {task.edifici && <span>{task.edifici}</span>}
                      {task.planta && <span>- {task.planta}</span>}
                    </div>
                  )}

                  {task.fechaVencimiento && (
                    <div className={`task-due-date ${new Date(task.fechaVencimiento) < new Date() ? 'overdue' : ''}`}>
                      <span>⏰</span>
                      Vence: {new Date(task.fechaVencimiento).toLocaleDateString('es-ES')}
                    </div>
                  )}
                </div>

                <div className="task-card-actions">
                  <button
                    className="btn btn-sm btn-secondary"
                    onClick={() => loadTaskDetail(task.id)}
                  >
                    Ver Detalles
                  </button>
                  
                  {task.estado === 'PENDIENTE' && (
                    <button
                      className="btn btn-sm btn-primary"
                      onClick={() => handleUpdateTaskStatus(task.id, 'EN_PROGRESO')}
                    >
                      Iniciar
                    </button>
                  )}
                  
                  {task.estado === 'EN_PROGRESO' && (
                    <button
                      className="btn btn-sm btn-success"
                      onClick={() => handleUpdateTaskStatus(task.id, 'COMPLETADA')}
                    >
                      Completar
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          {pagination.pages > 1 && (
            <div className="pagination">
              <button 
                disabled={pagination.page === 1}
                onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
              >
                Anterior
              </button>
              <span>
                Página {pagination.page} de {pagination.pages} 
                ({pagination.total} tareas)
              </span>
              <button 
                disabled={pagination.page === pagination.pages}
                onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
              >
                Siguiente
              </button>
            </div>
          )}
        </>
      )}

      {showTaskDetail && selectedTask && (
        <TaskDetailModal
          task={selectedTask}
          onClose={() => {
            setShowTaskDetail(false);
            setSelectedTask(null);
          }}
          onUpdateStatus={handleUpdateTaskStatus}
          onAddComment={handleAddComment}
          newComment={newComment}
          setNewComment={setNewComment}
          canUpdateStatus={canUpdateStatus}
        />
      )}
    </div>
  );
};

interface TaskDetailModalProps {
  task: TaskDetail;
  onClose: () => void;
  onUpdateStatus: (taskId: string, status: string) => void;
  onAddComment: () => void;
  newComment: string;
  setNewComment: (comment: string) => void;
  canUpdateStatus: (currentStatus: string, newStatus: string) => boolean;
}

const TaskDetailModal: React.FC<TaskDetailModalProps> = ({
  task,
  onClose,
  onUpdateStatus,
  onAddComment,
  newComment,
  setNewComment,
  canUpdateStatus
}) => {
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

  const getTypeText = (tipo: string): string => {
    switch (tipo) {
      case 'MANTENIMIENTO': return 'Mantenimiento';
      case 'REPARACION': return 'Reparación';
      case 'INSPECCION': return 'Inspección';
      case 'ALARMA': return 'Alarma';
      case 'EMERGENCIA': return 'Emergencia';
      default: return tipo;
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal task-detail-modal">
        <div className="modal-header">
          <h2>{task.titulo}</h2>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>
        
        <div className="task-detail-content">
          <div className="task-detail-info">
            <div className="info-row">
              <div className="info-item">
                <label>Tipo:</label>
                <span>{taskService.getTypeIcon(task.tipo)} {getTypeText(task.tipo)}</span>
              </div>
              <div className="info-item">
                <label>Prioridad:</label>
                <span 
                  className="priority-badge"
                  style={{ backgroundColor: taskService.getPriorityColor(task.prioridad) }}
                >
                  {getPriorityText(task.prioridad)}
                </span>
              </div>
              <div className="info-item">
                <label>Estado:</label>
                <span 
                  className="status-badge"
                  style={{ backgroundColor: taskService.getTaskStatusColor(task.estado) }}
                >
                  {getStatusText(task.estado)}
                </span>
              </div>
            </div>

            {task.descripcion && (
              <div className="info-item full-width">
                <label>Descripción:</label>
                <p>{task.descripcion}</p>
              </div>
            )}

            <div className="info-row">
              {task.edifici && (
                <div className="info-item">
                  <label>Edificio:</label>
                  <span>{task.edifici}</span>
                </div>
              )}
              {task.planta && (
                <div className="info-item">
                  <label>Planta:</label>
                  <span>{task.planta}</span>
                </div>
              )}
            </div>

            <div className="info-row">
              <div className="info-item">
                <label>Creado:</label>
                <span>{new Date(task.fechaCreacion).toLocaleDateString('es-ES')}</span>
              </div>
              {task.fechaVencimiento && (
                <div className="info-item">
                  <label>Vencimiento:</label>
                  <span className={new Date(task.fechaVencimiento) < new Date() ? 'overdue' : ''}>
                    {new Date(task.fechaVencimiento).toLocaleDateString('es-ES')}
                  </span>
                </div>
              )}
            </div>

            {task.observaciones && (
              <div className="info-item full-width">
                <label>Observaciones:</label>
                <p>{task.observaciones}</p>
              </div>
            )}
          </div>

          <div className="task-actions">
            {canUpdateStatus(task.estado, 'EN_PROGRESO') && (
              <button
                className="btn btn-primary"
                onClick={() => onUpdateStatus(task.id, 'EN_PROGRESO')}
              >
                Iniciar Tarea
              </button>
            )}
            {canUpdateStatus(task.estado, 'COMPLETADA') && (
              <button
                className="btn btn-success"
                onClick={() => onUpdateStatus(task.id, 'COMPLETADA')}
              >
                Completar Tarea
              </button>
            )}
          </div>

          <div className="task-comments">
            <h3>Comentarios ({task.comentarios.length})</h3>
            
            <div className="add-comment">
              <textarea
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Agregar un comentario..."
                rows={3}
              />
              <button 
                className="btn btn-primary"
                onClick={onAddComment}
                disabled={!newComment.trim()}
              >
                Agregar Comentario
              </button>
            </div>

            <div className="comments-list">
              {task.comentarios.map(comment => (
                <div key={comment.id} className="comment">
                  <div className="comment-header">
                    <span className="comment-author">
                      {comment.usuario.nombre} {comment.usuario.apellidos}
                    </span>
                    <span className="comment-date">
                      {new Date(comment.createdAt).toLocaleDateString('es-ES')}
                    </span>
                  </div>
                  <div className="comment-content">
                    {comment.contenido}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MyTasks;
