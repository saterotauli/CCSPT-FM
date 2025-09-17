import React, { useEffect, useRef, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import * as THREE from "three";
import * as OBC from "@thatopen/components";
import * as OBF from "@thatopen/components-front";
import Stats from "stats.js";
import { useRealTimeSensors } from '../hooks/useRealTimeSensors';
import { useModelViewer } from '../hooks/useModelViewer';
import { useIsolation } from '../hooks/useIsolation';
import { useAlerts } from '../hooks/useAlerts';
import { useRaycasting } from '../hooks/useRaycasting';
import SensorHistoryChart from '../components/SensorHistoryChart';
import AlertsPanel from '../components/AlertsPanel';
import NavigationPanel from '../components/NavigationPanel';
import ElementInfoPanel from '../components/ElementInfoPanel';
import ViewerRegistry from '../viewer/ViewerRegistry';

const ModelViewerRefactored: React.FC = () => {
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();
  const containerRef = useRef<HTMLDivElement>(null);
  const statsRef = useRef<Stats | null>(null);
  const meshesRef = useRef<THREE.Mesh[]>([]);
  const originalMaterialsRef = useRef<Map<THREE.Material, { transparent: boolean; opacity: number; color?: number }>>(new Map());
  const handleResizeRef = useRef<(() => void) | null>(null);
  const markersRef = useRef<Map<string, any>>(new Map());
  
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

  // Sensors - actualizar cada 10 segundos
  const { data: sensorData } = useRealTimeSensors({
    edifici: code,
    interval: 20000, // 20 segundos
    autoStart: true
  });

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
        // Limpiar markers usando la API correcta
        markerRef.current.list.clear();
        
        // Limpiar elementos DOM de markers
        const existingMarkers = document.querySelectorAll('[data-marker]');
        existingMarkers.forEach(el => el.remove());
        
        // Limpiar nuestro mapa de referencias
        markersRef.current.clear();
        console.log('Cleared all markers');
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
  });

  // Filter alerts by selected level
  const filteredAlerts = useMemo(() => {
    if (!selectedLevel) {
      return alerts;
    }
    return alerts.filter(alert => alert.planta === selectedLevel);
  }, [alerts, selectedLevel]);

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
      
      // Find the local ID for this alert's GUID
      let localId: number | null = null;
      if (Array.isArray(mappedGuids)) {
        for (let i = 0; i < mappedGuids.length; i++) {
          if (mappedGuids[i] === alert.id) {
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
          const associatedSensor = sensorData.find(s => s.spaceGuid === spaceGuid);
          if (associatedSensor) {
            // Generar datos históricos
            const historicalData = generateHistoricalData(associatedSensor);
            
            // Configurar el panel histórico (abrir si está cerrado, actualizar si está abierto)
            setSelectedSensor(associatedSensor);
            setSensorHistory(historicalData);
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

  // Detect screen size for responsive design
  useEffect(() => {
    const checkScreenSize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkScreenSize();
    window.addEventListener('resize', checkScreenSize);
    
    return () => window.removeEventListener('resize', checkScreenSize);
  }, [setIsMobile]);

  // Load levels from sensors when sensor data changes
  useEffect(() => {
    loadLevelsFromSensors();
  }, [sensorData, code]);

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

  const loadLevelsFromSensors = () => {
    if (!sensorData || !code) return;
    try {
      const buildingSensors = sensorData.filter((s) => s.spaceGuid && s.edifici === code);
      const uniqueLevels = [...new Set(buildingSensors.map((s) => s.planta).filter(Boolean))] as string[];
      
      // Ordenar niveles según altura física (de más alto a más bajo)
      const sortedLevels = uniqueLevels.sort((a, b) => {
        const specialLevels = ['PSS', 'PS1', 'Sin planta'];
        const aIsSpecial = specialLevels.includes(a);
        const bIsSpecial = specialLevels.includes(b);
        
        if (aIsSpecial && bIsSpecial) {
          const specialOrder = ['PSS', 'PS1', 'Sin planta'];
          return specialOrder.indexOf(a) - specialOrder.indexOf(b);
        } else if (aIsSpecial) {
          return 1;
        } else if (bIsSpecial) {
          return -1;
        } else {
          const aNum = parseInt(a.replace('P', ''));
          const bNum = parseInt(b.replace('P', ''));
          return bNum - aNum; // Descendente (más alto primero)
        }
      });
      
      setLevels(sortedLevels);
    } catch (error) {
      console.error('Error loading levels from sensors:', error);
      setLevels(['P02', 'P01', 'P00', 'PSS', 'PS1', 'Sin planta']);
    }
  };

  const loadDepartmentsForLevel = async (level: string) => {
    if (!code) return;
    try {
      const response = await fetch(`/api/ifcspace/departaments?edifici=${code}&planta=${encodeURIComponent(level)}`);
      if (response.ok) {
        const data = await response.json();
        const newDepartments = { ...departments };
        newDepartments[level] = data;
        setDepartments(newDepartments);
      } else {
        console.error('Error loading departments for level:', level);
      }
    } catch (error) {
      console.error('Error loading departments for level:', error, error);
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

      // Setup Fragments
      const githubUrl = "https://thatopen.github.io/engine_fragment/resources/worker.mjs";
      const fetchedUrl = await fetch(githubUrl);
      const workerBlob = await fetchedUrl.blob();
      const workerFile = new File([workerBlob], "worker.mjs", { type: "text/javascript" });
      const workerUrl = URL.createObjectURL(workerFile);
      try { ViewerRegistry.setWorkerUrl(workerUrl); } catch {}
      const fragments = components.get(OBC.FragmentsManager);
      
      // Initialize fragments and wait for it to be ready
      await fragments.init(workerUrl);
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
      let modelPath = "";
      switch (code) {
        case "ALB":
          modelPath = "/models/CCSPT-ALB-M3D-Rooms.frag";
          break;
        case "CQA":
          modelPath = "/models/CCSPT-CQA-M3D-Rooms.frag";
          break;
        case "MAP":
          modelPath = "/models/CCSPT-MAP-M3D-AS.frag";
          break;
        case "MIN":
          modelPath = "/models/CCSPT-MIN-M3D-AS.frag";
          break;
        case "RAC":
          modelPath = "/models/CCSPT-RAC-M3D-AS.frag";
          break;
        case "SAL":
          modelPath = "/models/CCSPT-SAL-M3D-Rooms.frag";
          break;
        case "TAU":
          modelPath = "/models/CCSPT-TAU-M3D-Rooms.frag";
          break;
        case "TOC":
          modelPath = "/models/CCSPT-TOC-M3D-AS.frag";
          break;
        case "UDI":
          modelPath = "/models/CCSPT-UDI-M3D-Rooms.frag";
          break;
        case "VEU":
          modelPath = "/models/CCSPT-VEU-M3D-Rooms.frag";
          break;
        case "VII":
          modelPath = "/models/CCSPT-VII-M3D-AS.frag";
          break;
        default:
          modelPath = "/models/CCSPT-ALB-M3D-Rooms.frag"; // Default fallback
      }

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

      // Setup Stats
      const stats = new Stats();
      stats.showPanel(2);
      container.appendChild(stats.dom);
      stats.dom.style.position = "absolute";
      stats.dom.style.left = "10px";
      stats.dom.style.top = "10px";
      stats.dom.style.zIndex = "1000";
      statsRef.current = stats;

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

      // Guard: Some renderers may not expose update events immediately
      if (world.renderer && (world.renderer as any).onBeforeUpdate && (world.renderer as any).onAfterUpdate) {
        (world.renderer as any).onBeforeUpdate.add(() => stats.begin());
        (world.renderer as any).onAfterUpdate.add(() => stats.end());
      } else {
        console.debug('Renderer update hooks not available yet; skipping stats hooks');
      }
    };

    initializeViewer();

    // Cleanup
    return () => {
      // Restore any ghosted materials or highlights
      try { restoreSceneMaterials(); } catch {}
      if (statsRef.current) {
        statsRef.current.dom.remove();
      }
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
      height: '100vh', 
      background: '#f8f9fa',
      fontFamily: 'Arial, sans-serif',
      flexDirection: isMobile ? 'column' : 'row'
    }}>
      {/* Header */}
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: '60px',
        background: '#fff',
        borderBottom: '1px solid #e0e6ef',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 20px',
        zIndex: 1000
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <button 
            onClick={() => navigate(-1)}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '16px',
              cursor: 'pointer',
              color: '#666'
            }}
          >
            ← Tornar
          </button>
          <div style={{
            background: buildingColor,
            color: 'white',
            padding: '4px 12px',
            borderRadius: '4px',
            fontSize: '14px',
            fontWeight: 'bold'
          }}>
            {code}
          </div>
          <h1 style={{ margin: 0, fontSize: '18px', color: '#333' }}>
            {activeParameter === 'temperatura' ? 'Temperatura' : activeParameter === 'humitat' ? 'Humedad' : 'CO₂'}
          </h1>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <div 
            onClick={() => setActiveParameter('temperatura')}
            style={{
              width: '40px',
              height: '40px',
              borderRadius: '50%',
              background: activeParameter === 'temperatura' ? '#4179b5' : '#e0e6ef',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              transition: 'background-color 0.2s'
            }}
          >
            🌡️
          </div>
          <div 
            onClick={() => setActiveParameter('humitat')}
            style={{
              width: '40px',
              height: '40px',
              borderRadius: '50%',
              background: activeParameter === 'humitat' ? '#4179b5' : '#e0e6ef',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              transition: 'background-color 0.2s'
            }}
          >
            💧
          </div>
          <div 
            onClick={() => setActiveParameter('ppm')}
            style={{
              width: '40px',
              height: '40px',
              borderRadius: '50%',
              background: activeParameter === 'ppm' ? '#4179b5' : '#e0e6ef',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              transition: 'background-color 0.2s'
            }}
          >
            ⚗️
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div style={{ 
        display: 'flex', 
        width: '100%', 
        height: '100%',
        marginTop: '60px'
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
          alerts={alerts}
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
              subtitle="Prioritzades per severitat i desviació del Rang"
              showBuildingCode={false}
              onAlertClick={selectElementByAlert}
              style={{
                background: 'transparent',
                border: 'none',
                borderRadius: 0,
                padding: '20px',
                flex: 1
              }}
            />
          </div>

          {/* Element Information Panel */}
          <ElementInfoPanel
            selectedElement={selectedElement}
            localId={localId}
            isMobile={isMobile}
            selectedSensor={selectedSensor}
          />
        </div>
      </div>

      {/* Historical Panel */}
      <SensorHistoryChart
        data={sensorHistory}
        deviceName={selectedSensor?.dispositiu || 'Sensor'}
        isVisible={showHistoryPanel}
        onClose={() => setShowHistoryPanel(false)}
        activeParameter={activeParameter}
        roomInfo={{
          spaceGuid: selectedSensor?.spaceGuid,
          roomType: selectedSensor?.roomType || selectedSensor?.dispositiu,
          planta: selectedSensor?.planta,
          departament: selectedSensor?.departament,
          edifici: selectedSensor?.edifici
        }}
      />
    </div>
  );
};

export default ModelViewerRefactored;
