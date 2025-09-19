import React from 'react';
import { BUILDING_COLORS } from '../../../globals';
import { FMAssetPanelModal } from './FMAssetPanelModal';
import BasePanel from '@shared/components/panels/BasePanel';

interface Asset {
  guid: string;
  departament: string;
  dispositiu: string;
  edifici: string;
  planta: string;
  zona?: string;
  space_dispositiu?: string;
  total_area: number;
  element_count: number;
  tipo_coincidencia: string;
  actiu_nom?: string;
}

const FMAssetPanel: React.FC = () => {
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | undefined>(undefined);
  const [searchQuery, setSearchQuery] = React.useState('');
  const [selectedBuildings, setSelectedBuildings] = React.useState<string[]>([]);
  const [selectedFloors, setSelectedFloors] = React.useState<string[]>([]);
  const [showFilters, setShowFilters] = React.useState(false);
  const [assets, setAssets] = React.useState<Asset[]>([]);
  const [availableBuildings, setAvailableBuildings] = React.useState<string[]>([]);
  const [availableFloors, setAvailableFloors] = React.useState<string[]>([]);
  
  // Asset detail modal state
  const [showModal, setShowModal] = React.useState(false);
  const [selectedAsset, setSelectedAsset] = React.useState<Asset | null>(null);
  const [assetDetail, setAssetDetail] = React.useState<any>(null);
  const [assetImages, setAssetImages] = React.useState<any[]>([]);
  const [activeTab, setActiveTab] = React.useState<'informacio' | 'manteniment'>('informacio');
  const [uploading, setUploading] = React.useState(false);
  const [lightboxUrl, setLightboxUrl] = React.useState<string | null>(null);
  const [showCamera, setShowCamera] = React.useState(false);
  const [cameraStream, setCameraStream] = React.useState<MediaStream | null>(null);
  
  // Maintenance state
  const [maintenanceRecords, setMaintenanceRecords] = React.useState<any[]>([]);
  const [maintenanceLoading, setMaintenanceLoading] = React.useState(false);
  const [maintenanceCreating, setMaintenanceCreating] = React.useState(false);
  const [maintenanceNew, setMaintenanceNew] = React.useState<any>({});

  // Fetch assets from API
  const fetchAssets = React.useCallback(async () => {
    if (!searchQuery.trim() || searchQuery.trim().length < 2) {
      setAssets([]);
      return;
    }

    try {
      setLoading(true);
      setError(undefined);

      const edificis = selectedBuildings.length > 0 
        ? `&edificis=${encodeURIComponent(selectedBuildings.join(','))}`
        : '';
      const plantes = selectedFloors.length > 0 
        ? `&plantes=${encodeURIComponent(selectedFloors.join(','))}`
        : '';
      
      const url = `/api/actius/search-all?query=${encodeURIComponent(searchQuery.trim())}${edificis}${plantes}`;
      
      const response = await fetch(url, {
        headers: { Accept: 'application/json' }
      });

      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`);
      }

      const results: Asset[] = await response.json();
      setAssets(results);

      // Update available filters based on results
      const buildings = [...new Set(results.map(a => a.edifici).filter(Boolean))];
      const floors = [...new Set(results.map(a => a.planta).filter(Boolean))];
      setAvailableBuildings(buildings);
      setAvailableFloors(floors);

    } catch (err: any) {
      console.error('Error fetching assets:', err);
      setError(err.message || 'Error al carregar actius');
      setAssets([]);
    } finally {
      setLoading(false);
    }
  }, [searchQuery, selectedBuildings, selectedFloors]);

  // Fetch assets when search query or filters change
  React.useEffect(() => {
    const timeoutId = setTimeout(() => {
      fetchAssets();
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [fetchAssets]);

  const handleSearch = (query: string) => setSearchQuery(query);
  const handleRefresh = () => fetchAssets();

  // Open asset detail modal and focus in viewer
  const handleAssetDoubleClick = async (asset: Asset) => {
    try {
      setSelectedAsset(asset);
      setShowModal(true);
      setActiveTab('informacio');

      const response = await fetch(`/api/actius/${encodeURIComponent(asset.guid)}`, { headers: { Accept: 'application/json' } });
      if (response.ok) setAssetDetail(await response.json());

      try {
        const imagesResponse = await fetch(`/api/actius/${encodeURIComponent(asset.guid)}/images`, { headers: { Accept: 'application/json' } });
        if (imagesResponse.ok) setAssetImages(await imagesResponse.json());
      } catch {
        setAssetImages([]);
      }

      window.dispatchEvent(new CustomEvent('fm:focus-asset', {
        detail: { guid: asset.guid, name: asset.dispositiu, building: asset.edifici },
        bubbles: true,
        composed: true
      }));

    } catch (error) {
      console.error('Error opening asset modal:', error);
    }
  };

  const closeAssetModal = () => {
    setShowModal(false);
    setSelectedAsset(null);
    setAssetDetail(null);
    setAssetImages([]);
    setActiveTab('informacio');
    setLightboxUrl(null);
    closeCamera();
  };

  const uploadAssetImages = async (files: FileList) => {
    if (!selectedAsset?.guid || files.length === 0) return;
    console.debug('[FM] uploadAssetImages start', { guid: selectedAsset.guid, count: files.length });
    setUploading(true);
    try {
      // Backend expects 'files' (multerUpload = upload.array('files'))
      const fd = new FormData();
      for (let i = 0; i < files.length; i++) fd.append('files', files[i]);
      const response = await fetch(`/api/actius/${encodeURIComponent(selectedAsset.guid)}/images`, { method: 'POST', body: fd });
      if (!response.ok) {
        const errText = await response.text().catch(() => '');
        console.error('[FM] upload failed', response.status, errText);
        alert(`No s'han pogut pujar les imatges. (${response.status})\n${errText}`);
        return;
      }
      // Refresh list
      const imagesResponse = await fetch(`/api/actius/${encodeURIComponent(selectedAsset.guid)}/images`, { headers: { Accept: 'application/json' } });
      if (imagesResponse.ok) {
        const imgs = await imagesResponse.json();
        console.debug('[FM] upload ok, images count:', Array.isArray(imgs) ? imgs.length : imgs);
        setAssetImages(imgs);
      } else {
        console.warn('[FM] refresh images failed', imagesResponse.status);
      }
    } catch (error) {
      console.error('Error uploading images:', error);
    } finally {
      setUploading(false);
    }
  };

  const deleteAssetImage = async (imageId: string) => {
    if (!selectedAsset?.guid) return;
    if (!confirm('Eliminar aquesta imatge?')) return;
    try {
      // Backend route is /api/actius/images/:id with guid as query param
      const response = await fetch(`/api/actius/images/${encodeURIComponent(imageId)}?guid=${encodeURIComponent(selectedAsset.guid)}`, { method: 'DELETE' });
      if (response.ok) {
        const imagesResponse = await fetch(`/api/actius/${encodeURIComponent(selectedAsset.guid)}/images`, { headers: { Accept: 'application/json' } });
        if (imagesResponse.ok) setAssetImages(await imagesResponse.json());
      }
    } catch (error) {
      console.error('Error deleting image:', error);
    }
  };

  // Camera functions
  const openCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      setCameraStream(stream);
      setShowCamera(true);
      setTimeout(() => {
        const video = document.getElementById('asset-camera-video') as HTMLVideoElement;
        if (video) {
          (video as any).srcObject = stream;
          console.debug('[FM] camera stream attached');
        }
      }, 100);
    } catch (error) {
      console.error('Error accessing camera:', error);
      alert("No s'ha pogut accedir a la càmera");
    }
  };

  const closeCamera = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach((t) => t.stop());
      setCameraStream(null);
    }
    setShowCamera(false);
  };

  const capturePhoto = async () => {
    const video = document.getElementById('asset-camera-video') as HTMLVideoElement;
    if (!video || !selectedAsset?.guid) return;
    const canvas = document.createElement('canvas');
    canvas.width = (video as any).videoWidth;
    canvas.height = (video as any).videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(video, 0, 0);
    canvas.toBlob(async (blob) => {
      if (!blob) return;
      const file = new File([blob], `photo_${Date.now()}.jpg`, { type: 'image/jpeg' });
      const fileList = new DataTransfer();
      fileList.items.add(file);
      console.debug('[FM] capturePhoto created file', file.name, file.size);
      await uploadAssetImages(fileList.files);
      closeCamera();
    }, 'image/jpeg', 0.8);
  };

  const openLightbox = (url: string) => setLightboxUrl(url);
  const closeLightbox = () => setLightboxUrl(null);

  const loadMaintenanceRecords = async () => {
    if (!selectedAsset?.guid) return;
    setMaintenanceLoading(true);
    try {
      const response = await fetch(`/api/actius/${encodeURIComponent(selectedAsset.guid)}/maintenance`);
      if (response.ok) setMaintenanceRecords(await response.json());
    } catch (error) {
      console.error('Error loading maintenance records:', error);
      setMaintenanceRecords([]);
    } finally {
      setMaintenanceLoading(false);
    }
  };

  const createMaintenanceRecord = async () => {
    if (!selectedAsset?.guid) return;
    const payload = {
      performedAt: maintenanceNew?.performedAt || null,
      nextPlannedAt: null,
      periodMonths: Number(maintenanceNew?.periodMonths || 0) || 0,
      periodDays: Number(maintenanceNew?.periodDays || 0) || 0,
      responsible: maintenanceNew?.responsible || '',
      incidents: maintenanceNew?.incidents || '',
      correctiveActions: maintenanceNew?.correctiveActions || '',
      checklist: null,
    };
    setMaintenanceCreating(true);
    try {
      const response = await fetch(`/api/actius/${encodeURIComponent(selectedAsset.guid)}/maintenance`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      if (response.ok) {
        setMaintenanceNew({});
        await loadMaintenanceRecords();
      }
    } catch (error) {
      console.error('Error creating maintenance record:', error);
    } finally {
      setMaintenanceCreating(false);
    }
  };

  const deleteMaintenanceRecord = async (recordId: string) => {
    if (!selectedAsset?.guid) return;
    if (!confirm('Eliminar aquest registre de manteniment?')) return;
    try {
      const response = await fetch(`/api/actius/${encodeURIComponent(selectedAsset.guid)}/maintenance/${recordId}`, { method: 'DELETE' });
      if (response.ok) await loadMaintenanceRecords();
    } catch (error) {
      console.error('Error deleting maintenance record:', error);
    }
  };

  React.useEffect(() => {
    if (activeTab === 'manteniment' && selectedAsset) loadMaintenanceRecords();
  }, [activeTab, selectedAsset]);

  const clearFilters = () => {
    setSearchQuery('');
    setSelectedBuildings([]);
    setSelectedFloors([]);
    setShowFilters(false);
  };

  const toggleBuildingFilter = (building: string) => {
    setSelectedBuildings((prev) => prev.includes(building) ? prev.filter((b) => b !== building) : [...prev, building]);
  };
  const toggleFloorFilter = (floor: string) => {
    setSelectedFloors((prev) => prev.includes(floor) ? prev.filter((f) => f !== floor) : [...prev, floor]);
  };

  // Color code by building using global palette
  const buildingColor = (code?: string) => {
    const hex = BUILDING_COLORS[(code || '').toUpperCase()];
    if (!hex) return { backgroundColor: '#e5e7eb', color: '#374151', borderColor: '#e5e7eb' };
    return { backgroundColor: hex, color: '#ffffff', borderColor: hex };
  };

  const actions = (
    <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
      <button onClick={() => setShowFilters(!showFilters)} className="btn-secondary" style={{ backgroundColor: showFilters ? 'var(--bim-ui_accent-base)' : undefined, color: showFilters ? 'white' : undefined }}>🔍 Filtres</button>
      {assets.length > 0 && (
        <button
          onClick={() => {
            const headers = ['GUID', 'Departament', 'Dispositiu', 'Edifici', 'Planta', 'Zona', 'Àrea Total (m²)', 'Elements'];
            const csvRows = [headers.join(';')];
            assets.forEach((a) => {
              const row = [a.guid, a.departament, a.dispositiu, a.edifici, a.planta, a.zona || '', a.total_area.toString().replace('.', ','), a.element_count.toString()];
              csvRows.push(row.map((cell) => `"${cell}"`).join(';'));
            });
            const csvContent = '\uFEFF' + csvRows.join('\n');
            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement('a');
            const url = URL.createObjectURL(blob);
            link.setAttribute('href', url);
            link.setAttribute('download', `actius-fm-${new Date().toISOString().split('T')[0]}.csv`);
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
          }}
          className="btn-secondary"
          title={`Exportar (${assets.length} actius)`}
          style={{ borderColor: 'var(--bim-ui_accent-base)', color: 'white', backgroundColor: 'var(--bim-ui_accent-base)' }}
        >
          📊 Exportar ({assets.length} actius)
        </button>
      )}
    </div>
  );

  return (
    <BasePanel title={`Actius FM (${assets.length})`} loading={loading} error={error} actions={actions}>
      <div className="fm-search-section" style={{ marginBottom: '12px' }}>
        <input type="text" placeholder="Buscar actius..." value={searchQuery} onChange={(e) => handleSearch((e.target as HTMLInputElement).value)} style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px', backgroundColor: '#ffffff', color: '#111827', fontSize: '14px' }} />
        {showFilters && (
          <div className="fm-filters" style={{ marginTop: '12px', padding: '12px', backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #e5e7eb', boxShadow: '0 1px 2px rgba(0,0,0,0.04)' }}>
            <div style={{ marginBottom: '12px' }}>
              <label style={{ display: 'block', marginBottom: '6px', fontSize: '12px', fontWeight: 'bold', color: '#374151' }}>Edificis:</label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {availableBuildings.map((building) => (
                  <button key={building} onClick={() => toggleBuildingFilter(building)} style={{ padding: '4px 8px', fontSize: '12px', border: '1px solid #d1d5db', borderRadius: '6px', backgroundColor: selectedBuildings.includes(building) ? '#1d4ed8' : '#ffffff', color: selectedBuildings.includes(building) ? 'white' : '#111827', cursor: 'pointer' }}>{building}</button>
                ))}
              </div>
            </div>
            <div style={{ marginBottom: '12px' }}>
              <label style={{ display: 'block', marginBottom: '6px', fontSize: '12px', fontWeight: 'bold', color: '#374151' }}>Plantes:</label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {availableFloors.map((floor) => (
                  <button key={floor} onClick={() => toggleFloorFilter(floor)} style={{ padding: '4px 8px', fontSize: '12px', border: '1px solid #d1d5db', borderRadius: '6px', backgroundColor: selectedFloors.includes(floor) ? '#1d4ed8' : '#ffffff', color: selectedFloors.includes(floor) ? 'white' : '#111827', cursor: 'pointer' }}>Planta {floor}</button>
                ))}
              </div>
            </div>
            <button onClick={clearFilters} style={{ padding: '6px 12px', fontSize: '12px', border: '1px solid #d1d5db', borderRadius: '6px', backgroundColor: '#ffffff', color: '#111827', cursor: 'pointer' }}>Netejar filtres</button>
          </div>
        )}
      </div>

      <div className="fm-asset-list">
        {assets.map((asset) => (
          <div key={asset.guid} className="fm-asset-item" onDoubleClick={() => handleAssetDoubleClick(asset)} style={{ cursor: 'pointer' }} title="Doble clic per obrir detalls i localitzar">
            <div className="asset-header">
              <span className="asset-name">{asset.actiu_nom || asset.dispositiu || '-'}</span>
              <span className="asset-building" style={{ ...buildingColor(asset.edifici), border: '1px solid', padding: '2px 8px', borderRadius: 6 }}>{asset.edifici}</span>
            </div>
            <div className="asset-details" style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span>{asset.dispositiu || '-'}</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', textAlign: 'right' }}>
                <span>{asset.departament || '-'}</span>
              </div>
            </div>
            <div className="asset-details" style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
              <span className="asset-floor">{asset.planta}</span>
              {asset.zona && <span className="asset-zone">Zona: {asset.zona}</span>}
            </div>
          </div>
        ))}

        {assets.length === 0 && !loading && searchQuery.trim().length >= 2 && (
          <div className="empty-state" style={{ textAlign: 'center', padding: '24px', color: 'var(--bim-ui_bg-contrast-60)' }}>
            <div style={{ fontSize: '32px', marginBottom: '8px' }}>📦</div>
            <p style={{ margin: 0, fontSize: '14px' }}>No s'han trobat actius amb els filtres aplicats</p>
          </div>
        )}

        {assets.length === 0 && !loading && searchQuery.trim().length < 2 && (
          <div className="empty-state" style={{ textAlign: 'center', padding: '24px', color: 'var(--bim-ui_bg-contrast-60)' }}>
            <div style={{ fontSize: '32px', marginBottom: '8px' }}>🔍</div>
            <p style={{ margin: 0, fontSize: '14px' }}>Escriu almenys 2 caràcters per buscar actius</p>
          </div>
        )}

        {/* Export button moved to header actions */}
      </div>

      {showModal && selectedAsset && (
        <FMAssetPanelModal
          selectedAsset={selectedAsset}
          assetDetail={assetDetail}
          assetImages={assetImages}
          activeTab={activeTab}
          uploading={uploading}
          lightboxUrl={lightboxUrl}
          showCamera={showCamera}
          maintenanceRecords={maintenanceRecords}
          maintenanceLoading={maintenanceLoading}
          maintenanceCreating={maintenanceCreating}
          maintenanceNew={maintenanceNew}
          onClose={closeAssetModal}
          onTabChange={setActiveTab}
          onUploadImages={uploadAssetImages}
          onDeleteImage={deleteAssetImage}
          onOpenCamera={openCamera}
          onCloseCamera={closeCamera}
          onCapturePhoto={capturePhoto}
          onOpenLightbox={openLightbox}
          onCloseLightbox={closeLightbox}
          onCreateMaintenanceRecord={createMaintenanceRecord}
          onDeleteMaintenanceRecord={deleteMaintenanceRecord}
          onUpdateMaintenanceNew={setMaintenanceNew}
        />
      )}

      {/* Lightbox */}
      {lightboxUrl && (
        <div onClick={closeLightbox} style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.9)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1001 }}>
          <img src={lightboxUrl} style={{ maxWidth: '90vw', maxHeight: '90vh', borderRadius: '4px' }} onClick={(e) => e.stopPropagation()} />
          <button onClick={closeLightbox} style={{ position: 'absolute', top: '20px', right: '20px', background: 'rgba(0,0,0,0.7)', border: 'none', color: '#fff', padding: '8px 12px', borderRadius: '4px', cursor: 'pointer' }}>✕</button>
        </div>
      )}

      {/* Camera Modal */}
      {showCamera && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0, 0, 0, 0.9)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1002 }}>
          <div style={{ background: '#1a1d23', border: '1px solid #333', borderRadius: '8px', padding: '20px', maxWidth: '600px', width: '90vw' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', color: '#fff' }}>
              <h3 style={{ margin: 0 }}>Càmera</h3>
              <button onClick={closeCamera} style={{ background: 'transparent', border: 'none', color: '#fff', fontSize: '1.2rem', cursor: 'pointer' }}>✕</button>
            </div>
            <div style={{ background: '#000', borderRadius: '4px', overflow: 'hidden', marginBottom: '16px' }}>
              <video id="asset-camera-video" autoPlay playsInline style={{ width: '100%', height: 'auto', display: 'block' }} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
              <button onClick={closeCamera} style={{ padding: '8px 16px', border: '1px solid #333', background: 'transparent', color: '#fff', cursor: 'pointer' }}>Cancel·lar</button>
              <button onClick={capturePhoto} style={{ padding: '8px 16px', border: '1px solid #333', background: '#2a2d33', color: '#fff', cursor: 'pointer' }}>Capturar</button>
            </div>
          </div>
        </div>
      )}
    </BasePanel>
  );
};

export default FMAssetPanel;
