import { useCallback } from 'react';
import * as THREE from "three";
import * as OBC from "@thatopen/components";
import * as OBF from "@thatopen/components-front";
import * as FRAGS from "@thatopen/fragments";

interface UseRaycastingProps {
  code: string | undefined;
  fragmentsRef: React.MutableRefObject<OBC.FragmentsManager | null>;
  worldRef: React.MutableRefObject<OBC.World | null>;
  highlighterRef: React.MutableRefObject<OBF.Highlighter | null>;
  componentsRef: React.MutableRefObject<OBC.Components | null>;
  setLocalId: (id: number | null) => void;
  setSelectedElement: (element: any) => void;
  localId: number | null;
  generateHistoricalData: (sensor: any) => any[];
  setSelectedSensor: (sensor: any) => void;
  setSensorHistory: (history: any[]) => void;
  setShowHistoryPanel: (show: boolean) => void;
  showHistoryPanel: boolean;
  sensorData: any[];
}

export const useRaycasting = ({
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
  sensorData,
}: UseRaycastingProps) => {
  
  const setupRaycasting = useCallback(() => {
    if (!fragmentsRef.current || !worldRef.current) return;
    
    const fragments = fragmentsRef.current;
    const world = worldRef.current;
    const mouse = new THREE.Vector2();

    const highlightMaterial: FRAGS.MaterialDefinition = {
      color: new THREE.Color("gold"),
      renderedFaces: FRAGS.RenderedFaces.TWO,
      opacity: 1,
      transparent: false,
    };

    const handleClick = async (event: MouseEvent) => {
      mouse.x = event.clientX;
      mouse.y = event.clientY;
      
      try {
        const model = fragments.list.get(code || '');
        if (!model) return;

        const result = await model.raycast({
          camera: world.camera.three as THREE.PerspectiveCamera,
          mouse,
          dom: world.renderer!.three.domElement!,
        });
        
        if (result) {
          // Use highlighter for selection instead of direct model.highlight
          const highlighter = highlighterRef.current;
          if (highlighter) {
            // Clear previous selection
            await highlighter.clear("select");
            
            // Set new selection using highlighter
            const modelIdMap: { [modelId: string]: Set<number> } = {};
            modelIdMap[code || ''] = new Set([result.localId]);
            await highlighter.highlightByID("select", modelIdMap, false);
          } else {
            // Fallback to direct highlighting
            if (localId !== null) {
              await model.resetHighlight([localId]);
            }
            await model.highlight([result.localId], highlightMaterial);
          }
          
          // Set new selection
          setLocalId(result.localId);
          
          // Get element information
          const [data] = await model.getItemsData([result.localId], {
            attributesDefault: true,
          });
          setSelectedElement(data);
          console.log('Element selected:', data);

          // Update history panel ONLY if it's already open
          if (showHistoryPanel) {
            try {
              const spaceGuid = (data as any)?._guid?.value;
              if (spaceGuid && sensorData) {
                const associatedSensor = sensorData.find(s => s.spaceGuid === spaceGuid);
                if (associatedSensor) {
                  const historicalData = generateHistoricalData(associatedSensor);
                  setSelectedSensor(associatedSensor);
                  setSensorHistory(historicalData);
                  console.log('Updating history panel (click) for sensor:', associatedSensor.dispositiu);
                }
              }
            } catch (e) {
              console.warn('Could not update history panel on click:', e);
            }
          }
        } else {
          // Reset highlight if no element clicked
          const highlighter = highlighterRef.current;
          if (highlighter) {
            await highlighter.clear("select");
          } else if (localId !== null) {
            await model.resetHighlight([localId]);
          }
          setLocalId(null);
          setSelectedElement(null);
          // Optionally clear history when nothing is selected
          // setSelectedSensor(undefined as any);
        }
        
        await fragments.core.update(true);
      } catch (error) {
        console.error('Error in raycasting:', error);
      }
    };

    const handleDoubleClick = async (event: MouseEvent) => {
      event.preventDefault();
      
      if (!fragmentsRef.current || !worldRef.current) return;
      
      const fragments = fragmentsRef.current;
      const world = worldRef.current;
      const mouse = new THREE.Vector2();
      
      mouse.x = event.clientX;
      mouse.y = event.clientY;
      
      try {
        const model = fragments.list.get(code || '');
        if (!model) return;

        const result = await model.raycast({
          camera: world.camera.three as THREE.PerspectiveCamera,
          mouse,
          dom: world.renderer!.three.domElement!,
        });
        
        if (result) {
          // Seleccionar el elemento (como en el click normal)
          const highlighter = highlighterRef.current;
          if (highlighter) {
            await highlighter.clear("select");
            const modelIdMap: { [modelId: string]: Set<number> } = {};
            modelIdMap[code || ''] = new Set([result.localId]);
            await highlighter.highlightByID("select", modelIdMap, false);
          }
          
          setLocalId(result.localId);
          
          // Obtener información del elemento
          const [data] = await model.getItemsData([result.localId], {
            attributesDefault: true,
          });
          setSelectedElement(data);
          
          // Enfocar el elemento usando BoundingBoxer
          if (componentsRef.current) {
            const boxer = componentsRef.current.get(OBC.BoundingBoxer);
            if (boxer) {
              boxer.list.clear();
              const modelIdMap: OBC.ModelIdMap = { [code || '']: new Set([result.localId]) };
              await boxer.addFromModelIdMap(modelIdMap);
              const boundingBox = boxer.get();
              if (boundingBox && !boundingBox.isEmpty()) {
                const sphere = new THREE.Sphere();
                boundingBox.getBoundingSphere(sphere);
                if (world.camera?.controls) {
                  world.camera.controls.fitToSphere(sphere, true);
                  console.log('Focused on element:', result.localId);
                }
              }
              boxer.list.clear();
            }
          }
          
          // Buscar si este elemento tiene un sensor asociado
          const spaceGuid = (data as any)?._guid?.value;
          if (spaceGuid && sensorData) {
            const associatedSensor = sensorData.find(s => s.spaceGuid === spaceGuid);
            if (associatedSensor) {
              // Generar datos históricos
              const historicalData = generateHistoricalData(associatedSensor);
              
              // Configurar el panel histórico
              setSelectedSensor(associatedSensor);
              setSensorHistory(historicalData);
              setShowHistoryPanel(true);
              
              console.log('Opening history panel for sensor:', associatedSensor.dispositiu);
            }
          }
        }
      } catch (error) {
        console.error('Error in double click:', error);
      }
    };

    // Get the container element
    const container = document.querySelector('[data-model-viewer]') as HTMLElement;
    if (!container) return;

    container.addEventListener("click", handleClick);
    container.addEventListener("dblclick", handleDoubleClick);
    
    return () => {
      container.removeEventListener("click", handleClick);
      container.removeEventListener("dblclick", handleDoubleClick);
    };
  }, [code, localId, fragmentsRef, worldRef, highlighterRef, componentsRef, setLocalId, setSelectedElement, generateHistoricalData, setSelectedSensor, setSensorHistory, setShowHistoryPanel, showHistoryPanel, sensorData]);

  return {
    setupRaycasting,
  };
};
