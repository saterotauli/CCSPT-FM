import React from 'react';
import './Pages.css';

const Config: React.FC = () => {
  return (
    <div className="page-container">
      <div className="page-header">
        <h1>Configuració</h1>
        <p>Configuración del sistema y preferencias</p>
      </div>
      <div className="page-content">
        <div className="content-card">
          <h2>Configuración General</h2>
          <p>Ajusta las preferencias y configuraciones del sistema.</p>
          
          <div className="config-sections">
            <div className="config-section">
              <h3>Preferencias de Usuario</h3>
              <div className="config-item">
                <label>Idioma:</label>
                <select className="config-select">
                  <option>Català</option>
                  <option>Español</option>
                  <option>English</option>
                </select>
              </div>
              <div className="config-item">
                <label>Tema:</label>
                <select className="config-select">
                  <option>Claro</option>
                  <option>Oscuro</option>
                  <option>Automático</option>
                </select>
              </div>
            </div>
            
            <div className="config-section">
              <h3>Configuración del Sistema</h3>
              <div className="config-item">
                <label>Frecuencia de actualización:</label>
                <select className="config-select">
                  <option>Tiempo real</option>
                  <option>Cada 5 minutos</option>
                  <option>Cada 15 minutos</option>
                  <option>Manual</option>
                </select>
              </div>
              <div className="config-item">
                <label>Notificaciones:</label>
                <div className="checkbox-group">
                  <label><input type="checkbox" defaultChecked /> Alertas del sistema</label>
                  <label><input type="checkbox" defaultChecked /> Actualizaciones de proyectos</label>
                  <label><input type="checkbox" /> Recordatorios de mantenimiento</label>
                </div>
              </div>
            </div>
            
            <div className="config-section">
              <h3>Configuración BIM</h3>
              <div className="config-item">
                <label>Calidad de renderizado:</label>
                <select className="config-select">
                  <option>Alta</option>
                  <option>Media</option>
                  <option>Baja</option>
                </select>
              </div>
              <div className="config-item">
                <label>Unidades:</label>
                <select className="config-select">
                  <option>Metros</option>
                  <option>Centímetros</option>
                  <option>Milímetros</option>
                </select>
              </div>
            </div>
          </div>
          
          <div className="config-actions">
            <button className="config-button primary">Guardar Cambios</button>
            <button className="config-button secondary">Restaurar Predeterminados</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Config;
