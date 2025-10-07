import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Link, useLocation } from 'react-router-dom';
import { auth } from './config/firebase';
import { onAuthStateChanged, signOut, User as FirebaseUser } from 'firebase/auth';

// Componente de Login
const LoginForm: React.FC<{ onLogin: (user: FirebaseUser) => void }> = ({ onLogin }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [isRegister, setIsRegister] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const { signInWithEmailAndPassword, createUserWithEmailAndPassword, updateProfile } = await import('firebase/auth');

      if (isRegister) {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        if (name) {
          await updateProfile(userCredential.user, { displayName: name });
        }
        onLogin(userCredential.user);
      } else {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        onLogin(userCredential.user);
      }
    } catch (err: any) {
      switch (err.code) {
        case 'auth/user-not-found':
          setError('No existe un usuario con este email.');
          break;
        case 'auth/wrong-password':
          setError('Contraseña incorrecta.');
          break;
        case 'auth/email-already-in-use':
          setError('Ya existe una cuenta con este email.');
          break;
        case 'auth/weak-password':
          setError('La contraseña debe tener al menos 6 caracteres.');
          break;
        default:
          setError(err.message);
      }
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
            <span style={{ fontSize: '32px' }}>🏗️</span>
            <span style={{ color: '#3b82f6' }}>CCSPT-FM</span>
          </div>
          <h1 style={{ margin: '0 0 8px 0', fontSize: '24px' }}>
            {isRegister ? 'Crear Cuenta' : 'Iniciar Sesión'}
          </h1>
          <p style={{ margin: '0', color: '#6b7280', fontSize: '14px' }}>
            Sistema BIM con Firebase Authentication
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
            fontSize: '14px'
          }}>
            {error}
          </div>
        )}

        <form onSubmit={handleAuth}>
          {isRegister && (
            <div style={{ marginBottom: '20px' }}>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Nombre completo"
                required={isRegister}
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
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email"
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
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Contraseña"
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
            {loading ? 'Procesando...' : (isRegister ? 'Crear Cuenta' : 'Iniciar Sesión')}
          </button>
        </form>

        <div style={{ textAlign: 'center' }}>
          <button 
            onClick={() => {
              setIsRegister(!isRegister);
              setError(null);
            }}
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
            {isRegister ? '¿Ya tienes cuenta? Iniciar sesión' : '¿No tienes cuenta? Crear una'}
          </button>
        </div>
      </div>
    </div>
  );
};

