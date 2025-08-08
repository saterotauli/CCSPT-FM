import React from 'react';
import './Pages.css';

const Docs: React.FC = () => {
  return (
    <div className="page-container">
      <div className="page-header">
        <h1>Documentació</h1>
        <p>Gestión de documentos y archivos</p>
      </div>
      <div className="page-content">
        <div className="content-card">
          <h2>Biblioteca de Documentos</h2>
          <p>Accede a todos los documentos técnicos, planos y manuales.</p>
          
          <div className="docs-grid">
            <div className="doc-category">
              <h3>Planos Arquitectónicos</h3>
              <div className="doc-list">
                <div className="doc-item">
                  <span className="doc-icon">📐</span>
                  <span className="doc-name">Planta Baja - Rev. 03</span>
                  <span className="doc-date">15/07/2024</span>
                </div>
                <div className="doc-item">
                  <span className="doc-icon">📐</span>
                  <span className="doc-name">Primera Planta - Rev. 02</span>
                  <span className="doc-date">10/07/2024</span>
                </div>
              </div>
            </div>
            
            <div className="doc-category">
              <h3>Manuales Técnicos</h3>
              <div className="doc-list">
                <div className="doc-item">
                  <span className="doc-icon">📖</span>
                  <span className="doc-name">Manual HVAC Sistema A</span>
                  <span className="doc-date">01/06/2024</span>
                </div>
                <div className="doc-item">
                  <span className="doc-icon">📖</span>
                  <span className="doc-name">Manual Ascensores</span>
                  <span className="doc-date">20/05/2024</span>
                </div>
              </div>
            </div>
            
            <div className="doc-category">
              <h3>Certificaciones</h3>
              <div className="doc-list">
                <div className="doc-item">
                  <span className="doc-icon">🏆</span>
                  <span className="doc-name">Certificado Energético</span>
                  <span className="doc-date">12/08/2024</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Docs;
