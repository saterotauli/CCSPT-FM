import React, { useRef, useState, useEffect } from 'react';
import * as FRAGS from '@thatopen/fragments';
import '@styles/Pages.css';
import { loadGeorefCalibration, saveGeorefCalibration, type GeorefCalibration } from '@modules/viewer/utils/Geolocation';

interface HabitacionIFC {
  codi: string;
  dispositiu?: string;
  edifici?: string;
  planta?: string;
  departament?: string;
  id?: string;
  centre_cost?: string;
  guid?: string;
  area?: number;
}

interface ActiuIFC {
  guid: string;
  tipus: string;
  subtipus: string;
  edifici: string;
  planta: string;
  zona: string;
  ubicacio: string;
}

const Config: React.FC = () => {
  // Estados para IFC to FRAG converter
  const ifcFileInputRef = useRef<HTMLInputElement>(null);
  const [ifcProcessing, setIfcProcessing] = useState(false);
  const [ifcMessage, setIfcMessage] = useState<string>("");
  
  // Estados para FRAG importer
  const fragFileInputRef = useRef<HTMLInputElement>(null);
  const [fragStatus, setFragStatus] = useState<string>("");
  const [ifcSpaces, setIfcSpaces] = useState<HabitacionIFC[]>([]);
  const [ifcDoors, setIfcDoors] = useState<ActiuIFC[]>([]);
  const [tablePopupOpen, setTablePopupOpen] = useState(false);
  const [spacesPage, setSpacesPage] = useState(1);
  const pageSize = 200; // avoid heavy DOM rendering
  const [actiusPopupOpen, setActiusPopupOpen] = useState(false);
  
  // Estados para georreferenciación
  const [georefCalibration, setGeorefCalibration] = useState<GeorefCalibration | null>(null);
  const [georefStatus, setGeorefStatus] = useState<string>("");
  const [georefForm, setGeorefForm] = useState<GeorefCalibration>({
    lat0: 0,
    lon0: 0,
    alt0: 0,
    modelOrigin: { x: 0, y: 0, z: 0 },
    headingDeg: 0,
    scale: 1
  });
  
  // Función para convertir IFC a FRAG
  const handleIfcFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIfcProcessing(true);
    setIfcMessage("");
    try {
      const arrayBuffer = await file.arrayBuffer();
      const ifcBytes = new Uint8Array(arrayBuffer);

      const serializer = new FRAGS.IfcImporter();
      // Use same web-ifc version as elsewhere in the app (App.tsx uses 0.0.70)
      serializer.wasm = { absolute: true, path: "https://unpkg.com/web-ifc@0.0.70/" };
      
      // IMPORTANT: Preserve original coordinates - do not apply any transformations
      serializer.autoCenter = false; // Don't center the model automatically
      if (serializer.centerModels !== undefined) {
        serializer.centerModels = false; // Don't center models
      }
      if (serializer.coordinate !== undefined) {
        serializer.coordinate = false; // Don't apply coordinate transformations
      }
      
      const fragmentBytes = await serializer.process({ 
        bytes: ifcBytes,
        progressCallback: (progress, data) => {
          console.log(`Progreso: ${Math.round(progress * 100)}%`, data);
          setIfcMessage(`Convirtiendo... ${Math.round(progress * 100)}%`);
        }
      });

      const suggestedName = file.name.replace(/\.ifc$/i, ".frag");
      // Try to use the File System Access API when available to let the user choose destination
      try {
        const anyWindow = window as any;
        if (typeof anyWindow.showSaveFilePicker === 'function') {
          const handle = await anyWindow.showSaveFilePicker({
            suggestedName,
            types: [
              {
                description: 'Fragments (.frag)',
                accept: { 'application/octet-stream': ['.frag'] }
              }
            ]
          });
          const writable = await handle.createWritable();
          await writable.write(new Blob([fragmentBytes], { type: 'application/octet-stream' }));
          await writable.close();
        } else {
          // Fallback: trigger a download
          const fragFile = new File([fragmentBytes], suggestedName, { type: 'application/octet-stream' });
          const a = document.createElement("a");
          a.href = URL.createObjectURL(fragFile);
          a.download = fragFile.name;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(a.href);
        }
        setIfcMessage("¡Conversión completada!");
      } catch (saveErr) {
        console.error('[IFC->FRAG] Error saving file:', saveErr);
        // As a last resort, still try download fallback
        try {
          const fragFile = new File([fragmentBytes], suggestedName, { type: 'application/octet-stream' });
          const a = document.createElement("a");
          a.href = URL.createObjectURL(fragFile);
          a.download = fragFile.name;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(a.href);
          setIfcMessage("¡Conversión completada!");
        } catch (fallbackErr) {
          setIfcMessage("Error al guardar el archivo: " + (fallbackErr instanceof Error ? fallbackErr.message : String(fallbackErr)));
        }
      }
      setTimeout(() => setIfcMessage(""), 3000);
    } catch (err) {
      setIfcMessage("Error en la conversión: " + (err instanceof Error ? err.message : String(err)));
    } finally {
      setIfcProcessing(false);
    }
  };
  
  // Función para importar FRAG
  const handleFragFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    console.log('[FragImporter] Archivo seleccionado:', file.name, 'Tipo:', file.type, 'Tamaño:', file.size);
    
    setFragStatus("Leyendo archivo...");
    const arrayBuffer = await file.arrayBuffer();
    
    const fileName = file.name.toLowerCase();
    const isFragFile = fileName.endsWith('.frag');
    
    if (!isFragFile) {
      setFragStatus("Error: Solo se admiten archivos .frag");
      return;
    }
    
    try {
      setFragStatus("Cargando modelo de fragmentos...");
      // Use local worker served by Vite to avoid CORS from CDN
      const workerUrl = "/node_modules/@thatopen/fragments/dist/Worker/worker.mjs";
      const fragments = new FRAGS.FragmentsModels(workerUrl);
      
      const model = await fragments.load(arrayBuffer, { modelId: "frag-upload" });
      
      console.log('[FragImporter] Modelo cargado:', model);
      
      setFragStatus("Modelo cargado. Extrayendo ifcSpaces...");
      
      // Obtener los espacios (IFCSPACE)
      const spacesResult = await model.getItemsOfCategories([/IFCSPACE/]);
      const spaceLocalIds = spacesResult.IFCSPACE || [];
      
      const spacesData = await model.getItemsData(spaceLocalIds, {
        attributesDefault: true,
        relations: {
          IsDefinedBy: { attributes: true, relations: true }
        }
      });
      
      // Obtener puertas (IFCDOOR)
      const doorCategories = await model.getItemsOfCategories([/IFCDOOR/]);
      const doorLocalIds = Object.values(doorCategories).flat();
      
      const doorsData = await model.getItemsData(doorLocalIds, {
        attributesDefault: true,
        relations: {
          IsDefinedBy: { attributes: true, relations: true }
        }
      });
      
      // Procesar espacios (sanitizar a primitivos)
      const toStr = (v: any) => (v === null || v === undefined) ? '' : String(v);
      const toNum = (v: any) => {
        if (v === null || v === undefined) return 0;
        const n = Number(v);
        return isNaN(n) ? 0 : n;
      };

      const processedSpaces: HabitacionIFC[] = [];
      for (const [, raw] of Object.entries(spacesData)) {
        if (!raw || typeof raw !== 'object') continue;
        const item = raw as any;

        // GUID robusto
        let guid = '';
        if (item.GlobalId) guid = toStr(item.GlobalId);
        else if (item.globalId) guid = toStr(item.globalId);
        else if (item.guid) guid = toStr(item.guid);
        else if (item._guid && item._guid.value) guid = toStr(item._guid.value);

        let dispositiu = '';
        let edifici = '';
        let planta = '';
        let departament = '';
        let id = '';
        let centre_cost = '';
        let area: number | undefined = undefined;

        const psets = item.IsDefinedBy as any[] | undefined;
        if (psets && Array.isArray(psets)) {
          for (const pset of psets) {
            const hasProps = pset?.HasProperties;
            if (!Array.isArray(hasProps)) continue;
            for (const prop of hasProps) {
              const name = prop?.Name && 'value' in prop.Name ? prop.Name.value : undefined;
              const val = prop?.NominalValue && 'value' in prop.NominalValue ? prop.NominalValue.value : undefined;
              if (!name) continue;
              switch (name) {
                case 'CSPT_FM_HabitacioDispositiu': if (val) dispositiu = String(val); break;
                case 'CSPT_FM_HabitacioEdifici': if (val) edifici = String(val); break;
                case 'CSPT_FM_HabitacioPlanta': if (val) planta = String(val); break;
                case 'CSPT_FM_HabitacioDepartament': if (val) departament = String(val); break;
                case 'CSPT_FM_HabitacioID': if (val) id = String(val); break;
                case 'CSPT_FM_HabitacioCentreCost': if (val) centre_cost = String(val); break;
                case 'Área':
                case 'Area':
                case 'Superficie':
                  if (val !== undefined) {
                    const parsed = Number(val);
                    if (!isNaN(parsed)) area = Math.round(parsed * 100) / 100;
                  }
                  break;
                default:
                  break;
              }
            }
          }
          // GUID desde pset si faltaba
          if (!guid) {
            const withGuid = psets.find(p => p?._guid?.value);
            if (withGuid) guid = toStr(withGuid._guid.value);
          }
        }

        processedSpaces.push({
          codi: toStr(item?.Name?.value ?? item?.Name),
          dispositiu,
          edifici,
          planta,
          departament,
          id,
          centre_cost,
          guid,
          area: area ?? toNum(item.GrossFloorArea)
        });
      }
      
      // Procesar puertas (sanitizar a primitivos)
      const processedDoors: ActiuIFC[] = [];
      for (const [, raw] of Object.entries(doorsData)) {
        if (!raw || typeof raw !== 'object') continue;
        const item = raw as any;
        let guid = '';
        if (item.GlobalId) guid = toStr(item.GlobalId);
        else if (item.globalId) guid = toStr(item.globalId);
        else if (item.guid) guid = toStr(item.guid);
        else if (item._guid?.value) guid = toStr(item._guid.value);

        let subtipus = '';
        let edifici = '';
        let planta = '';
        let zona = '';
        let ubicacio = '';
        const psets = item.IsDefinedBy as any[] | undefined;
        if (psets && Array.isArray(psets)) {
          for (const pset of psets) {
            const hasProps = pset?.HasProperties;
            if (!Array.isArray(hasProps)) continue;
            for (const prop of hasProps) {
              const name = prop?.Name && 'value' in prop.Name ? prop.Name.value : undefined;
              const val = prop?.NominalValue && 'value' in prop.NominalValue ? prop.NominalValue.value : undefined;
              if (!name) continue;
              if (name === 'CSPT_FM_Subtipus' && val) subtipus = String(val);
              if (name === 'CSPT_FM_HabitacioCodi' && val) ubicacio = String(val);
              if (name === 'CSPT_FM_HabitacioEdifici' && val) edifici = String(val);
              if (name === 'CSPT_FM_HabitacioPlanta' && val) planta = String(val);
              if (name === 'CSPT_FM_HabitacioZona' && val) zona = String(val);
            }
          }
        }
        // Derivar edifici/planta/zona desde ubicacio si tiene formato esperado EEE-PPP-ZZZ
        if (ubicacio && typeof ubicacio === 'string') {
          const parts = ubicacio.split('-');
          if (parts.length >= 3) {
            edifici = edifici || parts[0].slice(0, 3);
            planta = planta || parts[1].slice(0, 3);
            zona = zona || parts[2].slice(0, 3);
          }
        }

        processedDoors.push({
          guid,
          tipus: 'IFCDOOR',
          subtipus: subtipus || toStr(item.ObjectType || 'Porta'),
          edifici,
          planta,
          zona,
          ubicacio
        });
      }
      
      setIfcSpaces(processedSpaces);
      setIfcDoors(processedDoors);
      setFragStatus(`Archivo procesado: ${processedSpaces.length} espacios y ${processedDoors.length} puertas encontrados`);
      
    } catch (err) {
      console.error('[FragImporter] Error:', err);
      setFragStatus("Error al procesar el archivo: " + (err instanceof Error ? err.message : String(err)));
    }
  };
  
  // Función para actualizar base de datos de habitaciones
  const handleUpdateDatabase = async () => {
    if (ifcSpaces.length === 0) {
      setFragStatus("No hay espacios para actualizar");
      return;
    }
    
    try {
      const chunkSize = 300; // evita payloads grandes
      const total = ifcSpaces.length;
      for (let i = 0; i < total; i += chunkSize) {
        const chunk = ifcSpaces.slice(i, i + chunkSize);
        setFragStatus(`Actualizando base de datos... (${i + 1}-${Math.min(i + chunkSize, total)} de ${total})`);
        const response = await fetch('/api/ifcspace', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ifcSpaces: chunk, confirmDelete: i === 0 }) // solo borra en el primer batch
        });
        if (!response.ok) {
          let detail = '';
          try { detail = await response.text(); } catch {}
          setFragStatus(`Error al actualizar (HTTP ${response.status}) en lote ${i / chunkSize + 1}: ${detail || 'sin detalle'}`);
          return;
        }
      }
      setFragStatus("Base de datos actualizada correctamente");
    } catch (err) {
      setFragStatus("Error de conexión: " + (err instanceof Error ? err.message : String(err)));
    }
  };
  
  // Función para actualizar base de datos de actius
  const handleUpdateActius = async () => {
    if (ifcDoors.length === 0) {
      setFragStatus("No hay puertas para actualizar");
      return;
    }
    
    try {
      const chunkSize = 300;
      const total = ifcDoors.length;
      for (let i = 0; i < total; i += chunkSize) {
        const chunk = ifcDoors.slice(i, i + chunkSize);
        setFragStatus(`Actualizando actius... (${i + 1}-${Math.min(i + chunkSize, total)} de ${total})`);
        const response = await fetch('/api/actius', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ actius: chunk, confirmDelete: i === 0 })
        });
        if (!response.ok) {
          let detail = '';
          try { detail = await response.text(); } catch {}
          setFragStatus(`Error al actualizar actius (HTTP ${response.status}) en lote ${i / chunkSize + 1}: ${detail || 'sin detalle'}`);
          return;
        }
      }
      setFragStatus("Actius actualizados correctamente");
    } catch (err) {
      setFragStatus("Error de conexión: " + (err instanceof Error ? err.message : String(err)));
    }
  };
  
  // Cargar calibración de georreferenciación al montar
  useEffect(() => {
    const calib = loadGeorefCalibration();
    if (calib) {
      setGeorefCalibration(calib);
      setGeorefForm(calib);
    }
  }, []);
  
  // Función para guardar calibración de georreferenciación
  const handleSaveGeoref = () => {
    try {
      // Validar campos requeridos
      if (typeof georefForm.lat0 !== 'number' || isNaN(georefForm.lat0) ||
          typeof georefForm.lon0 !== 'number' || isNaN(georefForm.lon0)) {
        setGeorefStatus("Error: Latitud y longitud de referencia son requeridas");
        setTimeout(() => setGeorefStatus(""), 5000);
        return;
      }
      
      if (!georefForm.modelOrigin || 
          typeof georefForm.modelOrigin.x !== 'number' || isNaN(georefForm.modelOrigin.x) ||
          typeof georefForm.modelOrigin.y !== 'number' || isNaN(georefForm.modelOrigin.y) ||
          typeof georefForm.modelOrigin.z !== 'number' || isNaN(georefForm.modelOrigin.z)) {
        setGeorefStatus("Error: Origen del modelo (x, y, z) es requerido");
        setTimeout(() => setGeorefStatus(""), 5000);
        return;
      }
      
      const calib: GeorefCalibration = {
        lat0: georefForm.lat0,
        lon0: georefForm.lon0,
        alt0: georefForm.alt0 !== undefined ? georefForm.alt0 : undefined,
        modelOrigin: {
          x: georefForm.modelOrigin.x,
          y: georefForm.modelOrigin.y,
          z: georefForm.modelOrigin.z
        },
        headingDeg: georefForm.headingDeg !== undefined ? georefForm.headingDeg : 0,
        scale: georefForm.scale !== undefined ? georefForm.scale : 1
      };
      
      saveGeorefCalibration(calib);
      setGeorefCalibration(calib);
      setGeorefStatus("¡Calibración guardada correctamente!");
      setTimeout(() => setGeorefStatus(""), 5000);
    } catch (err) {
      setGeorefStatus("Error al guardar: " + (err instanceof Error ? err.message : String(err)));
      setTimeout(() => setGeorefStatus(""), 5000);
    }
  };
  
  // Función para cargar calibración existente
  const handleLoadGeoref = () => {
    const calib = loadGeorefCalibration();
    if (calib) {
      setGeorefForm(calib);
      setGeorefCalibration(calib);
      setGeorefStatus("Calibración cargada");
      setTimeout(() => setGeorefStatus(""), 3000);
    } else {
      setGeorefStatus("No hay calibración guardada");
      setTimeout(() => setGeorefStatus(""), 3000);
    }
  };
  
  // Función para eliminar calibración
  const handleClearGeoref = () => {
    if (window.confirm("¿Estás seguro de que quieres eliminar la calibración de georreferenciación?")) {
      localStorage.removeItem("ccspt:georef");
      setGeorefCalibration(null);
      setGeorefForm({
        lat0: 0,
        lon0: 0,
        alt0: 0,
        modelOrigin: { x: 0, y: 0, z: 0 },
        headingDeg: 0,
        scale: 1
      });
      setGeorefStatus("Calibración eliminada");
      setTimeout(() => setGeorefStatus(""), 3000);
    }
  };
  
  return (
    <div className="page-container">
      
      <div className="page-content">
        <div className="content-card">
          <h2>Configuración General</h2>
          <p>Ajusta las preferencias y configuraciones del sistema.</p>
          
          <div className="config-sections">
            
            
            <div className="config-section">
              <h3>Convertidor IFC a FRAG</h3>
              <p>Convierte archivos IFC al formato FRAG para su uso en el sistema.</p>
              <div className="config-item">
                <input
                  type="file"
                  accept=".ifc"
                  ref={ifcFileInputRef}
                  style={{ display: "none" }}
                  onChange={handleIfcFileChange}
                  disabled={ifcProcessing}
                />
                <button 
                  className="config-button primary"
                  onClick={() => ifcFileInputRef.current?.click()}
                  disabled={ifcProcessing}
                >
                  {ifcProcessing ? "Procesando..." : "Seleccionar y convertir IFC a FRAG"}
                </button>
                {ifcMessage && (
                  <div style={{ 
                    marginTop: '10px', 
                    padding: '10px', 
                    borderRadius: '4px',
                    backgroundColor: ifcMessage.startsWith("¡") ? '#d4edda' : '#f8d7da',
                    color: ifcMessage.startsWith("¡") ? '#155724' : '#721c24',
                    border: `1px solid ${ifcMessage.startsWith("¡") ? '#c3e6cb' : '#f5c6cb'}`
                  }}>
                    {ifcMessage}
                  </div>
                )}
              </div>
            </div>
            
            <div className="config-section">
              <h3>Importador de archivos FRAG</h3>
              <p>Importa archivos FRAG y actualiza la base de datos con espacios y activos.</p>
              <div className="config-item">
                <input
                  type="file"
                  accept=".frag"
                  ref={fragFileInputRef}
                  style={{ display: "none" }}
                  onChange={handleFragFileChange}
                />
                <button 
                  className="config-button primary"
                  onClick={() => fragFileInputRef.current?.click()}
                  style={{ marginRight: '10px' }}
                >
                  Seleccionar archivo FRAG
                </button>
                
                {ifcSpaces.length > 0 && (
                  <>
                    <button 
                      className="config-button secondary"
                      onClick={() => setTablePopupOpen(true)}
                      style={{ marginRight: '10px' }}
                    >
                      Ver Espacios ({ifcSpaces.length})
                    </button>
                    <button 
                      className="config-button primary"
                      onClick={handleUpdateDatabase}
                      style={{ marginRight: '10px' }}
                    >
                      Actualizar BD Espacios
                    </button>
                  </>
                )}
                
                {ifcDoors.length > 0 && (
                  <>
                    <button 
                      className="config-button secondary"
                      onClick={() => setActiusPopupOpen(true)}
                      style={{ marginRight: '10px' }}
                    >
                      Ver Puertas ({ifcDoors.length})
                    </button>
                    <button 
                      className="config-button primary"
                      onClick={handleUpdateActius}
                    >
                      Actualizar BD Actius
                    </button>
                  </>
                )}
                
                {fragStatus && (
                  <div style={{ 
                    marginTop: '10px', 
                    padding: '10px', 
                    borderRadius: '4px',
                    backgroundColor: fragStatus.startsWith("Error") ? '#f8d7da' : '#d1ecf1',
                    color: fragStatus.startsWith("Error") ? '#721c24' : '#0c5460',
                    border: `1px solid ${fragStatus.startsWith("Error") ? '#f5c6cb' : '#bee5eb'}`
                  }}>
                    {fragStatus}
                  </div>
                )}
              </div>
            </div>
            
            <div className="config-section">
              <h3>Georreferenciación del Modelo</h3>
              <p>Configura la calibración para posicionar elementos móviles en el modelo 3D usando coordenadas GPS.</p>
              
              {georefCalibration && (
                <div style={{ 
                  marginBottom: '15px', 
                  padding: '10px', 
                  backgroundColor: '#d1ecf1', 
                  borderRadius: '4px',
                  border: '1px solid #bee5eb'
                }}>
                  <strong>Calibración activa:</strong> Lat: {georefCalibration.lat0.toFixed(6)}°, 
                  Lon: {georefCalibration.lon0.toFixed(6)}°
                </div>
              )}
              
              <div className="config-item" style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <label style={{ display: 'flex', flexDirection: 'column', fontSize: '14px' }}>
                    Latitud de referencia (lat0) *
                    <input
                      type="number"
                      step="any"
                      value={georefForm.lat0}
                      onChange={(e) => setGeorefForm({ ...georefForm, lat0: parseFloat(e.target.value) || 0 })}
                      placeholder="41.557028"
                      style={{ padding: '8px', marginTop: '4px', borderRadius: '4px', border: '1px solid #ddd' }}
                    />
                  </label>
                  <label style={{ display: 'flex', flexDirection: 'column', fontSize: '14px' }}>
                    Longitud de referencia (lon0) *
                    <input
                      type="number"
                      step="any"
                      value={georefForm.lon0}
                      onChange={(e) => setGeorefForm({ ...georefForm, lon0: parseFloat(e.target.value) || 0 })}
                      placeholder="2.111394"
                      style={{ padding: '8px', marginTop: '4px', borderRadius: '4px', border: '1px solid #ddd' }}
                    />
                  </label>
                </div>
                
                <label style={{ display: 'flex', flexDirection: 'column', fontSize: '14px' }}>
                  Altitud de referencia (alt0) - Opcional
                  <input
                    type="number"
                    step="any"
                    value={georefForm.alt0 || ''}
                    onChange={(e) => setGeorefForm({ ...georefForm, alt0: e.target.value ? parseFloat(e.target.value) : undefined })}
                    placeholder="0"
                    style={{ padding: '8px', marginTop: '4px', borderRadius: '4px', border: '1px solid #ddd' }}
                  />
                </label>
                
                <div style={{ borderTop: '1px solid #dee2e6', paddingTop: '15px' }}>
                  <h4 style={{ marginTop: 0, marginBottom: '10px', fontSize: '16px' }}>Origen del Modelo (coordenadas 3D)</h4>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
                    <label style={{ display: 'flex', flexDirection: 'column', fontSize: '14px' }}>
                      X *
                      <input
                        type="number"
                        step="any"
                        value={georefForm.modelOrigin.x}
                        onChange={(e) => setGeorefForm({ 
                          ...georefForm, 
                          modelOrigin: { ...georefForm.modelOrigin, x: parseFloat(e.target.value) || 0 }
                        })}
                        placeholder="0"
                        style={{ padding: '8px', marginTop: '4px', borderRadius: '4px', border: '1px solid #ddd' }}
                      />
                    </label>
                    <label style={{ display: 'flex', flexDirection: 'column', fontSize: '14px' }}>
                      Y *
                      <input
                        type="number"
                        step="any"
                        value={georefForm.modelOrigin.y}
                        onChange={(e) => setGeorefForm({ 
                          ...georefForm, 
                          modelOrigin: { ...georefForm.modelOrigin, y: parseFloat(e.target.value) || 0 }
                        })}
                        placeholder="0"
                        style={{ padding: '8px', marginTop: '4px', borderRadius: '4px', border: '1px solid #ddd' }}
                      />
                    </label>
                    <label style={{ display: 'flex', flexDirection: 'column', fontSize: '14px' }}>
                      Z *
                      <input
                        type="number"
                        step="any"
                        value={georefForm.modelOrigin.z}
                        onChange={(e) => setGeorefForm({ 
                          ...georefForm, 
                          modelOrigin: { ...georefForm.modelOrigin, z: parseFloat(e.target.value) || 0 }
                        })}
                        placeholder="0"
                        style={{ padding: '8px', marginTop: '4px', borderRadius: '4px', border: '1px solid #ddd' }}
                      />
                    </label>
                  </div>
                </div>
                
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <label style={{ display: 'flex', flexDirection: 'column', fontSize: '14px' }}>
                    Rotación (headingDeg) - Opcional
                    <input
                      type="number"
                      step="any"
                      value={georefForm.headingDeg || ''}
                      onChange={(e) => setGeorefForm({ ...georefForm, headingDeg: e.target.value ? parseFloat(e.target.value) : 0 })}
                      placeholder="0"
                      style={{ padding: '8px', marginTop: '4px', borderRadius: '4px', border: '1px solid #ddd' }}
                    />
                    <small style={{ color: '#6b7280', marginTop: '4px' }}>Rotación para alinear el norte verdadero con el eje +Z del modelo (grados)</small>
                  </label>
                  <label style={{ display: 'flex', flexDirection: 'column', fontSize: '14px' }}>
                    Escala (scale) - Opcional
                    <input
                      type="number"
                      step="any"
                      value={georefForm.scale || ''}
                      onChange={(e) => setGeorefForm({ ...georefForm, scale: e.target.value ? parseFloat(e.target.value) : 1 })}
                      placeholder="1"
                      style={{ padding: '8px', marginTop: '4px', borderRadius: '4px', border: '1px solid #ddd' }}
                    />
                    <small style={{ color: '#6b7280', marginTop: '4px' }}>Multiplicador de escala (metros por metro), por defecto 1</small>
                  </label>
                </div>
                
                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginTop: '10px' }}>
                  <button 
                    className="config-button primary"
                    onClick={handleSaveGeoref}
                  >
                    Guardar Calibración
                  </button>
                  <button 
                    className="config-button secondary"
                    onClick={handleLoadGeoref}
                  >
                    Cargar Calibración Actual
                  </button>
                  {georefCalibration && (
                    <button 
                      className="config-button"
                      onClick={handleClearGeoref}
                      style={{ backgroundColor: '#dc3545', color: 'white' }}
                    >
                      Eliminar Calibración
                    </button>
                  )}
                </div>
                
                {georefStatus && (
                  <div style={{ 
                    marginTop: '10px', 
                    padding: '10px', 
                    borderRadius: '4px',
                    backgroundColor: georefStatus.startsWith("¡") || georefStatus.includes("cargada") ? '#d4edda' : 
                                    georefStatus.startsWith("Error") ? '#f8d7da' : '#d1ecf1',
                    color: georefStatus.startsWith("¡") || georefStatus.includes("cargada") ? '#155724' : 
                           georefStatus.startsWith("Error") ? '#721c24' : '#0c5460',
                    border: `1px solid ${georefStatus.startsWith("¡") || georefStatus.includes("cargada") ? '#c3e6cb' : 
                             georefStatus.startsWith("Error") ? '#f5c6cb' : '#bee5eb'}`
                  }}>
                    {georefStatus}
                  </div>
                )}
                
                <div style={{ 
                  marginTop: '15px', 
                  padding: '12px', 
                  backgroundColor: '#fff3cd', 
                  borderRadius: '4px',
                  border: '1px solid #ffc107',
                  fontSize: '13px',
                  color: '#856404'
                }}>
                  <strong>💡 Consejo:</strong> Para obtener las coordenadas del origen del modelo, puedes usar las herramientas de medición del visor 3D o consultar las propiedades del modelo IFC. 
                  La latitud y longitud de referencia deben ser un punto conocido en el mundo real que corresponda al origen del modelo.
                </div>
              </div>
            </div>
          </div>
          
          
        </div>
      </div>
      
      {/* Modal popup para tabla de espacios */}
      {tablePopupOpen && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            backgroundColor: 'white',
            borderRadius: '8px',
            padding: '20px',
            maxWidth: '95vw',
            maxHeight: '90vh',
            overflow: 'auto',
            position: 'relative'
          }}>
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center',
              marginBottom: '20px',
              borderBottom: '1px solid #dee2e6',
              paddingBottom: '10px'
            }}>
              <h3 style={{ margin: 0 }}>Espacios importados ({ifcSpaces.length})</h3>
              <button
                onClick={() => setTablePopupOpen(false)}
                style={{
                  backgroundColor: '#dc3545',
                  color: 'white',
                  border: 'none',
                  padding: '8px 12px',
                  borderRadius: '4px',
                  cursor: 'pointer'
                }}
              >
                ✕ Cerrar
              </button>
            </div>
            {/* Pagination controls */}
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
              <div>
                Página {spacesPage} / {Math.max(1, Math.ceil(ifcSpaces.length / pageSize))}
              </div>
              <div>
                <button disabled={spacesPage <= 1} onClick={() => setSpacesPage(p => Math.max(1, p - 1))} style={{ marginRight: 8 }}>Anterior</button>
                <button disabled={spacesPage >= Math.ceil(ifcSpaces.length / pageSize)} onClick={() => setSpacesPage(p => Math.min(Math.ceil(ifcSpaces.length / pageSize) || 1, p + 1))}>Siguiente</button>
              </div>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                <thead>
                  <tr style={{ backgroundColor: '#f5f5f5' }}>
                    <th style={{ border: '1px solid #ddd', padding: '8px' }}>Codi</th>
                    <th style={{ border: '1px solid #ddd', padding: '8px' }}>Dispositiu</th>
                    <th style={{ border: '1px solid #ddd', padding: '8px' }}>Edifici</th>
                    <th style={{ border: '1px solid #ddd', padding: '8px' }}>Planta</th>
                    <th style={{ border: '1px solid #ddd', padding: '8px' }}>Departament</th>
                    <th style={{ border: '1px solid #ddd', padding: '8px' }}>ID</th>
                    <th style={{ border: '1px solid #ddd', padding: '8px' }}>Centre Cost</th>
                    <th style={{ border: '1px solid #ddd', padding: '8px' }}>GUID</th>
                    <th style={{ border: '1px solid #ddd', padding: '8px' }}>Àrea</th>
                  </tr>
                </thead>
                <tbody>
                  {ifcSpaces.slice((spacesPage - 1) * pageSize, (spacesPage) * pageSize).map((space: HabitacionIFC, index: number) => (
                    <tr key={index}>
                      <td style={{ border: '1px solid #ddd', padding: '4px' }}>{space.codi}</td>
                      <td style={{ border: '1px solid #ddd', padding: '4px' }}>{space.dispositiu}</td>
                      <td style={{ border: '1px solid #ddd', padding: '4px' }}>{space.edifici}</td>
                      <td style={{ border: '1px solid #ddd', padding: '4px' }}>{space.planta}</td>
                      <td style={{ border: '1px solid #ddd', padding: '4px' }}>{space.departament}</td>
                      <td style={{ border: '1px solid #ddd', padding: '4px' }}>{space.id}</td>
                      <td style={{ border: '1px solid #ddd', padding: '4px' }}>{space.centre_cost}</td>
                      <td style={{ border: '1px solid #ddd', padding: '4px', fontSize: '10px' }}>{space.guid}</td>
                      <td style={{ border: '1px solid #ddd', padding: '4px' }}>{space.area}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
      
      {/* Modal popup para tabla de actius */}
      {actiusPopupOpen && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            backgroundColor: 'white',
            borderRadius: '8px',
            padding: '20px',
            maxWidth: '95vw',
            maxHeight: '90vh',
            overflow: 'auto',
            position: 'relative'
          }}>
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center',
              marginBottom: '20px',
              borderBottom: '1px solid #dee2e6',
              paddingBottom: '10px'
            }}>
              <h3 style={{ margin: 0 }}>Puertas importadas ({ifcDoors.length})</h3>
              <button
                onClick={() => setActiusPopupOpen(false)}
                style={{
                  backgroundColor: '#dc3545',
                  color: 'white',
                  border: 'none',
                  padding: '8px 12px',
                  borderRadius: '4px',
                  cursor: 'pointer'
                }}
              >
                ✕ Cerrar
              </button>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                <thead>
                  <tr style={{ backgroundColor: '#f5f5f5' }}>
                    <th style={{ border: '1px solid #ddd', padding: '8px' }}>GUID</th>
                    <th style={{ border: '1px solid #ddd', padding: '8px' }}>Tipus</th>
                    <th style={{ border: '1px solid #ddd', padding: '8px' }}>Subtipus</th>
                    <th style={{ border: '1px solid #ddd', padding: '8px' }}>Edifici</th>
                    <th style={{ border: '1px solid #ddd', padding: '8px' }}>Planta</th>
                    <th style={{ border: '1px solid #ddd', padding: '8px' }}>Zona</th>
                    <th style={{ border: '1px solid #ddd', padding: '8px' }}>Ubicacio</th>
                  </tr>
                </thead>
                <tbody>
                  {ifcDoors.map((door: ActiuIFC, index: number) => (
                    <tr key={index}>
                      <td style={{ border: '1px solid #ddd', padding: '4px', fontSize: '10px' }}>{door.guid}</td>
                      <td style={{ border: '1px solid #ddd', padding: '4px' }}>{door.tipus}</td>
                      <td style={{ border: '1px solid #ddd', padding: '4px' }}>{door.subtipus}</td>
                      <td style={{ border: '1px solid #ddd', padding: '4px' }}>{door.edifici}</td>
                      <td style={{ border: '1px solid #ddd', padding: '4px' }}>{door.planta}</td>
                      <td style={{ border: '1px solid #ddd', padding: '4px' }}>{door.zona}</td>
                      <td style={{ border: '1px solid #ddd', padding: '4px' }}>{door.ubicacio}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Config;
