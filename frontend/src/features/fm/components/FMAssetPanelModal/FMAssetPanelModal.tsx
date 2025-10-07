import React from 'react';
import '../../FMModal.css';

interface Asset {
  guid: string;
  dispositiu: string;
  edifici: string;
  planta: string;
  zona?: string;
  departament: string;
  total_area: number;
  element_count: number;
}

interface FMAssetPanelModalProps {
  selectedAsset: Asset;
  assetDetail: any;
  assetImages: any[];
  activeTab: 'informacio' | 'manteniment';
  uploading: boolean;
  lightboxUrl: string | null;
  showCamera: boolean;
  maintenanceRecords: any[];
  maintenanceLoading: boolean;
  maintenanceCreating: boolean;
  maintenanceNew: any;
  onClose: () => void;
  onTabChange: (tab: 'informacio' | 'manteniment') => void;
  onUploadImages: (files: FileList) => void;
  onDeleteImage: (imageId: string) => void;
  onOpenCamera: () => void;
  onCloseCamera: () => void;
  onCapturePhoto: () => void;
  onOpenLightbox: (url: string) => void;
  onCloseLightbox: () => void;
  onCreateMaintenanceRecord: () => void;
  onDeleteMaintenanceRecord: (recordId: string) => void;
  onUpdateMaintenanceNew: (data: any) => void;
}

