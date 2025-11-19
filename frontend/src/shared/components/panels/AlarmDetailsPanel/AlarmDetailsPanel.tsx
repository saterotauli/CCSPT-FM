import React from 'react';
import { CodeBall } from '@shared/components/common';
import { MiniSpaceViewer } from '@modules/viewer/components';
import { SensorHistoryChart } from '@shared/components/charts';
import styles from './AlarmDetailsPanel.module.css';

export type AlarmTab = 'info' | 'historic' | 'sistemes';

interface AlarmDetailsPanelProps {
  visible: boolean;
  onClose: () => void;
  activeTab: AlarmTab;
  onTabChange: (tab: AlarmTab) => void;
  activeParameter: 'temperatura' | 'humitat' | 'ppm';
  onParameterChange?: (p: 'temperatura' | 'humitat' | 'ppm') => void;
  selectedSensor?: any;
  selectedElement?: any;
  sensorHistory: any[];
  buildingColor?: string;
  // Optional viewer overlay flag (we render floating, so default true)
  overlayInViewer?: boolean;
}

const InfoRow: React.FC<{ label: string; value?: React.ReactNode }>=({label, value}) => (
  <div style={{ display: 'flex', gap: 8, marginBottom: 8, alignItems: 'center' }}>
    <div style={{ width: 110, color: '#6b7280', fontSize: 13 }}>{label}</div>
    <div style={{ fontWeight: 600, color: '#111827', fontSize: 14 }}>{value ?? '-'}</div>
  </div>
);

const SeverityPill: React.FC<{ level?: 'ok'|'mitjà'|'alt' }>=({ level='ok' }) => {
  const map: Record<'ok'|'mitjà'|'alt', {label: string; bg: string; color: string; dot: string}> = {
    ok:    { label: 'Normal', bg: '#e8f5ff', color: '#0b6bcb', dot: '#3b82f6' },
    'mitjà': { label: 'Mitjà',  bg: '#fff4e5', color: '#a14b00', dot: '#f59e0b' },
    alt:   { label: 'Alerta', bg: '#ffe9ea', color: '#991b1b', dot: '#ef4444' },
  };
  const s = map[level];
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 10px', borderRadius: 999, background: s.bg, color: s.color, fontWeight: 600, fontSize: 12, border: '1px solid rgba(0,0,0,0.06)' }}>
      <span style={{ width: 8, height: 8, borderRadius: 999, background: s.dot }} />
      {s.label}
    </span>
  );
};

// Simple cache to avoid refetching the entire ifcspace table multiple times within the modal session
let IFCSPACE_CACHE: Array<{ guid?: string; codi?: string; edifici?: string; planta?: string; dispositiu?: string }> | null = null;
// Forced origin codi while backend linkage is pending
const FORCED_ORIGIN_CODI = 'UDI-P02-004';

const OriginInfo: React.FC<{ guid?: string; ubicacio?: string; fallbackEdifici?: string; fallbackPlanta?: string }>=({ guid, ubicacio, fallbackEdifici, fallbackPlanta }) => {
  const [resolved, setResolved] = React.useState<{ edifici?: string; planta?: string; dispositiu?: string } | null>(null);

  React.useEffect(() => {
    let disposed = false;
    const run = async () => {
      const code = String(ubicacio || '').trim();
      const guidKey = String(guid || '').trim();
      if (!code && !guidKey) {
        // No code, resolve to fallbacks immediately
        if (!disposed) setResolved({ edifici: fallbackEdifici, planta: fallbackPlanta, dispositiu: undefined });
        return;
      }
      // Start with parsed fallback for edifici/planta; dispositiu unknown until DB
      const parts = code ? code.split('-') : [] as any;
      const parsed = { edifici: parts[0] || fallbackEdifici, planta: parts[1] || fallbackPlanta } as any;

      // If we already have cache, resolve locally
      const resolveFromCache = () => {
        if (!IFCSPACE_CACHE) return false;
        let row: any | undefined;
        if (guidKey) row = IFCSPACE_CACHE.find((r) => String(r.guid).toUpperCase() === guidKey.toUpperCase());
        if (!row && code) row = IFCSPACE_CACHE.find((r) => String(r.codi).toUpperCase() === code.toUpperCase());
        if (row) {
          if (!disposed) setResolved({ edifici: row.edifici || parsed.edifici, planta: row.planta || parsed.planta, dispositiu: row.dispositiu });
          return true;
        }
        return false;
      };

      if (resolveFromCache()) return;

      try {
        // Fetch all ifcspace once and cache; then resolve by codi
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 2500);
        const resp = await fetch('/api/ifcspace', { headers: { Accept: 'application/json' }, signal: controller.signal }).catch(() => null as any);
        clearTimeout(timer);
        if (resp && resp.ok) {
          let data: any = null;
          try { data = await resp.json(); } catch {}
          if (Array.isArray(data)) {
            IFCSPACE_CACHE = data;
            if (resolveFromCache()) return;
          }
        }
      } catch {
        // ignore fetch errors entirely
      }

      // If still not found, keep parsed fallback
      if (!disposed && !resolved) setResolved({ edifici: parsed.edifici, planta: parsed.planta, dispositiu: undefined });
    };
    run();
    return () => { disposed = true; };
  }, [guid, ubicacio, fallbackEdifici, fallbackPlanta]);

  const ed = resolved?.edifici || '-';
  const pl = resolved?.planta || '-';
  const disp = resolved?.dispositiu || '-';
  return (
    <>
      <InfoRow label="Edifici" value={ed} />
      <InfoRow label="Planta" value={pl} />
      <InfoRow label="Dispositiu" value={disp} />
    </>
  );
};


