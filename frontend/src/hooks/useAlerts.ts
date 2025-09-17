import { useCallback, useEffect } from 'react';
import * as THREE from "three";
import * as OBC from "@thatopen/components";
import * as OBF from "@thatopen/components-front";

interface UseAlertsProps {
  code: string | undefined;
  sensorData: any[];
  activeParameter: 'temperatura' | 'humitat' | 'ppm';
  buildingColor: string;
  fragmentsRef: React.MutableRefObject<OBC.FragmentsManager | null>;
  highlighterRef: React.MutableRefObject<OBF.Highlighter | null>;
  worldRef: React.MutableRefObject<OBC.World | null>;
  markerRef: React.MutableRefObject<OBF.Marker | null>;
  selectedLevel: string | null;
  setAlerts: (alerts: any[]) => void;
  componentsRef: React.MutableRefObject<OBC.Components | null>;
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
        highlighter.styles.set("mitja", {
          color: new THREE.Color("#ffd073"), // Soft yellow
          opacity: 1.0,
          transparent: false,
          renderedFaces: 0,
        });

        highlighter.styles.set("alt", {
          color: new THREE.Color("#ff7873"), // Soft red
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
        currentHighlighter.clear("mitja");
        currentHighlighter.clear("alt");
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

  const colorizeSpacesByAlerts = useCallback(async () => {
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
                newHighlighter.styles.set("mitja", {
                  color: new THREE.Color("#ffd073"), // Soft yellow
                  opacity: 1.0,
                  transparent: false,
                  renderedFaces: 0,
                });

                newHighlighter.styles.set("alt", {
                  color: new THREE.Color("#ff7873"), // Soft red
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
      await currentHighlighter.clear("mitja");
      await currentHighlighter.clear("alt");

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

      const mitjaIds: number[] = [];
      const altIds: number[] = [];

      // Use the same logic as generateAlerts for consistency
      const thresholds = {
        temperatura: { min: 19, max: 24 }, // Rango óptimo
        humitat: { min: 40, max: 60 }, // Rango óptimo
        ppm: { min: 0, max: 600 } // Rango óptimo
      };
      
      // Función de cálculo de severidad basada en porcentaje de desviación (same as generateAlerts)
      const computeSeverity = (p: 'temperatura' | 'humitat' | 'ppm', value: number): 'ok' | 'mitjà' | 'alt' => {
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
        
        if (deviationPercent > 0.20) return 'alt';    // >50% fuera del rango: Alta severidad
        if (deviationPercent > 0.10) return 'mitjà';  // 25-50% fuera del rango: Media severidad
        return 'ok';                                   // <25% fuera del rango: Normal
      };

      // Create map of alert GUIDs to severity using the same logic as generateAlerts
      const alertsByGuid = new Map<string, 'mitjà' | 'alt'>();
      sensorData.forEach(sensor => {
        // Only process sensors for the selected level or all levels if none selected
        if (selectedLevel && sensor.planta !== selectedLevel) {
          return;
        }
        
        let value: number;
        let severity: 'mitjà' | 'alt' | 'ok' = 'ok';
        
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
        
        if (severity === 'mitjà' || severity === 'alt') {
          alertsByGuid.set(sensor.spaceGuid, severity);
        }
      });

      const spaceGuids: string[] = [];
      
      // Extract GUIDs from spaceData
      for (const space of spaceData) {
        if (Array.isArray(space)) continue;

        let guid = (space as any)._guid.value;     
        
        if (guid) spaceGuids.push(guid);
      }

      // Check if any alert GUID exists in space GUIDs
      const alertGuids = Array.from(alertsByGuid.keys());
      const foundMatches = alertGuids.filter(alertGuid => spaceGuids.includes(alertGuid));

      // Match spaces with alerts using the found matches
      let matchedCount = 0;
      
      // Use the found matches directly
      for (const matchingGuid of foundMatches) {
        // Find the space with this GUID
        for (const space of spaceData) {
          if (Array.isArray(space)) continue;
          
          let spaceGuid: string | null = null;
          spaceGuid = (space as any)._guid.value;

          if (spaceGuid === matchingGuid) {
            const alertSeverity = alertsByGuid.get(spaceGuid);
            
            if (alertSeverity) {
              matchedCount++;
              
              // Get the space's local ID for highlighting
              const spaceLocalId = (space as any)._localId?.value || (space as any).expressID;
              
              if (spaceLocalId) {
                if (alertSeverity === 'mitjà') {
                  mitjaIds.push(spaceLocalId);
                } else if (alertSeverity === 'alt') {
                  altIds.push(spaceLocalId);
                }
              }
            }
            break; // Found the space, move to next GUID
          }
        }
      }

      console.log(`Total matches found: ${matchedCount}`);
      console.log(`Spaces to highlight - Mitjà: ${mitjaIds.length}, Alt: ${altIds.length}`);

      // Apply highlights using the highlighter
      if (mitjaIds.length > 0) {
        const mitjaMap: { [modelId: string]: Set<number> } = {};
        mitjaMap[code] = new Set(mitjaIds);
        console.log('Applying mitjà highlighting with map:', mitjaMap);
        await currentHighlighter.highlightByID("mitja", mitjaMap, false);
        console.log(`✅ Applied orange highlight to ${mitjaIds.length} spaces`);
      }
      
      if (altIds.length > 0) {
        const altMap: { [modelId: string]: Set<number> } = {};
        altMap[code] = new Set(altIds);
        console.log('Applying alt highlighting with map:', altMap);
        await currentHighlighter.highlightByID("alt", altMap, false);
        console.log(`✅ Applied red highlight to ${altIds.length} spaces`);
      }

    } catch (error) {
      console.error('Error colorizing spaces by alerts:', error);
    }
  }, [sensorData, code, activeParameter, fragmentsRef, highlighterRef, worldRef, selectedLevel]);

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

      // Only create markers when a specific level is selected
      if (!selectedLevel) {
        console.log('No level selected, clearing markers and skipping marker creation');
        const worldMarkers = marker.getWorldMarkerList(world);
        worldMarkers.forEach((_, markerId) => {
          marker.delete(markerId);
        });
        return;
      }

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

      // Filter alerts by selected level
      const filteredAlerts = alerts.filter(alert => alert.planta === selectedLevel);
      console.log(`Creating markers for ${filteredAlerts.length} alerts in level ${selectedLevel}`);

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

      // Create markers for each filtered alert
      for (const alert of filteredAlerts) {
        try {
          // Find the local ID for this alert's GUID
          const localId = guidToLocalId.get(alert.id);
          if (!localId) {
            console.log(`No local ID found for ${alert.dispositiu}, skipping marker`);
            continue;
          }

          // Create ModelIdMap for this specific space
          const modelIdMap: OBC.ModelIdMap = { [code]: new Set([localId]) };
          
          // Clear boxer and add the specific space
          boxer.list.clear();
          await boxer.addFromModelIdMap(modelIdMap);
          
          // Get the bounding box for this space
          const boundingBox = boxer.get();
          if (!boundingBox || boundingBox.isEmpty()) {
            console.log(`No bounding box found for ${alert.dispositiu}, skipping marker`);
            boxer.list.clear();
            continue;
          }

          // Compute top-center of the bounding box with an upward offset so label sits above the space
          const center = boundingBox.getCenter(new THREE.Vector3());
          const heightVec = boundingBox.getSize(new THREE.Vector3());
          const height = Math.max(0, heightVec.y);
          const extra = Math.max(0.5, 0.2 * height); // 30% of height or at least 2m
          const topPosition = new THREE.Vector3(center.x, boundingBox.max.y + extra, center.z);
          console.log(`Found bounding box top for ${alert.dispositiu}:`, topPosition);

          // Clear boxer after use
          boxer.list.clear();

          // Create marker element with device name and value
          const markerElement = document.createElement('div');
          markerElement.style.cssText = `
            background: ${alert.severity === 'alt' ? '#ff7873' : '#ffd073'};
            border: 2px solid white;
            border-radius: 8px;
            cursor: pointer;
            padding: 4px 8px;
            font-size: 11px;
            font-weight: bold;
            color: white;
            box-shadow: 0 2px 4px rgba(0,0,0,0.3);
            white-space: nowrap;
            text-align: center;
            min-width: 60px;
          `;
          markerElement.innerHTML = `
            <div style="font-size: 10px; margin-bottom: 2px;">${alert.dispositiu}</div>
            <div style="font-size: 12px;">${alert.value}°C</div>
          `;
          markerElement.title = `${alert.dispositiu}: ${alert.value}°C (${alert.severity})`;

          // Create marker using the elevated top-center position
          marker.create(world, markerElement, topPosition);
          
          console.log(`Created marker for alert: ${alert.dispositiu} at ${alert.planta} at top:`, topPosition);
        } catch (error) {
          console.error(`Error creating marker for alert ${alert.id}:`, error);
        }
      }
      
      console.log(`Created ${filteredAlerts.length} markers for alerts in level ${selectedLevel}`);
    } catch (error) {
      console.error('Error creating markers for alerts:', error);
    }
  }, [markerRef, fragmentsRef, worldRef, code, selectedLevel]);

