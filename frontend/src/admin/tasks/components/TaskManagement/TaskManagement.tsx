import React, { useState, useEffect } from 'react';
import { taskService, Task, CreateTaskRequest, UpdateTaskRequest } from '../../../../services/taskService';
import { userService } from '../../../../services/userService';
import { authService, User } from '../../../../services/authService';
import styles from './TaskManagement.module.css';

interface TaskManagementProps {}

const TaskManagement: React.FC<TaskManagementProps> = () => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [operarios, setOperarios] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [filters, setFilters] = useState({
    estado: '',
    prioridad: '',
    tipo: '',
    asignadoA: '',
    edifici: ''
  });
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    pages: 0
  });

  const currentUser = authService.getUser();

  useEffect(() => {
    loadTasks();
    loadOperarios();
  }, [filters, pagination.page]);

  const loadTasks = async () => {
    try {
      setLoading(true);
      const params: any = {
        page: pagination.page,
        limit: pagination.limit
      };
      
      if (filters.estado) params.estado = filters.estado;
      if (filters.prioridad) params.prioridad = filters.prioridad;
      if (filters.tipo) params.tipo = filters.tipo;
      if (filters.asignadoA) params.asignadoA = parseInt(filters.asignadoA);
      if (filters.edifici) params.edifici = filters.edifici;

      const response = await taskService.getTasks(params);
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

  const loadOperarios = async () => {
    try {
      const response = await userService.getOperarios();
      setOperarios(response.operarios);
    } catch (err: any) {
      console.error('Error loading operarios:', err);
    }
  };

  const handleCreateTask = async (taskData: CreateTaskRequest) => {
    try {
      await taskService.createTask(taskData);
      setShowCreateModal(false);
      loadTasks();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleUpdateTask = async (taskData: UpdateTaskRequest) => {
    if (!selectedTask) return;
    
    try {
      await taskService.updateTask(selectedTask.id, taskData);
      setShowEditModal(false);
      setSelectedTask(null);
      loadTasks();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    if (!confirm('¿Estás seguro de que quieres eliminar esta tarea?')) return;
    
    try {
      await taskService.deleteTask(taskId);
      loadTasks();
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

  if (!authService.isCoordinador()) {
    return (
      <div className="task-management">
        <div className="access-denied">
          <h2>Acceso Denegado</h2>
          <p>No tienes permisos para acceder a la gestión de tareas.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="task-management">
      <div className="task-management-header">
        <h1>Gestión de Tareas</h1>
        <button 
          className="btn btn-primary"
          onClick={() => setShowCreateModal(true)}
        >
          + Nueva Tarea
        </button>
      </div>

      {error && (
        <div className="error-message">
          {error}
          <button onClick={() => setError(null)}>×</button>
        </div>
      )}

      <div className="filters">
        <div className="filter-group">
          <label>Estado:</label>
          <select 
            value={filters.estado} 
            onChange={(e) => setFilters(prev => ({ ...prev, estado: e.target.value }))}
          >
            <option value="">Todos</option>
            <option value="PENDIENTE">Pendiente</option>
            <option value="EN_PROGRESO">En Progreso</option>
            <option value="COMPLETADA">Completada</option>
            <option value="CANCELADA">Cancelada</option>
          </select>
        </div>

        <div className="filter-group">
          <label>Prioridad:</label>
          <select 
            value={filters.prioridad} 
            onChange={(e) => setFilters(prev => ({ ...prev, prioridad: e.target.value }))}
          >
            <option value="">Todas</option>
            <option value="BAJA">Baja</option>
            <option value="MEDIA">Media</option>
            <option value="ALTA">Alta</option>
            <option value="CRITICA">Crítica</option>
          </select>
        </div>

        <div className="filter-group">
          <label>Tipo:</label>
          <select 
            value={filters.tipo} 
            onChange={(e) => setFilters(prev => ({ ...prev, tipo: e.target.value }))}
          >
            <option value="">Todos</option>
            <option value="MANTENIMIENTO">Mantenimiento</option>
            <option value="REPARACION">Reparación</option>
            <option value="INSPECCION">Inspección</option>
            <option value="ALARMA">Alarma</option>
            <option value="EMERGENCIA">Emergencia</option>
          </select>
        </div>

        <div className="filter-group">
          <label>Asignado a:</label>
          <select 
            value={filters.asignadoA} 
            onChange={(e) => setFilters(prev => ({ ...prev, asignadoA: e.target.value }))}
          >
            <option value="">Todos</option>
            {operarios.map(operario => (
              <option key={operario.id} value={operario.id}>
                {operario.nombre} {operario.apellidos}
              </option>
            ))}
          </select>
        </div>
      </div>

      {loading ? (
        <div className="loading">Cargando tareas...</div>
      ) : (
        <>
          <div className="tasks-table">
            <table>
              <thead>
                <tr>
                  <th>Tarea</th>
                  <th>Tipo</th>
                  <th>Prioridad</th>
                  <th>Estado</th>
                  <th>Asignado a</th>
                  <th>Ubicación</th>
                  <th>Vencimiento</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {tasks.map(task => (
                  <tr key={task.id}>
                    <td>
                      <div className="task-info">
                        <div className="task-title">{task.titulo}</div>
                        <div className="task-description">
                          {task.descripcion && task.descripcion.length > 50 
                            ? `${task.descripcion.substring(0, 50)}...`
                            : task.descripcion
                          }
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className="type-badge">
                        {taskService.getTypeIcon(task.tipo)} {getTypeText(task.tipo)}
                      </span>
                    </td>
                    <td>
                      <span 
                        className="priority-badge"
                        style={{ backgroundColor: taskService.getPriorityColor(task.prioridad) }}
                      >
                        {getPriorityText(task.prioridad)}
                      </span>
                    </td>
                    <td>
                      <span 
                        className="status-badge"
                        style={{ backgroundColor: taskService.getTaskStatusColor(task.estado) }}
                      >
                        {getStatusText(task.estado)}
                      </span>
                    </td>
                    <td>
                      {task.asignadoA ? (
                        <div className="assigned-user">
                          {task.asignadoA.nombre} {task.asignadoA.apellidos}
                        </div>
                      ) : (
                        <span className="unassigned">Sin asignar</span>
                      )}
                    </td>
                    <td>
                      <div className="location">
                        {task.edifici && <div>🏢 {task.edifici}</div>}
                        {task.planta && <div>📍 {task.planta}</div>}
                      </div>
                    </td>
                    <td>
                      {task.fechaVencimiento ? (
                        <div className={`due-date ${new Date(task.fechaVencimiento) < new Date() ? 'overdue' : ''}`}>
                          {new Date(task.fechaVencimiento).toLocaleDateString('es-ES')}
                        </div>
                      ) : (
                        '-'
                      )}
                    </td>
                    <td>
                      <div className="actions">
                        <button
                          className="btn btn-sm btn-secondary"
                          onClick={() => {
                            setSelectedTask(task);
                            setShowEditModal(true);
                          }}
                        >
                          Editar
                        </button>
                        <button
                          className="btn btn-sm btn-danger"
                          onClick={() => handleDeleteTask(task.id)}
                        >
                          Eliminar
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

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
        </>
      )}

      {showCreateModal && (
        <TaskModal
          title="Crear Tarea"
          operarios={operarios}
          onSubmit={handleCreateTask}
          onClose={() => setShowCreateModal(false)}
        />
      )}

      {showEditModal && selectedTask && (
        <TaskModal
          title="Editar Tarea"
          task={selectedTask}
          operarios={operarios}
          onSubmit={handleUpdateTask}
          onClose={() => {
            setShowEditModal(false);
            setSelectedTask(null);
          }}
        />
      )}
    </div>
  );
};

interface TaskModalProps {
  title: string;
  task?: Task;
  operarios: User[];
  onSubmit: (data: CreateTaskRequest | UpdateTaskRequest) => void;
  onClose: () => void;
}

const TaskModal: React.FC<TaskModalProps> = ({ title, task, operarios, onSubmit, onClose }) => {
  const [formData, setFormData] = useState({
    titulo: task?.titulo || '',
    descripcion: task?.descripcion || '',
    tipo: task?.tipo || 'MANTENIMIENTO',
    prioridad: task?.prioridad || 'MEDIA',
    estado: task?.estado || 'PENDIENTE',
    edifici: task?.edifici || '',
    planta: task?.planta || '',
    zona: task?.zona || '',
    ubicacio: task?.ubicacio || '',
    fechaVencimiento: task?.fechaVencimiento ? task.fechaVencimiento.split('T')[0] : '',
    asignadoAId: task?.asignadoAId || '',
    observaciones: task?.observaciones || '',
    tiempoEstimado: task?.tiempoEstimado || '',
    tiempoReal: task?.tiempoReal || ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const submitData: any = {
      ...formData,
      asignadoAId: formData.asignadoAId ? parseInt(formData.asignadoAId as string) : undefined,
      tiempoEstimado: formData.tiempoEstimado ? parseInt(formData.tiempoEstimado as string) : undefined,
      tiempoReal: formData.tiempoReal ? parseInt(formData.tiempoReal as string) : undefined
    };

    // Limpiar campos vacíos
    Object.keys(submitData).forEach(key => {
      if (submitData[key] === '' || submitData[key] === undefined) {
        delete submitData[key];
      }
    });

    onSubmit(submitData);
  };

  return (
    <div className="modal-overlay">
      <div className="modal task-modal">
        <div className="modal-header">
          <h2>{title}</h2>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>
        
        <form onSubmit={handleSubmit}>
          <div className="form-row">
            <div className="form-group">
              <label>Título *</label>
              <input
                type="text"
                value={formData.titulo}
                onChange={(e) => setFormData(prev => ({ ...prev, titulo: e.target.value }))}
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label>Descripción</label>
            <textarea
              value={formData.descripcion}
              onChange={(e) => setFormData(prev => ({ ...prev, descripcion: e.target.value }))}
              rows={3}
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Tipo</label>
              <select
                value={formData.tipo}
                onChange={(e) => setFormData(prev => ({ ...prev, tipo: e.target.value }))}
              >
                <option value="MANTENIMIENTO">Mantenimiento</option>
                <option value="REPARACION">Reparación</option>
                <option value="INSPECCION">Inspección</option>
                <option value="ALARMA">Alarma</option>
                <option value="EMERGENCIA">Emergencia</option>
              </select>
            </div>

            <div className="form-group">
              <label>Prioridad</label>
              <select
                value={formData.prioridad}
                onChange={(e) => setFormData(prev => ({ ...prev, prioridad: e.target.value }))}
              >
                <option value="BAJA">Baja</option>
                <option value="MEDIA">Media</option>
                <option value="ALTA">Alta</option>
                <option value="CRITICA">Crítica</option>
              </select>
            </div>

            {task && (
              <div className="form-group">
                <label>Estado</label>
                <select
                  value={formData.estado}
                  onChange={(e) => setFormData(prev => ({ ...prev, estado: e.target.value }))}
                >
                  <option value="PENDIENTE">Pendiente</option>
                  <option value="EN_PROGRESO">En Progreso</option>
                  <option value="COMPLETADA">Completada</option>
                  <option value="CANCELADA">Cancelada</option>
                </select>
              </div>
            )}
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Edificio</label>
              <input
                type="text"
                value={formData.edifici}
                onChange={(e) => setFormData(prev => ({ ...prev, edifici: e.target.value }))}
              />
            </div>

            <div className="form-group">
              <label>Planta</label>
              <input
                type="text"
                value={formData.planta}
                onChange={(e) => setFormData(prev => ({ ...prev, planta: e.target.value }))}
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Asignar a</label>
              <select
                value={formData.asignadoAId}
                onChange={(e) => setFormData(prev => ({ ...prev, asignadoAId: e.target.value }))}
              >
                <option value="">Sin asignar</option>
                {operarios.map(operario => (
                  <option key={operario.id} value={operario.id}>
                    {operario.nombre} {operario.apellidos}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>Fecha de vencimiento</label>
              <input
                type="date"
                value={formData.fechaVencimiento}
                onChange={(e) => setFormData(prev => ({ ...prev, fechaVencimiento: e.target.value }))}
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Tiempo estimado (minutos)</label>
              <input
                type="number"
                value={formData.tiempoEstimado}
                onChange={(e) => setFormData(prev => ({ ...prev, tiempoEstimado: e.target.value }))}
              />
            </div>

            {task && (
              <div className="form-group">
                <label>Tiempo real (minutos)</label>
                <input
                  type="number"
                  value={formData.tiempoReal}
                  onChange={(e) => setFormData(prev => ({ ...prev, tiempoReal: e.target.value }))}
                />
              </div>
            )}
          </div>

          {task && (
            <div className="form-group">
              <label>Observaciones</label>
              <textarea
                value={formData.observaciones}
                onChange={(e) => setFormData(prev => ({ ...prev, observaciones: e.target.value }))}
                rows={3}
              />
            </div>
          )}

          <div className="modal-actions">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Cancelar
            </button>
            <button type="submit" className="btn btn-primary">
              {task ? 'Actualizar' : 'Crear'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default TaskManagement;
