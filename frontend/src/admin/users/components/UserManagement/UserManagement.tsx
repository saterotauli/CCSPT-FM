import React, { useState, useEffect } from 'react';
import { userService, CreateUserRequest, UpdateUserRequest } from '../../../../services/userService';
import { authService, User } from '../../../../services/authService';

interface UserManagementProps {}

const UserManagement: React.FC<UserManagementProps> = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [filters, setFilters] = useState({
    rol: '',
    activo: '',
    search: ''
  });
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    pages: 0
  });

  const currentUser = authService.getUser();

  useEffect(() => {
    loadUsers();
  }, [filters, pagination.page]);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const params: any = {
        page: pagination.page,
        limit: pagination.limit
      };
      
      if (filters.rol) params.rol = filters.rol;
      if (filters.activo !== '') params.activo = filters.activo === 'true';

      const response = await userService.getUsers(params);
      setUsers(response.usuarios);
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

  const handleCreateUser = async (userData: CreateUserRequest | UpdateUserRequest): Promise<void> => {
    try {
      // Type guard: CreateUserRequest requires password, UpdateUserRequest doesn't
      if ('password' in userData && userData.password) {
        await userService.createUser(userData as CreateUserRequest);
      } else {
        throw new Error('Password es requerido para crear un usuario');
      }
      setShowCreateModal(false);
      loadUsers();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleUpdateUser = async (userData: UpdateUserRequest) => {
    if (!selectedUser) return;
    
    try {
      await userService.updateUser(selectedUser.id, userData);
      setShowEditModal(false);
      setSelectedUser(null);
      loadUsers();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleDeleteUser = async (userId: number) => {
    if (!confirm('¿Estás seguro de que quieres desactivar este usuario?')) return;
    
    try {
      await userService.deleteUser(userId);
      loadUsers();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleResetPassword = async (userId: number) => {
    const newPassword = prompt('Introduce la nueva contraseña:');
    if (!newPassword) return;
    
    try {
      await userService.resetPassword(userId, newPassword);
      alert('Contraseña restablecida exitosamente');
    } catch (err: any) {
      setError(err.message);
    }
  };

  const getRoleColor = (rol: string): string => {
    switch (rol) {
      case 'ADMIN': return '#ef4444';
      case 'COORDINADOR': return '#f59e0b';
      case 'OPERARIO': return '#3b82f6';
      case 'VISOR': return '#6b7280';
      default: return '#6b7280';
    }
  };

  const getRoleName = (rol: string): string => {
    switch (rol) {
      case 'ADMIN': return 'Administrador';
      case 'COORDINADOR': return 'Coordinador';
      case 'OPERARIO': return 'Operario';
      case 'VISOR': return 'Visor';
      default: return rol;
    }
  };

  if (!authService.isAdmin()) {
    return (
      <div className="user-management">
        <div className="access-denied">
          <h2>Acceso Denegado</h2>
          <p>No tienes permisos para acceder a la gestión de usuarios.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="user-management">
      <div className="user-management-header">
        <h1>Gestión de Usuarios</h1>
        <button 
          className="btn btn-primary"
          onClick={() => setShowCreateModal(true)}
        >
          + Nuevo Usuario
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
          <label>Rol:</label>
          <select 
            value={filters.rol} 
            onChange={(e) => setFilters(prev => ({ ...prev, rol: e.target.value }))}
          >
            <option value="">Todos</option>
            <option value="ADMIN">Administrador</option>
            <option value="COORDINADOR">Coordinador</option>
            <option value="OPERARIO">Operario</option>
            <option value="VISOR">Visor</option>
          </select>
        </div>

        <div className="filter-group">
          <label>Estado:</label>
          <select 
            value={filters.activo} 
            onChange={(e) => setFilters(prev => ({ ...prev, activo: e.target.value }))}
          >
            <option value="">Todos</option>
            <option value="true">Activo</option>
            <option value="false">Inactivo</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="loading">Cargando usuarios...</div>
      ) : (
        <>
          <div className="users-table">
            <table>
              <thead>
                <tr>
                  <th>Usuario</th>
                  <th>Email</th>
                  <th>Teléfono</th>
                  <th>Rol</th>
                  <th>Estado</th>
                  <th>Último Acceso</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {users.map(user => (
                  <tr key={user.id}>
                    <td>
                      <div className="user-info">
                        <div className="user-avatar">
                          {user.avatar ? (
                            <img src={user.avatar} alt={user.nombre} />
                          ) : (
                            <div className="avatar-placeholder">
                              {user.nombre.charAt(0).toUpperCase()}
                            </div>
                          )}
                        </div>
                        <div>
                          <div className="user-name">
                            {user.nombre} {user.apellidos}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td>{user.email}</td>
                    <td>{user.telefono || '-'}</td>
                    <td>
                      <span 
                        className="role-badge"
                        style={{ backgroundColor: getRoleColor(user.rol) }}
                      >
                        {getRoleName(user.rol)}
                      </span>
                    </td>
                    <td>
                      <span className={`status-badge ${user.activo ? 'active' : 'inactive'}`}>
                        {user.activo ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>
                    <td>
                      {user.ultimoAcceso 
                        ? new Date(user.ultimoAcceso).toLocaleDateString('es-ES')
                        : 'Nunca'
                      }
                    </td>
                    <td>
                      <div className="actions">
                        <button
                          className="btn btn-sm btn-secondary"
                          onClick={() => {
                            setSelectedUser(user);
                            setShowEditModal(true);
                          }}
                        >
                          Editar
                        </button>
                        <button
                          className="btn btn-sm btn-warning"
                          onClick={() => handleResetPassword(user.id)}
                        >
                          Reset Password
                        </button>
                        {currentUser?.id !== user.id && (
                          <button
                            className="btn btn-sm btn-danger"
                            onClick={() => handleDeleteUser(user.id)}
                          >
                            Desactivar
                          </button>
                        )}
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
              ({pagination.total} usuarios)
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
        <UserModal
          title="Crear Usuario"
          onSubmit={handleCreateUser}
          onClose={() => setShowCreateModal(false)}
        />
      )}

      {showEditModal && selectedUser && (
        <UserModal
          title="Editar Usuario"
          user={selectedUser}
          onSubmit={handleUpdateUser}
          onClose={() => {
            setShowEditModal(false);
            setSelectedUser(null);
          }}
        />
      )}
    </div>
  );
};

interface UserModalProps {
  title: string;
  user?: User;
  onSubmit: (data: CreateUserRequest | UpdateUserRequest) => void | Promise<void>;
  onClose: () => void;
}

const UserModal: React.FC<UserModalProps> = ({ title, user, onSubmit, onClose }) => {
  const [formData, setFormData] = useState({
    nombre: user?.nombre || '',
    apellidos: user?.apellidos || '',
    email: user?.email || '',
    telefono: user?.telefono || '',
    password: '',
    rol: user?.rol || 'VISOR',
    activo: user?.activo !== undefined ? user.activo : true
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (user) {
      // Editar usuario
      const { password, ...updateData } = formData;
      onSubmit(updateData);
    } else {
      // Crear usuario
      if (!formData.password) {
        alert('La contraseña es requerida');
        return;
      }
      onSubmit(formData as CreateUserRequest);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal">
        <div className="modal-header">
          <h2>{title}</h2>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>
        
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Nombre *</label>
            <input
              type="text"
              value={formData.nombre}
              onChange={(e) => setFormData(prev => ({ ...prev, nombre: e.target.value }))}
              required
            />
          </div>

          <div className="form-group">
            <label>Apellidos</label>
            <input
              type="text"
              value={formData.apellidos}
              onChange={(e) => setFormData(prev => ({ ...prev, apellidos: e.target.value }))}
            />
          </div>

          <div className="form-group">
            <label>Email *</label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
              required
            />
          </div>

          <div className="form-group">
            <label>Teléfono</label>
            <input
              type="tel"
              value={formData.telefono}
              onChange={(e) => setFormData(prev => ({ ...prev, telefono: e.target.value }))}
            />
          </div>

          {!user && (
            <div className="form-group">
              <label>Contraseña *</label>
              <input
                type="password"
                value={formData.password}
                onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                required
              />
            </div>
          )}

          <div className="form-group">
            <label>Rol</label>
            <select
              value={formData.rol}
              onChange={(e) => setFormData(prev => ({ ...prev, rol: e.target.value as "ADMIN" | "COORDINADOR" | "OPERARIO" | "VISOR" | "EDITOR" | "CONSULTOR" }))}
            >
              <option value="VISOR">Visor</option>
              <option value="OPERARIO">Operario</option>
              <option value="COORDINADOR">Coordinador</option>
              <option value="ADMIN">Administrador</option>
            </select>
          </div>

          {user && (
            <div className="form-group">
              <label>
                <input
                  type="checkbox"
                  checked={formData.activo}
                  onChange={(e) => setFormData(prev => ({ ...prev, activo: e.target.checked }))}
                />
                Usuario activo
              </label>
            </div>
          )}

          <div className="modal-actions">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Cancelar
            </button>
            <button type="submit" className="btn btn-primary">
              {user ? 'Actualizar' : 'Crear'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default UserManagement;