  const generateAlerts = useCallback(() => {
    console.log('=== generateAlerts called ===');
    console.log('sensorData:', sensorData);
    console.log('code:', code);
    console.log('sensorData length:', sensorData?.length || 0);
    
    if (!sensorData || !code) {
      console.log('Missing sensorData or code, returning');
      return;
    }
    
    // Clear previous alerts first
    setAlerts([]);
    console.log('Cleared previous alerts');
    
    try {
      const buildingSensors = sensorData.filter((s) => s.spaceGuid && s.edifici === code);
      console.log('buildingSensors:', buildingSensors);
      console.log('buildingSensors length:', buildingSensors.length);
      
      // Definir umbrales globales (consistentes con ControlGeneral)
      const thresholds = {
        temperatura: { min: 19, max: 24 }, // Rango óptimo
        humitat: { min: 40, max: 60 }, // Rango óptimo
        ppm: { min: 0, max: 600 } // Rango óptimo
      };
      
      // Función de cálculo de severidad basada en porcentaje de desviación
      const computeSeverity = (p: 'temperatura' | 'humitat' | 'ppm', value: number): 'ok' | 'mitjà' | 'alt' => {
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
        
        if (deviationPercent > 0.20) return 'alt';    // >50% fuera del rango: Alta severidad
        if (deviationPercent > 0.10) return 'mitjà';  // 25-50% fuera del rango: Media severidad
        return 'ok';                                   // <25% fuera del rango: Normal
      };

      const alerts = buildingSensors.map((sensor) => {
        let value: number;
        let severity: 'mitjà' | 'alt' | 'ok' = 'ok';
        
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
        
        return {
          id: sensor.spaceGuid, // Use GUID directly from database
          buildingCode: code,
          buildingColor,
          planta: sensor.planta || 'P00',
          departament: sensor.departament || 'Desconegut',
          dispositiu: sensor.dispositiu || 'Sensor',
          value,
          severity,
        };
      });
      
      // Filtrar solo alertas (eliminar las 'ok')
      const filteredAlerts = alerts.filter(alert => alert.severity !== 'ok');
      
      // Calcular desvío para cada alerta y ordenar por gravedad (mayor desvío = más grave)
      const alertsWithDeviation = filteredAlerts.map(alert => {
        const currentThreshold = thresholds[activeParameter];
        const range = currentThreshold.max - currentThreshold.min;
        const center = (currentThreshold.max + currentThreshold.min) / 2;
        const deviation = Math.abs(alert.value - center) / range;
        
        return {
          ...alert,
          deviation: deviation
        };
      });
      
      // Ordenar por severidad primero (alt > mitjà), luego por desvío descendente
      const severityOrder: Record<'alt' | 'mitjà', number> = { 'alt': 2, 'mitjà': 1 };
      alertsWithDeviation.sort((a, b) => {
        // Primero por severidad (mayor número = más grave)
        const severityDiff = severityOrder[b.severity as 'alt' | 'mitjà'] - severityOrder[a.severity as 'alt' | 'mitjà'];
        if (severityDiff !== 0) return severityDiff;
        
        // Si la severidad es igual, ordenar por desvío (mayor desvío primero)
        return b.deviation - a.deviation;
      });
      
      setAlerts(alertsWithDeviation);
      
      // Create markers for the alerts
      setTimeout(() => {
        createMarkersForAlerts(alertsWithDeviation);
      }, 1000);
    } catch (error) {
      console.error('Error generando alertas:', error);
    }
  }, [sensorData, code, activeParameter, buildingColor, setAlerts, createMarkersForAlerts]);

