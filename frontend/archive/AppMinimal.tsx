import React, { useState } from 'react';

const AppMinimal: React.FC = () => {
  const [user, setUser] = useState<any>(null);
  const [credentials, setCredentials] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('http://localhost:4000/api/v2/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(credentials),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error en el login');
      }

      const data = await response.json();
      setUser(data.usuario);
      localStorage.setItem('auth_token', data.token);
      localStorage.setItem('auth_user', JSON.stringify(data.usuario));
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async () => {
    try {
      const response = await fetch('http://localhost:4000/api/v2/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          nombre: 'Admin',
          apellidos: 'Sistema',
          email: 'admin@ccspt.com',
          password: 'admin123',
          rol: 'ADMIN'
        }),
      });

      const data = await response.json();
      if (response.ok) {
        alert('Usuario creado exitosamente');
      } else {
        alert('Error: ' + data.error);
      }
    } catch (err: any) {
      alert('Error: ' + err.message);
    }
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('auth_token');
    localStorage.removeItem('auth_user');
  };

  // Verificar si hay usuario guardado al cargar
  React.useEffect(() => {
    const savedUser = localStorage.getItem('auth_user');
    if (savedUser) {
      try {
        setUser(JSON.parse(savedUser));
      } catch (error) {
        localStorage.removeItem('auth_user');
        localStorage.removeItem('auth_token');
      }
    }
  }, []);

  if (user) {
    return (
      <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
        <div style={{ 
          background: 'white', 
          padding: '20px', 
          borderRadius: '8px', 
          boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
          maxWidth: '600px',
          margin: '0 auto'
        }}>
          <h1 style={{ color: '#3b82f6', marginBottom: '20px' }}>
            🏗️ CCSPT-FM - Sistema de Gestión
          </h1>
          
          <div style={{ 
            background: '#f0f9ff', 
            padding: '15px', 
            borderRadius: '6px', 
            marginBottom: '20px' 
          }}>
            <h2 style={{ margin: '0 0 10px 0', color: '#1e40af' }}>
              ¡Bienvenido, {user.nombre}!
            </h2>
            <p><strong>Email:</strong> {user.email}</p>
            <p><strong>Rol:</strong> {user.rol}</p>
            <p><strong>Estado:</strong> {user.activo ? 'Activo' : 'Inactivo'}</p>
          </div>

          <div style={{ marginBottom: '20px' }}>
            <h3>✅ Sistema Funcionando Correctamente</h3>
            <ul>
              <li>✅ Backend conectado (Puerto 4000)</li>
              <li>✅ Frontend funcionando (Puerto 5173)</li>
              <li>✅ Autenticación JWT operativa</li>
              <li>✅ Base de datos PostgreSQL conectada</li>
            </ul>
          </div>

          <div style={{ marginBottom: '20px' }}>
            <h3>🚀 Próximos Pasos</h3>
            <ol>
              <li>Configurar Firebase (opcional para notificaciones push)</li>
              <li>Instalar axios para funcionalidades completas</li>
              <li>Integrar con el visor BIM existente</li>
              <li>Desarrollar gestión de tareas y usuarios</li>
            </ol>
          </div>

          <button 
            onClick={handleLogout}
            style={{
              background: '#ef4444',
              color: 'white',
              border: 'none',
              padding: '10px 20px',
              borderRadius: '6px',
              cursor: 'pointer'
            }}
          >
            Cerrar Sesión
          </button>
        </div>
      </div>
    );
  }

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
        padding: '40px',
        width: '100%',
        maxWidth: '400px',
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)'
      }}>
        <div style={{ textAlign: 'center', marginBottom: '30px' }}>
          <h1 style={{ 
            fontSize: '24px', 
            margin: '0 0 8px 0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px'
          }}>
            <span style={{ fontSize: '32px' }}>🏗️</span>
            <span style={{ color: '#3b82f6' }}>CCSPT-FM</span>
          </h1>
          <p style={{ margin: '0', color: '#6b7280' }}>
            Sistema de Gestión de Facilities
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
            textAlign: 'center'
          }}>
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} style={{ marginBottom: '20px' }}>
          <div style={{ marginBottom: '15px' }}>
            <label style={{ 
              display: 'block', 
              marginBottom: '5px', 
              fontWeight: '500' 
            }}>
              Email
            </label>
            <input
              type="email"
              value={credentials.email}
              onChange={(e) => setCredentials(prev => ({ ...prev, email: e.target.value }))}
              placeholder="admin@ccspt.com"
              required
              style={{
                width: '100%',
                padding: '10px',
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
              marginBottom: '5px', 
              fontWeight: '500' 
            }}>
              Contraseña
            </label>
            <input
              type="password"
              value={credentials.password}
              onChange={(e) => setCredentials(prev => ({ ...prev, password: e.target.value }))}
              placeholder="admin123"
              required
              style={{
                width: '100%',
                padding: '10px',
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
              padding: '12px',
              background: loading ? '#9ca3af' : '#3b82f6',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              fontSize: '14px',
              fontWeight: '500',
              cursor: loading ? 'not-allowed' : 'pointer',
              marginBottom: '15px'
            }}
          >
            {loading ? 'Iniciando sesión...' : 'Iniciar Sesión'}
          </button>
        </form>

        <div style={{ textAlign: 'center' }}>
          <button 
            onClick={handleRegister}
            style={{
              background: '#10b981',
              color: 'white',
              border: 'none',
              padding: '8px 16px',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '12px'
            }}
          >
            Crear Usuario Admin
          </button>
          <p style={{ 
            margin: '10px 0 0 0', 
            fontSize: '12px', 
            color: '#6b7280' 
          }}>
            Haz clic aquí si es la primera vez
          </p>
        </div>
      </div>
    </div>
  );
};

export default AppMinimal;