export const FMAssetPanelModal: React.FC<FMAssetPanelModalProps> = ({
  selectedAsset,
  assetDetail,
  assetImages,
  activeTab,
  uploading,
  lightboxUrl,
  showCamera,
  maintenanceRecords,
  maintenanceLoading,
  maintenanceCreating,
  maintenanceNew,
  onClose,
  onTabChange,
  onUploadImages,
  onDeleteImage,
  onOpenCamera,
  onCloseCamera,
  onCapturePhoto,
  onOpenLightbox,
  onCloseLightbox,
  onCreateMaintenanceRecord,
  onDeleteMaintenanceRecord,
  onUpdateMaintenanceNew
}) => {
  return (
    <>
      {/* Main Modal */}
      <div 
        className="fm-modal-overlay"
        onClick={(e) => {
          if (e.target === e.currentTarget) {
            onClose();
          }
        }}
      >
        <div className="fm-modal">
          <div className="fm-modal-header">
            <h2 className="fm-modal-title">
              Editor d'actiu - {selectedAsset.dispositiu}
            </h2>
            <button className="fm-modal-close" onClick={onClose}>✕ Tancar</button>
          </div>

          <div className="fm-modal-body">
          {/* Tabs */}
          <div className="fm-tabs">
            {(['informacio', 'manteniment'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => onTabChange(tab)}
                className={`fm-tab ${activeTab === tab ? 'active' : ''}`}
              >
                {tab === 'informacio' ? 'Informació' : 'Manteniment'}
              </button>
            ))}
          </div>

          {/* Tab Content */}
          {activeTab === 'informacio' && (
            <div>
              {/* Basic Info */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px 24px', fontSize: '14px', marginBottom: '24px' }}>
                {assetDetail ? (
                  <>
                    <div><strong>GUID:</strong> <span style={{ fontFamily: 'monospace', fontSize: '12px' }}>{assetDetail.guid}</span></div>
                    <div><strong>Tipus:</strong> {assetDetail.tipus || '-'}</div>
                    <div><strong>Subtipus:</strong> {assetDetail.subtipus || '-'}</div>
                    <div><strong>Edifici:</strong> {assetDetail.edifici || '-'}</div>
                    <div><strong>Planta:</strong> {assetDetail.planta || '-'}</div>
                    <div><strong>Zona:</strong> {assetDetail.zona || '-'}</div>
                    <div style={{ gridColumn: '1 / -1' }}><strong>Ubicació:</strong> {assetDetail.ubicacio || '-'}</div>
                  </>
                ) : (
                  <div style={{ gridColumn: '1 / -1' }}>Carregant informació...</div>
                )}
              </div>

              {/* Images Section */}
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                  <h3 style={{ margin: 0, fontSize: '15px' }}>Imatges</h3>
                  <button
                    onClick={() => {
                      const input = document.getElementById(`asset-file-input-${selectedAsset.guid}`) as HTMLInputElement;
                      if (input) input.click();
                    }}
                    className="fm-btn fm-btn-primary"
                  >
                    Afegir imatges
                  </button>
                  <button
                    onClick={onOpenCamera}
                    className="fm-btn"
                  >
                    Fer foto
                  </button>
                  {uploading && <span style={{ fontSize: '12px', color: '#ccc' }}>Pujant...</span>}
                  <input
                    id={`asset-file-input-${selectedAsset.guid}`}
                    type="file"
                    accept="image/*"
                    capture="environment"
                    multiple
                    style={{ display: 'none' }}
                    onChange={(e) => {
                      const target = e.target as HTMLInputElement;
                      if (target.files) {
                        onUploadImages(target.files);
                        target.value = '';
                      }
                    }}
                  />
                </div>
                
                {assetImages.length === 0 ? (
                  <div className="fm-muted" style={{ fontSize: '14px' }}>Encara no hi ha imatges disponibles.</div>
                ) : (
                  <div className="fm-images-grid">
                    {assetImages.map((img: any) => (
                      <div key={img.id} className="fm-image-card">
                        <img 
                          src={img.thumbUrl || img.url} 
                          className="fm-image"
                          onClick={() => onOpenLightbox(img.url)}
                          title="Veure gran"
                        />
                        {img.createdAt && (
                          <div className="fm-img-date">
                            {new Date(img.createdAt).toLocaleDateString()}
                          </div>
                        )}
                        <button
                          onClick={() => onDeleteImage(img.id)}
                          title="Eliminar"
                          className="fm-btn fm-btn-danger fm-img-del"
                        >
                          🗑️
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'manteniment' && (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
                <h3 style={{ margin: 0, fontSize: '16px' }}>Registres de manteniment</h3>
                {maintenanceLoading && <span style={{ color: '#ccc', fontSize: '14px' }}>Carregant...</span>}
              </div>
              
              {/* Add new maintenance record form */}
              <div className="fm-record" style={{ padding: '16px', marginBottom: '16px' }}>
                <h4 style={{ margin: '0 0 16px 0', fontSize: '14px', fontWeight: 'bold' }}>Afegir registre</h4>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '16px', marginBottom: '16px' }}>
                  <div>
                    <label style={{ display: 'block', marginBottom: '4px', fontSize: '12px', fontWeight: 'bold' }}>Data realitzat:</label>
                    <input
                      type="date"
                      value={maintenanceNew?.performedAt || ''}
                      onChange={(e) => onUpdateMaintenanceNew({ ...maintenanceNew, performedAt: e.target.value })}
                      className="fm-input"
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '4px', fontSize: '12px', fontWeight: 'bold' }}>Responsable:</label>
                    <input
                      type="text"
                      placeholder="Nom"
                      value={maintenanceNew?.responsible || ''}
                      onChange={(e) => onUpdateMaintenanceNew({ ...maintenanceNew, responsible: e.target.value })}
                      className="fm-input"
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '4px', fontSize: '12px', fontWeight: 'bold' }}>Periodicitat (mesos):</label>
                    <input
                      type="number"
                      min="0"
                      value={maintenanceNew?.periodMonths || ''}
                      onChange={(e) => onUpdateMaintenanceNew({ ...maintenanceNew, periodMonths: e.target.value })}
                      className="fm-input"
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '4px', fontSize: '12px', fontWeight: 'bold' }}>Periodicitat (dies):</label>
                    <input
                      type="number"
                      min="0"
                      value={maintenanceNew?.periodDays || ''}
                      onChange={(e) => onUpdateMaintenanceNew({ ...maintenanceNew, periodDays: e.target.value })}
                      className="fm-input"
                    />
                  </div>
                  <div style={{ gridColumn: '1 / -1' }}>
                    <label style={{ display: 'block', marginBottom: '4px', fontSize: '12px', fontWeight: 'bold' }}>Incidències:</label>
                    <textarea
                      rows={2}
                      value={maintenanceNew?.incidents || ''}
                      onChange={(e) => onUpdateMaintenanceNew({ ...maintenanceNew, incidents: e.target.value })}
                      className="fm-textarea"
                    />
                  </div>
                  <div style={{ gridColumn: '1 / -1' }}>
                    <label style={{ display: 'block', marginBottom: '4px', fontSize: '12px', fontWeight: 'bold' }}>Accions correctives:</label>
                    <textarea
                      rows={2}
                      value={maintenanceNew?.correctiveActions || ''}
                      onChange={(e) => onUpdateMaintenanceNew({ ...maintenanceNew, correctiveActions: e.target.value })}
                      className="fm-textarea"
                    />
                  </div>
                </div>
                <div className="fm-actions" style={{ justifyContent: 'flex-end' }}>
                  <button
                    onClick={() => onUpdateMaintenanceNew({})}
                    className="fm-btn"
                  >
                    Netejar
                  </button>
                  <button
                    onClick={onCreateMaintenanceRecord}
                    disabled={maintenanceCreating}
                    className="fm-btn fm-btn-primary"
                  >
                    {maintenanceCreating ? 'Guardant...' : 'Guardar'}
                  </button>
                </div>
              </div>

              {/* Maintenance records list */}
              <div>
                {maintenanceRecords.length === 0 ? (
                  <div className="fm-muted" style={{ fontSize: '14px' }}>No hi ha registres de manteniment.</div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {maintenanceRecords.map((record: any) => (
                      <div key={record.id} className="fm-record">
                        <div className="fm-record-head">
                          <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                            <span style={{ fontWeight: 'bold' }}>{record.performedAt ? new Date(record.performedAt).toLocaleDateString() : '-'}</span>
                            <span className="fm-muted" style={{ fontSize: '12px' }}>Resp.: {record.responsible || '-'}</span>
                            <span className="fm-muted" style={{ fontSize: '12px' }}>Peri.: {record.periodMonths || 0}m / {record.periodDays || 0}d</span>
                          </div>
                          <button
                            onClick={() => onDeleteMaintenanceRecord(record.id)}
                            title="Eliminar"
                            className="fm-btn fm-btn-danger"
                          >
                            🗑️
                          </button>
                        </div>
                        <div className="fm-record-body">
                          {record.incidents && <div><span style={{ fontWeight: 'bold' }}>Incidències:</span> {record.incidents}</div>}
                          {record.correctiveActions && <div><span style={{ fontWeight: 'bold' }}>Accions:</span> {record.correctiveActions}</div>}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>{/* /fm-modal-body */}
      </div>{/* /fm-modal */}
    </div>{/* /overlay */}

    {/* Lightbox and Camera are managed by the parent component (FMAssetPanel) */}
    </>
  );
};


export default FMAssetPanelModal;
