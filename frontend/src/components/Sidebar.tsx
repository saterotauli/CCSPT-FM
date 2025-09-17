import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { sidebarItems, sidebarIcons } from '../globals';
import './Sidebar.css';
import '../pages/Pages.css';

export const Sidebar: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const [isMobile, setIsMobile] = React.useState<boolean>(false);

  React.useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth <= 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const handleSidebarItemClick = (route: string) => {
    navigate(route);
  };

  const itemsToRender = React.useMemo(() => {
    if (!isMobile) return sidebarItems;
    const allowed = new Set(['Espais', 'FM', 'Config']);
    return sidebarItems.filter((i) => allowed.has(i.label));
  }, [isMobile]);

  return (
    <div className="sidebar-container">
      {/* Logo cuadrado (oculto en móvil vía CSS) */}
      <div className="sidebar-logo">
        <img
          src="/assets/logo_tauli_quadrat_blanc.png"
          alt="Logo Taulí"
          className="logo-image"
        />
      </div>
      {/* Navigation buttons */}
      <div className="sidebar-main">
        {itemsToRender.map((item, index) => {
          const isActive = location.pathname === item.route;
          return (
            <button
              key={index}
              className={`sidebar-button ${isActive ? 'active' : ''}`}
              onClick={() => handleSidebarItemClick(item.route)}
              title={item.label}
            >
              <span className="sidebar-icon">
                {sidebarIcons[item.icon as keyof typeof sidebarIcons]}
              </span>
              <span className="sidebar-label">{item.label}</span>
            </button>
          );
        })}

      </div>
    </div>
  );
};
