import React from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { Sidebar, Header } from '@shared/components/layout';
import ControlGeneral from '@features/control/pages/ControlGeneral';
import { ControlModelViewer } from '@features/control/components';
import Projectes from '@features/projectes/pages/Projectes';
import Docs from '@features/docs/pages/Docs';
import Consultes from '@features/consultes/pages/Consultes';
import Config from '@features/config/pages/Config';
import ActiusMobils from '@features/actius-mobils/pages/ActiusMobils';
import FM from '@features/fm/pages/FM';
import Espais from '@features/espais/pages/Espais';
import LoginLanding from '@auth/pages/LoginLanding';
import ProtectedRoute from '@shared/routes/ProtectedRoute';
import Mensajes from '@modules/messaging/pages/Mensajes';
import Notificaciones from '@modules/notifications/pages/Notificaciones';
import { initializeIfcSpaceService } from './services/ifcSpaceService';
import '@styles/Pages.css';
import './style.css';

const App: React.FC = () => {
  const location = useLocation();

  // Responsive: detect mobile for layout adjustments (sidebar at bottom)
  const [isMobile, setIsMobile] = React.useState<boolean>(() => {
    try { return window.innerWidth <= 768; } catch { return false; }
  });
  React.useEffect(() => {
    const check = () => setIsMobile(window.innerWidth <= 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  // Initialize ifcspace service on app startup
  React.useEffect(() => {
    initializeIfcSpaceService().catch(error => {
      console.error('[App] Failed to initialize ifcspace service:', error);
    });
  }, []);

  // Theme: use light theme for all pages (FM matches Control aesthetics)
  const isDarkPage = false;

  const isAuthRoute = location.pathname.startsWith('/login');

  return (
    <div className={`app ${isDarkPage ? 'dark-theme' : ''}`}>
      {isAuthRoute ? (
        // Página de login a pantalla completa, sin sidebar ni márgenes
        <Routes>
          <Route path="/login" element={<LoginLanding />} />
          {/* Seguridad extra: si caen aquí otras rutas, redirigimos */}
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      ) : (
        <div style={{ display: 'flex', width: '100%', height: '100vh' }}>
          {/* Header superior */}
          <Header leftOffset={isMobile ? '0' : '5rem'} />
          {/* Sidebar */}
          <div style={isMobile ? {
            position: 'fixed',
            left: '0',
            right: '0',
            bottom: '0',
            width: '100%',
            height: '4rem',
            zIndex: 100
          } : {
            position: 'fixed',
            left: '0',
            top: '0',
            width: '5rem',
            height: '100vh',
            zIndex: 10
          }}>
            <Sidebar />
          </div>

          {/* Contenido principal */}
          <div style={isMobile ? {
            marginLeft: 0,
            width: '100%',
            height: '100%',
            paddingBottom: '4rem',
            position: 'relative',
            minWidth: 0, // Allow content to shrink
            overflow: 'hidden' // Prevent content overflow
          } : {
            marginLeft: '5rem',
            width: 'calc(100% - 5rem)',
            height: '100%',
            position: 'relative',
            minWidth: 0, // Allow content to shrink
            overflow: 'hidden' // Prevent content overflow
          }}>
            <div style={{
              width: '100%',
              height: '100%',
              background: isDarkPage ? '#1a1d23' : '#f8f9fa',
              paddingTop: 52
            }}>
              <Routes>
                <Route path="/" element={<Navigate to="/control" replace />} />
                <Route path="/fm" element={<ProtectedRoute><FM isMobile={isMobile} /></ProtectedRoute>} />
                <Route path="/espais" element={<ProtectedRoute><Espais /></ProtectedRoute>} />
                <Route path="/control" element={<ProtectedRoute><ControlGeneral /></ProtectedRoute>} />
                <Route path="/edifici/:code" element={<ProtectedRoute><ControlModelViewer /></ProtectedRoute>} />
                <Route path="/modelo/:code" element={<ProtectedRoute><ControlModelViewer /></ProtectedRoute>} />
                <Route path="/projectes" element={<ProtectedRoute><Projectes /></ProtectedRoute>} />
                <Route path="/docs" element={<ProtectedRoute><Docs /></ProtectedRoute>} />
                <Route path="/consultes" element={<ProtectedRoute><Consultes /></ProtectedRoute>} />
                <Route path="/config" element={<ProtectedRoute><Config /></ProtectedRoute>} />
                <Route path="/actius-mobils" element={<ProtectedRoute><ActiusMobils /></ProtectedRoute>} />
                <Route path="/mensajes" element={<ProtectedRoute><Mensajes /></ProtectedRoute>} />
                <Route path="/notificaciones" element={<ProtectedRoute><Notificaciones /></ProtectedRoute>} />
                {/* También permitimos acceder al login desde aquí, por si se navega manualmente */}
                <Route path="/login" element={<LoginLanding />} />
              </Routes>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;