import React from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { Sidebar } from './components/Sidebar';
import BIMViewer from './components/BIMViewer';
import ControlGeneral from './pages/ControlGeneral';
import ModelViewer from './pages/ModelViewer';
import Projectes from './pages/Projectes';
import Docs from './pages/Docs';
import Consultes from './pages/Consultes';
import Config from './pages/Config';
import './pages/Pages.css';
import './style.css';

const App: React.FC = () => {
  const location = useLocation();

  // Responsive: detect mobile for layout adjustments (sidebar at bottom)
  const [isMobile, setIsMobile] = React.useState<boolean>(false);
  React.useEffect(() => {
    const check = () => setIsMobile(window.innerWidth <= 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  // Inicializar y mostrar BIM cuando estemos en /fm o /espais (replicar FM en Espais)
  const isBimPage = location.pathname === '/fm' || location.pathname === '/espais';
  // Páginas con apariencia oscura tipo FM
  const isDarkPage = isBimPage;

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
          {/* BIM cuando estamos en /fm o /espais */}
          {isBimPage && (
            <BIMViewer isMobile={isMobile} />
          )}

          {/* Router para páginas no-BIM */}
          {!isBimPage && (
            <div style={{
              width: '100%',
              height: '100%',
              background: isDarkPage ? '#1a1d23' : '#f8f9fa'
            }}>
              <Routes>
                <Route path="/" element={<Navigate to="/espais" replace />} />
                <Route path="/control" element={<ControlGeneral />} />
                <Route path="/edifici/:code" element={<ModelViewer />} />
                <Route path="/modelo/:code" element={<ModelViewer />} />
                <Route path="/projectes" element={<Projectes />} />
                <Route path="/docs" element={<Docs />} />
                <Route path="/consultes" element={<Consultes />} />
                <Route path="/config" element={<Config />} />
              </Routes>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default App;