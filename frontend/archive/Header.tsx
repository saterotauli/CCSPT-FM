import React, { useState, useEffect } from 'react';
import { authService, User, LoginRequest } from '../../../services/authService';
import { messagingService } from '../../../services/messagingService';
import NotificationCenter from '../../../modules/messaging/components/NotificationCenter';
import './Header.css';

interface HeaderProps {
  onNavigate: (section: string) => void;
  currentSection: string;
}

const Header: React.FC<HeaderProps> = ({ onNavigate, currentSection }) => {
  const [user, setUser] = useState<User | null>(null);
  const [showNotifications, setShowNotifications] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showLogin, setShowLogin] = useState(false);
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  useEffect(() => {
    const currentUser = authService.getUser();
    setUser(currentUser);
    
    if (currentUser) {
      loadUnreadNotifications();
      // Actualizar notificaciones cada 30 segundos
      const interval = setInterval(loadUnreadNotifications, 30000);
      return () => clearInterval(interval);
    }
  }, []);

  const loadUnreadNotifications = async () => {
    try {
      const response = await messagingService.getNotifications({ 
        leida: false, 
        limit: 1 
      });
      setUnreadCount(response.noLeidas);
    } catch (error) {
      console.error('Error loading unread notifications:', error);
    }
  };

  const handleLogout = () => {
    authService.logout();
    window.location.reload();
  };

  const getRoleName = (rol: string): string => {
    switch (rol) {
      case 'ADMIN': return 'Administrador';
      case 'COORDINADOR': return 'Coordinador';
      case 'OPERARIO': return 'Operario';
      case 'VISOR': return 'Visor';
      case 'EDITOR': return 'Editor';
      case 'CONSULTOR': return 'Consultor';
      default: return rol;
    }
  };

  const getNavigationItems = () => {
    if (!user) return [];

    const items = [
      { key: 'dashboard', label: 'Dashboard', icon: '🏠' },
    ];

    // Elementos específicos por rol
    if (authService.isOperario() || authService.isCoordinador() || authService.isAdmin()) {
      items.push({ key: 'my-tasks', label: 'Mis Tareas', icon: '📋' });
    }

    if (authService.isCoordinador() || authService.isAdmin()) {
      items.push({ key: 'task-management', label: 'Gestión de Tareas', icon: '🛠️' });
    }

    if (authService.isAdmin()) {
      items.push({ key: 'user-management', label: 'Usuarios', icon: '👥' });
    }

    // Elementos comunes
    items.push(
      { key: 'messaging', label: 'Mensajes', icon: '💬' },
      { key: 'espais', label: 'Espacios', icon: '🏢' }
    );

    return items;
  };

  return (
    <>
      <header className="app-header">
        <div className="header-left">
          <div className="app-logo">
            <span className="logo-icon">🏗️</span>
            <span className="logo-text">CCSPT-FM</span>
          </div>
          
          <nav className="main-nav">
            {user && getNavigationItems().map(item => (
              <button
                key={item.key}
                className={`nav-item ${currentSection === item.key ? 'active' : ''}`}
                onClick={() => onNavigate(item.key)}
              >
                <span className="nav-icon">{item.icon}</span>
                <span className="nav-label">{item.label}</span>
              </button>
            ))}
          </nav>
        </div>

        <div className="header-right">
          {user ? (
            <>
              <button
                className="notification-btn"
                onClick={() => setShowNotifications(true)}
              >
                <span className="notification-icon">🔔</span>
                {unreadCount > 0 && (
                  <span className="notification-badge">{unreadCount}</span>
                )}
              </button>

              <div className="user-menu">
                <button
                  className="user-menu-trigger"
                  onClick={() => setShowUserMenu(!showUserMenu)}
                >
                  <div className="user-avatar">
                    {user.avatar ? (
                      <img src={user.avatar} alt={user.nombre} />
                    ) : (
                      <div className="avatar-placeholder">
                        {user.nombre.charAt(0).toUpperCase()}
                      </div>
                    )}
                  </div>
                  <div className="user-info">
                    <div className="user-name">{user.nombre} {user.apellidos}</div>
                    <div className="user-role">{getRoleName(user.rol)}</div>
                  </div>
                  <span className="dropdown-arrow">▼</span>
                </button>

                {showUserMenu && (
                  <div className="user-menu-dropdown">
                    <div className="menu-item">
                      <span className="menu-icon">👤</span>
                      <span>Mi Perfil</span>
                    </div>
                    <div className="menu-item">
                      <span className="menu-icon">⚙️</span>
                      <span>Configuración</span>
                    </div>
                    <div className="menu-divider"></div>
                    <button className="menu-item logout" onClick={handleLogout}>
                      <span className="menu-icon">🚪</span>
                      <span>Cerrar Sesión</span>
                    </button>
                  </div>
                )}
              </div>
            </>
          ) : (
            <button
              className="nav-item"
              onClick={() => {
                setLoginError(null);
                setShowLogin(true);
              }}
            >
              <span className="nav-icon">🔐</span>
              <span className="nav-label">Iniciar sesión</span>
            </button>
          )}
        </div>
      </header>

      {user && (
        <NotificationCenter
          isOpen={showNotifications}
          onClose={() => setShowNotifications(false)}
        />
      )}

      {/* Overlay para cerrar menús al hacer clic fuera */}
      {(showUserMenu || showNotifications || showLogin) && (
        <div 
          className="menu-overlay"
          onClick={() => {
            setShowUserMenu(false);
            setShowNotifications(false);
            setShowLogin(false);
          }}
        />
      )}

      {/* Login Modal */}
      {showLogin && (
        <div style={{
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          background: 'white',
          borderRadius: 12,
          padding: 24,
          width: 360,
          boxShadow: '0 10px 25px rgba(0,0,0,0.15)',
          zIndex: 1000,
          fontFamily: 'Arial, sans-serif'
        }}>
          <h3 style={{ margin: '0 0 12px 0' }}>Iniciar sesión</h3>
          {loginError && (
            <div style={{
              background: '#fef2f2',
              border: '1px solid #fecaca',
              color: '#dc2626',
              padding: '8px 12px',
              borderRadius: 6,
              marginBottom: 12,
              fontSize: 13
            }}>{loginError}</div>
          )}
          <div style={{ display: 'grid', gap: 8 }}>
            <input
              type="email"
              placeholder="Email"
              value={loginEmail}
              onChange={(e) => setLoginEmail(e.target.value)}
              style={{ padding: '10px 12px', border: '1px solid #e5e7eb', borderRadius: 6 }}
            />
            <input
              type="password"
              placeholder="Contraseña"
              value={loginPassword}
              onChange={(e) => setLoginPassword(e.target.value)}
              style={{ padding: '10px 12px', border: '1px solid #e5e7eb', borderRadius: 6 }}
            />
            <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
              <button
                onClick={async () => {
                  try {
                    setLoginLoading(true);
                    setLoginError(null);
                    const creds: LoginRequest = { email: loginEmail, password: loginPassword };
                    const res = await authService.login(creds);
                    setUser(res.usuario);
                    setShowLogin(false);
                  } catch (err: any) {
                    setLoginError(err?.message || 'Error en el login');
                  } finally {
                    setLoginLoading(false);
                  }
                }}
                className="nav-item"
                disabled={loginLoading}
              >
                {loginLoading ? 'Entrando...' : 'Entrar'}
              </button>
              <button
                onClick={() => setShowLogin(false)}
                className="nav-item"
                style={{ background: '#e5e7eb', color: '#111827' }}
                disabled={loginLoading}
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Header;