const AlarmDetailsPanel: React.FC<AlarmDetailsPanelProps> = ({
  visible,
  onClose,
  activeTab,
  onTabChange,
  onParameterChange,
  activeParameter,
  selectedSensor,
  selectedElement,
  sensorHistory,
  buildingColor,
  overlayInViewer = true
}) => {
  // Suppress unused variable warning - overlayInViewer kept for API compatibility
  void overlayInViewer;

  // Param selector: allow parent-controlled or internal fallback
  const [internalParam, setInternalParam] = React.useState<'temperatura' | 'humitat' | 'ppm'>(activeParameter);

  // Resolve forced origin (UDI-P02-004) from ifcspace by codi and keep its guid/edifici/planta/dispositiu
  const [forcedOrigin, setForcedOrigin] = React.useState<{ guid?: string; edifici?: string; planta?: string; dispositiu?: string } | null>(null);
  React.useEffect(() => {
    let disposed = false;
    const tryResolve = () => {
      if (!IFCSPACE_CACHE) return false;
      const row = IFCSPACE_CACHE.find(r => String(r.codi).toUpperCase() === FORCED_ORIGIN_CODI.toUpperCase());
      if (row) { if (!disposed) setForcedOrigin({ guid: row.guid, edifici: row.edifici, planta: row.planta, dispositiu: row.dispositiu }); return true; }
      return false;
    };
    if (tryResolve()) return;
    (async () => {
      try {
        const controller = new AbortController();
        const to = setTimeout(() => controller.abort(), 2500);
        const resp = await fetch('/api/ifcspace', { headers: { Accept: 'application/json' }, signal: controller.signal }).catch(() => null as any);
        clearTimeout(to);
        if (resp && resp.ok) {
          const data = await resp.json();
          if (Array.isArray(data)) { IFCSPACE_CACHE = data; tryResolve(); }
        }
      } catch {}
    })();
    return () => { disposed = true; };
  }, []);
  const currentParam: 'temperatura' | 'humitat' | 'ppm' = onParameterChange ? activeParameter : internalParam;

  const title = selectedSensor?.dispositiu || selectedElement?.Name?.value || 'Detall de l\'Alarma';
  const buildingCode = selectedSensor?.edifici || selectedElement?.buildingCode;

  // Control de escala compartido con el gráfico
  const [timeScale, setTimeScale] = React.useState<'realtime' | 'hour' | 'day' | 'week' | 'month'>('realtime');
  // Sistemes: estado local para sistema activo y item seleccionado
  const [activeSystem, setActiveSystem] = React.useState<'HVAC'|'ELE'|'ILU'|'SAN'|'GAS'|'TEL'|'SEG'>('HVAC');
  const [selectedSystemItem, setSelectedSystemItem] = React.useState<any | null>(null);

  const header = (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
      {buildingCode && (
        <CodeBall code={buildingCode} color={buildingColor || '#9aa0a6'} size={44} title={`Edifici ${buildingCode}`} />
      )}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <div style={{ fontSize: 18, fontWeight: 800, color: '#111827', lineHeight: 1.2 }}>{title}</div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {selectedSensor?.planta && (
            <span className={`${styles.badge} ${styles.badgePlanta}`} title={`Planta ${selectedSensor.planta}`}>
              {selectedSensor.planta}
            </span>
          )}
          {(selectedSensor?.departament || selectedSensor?.espai || selectedElement?.Name?.value) && (
            <span className={`${styles.badge} ${styles.badgeDepartament}`} title="Departament">
              {selectedSensor?.departament || selectedSensor?.espai || selectedElement?.Name?.value}
            </span>
          )}
        </div>
      </div>
    </div>
  );

  return visible ? (
    <>
      {/* Backdrop */}
      <div 
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.5)',
          zIndex: 2147483646
        }}
        onClick={onClose}
      />
      
      {/* Modal */}
      <div
        role="dialog"
        aria-modal="true"
        style={{
          position: 'fixed',
          left: '50%',
          top: '50%',
          transform: 'translate(-50%, -50%)',
          width: 1200,
          maxWidth: 'calc(100% - 32px)',
          height: 900,
          maxHeight: 'calc(100% - 32px)',
          background: '#ffffff',
          borderRadius: 14,
          border: '1px solid #e5e7eb',
          boxShadow: '0 10px 25px rgba(0,0,0,0.15), 0 2px 6px rgba(0,0,0,0.08)',
          zIndex: 2147483647,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden'
        }}
      >
      {/* Header */}
      <div style={{ padding: 16, borderBottom: '1px solid #e5e7eb', background: '#f9fafb', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        {header}
        <button onClick={onClose} aria-label="Tancar" style={{ border: '1px solid #e5e7eb', background: 'white', padding: '6px 10px', borderRadius: 8, cursor: 'pointer' }}>✕</button>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 6, padding: '10px 12px', borderBottom: '1px solid #e5e7eb', background: '#fff' }}>
        <button onClick={() => onTabChange('info')} style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #e5e7eb', background: activeTab==='info' ? '#eef2ff' : '#ffffff', color: activeTab==='info' ? '#1e40af' : '#111827', fontWeight: 700, cursor: 'pointer' }}>Dades</button>
        <button onClick={() => onTabChange('historic')} style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #e5e7eb', background: activeTab==='historic' ? '#eef2ff' : '#ffffff', color: activeTab==='historic' ? '#1e40af' : '#111827', fontWeight: 700, cursor: 'pointer' }}>Sensors</button>
        <button onClick={() => onTabChange('sistemes')} style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #e5e7eb', background: activeTab==='sistemes' ? '#eef2ff' : '#ffffff', color: activeTab==='sistemes' ? '#1e40af' : '#111827', fontWeight: 700, cursor: 'pointer' }}>Sistemes</button>
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflow: 'auto', padding: 16 }}>
        {activeTab === 'info' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, height: '100%' }}>
            {/* Left side - Information */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <InfoRow label="Paràmetre" value={{temperatura:'Temperatura', humitat:'Humitat', ppm:'CO₂'}[currentParam]} />
                  <InfoRow label="Nivell" value={<SeverityPill level={selectedSensor?.severity || 'mitjà'} />} />
                  <InfoRow label="Valor" value={selectedSensor?.codi ? `${selectedSensor.codi}${currentParam==='ppm'?' ppm':currentParam==='humitat'?'%':'°C'}` : '-'} />
                  <InfoRow label="Hora" value={selectedSensor?.timestamp ? new Date(selectedSensor.timestamp).toLocaleString() : new Date().toLocaleString()} />
                  <InfoRow label="Edifici" value={selectedSensor?.edifici || '-'} />
                  <InfoRow label="Planta" value={selectedSensor?.planta || '-'} />
                  <InfoRow label="Departament" value={selectedSensor?.departament || '-'} />
                  <InfoRow label="Dispositiu" value={selectedSensor?.dispositiu || '-'} />
                </div>
              </div>
              
              {/* Footer actions */}
              <div style={{ marginTop: 'auto', display: 'flex', justifyContent: 'flex-end' }}>
                <button style={{ background: '#93c5fd', color: '#0b3a7e', padding: '10px 14px', fontWeight: 800, border: 'none', borderRadius: 10, cursor: 'pointer', opacity: 0.9 }}>
                  Aplicar Canvis
                </button>
              </div>
            </div>

            {/* Right side - Mini viewer (square) */}
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <div style={{ background: '#111827', borderRadius: 12, border: '1px solid #e5e7eb', overflow: 'hidden', width: '100%', height: 0, paddingBottom: '100%', position: 'relative' }}>
                <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}>
                {selectedSensor?.edifici ? (
                  <MiniSpaceViewer
                    buildingCode={selectedSensor.edifici}
                    spaceGuid={selectedSensor.spaceGuid}
                    severity={selectedSensor.severity || 'mitjà'}
                    paramType={activeParameter}
                    value={selectedSensor.value}
                    dispositiu={selectedSensor.dispositiu}
                    planta={selectedSensor.planta}
                    departament={selectedSensor.departament || selectedSensor.espai}
                  />
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color:'#f3f4f6' }}>
                    Vista prèvia de l\'espai
                  </div>
                )}
                </div>
              </div>
            </div>
          </div>
        )}
        {activeTab === 'historic' && (
          <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            {selectedSensor ? (
              <>
                {/* Selector de parámetro justo encima del contenedor de la gráfica */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '8px 12px',
                  marginBottom: 10
                }}>
                  {[
                    { key: 'temperatura', label: 'Temperatura', icon: '/assets/images/icons/control_temperatura.png' },
                    { key: 'humitat',     label: 'Humitat',     icon: '/assets/images/icons/control_humitat.png' },
                    { key: 'ppm',         label: 'CO₂',         icon: '/assets/images/icons/control_particules.png' },
                  ].map((p: any) => (
                    <button
                      key={p.key}
                      onClick={() => { if (onParameterChange) onParameterChange(p.key); else setInternalParam(p.key); }}
                      style={{
                        display: 'inline-flex', alignItems: 'center', gap: 8,
                        borderRadius: 8,
                        border: '1px solid #e5e7eb',
                        padding: '6px 10px',
                        background: currentParam === p.key ? '#eef2ff' : '#ffffff',
                        color: currentParam === p.key ? '#1e40af' : '#111827',
                        fontWeight: 700,
                        cursor: 'pointer'
                      }}
                      title={p.label}
                    >
                      <img src={p.icon} alt={p.label} style={{ width: 16, height: 16, objectFit: 'contain' }} />
                      <span style={{ fontSize: 12 }}>{p.label}</span>
                    </button>
                  ))}
                </div>

                {/* Gráfico integrado (llena el panel y mantiene controles) */}
                <div style={{
                  flex: 1,
                  background: '#fff',
                  border: '1px solid #e5e7eb',
                  borderRadius: 12,
                  padding: 0,
                  minHeight: 420,
                  maxHeight: 480,
                  display: 'flex'
                }}>
                  <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}>
                    {/* Header del gráfico: Severidad (izq) + Escala (dcha) */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', borderBottom: '1px solid #e5e7eb' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', background: '#f0f9ff', borderRadius: 8, border: '1px solid #0ea5e9' }}>
                          <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#0ea5e9' }}></div>
                          <span style={{ fontSize: 12, fontWeight: 600, color: '#0369a1' }}>Normal</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', background: '#fef3c7', borderRadius: 8, border: '1px solid #f59e0b' }}>
                          <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#f59e0b' }}></div>
                          <span style={{ fontSize: 12, fontWeight: 600, color: '#92400e' }}>Mitjà</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', background: '#fee2e2', borderRadius: 8, border: '1px solid #ef4444' }}>
                          <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#ef4444' }}></div>
                          <span style={{ fontSize: 12, fontWeight: 600, color: '#991b1b' }}>Alt</span>
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <span style={{ fontSize: 12, color: '#666' }}>Escala:</span>
                        {(['realtime', 'hour', 'day', 'week', 'month'] as const).map((scale) => (
                          <button
                            key={scale}
                            onClick={() => setTimeScale(scale)}
                            style={{
                              background: timeScale === scale ? '#4179b5' : '#e0e6ef',
                              color: timeScale === scale ? 'white' : '#333',
                              border: '1px solid rgba(0,0,0,0.08)',
                              borderRadius: 8,
                              padding: '6px 12px',
                              cursor: 'pointer',
                              fontSize: 12,
                              fontWeight: 700
                            }}
                          >
                            {scale === 'realtime' ? 'Temps real' :
                             scale === 'hour' ? 'Hores' : 
                             scale === 'day' ? 'Dies' : 
                             scale === 'week' ? 'Setmanes' : 'Mesos'}
                          </button>
                        ))}
                      </div>
                    </div>
                    {/* Contenido del gráfico */}
                    <div style={{ padding: 12, flex: 1, minHeight: 0 }}>
                      <SensorHistoryChart
                        data={sensorHistory}
                        deviceName={selectedSensor.dispositiu || 'Sensor'}
                        isVisible={true}
                        onClose={() => onTabChange('info')}
                        activeParameter={currentParam}
                        roomInfo={{
                          spaceGuid: selectedSensor.spaceGuid,
                          roomType: selectedSensor.roomType || selectedSensor.dispositiu,
                          planta: selectedSensor.planta,
                          departament: selectedSensor.departament,
                          edifici: selectedSensor.edifici,
                        }}
                        overlayInViewer={false}
                        hideTitle={true}
                        controlledTimeScale={timeScale}
                        onTimeScaleChange={setTimeScale}
                        hideInlineScaleControls={true}
                      />
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center', 
                height: '100%', 
                color: '#6b7280',
                fontSize: '16px'
              }}>
                No hi ha dades de sensor disponibles
              </div>
            )}
          </div>
        )}
        {activeTab === 'sistemes' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {/* Selector visual de sistemes (mismo estilo que parámetros) */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '8px 12px',
              marginBottom: 10
            }}>
              {([
                { key: 'HVAC', label: 'Clima', icon: '/assets/images/icons/HVAC.png' },
                { key: 'ELE', label: 'Elèctric', icon: '/assets/images/icons/ELE.png' },
                { key: 'ILU', label: 'Il·luminació', icon: '/assets/images/icons/ILU.png' },
                { key: 'SAN', label: 'Aigua', icon: '/assets/images/icons/SAN.png' },
                { key: 'GAS', label: 'Gas', icon: '/assets/images/icons/GAS.png' },
                { key: 'TEL', label: 'Comunicacions', icon: '/assets/images/icons/TEL.png' },
                { key: 'SEG', label: 'Accés', icon: '/assets/images/icons/SEG.png' },
              ] as const).map((s) => (
                <button
                  key={s.key}
                  onClick={() => { setActiveSystem(s.key); setSelectedSystemItem(null); }}
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: 8,
                    borderRadius: 8,
                    border: '1px solid #e5e7eb',
                    padding: '6px 10px',
                    background: activeSystem===s.key ? '#eef2ff' : '#ffffff',
                    color: activeSystem===s.key ? '#1e40af' : '#111827',
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                  title={s.label}
                >
                  <img src={s.icon} alt={s.label} style={{ width: 16, height: 16, objectFit: 'contain' }} />
                  <span style={{ fontSize: 12 }}>{s.label}</span>
                </button>
              ))}
            </div>

            {/* Vista dividida: listado izquierda + mini visor derecha */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, alignItems: 'stretch' }}>
              {/* Lista de items por sistema (agrupado) */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxHeight: '550px', overflowY: 'auto', paddingRight: '8px' }}>
                {(() => {
                  // Datos mock por sistema (ubicación fija UDI-P02-004)
                  const commonLoc = { edifici: 'UDI', planta: 'P02', dispositiu: '004' };
                  type SysItem = { id: string; tipo: string; sistema: string; maquina: string; ubicacio: string } & typeof commonLoc;
                  const rawBySystem: Record<string, SysItem[]> = {
                    HVAC: [
                      // 4 sistemas distintos en Clima (conductes e hidrònic)
                      { id: 'hvac-imp-1', tipo: 'Terminal impulsió', sistema: 'CSPT-HVAC-AireImpulsio', maquina: 'UTA-UDI-02', ubicacio: 'UDI-P02-004', ...commonLoc },
                      { id: 'hvac-imp-2', tipo: 'Terminal impulsió', sistema: 'CSPT-HVAC-AireImpulsio', maquina: 'UTA-UDI-02', ubicacio: 'UDI-P02-004', ...commonLoc },
                      { id: 'hvac-ret-1', tipo: 'Retorn',            sistema: 'CSPT-HVAC-AireRetorn',   maquina: 'UTA-UDI-02', ubicacio: 'UDI-P02-004', ...commonLoc },
                      { id: 'hvac-hf-1',  tipo: 'Terminal hidrònic', sistema: 'CSPT-HVAC-SubministramentHidronicFred',  maquina: 'UT-REF-01', ubicacio: 'UDI-P02-004', ...commonLoc },
                      { id: 'hvac-hc-1',  tipo: 'Terminal hidrònic', sistema: 'CSPT-HVAC-SubministramentHidronicCalent',maquina: 'Caldera-01', ubicacio: 'UDI-P02-004', ...commonLoc },
                    ],
                    ELE: [
                      { id: 'ele-1', tipo: 'Circuit', sistema: 'QG-UDI-P02', maquina: 'Magneto C10', ubicacio: 'UDI-P02-004', ...commonLoc },
                    ],
                    ILU: [
                      { id: 'ilu-1', tipo: 'Panell', sistema: 'L-UDI-P02-ILU-03', maquina: 'Driver DALI', ubicacio: 'UDI-P02-004', ...commonLoc },
                      { id: 'ilu-2', tipo: 'Panell', sistema: 'L-UDI-P02-ILU-03', maquina: 'Driver DALI', ubicacio: 'UDI-P02-004', ...commonLoc },
                    ],
                    SAN: [
                      { id: 'san-1', tipo: 'Punt d\'aigua', sistema: 'AIG-UDI-RED-FRED', maquina: 'Vàlvula', ubicacio: 'UDI-P02-004', ...commonLoc },
                    ],
                    GAS: [
                      { id: 'gas-1', tipo: 'Punt de gas', sistema: 'GAS-MED-UDI', maquina: 'Vàlvula reducció', ubicacio: 'UDI-P02-004', ...commonLoc },
                    ],
                    TEL: [
                      { id: 'tel-1', tipo: 'Punt xarxa', sistema: 'LAN-UDI-SW24', maquina: 'Switch 24p', ubicacio: 'UDI-P02-004', ...commonLoc },
                    ],
                    SEG: [
                      { id: 'seg-1', tipo: 'Porta', sistema: 'ACS-UDI-01', maquina: 'Lectura MIFARE', ubicacio: 'UDI-P02-004', ...commonLoc },
                    ],
                  };
                  const items = rawBySystem[activeSystem] || [];
                  // Agrupar por sistema
                  const groups: Array<{ sistema: string; maquina: string; ubicacio: string; counts: Array<{ tipo: string; count: number }>; desc: string; color: string }> = (() => {
                    if (!items.length) return [];
                    const bySys = new Map<string, SysItem[]>();
                    for (const it of items) {
                      const arr = bySys.get(it.sistema) || [];
                      arr.push(it);
                      bySys.set(it.sistema, arr);
                    }
                    const result: Array<{ sistema: string; maquina: string; ubicacio: string; counts: Array<{ tipo: string; count: number }>; desc: string; color: string }> = [];
                    for (const [sys, arr] of bySys) {
                      // contar por tipo
                      const typeCounts = new Map<string, number>();
                      for (const it of arr) typeCounts.set(it.tipo, (typeCounts.get(it.tipo) || 0) + 1);
                      // MOCK: descripción y color por sistema (inspirado en hoja de ejemplo)
                      const mockMeta: Record<string, { desc: string; color: string }> = {
                        'CSPT-HVAC-AireImpulsio': { desc: 'Impulsió d\'aire', color: '#0091FF' },
                        'CSPT-HVAC-AireRetorn': { desc: 'Retorn d\'aire', color: '#00FF7F' },
                        'CSPT-HVAC-SubministramentHidronicFred': { desc: 'Subministrament hídronic fred', color: '#00B7FF' },
                        'CSPT-HVAC-SubministramentHidronicCalent': { desc: 'Subministrament hídronic calent', color: '#FF3F3F' },
                        'QG-UDI-P02': { desc: 'Circuit il·luminació', color: '#FF3F3F' },
                        'L-UDI-P02-ILU-03': { desc: 'Subministrament il·luminació', color: '#0ED1FF' },
                        'AIG-UDI-RED-FRED': { desc: 'Subministrament hídronic fred', color: '#00B7FF' },
                        'GAS-MED-UDI': { desc: 'Volum refrigerant variable gas', color: '#FF5FBF' },
                        'LAN-UDI-SW24': { desc: 'Xarxa comunicacions', color: '#6B7280' },
                        'ACS-UDI-01': { desc: 'Control d\'accés', color: '#10B981' },
                      };
                      const meta = mockMeta[sys] || { desc: '', color: '#E5E7EB' };
                      result.push({
                        sistema: sys,
                        maquina: arr[0]?.maquina || '-',
                        ubicacio: arr[0]?.ubicacio || 'UDI-P02-004',
                        counts: Array.from(typeCounts.entries()).map(([tipo, count]) => ({ tipo, count })),
                        desc: meta.desc,
                        color: meta.color,
                      });
                    }
                    return result;
                  })();
                  if (!items.length) return (
                    <div style={{ border: '1px dashed #e5e7eb', borderRadius: 12, padding: 16, color: '#6b7280' }}>
                      No hi ha elements en aquest sistema.
                    </div>
                  );
                  return (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {groups.map((g, idx) => (
                        <button
                          key={`${g.sistema}-${idx}`}
                          onClick={() => setSelectedSystemItem({ sistema: g.sistema, maquina: g.maquina, ubicacio: g.ubicacio, edifici: selectedSensor?.edifici || commonLoc.edifici, planta: commonLoc.planta, dispositiu: commonLoc.dispositiu })}
                          style={{
                            textAlign: 'left',
                            width: '100%',
                            borderRadius: 12,
                            border: '1px solid #e5e7eb',
                            padding: 12,
                            background: selectedSystemItem?.sistema===g.sistema ? '#f0f7ff' : undefined,
                            cursor: 'pointer'
                          }}
                          className="sistemes-item"
                          title={`${g.sistema}`}
                        >
                          {/* Top row: pill with system name + colored badge with type/desc */}
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                            <span style={{
                              display: 'inline-flex', alignItems: 'center',
                              padding: '4px 10px', borderRadius: 9999,
                              background: '#f3f4f6', color: '#111827', fontWeight: 800,
                              border: '1px solid #e5e7eb', fontSize: 13
                            }}>{g.sistema}</span>
                            {g.desc && (
                              <span style={{
                                display: 'inline-flex', alignItems: 'center',
                                padding: '4px 10px', borderRadius: 9999,
                                background: `${g.color}20`, border: `1px solid ${g.color}60`,
                                color: '#111827', fontWeight: 700, fontSize: 12
                              }}>{g.desc}</span>
                            )}
                          </div>
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 6 }}>
                            <div style={{ gridColumn: '1 / -1' }}>
                              <div className="origin-group">
                                <div className="origin-group-title">Origen</div>
                                <div className="origin-group-content">
                                  <InfoRow label="Equip" value={g.maquina} />
                                  <OriginInfo guid={forcedOrigin?.guid} ubicacio={FORCED_ORIGIN_CODI} fallbackEdifici={forcedOrigin?.edifici} fallbackPlanta={forcedOrigin?.planta} />
                                </div>
                              </div>
                            </div>
                            <div style={{ gridColumn: '1 / -1' }}>
                              <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 4 }}>Elements al sistema</div>
                              <ul style={{ margin: 0, paddingLeft: 16 }}>
                                {g.counts.map((c) => (
                                  <li key={`${g.sistema}-${c.tipo}`} style={{ fontSize: 13, color: '#111827' }}>
                                    {c.tipo}: <strong>{c.count}</strong>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  );
                })()}
              </div>

              {/* Mini visor a la dreta: placeholder con grid hasta que se seleccione un sistema */}
              <div style={{ background: '#111827', borderRadius: 12, border: '1px solid #e5e7eb', overflow: 'hidden', width: '100%', height: 0, paddingBottom: '100%', position: 'relative' }}>
                <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}>
                {!selectedSystemItem ? (
                  <div
                    style={{
                      width: '100%', height: '100%',
                      backgroundImage: 'linear-gradient(#152032 1px, transparent 1px), linear-gradient(90deg, #152032 1px, transparent 1px)',
                      backgroundSize: '24px 24px, 24px 24px',
                      backgroundPosition: 'center center'
                    }}
                    title="Selecciona un sistema per carregar la vista 3D"
                  />
                ) : (
                  <MiniSpaceViewer
                    buildingCode={selectedSensor?.edifici || 'UDI'}
                    spaceGuid={selectedSensor?.spaceGuid}
                    severity={'alt'}
                    paramType={activeParameter}
                    value={0}
                    dispositiu={selectedSystemItem?.dispositiu || '004'}
                    planta={undefined}
                    departament={undefined}
                    supplierLocationHint={FORCED_ORIGIN_CODI}
                    supplierGuid={forcedOrigin?.guid}
                    supplierBuildingCode={forcedOrigin?.edifici || 'UDI'}
                  />
                )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
      </div>
    </>
  ) : null;
};

export default AlarmDetailsPanel;
