import * as BUI from "@thatopen/ui";
import * as OBC from "@thatopen/components";
import * as OBF from "@thatopen/components-front";
import * as FRAGS from "@thatopen/fragments";
import * as THREE from "three";
import { appIcons, modelStore, BUILDINGS } from "../../globals";
import { ClassificationUtils } from "../../utils/ClassificationUtils";
import { ensureGlobalMarkerCSS, createSpaceMarker } from "../../bim/Markers";

export interface ActiusPanelState {
  components: OBC.Components;
  searchQuery?: string;
  // Filter state
  selectedBuildings?: string[]; // array of building codes (codi)
  buildingsList?: Array<{ guid: string; nom: string; codi: string; id?: number; centre_cost?: string | null }>;
  showFilterModal?: boolean;
  tempSelectedBuildings?: string[];
  // Planta filter
  selectedFloors?: string[]; // a.planta values
  tempSelectedFloors?: string[];
  activeFilterTab?: 'edifici' | 'planta';
  availableFloors?: string[];
  searchResults?: Array<{
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
  }>;
  // Details modal state
  showActiuModal?: boolean;
  selectedActiuGuid?: string;
  selectedActiuDetail?: any;
  activeDetailsTab?: 'informacio' | 'imatges' | 'manteniment';
  // Images tab
  actiuImages?: Array<{ id: string; url: string; thumbUrl: string; filename: string; mime?: string; size?: number; createdAt?: string }>
  uploading?: boolean;
  // Lightbox
  lightboxUrl?: string | null;
  // Camera modal
  showCamera?: boolean;
  cameraStream?: MediaStream | null;
  // Maintenance tab
  maintenanceRecords?: Array<any>;
  maintenanceLoading?: boolean;
  maintenanceCreating?: boolean;
  maintenanceNew?: {
    performedAt?: string;
    periodMonths?: number;
    periodDays?: number;
    responsible?: string;
    incidents?: string;
    correctiveActions?: string;
  };
  maintenanceUploadingFor?: string | null; // recordId currently uploading attachments
}

const originalColors = new Map<
  FRAGS.BIMMaterial,
  { color: number; transparent: boolean; opacity: number }
>();

const setModelTransparent = (components: OBC.Components) => {
  const fragments = components.get(OBC.FragmentsManager);
  const materials = [...fragments.core.models.materials.list.values()];
  for (const material of materials) {
    if (material.userData.customId) continue;
    let color: number | undefined;
    if ("color" in material) color = material.color.getHex();
    else color = material.lodColor.getHex();
    originalColors.set(material, {
      color,
      transparent: material.transparent,
      opacity: material.opacity,
    });
    material.transparent = true;
    material.opacity = 0.05;
    material.needsUpdate = true;
    if ("color" in material) material.color.setColorName("white");
    else material.lodColor.setColorName("white");
  }
};

const restoreModelMaterials = () => {
  for (const [material, data] of originalColors) {
    const { color, transparent, opacity } = data;
    material.transparent = transparent;
    material.opacity = opacity;
    if ("color" in material) material.color.setHex(color);
    else material.lodColor.setHex(color);
    material.needsUpdate = true;
  }
  originalColors.clear();
};

