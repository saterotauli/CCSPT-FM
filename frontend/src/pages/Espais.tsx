import React from 'react';
import './Pages.css';

const Espais: React.FC = () => {
  return (
    <div className="page-container">
      <div className="page-header">
        <h1>Espais</h1>
        <p>Gestión de espacios y ubicaciones</p>
      </div>
      <div className="page-content">
        <div className="content-card">
          <h2>Gestión de Espacios</h2>
          <p>Administra y visualiza todos los espacios del edificio.</p>
          
          <div className="spaces-grid">
            <div className="space-item">
              <h3>Planta Baja</h3>
              <p>15 espacios disponibles</p>
              <div className="space-status available">Disponible</div>
            </div>
            <div className="space-item">
              <h3>Primera Planta</h3>
              <p>12 espacios disponibles</p>
              <div className="space-status occupied">Ocupado</div>
            </div>
            <div className="space-item">
              <h3>Segunda Planta</h3>
              <p>8 espacios disponibles</p>
              <div className="space-status maintenance">Mantenimiento</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Espais;
