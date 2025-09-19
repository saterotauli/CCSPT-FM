import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Sidebar } from '@shared/components/layout/Sidebar';
import ControlGeneral from '@features/control/pages/ControlGeneral';
import ModelViewer from '@features/model-viewer/pages/ModelViewer';
import Projectes from '@features/projectes/pages/Projectes';
import Docs from '@features/docs/pages/Docs';
import Consultes from '@features/consultes/pages/Consultes';
import Config from '@features/config/pages/Config';
import ActiusMobils from '@features/actius-mobils/pages/ActiusMobils';
import FM from '@features/fm/pages/FM';
import Espais from '@features/espais/pages/Espais';
import '@styles/Pages.css';
import './style.css';

const App: React.FC = () => {

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

  // Theme: use light theme for all pages (FM matches Control aesthetics)
  const isDarkPage = false;

  return (
    <div className={`app ${isDarkPage ? 'dark-theme' : ''}`}>
      
      <div style={{ display: 'flex', width: '100%', height: '100vh' }}>
        {/* Sidebar siempre visible */}
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
            background: isDarkPage ? '#1a1d23' : '#f8f9fa'
          }}>
            <Routes>
              <Route path="/" element={<Navigate to={isMobile ? "/actius-mobils" : "/espais"} replace />} />
              <Route path="/fm" element={<FM isMobile={isMobile} />} />
              <Route path="/espais" element={<Espais />} />
              <Route path="/control" element={<ControlGeneral />} />
              <Route path="/edifici/:code" element={<ModelViewer />} />
              <Route path="/modelo/:code" element={<ModelViewer />} />
              <Route path="/projectes" element={<Projectes />} />
              <Route path="/docs" element={<Docs />} />
              <Route path="/consultes" element={<Consultes />} />
              <Route path="/config" element={<Config />} />
              <Route path="/actius-mobils" element={<ActiusMobils />} />
            </Routes>
          </div>
        </div>
      </div>
    </div>
  );
};

export default App;