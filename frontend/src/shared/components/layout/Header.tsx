import React, { useState } from 'react';
import './Header.css';

export const Header: React.FC = () => {
  const [selectedProject, setSelectedProject] = useState('hospital-tauli');

  const handleProjectChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedProject(event.target.value);
    // Aquí puedes agregar lógica para cambiar de proyecto
    console.log('Proyecto seleccionado:', event.target.value);
  };

  return (
    <header className="main-header">
      <div className="header-center">
        <select
          className="header-dropdown"
          value={selectedProject}
          onChange={handleProjectChange}
        >
          <option value="hospital-tauli">🏥 Hospital Taulí</option>
          <option value="edificio-norte">🏢 Edificio Norte</option>
          <option value="centro-investigacion">🔬 Centro Investigación</option>
          <option value="parking-principal">🚗 Parking Principal</option>
          <option value="residencia-medica">🏠 Residencia Médica</option>
        </select>
      </div>
    </header>
  );
};
