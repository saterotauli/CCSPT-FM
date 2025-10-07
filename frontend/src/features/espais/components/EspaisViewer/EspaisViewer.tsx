import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import * as OBC from '@thatopen/components';
import * as OBF from '@thatopen/components-front';
import * as BUI from '@thatopen/ui';
import * as FRAGS from '@thatopen/fragments';
import { modelStore } from '../../../../globals';
import { loadBuilding } from '@modules/viewer/utils/BuildingLoader';

interface EspaisViewerProps {
  isMobile?: boolean;
}

/**
 * EspaisViewer - Dedicated viewer for Espais page
 * Supports model loading, highlighting, markers, and space focusing
 */
const EspaisViewer: React.FC<EspaisViewerProps> = ({ isMobile = false }) => {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const componentsRef = useRef<OBC.Components | null>(null);
  const worldRef = useRef<OBC.World | null>(null);
  const fragmentsManagerRef = useRef<OBC.FragmentsManager | null>(null);
  const fragmentsModelsRef = useRef<FRAGS.FragmentsModels | null>(null);
  const highlighterRef = useRef<OBF.Highlighter | null>(null);
  const markerRef = useRef<OBF.Marker | null>(null);
  const hiderRef = useRef<OBC.Hider | null>(null);

  useEffect(() => {
    const init = async () => {
      if (!rootRef.current) return;
      rootRef.current.innerHTML = '';

      try { BUI.Manager.init(); } catch {}

      const viewportDiv = document.createElement('div');
      viewportDiv.style.width = '100%';
      viewportDiv.style.height = '100%';
      viewportDiv.style.position = 'relative';
      rootRef.current.appendChild(viewportDiv);

      const components = new OBC.Components();
      componentsRef.current = components;

      const worlds = components.get(OBC.Worlds);
      const world = worlds.create<OBC.SimpleScene, OBC.SimpleCamera, OBF.PostproductionRenderer>();
      worldRef.current = world;

      world.name = 'Espais-Viewer';
      world.scene = new OBC.SimpleScene(components);
      world.scene.setup();
      world.scene.three.background = new THREE.Color(0x1a1d23);

      world.renderer = new OBF.PostproductionRenderer(components, viewportDiv);
      world.camera = new OBC.SimpleCamera(components);
      
      try {
        // Configure camera controls
        (world.camera.controls as any).maxDistance = 500_000;
        (world.camera.controls as any).minDistance = 1;
        
        // Configure camera clipping planes and FOV
        if (world.camera.three) {
          world.camera.three.near = 0.1;
          world.camera.three.far = 1_000_000;
          
          if (world.camera.three instanceof THREE.PerspectiveCamera) {
            world.camera.three.fov = 60;
          }
          
          world.camera.three.updateProjectionMatrix();
        }
        
        // Set initial camera position
        world.camera.controls.setLookAt(81.38, 363.71, 335.55, 185.01, -53.70, 143.86, true);
      } catch {}

      components.init();

      const ensureResize = () => {
        try { world.renderer?.resize(); } catch {}
        try { 
          world.camera.updateAspect(); 
          if (world.camera.three) {
            world.camera.three.near = 0.1;
            world.camera.three.far = 1_000_000;
            world.camera.three.updateProjectionMatrix();
          }
        } catch {}
      };

      const { postproduction } = world.renderer;
      postproduction.enabled = true;
      postproduction.style = OBF.PostproductionAspect.COLOR_SHADOWS;
      world.renderer.postproduction.edgesPass.color = new THREE.Color(0x494b50);

      // Setup raycasting AFTER components init
      components.get(OBC.Raycasters).get(world);

      // Do initial resizes
      ensureResize();
      requestAnimationFrame(() => ensureResize());
      setTimeout(() => ensureResize(), 100);

      // Initialize FragmentsManager and FragmentsModels
      const fragmentsManager = components.get(OBC.FragmentsManager);
      fragmentsManagerRef.current = fragmentsManager;
      
      const fragmentsModels = new FRAGS.FragmentsModels('/worker.mjs');
      fragmentsModelsRef.current = fragmentsModels;
      
      try {
        await fragmentsManager.init('/worker.mjs');
      } catch (e) {
        console.warn('[EspaisViewer] FragmentsManager init warning:', e);
      }

      // Setup resize observer
      let resizeObserver: ResizeObserver | undefined;
      try {
        resizeObserver = new ResizeObserver(() => { 
          ensureResize(); 
          try { fragmentsModels.update(true); } catch {} 
        });
        resizeObserver.observe(viewportDiv);
      } catch {}

      // Model attachment handler with proper initialization
      const attachModel = async (model: any) => {
        try {
          model.useCamera(world.camera.three);
          world.scene.three.add(model.object);
          await fragmentsModels.update(true);
          
          // Initialize components after first model is loaded
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

            // Create custom highlight style for space focus
            highlighter.styles.set("space-focus", {
              color: new THREE.Color("#ff6b35"), // Orange highlight
              opacity: 0.8,
              transparent: true,
              renderedFaces: 0, // Should be 0 according to docs
            });

            // Setup event handlers for custom highlighter
            highlighter.events["space-focus"].onHighlight.add((modelIdMap) => {
              console.log('[EspaisViewer] Space highlighted:', modelIdMap);
            });

            highlighter.events["space-focus"].onClear.add(() => {
              console.log('[EspaisViewer] Space highlight cleared');
            });

            console.log('[EspaisViewer] Highlighter initialized');
          }

          if (!markerRef.current) {
            const marker = components.get(OBF.Marker);
            marker.threshold = 20;
            markerRef.current = marker;
            console.log('[EspaisViewer] Marker service initialized');
          }

          if (!hiderRef.current) {
            const hider = components.get(OBC.Hider);
            hiderRef.current = hider;
            console.log('[EspaisViewer] Hider initialized');
          }

        } catch (e) {
          console.warn('[EspaisViewer] Error attaching model:', e);
        }
      };

      fragmentsModels.models.list.onItemSet.add(async ({ value: model }) => {
        await attachModel(model);
      });

      // Update fragments when camera rests
      world.camera.controls.addEventListener('rest', () => {
        try { fragmentsModels.update(true); } catch {}
      });

      // Console helpers
      (window as any).espaisDumpLookAt = () => {
        try {
          const ctrls: any = world.camera.controls;
          const pos = new THREE.Vector3();
          const tar = new THREE.Vector3();
          if (typeof ctrls.getPosition === 'function') ctrls.getPosition(pos); 
          else pos.copy(world.camera.three.position);
          if (typeof ctrls.getTarget === 'function') ctrls.getTarget(tar);
          const line = `world.camera.controls.setLookAt(${pos.x.toFixed(2)}, ${pos.y.toFixed(2)}, ${pos.z.toFixed(2)}, ${tar.x.toFixed(2)}, ${tar.y.toFixed(2)}, ${tar.z.toFixed(2)}, true)`;
          console.log('[EspaisViewer] setLookAt:', line);
          return { position: pos, target: tar, command: line };
        } catch (e) { console.warn('[EspaisViewer] espaisDumpLookAt failed', e); }
      };

      // Load MAP model initially
      const mapFile = 'CCSPT-MAP-M3D-AS.frag';
      try {
        const resp = await fetch(`/models/${mapFile}`);
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
        const buffer = await resp.arrayBuffer();
        
        const bufferForModels = buffer;
        const bufferForManager = buffer.slice(0);
        
        await fragmentsModels.load(bufferForModels, { modelId: mapFile.replace('.frag','') });
        await fragmentsManager.core.load(bufferForManager, { modelId: mapFile.replace('.frag','') });
        
        for (const [, model] of fragmentsModels.models.list) {
          await attachModel(model);
        }
        
        console.log('[EspaisViewer] MAP model loaded');
      } catch (e) {
        console.error('[EspaisViewer] Failed to load MAP model:', e);
      }

      // Load building by code function
      const loadBuildingByCode = async (buildingCode: string, variant: 'as' | 'rooms' = 'rooms') => {
        try {
          console.log(`[EspaisViewer] Loading building ${buildingCode} with variant ${variant}`);
          
          await loadBuilding(components, buildingCode, { variant });
          modelStore.setActiveBuilding(buildingCode);
          await fragmentsManager.core.update(true);

          return true;
        } catch (e) {
          console.error('[EspaisViewer] Error loading building:', e);
          return false;
        }
      };

      // Clear isolation function
      const clearIsolation = async () => {
        try {
          console.log('[EspaisViewer] Clearing isolation');
          
          // Clear highlights using the correct API
          const highlighter = highlighterRef.current;
          if (highlighter) {
            // Clear all custom highlights
            await highlighter.clear("space-focus");
            console.log('[EspaisViewer] Cleared space-focus highlights');
          }
          
          // Clear markers
          const marker = markerRef.current;
          if (marker) {
            marker.list.clear();
          }
          
          // Clear hider isolation - show all elements
          const hider = hiderRef.current;
          if (hider) {
            try {
              // Reset hider to show all elements
              const emptyMap = {};
              await hider.isolate(emptyMap);
        } catch (e) {
              console.warn('[EspaisViewer] Error clearing hider:', e);
            }
          }
          
          // Reset model store
          modelStore.setActiveBuilding('');
          modelStore.setActiveFloor('');
          
          // Update fragments
          if (fragmentsManager) {
            await fragmentsManager.core.update(true);
          }
          
          // Reset camera
          world.camera.controls.setLookAt(81.38, 363.71, 335.55, 185.01, -53.70, 143.86, true);
          
          console.log('[EspaisViewer] Isolation cleared');
        } catch (e) {
          console.error('[EspaisViewer] Error clearing isolation:', e);
        }
      };

      // Highlight and focus space function
      const highlightAndFocusSpace = async (guid: string, buildingCode: string, name?: string) => {
        try {
          console.log(`[EspaisViewer] Highlighting space ${guid} in building ${buildingCode}`);
          
          // Find Rooms model
          let model = null;
          let modelId = '';
          const loadedModelIds = Array.from(fragmentsManager.list.keys());
          const roomsModelId = loadedModelIds.find(id => 
            id.includes('Rooms') && id.includes(buildingCode)
          );
          
          if (roomsModelId) {
            model = fragmentsManager.list.get(roomsModelId);
            modelId = roomsModelId;
          }
          
          if (!model) {
            console.warn('[EspaisViewer] No Rooms model found for highlighting');
            return;
          }

          // Get IFCSPACE items
          const categories = await (model as any).getItemsOfCategories([/IFCSPACE/i]);
          const spaceIds: number[] = (categories?.IFCSPACE || []) as number[];
          if (!spaceIds || spaceIds.length === 0) {
            console.warn('[EspaisViewer] No IFCSPACE elements found');
            return;
          }

          // Map GUID to local IDs
          const mappedGuids: string[] = await (model as any).getGuidsByLocalIds(spaceIds);
          let targetLocalIds: number[] = [];
          
                if (Array.isArray(mappedGuids)) {
            for (let i = 0; i < mappedGuids.length; i++) {
              if (mappedGuids[i] === guid) {
                targetLocalIds.push(spaceIds[i]);
              }
            }
          }
          
          if (targetLocalIds.length === 0) {
            console.warn(`[EspaisViewer] Space GUID ${guid} not found in model`);
            return;
          }

          // Clear previous highlights and markers
          const highlighter = highlighterRef.current;
          const marker = markerRef.current;
          
          if (highlighter) {
            // Clear the specific space-focus highlighter
            await highlighter.clear("space-focus");
          }
          
          if (marker) {
            marker.list.clear();
          }

          // Highlight the space using the correct API
          if (highlighter) {
            const modelIdMap: { [modelId: string]: Set<number> } = {};
            modelIdMap[modelId] = new Set(targetLocalIds);
            
            // Use the highlightByID method with the custom style name
            await highlighter.highlightByID("space-focus", modelIdMap as any, false, false);
            console.log(`[EspaisViewer] Applied space-focus highlight to model ${modelId} with ${targetLocalIds.length} elements`);
          }

          // Create marker using the official API
          if (name && marker) {
            try {
              const positions = await (model as any).getPositions(targetLocalIds);
              if (positions && positions.length > 0) {
                // Create the HTML element for the marker
                const markerElement = document.createElement('div');
                markerElement.style.cssText = `
                  background: #ff6b35;
                  color: #fff;
                  padding: 8px 16px;
                  border-radius: 8px;
                  font-size: 14px;
                  font-weight: bold;
                  box-shadow: 0 4px 12px rgba(0,0,0,0.3);
                  white-space: nowrap;
                  max-width: 250px;
                  text-align: center;
                  pointer-events: none;
                  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                `;
                markerElement.textContent = name;
                
                // Create the marker using the position from the first element
                marker.create(world, markerElement, positions[0]);
                console.log(`[EspaisViewer] Created marker for space: ${name} at position:`, positions[0]);
              }
          } catch (e) {
              console.error('[EspaisViewer] Error creating marker:', e);
          }
        }
      
          // Focus camera on space
        try {
          const boxer = components.get(OBC.BoundingBoxer);
            if (boxer) {
          boxer.list.clear();
              const boxModelIdMap: OBC.ModelIdMap = { [modelId]: new Set(targetLocalIds) };
              await boxer.addFromModelIdMap(boxModelIdMap);
              const boundingBox = boxer.get();
              
              if (boundingBox && !boundingBox.isEmpty()) {
                const sphere = new THREE.Sphere();
                boundingBox.getBoundingSphere(sphere);
                sphere.radius = Math.max(sphere.radius * 1.5, 10);
                world.camera.controls.fitToSphere(sphere, true);
              }
              
              boxer.list.clear();
            }
          } catch (e) {
            console.error('[EspaisViewer] Error focusing camera:', e);
          }
          
          console.log(`[EspaisViewer] Successfully highlighted space ${guid}`);
        } catch (e) {
          console.error('[EspaisViewer] Error highlighting space:', e);
        }
      };

      // Isolate floor function
      const isolateFloor = async (buildingCode: string, floorCode: string) => {
        try {
          console.log(`[EspaisViewer] Isolating floor ${floorCode} in building ${buildingCode}`);
          
          const hider = hiderRef.current;
          if (!hider) {
            console.warn('[EspaisViewer] Hider not initialized');
            return;
          }
          
          // Find Rooms model
          let model = null;
          let modelId = '';
          const loadedModelIds = Array.from(fragmentsManager.list.keys());
          const roomsModelId = loadedModelIds.find(id => 
            id.includes('Rooms') && id.includes(buildingCode)
          );
          
          if (roomsModelId) {
            model = fragmentsManager.list.get(roomsModelId);
            modelId = roomsModelId;
          }
          
          if (!model) {
            console.warn('[EspaisViewer] No Rooms model found for isolation');
            return;
          }

          // Get floor GUIDs from backend
          let guidsSet = new Set<string>();
          try {
            const response = await fetch(`/api/ifcspace?edifici=${buildingCode}&planta=${encodeURIComponent(floorCode)}`);
            if (response.ok) {
              const spaces = await response.json();
              if (Array.isArray(spaces)) {
                spaces.forEach(space => {
                  if (space.guid) guidsSet.add(space.guid);
                });
              }
            }
          } catch (e) {
            console.error('[EspaisViewer] Error fetching floor GUIDs:', e);
          }

          if (guidsSet.size === 0) {
            console.warn(`[EspaisViewer] No GUIDs found for floor ${floorCode}`);
            return;
          }

          // Get IFCSPACE items and map GUIDs
          const categories = await (model as any).getItemsOfCategories([/IFCSPACE/i]);
          const spaceIds: number[] = (categories?.IFCSPACE || []) as number[];
          if (!spaceIds || spaceIds.length === 0) {
            console.warn('[EspaisViewer] No IFCSPACE elements found');
            return;
          }

          let selectedLocalIds: number[] = [];
          try {
            const mappedGuids: string[] = await (model as any).getGuidsByLocalIds(spaceIds);
            if (Array.isArray(mappedGuids)) {
              for (let i = 0; i < mappedGuids.length; i++) {
                const guid = mappedGuids[i];
                if (guidsSet.has(guid)) {
                  selectedLocalIds.push(spaceIds[i]);
                }
              }
            }
          } catch (e) {
            console.error('[EspaisViewer] Error mapping GUIDs to local IDs:', e);
            return;
          }

          if (selectedLocalIds.length === 0) {
            console.warn(`[EspaisViewer] No elements found for floor ${floorCode}`);
            return;
          }

          // Isolate elements
          const modelIdMap: { [modelId: string]: Set<number> } = {};
          modelIdMap[modelId] = new Set(selectedLocalIds);

          await hider.isolate(modelIdMap);
          await fragmentsManager.core.update(true);
          
          // Focus camera on floor
          try {
            const boxer = components.get(OBC.BoundingBoxer);
            if (boxer) {
              boxer.list.clear();
              const boxModelIdMap: OBC.ModelIdMap = { [modelId]: new Set(selectedLocalIds) };
              await boxer.addFromModelIdMap(boxModelIdMap);
              const boundingBox = boxer.get();
              
              if (boundingBox && !boundingBox.isEmpty()) {
                const sphere = new THREE.Sphere();
                boundingBox.getBoundingSphere(sphere);
                world.camera.controls.fitToSphere(sphere, true);
              }
              
              boxer.list.clear();
            }
          } catch (e) {
            console.error('[EspaisViewer] Error focusing camera on floor:', e);
          }
          
          console.log(`[EspaisViewer] Successfully isolated floor ${floorCode} with ${selectedLocalIds.length} elements`);
        } catch (e) {
          console.error('[EspaisViewer] Error isolating floor:', e);
        }
      };

      // Event listeners
      window.addEventListener('espais:focus-department', async (event: any) => {
        console.log('[EspaisViewer] Received focus-department event:', event.detail);
        const { department, building, floor } = event.detail;
        if (!department) return;
        
        try {
          if (building) {
            const ok = await loadBuildingByCode(building, 'rooms');
            if (ok && floor) {
              modelStore.setActiveFloor(floor);
              await isolateFloor(building, floor);
                }
              }
            } catch (e) {
          console.error('[EspaisViewer] Error handling focus-department:', e);
        }
      });

      window.addEventListener('espais:focus-device', async (event: any) => {
        console.log('[EspaisViewer] Received focus-device event:', event.detail);
        const { guid, building, floor, name } = event.detail;
        if (!guid) return;
        
        try {
          if (building) {
            const ok = await loadBuildingByCode(building, 'rooms');
            if (ok) {
              modelStore.setActiveBuilding(building);
              if (floor) {
                modelStore.setActiveFloor(floor);
              }
              await highlightAndFocusSpace(guid, building, name);
            }
          }
        } catch (e) {
          console.error('[EspaisViewer] Error handling focus-device:', e);
        }
      });

      window.addEventListener('espais:clear-isolation', async () => {
        console.log('[EspaisViewer] Received clear-isolation event');
        try {
          await clearIsolation();
          } catch (e) {
          console.error('[EspaisViewer] Error handling clear-isolation:', e);
        }
      });

      // Cleanup function
      return () => {
        try {
          if (resizeObserver) {
            resizeObserver.disconnect();
          }
          if (componentsRef.current) {
            componentsRef.current.dispose();
            }
          } catch (e) {
          console.warn('[EspaisViewer] Cleanup warning:', e);
        }
      };
    };

    init();
  }, [isMobile]);

  return <div ref={rootRef} style={{ width: '100%', height: '100%', position: 'relative' }} />;
};

export default EspaisViewer;