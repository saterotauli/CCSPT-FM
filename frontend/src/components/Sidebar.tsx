import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { sidebarItems, sidebarIcons } from '../globals';
import './Sidebar.css';
import '../pages/Pages.css';

export const Sidebar: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const handleSidebarItemClick = (route: string) => {
    navigate(route);
  };





  return (
    <div className="sidebar-container">
      {/* Logo cuadrado */}
      <div className="sidebar-logo">
        <img
          src="/assets/logo_tauli_quadrat_blanc.png"
          alt="Logo Taulí"
          className="logo-image"
        />
      </div>
      {/* Navigation buttons */}
      <div className="sidebar-main">
        {sidebarItems.map((item, index) => {
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
