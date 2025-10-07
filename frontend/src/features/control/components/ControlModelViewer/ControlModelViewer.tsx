import React, { useEffect, useRef, useCallback, useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import * as THREE from "three";
import * as OBF from "@thatopen/components-front";
import * as OBC from "@thatopen/components";
import { useModelViewer } from '@modules/viewer/hooks/useModelViewer';
import { useIsolation } from '@modules/viewer/hooks/useIsolation';
import { useRaycasting } from '@modules/viewer/hooks/useRaycasting';
import { useAlerts } from '../../../../hooks/useAlerts';
import { ALERT_COLORS, modelStore } from '../../../../globals';
import { AlertsPanel, AlarmDetailsPanel } from '@shared/components/panels';
import NavigationPanel from '@shared/components/panels/NavigationPanel/NavigationPanel';
import type { Severity, ParamType } from '@shared/components/panels';
import ViewerRegistry from '@modules/viewer/utils/ViewerRegistry';
import { ifcSpaceService } from '../../../../services/ifcSpaceService';

// Interface for historical events (same as ControlGeneral)
interface HistoricalEvent {
  id: string;
  timestamp: Date;
  type: 'alert_start' | 'alert_resolved';
  severity: Severity;
  buildingCode: string;
  buildingColor: string;
  planta: string;
  departament: string;
  dispositiu: string;
  spaceGuid?: string;
  value: number;
  paramType: ParamType;
  message: string;
  status: 'Obert' | 'Assignat' | 'Pendent' | 'Completat' | 'Tancat' | 'Cancel·lat';
}
const ModelViewerRefactored: React.FC = () => {
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();
  const containerRef = useRef<HTMLDivElement>(null);
  const meshesRef = useRef<THREE.Mesh[]>([]);
  const originalMaterialsRef = useRef<Map<THREE.Material, { transparent: boolean; opacity: number; color?: number }>>(new Map());
  const handleResizeRef = useRef<(() => void) | null>(null);
  const markersRef = useRef<Map<string, any>>(new Map());
  const [alarmTab, setAlarmTab] = useState<'info' | 'historic' | 'sistemes'>('info');
  const [showAlarmPanel, setShowAlarmPanel] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<HistoricalEvent | null>(null);
  // Severity filter: default show Mitjà + Alt; hide Baix and OK
  const [severityFilter, setSeverityFilter] = useState<Array<'ok'|'baix'|'mitjà'|'alt'>>(['mitjà','alt']);
  
  // Use custom hooks
  const modelViewerState = useModelViewer(code);
  const {
    componentsRef,
    worldRef,
    fragmentsRef,
    highlighterRef,
    hiderRef,
    markerRef,
    levels,
    selectedLevel,
    selectedDepartment,
    departments,
    expandedLevel,
    activeParameter,
    alerts,
    buildingColor,
    selectedElement,
    localId,
    showOnlyAlerts,
    showHistoryPanel,
    selectedSensor,
    sensorHistory,
    isMobile,
    setLevels,
    setSelectedLevel,
    setSelectedDepartment,
    setDepartments,
    setExpandedLevel,
    setActiveParameter,
    setAlerts,
    setBuildingColor,
    setSelectedElement,
    setLocalId,
    setShowOnlyAlerts,
    setShowHistoryPanel,
    setSelectedSensor,
    setSensorHistory,
    setIsMobile,
  } = modelViewerState;

  // Usar datos del store global para consistencia con ControlGeneral
  const [sensorData, setSensorData] = useState<any[]>([]);
  
  // Obtener datos del store global solo cuando cambie el código del edificio
  useEffect(() => {
    const globalSensorData = modelStore.getSensorData();
    if (globalSensorData.length > 0) {
      // Filtrar datos para el edificio específico
      const buildingSensorData = globalSensorData.filter(room => room.edifici === code);
      setSensorData(buildingSensorData);
      console.log(`[ControlModelViewer] Using global sensor data for ${code}: ${buildingSensorData.length} rooms`);
    }
  }, [code]);

  // Función para generar datos históricos ficticios
  const generateHistoricalData = useCallback((sensor: any) => {
    const now = new Date();
    const data = [];
    
    // Generar datos de las últimas 24 horas
    for (let i = 23; i >= 0; i--) {
      const timestamp = new Date(now.getTime() - (i * 60 * 60 * 1000));
      
      // Valores base del sensor actual
      const baseTemp = sensor.temperature || 22;
      const baseHumidity = sensor.humidity || 50;
      const basePpm = sensor.ppm || 400;
      
      // Agregar variación realista
      const tempVariation = (Math.sin(i * 0.3) * 3) + (Math.random() - 0.5) * 2;
      const humidityVariation = (Math.cos(i * 0.2) * 10) + (Math.random() - 0.5) * 5;
      const ppmVariation = (Math.sin(i * 0.1) * 50) + (Math.random() - 0.5) * 30;
      
      data.push({
        timestamp,
        temperature: Math.round((baseTemp + tempVariation) * 10) / 10,
        humidity: Math.round((baseHumidity + humidityVariation) * 10) / 10,
        ppm: Math.round(basePpm + ppmVariation)
      });
    }
    
    return data;
  }, []);

  // Función para limpiar markers
  const clearMarkers = useCallback(() => {
    try {
      if (markerRef.current && worldRef.current) {
        // Limpiar markers usando la API correcta (igual que cuando cambias de nivel)
        const worldMarkers = markerRef.current.getWorldMarkerList(worldRef.current);
        worldMarkers.forEach((_, markerId) => {
          markerRef.current!.delete(markerId);
        });
        
        // Limpiar elementos DOM de markers
        const existingMarkers = document.querySelectorAll('[data-marker]');
        existingMarkers.forEach(el => el.remove());
        
        // Limpiar nuestro mapa de referencias
        markersRef.current.clear();
        console.log('Cleared all markers using correct API');
      }
    } catch (error) {
      console.error('Error clearing markers:', error);
    }
  }, [markerRef, worldRef]);

  const restoreSceneMaterials = useCallback(() => {
    const materialsEdited = originalMaterialsRef.current;
    for (const [mat, props] of materialsEdited) {
      try { (mat as any).transparent = props.transparent; } catch {}
      try { (mat as any).opacity = props.opacity; } catch {}
      try { if ((mat as any).color && typeof (mat as any).color.setHex === 'function' && props.color !== undefined) (mat as any).color.setHex(props.color); } catch {}
      try { (mat as any).needsUpdate = true; } catch {}
    }
    materialsEdited.clear();
  }, []);

  // Helper function to ensure FragmentsManager is ready
  const ensureFragmentsReady = useCallback(async () => {
    const fragments = fragmentsRef.current;
    if (fragments && fragments.core) {
      return true;
    }
    throw new Error('FragmentsManager not ready');
  }, []);

  // Generate alerts hook
  const { performInitialColorization, generateAlerts } = useAlerts({
    code,
    sensorData: sensorData || [],
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
  });

  // Filter alerts by selected level and parameter
  const filteredAlerts = useMemo(() => {
    let filtered = alerts;
    
    // NO filtrar por nivel - mostrar alertas de todos los niveles
    // Solo filtrar por parámetro y severidad
    if (activeParameter !== 'all') {
      filtered = filtered.filter(alert => alert.paramType === activeParameter);
    }
    // Filtrar por severidad seleccionada (baix/mitjà/alt). Si está vacío => mostrar 0
    if (severityFilter !== undefined) {
      filtered = filtered.filter(alert => severityFilter.includes(alert.severity as 'baix'|'mitjà'|'alt'));
    }
    
    // Ordenar por severidad (alt > mitjà > baix) y luego por desviación descendente
    const severityOrder: Record<'alt' | 'mitjà' | 'baix', number> = { 'alt': 3, 'mitjà': 2, 'baix': 1 };
    filtered.sort((a, b) => {
      // Primero por severidad (mayor número = más grave)
      const severityDiff = severityOrder[b.severity as 'alt' | 'mitjà' | 'baix'] - severityOrder[a.severity as 'alt' | 'mitjà' | 'baix'];
      if (severityDiff !== 0) return severityDiff;
      
      // Si la severidad es igual, ordenar por desvío (mayor desvío primero)
      return (b.deviation || 0) - (a.deviation || 0);
    });
    
    return filtered;
  }, [alerts, activeParameter, severityFilter]);

  // Isolation hook
  const { isolateLevel, isolateDepartment, clearIsolation } = useIsolation({
    code,
    fragmentsRef,
    hiderRef,
    highlighterRef,
    worldRef,
    componentsRef,
    sensorData: sensorData || [],
    setSelectedLevel,
    setSelectedDepartment,
    clearMarkers,
    restoreSceneMaterials,
  });

  // Raycasting hook
  const { setupRaycasting } = useRaycasting({
    code,
    fragmentsRef,
    worldRef,
    highlighterRef,
    componentsRef,
    setLocalId,
    setSelectedElement,
    localId,
    generateHistoricalData,
    setSelectedSensor,
    setSensorHistory,
    setShowHistoryPanel,
    showHistoryPanel,
    sensorData: sensorData || [],
  });

  // Function to select element by alert GUID
  const selectElementByAlert = useCallback(async (alert: any) => {
    if (!fragmentsRef.current || !worldRef.current || !code) return;
    
    try {
      const fragments = fragmentsRef.current;
      const world = worldRef.current;
      const model = fragments.list.get(code);
      if (!model) return;

      // Get all IFCSPACE items
      const categories = await (model as any).getItemsOfCategories([/IFCSPACE/i]);
      const spaceIds: number[] = (categories?.IFCSPACE || []) as number[];
      
      if (!spaceIds || spaceIds.length === 0) return;

      // Get GUIDs for all spaces
      const mappedGuids: string[] = await (model as any).getGuidsByLocalIds(spaceIds);
      
      // Find the local ID for this alert's identifier
      // alert.id has the form `${spaceKey}-${param}` where spaceKey may be a GUID or a code like TAU-P01-010
      // Remove trailing parameter suffix to get the base key
      const baseKey = String(alert.id).replace(/-(temperatura|humitat|ppm)$/i, '');
      let localId: number | null = null;
      if (Array.isArray(mappedGuids)) {
        for (let i = 0; i < mappedGuids.length; i++) {
          if (mappedGuids[i] === baseKey) {
            localId = spaceIds[i];
            break;
          }
        }
      }

      if (localId) {
        // Select the element using highlighter
        const highlighter = highlighterRef.current;
        if (highlighter) {
          await highlighter.clear("select");
          const modelIdMap: { [modelId: string]: Set<number> } = {};
          modelIdMap[code] = new Set([localId]);
          await highlighter.highlightByID("select", modelIdMap, false);
        }
        
        setLocalId(localId);
        
        // Get element information
        const [data] = await model.getItemsData([localId], {
          attributesDefault: true,
        });
        setSelectedElement(data);
        
        // Convert alert to HistoricalEvent format and open panel
        const historicalEvent: HistoricalEvent = {
          id: alert.id,
          timestamp: new Date(),
          type: 'alert_start',
          // Map 'baix' -> 'ok' for AlarmDetailsPanel compatibility
          severity: (alert.severity === 'baix' ? 'ok' : alert.severity) as Severity,
          buildingCode: code || '',
          buildingColor: '#ff0000',
          planta: alert.planta || '',
          departament: alert.departament || '',
          dispositiu: alert.dispositiu,
          spaceGuid: alert.spaceGuid,
          value: alert.value,
          paramType: alert.paramType,
          message: `${alert.dispositiu}: ${alert.value}${alert.paramType === 'ppm' ? 'ppm' : (alert.paramType === 'humitat' ? '%' : '°C')}`,
          status: 'Obert'
        };
        
        // Open alarm panel with the event details
        setSelectedEvent(historicalEvent);
        setShowAlarmPanel(true);
        setAlarmTab('info');
        
        // Focus on the element using BoundingBoxer
        if (componentsRef.current) {
          const boxer = componentsRef.current.get(OBC.BoundingBoxer);
          if (boxer) {
            boxer.list.clear();
            const modelIdMap: OBC.ModelIdMap = { [code]: new Set([localId]) };
            await boxer.addFromModelIdMap(modelIdMap);
            const boundingBox = boxer.get();
            if (boundingBox && !boundingBox.isEmpty()) {
              const sphere = new THREE.Sphere();
              boundingBox.getBoundingSphere(sphere);
              if (world.camera?.controls) {
                world.camera.controls.fitToSphere(sphere, true);
                console.log('Focused on element from alert:', localId);
              }
            }
            boxer.list.clear();
          }
        }
        
        // Buscar si este elemento tiene un sensor asociado y abrir/actualizar panel histórico
        const spaceGuid = (data as any)?._guid?.value;
        if (spaceGuid && sensorData) {
          const associatedSensor = sensorData.find((s: any) => s.spaceGuid === spaceGuid);
          if (associatedSensor) {
            // Generar datos históricos
            const historicalData = generateHistoricalData(associatedSensor);
            
            // Configurar el panel histórico (abrir si está cerrado, actualizar si está abierto)
            setSelectedSensor({ ...associatedSensor, severity: (alert.severity === 'baix' ? 'ok' : alert.severity) });
            setSensorHistory(historicalData);
            setAlarmTab('info');
            setShowHistoryPanel(true);
            
            console.log('Opened/updated history panel for sensor:', associatedSensor.dispositiu);
          }
        }
        
        await fragments.core.update(true);
        console.log('Element selected from alert:', alert.dispositiu);
      } else {
        console.log('No element found for alert GUID:', alert.id);
      }
    } catch (error) {
      console.error('Error selecting element by alert:', error);
    }
  }, [fragmentsRef, worldRef, code, highlighterRef, componentsRef, setLocalId, setSelectedElement, sensorData, generateHistoricalData, setSelectedSensor, setSensorHistory, setShowHistoryPanel]);

  // Load building color when component mounts
  useEffect(() => {
    if (code) {
      getBuildingColor(code).then(setBuildingColor);
    }
  }, [code, setBuildingColor]);

  // Ensure default tab when panel gets opened from other places (e.g., double click in hook)
  useEffect(() => {
    if (showHistoryPanel) {
      setAlarmTab('info');
    }
  }, [showHistoryPanel]);

  // Detect screen size for responsive design
  useEffect(() => {
    const checkScreenSize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkScreenSize();
    window.addEventListener('resize', checkScreenSize);
    
    return () => window.removeEventListener('resize', checkScreenSize);
  }, [setIsMobile]);

  // Load levels from ifcspace when code changes
  useEffect(() => {
    loadLevelsFromIfcSpace();
  }, [code]);

  // Generate alerts when sensor data or parameter changes
  useEffect(() => {
    generateAlerts();
  }, [sensorData, code, activeParameter, buildingColor, generateAlerts]);

  // Setup raycasting when model is loaded
  useEffect(() => {
    if (fragmentsRef.current && worldRef.current) {
      const cleanup = setupRaycasting();
      return cleanup;
    }
  }, [fragmentsRef.current, worldRef.current, code, localId, setupRaycasting]);

  // Listen for marker clicks to open alarm details panel
  useEffect(() => {
    const handleMarkerClick = (event: CustomEvent) => {
      const { alert } = event.detail;
      if (alert) {
        // Convert alert to HistoricalEvent format
        const historicalEvent: HistoricalEvent = {
          id: alert.id,
          timestamp: new Date(),
          type: 'alert_start',
          // Map 'baix' -> 'ok' for AlarmDetailsPanel compatibility
          severity: (alert.severity === 'baix' ? 'ok' : alert.severity) as Severity,
          buildingCode: code || '',
          buildingColor: '#ff0000',
          planta: alert.planta || '',
          departament: alert.departament || '',
          dispositiu: alert.dispositiu,
          spaceGuid: alert.spaceGuid,
          value: alert.value,
          paramType: alert.paramType,
          message: `${alert.dispositiu}: ${alert.value}${alert.paramType === 'ppm' ? 'ppm' : (alert.paramType === 'humitat' ? '%' : '°C')}`,
          status: 'Obert'
        };
        
        // Open alarm panel with the event details
        setSelectedEvent(historicalEvent);
        setShowAlarmPanel(true);
        setAlarmTab('info');
        
        // Also select the element in the viewer
        selectElementByAlert(alert);
      }
    };

    document.addEventListener('alert-marker-click', handleMarkerClick as EventListener);
    
    return () => {
      document.removeEventListener('alert-marker-click', handleMarkerClick as EventListener);
    };
  }, [selectElementByAlert, code]);

  const getBuildingColor = async (code: string): Promise<string> => {
    try {
      const res = await fetch('/api/ifcbuildings');
      if (res.ok) {
        const buildings = await res.json();
        const building = buildings.find((b: any) => (b.codi || b.nom || b.code) === code);
        return building?.color || '#9aa0a6';
      }
    } catch (error) {
      console.debug('[ModelViewer] Error cargando colores de edificios:', error);
    }
    return '#9aa0a6';
  };

  const loadLevelsFromIfcSpace = async () => {
    if (!code) return;
    try {
      const levels = await ifcSpaceService.getLevels(code);
      setLevels(levels);
      console.log(`[ModelViewer] Loaded ${levels.length} levels for building ${code}:`, levels);
    } catch (error) {
      console.error('Error loading levels from ifcspace service:', error);
      setLevels(['P02', 'P01', 'P00', 'PSS', 'PS1']);
    }
  };

  const loadDepartmentsForLevel = async (level: string) => {
    if (!code) return;
    try {
      const departmentGroups = await ifcSpaceService.getDepartments(code, level);
      const newDepartments = { ...departments };
      newDepartments[level] = departmentGroups;
      setDepartments(newDepartments);
      console.log(`[ModelViewer] Loaded ${departmentGroups.length} departments for ${code}/${level}`);
    } catch (error) {
      console.error('Error loading departments for level:', error);
    }
  };

  const toggleLevelExpansion = (level: string, event: React.MouseEvent) => {
    event.stopPropagation();
    
    if (expandedLevel === level) {
      setExpandedLevel(null);
    } else {
      setExpandedLevel(level);
      if (!departments[level]) {
        loadDepartmentsForLevel(level);
      }
    }
  };

  const selectLevel = (level: string) => {
    setSelectedLevel(level);
    setSelectedDepartment(null);
    setExpandedLevel(null);
  };

  const selectDepartment = (level: string, department: string) => {
    setSelectedLevel(level);
    setSelectedDepartment(department);
  };

  // Initialize viewer
  useEffect(() => {
    const initializeViewer = async () => {
      if (!containerRef.current) return;

      // Check if already initialized
      if (fragmentsRef.current && fragmentsRef.current.core) {
        console.log('Viewer already initialized, skipping...');
        return;
      }

      const container = containerRef.current;
      container.innerHTML = '';

      // Initialize components
      const components = new OBC.Components();
      componentsRef.current = components;

      const worlds = components.get(OBC.Worlds);
      const world = worlds.create<
        OBC.SimpleScene,
        OBC.OrthoPerspectiveCamera,
        OBF.PostproductionRenderer
      >();

      worldRef.current = world;
      world.scene = new OBC.SimpleScene(components);
      world.scene.setup();
      world.scene.three.background = new THREE.Color(0x1a1d23);

      world.renderer = new OBF.PostproductionRenderer(components, container);
      world.camera = new OBC.OrthoPerspectiveCamera(components);

      // Ensure core components are initialized before using camera controls
      components.init();

      // Setup raycasting and highlighter AFTER fragments is initialized
      components.get(OBC.Raycasters).get(world);

      // Configurar cámara en ángulo
      if (world.camera?.controls?.setLookAt) {
        world.camera.controls.setLookAt(80, 60, 80, 0, 0, 0);
      }

      // Setup Fragments with consistent worker path
      const workerPath = "/node_modules/@thatopen/fragments/dist/Worker/worker.mjs";
      try { ViewerRegistry.setWorkerUrl(workerPath); } catch {}
      const fragments = components.get(OBC.FragmentsManager);
      
      // Initialize fragments and wait for it to be ready
      await fragments.init(workerPath);
      fragmentsRef.current = fragments;
      
      // Wait for fragments.core to be available
      let attempts = 0;
      while (!fragments.core && attempts < 20) {
        await new Promise(resolve => setTimeout(resolve, 100));
        attempts++;
      }
      
      if (!fragments.core) {
        throw new Error('FragmentsManager core not available after initialization');
      }
      
      console.log("FragmentsManager initialized successfully");

      // Add model to scene when loaded
      fragments.list.onItemSet.add(({ value: model }) => {
        try {
          if (world.camera?.three) {
            model.useCamera(world.camera.three);
          }
          world.scene.three.add(model.object);
          fragments.core.update(true);
          
          // Initialize highlighter and hider after model is loaded
          if (!highlighterRef.current) {
            const highlighter = components.get(OBF.Highlighter);
            highlighter.setup({
              world,
              selectMaterialDefinition: {
                color: new THREE.Color("#bcf124"),
                opacity: 1,
                transparent: false,
                renderedFaces: 0,
              },
            });
            highlighterRef.current = highlighter;
            
            // Initialize hider
            const hider = components.get(OBC.Hider);
            hiderRef.current = hider;
            console.log("Hider initialized successfully");

            // Initialize marker service
            const marker = components.get(OBF.Marker);
            markerRef.current = marker;
            console.log("Marker service initialized successfully");

            // Setup highlighter events
            highlighter.events.select.onHighlight.add(async (modelIdMap) => {
              console.log("Element selected:", modelIdMap);
            });

            highlighter.events.select.onClear.add(() => {
              console.log("Selection cleared");
            });

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
            // OK style for correct values
            highlighter.styles.set("ok", {
              color: new THREE.Color(ALERT_COLORS.OK),
              opacity: 1.0,
              transparent: false,
              renderedFaces: 0,
            });
            
            console.log("Highlighter initialized successfully");
            
            // Trigger initial colorization after model is loaded
            setTimeout(() => {
              performInitialColorization();
            }, 1000);
          }
        } catch (e) {
          console.debug('Deferred model attach due to camera not ready');
          setTimeout(() => {
            try {
              if (world.camera?.three) {
                model.useCamera(world.camera.three);
              }
              world.scene.three.add(model.object);
              fragments.core.update(true);
              
              // Initialize highlighter after model is loaded (retry)
              if (!highlighterRef.current) {
                const highlighter = components.get(OBF.Highlighter);
                highlighter.setup({
                  world,
                  selectMaterialDefinition: {
                    color: new THREE.Color("#bcf124"),
                    opacity: 1,
                    transparent: false,
                    renderedFaces: 0,
                  },
                });
                highlighterRef.current = highlighter;
                console.log("Highlighter initialized successfully (retry)");
                
                // Initialize marker service (retry)
                const marker = components.get(OBF.Marker);
                markerRef.current = marker;
                console.log("Marker service initialized successfully (retry)");
                
                // Trigger initial colorization after model is loaded (retry)
                setTimeout(() => {
                  performInitialColorization();
                }, 1000);
              }
            } catch {}
          }, 0);
        }
      });

      // Load model based on code parameter from local files
      const modelPath = `/models/Rooms/CCSPT-${code || 'ALB'}-M3D-Rooms.frag`;

      try {
        const file = await fetch(modelPath);
        if (!file.ok) {
          throw new Error(`Model file not found: ${modelPath}`);
        }
        const buffer = await file.arrayBuffer();
        try { if (code) ViewerRegistry.setModelBuffer(code, buffer); } catch {}
        
        // Ensure fragments is fully initialized before loading
        await ensureFragmentsReady();
        
        await fragments.core.load(buffer, { modelId: code || "default" });
        console.log(`Model ${code} loaded successfully from ${modelPath}`);
        
        // Actualización inmediata para mostrar el modelo completo
        await fragments.core.update(true);
        if (world.renderer) {
          world.renderer.three.render(world.scene.three, world.camera.three);
        }
        
        // Centrar el modelo inmediatamente sin animación
        setTimeout(async () => {
          try {
            if (world.camera?.controls) {
              const boxer = components.get(OBC.BoundingBoxer);
              if (boxer) {
                boxer.list.clear();
                boxer.addFromModels();
                const box = boxer.get();
                if (box && !box.isEmpty()) {
                  const center = box.getCenter(new THREE.Vector3());
                  const size = box.getSize(new THREE.Vector3());
                  const maxDim = Math.max(size.x, size.z);
                  
                  // Vista en ángulo centrada en el modelo
                  const cameraDistance = maxDim * 1.2;
                  const cameraX = center.x + cameraDistance * 0.7;
                  const cameraY = center.y + cameraDistance * 0.5;
                  const cameraZ = center.z + cameraDistance * 0.7;
                  
                  // Posicionar cámara sin animación
                  world.camera.controls.setLookAt(cameraX, cameraY, cameraZ, center.x, center.y, center.z, false);
                  
                  // Forzar múltiples actualizaciones para renderizar todo el modelo
                  for (let i = 0; i < 3; i++) {
                    await fragments.core.update(true);
                    if (world.renderer) {
                      world.renderer.three.render(world.scene.three, world.camera.three);
                    }
                    await new Promise(resolve => setTimeout(resolve, 100));
                  }
                }
                boxer.list.clear();
              }
            }
          } catch (e) {
            console.log('Camera centering not available, using default view');
          }
        }, 500);
      } catch (error) {
        console.error("Error loading model:", error);
        
        // Only show error overlay for real file loading errors
        if (error instanceof Error && error.message.includes('Model file not found')) {
          const errorDiv = document.createElement('div');
          errorDiv.style.cssText = `
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: rgba(220, 38, 38, 0.9);
            color: white;
            padding: 20px;
            border-radius: 8px;
            text-align: center;
            z-index: 1000;
            font-family: Arial, sans-serif;
          `;
          errorDiv.innerHTML = `
            <h3>Error cargando modelo</h3>
            <p>No se pudo cargar el modelo para el edificio: ${code}</p>
            <p>Archivo: ${modelPath}</p>
            <button onclick="window.history.back()" style="margin-top: 10px; padding: 8px 16px; background: white; color: #dc2626; border: none; border-radius: 4px; cursor: pointer;">
              Volver
            </button>
          `;
          container.appendChild(errorDiv);
        }
      }

      // Setup render loop and resize handler for proper proportions
      const renderScene = () => {
        if (world.renderer && world.scene && world.camera) {
          // Forzar actualización de fragments antes de renderizar
          if (fragmentsRef.current) {
            try {
              fragmentsRef.current.core.update(true);
            } catch {}
          }
          world.renderer.three.render(world.scene.three, world.camera.three);
        }
        requestAnimationFrame(renderScene);
      };
      renderScene();

      // Handle window resize to maintain proper proportions
      const handleResize = () => {
        if (!container || !world.renderer || !world.camera) return;
        
        const containerDimensions = container.getBoundingClientRect();
        world.renderer.three.setSize(containerDimensions.width, containerDimensions.height);
        
        const aspectRatio = containerDimensions.width / containerDimensions.height;
        if (world.camera.three instanceof THREE.PerspectiveCamera) {
          world.camera.three.aspect = aspectRatio;
          world.camera.three.updateProjectionMatrix();
        }
      };
      
      // Store reference for cleanup
      handleResizeRef.current = handleResize;
      
      window.addEventListener('resize', handleResize);
      
      // Initial resize call
      handleResize();

      // Stats hooks removed
    };

    initializeViewer();

    // Cleanup
    return () => {
      // Restore any ghosted materials or highlights
      try { restoreSceneMaterials(); } catch {}
      if (fragmentsRef.current) {
        fragmentsRef.current.dispose();
      }
      if (worldRef.current) {
        worldRef.current.dispose();
      }
      if (componentsRef.current) {
        componentsRef.current.dispose();
      }
      meshesRef.current.forEach(mesh => {
        mesh.removeFromParent();
        mesh.geometry.dispose();
        const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
        materials.forEach(material => material.dispose());
      });
      meshesRef.current = [];
      
      // Clean up resize event listener
      if (handleResizeRef.current) {
        window.removeEventListener('resize', handleResizeRef.current);
        handleResizeRef.current = null;
      }
    };
  }, [code, navigate]);

  return (
    <div style={{ 
      display: 'flex', 
      height: '100%', 
      background: '#f8f9fa',
      fontFamily: 'Arial, sans-serif',
      flexDirection: isMobile ? 'column' : 'row'
    }}>

      {/* Main Content */}
      <div style={{ 
        display: 'flex', 
        width: '100%', 
        height: '100%',
        marginTop: 0
      }}>
        {/* Left Panel - Navigation */}
        <NavigationPanel
          levels={levels}
          selectedLevel={selectedLevel}
          selectedDepartment={selectedDepartment}
          departments={departments}
          expandedLevel={expandedLevel}
          showOnlyAlerts={showOnlyAlerts}
          isMobile={isMobile}
          alerts={filteredAlerts}
          activeParameter={activeParameter}
          onLevelSelect={(level) => {
            selectLevel(level);
            isolateLevel(level);
          }}
          onDepartmentSelect={(level, department) => {
            selectDepartment(level, department);
            isolateDepartment(level, department, departments);
          }}
          onLevelExpand={toggleLevelExpansion}
          onShowAll={clearIsolation}
          onShowOnlyAlertsChange={setShowOnlyAlerts}
        />

        {/* Center Panel - 3D Viewer */}
        <div style={{ 
          flex: 1,
          minWidth: isMobile ? 'auto' : '200px',
          background: '#f5f5f5',
          position: 'relative',
          height: isMobile ? 'calc(100vh - 260px)' : '100%',
          order: isMobile ? 1 : 2
        }}>

          <div
            ref={containerRef}
            data-model-viewer
            style={{
              width: '100%',
              height: '100%',
              background: '#1a1d23',
              position: 'relative'
            }}
          />

          {/* Unified floating Alarm Details Panel with Tabs */}
          <AlarmDetailsPanel
            visible={showHistoryPanel}
            onClose={() => setShowHistoryPanel(false)}
            activeTab={alarmTab}
            onTabChange={setAlarmTab}
            activeParameter={activeParameter === 'all' ? 'temperatura' : activeParameter}
            selectedSensor={selectedSensor}
            selectedElement={selectedElement}
            sensorHistory={sensorHistory}
            buildingColor={buildingColor}
            overlayInViewer={true}
          />
        </div>

        {/* Right Panel - Alerts and Information */}
        <div style={{ 
          width: isMobile ? '100%' : '400px',
          minWidth: isMobile ? 'auto' : '400px',
          flexShrink: isMobile ? 1 : 0,
          height: isMobile ? '200px' : '100%',
          background: '#fff',
          borderLeft: isMobile ? 'none' : '1px solid #e0e6ef',
          borderTop: isMobile ? '1px solid #e0e6ef' : 'none',
          display: 'flex',
          flexDirection: 'column',
          order: isMobile ? 3 : 3
        }}>
          {/* Alerts Panel */}
          <div style={{
            flex: 1,
            borderBottom: '1px solid #e0e6ef',
            display: 'flex',
            flexDirection: 'column'
          }}>
            <AlertsPanel
              alerts={filteredAlerts}
              paramType={activeParameter}
              onParamChange={setActiveParameter}
              title="Alertes Globals"
              subtitle="Prioritzades per severitat i desviació del Rang"
              showBuildingCode={false}
              onAlertClick={selectElementByAlert}
              severityFilter={severityFilter}
              onSeverityFilterChange={setSeverityFilter}
              style={{
                background: 'transparent',
                border: 'none',
                borderRadius: 0,
                padding: '20px',
                flex: 1
              }}
            />
          </div>

          {/* Element Information Panel removed in favor of unified floating panel */}
        </div>
      </div>

      {/* Floating Alarm Details Panel */}
      {showAlarmPanel && selectedEvent && (
        <AlarmDetailsPanel
          visible={showAlarmPanel}
          onClose={() => setShowAlarmPanel(false)}
          activeTab={alarmTab}
          onTabChange={setAlarmTab}
          activeParameter={selectedEvent.paramType as 'temperatura' | 'humitat' | 'ppm'}
          selectedSensor={{
            spaceGuid: selectedEvent.spaceGuid || '',
            dispositiu: selectedEvent.dispositiu,
            planta: selectedEvent.planta,
            departament: selectedEvent.departament,
            value: selectedEvent.value,
            timestamp: selectedEvent.timestamp.toISOString(),
            severity: selectedEvent.severity,
            paramType: selectedEvent.paramType
          }}
          selectedElement={{
            guid: selectedEvent.spaceGuid || '',
            name: selectedEvent.dispositiu,
            type: 'IFCSPACE'
          }}
          sensorHistory={[]}
          buildingColor={selectedEvent.buildingColor}
          overlayInViewer={true}
        />
      )}
    </div>
  );
};

export default ModelViewerRefactored;

