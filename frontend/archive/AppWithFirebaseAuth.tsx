import React, { useState, useEffect } from 'react';
import { BrowserRouter } from 'react-router-dom';
import { auth } from './config/firebase';
import { onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, updateProfile, User as FirebaseUser } from 'firebase/auth';
import App from './App';

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
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0, 0, 0, 0.8)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 10000,
      fontFamily: 'Arial, sans-serif'
    }}>
      <div style={{
        background: 'white',
        borderRadius: '12px',
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.3)',
        padding: '40px',
        width: '100%',
        maxWidth: '400px',
        margin: '20px'
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
            Accede al sistema BIM con Firebase Authentication
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

// Header con información del usuario
const AuthHeader: React.FC<{ user: FirebaseUser }> = ({ user }) => {
  const [showUserMenu, setShowUserMenu] = useState(false);

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error('Error logging out:', error);
    }
  };

  return (
    <div style={{
      position: 'fixed',
      top: '10px',
      right: '10px',
      zIndex: 1000,
      display: 'flex',
      alignItems: 'center',
      gap: '10px',
      background: 'rgba(255, 255, 255, 0.95)',
      backdropFilter: 'blur(10px)',
      padding: '8px 16px',
      borderRadius: '25px',
      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
      border: '1px solid rgba(255, 255, 255, 0.2)',
      fontFamily: 'Arial, sans-serif'
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        fontSize: '12px',
        color: '#10b981',
        fontWeight: '500'
      }}>
        <span>🔥</span>
        <span>Firebase Auth</span>
      </div>

      <div style={{ width: '1px', height: '20px', background: '#e5e7eb' }}></div>

      <div style={{ position: 'relative' }}>
        <button
          onClick={() => setShowUserMenu(!showUserMenu)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            fontSize: '14px',
            color: '#374151',
            padding: '4px 8px',
            borderRadius: '6px',
            transition: 'background-color 0.2s'
          }}
          onMouseEnter={(e) => e.currentTarget.style.background = '#f3f4f6'}
          onMouseLeave={(e) => e.currentTarget.style.background = 'none'}
        >
          <div style={{
            width: '24px',
            height: '24px',
            borderRadius: '50%',
            background: '#3b82f6',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            fontSize: '12px',
            fontWeight: 'bold'
          }}>
            {(user.displayName || user.email || 'U')[0].toUpperCase()}
          </div>
          <span>{user.displayName || 'Usuario'}</span>
          <span style={{ fontSize: '10px', color: '#9ca3af' }}>▼</span>
        </button>

        {showUserMenu && (
          <div style={{
            position: 'absolute',
            top: '100%',
            right: 0,
            marginTop: '8px',
            background: 'white',
            borderRadius: '8px',
            boxShadow: '0 10px 25px rgba(0, 0, 0, 0.15)',
            border: '1px solid #e5e7eb',
            minWidth: '200px',
            padding: '8px 0',
            fontSize: '14px'
          }}>
            <div style={{ padding: '8px 16px', borderBottom: '1px solid #f3f4f6' }}>
              <div style={{ fontWeight: '500', color: '#111827' }}>
                {user.displayName || 'Usuario'}
              </div>
              <div style={{ fontSize: '12px', color: '#6b7280' }}>
                {user.email}
              </div>
            </div>
            
            <button
              onClick={() => {
                window.open('https://console.firebase.google.com/project/vertex-870b9', '_blank');
                setShowUserMenu(false);
              }}
              style={{
                width: '100%',
                padding: '8px 16px',
                background: 'none',
                border: 'none',
                textAlign: 'left',
                cursor: 'pointer',
                fontSize: '14px',
                color: '#374151'
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = '#f3f4f6'}
              onMouseLeave={(e) => e.currentTarget.style.background = 'none'}
            >
              🔥 Firebase Console
            </button>

            <button
              onClick={() => {
                alert(`Usuario: ${user.displayName || 'No especificado'}\nEmail: ${user.email}\nUID: ${user.uid}\nVerificado: ${user.emailVerified ? 'Sí' : 'No'}`);
                setShowUserMenu(false);
              }}
              style={{
                width: '100%',
                padding: '8px 16px',
                background: 'none',
                border: 'none',
                textAlign: 'left',
                cursor: 'pointer',
                fontSize: '14px',
                color: '#374151'
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = '#f3f4f6'}
              onMouseLeave={(e) => e.currentTarget.style.background = 'none'}
            >
              👤 Ver Perfil
            </button>

            <div style={{ height: '1px', background: '#f3f4f6', margin: '4px 0' }}></div>

            <button
              onClick={() => {
                handleLogout();
                setShowUserMenu(false);
              }}
              style={{
                width: '100%',
                padding: '8px 16px',
                background: 'none',
                border: 'none',
                textAlign: 'left',
                cursor: 'pointer',
                fontSize: '14px',
                color: '#dc2626'
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = '#fef2f2'}
              onMouseLeave={(e) => e.currentTarget.style.background = 'none'}
            >
              🚪 Cerrar Sesión
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

// App Principal con Firebase Auth integrado
const AppWithFirebaseAuth: React.FC = () => {
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
            🔥 Inicializando Firebase Authentication...
          </p>
        </div>
      </div>
    );
  }

  return (
    <BrowserRouter>
      {/* Tu aplicación BIM original */}
      <App />
      
      {/* Header con info del usuario autenticado */}
      {user && <AuthHeader user={user} />}
      
      {/* Overlay de login si no está autenticado */}
      {!user && <LoginForm onLogin={handleLogin} />}
    </BrowserRouter>
  );
};

export default AppWithFirebaseAuth;