  // Colorize spaces when alerts change
  useEffect(() => {
    console.log('useEffect triggered for colorizeSpacesByAlerts', { sensorDataLength: sensorData.length, activeParameter });
    colorizeSpacesByAlerts();
  }, [sensorData, activeParameter, colorizeSpacesByAlerts]);

  // Clear markers and alerts when level changes
  useEffect(() => {
    console.log('Level changed to:', selectedLevel);
    
    // Always clear markers when level changes using the correct API
    if (markerRef.current && worldRef.current) {
      const worldMarkers = markerRef.current.getWorldMarkerList(worldRef.current);
      worldMarkers.forEach((_, markerId) => {
        markerRef.current!.delete(markerId);
      });
      console.log('Cleared markers due to level change using correct API');
    }
    
    // Clear highlights when level changes
    if (highlighterRef.current) {
      highlighterRef.current.clear("mitja");
      highlighterRef.current.clear("alt");
      console.log('Cleared highlights due to level change');
    }
    
    // Clear alerts when no level is selected
    if (!selectedLevel) {
      setAlerts([]);
      console.log('Cleared alerts - no level selected');
    } else {
      // Regenerate alerts for the new level
      console.log('Regenerating alerts for level:', selectedLevel);
      generateAlerts();
    }
  }, [selectedLevel, setAlerts, generateAlerts]);

  return {
    performInitialColorization,
    colorizeSpacesByAlerts,
    generateAlerts,
  };
};
