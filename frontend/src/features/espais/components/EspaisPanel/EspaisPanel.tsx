import React from 'react';
import { CodeBall } from '@shared/components/common';
import styles from './EspaisPanel.module.css';

interface EspaisItem {
  guid?: string;
  departament?: string;
  dispositiu?: string;
  edifici?: string;
  planta?: string;
  zona?: string;
  total_area?: number;
  element_count?: number;
  tipo_coincidencia?: 'departament' | 'dispositiu' | string;
}

/**
 * Información básica de un edificio desde la base de datos
 */
interface BuildingRow {
  /** GUID único del edificio */
  guid?: string;
  /** Nombre del edificio */
  nom?: string;
  /** Código del edificio */
  codi?: string;
  /** Color asociado al edificio */
  color?: string;
}

const EspaisPanel: React.FC = () => {
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | undefined>(undefined);
  const [searchQuery, setSearchQuery] = React.useState('');
  const [showCodi, setShowCodi] = React.useState(false);
  const [showCentreCost, setShowCentreCost] = React.useState(false);
  const [showArea, setShowArea] = React.useState(false);
  const [items, setItems] = React.useState<EspaisItem[]>([]);
  const [buildings, setBuildings] = React.useState<BuildingRow[]>([]);

  // Fetch buildings for color mapping (try two endpoints for robustness)
  React.useEffect(() => {
    const fetchBuildings = async () => {
      try {
        let data: BuildingRow[] | undefined;
        // Primary endpoint
        try {
          const resp = await fetch('/api/edificis', { headers: { Accept: 'application/json' } });
          if (resp.ok) {
            const buildingsData: BuildingRow[] = await resp.json();
            if (Array.isArray(buildingsData) && buildingsData.length) data = buildingsData;
          }
        } catch {}

        // Fallback endpoint if primary failed or empty
        if (!data || data.length === 0) {
          try {
            const resp2 = await fetch('/api/ifcbuildings', { headers: { Accept: 'application/json' } });
            if (resp2.ok) {
              const buildingsData2: BuildingRow[] = await resp2.json();
              if (Array.isArray(buildingsData2)) data = buildingsData2;
            }
          } catch {}
        }

        setBuildings(Array.isArray(data) ? data : []);
      } catch (e) {
        console.error('[EspaisPanel] Error fetching buildings:', e);
      }
    };
    fetchBuildings();
  }, []);

  /**
   * Obtiene el color asociado a un edificio con matching robusto
   * - Igualdad exacta por código o nombre (case-insensitive)
   * - startsWith para códigos como "UDI" vs "UDIAT"
   * - includes en nombre para coincidencias parciales
   * Si no encuentra, mantiene un fallback a gris.
   */
  const getBuildingColor = (buildingCode: string): string => {
    if (!buildingCode) return '#9aa0a6';

    const code = (buildingCode || '').toString().trim().toUpperCase();
    const match = buildings.find((b) => {
      const codi = (b.codi || '').toString().trim().toUpperCase();
      const nom = (b.nom || '').toString().trim().toUpperCase();

      // Coincidencia exacta por código o nombre
      if (codi === code || nom === code) return true;
      // Códigos abreviados que son prefijo del código largo (p.ej. UDI vs UDIAT)
      if (codi.startsWith(code)) return true;
      // Nombre que contiene el código
      if (nom.includes(code)) return true;
      return false;
    });

    return match?.color || '#9aa0a6';
  };

  const fetchItems = React.useCallback(async () => {
    const q = searchQuery.trim();
    if (q.length < 2) {
      setItems([]);
      return;
    }
    try {
      setLoading(true);
      setError(undefined);
      const resp = await fetch(`/api/ifcspace/search-all?query=${encodeURIComponent(q)}`, { headers: { Accept: 'application/json' } });
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const results: EspaisItem[] = await resp.json();
      setItems(Array.isArray(results) ? results : []);
    } catch (e: any) {
      console.error('[EspaisPanel] fetch error', e);
      setError(e?.message || 'Error al cercar espais');
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [searchQuery]);

  React.useEffect(() => {
    const id = setTimeout(fetchItems, 300);
    return () => clearTimeout(id);
  }, [fetchItems]);

  const onClick = (item: EspaisItem) => {
    const building = item.edifici;
    const floor = item.planta;
    if (item.tipo_coincidencia === 'departament' || (!item.guid && item.departament)) {
      window.dispatchEvent(new CustomEvent('espais:focus-department', {
        detail: { department: item.departament, building, floor },
      } as any));
    } else if (item.guid) {
      window.dispatchEvent(new CustomEvent('espais:focus-device', {
        detail: { guid: item.guid, name: item.dispositiu || item.departament || 'Element', building, floor },
      } as any));
    }
  };

  const onClearIsolation = () => {
    window.dispatchEvent(new CustomEvent('espais:clear-isolation'));
  };

  // Notify EspaisViewer when marker options change
  React.useEffect(() => {
    window.dispatchEvent(new CustomEvent('espais:marker-options-changed', {
      detail: { showCodi, showCentreCost, showArea }
    }));
  }, [showCodi, showCentreCost, showArea]);

  const title = `Espais (${items.length})`;

  return (
    <aside className={styles.espaisPanel}>
      <div className={styles.espaisTitle}>{title}</div>
      
      {loading && (
        <div style={{ padding: '2rem', textAlign: 'center', color: '#6b7280' }}>
          <div>Cargando...</div>
        </div>
      )}
      
      {error && (
        <div style={{ padding: '1rem', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 6, color: '#dc2626', marginBottom: 12 }}>
          {error}
        </div>
      )}
      
      {!loading && !error && (
        <>
          <div style={{ marginBottom: 12 }}>
        <input
          type="text"
          placeholder="Cerca departaments o dispositius..."
          value={searchQuery}
          onChange={(e) => setSearchQuery((e.target as HTMLInputElement).value)}
          style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: 6, backgroundColor: '#ffffff', color: '#111827', fontSize: 14 }}
        />
      </div>

      <div style={{ marginBottom: 12 }}>
        <button
          onClick={onClearIsolation}
          style={{
            width: '100%',
            padding: '8px 12px',
            border: '1px solid #e5e7eb',
            borderRadius: 6,
            backgroundColor: '#f9fafb',
            color: '#374151',
            fontSize: 14,
            cursor: 'pointer',
            transition: 'all 0.2s ease'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = '#f3f4f6';
            e.currentTarget.style.borderColor = '#d1d5db';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = '#f9fafb';
            e.currentTarget.style.borderColor = '#e5e7eb';
          }}
        >
          🏢 Mostrar Tot
        </button>
      </div>

      <div style={{ marginBottom: 12, padding: '12px', border: '1px solid #e5e7eb', borderRadius: 6, backgroundColor: '#f9fafb' }}>
        <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 8, color: '#374151' }}>
          Informació adicional en markers:
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#374151', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={showCodi}
              onChange={(e) => setShowCodi(e.target.checked)}
              style={{ margin: 0 }}
            />
            Mostrar codi
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#374151', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={showCentreCost}
              onChange={(e) => setShowCentreCost(e.target.checked)}
              style={{ margin: 0 }}
            />
            Mostrar centre de cost
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#374151', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={showArea}
              onChange={(e) => setShowArea(e.target.checked)}
              style={{ margin: 0 }}
            />
            Mostrar àrea
          </label>
        </div>
      </div>

      <div className={styles.espaisList}>
        {items.map((it, idx) => {
          const type = it.tipo_coincidencia || (it.guid ? 'dispositiu' : 'departament');
          const buildingColor = getBuildingColor(it.edifici || '');
          return (
            <div 
              key={`${it.guid || it.departament || 'dep'}-${idx}`} 
              className={`${styles.espaisItem} ${styles.clickable}`}
              onClick={() => onClick(it)}
            >
              <div className={styles.left}>
                {it.edifici && (
                  <CodeBall code={it.edifici} color={buildingColor} title={`Edificio ${it.edifici}`} />
                )}
                <div className={styles.espaisItemDetails}>
                  <div className={styles.detailRow}>
                    <span className={styles.mainText}>
                      {type === 'departament' ? (it.departament || '-') : (it.dispositiu || '-')}
                    </span>
                  </div>
                  <div className={styles.detailRow}>
                    <span className={`${styles.badge} ${styles.badgePlanta}`}>
                      {it.planta || 'P00'}
                    </span>
                    {type === 'dispositiu' && it.departament && (
                      <span className={`${styles.badge} ${styles.badgeDepartament}`}>
                        {it.departament}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <div className={styles.right}>
                <div className={styles.typeIndicator}>
                  <span className={`${styles.typeBadge} ${styles[`type${type.charAt(0).toUpperCase() + type.slice(1)}`]}`}>
                    {type === 'departament' ? 'DEPT' : 'DISP'}
                  </span>
                </div>
              </div>
            </div>
          );
        })}

        {items.length === 0 && !loading && searchQuery.trim().length >= 2 && (
          <div className={styles.emptyState}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>📦</div>
            <p style={{ margin: 0, fontSize: 14 }}>No s'han trobat resultats</p>
          </div>
        )}
        {items.length === 0 && !loading && searchQuery.trim().length < 2 && (
          <div className={styles.emptyState}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>🎧</div>
            <p style={{ margin: 0, fontSize: 14 }}>Escriu almenys 2 caràcters per buscar</p>
          </div>
        )}
      </div>
        </>
      )}
    </aside>
  );
};

export default EspaisPanel;
