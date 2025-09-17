import React from 'react';
import './Pages.css';
import ElementInfoPanel from '../components/ElementInfoPanel';

const Espais: React.FC = () => {
  const [search, setSearch] = React.useState('');
  const [onlyOpen, setOnlyOpen] = React.useState(true);

  return (
    <div className="page-container control-fullpage">
      <div className="page-content">
        <div className="content-card flat">
          {/* Toolbar alineada amb Control */}
          <div className="dash-toolbar" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div className="toolbar-left" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <h2 className="card-title" style={{ margin: 0 }}>Espais</h2>
            </div>
            <div className="toolbar-center" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <input
                className="search"
                placeholder="Cerca espais o actius..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              <button className={`btn ${onlyOpen ? 'active' : ''}`} onClick={() => setOnlyOpen(!onlyOpen)}>
                Només oberts
              </button>
            </div>
            <div className="toolbar-right" />
          </div>

          {/* Disseny a dues columnes com Control */}
          <div className="control-two-col">
            {/* Columna principal: panell de nivells/espais amb estètica Control */}
            <main className="main-content">
              <div className="left-panel">
                <div className="levels-panel">
                  <div className="levels-actions" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                    <button className="btn small">Mostrar tot</button>
                    <div style={{ color: '#6b7280', fontSize: '0.9rem' }}>{onlyOpen ? 'Filtre: oberts' : 'Tots'}</div>
                  </div>

                  <div className="floors-list">
                    {/* Grup PB */}
                    <div className="floor-group">
                      <div className="floor-title">
                        <button className="btn icon small">+</button>
                        <button className="btn link active">PB · Planta Baixa</button>
                      </div>
                      <div className="floor-spaces">
                        <div className="dept-item">
                          <div className="dept-name">Recepció</div>
                        </div>
                        <div className="dept-item">
                          <div className="dept-name">Sala d'espera</div>
                        </div>
                        <div className="dept-item">
                          <div className="dept-name">Oficines</div>
                        </div>
                      </div>
                    </div>

                    <div className="floor-separator" />

                    {/* Grup P01 */}
                    <div className="floor-group">
                      <div className="floor-title">
                        <button className="btn icon small">+</button>
                        <button className="btn link">P01 · Primera Planta</button>
                      </div>
                      <div className="floor-spaces">
                        <div className="dept-item">
                          <div className="dept-name">Aules</div>
                        </div>
                        <div className="dept-item">
                          <div className="dept-name">Sales de reunions</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </main>

            {/* Columna dreta: panell d'informació coherent amb Control */}
            <div className="alerts-panel right-panel" style={{ background: '#ffffff', border: '1px solid #e6ecf5', borderRadius: '0.9rem', padding: '1rem', display: 'flex', flexDirection: 'column' }}>
              <h3 style={{ margin: '0 0 0.5rem 0', color: '#0f172a' }}>Informació de l'element</h3>
              <ElementInfoPanel selectedElement={null} localId={null} isMobile={false} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Espais;
