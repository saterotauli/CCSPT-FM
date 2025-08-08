import * as BUI from "@thatopen/ui";
import * as OBC from "@thatopen/components";
import * as OBF from "@thatopen/components-front";
import * as FRAGS from "@thatopen/fragments";
import * as THREE from "three";
import { appIcons, modelStore, BUILDINGS } from "../../globals";
import { ClassificationUtils } from "../../utils/ClassificationUtils";

export interface ActiusPanelState {
  components: OBC.Components;
  viewCategory?: "Espais" | "Instal·lacions";
  subCategory?: string;
  departmentsLegend?: { name: string; color: string; count: number }[];
  searchQuery?: string;
  searchResults?: Array<{
    guid: string;
    departament: string;
    dispositiu: string;
    edifici: string;
    planta: string;
    total_area: number;
    element_count: number;
    tipo_coincidencia: string;
  }>;
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
  const viewCategory = state.viewCategory ?? "";
  const subCategory = state.subCategory ?? "";

  const components = state.components;

  // const escapeRegExp = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

  const performSearch = async (query: string) => {
    if (!query || query.trim().length < 2) {
      state.searchResults = [];
      update(state);
      return;
    }

    try {
      console.log(`🔍 Buscando: "${query}"`);
      const url = `/api/ifcspace/search-all?query=${encodeURIComponent(query.trim())}`;
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
        'RAC': ['CCSPT-RAC-M3D-AS.frag'],
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

                   const clearDepartmentStyles = async () => {
       const highlighter = components.get(OBF.Highlighter);
       for (const [styleName] of highlighter.styles) {
         if (typeof styleName === "string" && styleName.startsWith("dept:")) {
           await highlighter.clear(styleName);
           highlighter.styles.delete(styleName);
         }
       }
       restoreModelMaterials();
       
       // Limpiar markers cuando se desactiva
       const marker = components.get(OBF.Marker);
       marker.list.clear();
       
       // Limpiar la leyenda cuando se desactiva
       updateLegendDisplay([]);
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
                    
                    // Crear el elemento 2D con el nombre del dispositivo
                    console.log(`🎨 Creando marker con texto: "${deviceName}"`);
                    
                    // Crear el elemento usando el enfoque del ejemplo con línea conectora
                    const markerElement = BUI.Component.create(() => 
                      BUI.html`
                        <div data-marker="true" style="position: relative; display: flex; flex-direction: column; align-items: center;">
                          <!-- Etiqueta -->
                          <div style="font-size: 12px; background: rgba(0,0,0,0.8); color: white; padding: 2px 6px; border-radius: 4px; white-space: nowrap; font-family: Arial, sans-serif; box-shadow: 0 2px 4px rgba(0,0,0,0.3);">${deviceName}</div>
                          <!-- Línea conectora -->
                          <div style="width: 2px; height: 20px; background: rgba(255,255,255,0.6); margin-top: 2px;"></div>
                        </div>
                      `
                    );
                    
                    // Crear el marker en la posición del elemento
                    try {
                      console.log(`🎯 Intentando crear marker:`, {
                        world: world,
                        markerElement: markerElement,
                        position: elementPosition,
                        deviceName: deviceName
                      });
                      
                      // Calcular posición por encima del elemento
                      const elevatedPosition = new THREE.Vector3(
                        elementPosition.x,
                        elementPosition.y + 2, // Elevar 2 unidades por encima
                        elementPosition.z
                      );
                      
                      marker.create(world, markerElement, elevatedPosition);
                      console.log(`📍 Marker creado para ${deviceName} en posición elevada:`, elevatedPosition);
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
                         console.log(`📱 Índice fuera de rango: positionIndex=${positionIndex}, guids.length=${targetDept.guids.length}`);
                       }
                     
                                           // Crear el elemento 2D con el nombre del dispositivo
                      console.log(`🎨 Creando marker con texto: "${deviceName}"`);
                      
                                                                     // Crear el elemento usando el enfoque del ejemplo con línea conectora
                        const markerElement = BUI.Component.create(() => 
                          BUI.html`
                            <div data-marker="true" style="position: relative; display: flex; flex-direction: column; align-items: center;">
                              <!-- Etiqueta -->
                              <div style="font-size: 12px; background: rgba(0,0,0,0.8); color: white; padding: 2px 6px; border-radius: 4px; white-space: nowrap; font-family: Arial, sans-serif; box-shadow: 0 2px 4px rgba(0,0,0,0.3);">${deviceName}</div>
                              <!-- Línea conectora -->
                              <div style="width: 2px; height: 20px; background: rgba(255,255,255,0.6); margin-top: 2px;"></div>
                            </div>
                          `
                        );
                     
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
                           
                           marker.create(world, markerElement, elevatedPosition);
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
        state.departmentsLegend = legendItems;
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
           <div style="font-weight: 600; color: var(--bim-ui_bg-contrast-100); margin-bottom: 0.25rem; font-size: 0.875rem;">Cercador</div>
           <div style="position: relative; width: 100%;">
             <input
               type="text"
               placeholder="Cerca departaments i dispositius..."
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
           </div>
         </div>

        <!-- Resultados de búsqueda -->
        ${state.searchResults && state.searchResults.length > 0 ? BUI.html`
          <div style="margin-bottom: 0.5rem;">
            <div style="font-weight: 600; color: var(--bim-ui_bg-contrast-100); margin-bottom: 0.25rem; font-size: 0.875rem;">Resultats (${state.searchResults.length})</div>
            <div style="max-height: 20rem; overflow: auto; border: 1px solid var(--bim-ui_bg-contrast-40); background: var(--bim-ui_bg-contrast-20); border-radius: 0.5rem; padding: 0.5rem;">
              ${state.searchResults.map((result, index) => BUI.html`
                <div 
                  style="display: flex; flex-direction: column; gap: 0.25rem; padding: 0.5rem; border-radius: 0.375rem; background: var(--bim-ui_bg-contrast-10); margin-bottom: 0.25rem; cursor: pointer; transition: background-color 0.2s ease;"
                  @mouseover=${(e: Event) => {
                    const div = e.target as HTMLDivElement;
                    div.style.backgroundColor = 'var(--bim-ui_bg-contrast-30)';
                  }}
                  @mouseout=${(e: Event) => {
                    const div = e.target as HTMLDivElement;
                    div.style.backgroundColor = 'var(--bim-ui_bg-contrast-10)';
                  }}
                                     @click=${async () => {
                     try {
                       const displayName = result.tipo_coincidencia === 'dispositiu' ? result.dispositiu : result.departament;
                       console.log(`🎯 Navegando a: ${displayName} en edificio ${result.edifici}`);
                       
                       const fragments = components.get(OBC.FragmentsManager);
                       const currentState = modelStore.getState();
                       
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
                        // Para elementos de departamento, usar focusOnDepartment
                        if (result.tipo_coincidencia === 'departament') {
                          await focusOnDepartment(result.departament);
                        } else {
                          // Para dispositivos, aplicar efecto fantasma y highlight
                          await focusOnDevice(result.guid, displayName);
                        }
                     } catch (error) {
                       console.error('❌ Error navegando al elemento:', error);
                     }
                   }}
                >
                                     <div style="display: flex; align-items: center; gap: 0.5rem;">
                     <span style="font-size: 0.75rem; padding: 0.125rem 0.375rem; border-radius: 0.25rem; background: ${result.tipo_coincidencia === 'departament' ? 'var(--bim-ui_accent-base)' : result.tipo_coincidencia === 'dispositiu' ? '#10b981' : '#f59e0b'}; color: white; font-weight: 600; text-transform: uppercase; pointer-events: none;">${result.tipo_coincidencia}</span>
                     <span style="font-weight: 600; color: var(--bim-ui_bg-contrast-100); font-size: 0.875rem;">${result.tipo_coincidencia === 'dispositiu' ? result.dispositiu : result.departament}</span>
                   </div>
                                     <div style="display: flex; gap: 1rem; font-size: 0.75rem; color: var(--bim-ui_bg-contrast-80);">
                     <span>🏢 ${result.edifici}</span>
                     <span>🏗️ ${result.planta}</span>
                     <span>📐 ${result.total_area?.toFixed(1) || '0.0'} m²</span>
                   </div>
                </div>
              `)}
            </div>
          </div>
        ` : ''}
        <select
          style="padding: 0.75rem; border: 1px solid var(--bim-ui_bg-contrast-40); border-radius: 0.375rem; background: var(--bim-ui_bg-contrast-20); color: var(--bim-ui_bg-contrast-100); font-size: 0.875rem; font-family: inherit; cursor: pointer; transition: all 0.2s ease; outline: none;"
          @change=${(e: Event) => {
      const select = e.target as HTMLSelectElement;
      state.viewCategory = (select.value || "") as any;
      state.subCategory = "";
      update(state);
    }}
          @focus=${(e: Event) => {
      const select = e.target as HTMLSelectElement;
      select.style.borderColor = 'var(--bim-ui_accent-base)';
      select.style.boxShadow = '0 0 0 2px rgba(40, 180, 215, 0.2)';
    }}
          @blur=${(e: Event) => {
      const select = e.target as HTMLSelectElement;
      select.style.borderColor = 'var(--bim-ui_bg-contrast-40)';
      select.style.boxShadow = 'none';
    }}
        >
          <option value="">Sel·lecciona àmbit...</option>
          <option value="Espais" ?selected=${viewCategory === 'Espais'}>Espais</option>
          <option value="Instal·lacions" ?selected=${viewCategory === 'Instal·lacions'}>Instal·lacions</option>
        </select>

        ${viewCategory === 'Espais' ? BUI.html`
          <select
            style="padding: 0.75rem; border: 1px solid var(--bim-ui_bg-contrast-40); border-radius: 0.375rem; background: var(--bim-ui_bg-contrast-20); color: var(--bim-ui_bg-contrast-100); font-size: 0.875rem; font-family: inherit; cursor: pointer; transition: all 0.2s ease; outline: none;"
            @change=${async (e: Event) => {
        const select = e.target as HTMLSelectElement;
        state.subCategory = select.value || "";
        modelStore.setDepartamentsActive(state.subCategory === "Departaments" && state.viewCategory === 'Espais');
        update(state);
                 if (modelStore.getState().isDepartamentsActive) await colorizeDepartments();
                  else {
            await clearDepartmentStyles();
            // Limpiar la leyenda cuando se desactiva Departaments
            state.departmentsLegend = [];
            modelStore.setDepartmentsLegend([]);
          }
      }}
            @focus=${(e: Event) => {
        const select = e.target as HTMLSelectElement;
        select.style.borderColor = 'var(--bim-ui_accent-base)';
        select.style.boxShadow = '0 0 0 2px rgba(40, 180, 215, 0.2)';
      }}
            @blur=${(e: Event) => {
        const select = e.target as HTMLSelectElement;
        select.style.borderColor = 'var(--bim-ui_bg-contrast-40)';
        select.style.boxShadow = 'none';
      }}
          >
            <option value="">Sel·lecciona...</option>
            <option value="Departaments" ?selected=${subCategory === 'Departaments'}>Departaments</option>
            <option value="Dispositius" ?selected=${subCategory === 'Dispositius'}>Dispositius</option>
          </select>
        ` : ''}

        ${viewCategory === 'Instal·lacions' ? BUI.html`
          <select
            style="padding: 0.75rem; border: 1px solid var(--bim-ui_bg-contrast-40); border-radius: 0.375rem; background: var(--bim-ui_bg-contrast-20); color: var(--bim-ui_bg-contrast-100); font-size: 0.875rem; font-family: inherit; cursor: pointer; transition: all 0.2s ease; outline: none;"
            @change=${(e: Event) => {
        const select = e.target as HTMLSelectElement;
        state.subCategory = select.value || "";
        update(state);
      }}
            @focus=${(e: Event) => {
        const select = e.target as HTMLSelectElement;
        select.style.borderColor = 'var(--bim-ui_accent-base)';
        select.style.boxShadow = '0 0 0 2px rgba(40, 180, 215, 0.2)';
      }}
            @blur=${(e: Event) => {
        const select = e.target as HTMLSelectElement;
        select.style.borderColor = 'var(--bim-ui_bg-contrast-40)';
        select.style.boxShadow = 'none';
      }}
          >
            <option value="">Sel·lecciona...</option>
            <option value="Clima" ?selected=${subCategory === 'Clima'}>Clima</option>
            <option value="Fontaneria" ?selected=${subCategory === 'Fontaneria'}>Fontaneria</option>
            <option value="PCI" ?selected=${subCategory === 'PCI'}>PCI</option>
            <option value="Sanejament" ?selected=${subCategory === 'Sanejament'}>Sanejament</option>
            <option value="Electricitat" ?selected=${subCategory === 'Electricitat'}>Electricitat</option>
            <option value="Il·luminació" ?selected=${subCategory === 'Il·luminació'}>Il·luminació</option>
            <option value="Informàtica" ?selected=${subCategory === 'Informàtica'}>Informàtica</option>
            <option value="Seguretat" ?selected=${subCategory === 'Seguretat'}>Seguretat</option>
          </select>
        ` : ''}

                 ${viewCategory === 'Espais' && subCategory === 'Departaments' ? BUI.html`
           <div id="departments-legend" style="margin-top: 0.5rem; display: flex; flex-direction: column; gap: 0.25rem;">
             <div style="font-weight: 700; color: var(--bim-ui_bg-contrast-100); letter-spacing: 0.3px;">Llegenda</div>
             <div style="max-height: 24rem; overflow: auto; border: 1px solid var(--bim-ui_bg-contrast-40); background: var(--bim-ui_bg-contrast-20); border-radius: 0.5rem; padding: 0.5rem; box-shadow: 0 1px 2px rgba(0,0,0,0.25);">
               <div id="legend-content"></div>
             </div>
           </div>
         ` : ''}
      </div>
    </bim-panel-section>
  `;
};