// Página de Espais simplificada
const EspaisPage: React.FC = () => {
  return (
    <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
      <h1 style={{ color: '#3b82f6', marginBottom: '20px' }}>🏢 Espais</h1>
      <div style={{ 
        background: 'white', 
        padding: '20px', 
        borderRadius: '8px', 
        border: '1px solid #e5e7eb' 
      }}>
        <p>Funcionalidad de Espais - Gestión de espacios y departamentos</p>
        <div style={{ marginTop: '20px', color: '#6b7280' }}>
          <p>🔄 Esta página se integrará con:</p>
          <ul>
            <li>Visor BIM 3D</li>
            <li>Gestión de espacios</li>
            <li>Departamentos y dispositivos</li>
            <li>Aislamiento de plantas</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

// Página de FM simplificada
const FMPage: React.FC = () => {
  return (
    <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
      <h1 style={{ color: '#10b981', marginBottom: '20px' }}>🔧 Facility Management</h1>
      <div style={{ 
        background: 'white', 
        padding: '20px', 
        borderRadius: '8px', 
        border: '1px solid #e5e7eb' 
      }}>
        <p>Funcionalidad de FM - Gestión de facilities y mantenimiento</p>
        <div style={{ marginTop: '20px', color: '#6b7280' }}>
          <p>🔄 Esta página se integrará con:</p>
          <ul>
            <li>Visor BIM con georreferenciación</li>
            <li>Gestión de tareas</li>
            <li>Activos móviles</li>
            <li>Sensores IoT</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

// Dashboard principal
const Dashboard: React.FC<{ user: FirebaseUser }> = ({ user }) => {
  const location = useLocation();

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
        justifyContent: 'space-between',
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
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

        {/* Navigation */}
        <nav style={{ display: 'flex', gap: '20px' }}>
          <Link 
            to="/" 
            style={{
              textDecoration: 'none',
              padding: '8px 16px',
              borderRadius: '6px',
              color: location.pathname === '/' ? '#3b82f6' : '#6b7280',
              background: location.pathname === '/' ? '#eff6ff' : 'transparent',
              fontWeight: location.pathname === '/' ? '500' : '400'
            }}
          >
            🏠 Dashboard
          </Link>
          <Link 
            to="/espais" 
            style={{
              textDecoration: 'none',
              padding: '8px 16px',
              borderRadius: '6px',
              color: location.pathname === '/espais' ? '#3b82f6' : '#6b7280',
              background: location.pathname === '/espais' ? '#eff6ff' : 'transparent',
              fontWeight: location.pathname === '/espais' ? '500' : '400'
            }}
          >
            🏢 Espais
          </Link>
          <Link 
            to="/fm" 
            style={{
              textDecoration: 'none',
              padding: '8px 16px',
              borderRadius: '6px',
              color: location.pathname === '/fm' ? '#10b981' : '#6b7280',
              background: location.pathname === '/fm' ? '#f0fdf4' : 'transparent',
              fontWeight: location.pathname === '/fm' ? '500' : '400'
            }}
          >
            🔧 FM
          </Link>
        </nav>

        {/* User menu */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '14px', fontWeight: '500' }}>
              {user.displayName || 'Usuario'}
            </div>
            <div style={{ fontSize: '12px', color: '#6b7280' }}>
              {user.email}
            </div>
          </div>
          <button
            onClick={async () => {
              try {
                await signOut(auth);
              } catch (error) {
                console.error('Error logging out:', error);
              }
            }}
            style={{
              padding: '8px 16px',
              background: '#ef4444',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '14px'
            }}
          >
            Cerrar Sesión
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main>
        <Routes>
          <Route path="/" element={
            <div style={{ padding: '40px 20px' }}>
              <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
                <h1 style={{ marginBottom: '30px' }}>
                  ¡Bienvenido, {user.displayName || 'Usuario'}! 🎉
                </h1>
                
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
                  gap: '20px'
                }}>
                  <div style={{
                    background: 'white',
                    borderRadius: '12px',
                    border: '1px solid #e5e7eb',
                    padding: '24px',
                    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
                  }}>
                    <h2 style={{ margin: '0 0 15px 0', color: '#3b82f6' }}>🏢 Espais</h2>
                    <p style={{ color: '#6b7280', marginBottom: '15px' }}>
                      Gestión de espacios, departamentos y dispositivos
                    </p>
                    <Link 
                      to="/espais"
                      style={{
                        display: 'inline-block',
                        padding: '8px 16px',
                        background: '#3b82f6',
                        color: 'white',
                        textDecoration: 'none',
                        borderRadius: '6px',
                        fontSize: '14px'
                      }}
                    >
                      Ir a Espais →
                    </Link>
                  </div>

                  <div style={{
                    background: 'white',
                    borderRadius: '12px',
                    border: '1px solid #e5e7eb',
                    padding: '24px',
                    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
                  }}>
                    <h2 style={{ margin: '0 0 15px 0', color: '#10b981' }}>🔧 Facility Management</h2>
                    <p style={{ color: '#6b7280', marginBottom: '15px' }}>
                      Gestión de facilities, tareas y mantenimiento
                    </p>
                    <Link 
                      to="/fm"
                      style={{
                        display: 'inline-block',
                        padding: '8px 16px',
                        background: '#10b981',
                        color: 'white',
                        textDecoration: 'none',
                        borderRadius: '6px',
                        fontSize: '14px'
                      }}
                    >
                      Ir a FM →
                    </Link>
                  </div>

                  <div style={{
                    background: 'white',
                    borderRadius: '12px',
                    border: '1px solid #e5e7eb',
                    padding: '24px',
                    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
                  }}>
                    <h2 style={{ margin: '0 0 15px 0', color: '#f59e0b' }}>🔥 Firebase Status</h2>
                    <div style={{ color: '#6b7280' }}>
                      <div style={{ marginBottom: '8px' }}>✅ Authentication activo</div>
                      <div style={{ marginBottom: '8px' }}>✅ Usuario autenticado</div>
                      <div style={{ marginBottom: '8px' }}>✅ Sesión persistente</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          } />
          <Route path="/espais" element={<EspaisPage />} />
          <Route path="/fm" element={<FMPage />} />
        </Routes>
      </main>
    </div>
  );
};

// App Principal
const AppIntegrated: React.FC = () => {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleLogin = (user: FirebaseUser) => {
    setUser(user);
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
            🔥 Inicializando Firebase...
          </p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <LoginForm onLogin={handleLogin} />;
  }

  return (
    <BrowserRouter>
      <Dashboard user={user} />
    </BrowserRouter>
  );
};

export default AppIntegrated;
