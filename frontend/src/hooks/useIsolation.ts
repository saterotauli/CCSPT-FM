import { useCallback, useRef } from 'react';
import * as THREE from "three";
import * as OBC from "@thatopen/components";
import * as OBF from "@thatopen/components-front";

interface UseIsolationProps {
  code: string | undefined;
  fragmentsRef: React.MutableRefObject<OBC.FragmentsManager | null>;
  hiderRef: React.MutableRefObject<OBC.Hider | null>;
  highlighterRef: React.MutableRefObject<OBF.Highlighter | null>;
  worldRef: React.MutableRefObject<OBC.World | null>;
  componentsRef: React.MutableRefObject<OBC.Components | null>;
  sensorData: any[];
  setSelectedLevel: (level: string | null) => void;
  setSelectedDepartment: (department: string | null) => void;
  clearMarkers: () => void;
  restoreSceneMaterials: () => void;
}

export const useIsolation = ({
  code,
  fragmentsRef,
  hiderRef,
  highlighterRef,
  worldRef,
  componentsRef,
  sensorData,
  setSelectedLevel,
  setSelectedDepartment,
  clearMarkers,
  restoreSceneMaterials,
}: UseIsolationProps) => {
  const lastHiddenIdsRef = useRef<number[] | null>(null);
  const lastHiddenIdsSetRef = useRef<Set<number>>(new Set());
  const lastDeptIdsRef = useRef<number[] | null>(null);

  const isolateLevel = useCallback(async (level: string) => {
    try {
      if (!code || !fragmentsRef.current || !hiderRef.current) return;
      const fragments = fragmentsRef.current;
      const hider = hiderRef.current;
      const model = fragments.list.get(code) || Array.from(fragments.list.values())[0];
      if (!model) return;

      console.log(`Isolating level: ${level}`);

      // Clear previous hiding - aislar con mapa vacío para mostrar todos
      await hider.isolate({});

      // 1) Obtener GUIDs del backend por planta
      let guidsSet = new Set<string>();
      try {
        const resp = await fetch(`/api/ifcspace/departaments?edifici=${encodeURIComponent(code)}&planta=${encodeURIComponent(level)}`, { headers: { Accept: 'application/json' } });
        if (resp.ok) {
          const data = await resp.json();
          const items: Array<{ departament?: string; guids?: string[] }> = Array.isArray(data) ? data : [];
          for (const it of items) {
            if (Array.isArray(it.guids)) for (const g of it.guids) if (g) guidsSet.add(String(g));
          }
        }
      } catch {}
      
      // Fallback a GUIDs de sensores si el endpoint no devuelve guids
      if (guidsSet.size === 0 && sensorData) {
        const sensGuids = sensorData
          .filter((s: any) => s.edifici === code && s.planta === level && s.spaceGuid)
          .map((s: any) => String(s.spaceGuid));
        sensGuids.forEach(g => guidsSet.add(g));
      }

      console.log(`Found ${guidsSet.size} GUIDs for level ${level}`);

      // 2) Obtener todos los elementos IFCSPACE
      const categories = await (model as any).getItemsOfCategories([/IFCSPACE/i]);
      const spaceIds: number[] = (categories?.IFCSPACE || []) as number[];
      if (!spaceIds || spaceIds.length === 0) return;

      // 3) Mapear GUIDs a IDs locales
      let selectedLocalIds: number[] = [];
      try {
        const mappedGuids: string[] = await (model as any).getGuidsByLocalIds(spaceIds);
        if (Array.isArray(mappedGuids)) {
          for (let i = 0; i < spaceIds.length; i++) {
            const gid = mappedGuids[i];
            if (gid && guidsSet.has(String(gid))) {
              selectedLocalIds.push(spaceIds[i]);
            }
          }
        }
      } catch {
        console.error('Error mapping GUIDs to local IDs');
        return;
      }

      console.log(`Found ${selectedLocalIds.length} elements for level ${level}`);

      if (selectedLocalIds.length === 0) return;

      // 4) Usar el Hider para AISLAR elementos del nivel seleccionado (mostrar solo estos)
      console.log(`Isolating ${selectedLocalIds.length} elements from level ${level}`);

      // Aislar elementos del nivel seleccionado usando el Hider
      if (selectedLocalIds.length > 0) {
        const modelIdMap: { [modelId: string]: Set<number> } = {};
        modelIdMap[code] = new Set(selectedLocalIds);
        await hider.isolate(modelIdMap);
      }

      // Guardar IDs para el raycasting (elementos que NO están en el nivel seleccionado)
      const elementsToHide: number[] = [];
        for (const id of spaceIds) {
        if (!selectedLocalIds.includes(id)) {
          elementsToHide.push(id);
        }
      }
      lastHiddenIdsRef.current = elementsToHide;
      lastHiddenIdsSetRef.current = new Set(elementsToHide);

      // Actualizar la escena
      await fragments.core.update(true);
      
      // Centrar la cámara en los elementos del nivel seleccionado
      try {
        if (worldRef.current?.camera?.controls && componentsRef.current) {
          const boxer = componentsRef.current.get(OBC.BoundingBoxer);
          if (boxer) {
            boxer.list.clear();
            const modelIdMap: OBC.ModelIdMap = { [code]: new Set(selectedLocalIds) };
            await boxer.addFromModelIdMap(modelIdMap);
            const boundingBox = boxer.get();
            if (boundingBox && !boundingBox.isEmpty()) {
              const sphere = new THREE.Sphere();
              boundingBox.getBoundingSphere(sphere);
              worldRef.current.camera.controls.fitToSphere(sphere, true);
              console.log('Focused camera on level elements:', level);
            }
            boxer.list.clear();
          }
        }
      } catch (e) {
        console.error('Error centering camera on level:', e);
      }
      
      console.log(`Level ${level} isolated successfully`);

    } catch (e) {
      console.error('Error isolating level:', e);
    }
  }, [code, sensorData, fragmentsRef, hiderRef, worldRef, componentsRef]);

  const isolateDepartment = useCallback(async (level: string, department: string, departments: {[key: string]: any[]}) => {
    try {
      await isolateLevel(level);
      if (!code || !fragmentsRef.current) return;
      const fragments = fragmentsRef.current;
      const model = fragments.list.get(code) || Array.from(fragments.list.values())[0];
      if (!model) return;

      // Obtener guids del departamento desde el estado (si no, cargar)
      let deptGuids: string[] = [];
      const levelDepartments = departments[level];
      const target = Array.isArray(levelDepartments) ? levelDepartments.find((d: any) => d.departament === department) : null;
      if (target && Array.isArray(target.guids)) deptGuids = target.guids.map((g: any) => String(g));
      if (deptGuids.length === 0) {
        try {
          const resp = await fetch(`/api/ifcspace/departaments?edifici=${encodeURIComponent(code)}&planta=${encodeURIComponent(level)}`);
          if (resp.ok) {
            const data = await resp.json();
            const t = Array.isArray(data) ? data.find((d: any) => d.departament === department) : null;
            if (t && Array.isArray(t.guids)) deptGuids = t.guids.map((g: any) => String(g));
          }
        } catch {}
      }
      if (deptGuids.length === 0) return;

      // Mapear guids a ids locales de IFCSPACE
      const categories = await (model as any).getItemsOfCategories([/IFCSPACE/i]);
      const spaceIds: number[] = (categories?.IFCSPACE || []) as number[];
      if (!spaceIds || spaceIds.length === 0) return;
      const mappedGuids: string[] = await (model as any).getGuidsByLocalIds(spaceIds);
      const deptLocalIds: number[] = [];
      const deptSet = new Set(deptGuids);
      if (Array.isArray(mappedGuids)) {
        for (let i = 0; i < spaceIds.length; i++) {
          const gid = mappedGuids[i];
          if (gid && deptSet.has(String(gid))) deptLocalIds.push(spaceIds[i]);
        }
      }
      if (deptLocalIds.length === 0) return;

      // Colorear espacios del departamento en verde flojo
      const highlighter = highlighterRef.current;
      if (highlighter && deptLocalIds.length > 0) {
        // Crear estilo verde flojo para departamento
        highlighter.styles.set("department", {
          color: new THREE.Color("#90EE90"), // Verde flojo
          opacity: 1,
          transparent: true,
          renderedFaces: 0,
        });

        // Aplicar color verde a los espacios del departamento
        const modelIdMap: { [modelId: string]: Set<number> } = {};
        modelIdMap[code] = new Set(deptLocalIds);
        
        await highlighter.highlightByID("department", modelIdMap);
        console.log(`Applied department green highlight to ${deptLocalIds.length} spaces`);
      }

      try { await fragments.core.update(true); } catch {}
    } catch (e) {
      console.error('Error isolating department:', e);
    }
  }, [code, isolateLevel, fragmentsRef, highlighterRef]);

  const clearIsolation = useCallback(async () => {
    try {
      const fragments = fragmentsRef.current;
      const hider = hiderRef.current;
      if (!fragments) return;
      
      console.log('Clearing isolation');
      
      // Clear hider - aislar con mapa vacío para mostrar todos
      if (hider) {
        //await hider.isolate({});
        await hider.set(true);
      }
      
      // Clear all highlighter styles
      const highlighter = highlighterRef.current;
      if (highlighter) {
        try {
          await highlighter.clear("mitja");
          await highlighter.clear("alt");
          await highlighter.clear("select");
          await highlighter.clear("department");
        } catch {}
      }
      
      // Clear the hidden IDs set
      lastHiddenIdsRef.current = null;
      lastHiddenIdsSetRef.current.clear();
      lastDeptIdsRef.current = null;
      
      // Clear markers when showing all
      clearMarkers();
      
      restoreSceneMaterials();
      try { await fragments.core.update(true); } catch {}
      setSelectedLevel(null);
      setSelectedDepartment(null);
      
      console.log('Isolation cleared successfully');
      
      // Centrar cámara en ángulo al mostrar todo
      try {
        if (worldRef.current?.camera?.controls) {
          const boxer = componentsRef.current?.get(OBC.BoundingBoxer);
          if (boxer) {
            boxer.list.clear();
            boxer.addFromModels();
            const box = boxer.get();
            if (box && !box.isEmpty()) {
              const center = box.getCenter(new THREE.Vector3());
              const size = box.getSize(new THREE.Vector3());
              const maxDim = Math.max(size.x, size.z);
              
              // Vista desde arriba para "Mostrar tot"
              const cameraHeight = maxDim * 2;
              const cameraX = center.x;
              const cameraY = center.y + cameraHeight;
              const cameraZ = center.z;
              
              await worldRef.current.camera.controls.setLookAt(cameraX, cameraY, cameraZ, center.x, center.y, center.z);
            }
            boxer.list.clear();
          }
        }
      } catch (e) {
        console.error('Error centering camera on show all:', e);
      }
    } catch (e) {
      console.error('Error clearing isolation:', e);
    }
  }, [code, restoreSceneMaterials, clearMarkers, fragmentsRef, hiderRef, highlighterRef, worldRef, componentsRef, setSelectedLevel, setSelectedDepartment]);

  return {
    isolateLevel,
    isolateDepartment,
    clearIsolation,
    lastHiddenIdsRef,
    lastHiddenIdsSetRef,
    lastDeptIdsRef,
  };
};
