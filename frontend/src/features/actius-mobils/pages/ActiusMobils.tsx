import React, { useEffect, useMemo, useState } from 'react';

interface MobileAsset {
  id: string;
  label?: string;
  lat: number;
  lng: number;
  accuracy?: number;
  updatedAt: string; // ISO
}

const ActiusMobils: React.FC = () => {
  const [myId, setMyId] = useState<string>(() => {
    // Basic persistent id per browser
    const key = 'ccspt:mobiles:myId';
    const existing = localStorage.getItem(key);
    if (existing) return existing;
    const gen = `user-${Math.random().toString(36).slice(2, 10)}`;
    localStorage.setItem(key, gen);
    return gen;
  });
  const [myLabel, setMyLabel] = useState<string>(() => localStorage.getItem('ccspt:mobiles:myLabel') || '');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [assets, setAssets] = useState<MobileAsset[]>([]);
  const [pollMs, setPollMs] = useState<number>(8000);
  const [isMobile, setIsMobile] = useState<boolean>(() => {
    try { return window.innerWidth <= 768; } catch { return false; }
  });
  const [autoSend, setAutoSend] = useState<boolean>(false);

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  useEffect(() => {
    const t = setInterval(() => refreshList(), pollMs);
    refreshList();
    return () => clearInterval(t);
  }, [pollMs]);

  const apiBase = useMemo(() => '/api/mobile-assets', []);

  const refreshList = async () => {
    try {
      const r = await fetch(apiBase, { headers: { Accept: 'application/json' } });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const list: MobileAsset[] = await r.json();
      setAssets(list);
    } catch (e: any) {
      setError(e?.message || String(e));
      setTimeout(() => setError(null), 4000);
    }
  };

  // Silent sender for background auto-send (doesn't toggle UI state)
  const sendMyPositionSilent = () => {
    if (!('geolocation' in navigator)) return;
    navigator.geolocation.getCurrentPosition(async (pos) => {
      try {
        const body = {
          id: myId,
          label: myLabel && myLabel.trim().length ? myLabel.trim() : undefined,
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
        };
        await fetch(apiBase, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
          body: JSON.stringify(body),
        });
        // Do not set sending; just refresh list after
        refreshList();
      } catch {}
    }, () => {}, { enableHighAccuracy: true, timeout: 8000, maximumAge: 0 });
  };

  // Auto-send effect tied to autoSend and pollMs
  useEffect(() => {
    if (!autoSend) return;
    const t = setInterval(() => sendMyPositionSilent(), pollMs);
    // fire once immediately so the first update llega rápido
    sendMyPositionSilent();
    return () => clearInterval(t);
  }, [autoSend, pollMs, myId, myLabel]);

  const sendMyPosition = () => {
    if (!('geolocation' in navigator)) {
      setError('Aquest dispositiu no té geolocalització');
      setTimeout(() => setError(null), 4000);
      return;
    }
    setSending(true);
    navigator.geolocation.getCurrentPosition(async (pos) => {
      try {
        const body = {
          id: myId,
          label: myLabel && myLabel.trim().length ? myLabel.trim() : undefined,
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
        };
        const r = await fetch(apiBase, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
          body: JSON.stringify(body),
        });
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        await refreshList();
      } catch (e: any) {
        setError(e?.message || String(e));
        setTimeout(() => setError(null), 4000);
      } finally {
        setSending(false);
      }
    }, (err) => {
      setError(err?.message || 'Error de geolocalització');
      setSending(false);
      setTimeout(() => setError(null), 4000);
    }, { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 });
  };

  useEffect(() => {
    localStorage.setItem('ccspt:mobiles:myLabel', myLabel || '');
  }, [myLabel]);

  const formatTime = (iso: string) => {
    try { return new Date(iso).toLocaleTimeString('ca-ES', { hour12: false }); } catch { return iso; }
  };

  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', paddingBottom: isMobile ? '4rem' : 0 }}>
      {/* Header */}
      <div style={{ padding: isMobile ? '12px 14px' : '16px 20px', background: '#fff', borderBottom: '1px solid #e6ecf5' }}>
        <h2 style={{ margin: 0, fontSize: isMobile ? 18 : 22 }}>Actius mòbils</h2>
        <p style={{ margin: '6px 0 0 0', color: '#6b7280', fontSize: isMobile ? 12 : 14 }}>Envia la posició del teu mòbil i visualitza totes les posicions registrades</p>
      </div>

      {/* Controls */}
      <div style={{ 
        display: 'flex', 
        flexDirection: isMobile ? 'column' : 'row', 
        gap: isMobile ? 10 : 12, 
        alignItems: isMobile ? 'stretch' : 'center', 
        padding: isMobile ? 12 : 16, 
        background: '#f8fafc', 
        borderBottom: '1px solid #e6ecf5' 
      }}>
        <label style={{ display: 'flex', flexDirection: 'column', fontSize: 12, color: '#374151' }}>
          Identificador (id)
          <input 
            value={myId} 
            onChange={(e) => setMyId(e.target.value)} 
            style={{ padding: isMobile ? 12 : 8, border: '1px solid #d1d5db', borderRadius: 10, minWidth: isMobile ? '100%' : 220, fontSize: isMobile ? 16 : 14 }} 
          />
        </label>
        <label style={{ display: 'flex', flexDirection: 'column', fontSize: 12, color: '#374151' }}>
          Etiqueta (opcional)
          <input 
            value={myLabel} 
            placeholder="Nom curt" 
            onChange={(e) => setMyLabel(e.target.value)} 
            style={{ padding: isMobile ? 12 : 8, border: '1px solid #d1d5db', borderRadius: 10, minWidth: isMobile ? '100%' : 220, fontSize: isMobile ? 16 : 14 }} 
          />
        </label>
        {!isMobile && (
          <button 
            onClick={sendMyPosition} 
            disabled={sending} 
            style={{ padding: '10px 14px', background: '#4179b5', color: '#fff', border: 'none', borderRadius: 10, cursor: 'pointer', height: 42 }}
          >
            {sending ? 'Enviant…' : 'Enviar la meva posició'}
          </button>
        )}
        <div style={{ marginLeft: isMobile ? 0 : 'auto', display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#374151', fontSize: isMobile ? 13 : 12 }}>
            <input type="checkbox" checked={autoSend} onChange={(e) => setAutoSend(e.target.checked)} />
            Enviament automàtic
          </label>
          <span style={{ color: '#6b7280', fontSize: isMobile ? 12 : 12 }}>Freqüència</span>
          <select 
            value={String(pollMs)} 
            onChange={(e) => setPollMs(Number(e.target.value))} 
            style={{ padding: isMobile ? 12 : 8, border: '1px solid #d1d5db', borderRadius: 10, fontSize: isMobile ? 16 : 14 }}
          >
            <option value="5000">5s</option>
            <option value="8000">8s</option>
            <option value="15000">15s</option>
            <option value="30000">30s</option>
          </select>
        </div>
      </div>

      {error && (
        <div style={{ padding: 12, color: '#b91c1c', background: '#fee2e2', border: '1px solid #fecaca' }}>{error}</div>
      )}

      {/* List */}
      <div style={{ padding: isMobile ? 10 : 16, overflow: 'auto' }}>
        {!isMobile && (
          <div style={{ border: '1px solid #e6ecf5', borderRadius: 12, overflow: 'hidden', background: '#fff' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '200px 1fr 1fr 120px 160px', gap: 8, padding: '12px 14px', background: '#fcfdff', borderBottom: '1px solid #e6ecf5', fontWeight: 700, color: '#334155' }}>
              <div>Id</div>
              <div>Etiqueta</div>
              <div>Coordenades</div>
              <div>Precisió</div>
              <div>Actualitzat</div>
            </div>
            {assets.length === 0 ? (
              <div style={{ padding: 16, color: '#6b7280' }}>Sense dades</div>
            ) : assets.map((a) => (
              <div key={a.id} style={{ display: 'grid', gridTemplateColumns: '200px 1fr 1fr 120px 160px', gap: 8, padding: '10px 14px', borderBottom: '1px solid #f1f5f9' }}>
                <div style={{ fontFamily: 'monospace' }}>{a.id}</div>
                <div>{a.label || '—'}</div>
                <div style={{ fontFamily: 'monospace' }}>{a.lat.toFixed(6)}, {a.lng.toFixed(6)}</div>
                <div>{a.accuracy ? `${Math.round(a.accuracy)} m` : '—'}</div>
                <div>{formatTime(a.updatedAt)}</div>
              </div>
            ))}
          </div>
        )}

        {isMobile && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {assets.length === 0 ? (
              <div style={{ padding: 12, color: '#6b7280', textAlign: 'center' }}>Sense dades</div>
            ) : assets.map((a) => (
              <div key={a.id} style={{ background: '#fff', border: '1px solid #e6ecf5', borderRadius: 12, padding: 12, display: 'flex', flexDirection: 'column', gap: 6 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ fontWeight: 700 }}>{a.label || '—'}</div>
                  <div style={{ color: '#6b7280', fontSize: 12 }}>{formatTime(a.updatedAt)}</div>
                </div>
                <div style={{ fontFamily: 'monospace', fontSize: 13, color: '#334155', wordBreak: 'break-all' }}>{a.id}</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#334155' }}>
                  <span style={{ fontSize: 12, color: '#6b7280' }}>Coordenades:</span>
                  <span style={{ fontFamily: 'monospace', fontSize: 14 }}>{a.lat.toFixed(6)}, {a.lng.toFixed(6)}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#334155' }}>
                  <span style={{ fontSize: 12, color: '#6b7280' }}>Precisió:</span>
                  <span>{a.accuracy ? `${Math.round(a.accuracy)} m` : '—'}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Sticky bottom action on mobile */}
      {isMobile && (
        <div style={{ position: 'fixed', left: 0, right: 0, bottom: '4rem', padding: 12, background: 'transparent' }}>
          <button 
            onClick={sendMyPosition} 
            disabled={sending} 
            style={{ width: 'calc(100% - 24px)', margin: '0 12px', padding: 14, background: '#4179b5', color: '#fff', border: 'none', borderRadius: 12, fontSize: 16, fontWeight: 700, boxShadow: '0 6px 16px rgba(0,0,0,0.15)' }}
          >
            {sending ? 'Enviant…' : 'Enviar la meva posició'}
          </button>
        </div>
      )}

      <div style={{ padding: isMobile ? 10 : 16, paddingTop: 0, color: '#6b7280', fontSize: isMobile ? 12 : 12 }}>
        Consell: obre aquesta pàgina al mòbil per enviar la teva posició; en altres dispositius veuràs totes les posicions en temps real.
      </div>
    </div>
  );
};

export default ActiusMobils;
