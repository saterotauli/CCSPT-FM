import React from 'react';
import './Pages.css';

const Consultes: React.FC = () => {
  return (
    <div className="page-container">
      <div className="page-header">
        <h1>Consultes</h1>
        <p>Sistema de consultas y reportes</p>
      </div>
      <div className="page-content">
        <div className="content-card">
          <h2>Centro de Consultas</h2>
          <p>Realiza consultas personalizadas y genera reportes del sistema.</p>
          
          <div className="queries-section">
            <div className="query-builder">
              <h3>Constructor de Consultas</h3>
              <div className="query-form">
                <div className="form-group">
                  <label>Tipo de consulta:</label>
                  <select className="query-select">
                    <option>Espacios por estado</option>
                    <option>Equipos por mantenimiento</option>
                    <option>Proyectos por fase</option>
                    <option>Documentos por categoría</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Filtros:</label>
                  <input type="text" placeholder="Introduce filtros..." className="query-input" />
                </div>
                <button className="query-button">Ejecutar Consulta</button>
              </div>
            </div>
            
            <div className="recent-queries">
              <h3>Consultas Recientes</h3>
              <div className="query-list">
                <div className="query-item">
                  <span className="query-name">Espacios disponibles - Planta 1</span>
                  <span className="query-date">Hoy, 14:30</span>
                </div>
                <div className="query-item">
                  <span className="query-name">Equipos pendientes mantenimiento</span>
                  <span className="query-date">Ayer, 16:45</span>
                </div>
                <div className="query-item">
                  <span className="query-name">Proyectos activos Q3</span>
                  <span className="query-date">03/08/2024</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Consultes;
