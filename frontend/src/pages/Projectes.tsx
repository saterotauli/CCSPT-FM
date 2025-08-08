import React from 'react';
import './Pages.css';

const Projectes: React.FC = () => {
  return (
    <div className="page-container">
      <div className="page-header">
        <h1>Projectes</h1>
        <p>Gestión de proyectos y obras</p>
      </div>
      <div className="page-content">
        <div className="content-card">
          <h2>Proyectos Activos</h2>
          <p>Administra todos los proyectos en curso y planificados.</p>
          
          <div className="projects-grid">
            <div className="project-item">
              <h3>Renovación Ala Norte</h3>
              <p>Fase: Ejecución</p>
              <div className="progress-bar">
                <div className="progress" style={{width: '75%'}}></div>
              </div>
              <span className="progress-text">75% completado</span>
            </div>
            <div className="project-item">
              <h3>Instalación HVAC</h3>
              <p>Fase: Planificación</p>
              <div className="progress-bar">
                <div className="progress" style={{width: '25%'}}></div>
              </div>
              <span className="progress-text">25% completado</span>
            </div>
            <div className="project-item">
              <h3>Modernización Ascensores</h3>
              <p>Fase: Diseño</p>
              <div className="progress-bar">
                <div className="progress" style={{width: '10%'}}></div>
              </div>
              <span className="progress-text">10% completado</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Projectes;
