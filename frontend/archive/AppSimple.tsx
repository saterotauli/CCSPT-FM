import React, { useState, useEffect } from 'react';
import { authService, User } from './services/authServiceNew';

// Login Component
const LoginForm: React.FC<{ onLogin: () => void }> = ({ onLogin }) => {
  const [credentials, setCredentials] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      await authService.login(credentials);
      onLogin();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      padding: '20px'
    }}>
      <div style={{
        background: 'white',
        borderRadius: '12px',
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
        padding: '40px',
        width: '100%',
        maxWidth: '400px'
      }}>
        <div style={{ textAlign: 'center', marginBottom: '30px' }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            fontSize: '24px',
            fontWeight: '700',
            marginBottom: '20px'
          }}>
            <span style={{ fontSize: '32px' }}>🏗️</span>
            <span style={{ color: '#3b82f6' }}>CCSPT-FM</span>
          </div>
          <h1 style={{ margin: '0 0 8px 0', fontSize: '24px' }}>Iniciar Sesión</h1>
          <p style={{ margin: '0', color: '#6b7280', fontSize: '14px' }}>
            Accede al sistema de gestión de facilities
          </p>
        </div>

        {error && (
          <div style={{
            background: '#fef2f2',
            border: '1px solid #fecaca',
            color: '#dc2626',
            padding: '12px',
            borderRadius: '6px',
            marginBottom: '20px',
            fontSize: '14px',
            textAlign: 'center'
          }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '20px' }}>
            <label style={{
              display: 'block',
              marginBottom: '6px',
              fontWeight: '500',
              color: '#374151',
              fontSize: '14px'
            }}>
              Email
            </label>
            <input
              type="email"
              value={credentials.email}
              onChange={(e) => setCredentials(prev => ({ ...prev, email: e.target.value }))}
              required
              disabled={loading}
              style={{
                width: '100%',
                padding: '12px 16px',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                fontSize: '14px',
                boxSizing: 'border-box'
              }}
            />
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label style={{
              display: 'block',
              marginBottom: '6px',
              fontWeight: '500',
              color: '#374151',
              fontSize: '14px'
            }}>
              Contraseña
            </label>
            <input
              type="password"
              value={credentials.password}
              onChange={(e) => setCredentials(prev => ({ ...prev, password: e.target.value }))}
              required
              disabled={loading}
              style={{
                width: '100%',
                padding: '12px 16px',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                fontSize: '14px',
                boxSizing: 'border-box'
              }}
            />
          </div>

          <button 
            type="submit" 
            disabled={loading}
            style={{
              width: '100%',
              padding: '12px 16px',
              background: loading ? '#9ca3af' : '#3b82f6',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              fontSize: '14px',
              fontWeight: '500',
              cursor: loading ? 'not-allowed' : 'pointer',
              marginBottom: '20px'
            }}
          >
            {loading ? 'Iniciando sesión...' : 'Iniciar Sesión'}
          </button>
        </form>

        <div style={{
          textAlign: 'center',
          paddingTop: '20px',
          borderTop: '1px solid #e5e7eb'
        }}>
          <p style={{ margin: '0', color: '#6b7280', fontSize: '12px' }}>
            Sistema de Gestión de Facilities - CCSPT
          </p>
        </div>
      </div>
    </div>
  );
};

// Simple Dashboard
const Dashboard: React.FC<{ user: User; onLogout: () => void }> = ({ user, onLogout }) => {
  return (
    <div style={{ minHeight: '100vh', background: '#f8f9fa' }}>
      {/* Header */}
      <header style={{
        background: 'white',
        borderBottom: '1px solid #e5e7eb',
        padding: '0 20px',
        height: '64px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          fontSize: '18px',
          fontWeight: '700'
        }}>
          <span style={{ fontSize: '24px' }}>🏗️</span>
          <span style={{ color: '#3b82f6' }}>CCSPT-FM</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '14px', fontWeight: '500' }}>
              {user.nombre} {user.apellidos}
            </div>
            <div style={{ fontSize: '12px', color: '#6b7280' }}>
              {user.rol}
            </div>
          </div>
          <button
            onClick={onLogout}
            style={{
              padding: '8px 16px',
              background: '#ef4444',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer'
            }}
          >
            Cerrar Sesión
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main style={{ padding: '40px 20px' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <div style={{ marginBottom: '30px' }}>
            <h1 style={{ margin: '0 0 8px 0', fontSize: '28px' }}>
              ¡Bienvenido, {user.nombre}!
            </h1>
            <p style={{ margin: '0', color: '#6b7280', fontSize: '16px' }}>
              Sistema de gestión de facilities integrado con BIM
            </p>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
            gap: '20px'
          }}>
            {/* Tarjeta de Perfil */}
            <div style={{
              background: 'white',
              borderRadius: '8px',
              border: '1px solid #e5e7eb',
              padding: '20px'
            }}>
              <h2 style={{ margin: '0 0 15px 0', fontSize: '18px' }}>Tu Perfil</h2>
              <div style={{ marginBottom: '10px' }}>
                <strong>Email:</strong> {user.email}
              </div>
              <div style={{ marginBottom: '10px' }}>
                <strong>Rol:</strong> {user.rol}
              </div>
              <div style={{ marginBottom: '10px' }}>
                <strong>Estado:</strong> {user.activo ? 'Activo' : 'Inactivo'}
              </div>
              {user.telefono && (
                <div>
                  <strong>Teléfono:</strong> {user.telefono}
                </div>
              )}
            </div>

            {/* Funcionalidades disponibles */}
            <div style={{
              background: 'white',
              borderRadius: '8px',
              border: '1px solid #e5e7eb',
              padding: '20px'
            }}>
              <h2 style={{ margin: '0 0 15px 0', fontSize: '18px' }}>Funcionalidades</h2>
              <div style={{ color: '#6b7280' }}>
                <p>✅ Sistema de autenticación JWT</p>
                <p>✅ Gestión de roles y permisos</p>
                <p>🔄 Gestión de tareas (en desarrollo)</p>
                <p>🔄 Sistema de notificaciones (en desarrollo)</p>
                <p>🔄 Mensajería interna (en desarrollo)</p>
              </div>
            </div>

            {/* Próximos pasos */}
            <div style={{
              background: 'white',
              borderRadius: '8px',
              border: '1px solid #e5e7eb',
              padding: '20px'
            }}>
              <h2 style={{ margin: '0 0 15px 0', fontSize: '18px' }}>Próximos Pasos</h2>
              <div style={{ color: '#6b7280' }}>
                <p>1. Instalar axios: <code>npm install axios</code></p>
                <p>2. Completar los servicios de API</p>
                <p>3. Integrar con el visor BIM existente</p>
                <p>4. Desarrollar la aplicación móvil Flutter</p>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

// Main App Component
const AppSimple: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if user is already logged in
    const currentUser = authService.getUser();
    if (currentUser && authService.isAuthenticated()) {
      setUser(currentUser);
    }
    setLoading(false);
  }, []);

  const handleLogin = () => {
    const currentUser = authService.getUser();
    setUser(currentUser);
  };

  const handleLogout = () => {
    authService.logout();
    setUser(null);
  };

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        background: '#f8f9fa'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: '40px',
            height: '40px',
            border: '4px solid #e5e7eb',
            borderTop: '4px solid #3b82f6',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto 20px'
          }}></div>
          <p style={{ color: '#6b7280', fontSize: '16px', margin: '0' }}>
            Cargando aplicación...
          </p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <LoginForm onLogin={handleLogin} />;
  }

  return <Dashboard user={user} onLogout={handleLogout} />;
};

export default AppSimple;
