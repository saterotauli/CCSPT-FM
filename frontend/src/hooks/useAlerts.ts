import { useCallback, useEffect, useRef } from 'react';
import * as THREE from "three";
import * as OBC from "@thatopen/components";
import * as OBF from "@thatopen/components-front";
import { ALERT_COLORS } from '../globals';

interface UseAlertsProps {
  code: string | undefined;
  sensorData: any[];
  activeParameter: 'all' | 'temperatura' | 'humitat' | 'ppm';
  buildingColor: string;
  fragmentsRef: React.MutableRefObject<OBC.FragmentsManager | null>;
  highlighterRef: React.MutableRefObject<OBF.Highlighter | null>;
  worldRef: React.MutableRefObject<OBC.World | null>;
  markerRef: React.MutableRefObject<OBF.Marker | null>;
  selectedLevel: string | null;
  setAlerts: (alerts: any[]) => void;
  componentsRef: React.MutableRefObject<OBC.Components | null>;
  severityFilter?: Array<'ok'|'baix'|'mitjà'|'alt'>;
}

export const useAlerts = ({
  code,
  sensorData,
  activeParameter,
  buildingColor,
  fragmentsRef,
  highlighterRef,
  worldRef,
  markerRef,
  selectedLevel,
  setAlerts,
  componentsRef,
  severityFilter,
}: UseAlertsProps) => {
  
  const performInitialColorization = useCallback(async () => {
    try {
      console.log('=== Initial colorization after model load ===');
      const fragments = fragmentsRef.current;
      if (!fragments) {
        console.log('No fragments available for initial colorization');
        return;
      }

      // Check if fragments is properly initialized
      if (!fragments.core) {
        console.log('FragmentsManager not ready, skipping colorization');
        return;
      }

      // Initialize highlighter if not already done
      if (!highlighterRef.current) {
        const components = fragments.components;
        const highlighter = components.get(OBF.Highlighter);
        highlighter.setup({
          world: worldRef.current!,
          selectMaterialDefinition: {
            color: new THREE.Color("#bcf124"),
            opacity: 1,
            transparent: false,
            renderedFaces: 0,
          },
        });
        highlighterRef.current = highlighter;
        
        // Create custom highlight styles for alerts
        highlighter.styles.set("baix", {
          color: new THREE.Color(ALERT_COLORS.BAIX),
          opacity: 1.0,
          transparent: false,
          renderedFaces: 0,
        });

        highlighter.styles.set("mitja", {
          color: new THREE.Color(ALERT_COLORS.MITJA),
          opacity: 1.0,
          transparent: false,
          renderedFaces: 0,
        });

        highlighter.styles.set("alt", {
          color: new THREE.Color(ALERT_COLORS.ALT),
          opacity: 1.0,
          transparent: false,
          renderedFaces: 0,
        });

        highlighter.styles.set("ok", {
          color: new THREE.Color(ALERT_COLORS.OK),
          opacity: 1.0,
          transparent: false,
          renderedFaces: 0,
        });
        
        console.log("Highlighter initialized for initial colorization");
      }

      // Get model and IFCSPACE elements
      const model = fragments.list.get(code || '') || Array.from(fragments.list.values())[0];
      if (!model) {
        console.log('No model found for initial colorization');
        return;
      }

      // Get all IFCSPACE elements
      const categories = await (model as any).getItemsOfCategories([/IFCSPACE/i]);
      const spaceIds: number[] = (categories?.IFCSPACE || []) as number[];
      
      if (spaceIds.length === 0) {
        console.log('No IFCSPACE elements found for initial colorization');
        return;
      }

      console.log('Initial colorization: Found', spaceIds.length, 'spaces');
      
      // For initial colorization, trigger alert-based coloring if alerts are available
      const currentHighlighter = highlighterRef.current;
      if (currentHighlighter) {
        // Clear any existing highlights first
        currentHighlighter.clear("baix");
        currentHighlighter.clear("mitja");
        currentHighlighter.clear("alt");
        currentHighlighter.clear("ok");
        console.log('Initial colorization: Cleared existing highlights');
        
        // Trigger alert-based coloring if alerts are available
        if (sensorData.length > 0) {
          console.log('Initial colorization: Triggering alert-based coloring with', sensorData.length, 'sensors');
          setTimeout(() => {
            colorizeSpacesByAlerts();
          }, 500); // Small delay to ensure highlighter is ready
        }
      }

    } catch (error) {
      console.error('Error in initial colorization:', error);
    }
  }, [code, fragmentsRef, highlighterRef, worldRef, sensorData]);

  // Ref para evitar actualizaciones innecesarias
  const lastSensorDataRef = useRef<any[]>([]);
  const lastCodeRef = useRef<string>('');

  const colorizeSpacesByAlerts = useCallback(async (existingAlerts?: any[]) => {
    try {
      console.log('=== Colorizing spaces by alerts ===');
      const fragments = fragmentsRef.current;
      const highlighter = highlighterRef.current;
      
      if (!fragments || !code) {
        console.log('Missing fragments or code');
        return;
      }

      // Check if fragments is properly initialized
      if (!fragments.core) {
        console.log('FragmentsManager not ready for colorization, skipping');
        return;
      }
      
      if (!highlighter) {
        console.log('Highlighter not initialized yet, waiting...');
        // Try to initialize highlighter if fragments are ready
        if (fragments && fragments.list.size > 0) {
          try {
            const model = Array.from(fragments.list.values())[0];
            const components = (model as any).components;
            if (components) {
              const newHighlighter = components.get(OBF.Highlighter);
              if (newHighlighter) {
                // Setup the highlighter
                newHighlighter.setup({
                  world: worldRef.current!,
                  selectMaterialDefinition: {
                    color: new THREE.Color("#bcf124"),
                    opacity: 1,
                    transparent: false,
                    renderedFaces: 0,
                  },
                });
                
                // Create custom highlight styles for alerts
                newHighlighter.styles.set("baix", {
                  color: new THREE.Color(ALERT_COLORS.BAIX),
                  opacity: 1.0,
                  transparent: false,
                  renderedFaces: 0,
                });

                newHighlighter.styles.set("mitja", {
                  color: new THREE.Color(ALERT_COLORS.MITJA),
                  opacity: 1.0,
                  transparent: false,
                  renderedFaces: 0,
                });

                newHighlighter.styles.set("alt", {
                  color: new THREE.Color(ALERT_COLORS.ALT),
                  opacity: 1.0,
                  transparent: false,
                  renderedFaces: 0,
                });

                newHighlighter.styles.set("ok", {
                  color: new THREE.Color(ALERT_COLORS.OK),
                  opacity: 1.0,
                  transparent: false,
                  renderedFaces: 0,
                });
                
                highlighterRef.current = newHighlighter;
                console.log('Highlighter initialized on demand with custom styles');
              }
            }
          } catch (error) {
            console.log('Could not initialize highlighter on demand:', error);
            return;
          }
        } else {
          return;
        }
      }

      const model = fragments.list.get(code) || Array.from(fragments.list.values())[0];
      if (!model) {
        console.log('No model found');
        return;
      }

      // Get the current highlighter reference (might have been updated)
      const currentHighlighter = highlighterRef.current;
      if (!currentHighlighter) {
        return;
      }
      
      if (sensorData.length === 0) {
        console.log('No sensor data to process, keeping existing colors');
        return;
      }

      // Clear previous alert highlights only (keep department colors)
      await currentHighlighter.clear("baix");
      await currentHighlighter.clear("mitja");
      await currentHighlighter.clear("alt");
      await currentHighlighter.clear("ok");

      // Get all IFCSPACE elements
      const categories = await (model as any).getItemsOfCategories([/IFCSPACE/i]);
      const spaceIds: number[] = (categories?.IFCSPACE || []) as number[];
      
      if (spaceIds.length === 0) {
        console.log('No IFCSPACE elements found');
        return;
      }

      // Get space data to match with alerts
      const spaceData = await model.getItemsData(spaceIds, {
        attributesDefault: true,
      });

      const baixIds: number[] = [];
      const mitjaIds: number[] = [];
      const altIds: number[] = [];

      // Use the same logic as generateAlerts for consistency
      const thresholds = {
        temperatura: { min: 19, max: 25 }, // Rango óptimo - UNIFICADO con generateAlerts
        humitat: { min: 40, max: 60 }, // Rango óptimo
        ppm: { min: 0, max: 600 } // Rango óptimo
      };
      
      // Función de cálculo de severidad basada en porcentaje de desviación (same as generateAlerts)
      const computeSeverity = (p: 'temperatura' | 'humitat' | 'ppm', value: number): 'ok' | 'baix' | 'mitjà' | 'alt' => {
        const currentThreshold = thresholds[p];
        
        // Si el valor está dentro del rango óptimo, no hay alerta
        if (value >= currentThreshold.min && value <= currentThreshold.max) {
          return 'ok';
        }
        
        // Si está fuera del rango, calcular la severidad según qué tan lejos esté
        const range = currentThreshold.max - currentThreshold.min;
        let deviationPercent: number;
        
        if (value < currentThreshold.min) {
          // Valor por debajo del mínimo
          deviationPercent = (currentThreshold.min - value) / range;
        } else {
          // Valor por encima del máximo
          deviationPercent = (value - currentThreshold.max) / range;
        }
        
        if (deviationPercent > 1.00) return 'alt';    // >100% fuera del rango: Alta severidad
        if (deviationPercent > 0.60) return 'mitjà';  // 60-100% fuera del rango: Media severidad
        if (deviationPercent > 0.25) return 'baix';   // 25-60% fuera del rango: Baja severidad
        return 'ok';                                   // <25% fuera del rango: Normal
      };

      // USAR LAS ALERTAS EXISTENTES en lugar de recalcular para consistencia con markers
      const alertsByGuid = new Map<string, 'baix' | 'mitjà' | 'alt'>();
      
      console.log('=== ColorizeSpacesByAlerts Debug ===');
      console.log('sensorData length:', sensorData.length);
      console.log('selectedLevel:', selectedLevel);
      console.log('activeParameter:', activeParameter);
      console.log('code (building):', code);
      console.log('existingAlerts provided:', !!existingAlerts);
      
      // Aplicar colorización tanto en modo "Mostrar tot" como en nivel específico
      // Los markers se crearán solo en nivel específico, pero los highlights se mostrarán siempre

      // SIEMPRE recalcular desde sensorData para consistencia
      // Esto asegura que la colorización use la misma lógica que el conteo de alertas
      console.log('Recalculating colorization from sensorData for consistency');
      const buildingSensors = sensorData.filter(s => s.edifici === code);
      console.log('buildingSensors length:', buildingSensors.length);
      
      buildingSensors.forEach(sensor => {
        // Skip if wrong level
        if (selectedLevel && sensor.planta !== selectedLevel) {
          return;
        }
        
        // Skip if no spaceGuid
        if (!sensor.spaceGuid) {
          return;
        }
        
        // Skip if no dispositiu
        if (!sensor.dispositiu) {
          return;
        }
        
        // Calculate severity for each parameter using the same logic as generateAlerts
        const parameters = [
          { key: 'temperatura', value: sensor.temperature },
          { key: 'humitat', value: sensor.humidity },
          { key: 'ppm', value: sensor.ppm }
        ];
        
        let maxSeverity: 'baix' | 'mitjà' | 'alt' | 'ok' = 'ok';
        
        for (const param of parameters) {
          const severity = computeSeverity(param.key as 'temperatura' | 'humitat' | 'ppm', param.value);
          if (severity !== 'ok') {
            // Update max severity using the same logic as generateAlerts
            if (maxSeverity === 'ok' || 
                (severity === 'alt') || 
                (severity === 'mitjà' && maxSeverity === 'baix')) {
              maxSeverity = severity;
            }
          }
        }
        
        // Store severity for this space
        if (maxSeverity !== 'ok') {
          // Respect severity filter if provided
          if (severityFilter && !severityFilter.includes(maxSeverity as 'baix'|'mitjà'|'alt')) {
            return;
          }
          alertsByGuid.set(sensor.spaceGuid, maxSeverity);
          console.log(`Alert found for ${sensor.spaceGuid}: max severity -> ${maxSeverity}`);
        }
      });

      console.log(`Total alerts found: ${alertsByGuid.size}`);

      const spaceGuids: string[] = [];
      
      // Extract GUIDs from spaceData
      for (const space of spaceData) {
        if (Array.isArray(space)) continue;

        let guid = (space as any)._guid.value;     
        
        if (guid) spaceGuids.push(guid);
      }

      // Check if any alert GUID exists in space GUIDs
      const alertKeys = Array.from(alertsByGuid.keys());
      const foundMatches = alertKeys.filter(k => spaceGuids.includes(k));

      console.log(`Alert GUIDs: ${alertKeys.length}, Space GUIDs: ${spaceGuids.length}, Found matches: ${foundMatches.length}`);

      // Match spaces with alerts using the found matches (GUID path)
      let matchedCount = 0;
      for (const matchingGuid of foundMatches) {
        for (const space of spaceData) {
          if (Array.isArray(space)) continue;
          const spaceGuid: string | null = (space as any)?._guid?.value ?? null;
          if (spaceGuid === matchingGuid) {
            const alertSeverity = alertsByGuid.get(spaceGuid);
            if (alertSeverity) {
              matchedCount++;
              const spaceLocalId = (space as any)?._localId?.value ?? (space as any)?.expressID;
              if (spaceLocalId != null) {
                if (alertSeverity === 'baix') baixIds.push(spaceLocalId);
                else if (alertSeverity === 'mitjà') mitjaIds.push(spaceLocalId);
                else if (alertSeverity === 'alt') altIds.push(spaceLocalId);
                console.log(`Matched space ${spaceLocalId} with severity ${alertSeverity}`);
              }
            }
            break;
          }
        }
      }

      // Fallback: if we didn't match by GUID (or the keys look like room codes), try matching by room code in Name
      const looksLikeCodes = alertKeys.length > 0 && alertKeys.every(k => typeof k === 'string' && k.length < 20 && k.includes('-'));
      if ((matchedCount === 0) || looksLikeCodes) {
        console.log('Using fallback matching by room code');
        try {
          // Build a normalized map of codeParts -> severity
          // e.g., 'CQA-P00-007' => '007' and also full code
          const codeEntries: Array<{ raw: string; short: string; sev: 'baix' | 'mitjà' | 'alt' }> = [];
          for (const [raw, sev] of Array.from(alertsByGuid.entries())) {
            if (sev !== 'baix' && sev !== 'mitjà' && sev !== 'alt') continue;
            const parts = String(raw).split('-');
            const short = parts[2] || parts[parts.length - 1] || raw; // room number part
            codeEntries.push({ raw: raw.toUpperCase(), short: short.toUpperCase(), sev });
          }

          console.log(`Code entries for fallback matching:`, codeEntries);

          for (const space of spaceData) {
            if (Array.isArray(space)) continue;
            const spaceLocalId = (space as any)?._localId?.value ?? (space as any)?.expressID;
            const name = String(((space as any)?.Name?.value ?? (space as any)?.Name ?? (space as any)?.LongName?.value ?? (space as any)?.LongName ?? '')).toUpperCase();
            const spaceGuid = (space as any)?._guid?.value ?? null;
            
            if (!name && !spaceGuid) continue;
            
            for (const ce of codeEntries) {
              let matched = false;
              
              // Try matching by space GUID first (most reliable)
              if (spaceGuid && spaceGuid === ce.raw) {
                matched = true;
              }
              // Try matching by name containing the short code or full code
              else if (name && (name.includes(ce.short) || name.includes(ce.raw))) {
                matched = true;
              }
              
              if (matched && spaceLocalId != null) {
                matchedCount++;
                if (ce.sev === 'baix') baixIds.push(spaceLocalId);
                else if (ce.sev === 'mitjà') mitjaIds.push(spaceLocalId);
                else if (ce.sev === 'alt') altIds.push(spaceLocalId);
                console.log(`Fallback matched space ${spaceLocalId} (${name || 'no-name'}, GUID: ${spaceGuid || 'no-guid'}) with severity ${ce.sev}`);
                break;
              }
            }
          }
        } catch (e) {
          console.debug('Fallback matching by room code failed', e);
        }
      }

      console.log(`Total matches found (GUID+fallback): ${matchedCount}`);
      console.log(`Spaces to highlight - Baix: ${baixIds.length}, Mitjà: ${mitjaIds.length}, Alt: ${altIds.length}`);

      // Compute OK ids (spaces without alerts) only if requested by filter
      let okIds: number[] = [];
      if (severityFilter && severityFilter.includes('ok')) {
        try {
          const model = fragments.list.get(code);
          if (model) {
            const categories = await (model as any).getItemsOfCategories([/IFCSPACE/i]);
            const allSpaceIds: number[] = (categories?.IFCSPACE || []) as number[];
            const alerted = new Set<number>([...baixIds, ...mitjaIds, ...altIds]);
            okIds = allSpaceIds.filter(id => !alerted.has(id));
            console.log(`OK spaces computed: ${okIds.length}`);
          }
        } catch (e) {
          console.debug('Could not compute OK ids', e);
        }
      }
      console.log(`Baix IDs:`, baixIds);
      console.log(`Mitjà IDs:`, mitjaIds);
      console.log(`Alt IDs:`, altIds);

      // Apply highlights using the highlighter
      if (baixIds.length > 0) {
        const baixMap: { [modelId: string]: Set<number> } = {};
        baixMap[code] = new Set(baixIds);
        console.log('🟡 Applying baix highlighting with map:', baixMap);
        console.log('🟡 Highlighter instance:', currentHighlighter);
        console.log('🟡 Code:', code);
        try {
          await currentHighlighter.highlightByID("baix", baixMap, false);
          console.log(`✅ Applied yellow highlight to ${baixIds.length} spaces`);
        } catch (err) {
          console.error('❌ Error applying baix highlight:', err);
        }
      }
      
      if (mitjaIds.length > 0) {
        const mitjaMap: { [modelId: string]: Set<number> } = {};
        mitjaMap[code] = new Set(mitjaIds);
        console.log('🟠 Applying mitjà highlighting with map:', mitjaMap);
        try {
          await currentHighlighter.highlightByID("mitja", mitjaMap, false);
          console.log(`✅ Applied orange highlight to ${mitjaIds.length} spaces`);
        } catch (err) {
          console.error('❌ Error applying mitjà highlight:', err);
        }
      }
      
      if (altIds.length > 0) {
        const altMap: { [modelId: string]: Set<number> } = {};
        altMap[code] = new Set(altIds);
        console.log('🔴 Applying alt highlighting with map:', altMap);
        try {
          await currentHighlighter.highlightByID("alt", altMap, false);
          console.log(`✅ Applied red highlight to ${altIds.length} spaces`);
        } catch (err) {
          console.error('❌ Error applying alt highlight:', err);
        }
      }

      // Apply OK highlighting last if requested
      if (okIds.length > 0) {
        const okMap: { [modelId: string]: Set<number> } = {};
        okMap[code] = new Set(okIds);
        console.log('🟢 Applying ok highlighting with map:', okMap);
        try {
          await currentHighlighter.highlightByID("ok", okMap, false);
          console.log(`✅ Applied ok highlight to ${okIds.length} spaces`);
        } catch (err) {
          console.error('❌ Error applying ok highlight:', err);
        }
      }

      // Force update the model to show highlights
      if (fragmentsRef.current?.core) {
        try {
          await fragmentsRef.current.core.update(true);
          console.log('🔄 Model updated after applying highlights');
        } catch (err) {
          console.error('❌ Error updating model:', err);
        }
      }

    } catch (error) {
      console.error('Error colorizing spaces by alerts:', error);
    }
  }, [sensorData, code, activeParameter, fragmentsRef, highlighterRef, worldRef, selectedLevel, severityFilter]);

  // Create markers for alerts
  const createMarkersForAlerts = useCallback(async (alerts: any[]) => {
    try {
      const marker = markerRef.current;
      const fragments = fragmentsRef.current;
      const world = worldRef.current;
      
      if (!marker || !fragments || !world || !code) {
        console.log('Missing marker, fragments, world or code for creating markers');
        return;
      }

      // Create markers regardless of selected level; we will filter if a level is selected

      // Get the model
      const model = fragments.list.get(code);
      if (!model) {
        console.log('Model not found for creating markers');
        return;
      }

      // Clear existing markers first using the correct API
      const worldMarkers = marker.getWorldMarkerList(world);
      worldMarkers.forEach((_, markerId) => {
        marker.delete(markerId);
      });
      console.log('Cleared existing markers using correct API');

      // Filter alerts by selected level if provided and by severityFilter (empty => none)
      let filteredAlerts = selectedLevel ? alerts.filter(alert => alert.planta === selectedLevel) : alerts;
      if (severityFilter !== undefined) {
        filteredAlerts = filteredAlerts.filter(a => severityFilter!.includes(a.severity));
      }
      console.log(`Creating markers for ${filteredAlerts.length} alerts${selectedLevel ? ` in level ${selectedLevel}` : ''}`);

      // Get BoundingBoxer component
      const boxer = componentsRef.current?.get(OBC.BoundingBoxer);
      if (!boxer) {
        console.error('BoundingBoxer not available');
        return;
      }

      // Get all IFCSPACE items
      const categories = await (model as any).getItemsOfCategories([/IFCSPACE/i]);
      const spaceIds: number[] = (categories?.IFCSPACE || []) as number[];
      
      if (!spaceIds || spaceIds.length === 0) {
        console.log('No IFCSPACE items found');
        return;
      }

      // Get GUIDs for all spaces
      const mappedGuids: string[] = await (model as any).getGuidsByLocalIds(spaceIds);
      
      // Create a map of GUID to local ID
      const guidToLocalId = new Map<string, number>();
      if (Array.isArray(mappedGuids)) {
        mappedGuids.forEach((guid, index) => {
          if (guid) guidToLocalId.set(guid, spaceIds[index]);
        });
      }
      

      console.log(`🔍 Processing ${filteredAlerts.length} alerts for markers`);
      
      // Create markers for each filtered alert
      // En modo "Mostrar tot" (selectedLevel === null), no crear markers para mantener vista limpia
      // En nivel específico (selectedLevel !== null), crear markers para ese nivel
      if (!selectedLevel) {
        console.log(`🔍 No level selected (Mostrar tot), skipping alert markers for clean view`);
        return;
      }
      
      for (const alert of filteredAlerts) {
        try {
          // El alert.id contiene el código del espacio (ej: "UDI-P00-001-temperatura")
          // Extraer el código del espacio (sin el parámetro)
          const spaceCodi = alert.id.replace(/-(temperatura|humitat|ppm)$/i, '');
          
          // Buscar el GUID del elemento geométrico en la tabla ifcspace por el código
          let geometricGuid: string | null = null;
          let localId: number | null = null;
          
          try {
            // Obtener todos los datos de espacios para buscar por código
            const itemsData = await (model as any).getItemsData(spaceIds, { attributesDefault: true });
            const spaceCodeUpper = spaceCodi.toUpperCase();
            
            for (let i = 0; i < itemsData.length; i++) {
              const space = itemsData[i];
              const name = String(space?.Name?.value ?? space?.Name ?? space?.LongName?.value ?? space?.LongName ?? '').toUpperCase();
              
              // Buscar coincidencia exacta del código de espacio
              if (name === spaceCodeUpper) {
                geometricGuid = (space as any)?._guid?.value;
                localId = spaceIds[i];
                break;
              }
            }
          } catch (e) {
            console.error('Error buscando espacio en ifcspace:', e);
          }

          if (!localId || !geometricGuid) {
            continue;
          }

          // Calculate the exact center using bounding box for precise positioning
          let markerPosition: THREE.Vector3;
          try {
            const boxer = componentsRef.current?.get(OBC.BoundingBoxer);
            if (!boxer) {
              continue;
            }

            // Create ModelIdMap for this specific space using the geometric GUID
            const modelIdMap: OBC.ModelIdMap = { [code]: new Set([localId]) };
            
            // Clear boxer and add the specific space
            boxer.list.clear();
            await boxer.addFromModelIdMap(modelIdMap);
            
            // Get the bounding box for this space
            const boundingBox = boxer.get();
            if (!boundingBox || boundingBox.isEmpty()) {
              boxer.list.clear();
              continue;
            }

            // Calculate the EXACT center using the same method as espais.ts
            const center = new THREE.Vector3();
            boundingBox.getCenter(center);
            const height = Math.max(0, boundingBox.max.y - boundingBox.min.y);
            const extra = Math.max(1.0, 0.2 * height); // Reducido: 20% height or 1m (más bajo)
            const topY = boundingBox.max.y + extra;
            
            // Position marker at the EXACT center of the element (same as espais.ts)
            markerPosition = new THREE.Vector3(center.x, topY, center.z);

            // Clear boxer after use
            boxer.list.clear();
          } catch (error) {
            console.error(`Error calculating position for ${alert.dispositiu}:`, error);
            continue;
          }

          // Create marker element with device name and value
          const markerElement = document.createElement('div');
          const bgColor = alert.severity === 'alt' ? ALERT_COLORS.ALT : 
                         alert.severity === 'mitjà' ? ALERT_COLORS.MITJA : ALERT_COLORS.BAIX;
           markerElement.style.cssText = `
             background: ${bgColor};
             border: 2px solid white;
             border-radius: 8px;
             cursor: pointer;
             padding: 6px 10px;
             font-size: 12px;
             font-weight: bold;
             color: ${alert.severity === 'alt' ? ALERT_COLORS.ALT_TEXT : 
                     alert.severity === 'mitjà' ? ALERT_COLORS.MITJA_TEXT : ALERT_COLORS.BAIX_TEXT};
             box-shadow: 0 3px 6px rgba(0,0,0,0.4);
             white-space: nowrap;
             text-align: center;
             min-width: 70px;
             pointer-events: auto;
             z-index: 1000;
           `;
          const unit = alert.paramType === 'ppm' ? 'ppm' : (alert.paramType === 'humitat' ? '%' : '°C');
          const formattedValue = alert.paramType === 'ppm' ? Math.round(alert.value) : alert.value.toFixed(1);
          markerElement.innerHTML = `
            <div style="font-size: 10px; margin-bottom: 2px;">${alert.dispositiu}</div>
            <div style="font-size: 12px;">${formattedValue}${unit}</div>
          `;
                    markerElement.title = `${alert.dispositiu}: ${formattedValue}${unit} (${alert.severity})`;

          // Add click handler to open alarm details panel
          markerElement.addEventListener('click', (e) => {
            e.stopPropagation();
            const clickEvent = new CustomEvent('alert-marker-click', {
              detail: { alert, localId }
            });
            document.dispatchEvent(clickEvent);
          });

          // Create marker using the top position
          marker.create(world, markerElement, markerPosition);
        } catch (error) {
          console.error(`Error creating marker for alert ${alert.id}:`, error);
        }
      }
      
      console.log(`✅ Alert markers created: ${filteredAlerts.length}`);
    } catch (error) {
      console.error('Error creating markers for alerts:', error);
    }
  }, [markerRef, fragmentsRef, worldRef, code, selectedLevel, severityFilter, activeParameter, componentsRef, sensorData]);

  // Create OK markers function
  const createOKMarkers = useCallback(async (filteredAlerts: any[]) => {
    try {
      console.log('🟢 Creating OK markers...');
      
      const marker = markerRef.current;
      const fragments = fragmentsRef.current;
      const world = worldRef.current;
      
      if (!marker || !fragments || !world || !code) {
        console.log('Missing dependencies for OK markers');
        return;
      }

      const model = fragments.list.get(code);
      if (!model) {
        console.log('Model not found for OK markers');
        return;
      }

      // Get building sensors only
      const buildingSensors = sensorData.filter(s => s.edifici === code);
      console.log(`📊 Building sensors: ${buildingSensors.length}`);
      
      // Get alert space codes to exclude
      const alertSpaceCodes = new Set<string>();
      filteredAlerts.forEach((a: any) => {
        const spaceCode = a.id.replace(/-(temperatura|humitat|ppm)$/i, '');
        alertSpaceCodes.add(spaceCode);
      });
      console.log(`🚫 Alert spaces to exclude: ${alertSpaceCodes.size}`);
      
      // Get space names to map codes to localIds
      const categories = await (model as any).getItemsOfCategories([/IFCSPACE/i]);
      const spaceIds: number[] = (categories?.IFCSPACE || []) as number[];
      
      // Get space data to extract names
      const itemsData = await (model as any).getItemsData(spaceIds, { attributesDefault: true });
      const codeToLocalIdMap = new Map<string, number>();
      
      for (let i = 0; i < spaceIds.length; i++) {
        const space = itemsData[i];
        const spaceName = String(space?.Name?.value ?? space?.Name ?? space?.LongName?.value ?? space?.LongName ?? '');
        if (spaceName) {
          const extractedCode = spaceName.split(' - ')[0]?.trim();
          if (extractedCode) {
            codeToLocalIdMap.set(extractedCode, spaceIds[i]);
          }
        }
      }
      console.log(`🗺️ Space mapping: ${codeToLocalIdMap.size} entries`);
      
      let okMarkerCount = 0;
      
      // Process each building sensor
      for (const sensor of buildingSensors) {
        // Skip if wrong level
        if (selectedLevel && sensor.planta !== selectedLevel) {
          continue;
        }
        
        // Skip if has alert
        if (alertSpaceCodes.has(sensor.spaceGuid)) {
          continue;
        }
        
        // Skip if no dispositiu
        if (!sensor.dispositiu) {
          continue;
        }
        
        // Find space in model
        const spaceLocalId = codeToLocalIdMap.get(sensor.spaceGuid);
        if (!spaceLocalId) {
          continue;
        }
        
        // Create marker element
        const markerElement = document.createElement('div');
        markerElement.style.cssText = `
          background: ${ALERT_COLORS.OK};
          border: 2px solid white;
          border-radius: 8px;
          cursor: pointer;
          padding: 6px 10px;
          font-size: 12px;
          font-weight: bold;
          color: ${ALERT_COLORS.OK_TEXT};
          box-shadow: 0 3px 6px rgba(0,0,0,0.4);
          white-space: nowrap;
          text-align: center;
          min-width: 70px;
          pointer-events: auto;
          z-index: 1000;
        `;
        
        // Display value
        let valueHtml = 'OK';
        if (activeParameter !== 'all') {
          let v: number | undefined;
          switch (activeParameter) {
            case 'temperatura': v = sensor.temperature; break;
            case 'humitat': v = sensor.humidity; break;
            case 'ppm': v = sensor.ppm; break;
          }
          if (typeof v === 'number') {
            const unit = activeParameter === 'ppm' ? 'ppm' : (activeParameter === 'humitat' ? '%' : '°C');
            valueHtml = `${v.toFixed(activeParameter === 'ppm' ? 0 : 1)}${unit}`;
          }
        }
        
        markerElement.innerHTML = `
          <div style="font-size: 10px;">${sensor.dispositiu}</div>
          <div style="font-size: 12px;">${valueHtml}</div>
        `;
        
        // Add tooltip
        markerElement.title = `${sensor.dispositiu}: ${valueHtml} (OK)`;
        
        // Add click handler to open alarm details panel (same as alert markers)
        markerElement.addEventListener('click', (e) => {
          e.stopPropagation();
          const clickEvent = new CustomEvent('alert-marker-click', {
            detail: { 
              alert: {
                id: `${sensor.spaceGuid}-ok`,
                buildingCode: code,
                planta: sensor.planta || 'P00',
                departament: sensor.departament || 'Desconegut',
                dispositiu: sensor.dispositiu,
                value: activeParameter === 'all' ? 'OK' : valueHtml,
                severity: 'ok',
                paramType: activeParameter === 'all' ? 'all' : activeParameter,
                deviation: 0
              }, 
              localId: spaceLocalId 
            }
          });
          document.dispatchEvent(clickEvent);
        });
        
        // Position marker
        const boxer = componentsRef.current?.get(OBC.BoundingBoxer);
        if (boxer) {
          const modelIdMap: OBC.ModelIdMap = { [code]: new Set([spaceLocalId]) };
          boxer.list.clear();
          await boxer.addFromModelIdMap(modelIdMap);
          const boundingBox = boxer.get();
          if (boundingBox && !boundingBox.isEmpty()) {
            const center = new THREE.Vector3();
            boundingBox.getCenter(center);
            const height = Math.max(0, boundingBox.max.y - boundingBox.min.y);
            const extra = Math.max(1.0, 0.2 * height);
            const markerPosition = new THREE.Vector3(center.x, boundingBox.max.y + extra, center.z);
            boxer.list.clear();
            
            marker.create(world, markerElement, markerPosition);
            okMarkerCount++;
            console.log(`✅ OK marker: ${sensor.dispositiu}`);
          }
        }
      }
      
      console.log(`🟢 OK markers created: ${okMarkerCount}`);
      
    } catch (e) {
      console.error('❌ Error creating OK markers:', e);
    }
  }, [markerRef, fragmentsRef, worldRef, code, selectedLevel, activeParameter, componentsRef, sensorData]);

  const generateAlerts = useCallback(() => {
      console.log('🔍 generateAlerts - Building:', code, 'Level:', selectedLevel, 'Filter:', severityFilter);
    
    if (!sensorData || !code) {
      console.log('Missing sensorData or code, returning');
      return;
    }
    
    // Generate alerts for all levels when selectedLevel === null (Mostrar tot mode)
    // Only skip OK markers creation in Mostrar tot mode
    console.log('Generating alerts for building:', code, 'level:', selectedLevel);
    
    // Clear previous alerts first
    setAlerts([]);
    
    try {
      const buildingSensors = sensorData.filter((s) => s.spaceGuid && s.edifici === code);
      console.log('📊 Building sensors:', buildingSensors.length);
      
      // Definir umbrales globales (simples y consistentes)
      const thresholds = {
        temperatura: { min: 19, max: 25 }, // Rango normal simple - UNIFICADO
        humitat: { min: 40, max: 60 }, // Rango normal simple
        ppm: { min: 0, max: 600 } // Rango normal simple
      };
      
      // Función de cálculo de severidad basada en porcentaje de desviación
      const computeSeverity = (p: 'temperatura' | 'humitat' | 'ppm', value: number): 'ok' | 'baix' | 'mitjà' | 'alt' => {
        const currentThreshold = thresholds[p];
        
        // Si el valor está dentro del rango óptimo, no hay alerta
        if (value >= currentThreshold.min && value <= currentThreshold.max) {
          return 'ok';
        }
        
        // Si está fuera del rango, calcular la severidad según qué tan lejos esté
        const range = currentThreshold.max - currentThreshold.min;
        let deviationPercent: number;
        
        if (value < currentThreshold.min) {
          // Valor por debajo del mínimo
          deviationPercent = (currentThreshold.min - value) / range;
        } else {
          // Valor por encima del máximo
          deviationPercent = (value - currentThreshold.max) / range;
        }
        
        if (deviationPercent > 1.00) return 'alt';    // >100% fuera del rango: Alta severidad
        if (deviationPercent > 0.60) return 'mitjà';  // 60-100% fuera del rango: Media severidad
        if (deviationPercent > 0.25) return 'baix';   // 25-60% fuera del rango: Baja severidad
        return 'ok';                                   // <25% fuera del rango: Normal
      };

      // 1) Construir alertas por sensor según activeParameter
      const preliminary: any[] = [];
      
      buildingSensors.forEach((sensor) => {
        if (activeParameter === 'all') {
          // Para 'all', procesar todos los parámetros
          const parameters = [
            { key: 'temperatura', value: sensor.temperature },
            { key: 'humitat', value: sensor.humidity },
            { key: 'ppm', value: sensor.ppm }
          ];
          
          parameters.forEach(param => {
            const severity = computeSeverity(param.key as 'temperatura' | 'humitat' | 'ppm', param.value);
            
            // Solo incluir si hay alerta real
            if (severity !== 'ok') {
              const currentThreshold = thresholds[param.key as keyof typeof thresholds];
              const range = currentThreshold.max - currentThreshold.min;
              const center = (currentThreshold.max + currentThreshold.min) / 2;
              const deviation = Math.abs(param.value - center) / range;

              preliminary.push({
                id: `${sensor.spaceGuid}-${param.key}`,
                buildingCode: code,
                buildingColor,
                planta: sensor.planta || 'P00',
                departament: sensor.departament || 'Desconegut',
                dispositiu: sensor.dispositiu || 'Sensor',
                value: param.value,
                severity,
                paramType: param.key,
                deviation,
              });
            }
          });
        } else {
          // Para parámetros específicos, procesar solo ese parámetro
          let value: number;
          let severity: 'baix' | 'mitjà' | 'alt' | 'ok' = 'ok';
          
          switch (activeParameter) {
            case 'temperatura':
              value = sensor.temperature;
              severity = computeSeverity('temperatura', value);
              break;
              
            case 'humitat':
              value = sensor.humidity;
              severity = computeSeverity('humitat', value);
              break;
              
            case 'ppm':
              value = sensor.ppm;
              severity = computeSeverity('ppm', value);
              break;
          }
          
          // Solo incluir si hay alerta real
          if (severity !== 'ok') {
            const currentThreshold = thresholds[activeParameter];
            const range = currentThreshold.max - currentThreshold.min;
            const center = (currentThreshold.max + currentThreshold.min) / 2;
            const deviation = Math.abs(value - center) / range;

            preliminary.push({
              id: `${sensor.spaceGuid}-${activeParameter}`,
              buildingCode: code,
              buildingColor,
              planta: sensor.planta || 'P00',
              departament: sensor.departament || 'Desconegut',
              dispositiu: sensor.dispositiu || 'Sensor',
              value,
              severity,
              paramType: activeParameter,
              deviation,
            });
          }
        }
      });

       // 2) Filtrar solo alertas reales (quitar 'ok')
       const filteredAlerts = preliminary.filter(a => a.severity !== 'ok');

      // 3) Para 'all', mostrar todas las alertas sin deduplicar
      let uniqueAlerts;
      if (activeParameter === 'all') {
        uniqueAlerts = filteredAlerts;
      } else {
        // Para parámetros específicos, deduplicar por spaceGuid (id), conservando la de mayor severidad y mayor desviación
        const severityRank: Record<'baix' | 'mitjà' | 'alt', number> = { 'baix': 1, 'mitjà': 2, 'alt': 3 };
        const alertsMap = new Map<string, typeof filteredAlerts[number]>();
        for (const a of filteredAlerts) {
          const existing = alertsMap.get(a.id);
          if (!existing) {
            alertsMap.set(a.id, a);
            continue;
          }
          const existingRank = severityRank[existing.severity as 'baix' | 'mitjà' | 'alt'] || 0;
          const currentRank = severityRank[a.severity as 'baix' | 'mitjà' | 'alt'] || 0;
          if (currentRank > existingRank || (currentRank === existingRank && a.deviation > existing.deviation)) {
            alertsMap.set(a.id, a);
          }
        }
        uniqueAlerts = Array.from(alertsMap.values());
      }
      
      // Calcular desvío para cada alerta y ordenar por gravedad (mayor desvío = más grave)
      const alertsWithDeviation = uniqueAlerts.map(alert => {
        const paramType = alert.paramType as 'temperatura' | 'humitat' | 'ppm';
        const currentThreshold = thresholds[paramType];
        const range = currentThreshold.max - currentThreshold.min;
        const center = (currentThreshold.max + currentThreshold.min) / 2;
        const deviation = Math.abs(alert.value - center) / range;
        
        return {
          ...alert,
          deviation: deviation
        };
      });
      
      // Ordenar por severidad primero (alt > mitjà > baix), luego por desvío descendente
      const severityOrder: Record<'alt' | 'mitjà' | 'baix', number> = { 'alt': 3, 'mitjà': 2, 'baix': 1 };
      alertsWithDeviation.sort((a, b) => {
        // Primero por severidad (mayor número = más grave)
        const severityDiff = severityOrder[b.severity as 'alt' | 'mitjà' | 'baix'] - severityOrder[a.severity as 'alt' | 'mitjà' | 'baix'];
        if (severityDiff !== 0) return severityDiff;
        
        // Si la severidad es igual, ordenar por desvío (mayor desvío primero)
        return b.deviation - a.deviation;
      });
      
      // Apply severityFilter before exposing and before rendering/markers.
      // If the filter is provided (even empty), honor it. Empty => show none.
      const alertsFilteredBySeverity = (severityFilter !== undefined)
        ? alertsWithDeviation.filter(a => severityFilter!.includes(a.severity as 'baix'|'mitjà'|'alt'))
        : alertsWithDeviation;

      setAlerts(alertsFilteredBySeverity);
      
      // Apply highlighting after generating alerts
      setTimeout(() => {
        colorizeSpacesByAlerts(alertsFilteredBySeverity);
      }, 500);
      
      // Create markers for the alerts
      setTimeout(() => {
        createMarkersForAlerts(alertsFilteredBySeverity);
      }, 1000);
      
      // Create OK markers if filter includes 'ok' AND we have a specific level selected
      // Don't create OK markers for "Mostrar tot" (selectedLevel === null)
      if (severityFilter && severityFilter.includes('ok') && selectedLevel !== null) {
        setTimeout(() => {
          createOKMarkers(alertsFilteredBySeverity);
        }, 1500);
      }
    } catch (error) {
      console.error('Error generando alertas:', error);
    }
  }, [sensorData, code, activeParameter, buildingColor, setAlerts, createMarkersForAlerts, colorizeSpacesByAlerts, severityFilter, createOKMarkers]);


  // Clear markers and alerts when level changes
  useEffect(() => {
    console.log('🔄 Level changed to:', selectedLevel);
    
    // Always clear markers when level changes using the correct API
    if (markerRef.current && worldRef.current) {
      const worldMarkers = markerRef.current.getWorldMarkerList(worldRef.current);
      worldMarkers.forEach((_, markerId) => {
        markerRef.current!.delete(markerId);
      });
    }
    
    // Only clear highlights when switching to a specific level, not when going to "Mostrar tot"
    if (highlighterRef.current && selectedLevel !== null) {
      highlighterRef.current.clear("baix");
      highlighterRef.current.clear("mitja");
      highlighterRef.current.clear("alt");
      highlighterRef.current.clear("ok");
      console.log('Highlights cleared for level:', selectedLevel);
    }
    
    // Generate alerts for all levels when no level is selected, or for specific level when selected
    if (!selectedLevel) {
      // For "Mostrar tot" - generate alerts for state but only highlights, no markers
      console.log('🔍 No level selected (Mostrar tot) - generating alerts for state and highlights only');
      
      // Generate alerts for the state (for the panel) but don't create markers
      const tempGenerateAlerts = async () => {
        try {
          const buildingSensors = sensorData.filter((s) => s.spaceGuid && s.edifici === code);
          
          const thresholds = {
            temperatura: { min: 19, max: 25 },
            humitat: { min: 40, max: 60 },
            ppm: { min: 0, max: 600 }
          };
          
          const computeSeverity = (p: 'temperatura' | 'humitat' | 'ppm', value: number): 'ok' | 'baix' | 'mitjà' | 'alt' => {
            const currentThreshold = thresholds[p];
            if (value >= currentThreshold.min && value <= currentThreshold.max) {
              return 'ok';
            }
            const range = currentThreshold.max - currentThreshold.min;
            let deviationPercent: number;
            if (value < currentThreshold.min) {
              deviationPercent = (currentThreshold.min - value) / range;
            } else {
              deviationPercent = (value - currentThreshold.max) / range;
            }
            if (deviationPercent > 0.30) return 'alt';
            if (deviationPercent > 0.15) return 'mitjà';
            if (deviationPercent > 0.05) return 'baix';
            return 'ok';
          };

          const preliminary: any[] = [];
          
          buildingSensors.forEach((sensor) => {
            const parameters = [
              { key: 'temperatura', value: sensor.temperature },
              { key: 'humitat', value: sensor.humidity },
              { key: 'ppm', value: sensor.ppm }
            ];
            
            parameters.forEach(param => {
              const severity = computeSeverity(param.key as 'temperatura' | 'humitat' | 'ppm', param.value);
              if (severity !== 'ok') {
                const currentThreshold = thresholds[param.key as keyof typeof thresholds];
                const range = currentThreshold.max - currentThreshold.min;
                const center = (currentThreshold.max + currentThreshold.min) / 2;
                const deviation = Math.abs(param.value - center) / range;

                preliminary.push({
                  id: `${sensor.spaceGuid}-${param.key}`,
                  buildingCode: code,
                  buildingColor,
                  planta: sensor.planta || 'P00',
                  departament: sensor.departament || 'Desconegut',
                  dispositiu: sensor.dispositiu || 'Sensor',
                  value: param.value,
                  severity,
                  paramType: param.key,
                  deviation,
                });
              }
            });
          });

          const filteredAlerts = preliminary.filter(a => a.severity !== 'ok');
          const alertsFilteredBySeverity = (severityFilter !== undefined)
            ? filteredAlerts.filter(a => severityFilter!.includes(a.severity as 'baix'|'mitjà'|'alt'))
            : filteredAlerts;

          setAlerts(alertsFilteredBySeverity);
          
          // Generate highlights only
          setTimeout(() => {
            colorizeSpacesByAlerts(alertsFilteredBySeverity);
          }, 500);
        } catch (error) {
          console.error('Error generating alerts for Mostrar tot:', error);
        }
      };
      
      tempGenerateAlerts();
    } else {
      // For specific level - generate both highlights and markers
      console.log('🔍 Level selected - generating highlights and markers');
      generateAlerts();
    }
  }, [selectedLevel, setAlerts, generateAlerts]);

  // Regenerate alerts and markers when severity filter changes
  useEffect(() => {
    // Verificar si los datos realmente han cambiado
    const sensorDataChanged = JSON.stringify(sensorData) !== JSON.stringify(lastSensorDataRef.current);
    const codeChanged = code !== lastCodeRef.current;
    
    if (sensorDataChanged || codeChanged) {
      lastSensorDataRef.current = sensorData;
      lastCodeRef.current = code || '';
      console.log('🔄 Sensor data or code actually changed:', sensorData?.length, code);
    } else {
      console.log('🔄 Severity filter changed (no data change):', severityFilter);
    }
    
    // Only regenerate if we have data and a level is selected
    if (sensorData && sensorData.length > 0 && code && selectedLevel) {
      // Clear existing markers first
      if (markerRef.current && worldRef.current) {
        const worldMarkers = markerRef.current.getWorldMarkerList(worldRef.current);
        worldMarkers.forEach((_, markerId) => {
          markerRef.current!.delete(markerId);
        });
      }
      
      // Regenerate alerts with new filter
      generateAlerts();
    } else if (sensorData && sensorData.length > 0 && code && !selectedLevel) {
      // For "Mostrar tot", only regenerate highlights, not markers
      console.log('🔄 Severity filter changed for Mostrar tot - regenerating highlights only');
      setTimeout(() => {
        colorizeSpacesByAlerts();
      }, 500);
    }
  }, [severityFilter, generateAlerts, sensorData, code, markerRef, worldRef, selectedLevel, colorizeSpacesByAlerts]);

  return {
    performInitialColorization,
    colorizeSpacesByAlerts,
    generateAlerts,
  };
};

