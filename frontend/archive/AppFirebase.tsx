import React, { useState, useEffect } from 'react';
import { firebaseAuthService, UserProfile } from './services/firebaseAuthService';

// Componente de Login
const LoginForm: React.FC<{ onLogin: (user: UserProfile) => void }> = ({ onLogin }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    displayName: '',
    role: 'VISOR' as UserProfile['role']
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      let userProfile: UserProfile;
      
      if (isLogin) {
        userProfile = await firebaseAuthService.login(formData.email, formData.password);
      } else {
        userProfile = await firebaseAuthService.register(
          formData.email, 
          formData.password, 
          formData.displayName,
          formData.role
        );
      }
      
      onLogin(userProfile);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px',
      fontFamily: 'Arial, sans-serif'
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
            <span style={{ fontSize: '32px' }}>🔥</span>
            <span style={{ color: '#3b82f6' }}>CCSPT-FM</span>
          </div>
          <h1 style={{ margin: '0 0 8px 0', fontSize: '24px' }}>
            {isLogin ? 'Iniciar Sesión' : 'Crear Cuenta'}
          </h1>
          <p style={{ margin: '0', color: '#6b7280', fontSize: '14px' }}>
            Sistema con Firebase Authentication
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
          {!isLogin && (
            <div style={{ marginBottom: '20px' }}>
              <label style={{
                display: 'block',
                marginBottom: '6px',
                fontWeight: '500',
                color: '#374151',
                fontSize: '14px'
              }}>
                Nombre Completo
              </label>
              <input
                type="text"
                value={formData.displayName}
                onChange={(e) => setFormData(prev => ({ ...prev, displayName: e.target.value }))}
                required={!isLogin}
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
          )}

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
              value={formData.email}
              onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
              required
              disabled={loading}
              placeholder="tu@email.com"
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
              value={formData.password}
              onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
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

          {!isLogin && (
            <div style={{ marginBottom: '20px' }}>
              <label style={{
                display: 'block',
                marginBottom: '6px',
                fontWeight: '500',
                color: '#374151',
                fontSize: '14px'
              }}>
                Rol
              </label>
              <select
                value={formData.role}
                onChange={(e) => setFormData(prev => ({ ...prev, role: e.target.value as UserProfile['role'] }))}
                disabled={loading}
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  fontSize: '14px',
                  boxSizing: 'border-box'
                }}
              >
                <option value="VISOR">Visor</option>
                <option value="OPERARIO">Operario</option>
                <option value="COORDINADOR">Coordinador</option>
                <option value="ADMIN">Administrador</option>
              </select>
            </div>
          )}

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
            {loading ? 'Procesando...' : (isLogin ? 'Iniciar Sesión' : 'Crear Cuenta')}
          </button>
        </form>

        <div style={{ textAlign: 'center' }}>
          <button 
            onClick={() => setIsLogin(!isLogin)}
            disabled={loading}
            style={{
              background: 'none',
              border: 'none',
              color: '#3b82f6',
              cursor: 'pointer',
              fontSize: '14px',
              textDecoration: 'underline'
            }}
          >
            {isLogin ? '¿No tienes cuenta? Crear una' : '¿Ya tienes cuenta? Iniciar sesión'}
          </button>
        </div>
      </div>
    </div>
  );
};

// Dashboard
const Dashboard: React.FC<{ user: UserProfile; onLogout: () => void }> = ({ user, onLogout }) => {
  const handleLogout = async () => {
    try {
      await firebaseAuthService.logout();
      onLogout();
    } catch (error) {
      console.error('Error logging out:', error);
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: '#f8f9fa', fontFamily: 'Arial, sans-serif' }}>
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
          <span style={{ fontSize: '24px' }}>🔥</span>
          <span style={{ color: '#3b82f6' }}>CCSPT-FM</span>
          <span style={{ fontSize: '12px', color: '#10b981', background: '#f0fdf4', padding: '2px 8px', borderRadius: '12px' }}>
            Firebase Auth
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '14px', fontWeight: '500' }}>
              {user.displayName}
            </div>
            <div style={{ fontSize: '12px', color: '#6b7280' }}>
              {user.role} • {user.email}
            </div>
          </div>
          <button
            onClick={handleLogout}
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
              ¡Bienvenido, {user.displayName}! 🎉
            </h1>
            <p style={{ margin: '0', color: '#6b7280', fontSize: '16px' }}>
              Sistema de gestión con Firebase Authentication
            </p>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
            gap: '20px'
          }}>
            {/* Perfil */}
            <div style={{
              background: 'white',
              borderRadius: '8px',
              border: '1px solid #e5e7eb',
              padding: '20px'
            }}>
              <h2 style={{ margin: '0 0 15px 0', fontSize: '18px' }}>🔥 Tu Perfil Firebase</h2>
              <div style={{ marginBottom: '10px' }}>
                <strong>UID:</strong> {user.uid}
              </div>
              <div style={{ marginBottom: '10px' }}>
                <strong>Email:</strong> {user.email}
              </div>
              <div style={{ marginBottom: '10px' }}>
                <strong>Rol:</strong> {user.role}
              </div>
              <div style={{ marginBottom: '10px' }}>
                <strong>Estado:</strong> {user.active ? 'Activo' : 'Inactivo'}
              </div>
              <div style={{ fontSize: '12px', color: '#6b7280' }}>
                Creado: {user.createdAt.toLocaleString()}
              </div>
            </div>

            {/* Características */}
            <div style={{
              background: 'white',
              borderRadius: '8px',
              border: '1px solid #e5e7eb',
              padding: '20px'
            }}>
              <h2 style={{ margin: '0 0 15px 0', fontSize: '18px' }}>✨ Características Firebase</h2>
              <div style={{ color: '#6b7280' }}>
                <p>✅ Autenticación segura</p>
                <p>✅ Gestión de sesiones automática</p>
                <p>✅ Recuperación de contraseña</p>
                <p>✅ Verificación de email</p>
                <p>✅ Autenticación multifactor</p>
                <p>✅ Integración con redes sociales</p>
              </div>
            </div>

            {/* Permisos */}
            <div style={{
              background: 'white',
              borderRadius: '8px',
              border: '1px solid #e5e7eb',
              padding: '20px'
            }}>
              <h2 style={{ margin: '0 0 15px 0', fontSize: '18px' }}>🔐 Tus Permisos</h2>
              <div style={{ color: '#6b7280' }}>
                <p>{firebaseAuthService.isAdmin() ? '✅' : '❌'} Administrador</p>
                <p>{firebaseAuthService.isCoordinador() ? '✅' : '❌'} Coordinador</p>
                <p>{firebaseAuthService.isOperario() ? '✅' : '❌'} Operario</p>
                <p>{firebaseAuthService.isVisor() ? '✅' : '❌'} Visor</p>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

// App Principal
const AppFirebase: React.FC = () => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initAuth = async () => {
      await firebaseAuthService.waitForAuth();
      const userProfile = firebaseAuthService.getUserProfile();
      setUser(userProfile);
      setLoading(false);
    };

    initAuth();
  }, []);

  const handleLogin = (userProfile: UserProfile) => {
    setUser(userProfile);
  };

  const handleLogout = () => {
    setUser(null);
  };

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        background: '#f8f9fa',
        fontFamily: 'Arial, sans-serif'
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
            Inicializando Firebase...
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

export default AppFirebase;
