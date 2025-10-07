import React, { useState, useEffect } from 'react';
import { auth } from './config/firebase';
import { onAuthStateChanged, signOut, User as FirebaseUser } from 'firebase/auth';

// Componente de Dashboard
const Dashboard: React.FC<{ user: FirebaseUser; onLogout: () => void }> = ({ user, onLogout }) => {
  const handleLogout = async () => {
    try {
      await signOut(auth);
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
          <span style={{ fontSize: '24px' }}>🔥</span>
          <span style={{ color: '#3b82f6' }}>CCSPT-FM</span>
          <span style={{ 
            fontSize: '12px', 
            color: '#10b981', 
            background: '#f0fdf4', 
            padding: '2px 8px', 
            borderRadius: '12px',
            border: '1px solid #bbf7d0'
          }}>
            Firebase Auth ✓
          </span>
        </div>

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
            onClick={handleLogout}
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
      <main style={{ padding: '40px 20px' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <div style={{ marginBottom: '30px' }}>
            <h1 style={{ margin: '0 0 8px 0', fontSize: '28px' }}>
              ¡Bienvenido, {user.displayName || 'Usuario'}! 🎉
            </h1>
            <p style={{ margin: '0', color: '#6b7280', fontSize: '16px' }}>
              Sistema de gestión de facilities con Firebase Authentication
            </p>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
            gap: '20px'
          }}>
            {/* Perfil del Usuario */}
            <div style={{
              background: 'white',
              borderRadius: '12px',
              border: '1px solid #e5e7eb',
              padding: '24px',
              boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
            }}>
              <h2 style={{ margin: '0 0 20px 0', fontSize: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                👤 Tu Perfil
              </h2>
              <div style={{ marginBottom: '12px' }}>
                <strong>Nombre:</strong> {user.displayName || 'No especificado'}
              </div>
              <div style={{ marginBottom: '12px' }}>
                <strong>Email:</strong> {user.email}
              </div>
              <div style={{ marginBottom: '12px' }}>
                <strong>UID:</strong> <code style={{ fontSize: '12px', background: '#f1f5f9', padding: '2px 6px', borderRadius: '4px' }}>{user.uid}</code>
              </div>
              <div style={{ marginBottom: '12px' }}>
                <strong>Verificado:</strong> {user.emailVerified ? '✅ Sí' : '❌ No'}
              </div>
              <div style={{ fontSize: '12px', color: '#6b7280' }}>
                Último acceso: {user.metadata.lastSignInTime ? new Date(user.metadata.lastSignInTime).toLocaleString() : 'N/A'}
              </div>
            </div>

            {/* Estado del Sistema */}
            <div style={{
              background: 'white',
              borderRadius: '12px',
              border: '1px solid #e5e7eb',
              padding: '24px',
              boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
            }}>
              <h2 style={{ margin: '0 0 20px 0', fontSize: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                🔥 Firebase Status
              </h2>
              <div style={{ color: '#6b7280' }}>
                <div style={{ marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ color: '#10b981' }}>✅</span> Authentication activo
                </div>
                <div style={{ marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ color: '#10b981' }}>✅</span> Usuario autenticado
                </div>
                <div style={{ marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ color: '#10b981' }}>✅</span> Sesión persistente
                </div>
                <div style={{ marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ color: '#f59e0b' }}>⚠️</span> Firestore (opcional)
                </div>
              </div>
            </div>

            {/* Funcionalidades Disponibles */}
            <div style={{
              background: 'white',
              borderRadius: '12px',
              border: '1px solid #e5e7eb',
              padding: '24px',
              boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
            }}>
              <h2 style={{ margin: '0 0 20px 0', fontSize: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                🚀 Funcionalidades
              </h2>
              <div style={{ color: '#6b7280' }}>
                <div style={{ marginBottom: '8px' }}>✅ Login/Registro seguro</div>
                <div style={{ marginBottom: '8px' }}>✅ Gestión de sesiones</div>
                <div style={{ marginBottom: '8px' }}>✅ Persistencia automática</div>
                <div style={{ marginBottom: '8px' }}>🔄 Integración con BIM (próximamente)</div>
                <div style={{ marginBottom: '8px' }}>🔄 Gestión de tareas (próximamente)</div>
                <div style={{ marginBottom: '8px' }}>🔄 Notificaciones push (próximamente)</div>
              </div>
            </div>

            {/* Próximos Pasos */}
            <div style={{
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              borderRadius: '12px',
              padding: '24px',
              color: 'white',
              boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
            }}>
              <h2 style={{ margin: '0 0 20px 0', fontSize: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                🎯 Próximos Pasos
              </h2>
              <div style={{ fontSize: '14px' }}>
                <div style={{ marginBottom: '8px' }}>1. Integrar con el visor BIM existente</div>
                <div style={{ marginBottom: '8px' }}>2. Configurar Firestore para datos adicionales</div>
                <div style={{ marginBottom: '8px' }}>3. Desarrollar sistema de roles avanzado</div>
                <div style={{ marginBottom: '8px' }}>4. Crear aplicación móvil Flutter</div>
                <div style={{ marginBottom: '8px' }}>5. Implementar notificaciones push</div>
              </div>
            </div>

            {/* Acciones Rápidas */}
            <div style={{
              background: 'white',
              borderRadius: '12px',
              border: '1px solid #e5e7eb',
              padding: '24px',
              boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
            }}>
              <h2 style={{ margin: '0 0 20px 0', fontSize: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                ⚡ Acciones Rápidas
              </h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <button 
                  onClick={() => {
                    window.open('https://console.firebase.google.com/project/vertex-870b9', '_blank');
                  }}
                  style={{
                    padding: '10px 16px',
                    background: '#f59e0b',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '14px'
                  }}
                >
                  🔥 Abrir Firebase Console
                </button>
                
                <button 
                  onClick={() => {
                    alert(`Información del usuario:\n\nNombre: ${user.displayName || 'No especificado'}\nEmail: ${user.email}\nUID: ${user.uid}\nVerificado: ${user.emailVerified ? 'Sí' : 'No'}`);
                  }}
                  style={{
                    padding: '10px 16px',
                    background: '#3b82f6',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '14px'
                  }}
                >
                  📋 Ver Info Completa
                </button>

                <button 
                  onClick={() => {
                    const originalApp = confirm('¿Quieres volver a la aplicación BIM original?\n\nEsto te llevará al visor 3D con las funcionalidades de Espais y FM.');
                    if (originalApp) {
                      // Aquí podrías cambiar a la aplicación original
                      alert('Funcionalidad próximamente - Integración con BIM viewer');
                    }
                  }}
                  style={{
                    padding: '10px 16px',
                    background: '#10b981',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '14px'
                  }}
                >
                  🏗️ Ir a BIM Viewer
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

// Componente de Login (simplificado)
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
          setError('No existe un usuario con este email. ¿Quieres crear una cuenta?');
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
            <span style={{ fontSize: '32px' }}>🔥</span>
            <span style={{ color: '#3b82f6' }}>CCSPT-FM</span>
          </div>
          <h1 style={{ margin: '0 0 8px 0', fontSize: '24px' }}>
            {isRegister ? 'Crear Cuenta' : 'Iniciar Sesión'}
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

// App Principal
const AppFirebaseComplete: React.FC = () => {
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

export default AppFirebaseComplete;
