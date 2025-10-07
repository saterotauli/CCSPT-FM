import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { sidebarItems, sidebarIcons } from '../../../../globals';
import styles from './Sidebar.module.css';
import '@styles/Pages.css';

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
    const allowed = new Set(['Espais', 'FM', 'Config', 'Actius mòbils']);
    return sidebarItems.filter((i) => allowed.has(i.label));
  }, [isMobile]);

  return (
    <div className={styles.sidebarContainer}>
      {/* Logo cuadrado (oculto en móvil vía CSS) */}
      <div className={styles.sidebarLogo}>
        <img
          src="/assets/images/logos/logo_tauli_quadrat_blanc.png"
          alt="Logo Taulí"
          className={styles.logoImage}
        />
      </div>
      {/* Navigation buttons */}
      <div className={styles.sidebarMain}>
        {itemsToRender.map((item, index) => {
          const isActive = location.pathname === item.route;
          return (
            <button
              key={index}
              className={`${styles.sidebarButton} ${isActive ? styles.active : ''}`}
              onClick={() => handleSidebarItemClick(item.route)}
              title={item.label}
            >
              <span className={styles.sidebarIcon}>
                {sidebarIcons[item.icon as keyof typeof sidebarIcons]}
              </span>
              <span className={styles.sidebarLabel}>{item.label}</span>
            </button>
          );
        })}

      </div>
    </div>
  );
};

export default Sidebar;
