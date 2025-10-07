import React, { useState } from 'react';

const AppFirebaseSimple: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [isRegister, setIsRegister] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      // Importar Firebase dinámicamente para manejar errores
      const { auth } = await import('./config/firebase');
      const { signInWithEmailAndPassword, createUserWithEmailAndPassword, updateProfile } = await import('firebase/auth');

      if (isRegister) {
        // Registrar nuevo usuario
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        await updateProfile(userCredential.user, { displayName: name });
        setSuccess(`¡Usuario creado exitosamente! Bienvenido ${name}`);
      } else {
        // Iniciar sesión
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        setSuccess(`¡Bienvenido de vuelta, ${userCredential.user.displayName || userCredential.user.email}!`);
      }
    } catch (err: any) {
      console.error('Error de autenticación:', err);
      
      // Mensajes de error más amigables
      switch (err.code) {
        case 'auth/user-not-found':
          setError('No existe un usuario con este email. ¿Quieres crear una cuenta?');
          break;
        case 'auth/wrong-password':
          setError('Contraseña incorrecta. Inténtalo de nuevo.');
          break;
        case 'auth/email-already-in-use':
          setError('Ya existe una cuenta con este email. ¿Quieres iniciar sesión?');
          break;
        case 'auth/weak-password':
          setError('La contraseña debe tener al menos 6 caracteres.');
          break;
        case 'auth/invalid-email':
          setError('El formato del email no es válido.');
          break;
        case 'auth/operation-not-allowed':
          setError('⚠️ Authentication no está activado en Firebase Console. Ve a Authentication → Sign-in method → Email/Password y actívalo.');
          break;
        default:
          setError(`Error: ${err.message}`);
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

        {success && (
          <div style={{
            background: '#f0fdf4',
            border: '1px solid #bbf7d0',
            color: '#16a34a',
            padding: '12px',
            borderRadius: '6px',
            marginBottom: '20px',
            fontSize: '14px'
          }}>
            {success}
          </div>
        )}

        <form onSubmit={handleAuth}>
          {isRegister && (
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
                value={name}
                onChange={(e) => setName(e.target.value)}
                required={isRegister}
                disabled={loading}
                placeholder="Tu nombre completo"
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
              value={email}
              onChange={(e) => setEmail(e.target.value)}
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
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={loading}
              placeholder="Mínimo 6 caracteres"
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
              setSuccess(null);
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

        <div style={{
          marginTop: '20px',
          padding: '15px',
          background: '#f8fafc',
          borderRadius: '6px',
          fontSize: '12px',
          color: '#64748b'
        }}>
          <strong>⚠️ Si ves errores:</strong>
          <br />
          1. Ve a Firebase Console
          <br />
          2. Authentication → Sign-in method
          <br />
          3. Activa Email/Password
        </div>
      </div>
    </div>
  );
};

export default AppFirebaseSimple;
