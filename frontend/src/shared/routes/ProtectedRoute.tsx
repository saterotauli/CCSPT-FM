import React from 'react';
import { Navigate } from 'react-router-dom';
import { firebaseAuthService } from '../../services/firebaseAuthService';

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // DESARROLLO: Bypass completo - siempre deja pasar en modo dev
  if (import.meta.env.DEV) {
    return <>{children}</>;
  }

  const [ready, setReady] = React.useState(false);
  const [authed, setAuthed] = React.useState<boolean>(firebaseAuthService.isAuthenticated());

  React.useEffect(() => {
    let mounted = true;
    firebaseAuthService.waitForAuth().then(() => {
      if (!mounted) return;
      setAuthed(firebaseAuthService.isAuthenticated());
      setReady(true);
    });
    return () => { mounted = false; };
  }, []);

  if (!ready) {
    return (
      <div style={{ display: 'grid', placeItems: 'center', height: '100%' }}>
        <div style={{ fontSize: 14, color: '#6b7280' }}>Comprobando sesión…</div>
      </div>
    );
  }

  if (!authed) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