export const actiusPanelTemplate: BUI.StatefullComponent<ActiusPanelState> = (
  state,
  update,
) => {
  const components = state.components;

  // const escapeRegExp = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

  const exportToExcel = (results: Array<any>) => {
    if (!results || results.length === 0) return;
    
    // Create CSV content with proper formatting for Excel
    const headers = ['GUID', 'Departament', 'Dispositiu', 'Edifici', 'Planta', 'Zona', 'Space Dispositiu', 'Àrea Total (m²)', 'Nombre d\'Elements'];
    const csvRows = [headers.join(';')]; // Use semicolon for European Excel
    
    results.forEach(result => {
      const row = [
        (result.guid || '').toString().replace(/"/g, '""'),
        (result.departament || '').toString().replace(/"/g, '""'),
        (result.dispositiu || '').toString().replace(/"/g, '""'),
        (result.edifici || '').toString().replace(/"/g, '""'),
        (result.planta || '').toString().replace(/"/g, '""'),
        (result.zona || '').toString().replace(/"/g, '""'),
        (result.space_dispositiu || '').toString().replace(/"/g, '""'),
        typeof result.total_area === 'number' ? result.total_area.toString().replace('.', ',') : (parseFloat(result.total_area) || 0).toString().replace('.', ','),
        typeof result.element_count === 'number' ? result.element_count.toString() : (parseInt(result.element_count) || 0).toString()
      ];
      csvRows.push(row.map(cell => `"${cell}"`).join(';'));
    });
    
    // Add UTF-8 BOM for proper Excel encoding
    const csvContent = '\uFEFF' + csvRows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `actius-resultats-${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Lightbox helpers
  const openLightbox = (url: string) => { state.lightboxUrl = url; update(state); };
  const closeLightbox = () => { state.lightboxUrl = null; update(state); };

  // Camera helpers
  const openCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      state.cameraStream = stream;
      state.showCamera = true;
      update(state);
      setTimeout(() => {
        const v = document.getElementById('actiu-camera-video') as HTMLVideoElement | null;
        if (v && stream) { v.srcObject = stream; v.play().catch(() => {}); }
      }, 0);
    } catch (e) {
      console.warn('No es pot obrir la càmera', e);
      alert('No es pot obrir la càmera en aquest dispositiu o sense permisos.');
    }
  };

  const closeCamera = () => {
    try { state.cameraStream?.getTracks().forEach(t => t.stop()); } catch {}
    state.cameraStream = null;
    state.showCamera = false;
    update(state);
  };

  const capturePhoto = async () => {
    try {
      const video = document.getElementById('actiu-camera-video') as HTMLVideoElement | null;
      if (!video) return;
      const canvas = document.createElement('canvas');
      const w = video.videoWidth || 1280;
      const h = video.videoHeight || 720;
      canvas.width = w; canvas.height = h;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.drawImage(video, 0, 0, w, h);
      const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob((b) => resolve(b), 'image/jpeg', 0.92));
      if (!blob) return;
      const file = new File([blob], `photo-${Date.now()}.jpg`, { type: 'image/jpeg' });
      await uploadActiuImages([file]);
      closeCamera();
    } catch (e) { console.error('Error capturant foto', e); }
  };

  // Details modal helpers
  const openActiuModal = async (guid: string) => {
    try {
      state.selectedActiuGuid = guid;
      state.activeDetailsTab = state.activeDetailsTab || 'informacio';
      state.showActiuModal = true;
      update(state);

      const resp = await fetch(`/api/actius/${encodeURIComponent(guid)}`, { headers: { Accept: 'application/json' } });
      if (!resp.ok) {
        console.warn('No s\'han pogut obtenir els detalls de l\'actiu');
        return;
      }
      const detail = await resp.json();
      state.selectedActiuDetail = detail;
      // Preload images list when opening
      try {
        const r2 = await fetch(`/api/actius/${encodeURIComponent(guid)}/images`, { headers: { Accept: 'application/json' } });
        if (r2.ok) state.actiuImages = await r2.json(); else state.actiuImages = [];
      } catch { state.actiuImages = []; }
      update(state);
    } catch (e) {
      console.error('Error obrint el modal d\'actiu:', e);
    }
  };

  // Maintenance helpers
  const loadMaintenanceRecords = async () => {
    const guid = state.selectedActiuGuid;
    if (!guid) return;
    try {
      state.maintenanceLoading = true;
      update(state);
      const r = await fetch(`/api/actius/${encodeURIComponent(guid)}/maintenance`, { headers: { Accept: 'application/json' } });
      if (!r.ok) throw new Error('No s\'han pogut carregar els registres');
      const records = await r.json();
      // Fetch attachments per record
      const withAtt = await Promise.all((records || []).map(async (rec: any) => {
        try {
          const ra = await fetch(`/api/actius/${encodeURIComponent(guid)}/maintenance/${encodeURIComponent(rec.id)}/attachments`, { headers: { Accept: 'application/json' } });
          rec.attachments = ra.ok ? await ra.json() : [];
        } catch { rec.attachments = []; }
        return rec;
      }));
      state.maintenanceRecords = withAtt;
    } catch (err) {
      console.warn('Error carregant manteniment:', err);
      state.maintenanceRecords = [];
    } finally {
      state.maintenanceLoading = false;
      update(state);
    }
  };

  const createMaintenanceRecord = async () => {
    const guid = state.selectedActiuGuid;
    if (!guid) return;
    const payload = {
      performedAt: state.maintenanceNew?.performedAt || null,
      nextPlannedAt: null,
      periodMonths: Number(state.maintenanceNew?.periodMonths || 0) || 0,
      periodDays: Number(state.maintenanceNew?.periodDays || 0) || 0,
      responsible: state.maintenanceNew?.responsible || '',
      incidents: state.maintenanceNew?.incidents || '',
      correctiveActions: state.maintenanceNew?.correctiveActions || '',
      checklist: null,
    };
    try {
      state.maintenanceCreating = true;
      update(state);
      const r = await fetch(`/api/actius/${encodeURIComponent(guid)}/maintenance`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!r.ok) throw new Error('No s\'ha pogut crear el registre');
      // reload
      state.maintenanceNew = {};
      await loadMaintenanceRecords();
    } catch (e) {
      console.error(e);
    } finally {
      state.maintenanceCreating = false;
      update(state);
    }
  };

  const deleteMaintenanceRecord = async (recordId: string) => {
    const guid = state.selectedActiuGuid;
    if (!guid) return;
    if (!confirm('Eliminar aquest registre de manteniment?')) return;
    try {
      const r = await fetch(`/api/actius/${encodeURIComponent(guid)}/maintenance/${encodeURIComponent(recordId)}`, { method: 'DELETE' });
      if (!r.ok) throw new Error('No s\'ha pogut eliminar');
      await loadMaintenanceRecords();
    } catch (e) {
      console.error(e);
    }
  };

  const uploadMaintenanceAttachments = async (recordId: string, files: FileList) => {
    const guid = state.selectedActiuGuid;
    if (!guid || !files || files.length === 0) return;
    try {
      state.maintenanceUploadingFor = recordId;
      update(state);
      const fd = new FormData();
      Array.from(files).forEach((f) => fd.append('files', f));
      const r = await fetch(`/api/actius/${encodeURIComponent(guid)}/maintenance/${encodeURIComponent(recordId)}/attachments`, { method: 'POST', body: fd });
      if (!r.ok) throw new Error('Error pujant fitxers');
      await loadMaintenanceRecords();
    } catch (e) {
      console.error(e);
    } finally {
      state.maintenanceUploadingFor = null;
      update(state);
    }
  };

  const deleteMaintenanceAttachment = async (recordId: string, attachmentId: string) => {
    const guid = state.selectedActiuGuid;
    if (!guid) return;
    if (!confirm('Eliminar aquest fitxer?')) return;
    try {
      const r = await fetch(`/api/actius/${encodeURIComponent(guid)}/maintenance/${encodeURIComponent(recordId)}/attachments/${encodeURIComponent(attachmentId)}`, { method: 'DELETE' });
      if (!r.ok) throw new Error('No s\'ha pogut eliminar el fitxer');
      await loadMaintenanceRecords();
    } catch (e) {
      console.error(e);
    }
  };

  // Images helpers
  const reloadActiuImages = async () => {
    const guid = state.selectedActiuGuid;
    if (!guid) return;
    try {
      const r = await fetch(`/api/actius/${encodeURIComponent(guid)}/images`, { headers: { Accept: 'application/json' } });
      if (r.ok) state.actiuImages = await r.json(); else state.actiuImages = [];
    } catch { state.actiuImages = []; }
    update(state);
  };

  const uploadActiuImages = async (files: FileList | File[]) => {
    const guid = state.selectedActiuGuid;
    if (!guid || !files || (files as any).length === 0) return;
    const form = new FormData();
    const fileArray: File[] = Array.isArray(files) ? (files as File[]) : Array.from(files as FileList);
    for (const f of fileArray) {
      form.append('files', f);
    }
    state.uploading = true; update(state);
    try {
      const r = await fetch(`/api/actius/${encodeURIComponent(guid)}/images`, { method: 'POST', body: form });
      if (!r.ok) {
        const t = await r.text();
        console.warn('Upload error', r.status, t);
      }
      await reloadActiuImages();
    } catch (e) {
      console.error('Error pujant imatges', e);
    } finally {
      state.uploading = false; update(state);
    }
  };

  const deleteActiuImage = async (id: string) => {
    const guid = state.selectedActiuGuid;
    if (!guid) return;
    try {
      const r = await fetch(`/api/actius/images/${encodeURIComponent(id)}?guid=${encodeURIComponent(guid)}`, { method: 'DELETE' });
      if (!r.ok) {
        console.warn('Delete error', r.status);
      } else {
        await reloadActiuImages();
      }
    } catch (e) { console.error('Error eliminant imatge', e); }
  };

  const closeActiuModal = () => {
    state.showActiuModal = false;
    state.selectedActiuGuid = undefined;
    state.selectedActiuDetail = undefined;
    update(state);
  };

  const performSearch = async (query: string) => {
    if (!query || query.trim().length < 2) {
      state.searchResults = [];
      update(state);
      return;
    }

    try {
      console.log(`🔍 Buscando: "${query}"`);
      const edificis = (state.selectedBuildings && state.selectedBuildings.length > 0)
        ? `&edificis=${encodeURIComponent(state.selectedBuildings.join(','))}`
        : '';
      const plantes = (state.selectedFloors && state.selectedFloors.length > 0)
        ? `&plantes=${encodeURIComponent(state.selectedFloors.join(','))}`
        : '';
      const url = `/api/actius/search-all?query=${encodeURIComponent(query.trim())}${edificis}${plantes}`;
      const resp = await fetch(url, { headers: { Accept: 'application/json' } });
      
      if (!resp.ok) {
        console.error(`❌ Error en búsqueda: ${resp.status}`);
        return;
      }

      const results = await resp.json();
      console.log(`✅ Resultados encontrados: ${results.length}`);
      
      state.searchResults = results;
      update(state);
    } catch (error) {
      console.error('❌ Error al buscar:', error);
    }
  };

  // Función para cargar edificio basada en el código
  const loadBuildingByCode = async (buildingCode: string) => {
    try {
      console.log(`🏢 Cargando edificio: ${buildingCode}`);
      
      const fragments = components.get(OBC.FragmentsManager);
      
      // Lista de archivos conocidos para cada edificio
      const buildingFiles: Record<string, string[]> = {
        'TAU': ['CCSPT-TAU-M3D-AS.frag'],
        'TOC': ['CCSPT-TOC-M3D-AS.frag'],
        'ALB': ['CCSPT-ALB-M3D-AS.frag'],
        'CQA': ['CCSPT-CQA-M3D-AS.frag'],
        'MIN': ['CCSPT-MIN-M3D-AS.frag'],
        'UDI': ['CCSPT-UDI-M3D-AS.frag', 'CCSPT-UDI-M3D-ME.frag'],
        'VII': ['CCSPT-VII-M3D-AS.frag']
      };

      const filesToLoad = buildingFiles[buildingCode] || [];
      if (filesToLoad.length === 0) {
        console.warn(`⚠️ No se encontraron archivos para el edificio ${buildingCode}`);
        return false;
      }

      console.log(`📁 Archivos a cargar: ${filesToLoad.join(', ')}`);

      // Cargar todos los archivos del edificio
      for (const fileName of filesToLoad) {
        console.log(`📥 Cargando archivo: ${fileName}`);

        const response = await fetch(`/models/${fileName}`);
        if (!response.ok) {
          console.error(`❌ Error loading file: ${fileName} - ${response.status} ${response.statusText}`);
          continue;
        }

        const buffer = await response.arrayBuffer();
        const bytes = new Uint8Array(buffer);
        const modelId = fileName.replace(".frag", "");
        
        await fragments.core.load(bytes, {
          modelId: modelId,
        });

        console.log(`✅ Modelo ${fileName} cargado exitosamente con ID: ${modelId}`);
      }

             // Guardar edificio activo en el store
       modelStore.setActiveBuilding(buildingCode);
       
       // Actualizar la escena
       await fragments.core.update(true);
       
       // Actualizar el selector de edificios para mostrar el edificio cargado
       const buildingSelector = document.querySelector('select[style*="flex: 1"]') as HTMLSelectElement;
       if (buildingSelector) {
         buildingSelector.value = buildingCode;
         console.log(`🏢 Selector de edificios actualizado a: ${buildingCode}`);
       }
       
       // Forzar actualización de la interfaz del panel de edificios
       setTimeout(() => {
         // Disparar evento para actualizar la interfaz
         window.dispatchEvent(new CustomEvent('ccspt:building-loaded', { 
           detail: { buildingCode, fragments }, 
           bubbles: true, 
           composed: true 
         }));
         console.log(`🔄 Evento de actualización disparado para edificio: ${buildingCode}`);
       }, 100);

             // Enfocar la cámara en los modelos cargados
       try {
         const worlds = components.get(OBC.Worlds);
         const worldKeys = Array.from(worlds.list.keys());
         const worldId = worldKeys[0];
         const world = worlds.list.get(worldId);

         if (world && world.camera instanceof OBC.SimpleCamera) {
           await world.camera.fitToItems();
           console.log(`✅ Cámara enfocada en edificio ${buildingCode}`);
         }
       } catch (error) {
         console.warn('⚠️ No se pudo enfocar la cámara:', error);
       }

       // Clasificar los elementos por niveles (plantas) usando ClassificationUtils
       console.log('=== INICIANDO CLASIFICACIÓN DINÁMICA DE ELEMENTOS ===');

       const classificationUtils = new ClassificationUtils(components);

       // Obtener los niveles disponibles del edificio
       const availableLevels = await classificationUtils.getAvailableLevels();
       console.log('📋 Niveles disponibles:', availableLevels);

       // Crear clasificación dinámica para todos los niveles
       const levelsClassification = await classificationUtils.createDynamicLevelClassification(availableLevels);
       console.log('🏗️ Clasificación dinámica creada:', levelsClassification);

       // Generar datos de pisos para el store
       let floorData = [];
       if (levelsClassification) {
         console.log('📊 Procesando datos de pisos...');
         for (const [groupName] of levelsClassification) {
           console.log(`  📋 Procesando nivel: ${groupName}`);

           floorData.push({
             Name: { value: groupName },
             expressID: groupName,
           });
         }
         console.log('✅ Pisos procesados:', floorData);
       } else {
         console.warn('❌ No se pudo crear la clasificación dinámica');
       }

       console.log('=== FINALIZADA CLASIFICACIÓN DINÁMICA ===');

       // Usar el store para actualizar el floor-selector
       modelStore.setModelsLoaded(fragments, floorData, levelsClassification);

       console.log('Estado del store actualizado con plantas:', floorData);

       return true;
     } catch (error) {
       console.error('❌ Error cargando edificio:', error);
       return false;
     }
   };

           // Función para limpiar el efecto fantasma y highlights de departamentos y dispositivos
      const clearDepartmentFocus = async () => {
        const highlighter = components.get(OBF.Highlighter);
        
        // Limpiar highlights de departamentos
        for (const [styleName] of highlighter.styles) {
          if (typeof styleName === "string" && (styleName.startsWith("dept-focus:") || styleName.startsWith("device-focus:") || styleName.startsWith("dept-ghost:"))) {
            await highlighter.clear(styleName);
            highlighter.styles.delete(styleName);
          }
        }
        
        // Restaurar materiales originales
        restoreModelMaterials();
        
        // Limpiar markers
        const marker = components.get(OBF.Marker);
        marker.list.clear();
        
        console.log('🧹 Efecto fantasma y highlights limpiados');
      };

      // Función para enfocar en un dispositivo específico con efecto fantasma
      const focusOnDevice = async (deviceGuid: string, deviceName: string) => {
        try {
          const fragments = components.get(OBC.FragmentsManager);
          const marker = components.get(OBF.Marker);
          const highlighter = components.get(OBF.Highlighter);

          marker.threshold = 10;
          
          // Limpiar markers existentes
          console.log(`🧹 Limpiando markers existentes...`);
          marker.list.clear();
          
          // Limpiar cualquier elemento CSS2D que pueda haber quedado
          const existingMarkers = document.querySelectorAll('[data-marker]');
          existingMarkers.forEach(el => el.remove());
          console.log(`🧹 Markers limpiados: ${existingMarkers.length} elementos CSS2D removidos`);
          
          // Limpiar estilos de highlight anteriores
          for (const [styleName] of highlighter.styles) {
            if (typeof styleName === "string" && styleName.startsWith("device-focus:")) {
              await highlighter.clear(styleName);
              highlighter.styles.delete(styleName);
            }
          }
          
          // Aplicar efecto fantasma al modelo completo
          setModelTransparent(components);
          
          console.log(`🎯 Enfocando dispositivo: ${deviceName} con GUID: ${deviceGuid}`);
          
          // Obtener el ModelIdMap para este dispositivo
          const modelIdMap = await fragments.guidsToModelIdMap(new Set([deviceGuid]));
          if (!modelIdMap || Object.keys(modelIdMap).length === 0) {
            console.warn(`⚠️ No se pudo encontrar el dispositivo ${deviceGuid} en los modelos cargados`);
            return;
          }
          
          console.log(`🔍 ModelIdMap obtenido para dispositivo:`, modelIdMap);
          
          // Aplicar highlight al dispositivo seleccionado
          console.log(`🎨 Aplicando highlight al dispositivo: ${deviceName}`);
          const styleName = `device-focus:${deviceGuid}`;
          const highlightColor = new THREE.Color().setHSL(0.3, 0.8, 0.6); // Verde brillante para dispositivos
          
          highlighter.styles.set(styleName, {
            color: highlightColor,
            renderedFaces: FRAGS.RenderedFaces.ONE,
            opacity: 1,
            transparent: false,
          });
          
          // Convertir arrays a Set<number> para cumplir con el tipo ModelIdMap
          const finalSetMap: Record<string, Set<number>> = {};
          for (const [modelId, ids] of Object.entries(modelIdMap)) {
            finalSetMap[modelId] = new Set(Array.isArray(ids) ? ids : Array.from(ids as any));
          }
          
          // Aplicar el highlight
          await highlighter.highlightByID(styleName, finalSetMap as any, false, false);
          console.log(`✅ Highlight aplicado al dispositivo ${deviceName}`);
          
          // Crear marker para el dispositivo
          const worlds = components.get(OBC.Worlds);
          const worldKeys = Array.from(worlds.list.keys());
          const worldId = worldKeys[0];
          const world = worlds.list.get(worldId);
          
          if (world) {
            console.log(`🏷️ Creando marker para dispositivo: ${deviceName}`);
            
            for (const [modelId, localIds] of Object.entries(modelIdMap)) {
              console.log(`🔍 Procesando modelo ${modelId} con ${localIds.size} elementos`);
              
              // Obtener el modelo correspondiente
              const model = fragments.list.get(modelId);
              if (!model) {
                console.warn(`⚠️ Modelo ${modelId} no encontrado en fragments.list`);
                continue;
              }
              
              // Convertir Set a Array para getPositions
              const localIdsArray = Array.from(localIds);
              console.log(`📋 Intentando obtener posiciones para ${localIdsArray.length} elementos en modelo ${modelId}`);
              
              try {
                // Obtener todas las posiciones de una vez
                const positions = await model.getPositions(localIdsArray);
                console.log(`📊 Posiciones obtenidas:`, positions);
                
                if (positions && positions.length > 0) {
                  // Crear un marker para cada posición
                  for (let i = 0; i < positions.length; i++) {
                    const elementPosition = positions[i];
                    
                    console.log(`✅ Posición encontrada para dispositivo ${deviceName}:`, elementPosition);
                    
                    // Crear el elemento 2D con el nombre del dispositivo (unificado)
                    console.log(`🎨 Creando marker con texto: "${deviceName}"`);
                    ensureGlobalMarkerCSS();
                    const markerElement = createSpaceMarker(deviceName);
                    
                    // Crear el marker en la posición del elemento
                    try {
                      console.log(`🎯 Intentando crear marker:`, {
                        world: world,
                        markerElement: markerElement,
                        position: elementPosition,
                        deviceName: deviceName
                      });
                      
                      // Para actius: sin offset, colocar etiqueta exactamente en la posición del elemento
                      marker.create(world, markerElement as unknown as HTMLElement, elementPosition);
                      console.log(`📍 Marker creado para ${deviceName} en posición exacta:`, elementPosition);
                    } catch (markerError) {
                      console.error(`❌ Error al crear marker para ${deviceName}:`, markerError);
                    }
                  }
                } else {
                  console.warn(`⚠️ No se encontraron posiciones para el dispositivo en modelo ${modelId}`);
                }
              } catch (error) {
                console.warn(`⚠️ No se pudieron obtener posiciones para modelo ${modelId}:`, error);
              }
            }
          }
          
          // Enfocar la cámara en el dispositivo
          const allIds = Object.values(finalSetMap).flatMap(set => Array.from(set));
          console.log(`📊 finalSetMap:`, finalSetMap);
          console.log(`📊 allIds:`, allIds);
          
          if (allIds.length > 0) {
            console.log(`📷 Centrando cámara en dispositivo ${deviceName}`);
            
            if (world && world.camera instanceof OBC.SimpleCamera) {
              try {
                await world.camera.fitToItems(finalSetMap);
                console.log(`✅ Cámara centrada en dispositivo ${deviceName}`);
              } catch (error) {
                console.error('❌ Error al centrar cámara:', error);
              }
            } else {
              console.warn('⚠️ No se pudo acceder a la cámara para enfocar');
            }
          } else {
            console.warn('⚠️ No hay elementos para enfocar');
          }
          
        } catch (error) {
          console.error("Error al enfocar dispositivo:", error);
        }
      };

     const updateLegendDisplay = (legendItems: { name: string; color: string; count: number }[]) => {
     console.log(`🎨 Actualizando display de leyenda con ${legendItems.length} elementos`);
     const legendContent = document.getElementById('legend-content');
     if (!legendContent) {
       console.warn('❌ No se encontró el elemento legend-content');
       return;
     }
     
           legendContent.innerHTML = legendItems.map((item, index) => `
        <div 
          title="${item.name}" 
          data-department="${item.name}"
          style="display: flex; align-items: center; gap: 0.5rem; padding: 0.35rem 0.25rem; border-radius: 0.375rem; color: var(--bim-ui_bg-contrast-100); cursor: pointer; transition: background-color 0.2s ease;"
          onmouseover="this.style.backgroundColor='var(--bim-ui_bg-contrast-30)'"
          onmouseout="this.style.backgroundColor='transparent'"
          onclick="window.dispatchEvent(new CustomEvent('ccspt:focus-department', { detail: { department: '${item.name}', index: ${index} } }))"
        >
          <span style="width: 14px; height: 14px; border-radius: 2px; background: ${item.color}; border: 1px solid var(--bim-ui_bg-contrast-80);"></span>
          <span style="flex: 1; font-size: 0.92rem; font-weight: 600; letter-spacing: 0.2px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${item.name}</span>
          <span style="color: var(--bim-ui_bg-contrast-80); font-size: 0.85rem; font-weight: 600; font-variant-numeric: tabular-nums; min-width: 2.5rem; text-align: right;">${(typeof item.count === 'number' ? item.count : 0).toFixed(1)} m²</span>
        </div>
      `).join('');
   };

               const focusOnDepartment = async (departmentName: string) => {
       try {
                  const fragments = components.get(OBC.FragmentsManager);
          const marker = components.get(OBF.Marker);
          const highlighter = components.get(OBF.Highlighter);

          marker.threshold = 10;
          
          // Limpiar markers existentes de forma más agresiva
          console.log(`🧹 Limpiando markers existentes...`);
          marker.list.clear();
          
          // También limpiar cualquier elemento CSS2D que pueda haber quedado
          const existingMarkers = document.querySelectorAll('[data-marker]');
          existingMarkers.forEach(el => el.remove());
          console.log(`🧹 Markers limpiados: ${existingMarkers.length} elementos CSS2D removidos`);
          
          // Limpiar estilos de highlight anteriores
          for (const [styleName] of highlighter.styles) {
            if (typeof styleName === "string" && styleName.startsWith("dept-focus:")) {
              await highlighter.clear(styleName);
              highlighter.styles.delete(styleName);
            }
          }
          
          // Aplicar efecto fantasma al modelo completo
          setModelTransparent(components);
        
        // Buscar el departamento en los datos actuales
        const { activeBuildingCode, activeFloorCode } = modelStore.getState();
        if (!activeBuildingCode) return;
        
        let plantaQuery = '';
        if (activeFloorCode) {
          plantaQuery = `&planta=${encodeURIComponent(activeFloorCode)}`;
        }
        const url = `/api/ifcspace/departaments?edifici=${encodeURIComponent(activeBuildingCode)}${plantaQuery}`;
        const resp = await fetch(url, { headers: { Accept: 'application/json' } });
        if (!resp.ok) return;
        
        const departaments = await resp.json();
        const targetDept = departaments.find((d: any) => d.departament === departmentName);
        if (!targetDept || !Array.isArray(targetDept.guids)) return;
        

        
                 console.log(`🎯 Enfocando cámara en departamento: ${departmentName} con ${targetDept.guids.length} elementos`);
         
         // Obtener información detallada de los elementos (incluyendo dispositivos)
         const guidsParam = targetDept.guids.join(',');
         const deviceUrl = `/api/ifcspace/devices?guids=${encodeURIComponent(guidsParam)}&edifici=${encodeURIComponent(activeBuildingCode)}`;
         const deviceResp = await fetch(deviceUrl, { headers: { Accept: 'application/json' } });
         let deviceData: any[] = [];
         if (deviceResp.ok) {
           deviceData = await deviceResp.json();
           console.log(`📱 Datos de dispositivos obtenidos: ${deviceData.length} elementos`);
           if (deviceData.length > 0) {
             console.log(`📱 Primeros 3 dispositivos:`, deviceData.slice(0, 3));
             console.log(`📱 Estructura de datos:`, deviceData[0]);
           }
           console.log(`📱 Todos los GUIDs solicitados:`, targetDept.guids.slice(0, 5));
           console.log(`📱 GUIDs encontrados en deviceData:`, deviceData.map((d: any) => d.guid).slice(0, 5));
         } else {
           console.warn(`⚠️ No se pudieron obtener datos de dispositivos: ${deviceResp.status}`);
           const errorText = await deviceResp.text();
           console.warn(`⚠️ Error response:`, errorText);
         }
        
                          // Obtener el ModelIdMap para este departamento
         const modelIdMap = await fragments.guidsToModelIdMap(new Set(targetDept.guids));
         if (!modelIdMap) return;
         
         console.log(`🔍 ModelIdMap obtenido:`, modelIdMap);
         console.log(`📊 GUIDs del departamento:`, targetDept.guids.slice(0, 5));
         
         // Aplicar highlight al departamento seleccionado
         console.log(`🎨 Aplicando highlight al departamento: ${departmentName}`);
         const styleName = `dept-focus:${departmentName}`;
         const highlightColor = new THREE.Color().setHSL(0.6, 0.8, 0.6); // Azul brillante
         
         highlighter.styles.set(styleName, {
           color: highlightColor,
           renderedFaces: FRAGS.RenderedFaces.ONE,
           opacity: 1,
           transparent: false,
         });
         
         // Convertir arrays a Set<number> para cumplir con el tipo ModelIdMap
         const finalSetMap: Record<string, Set<number>> = {};
         for (const [modelId, ids] of Object.entries(modelIdMap)) {
           finalSetMap[modelId] = new Set(Array.isArray(ids) ? ids : Array.from(ids as any));
         }
         
         // Aplicar el highlight
         await highlighter.highlightByID(styleName, finalSetMap as any, false, false);
         console.log(`✅ Highlight aplicado al departamento ${departmentName}`);
         
         // Verificar qué GUIDs están realmente disponibles en los modelos
         console.log(`📋 Modelos cargados:`, Array.from(fragments.list.keys()));
         
         // Intentar obtener posiciones usando un enfoque diferente
         console.log(`🔍 Intentando obtener posiciones usando fragments.core.models`);
         const models = fragments.core.models;
         console.log(`📊 Modelos disponibles en core:`, Array.from(models.list.keys()));
        
        // Crear markers para cada elemento
        const worlds = components.get(OBC.Worlds);
        const worldKeys = Array.from(worlds.list.keys());
        const worldId = worldKeys[0];
        const world = worlds.list.get(worldId);
        
                 if (world) {
           console.log(`🏷️ Creando markers para ${targetDept.guids.length} elementos`);
           console.log(`🌍 World encontrado:`, world);
           console.log(`🎯 Marker component:`, marker);
          
                     // Usar el ModelIdMap para obtener posiciones de los elementos que SÍ están en el modelo
           console.log(`🎯 ModelIdMap contiene elementos en estos modelos:`, Object.keys(modelIdMap));
           
           for (const [modelId, localIds] of Object.entries(modelIdMap)) {
             console.log(`🔍 Procesando modelo ${modelId} con ${localIds.size} elementos`);
             
             // Obtener el modelo correspondiente
             const model = fragments.list.get(modelId);
             if (!model) {
               console.warn(`⚠️ Modelo ${modelId} no encontrado en fragments.list`);
               continue;
             }
             
                           // Convertir Set a Array para getPositions
              const localIdsArray = Array.from(localIds);
              console.log(`📋 Intentando obtener posiciones para ${localIdsArray.length} elementos en modelo ${modelId}`);
              
              try {
                // Obtener todas las posiciones de una vez
                const positions = await model.getPositions(localIdsArray);
                console.log(`📊 Posiciones obtenidas:`, positions);
                
                                 if (positions && positions.length > 0) {
                   // Crear un marker para cada posición
                   for (let i = 0; i < positions.length; i++) {
                     const elementPosition = positions[i];
                     const localId = localIdsArray[i];
                     
                     console.log(`✅ Posición encontrada para localId ${localId}:`, elementPosition);
                     
                                                                  // Buscar información del dispositivo para este elemento
                       let deviceName = 'Sin dispositivo';
                       
                       // Encontrar el índice de este localId en el array de posiciones
                       const positionIndex = localIdsArray.indexOf(localId);
                       if (positionIndex >= 0 && positionIndex < targetDept.guids.length) {
                         // Usar directamente el GUID del departamento en la misma posición
                         const guid = targetDept.guids[positionIndex];
                         console.log(`🔍 Usando GUID directo del departamento: ${guid}`);
                         
                         // Buscar el dispositivo correspondiente en los datos obtenidos
                         const deviceInfo = deviceData.find((item: any) => item.guid === guid);
                         
                         if (deviceInfo && deviceInfo.dispositiu) {
                           deviceName = deviceInfo.dispositiu;
                           console.log(`📱 Dispositivo encontrado para GUID ${guid}: ${deviceName}`);
                         } else {
                           console.log(`📱 No se encontró dispositivo para GUID ${guid} en deviceData`);
                         }
                       } else {
                         console.log(`📱 Índice fuera de Rang: positionIndex=${positionIndex}, guids.length=${targetDept.guids.length}`);
                       }
                     
                                           // Crear el elemento 2D con el nombre del dispositivo (unificado)
                       console.log(`🎨 Creando marker con texto: "${deviceName}"`);
                       ensureGlobalMarkerCSS();
                       const markerElement = createSpaceMarker(deviceName);
                     
                                           // Crear el marker en la posición del elemento
                                             try {
                         console.log(`🎯 Intentando crear marker:`, {
                           world: world,
                           markerElement: markerElement,
                           position: elementPosition,
                           deviceName: deviceName
                         });
                         
                         // Verificar que el deviceName no sea "Sin dispositivo"
                         if (deviceName !== 'Sin dispositivo') {
                           // Calcular posición por encima del elemento
                           const elevatedPosition = new THREE.Vector3(
                             elementPosition.x,
                             elementPosition.y + 2, // Elevar 2 unidades por encima
                             elementPosition.z
                           );
                           
                           marker.create(world, markerElement as unknown as HTMLElement, elevatedPosition);
                           console.log(`📍 Marker creado para ${deviceName} en posición elevada:`, elevatedPosition);
                         } else {
                           console.log(`⚠️ Saltando marker para "${deviceName}"`);
                         }
                       } catch (markerError) {
                         console.error(`❌ Error al crear marker para ${deviceName}:`, markerError);
                       }
                   }
                 } else {
                   console.warn(`⚠️ No se encontraron posiciones para los elementos en modelo ${modelId}`);
                 }
              } catch (error) {
                console.warn(`⚠️ No se pudieron obtener posiciones para modelo ${modelId}:`, error);
              }
           }
        }
        
                 // Enfocar la cámara en estos elementos
         const allIds = Object.values(finalSetMap).flatMap(set => Array.from(set));
         console.log(`📊 finalSetMap:`, finalSetMap);
         console.log(`📊 allIds:`, allIds);
         
         if (allIds.length > 0) {
           console.log(`📷 Centrando cámara en ${allIds.length} elementos del departamento ${departmentName}`);
           
           if (world && world.camera instanceof OBC.SimpleCamera) {
             try {
               await world.camera.fitToItems(finalSetMap);
               console.log(`✅ Cámara centrada en departamento ${departmentName}`);
             } catch (error) {
               console.error('❌ Error al centrar cámara:', error);
             }
           } else {
             console.warn('⚠️ No se pudo acceder a la cámara para enfocar');
           }
                   } else {
            console.warn('⚠️ No hay elementos para enfocar');
          }
          
        } catch (error) {
          console.error("Error al enfocar departamento:", error);
        }
      };

    const colorizeDepartments = async () => {
      try {
        const highlighter = components.get(OBF.Highlighter);
        const fragments = components.get(OBC.FragmentsManager);

       // Solo limpiar estilos de departamentos existentes (sin tocar la llegenda)
       for (const [styleName] of highlighter.styles) {
         if (typeof styleName === "string" && styleName.startsWith("dept:")) {
           await highlighter.clear(styleName);
           highlighter.styles.delete(styleName);
         }
       }
       restoreModelMaterials();
       setModelTransparent(components);

       // 1) Obtener edificio activo
       const { activeBuildingCode, activeFloorCode } = modelStore.getState();
       if (!activeBuildingCode) {
         console.warn('No hay edificio activo para consultar departamentos.');
         return;
       }

       // 2) Consultar backend para obtener {departament, guids[]} según planta/edificio activos
       // Enviamos la planta exactamente como está definida en tu UI (sin normalizar nombres)
       let plantaQuery = '';
       if (activeFloorCode) {
         plantaQuery = `&planta=${encodeURIComponent(activeFloorCode)}`;
       }
       const url = `/api/ifcspace/departaments?edifici=${encodeURIComponent(activeBuildingCode)}${plantaQuery}`;
       console.log(`🔎 Fetch departamentos: ${url}`);
       const resp = await fetch(url, { headers: { Accept: 'application/json' } });
       const text = await resp.text();
               console.log('📥 Respuesta raw completa:', text);
       if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
       let departaments: Array<{ departament: string; guids: string[]; count: number; totalArea: number }> = [];
       try {
         departaments = JSON.parse(text);
       } catch (e) {
         console.error('❌ Error parseando JSON de departaments:', e);
         throw new Error('Respuesta no es JSON válido. ¿Backend accesible?');
       }
               console.log(`✅ Departaments recibidos: ${departaments.length}`);
        if (Array.isArray(departaments)) {
          for (const it of departaments.slice(0, 5)) {
            console.log(`   • ${it.departament} (${it.count} elementos, ${it.totalArea} m²)`);
          }
        }

       const legendItems: { name: string; color: string; count: number }[] = [];
                       for (let index = 0; index < departaments.length; index++) {
          const { departament, guids, count, totalArea } = departaments[index] as any;
          console.log(`🔍 Procesando departament="${departament}": totalArea=${totalArea} (tipo: ${typeof totalArea})`);
          if (!departament || !Array.isArray(guids) || guids.length === 0) continue;

                   console.log(`🎨 Pintando departament="${departament}" con ${guids.length} guids`);
          const modelIdMap = await fragments.guidsToModelIdMap(new Set(guids));
          if (!modelIdMap) continue;

          // Usar directamente el mapa del backend (ya filtrado por planta)
          const finalMap: Record<string, number[]> = modelIdMap as any;
          console.log(`   📊 ModelIdMap para ${departament}:`, Object.keys(finalMap).length, 'modelos');

         const styleName = `dept:${departament}`;
         const color = new THREE.Color().setHSL((index % 12) / 12, 0.65, 0.5);
         highlighter.styles.set(styleName, {
           color,
           renderedFaces: FRAGS.RenderedFaces.ONE,
           opacity: 1,
           transparent: false,
         });
         // Convertir arrays a Set<number> para cumplir con el tipo ModelIdMap
         const finalSetMap: Record<string, Set<number>> = {} as any;
         for (const [modelId, ids] of Object.entries(finalMap)) {
           finalSetMap[modelId] = new Set(Array.isArray(ids) ? ids : Array.from(ids as any));
         }
         await highlighter.highlightByID(styleName, finalSetMap as any, false, false);

                   // Usar el totalArea que viene del backend (ya filtrado por planta)
          const areaValue = typeof totalArea === 'number' ? totalArea : parseFloat(totalArea) || 0;
          console.log(`   📈 Área total para ${departament}: ${areaValue} m² (del backend)`);
          legendItems.push({ name: String(departament), color: `#${color.getHexString()}`, count: areaValue });
       }

               // Guardar leyenda en store global y actualizar display
        console.log(`📊 Actualizando leyenda con ${legendItems.length} elementos`);
        modelStore.setDepartmentsLegend(legendItems);
        updateLegendDisplay(legendItems);
     } catch (error) {
       console.error("Error al colorear por departaments:", error);
     }
   };

  // Escuchar cambios de planta y refrescar departamentos
  if (!(globalThis as any).__actiusDeptSubscribed) {
    (globalThis as any).__actiusDeptSubscribed = true;
    
    window.addEventListener('ccspt:refresh-departaments', async () => {
      if (modelStore.getState().isDepartamentsActive) {
        await colorizeDepartments();
      }
    });
    
    // Escuchar clics en elementos de la leyenda para enfocar
    window.addEventListener('ccspt:focus-department', async (event: any) => {
      const { department } = event.detail;
      if (modelStore.getState().isDepartamentsActive) {
        await focusOnDepartment(department);
      }
    });
  }

  return BUI.html`
    <bim-panel-section fixed icon=${appIcons.SETTINGS} label="Actius">
      <div style="display: flex; flex-direction: column; gap: 0.5rem;">
        
                 <!-- Buscador -->
        <div style="margin-bottom: 0.5rem;">
          <div style="position: relative; width: 100%;">
            <input
              type="text"
              placeholder="Cerca actius"
              value=${state.searchQuery || ''}
              style="width: 100%; box-sizing: border-box; padding: 0.75rem; padding-left: 2.5rem; border: 1px solid var(--bim-ui_bg-contrast-40); border-radius: 0.375rem; background: var(--bim-ui_bg-contrast-20); color: var(--bim-ui_bg-contrast-100); font-size: 0.875rem; font-family: inherit; outline: none; transition: all 0.2s ease;"
              @input=${(e: Event) => {
                const input = e.target as HTMLInputElement;
                state.searchQuery = input.value;
                update(state);
                // Debounce search
                clearTimeout((globalThis as any).searchTimeout);
                (globalThis as any).searchTimeout = setTimeout(() => performSearch(input.value), 300);
              }}
              @focus=${(e: Event) => {
                const input = e.target as HTMLInputElement;
                input.style.borderColor = 'var(--bim-ui_accent-base)';
                input.style.boxShadow = '0 0 0 2px rgba(40, 180, 215, 0.2)';
              }}
              @blur=${(e: Event) => {
                const input = e.target as HTMLInputElement;
                input.style.borderColor = 'var(--bim-ui_bg-contrast-40)';
                input.style.boxShadow = 'none';
              }}
            />
            <div style="position: absolute; left: 0.75rem; top: 50%; transform: translateY(-50%); color: var(--bim-ui_bg-contrast-60); font-size: 0.875rem; pointer-events: none;">🔍</div>
            <!-- Funnel button on the right of searcher -->
            <button
              style="position: absolute; right: 0.4rem; top: 50%; transform: translateY(-50%); height: 28px; padding: 0 8px; border: 1px solid var(--bim-ui_bg-contrast-40); border-radius: 0.375rem; background: var(--bim-ui_bg-contrast-10); color: var(--bim-ui_bg-contrast-100); cursor: pointer; display: flex; align-items: center; gap: 6px;"
              @click=${async () => {
                // Open modal and preload buildings list if needed
                state.showFilterModal = true;
                state.tempSelectedBuildings = [...(state.selectedBuildings || [])];
                state.tempSelectedFloors = [...(state.selectedFloors || [])];
                state.activeFilterTab = 'edifici';
                update(state);
                if (!state.buildingsList) {
                  try {
                    const resp = await fetch('/api/ifcbuildings', { headers: { Accept: 'application/json' } });
                    if (resp.ok) {
                      const data = await resp.json();
                      state.buildingsList = data as any[];
                      update(state);
                    } else {
                      console.warn('No se pudo cargar la lista de edificios');
                    }
                  } catch (err) {
                    console.error('Error cargando edificios:', err);
                  }
                }
                // If exactly one building is selected, fetch available floors
                if ((state.tempSelectedBuildings || []).length === 1) {
                  try {
                    const code = state.tempSelectedBuildings![0];
                    const r = await fetch(`/api/actius/plantes?edifici=${encodeURIComponent(code)}`, { headers: { Accept: 'application/json' } });
                    if (r.ok) {
                      state.availableFloors = await r.json();
                      update(state);
                    }
                  } catch (e) { console.warn('No se pudieron cargar las plantas:', e); }
                } else {
                  state.availableFloors = [];
                }
              }}
              title="Filtres"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M4.25 5c0-.414.336-.75.75-.75h14a.75.75 0 0 1 .53 1.28l-5.53 5.53v6.69a.75.75 0 0 1-1.06.67l-3-1.5a.75.75 0 0 1-.42-.67v-5.19L4.22 5.53A.75.75 0 0 1 4.25 5z"/>
              </svg>
              <span style="font-size: 0.8rem; font-weight: 600;">Filtres</span>
            </button>
          </div>
          <!-- Selected building codes chips -->
          ${state.selectedBuildings && state.selectedBuildings.length > 0 ? BUI.html`
            <div style="display: flex; flex-wrap: wrap; gap: 0.35rem; margin-top: 0.4rem;">
              ${state.selectedBuildings.map((code) => BUI.html`
                <span style="display: inline-flex; align-items: center; gap: 0.35rem; padding: 0.15rem 0.45rem; background: var(--bim-ui_bg-contrast-20); border: 1px solid var(--bim-ui_bg-contrast-40); color: var(--bim-ui_bg-contrast-100); border-radius: 9999px; font-size: 0.75rem;">
                  ${code}
                  <button
                    style="border: none; background: transparent; color: var(--bim-ui_bg-contrast-80); cursor: pointer; font-weight: 700;"
                    @click=${() => {
                      state.selectedBuildings = (state.selectedBuildings || []).filter((c) => c !== code);
                      update(state);
                      if (state.searchQuery && state.searchQuery.trim().length >= 2) {
                        performSearch(state.searchQuery);
                      }
                    }}
                    title="Eliminar"
                  >×</button>
                </span>
              `)}
              <button
                style="border: 1px dashed var(--bim-ui_bg-contrast-50); background: transparent; color: var(--bim-ui_bg-contrast-90); border-radius: 0.375rem; padding: 0.15rem 0.45rem; font-size: 0.75rem; cursor: pointer;"
                @click=${() => { state.showFilterModal = true; state.activeFilterTab = 'edifici'; state.tempSelectedBuildings = [...(state.selectedBuildings || [])]; state.tempSelectedFloors = [...(state.selectedFloors || [])]; update(state); }}
              >Editar filtres…</button>
            </div>
          ` : ''}

        ${state.showActiuModal ? BUI.html`
          <div style="position: fixed; inset: 0; background: rgba(0,0,0,0.45); display: flex; align-items: center; justify-content: center; z-index: 1000;">
            <div style="width: 820px; max-width: calc(100% - 2rem); background: var(--bim-ui_bg-contrast-10); border: 1px solid var(--bim-ui_bg-contrast-30); border-radius: 0.6rem; box-shadow: 0 14px 34px rgba(0,0,0,0.32);">
              <div style="display: flex; align-items: center; justify-content: space-between; padding: 0.9rem 1.1rem; border-bottom: 1px solid var(--bim-ui_bg-contrast-20);">
                <div style="font-weight: 800; color: #fff; font-size: 1.1rem; letter-spacing: 0.2px;">Detall d\'Actiu</div>
                <button style="border: none; background: transparent; color: var(--bim-ui_bg-contrast-90); cursor: pointer; font-size: 1.15rem;" @click=${() => closeActiuModal()} title="Tancar">✕</button>
              </div>
              <div style="padding: 0.9rem 1.1rem;">
                <div style="display: flex; gap: 0.4rem; border-bottom: 1px solid var(--bim-ui_bg-contrast-20); margin-bottom: 0.9rem;">
                  <button
                    @click=${async () => { state.activeDetailsTab = 'informacio'; update(state); await reloadActiuImages(); }}
                    style="padding: 0.5rem 0.85rem; border: 1px solid var(--bim-ui_bg-contrast-40); border-bottom: none; font-size: 0.95rem; background: ${state.activeDetailsTab === 'informacio' ? 'var(--bim-ui_base)' : 'transparent'}; color: ${state.activeDetailsTab === 'informacio' ? '#0b1f28' : '#fff'}; border-radius: 0.45rem 0.45rem 0 0; cursor: pointer; font-weight: 800;"
                  >Informació</button>
                  <button
                    @click=${async () => { state.activeDetailsTab = 'manteniment'; update(state); await loadMaintenanceRecords(); }}
                    style="padding: 0.5rem 0.85rem; border: 1px solid var(--bim-ui_bg-contrast-40); border-bottom: none; font-size: 0.95rem; background: ${state.activeDetailsTab === 'manteniment' ? 'var(--bim-ui_base)' : 'transparent'}; color: ${state.activeDetailsTab === 'manteniment' ? '#0b1f28' : '#fff'}; border-radius: 0.45rem 0.45rem 0 0; cursor: pointer; font-weight: 800;"
                  >Manteniment</button>
                </div>

                ${state.activeDetailsTab === 'informacio' ? BUI.html`
                  <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.65rem 1.25rem; font-size: 1rem;">
                    ${state.selectedActiuDetail ? BUI.html`
                      ${[{
                        label: 'GUID', value: state.selectedActiuDetail.guid
                      }, {
                        label: 'Tipus', value: state.selectedActiuDetail.tipus
                      }, {
                        label: 'Subtipus', value: state.selectedActiuDetail.subtipus
                      }, {
                        label: 'Edifici', value: state.selectedActiuDetail.edifici
                      }, {
                        label: 'Planta', value: state.selectedActiuDetail.planta
                      }, {
                        label: 'Zona', value: state.selectedActiuDetail.zona
                      }, {
                        label: 'Ubicació', value: state.selectedActiuDetail.ubicacio
                      }].map((row: any) => BUI.html`
                        <div style="display:flex; gap: 0.65rem; align-items: flex-start; line-height: 1.4; padding: 0.15rem 0;">
                          <span style="color: #fff; min-width: 8.5rem; font-weight: 600;">${row.label}:</span>
                          <span style="color: #fff; font-weight: 700; ${row.label === 'GUID' ? 'word-break: break-all; font-family: ui-monospace, SFMono-Regular, Menlo, monospace;' : ''}">
                            ${row.value ?? '-'}
                          </span>
                          ${row.label === 'GUID' ? BUI.html`<button title="Copiar GUID" style="margin-left: 0.35rem; padding: 0.15rem 0.4rem; border: 1px solid var(--bim-ui_bg-contrast-40); background: var(--bim-ui_bg-contrast-20); color: var(--bim-ui_bg-contrast-100); border-radius: 0.3rem; cursor: pointer; font-size: 0.75rem;" @click=${async () => { try { await navigator.clipboard.writeText(String(state.selectedActiuDetail?.guid || '')); } catch {} }}>Copiar</button>` : ''}
                        </div>
                      `)}
                    ` : BUI.html`<div style="grid-column: 1 / -1; color: #fff;">Carregant informació...</div>`}
                  </div>
                  <!-- Imatges (merged into Informació) -->
                  <div style="margin-top: 1rem; display:flex; flex-direction: column; gap: 0.75rem; color: #fff;">
                    <div style="display:flex; align-items:center; gap: 0.5rem;">
                      <button
                        style="border: 1px solid var(--bim-ui_bg-contrast-40); background: var(--bim-ui_bg-contrast-20); color: var(--bim-ui_bg-contrast-100); padding: 0.4rem 0.7rem; border-radius: 0.35rem; cursor: pointer; font-weight: 700;"
                        @click=${() => {
                          const input = document.getElementById(`actiu-file-input-${state.selectedActiuGuid}`) as HTMLInputElement | null;
                          if (input) input.click();
                        }}
                        title="Fer foto o pujar imatges"
                      >Afegir imatges</button>
                      <button
                        style="border: 1px solid var(--bim-ui_bg-contrast-40); background: transparent; color: var(--bim-ui_bg-contrast-100); padding: 0.4rem 0.7rem; border-radius: 0.35rem; cursor: pointer; font-weight: 700;"
                        @click=${() => openCamera()}
                        title="Obrir càmera"
                      >Fer foto</button>
                      ${state.uploading ? BUI.html`<span style="font-size:0.9rem; color: var(--bim-ui_bg-contrast-80);">Pujant...</span>` : ''}
                      <input id="actiu-file-input-${state.selectedActiuGuid}"
                        type="file" accept="image/*" capture="environment" multiple style="display:none"
                        @change=${(e: Event) => {
                          const t = e.target as HTMLInputElement;
                          if (t && t.files) uploadActiuImages(t.files);
                          if (t) t.value = '';
                        }} />
                    </div>

                    ${(() => {
                      const images = state.actiuImages || [];
                      if (!images || images.length === 0) return BUI.html`<div style="color:#fff;">Encara no hi ha imatges disponibles.</div>`;
                      return BUI.html`
                        <div style="display:grid; grid-template-columns: repeat(auto-fill, minmax(120px, 1fr)); gap: 0.6rem;">
                          ${images.map((img: any) => BUI.html`
                            <div style="position: relative; border: 1px solid var(--bim-ui_bg-contrast-30); border-radius: 0.4rem; overflow: hidden; background: #111;">
                              <a href="javascript:void(0)" @click=${() => openLightbox(img.url)} title="Veure gran">
                                <img src="${img.thumbUrl || img.url}" style="width: 100%; height: 110px; object-fit: cover; display:block;" />
                              </a>
                              ${(() => {
                                const dateStr = img?.createdAt ? new Date(img.createdAt).toLocaleString() : '';
                                return dateStr ? BUI.html`
                                  <div title="${img.createdAt}" style="position:absolute; left:4px; bottom:4px; padding:2px 6px; border-radius: 4px; background: rgba(0,0,0,0.55); color:#fff; font-size: 0.72rem; font-weight: 700; line-height: 1; text-shadow: 0 1px 1px rgba(0,0,0,0.5);">
                                    ${dateStr}
                                  </div>
                                ` : BUI.html``;
                              })()}
                              <div style="position:absolute; top:4px; right:4px; display:flex; gap:4px;">
                                <button title="Eliminar" style="border:none; background: rgba(0,0,0,0.55); color:#fff; padding:4px 6px; border-radius:4px; cursor:pointer;" @click=${() => deleteActiuImage(img.id)}>🗑️</button>
                              </div>
                            </div>
                          `)}
                        </div>`;
                    })()}
                  </div>
                ` : ''}

                ${state.lightboxUrl ? BUI.html`
                  <div style="position: fixed; inset: 0; background: rgba(0,0,0,0.85); display:flex; align-items:center; justify-content:center; z-index: 2147483646;" @click=${(e: Event) => { if (e.target === e.currentTarget) closeLightbox(); }}>
                    <img src="${state.lightboxUrl}" style="max-width: 92vw; max-height: 92vh; border-radius: 0.4rem;" />
                    <button style="position: absolute; top: 14px; right: 16px; border:none; background: rgba(0,0,0,0.6); color:#fff; padding: 6px 10px; border-radius: 6px; cursor:pointer;" @click=${() => closeLightbox()}>✕</button>
                  </div>
                ` : ''}

                ${state.showCamera ? BUI.html`
                  <div style="position: fixed; inset: 0; background: rgba(0,0,0,0.75); display:flex; align-items:center; justify-content:center; z-index: 2147483647;">
                    <div style="background:#111; border:1px solid var(--bim-ui_bg-contrast-40); border-radius: 0.6rem; padding: 0.75rem; width: min(720px, 95vw);">
                      <div style="display:flex; justify-content:space-between; align-items:center; color:#fff; padding: 0.25rem 0.25rem 0.5rem 0.25rem;">
                        <div style="font-weight:800;">Càmera</div>
                        <button style="border:none; background:transparent; color:#fff; font-size:1.1rem; cursor:pointer;" @click=${() => closeCamera()}>✕</button>
                      </div>
                      <div style="background:#000; border-radius: 0.4rem; overflow:hidden;">
                        <video id="actiu-camera-video" autoplay playsinline style="width:100%; height:auto; display:block;"></video>
                      </div>
                      <div style="display:flex; justify-content:flex-end; gap:0.5rem; margin-top:0.6rem;">
                        <button style="border:1px solid var(--bim-ui_bg-contrast-40); background:transparent; color:#fff; padding:0.4rem 0.7rem; border-radius:0.35rem; cursor:pointer;" @click=${() => closeCamera()}>Cancel·lar</button>
                        <button style="border:1px solid var(--bim-ui_bg-contrast-40); background:var(--bim-ui_base); color:#0b1f28; padding:0.45rem 0.8rem; border-radius:0.35rem; cursor:pointer; font-weight:800;" @click=${() => capturePhoto()}>Capturar</button>
                      </div>
                    </div>
                  </div>
                ` : ''}

                

                ${state.activeDetailsTab === 'manteniment' ? BUI.html`
                  <div style="display:flex; flex-direction: column; gap: 0.75rem; color: #fff;">
                    <div style="display:flex; align-items: center; justify-content: space-between;">
                      <div style="font-weight:800;">Registres de manteniment</div>
                      ${state.maintenanceLoading ? BUI.html`<span style="color: var(--bim-ui_bg-contrast-80);">Carregant…</span>` : ''}
                    </div>
                    <div style="border:1px solid var(--bim-ui_bg-contrast-30); border-radius:0.5rem; padding:0.6rem; background: var(--bim-ui_bg-contrast-20);">
                      <div style="font-weight:700; margin-bottom:0.4rem;">Afegir registre</div>
                      <div style="display:grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap:0.5rem;">
                        <label style="display:flex; flex-direction:column; gap:0.25rem;">
                          <span>Data realitzat</span>
                          <input type="date" value=${state.maintenanceNew?.performedAt || ''}
                            @input=${(e: Event) => { const v=(e.target as HTMLInputElement).value; state.maintenanceNew = { ...(state.maintenanceNew||{}), performedAt: v }; update(state); }}
                            style="padding:0.35rem; border:1px solid var(--bim-ui_bg-contrast-40); border-radius:0.35rem; background: var(--bim-ui_bg-contrast-10); color:#fff;" />
                        </label>
                        <label style="display:flex; flex-direction:column; gap:0.25rem;">
                          <span>Responsable</span>
                          <input type="text" placeholder="Nom" value=${state.maintenanceNew?.responsible || ''}
                            @input=${(e: Event) => { const v=(e.target as HTMLInputElement).value; state.maintenanceNew = { ...(state.maintenanceNew||{}), responsible: v }; update(state); }}
                            style="padding:0.35rem; border:1px solid var(--bim-ui_bg-contrast-40); border-radius:0.35rem; background: var(--bim-ui_bg-contrast-10); color:#fff;" />
                        </label>
                        <label style="display:flex; flex-direction:column; gap:0.25rem;">
                          <span>Periodicitat (mesos)</span>
                          <input type="number" min="0" value=${String(state.maintenanceNew?.periodMonths ?? '')}
                            @input=${(e: Event) => { const v=Number((e.target as HTMLInputElement).value||0); state.maintenanceNew = { ...(state.maintenanceNew||{}), periodMonths: v }; update(state); }}
                            style="padding:0.35rem; border:1px solid var(--bim-ui_bg-contrast-40); border-radius:0.35rem; background: var(--bim-ui_bg-contrast-10); color:#fff;" />
                        </label>
                        <label style="display:flex; flex-direction:column; gap:0.25rem;">
                          <span>Periodicitat (dies)</span>
                          <input type="number" min="0" value=${String(state.maintenanceNew?.periodDays ?? '')}
                            @input=${(e: Event) => { const v=Number((e.target as HTMLInputElement).value||0); state.maintenanceNew = { ...(state.maintenanceNew||{}), periodDays: v }; update(state); }}
                            style="padding:0.35rem; border:1px solid var(--bim-ui_bg-contrast-40); border-radius:0.35rem; background: var(--bim-ui_bg-contrast-10); color:#fff;" />
                        </label>
                        <label style="grid-column: 1 / -1; display:flex; flex-direction:column; gap:0.25rem;">
                          <span>Incidències</span>
                          <textarea rows="2" value=${state.maintenanceNew?.incidents || ''}
                            @input=${(e: Event) => { const v=(e.target as HTMLTextAreaElement).value; state.maintenanceNew = { ...(state.maintenanceNew||{}), incidents: v }; update(state); }}
                            style="padding:0.35rem; border:1px solid var(--bim-ui_bg-contrast-40); border-radius:0.35rem; background: var(--bim-ui_bg-contrast-10); color:#fff; resize: vertical;"></textarea>
                        </label>
                        <label style="grid-column: 1 / -1; display:flex; flex-direction:column; gap:0.25rem;">
                          <span>Accions correctives</span>
                          <textarea rows="2" value=${state.maintenanceNew?.correctiveActions || ''}
                            @input=${(e: Event) => { const v=(e.target as HTMLTextAreaElement).value; state.maintenanceNew = { ...(state.maintenanceNew||{}), correctiveActions: v }; update(state); }}
                            style="padding:0.35rem; border:1px solid var(--bim-ui_bg-contrast-40); border-radius:0.35rem; background: var(--bim-ui_bg-contrast-10); color:#fff; resize: vertical;"></textarea>
                        </label>
                      </div>
                      <div style="display:flex; justify-content:flex-end; gap:0.5rem; margin-top:0.5rem;">
                        <button style="border:1px solid var(--bim-ui_bg-contrast-40); background:transparent; color:#fff; padding:0.4rem 0.7rem; border-radius:0.35rem; cursor:pointer;"
                          @click=${() => { state.maintenanceNew = {}; update(state); }}>Netejar</button>
                        <button style="border:1px solid var(--bim-ui_bg-contrast-40); background: var(--bim-ui_base); color:#0b1f28; padding:0.45rem 0.8rem; border-radius:0.35rem; cursor:pointer; font-weight:800;"
                          ?disabled=${state.maintenanceCreating}
                          @click=${() => createMaintenanceRecord()}>${state.maintenanceCreating ? 'Guardant…' : 'Guardar'}</button>
                      </div>
                    </div>

                    <div>
                      ${(state.maintenanceRecords && state.maintenanceRecords.length > 0) ? BUI.html`
                        <div style="display:grid; gap:0.5rem;">
                          ${state.maintenanceRecords.map((rec: any) => BUI.html`
                            <div style="border:1px solid var(--bim-ui_bg-contrast-30); border-radius:0.5rem; overflow:hidden;">
                              <div style="display:flex; justify-content:space-between; align-items:center; padding:0.5rem 0.6rem; background: var(--bim-ui_bg-contrast-20);">
                                <div style="display:flex; gap:0.75rem; align-items:center;">
                                  <span style="font-weight:700;">${rec.performedAt ? new Date(rec.performedAt).toLocaleDateString() : '-'}</span>
                                  <span style="color: var(--bim-ui_bg-contrast-80);">Resp.: ${rec.responsible || '-'}</span>
                                  <span style="color: var(--bim-ui_bg-contrast-80);">Peri.: ${rec.periodMonths || 0}m / ${rec.periodDays || 0}d</span>
                                </div>
                                <div style="display:flex; gap:0.4rem;">
                                  <button title="Eliminar" style="border:none; background:#a11; color:#fff; padding:0.3rem 0.6rem; border-radius:0.3rem; cursor:pointer;" @click=${() => deleteMaintenanceRecord(rec.id)}>🗑️</button>
                                </div>
                              </div>
                              <div style="padding:0.6rem; display:flex; flex-direction:column; gap:0.5rem;">
                                ${rec.incidents ? BUI.html`<div><span style="font-weight:700;">Incidències:</span> <span>${rec.incidents}</span></div>` : ''}
                                ${rec.correctiveActions ? BUI.html`<div><span style="font-weight:700;">Accions:</span> <span>${rec.correctiveActions}</span></div>` : ''}
                                <div>
                                  <div style="font-weight:700; margin-bottom:0.25rem;">Adjunts</div>
                                  <div style="display:flex; align-items:center; gap:0.5rem; margin-bottom:0.35rem;">
                                    <input id="maint-file-${String(rec.id)}" type="file" multiple style="display:none" @change=${(e: Event) => { const t=e.target as HTMLInputElement; if (t && t.files) { uploadMaintenanceAttachments(rec.id, t.files); t.value=''; } }} />
                                    <button style="border:1px solid var(--bim-ui_bg-contrast-40); background:transparent; color:#fff; padding:0.3rem 0.6rem; border-radius:0.3rem; cursor:pointer;" @click=${() => {
                                      const el = document.getElementById(`maint-file-${String(rec.id)}`) as HTMLInputElement | null;
                                      if (el) el.click();
                                    }}>Pujar fitxers</button>
                                    ${state.maintenanceUploadingFor === rec.id ? BUI.html`<span style="color: var(--bim-ui_bg-contrast-80);">Pujant…</span>` : ''}
                                  </div>
                                  ${(rec.attachments && rec.attachments.length > 0) ? BUI.html`
                                    <div style="display:flex; flex-wrap:wrap; gap:0.4rem;">
                                      ${rec.attachments.map((att: any) => BUI.html`
                                        <div style="display:flex; align-items:center; gap:0.35rem; border:1px solid var(--bim-ui_bg-contrast-30); border-radius:0.35rem; padding:0.25rem 0.4rem; background:#111;">
                                          <a href="${att.url}" target="_blank" style="color:#8bd; text-decoration:underline;">${att.filename || 'fitxer'}</a>
                                          <button title="Eliminar adjunt" style="border:none; background:transparent; color:#f77; cursor:pointer;" @click=${() => deleteMaintenanceAttachment(rec.id, att.id)}>✕</button>
                                        </div>
                                      `)}
                                    </div>
                                  ` : BUI.html`<div style="color: var(--bim-ui_bg-contrast-80);">No hi ha adjunts.</div>`}
                                </div>
                              </div>
                            </div>
                          `)}
                        </div>
                      ` : BUI.html`<div style="color: var(--bim-ui_bg-contrast-80);">Encara no hi ha registres.</div>`}
                    </div>
                  </div>
                ` : ''}
              </div>
              <div style="display: flex; justify-content: flex-end; padding: 0.7rem 1.1rem; border-top: 1px solid var(--bim-ui_bg-contrast-20);">
                <button style="border: 1px solid var(--bim-ui_bg-contrast-40); background: transparent; color: var(--bim-ui_bg-contrast-100); padding: 0.45rem 0.85rem; border-radius: 0.4rem; cursor: pointer; font-size: 0.95rem;" @click=${() => closeActiuModal()}>Tancar</button>
              </div>
            </div>
          </div>
        ` : ''}

          <!-- Selected floor chips -->
          ${state.selectedFloors && state.selectedFloors.length > 0 ? BUI.html`
            <div style="display: flex; flex-wrap: wrap; gap: 0.35rem; margin-top: 0.25rem;">
              ${state.selectedFloors.map((p) => BUI.html`
                <span style="display: inline-flex; align-items: center; gap: 0.35rem; padding: 0.15rem 0.45rem; background: var(--bim-ui_bg-contrast-20); border: 1px solid var(--bim-ui_bg-contrast-40); color: var(--bim-ui_bg-contrast-100); border-radius: 9999px; font-size: 0.75rem;">
                  ${p}
                  <button
                    style="border: none; background: transparent; color: var(--bim-ui_bg-contrast-80); cursor: pointer; font-weight: 700;"
                    @click=${() => {
                      state.selectedFloors = (state.selectedFloors || []).filter((x) => x !== p);
                      update(state);
                      if (state.searchQuery && state.searchQuery.trim().length >= 2) {
                        performSearch(state.searchQuery);
                      }
                    }}
                    title="Eliminar"
                  >×</button>
                </span>
              `)}
              <button
                style="border: 1px dashed var(--bim-ui_bg-contrast-50); background: transparent; color: var(--bim-ui_bg-contrast-90); border-radius: 0.375rem; padding: 0.15rem 0.45rem; font-size: 0.75rem; cursor: pointer;"
                @click=${() => { state.showFilterModal = true; state.activeFilterTab = 'planta'; state.tempSelectedBuildings = [...(state.selectedBuildings || [])]; state.tempSelectedFloors = [...(state.selectedFloors || [])]; update(state); }}
              >Editar plantes…</button>
            </div>
          ` : ''}
        </div>

        <!-- Filters Modal -->
        ${state.showFilterModal ? BUI.html`
          <div style="position: fixed; inset: 0; background: rgba(0,0,0,0.5); backdrop-filter: blur(4px); display: flex; align-items: center; justify-content: center; z-index: 2147483647;" @click=${(e: Event) => {
            if (e.target === e.currentTarget) { state.showFilterModal = false; update(state); }
          }}>
            <div style="width: min(520px, 92vw); max-height: 85vh; overflow: auto; background: #2a2a2a; color: var(--bim-ui_bg-contrast-100); border: 1px solid var(--bim-ui_bg-contrast-30); border-radius: 0.5rem; box-shadow: 0 10px 30px rgba(0,0,0,0.35);">
              <div style="display: flex; align-items: center; justify-content: space-between; padding: 0.9rem 1rem; border-bottom: 1px solid var(--bim-ui_bg-contrast-20);">
                <div style="font-weight: 700;">Filtres de cerca</div>
                <button style="border: none; background: transparent; font-size: 1.2rem; cursor: pointer; color: var(--bim-ui_bg-contrast-90);" @click=${() => { state.showFilterModal = false; update(state); }}>×</button>
              </div>
              <div style="padding: 0.85rem 1rem; display: grid; gap: 0.75rem;">
                <!-- Tabs header -->
                <div style="display:flex; gap:0.5rem; border-bottom:1px solid var(--bim-ui_bg-contrast-20); padding-bottom:0.25rem;">
                  ${(() => {
                    const tabs: Array<'edifici' | 'planta'> = ['edifici'];
                    if ((state.tempSelectedBuildings || []).length === 1) tabs.push('planta');
                    return tabs.map((tab) => {
                      const active = (state.activeFilterTab || 'edifici') === (tab as any);
                      const label = tab === 'edifici' ? 'Edifici' : 'Planta';
                      return BUI.html`
                        <button
                          style="padding: 0.35rem 0.6rem; border-radius: 0.375rem; border: 1px solid ${active ? 'var(--bim-ui_accent-base)' : 'transparent'}; background: ${active ? 'var(--bim-ui_bg-contrast-20)' : 'transparent'}; color: var(--bim-ui_bg-contrast-100); cursor: pointer;"
                        @click=${() => { state.activeFilterTab = tab as any; update(state); }}
                        >${label}</button>`;
                    });
                  })()}
                </div>

                <!-- Tabs content -->
                ${((state.activeFilterTab || 'edifici') === 'edifici') ? BUI.html`
                  <div>
                    <div style="font-weight: 600; margin: 0.35rem 0;">Edifici</div>
                    <div style="display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 0.4rem;">
                      ${(state.buildingsList || []).map((b) => {
                        const code = b.codi;
                        const checked = (state.tempSelectedBuildings || []).includes(code);
                        return BUI.html`
                          <label style="display: flex; align-items: center; gap: 0.5rem; padding: 0.35rem; border: 1px solid var(--bim-ui_bg-contrast-30); border-radius: 0.375rem; cursor: pointer;">
                            <input type="checkbox" .checked=${checked} @change=${async (e: Event) => {
                              const el = e.target as HTMLInputElement;
                              const arr = new Set(state.tempSelectedBuildings || []);
                              if (el.checked) arr.add(code); else arr.delete(code);
                              state.tempSelectedBuildings = Array.from(arr);
                              // Handle planta availability based on building count
                              const count = state.tempSelectedBuildings.length;
                              if (count === 1) {
                                try {
                                  const only = state.tempSelectedBuildings[0];
                                  const r = await fetch(`/api/actius/plantes?edifici=${encodeURIComponent(only)}`, { headers: { Accept: 'application/json' } });
                                  if (r.ok) {
                                    state.availableFloors = await r.json();
                                  }
                                } catch (e) { state.availableFloors = []; }
                              } else {
                                state.availableFloors = [];
                                state.tempSelectedFloors = [];
                                if ((state.activeFilterTab || 'edifici') === 'planta') state.activeFilterTab = 'edifici';
                              }
                              update(state);
                            }} />
                            <span style="font-weight:600;">${b.codi}</span>
                            <span style="color: var(--bim-ui_bg-contrast-70); font-size: 0.85rem;">${b.nom}</span>
                          </label>`;
                      })}
                    </div>
                  </div>
                ` : BUI.html`
                  <div>
                    <div style="font-weight: 600; margin: 0.35rem 0;">Planta</div>
                    ${(state.availableFloors && state.availableFloors.length > 0) ? BUI.html`
                      <div style="display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 0.4rem;">
                        ${state.availableFloors.map((p) => {
                          const checked = (state.tempSelectedFloors || []).includes(p);
                          return BUI.html`
                            <label style="display:flex; align-items:center; gap:0.5rem; padding:0.35rem; border:1px solid var(--bim-ui_bg-contrast-30); border-radius:0.375rem; cursor:pointer;">
                              <input type="checkbox" .checked=${checked} @change=${(e: Event) => {
                                const el = e.target as HTMLInputElement;
                                const set = new Set(state.tempSelectedFloors || []);
                                if (el.checked) set.add(p); else set.delete(p);
                                state.tempSelectedFloors = Array.from(set);
                                update(state);
                              }} />
                              <span style="font-weight:600;">${p}</span>
                            </label>`;
                        })}
                      </div>
                    ` : BUI.html`<div style="color: var(--bim-ui_bg-contrast-70);">No hi ha plantes disponibles.</div>`}
                  </div>
                `}
              </div>
              <div style="display: flex; justify-content: flex-end; gap: 0.5rem; padding: 0.8rem 1rem; border-top: 1px solid var(--bim-ui_bg-contrast-20);">
                <button style="border: 1px solid var(--bim-ui_bg-contrast-40); background: transparent; color: var(--bim-ui_bg-contrast-100); padding: 0.4rem 0.75rem; border-radius: 0.375rem; cursor: pointer;" @click=${() => { state.showFilterModal = false; update(state); }}>Cancelar</button>
                <button style="border: 1px solid var(--bim-ui_accent-base); background: var(--bim-ui_accent-base); color: white; padding: 0.4rem 0.75rem; border-radius: 0.375rem; cursor: pointer;" @click=${() => {
                  state.selectedBuildings = [...(state.tempSelectedBuildings || [])];
                  state.selectedFloors = [...(state.tempSelectedFloors || [])];
                  state.showFilterModal = false;
                  update(state);
                  if (state.searchQuery && state.searchQuery.trim().length >= 2) {
                    performSearch(state.searchQuery);
                  }
                }}>Aplicar</button>
              </div>
            </div>
          </div>
        ` : ''}

        <!-- Results section -->
        ${(state.searchResults && state.searchResults.length > 0) ? BUI.html`
          <div style="margin-top: 0.5rem;">
            <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 0.5rem;">
              <div style="font-weight: 600; color: var(--bim-ui_bg-contrast-100); font-size: 1rem;">
                Resultats (${state.searchResults.length})
              </div>
              <button
                style="padding: 0.25rem 0.5rem; border: 1px solid var(--bim-ui_bg-contrast-40); border-radius: 0.375rem; background: var(--bim-ui_bg-contrast-20); color: var(--bim-ui_bg-contrast-100); cursor: pointer; font-size: 0.75rem; display: flex; align-items: center; gap: 0.25rem;"
                @click=${() => exportToExcel(state.searchResults || [])}
                title="Exportar a Excel"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                  <polyline points="14,2 14,8 20,8"/>
                  <line x1="16" y1="13" x2="8" y2="21"/>
                  <line x1="8" y1="13" x2="16" y2="21"/>
                </svg>
                Excel
              </button>
            </div>
            <div style="max-height: 20rem; overflow: auto; border: 1px solid var(--bim-ui_bg-contrast-40); background: var(--bim-ui_bg-contrast-20); border-radius: 0.5rem; padding: 0.75rem;">
              ${state.searchResults.map((result, index) => BUI.html`
                <div 
                  style="display: flex; flex-direction: column; gap: 0.35rem; padding: 0.6rem; border-radius: 0.375rem; background: var(--bim-ui_bg-contrast-10); margin-bottom: 0.35rem; cursor: pointer; transition: background-color 0.2s ease;"
                  @mouseover=${(e: Event) => {
                    const div = e.currentTarget as HTMLDivElement;
                    div.style.backgroundColor = 'var(--bim-ui_bg-contrast-30)';
                  }}
                  @mouseout=${(e: Event) => {
                    const div = e.currentTarget as HTMLDivElement;
                    div.style.backgroundColor = 'var(--bim-ui_bg-contrast-10)';
                  }}
                  @dblclick=${() => openActiuModal(result.guid)}
                  @click=${async () => {
                    try {
                      const isDeviceLike = result.tipo_coincidencia === 'dispositiu' || result.tipo_coincidencia === 'actiu';
                      const displayName = isDeviceLike ? result.dispositiu : result.departament;
                      console.log(`🎯 Navegando a: ${displayName} en edificio ${result.edifici}`);

                      const fragments = components.get(OBC.FragmentsManager);

                      // Verificar si el edificio del elemento está cargado
                      const isBuildingLoaded = Array.from(fragments.list.keys()).some(modelId => 
                        modelId.includes(result.edifici)
                      );

                      if (!isBuildingLoaded) {
                        console.log(`🏢 El edificio ${result.edifici} no está cargado, cargándolo...`);
                        const success = await loadBuildingByCode(result.edifici);
                        if (!success) {
                          console.error(`❌ No se pudo cargar el edificio ${result.edifici}`);
                          return;
                        }
                      } else {
                        console.log(`✅ El edificio ${result.edifici} ya está cargado`);
                      }

                      // Ahora enfocar en el elemento específico
                      if (result.tipo_coincidencia === 'departament') {
                        await focusOnDepartment(result.departament);
                      } else {
                        await focusOnDevice(result.guid, displayName);
                      }
                    } catch (error) {
                      console.error('❌ Error navegando al elemento:', error);
                    }
                  }}
                >
                  <div style="display: flex; align-items: center; gap: 0.5rem;">
                    <span style="font-size: 0.75rem; padding: 0.125rem 0.375rem; border-radius: 0.25rem; background: ${result.tipo_coincidencia === 'departament' ? 'var(--bim-ui_accent-base)' : (result.tipo_coincidencia === 'dispositiu' || result.tipo_coincidencia === 'actiu') ? '#10b981' : '#f59e0b'}; color: white; font-weight: 600; text-transform: uppercase; pointer-events: none;">${result.tipo_coincidencia === 'actiu' ? 'ACTIU' : result.tipo_coincidencia}</span>
                  
  <span style="font-weight: 600; color: var(--bim-ui_bg-contrast-100); font-size: 1rem;">${(result.tipo_coincidencia === 'dispositiu' || result.tipo_coincidencia === 'actiu') ? result.dispositiu : result.departament}</span>
                  </div>
                  <div style="display: flex; gap: 1rem; font-size: 0.9rem; color: var(--bim-ui_bg-contrast-80);">
                    <span>🏢 ${result.edifici}</span>
                    <span>🏗️ ${result.planta}</span>
                    <span>📍 ${result.zona || '-'}</span>
                  </div>
                  ${result.space_dispositiu ? BUI.html`
                    <div style="font-size: 0.9rem; color: var(--bim-ui_bg-contrast-80); margin-top: 0.15rem;">
                      <span>🧩 ${result.space_dispositiu}</span>
                    </div>
                  ` : ''}
                </div>
              `)}
            </div>
          </div>
        ` : ''}
      </div>
    </bim-panel-section>
  `;
};
