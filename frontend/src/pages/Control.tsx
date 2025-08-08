import React from 'react';
import './Pages.css';

const Control: React.FC = () => {
  return (
    <div className="page-container">
      <div className="page-header">
        <h1>Control</h1>
        <p>Panel de control del sistema</p>
      </div>
      <div className="page-content">
        <div className="content-card">
          <h2>Dashboard de Control</h2>
          <p>Aquí se mostrará el panel de control principal con métricas, alertas y estado del sistema.</p>
          
          <div className="control-grid">
            <div className="control-item">
              <h3>Estado del Sistema</h3>
              <div className="status-indicator online">Online</div>
            </div>
            <div className="control-item">
              <h3>Usuarios Activos</h3>
              <div className="metric">24</div>
            </div>
            <div className="control-item">
              <h3>Alertas</h3>
              <div className="metric alert">3</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Control;
