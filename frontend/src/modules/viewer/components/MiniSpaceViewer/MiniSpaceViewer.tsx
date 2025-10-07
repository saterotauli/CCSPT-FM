import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import * as OBC from '@thatopen/components';
import * as OBF from '@thatopen/components-front';
import ViewerRegistry from '../../utils/ViewerRegistry';
import { ALERT_COLORS } from '../../../../globals';

export type MiniSeverity = 'ok' | 'baix' | 'mitjà' | 'alt';

interface MiniSpaceViewerProps {
  buildingCode: string;
  spaceGuid?: string; // preferred if available
  severity: MiniSeverity;
  paramType?: 'temperatura' | 'humitat' | 'ppm';
  value?: number;
  dispositiu?: string;
  planta?: string;
  sensorData?: any[];
  departament?: string;
  // Optional supplier location hint like 'UDI-P02-004' to highlight supplier space
  supplierLocationHint?: string;
  // Optional supplier IFCSPACE GUID for exact origin positioning
  supplierGuid?: string;
  // Optional building code where supplier GUID lives (e.g., 'UDI')
  supplierBuildingCode?: string;
}

const MiniSpaceViewer: React.FC<MiniSpaceViewerProps> = ({ buildingCode, spaceGuid, severity, paramType, value, dispositiu, planta, sensorData, departament, supplierLocationHint, supplierGuid, supplierBuildingCode }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const componentsRef = useRef<OBC.Components | null>(null);
  // Removed overlay label; using only 3D marker like ControlModelViewer
  const scopeRef = useRef<string>(`mini-scope-${Math.random().toString(36).slice(2)}`);
  const createdMarkerOnceRef = useRef<boolean>(false);
  // Store original material states to restore on dispose
  const originalMaterialsRef = useRef<Map<any, { color: number; transparent: boolean; opacity: number; hasColor: boolean }>>(new Map());
  // Explicitly mark as intentionally unused in this component
  void paramType; void value; void scopeRef;

  useEffect(() => {
    let disposed = false;
    let componentsInstance: any = null;
    // Hoisted refs for cleanup
    let ro: ResizeObserver | null = null;
    let onResize: (() => Promise<void>) | null = null;

    const run = async () => {
      if (!containerRef.current) return;
      const container = containerRef.current;
      container.innerHTML = '';
      console.debug('[MiniSpaceViewer] init', { buildingCode, supplierBuildingCode, spaceGuid, supplierGuid, severity });

      // Try to get buffer from registry, else fetch from public models
      let buffer = ViewerRegistry.getModelBuffer(buildingCode);
      console.debug('[MiniSpaceViewer] buffer in registry?', !!buffer);
      if (!buffer) {
        let modelPath = '';
        switch (buildingCode) {
          case 'ALB': modelPath = '/models/Rooms/CCSPT-ALB-M3D-Rooms.frag'; break;
          case 'CQA': modelPath = '/models/Rooms/CCSPT-CQA-M3D-Rooms.frag'; break;
          case 'MAP': modelPath = '/models/CCSPT-MAP-M3D-AS.frag'; break;
          case 'MIN': modelPath = '/models/CCSPT-MIN-M3D-AS.frag'; break;
          case 'RAC': modelPath = '/models/CCSPT-RAC-M3D-AS.frag'; break;
          case 'SAL': modelPath = '/models/Rooms/CCSPT-SAL-M3D-Rooms.frag'; break;
          case 'TAU': modelPath = '/models/Rooms/CCSPT-TAU-M3D-Rooms.frag'; break;
          case 'TOC': modelPath = '/models/CCSPT-TOC-M3D-AS.frag'; break;
          case 'UDI': modelPath = '/models/Rooms/CCSPT-UDI-M3D-Rooms.frag'; break;
          case 'VEU': modelPath = '/models/Rooms/CCSPT-VEU-M3D-Rooms.frag'; break;
          case 'VII': modelPath = '/models/CCSPT-VII-M3D-AS.frag'; break;
          default: modelPath = '/models/Rooms/CCSPT-ALB-M3D-Rooms.frag';
        }
        try {
          // Add timeout to prevent hanging requests
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
          
          const res = await fetch(modelPath, { signal: controller.signal });
          clearTimeout(timeoutId);
          
          if (res.ok) {
            buffer = await res.arrayBuffer();
            console.debug('[MiniSpaceViewer] fetched buffer from', modelPath);
          } else {
            console.warn('[MiniSpaceViewer] failed to fetch model', res.status, modelPath);
          }
        } catch (e) {
          console.warn('[MiniSpaceViewer] model fetch error', e, modelPath);
        }
      }

      if (!buffer) {
        const info = document.createElement('div');
        info.style.cssText = 'padding:10px;color:#94a3b8;font-size:13px;text-align:center;background:#0f172a;height:100%;display:flex;align-items:center;justify-content:center;border-radius:10px;';
        info.textContent = 'No s\'ha pogut carregar el model';
        container.appendChild(info);
        return;
      }

      // Setup components/world only after we know we can render
      const components = new OBC.Components();
      componentsRef.current = components;
      componentsInstance = components;
      const worlds = components.get(OBC.Worlds);
      const world = worlds.create<
        OBC.SimpleScene,
        OBC.OrthoPerspectiveCamera,
        OBF.PostproductionRenderer
      >();
      world.scene = new OBC.SimpleScene(components);
      world.scene.setup();
      world.scene.three.background = new THREE.Color(0x1a1d23);
      world.renderer = new OBF.PostproductionRenderer(components, container);
      world.camera = new OBC.OrthoPerspectiveCamera(components);
      components.init();
      components.get(OBC.Raycasters).get(world);
      // Ensure proper renderer size and pixel ratio before first render
      const rect = container.getBoundingClientRect();
      if (world.renderer) {
        try {
          (world.renderer.three as any).setPixelRatio?.(Math.min(window.devicePixelRatio || 1, 2));
          (world.renderer.three as any).setSize(rect.width, rect.height);
        } catch {}
      }
      // Configure camera clipping planes and FOV like Control Viewer
      try {
        if (world.camera?.three instanceof THREE.PerspectiveCamera) {
          world.camera.three.near = 0.1;
          world.camera.three.far = 1_000_000;
          // 60º FOV para consistencia
          (world.camera.three as THREE.PerspectiveCamera).fov = 60;
          // Aspecto correcto desde el inicio
          const aspect = rect.height > 0 ? rect.width / rect.height : 1;
          world.camera.three.aspect = aspect;
          world.camera.three.updateProjectionMatrix();
        } else if ((world.camera?.three as any)?.isOrthographicCamera) {
          // Para ortográfica, asegura bounds razonables respecto al contenedor
          const w = Math.max(1, rect.width);
          const h = Math.max(1, rect.height);
          const cam: any = world.camera.three;
          cam.left = -w / 2; cam.right = w / 2; cam.top = h / 2; cam.bottom = -h / 2;
          cam.near = 0.1; cam.far = 1_000_000; cam.updateProjectionMatrix();
        }
      } catch {}

      // Fragments
      const fragments = components.get(OBC.FragmentsManager);
      let workerUrl = ViewerRegistry.getWorkerUrl();
      if (!workerUrl) {
        // fallback fetch worker
        const gUrl = 'https://thatopen.github.io/engine_fragment/resources/worker.mjs';
        const fetched = await fetch(gUrl);
        const blob = await fetched.blob();
        const file = new File([blob], 'worker.mjs', { type: 'text/javascript' });
        workerUrl = URL.createObjectURL(file);
      }
      await fragments.init(workerUrl);

      await fragments.core.load(buffer, { modelId: buildingCode });
      const model = fragments.list.get(buildingCode);
      if (!model) return;
      console.debug('[MiniSpaceViewer] model loaded and attached');
      if (world.camera?.three) model.useCamera(world.camera.three);
      world.scene.three.add(model.object);
      await fragments.core.update(true);

      // If supplier is in a different building, load that secondary model too (rooms variant)
      if (supplierBuildingCode && supplierBuildingCode !== buildingCode) {
        try {
          let other = fragments.list.get(supplierBuildingCode);
          if (!other) {
            let otherPath = '';
            switch (supplierBuildingCode) {
              case 'ALB': otherPath = '/models/Rooms/CCSPT-ALB-M3D-Rooms.frag'; break;
              case 'CQA': otherPath = '/models/Rooms/CCSPT-CQA-M3D-Rooms.frag'; break;
              case 'TAU': otherPath = '/models/Rooms/CCSPT-TAU-M3D-Rooms.frag'; break;
              case 'UDI': otherPath = '/models/Rooms/CCSPT-UDI-M3D-Rooms.frag'; break;
              default: otherPath = `/models/Rooms/CCSPT-${supplierBuildingCode}-M3D-Rooms.frag`; break;
            }
            // Add timeout for secondary model loading
            const controller2 = new AbortController();
            const timeoutId2 = setTimeout(() => controller2.abort(), 8000); // 8 second timeout
            
            const res2 = await fetch(otherPath, { signal: controller2.signal });
            clearTimeout(timeoutId2);
            
            if (!res2.ok) {
              console.warn('[MiniSpaceViewer] failed to fetch secondary model', res2.status, otherPath);
              return;
            }
            
            const buf2 = await res2.arrayBuffer();
            await fragments.core.load(buf2, { modelId: supplierBuildingCode });
            other = fragments.list.get(supplierBuildingCode);
            if (other && world.camera?.three) other.useCamera(world.camera.three);
            if (other) world.scene.three.add(other.object);
            try { await fragments.core.update(true); } catch {}
            console.debug('[MiniSpaceViewer] secondary model loaded', supplierBuildingCode);
          }
        } catch (e) { console.debug('[MiniSpaceViewer] failed to load secondary model', supplierBuildingCode, e); }
      }
      try {
        const pp = (world.renderer as any)?.postproduction;
        if (pp) { pp.enabled = true; }
        const highlighter = components.get(OBF.Highlighter);
        try { (highlighter as any).postproduction.enabled = true; } catch {}
      } catch {}

      // Highlighter styles similar to ModelViewer
      const highlighter = components.get(OBF.Highlighter);
      // Colors: select = golden, peers = very light green
      highlighter.setup({ world, selectMaterialDefinition: { color: new THREE.Color('#facc15'), opacity: 1, transparent: false, renderedFaces: 0 } });
      highlighter.styles.set('select', { color: new THREE.Color('#facc15'), opacity: 1, transparent: false, renderedFaces: 0 });
      highlighter.styles.set('mitja', { color: new THREE.Color(ALERT_COLORS.MITJA), opacity: 1, transparent: false, renderedFaces: 0 });
      highlighter.styles.set('alt', { color: new THREE.Color(ALERT_COLORS.ALT), opacity: 1, transparent: false, renderedFaces: 0 });
      highlighter.styles.set('peers', { color: new THREE.Color('#bbf7d0'), opacity: 1, transparent: false, renderedFaces: 0 });
      const hider = components.get(OBC.Hider);

      // Apply ghost mode baseline when used as Sistemes mini-viewer
      // Criterion: if supplierLocationHint is provided OR departament is undefined (systems view), ghost non-highlighted by making base materials transparent
      try {
        const shouldGhost = Boolean(supplierLocationHint) || (!departament && !planta);
        if (shouldGhost) {
          const materials = [...(fragments as any).core.models.materials.list.values()];
          for (const material of materials) {
            if (material?.userData?.customId) continue; // skip highlighter materials
            // Save original
            const hasColor = 'color' in material;
            const currentHex = hasColor ? material.color.getHex() : material.lodColor.getHex();
            originalMaterialsRef.current.set(material, { color: currentHex, transparent: material.transparent, opacity: material.opacity, hasColor });
            // Set ghost
            material.transparent = true;
            material.opacity = 0.08;
            try { material.depthWrite = false; } catch {}
            if (hasColor) material.color.setColorName('white'); else material.lodColor.setColorName('white');
            material.needsUpdate = true;
          }
          try { await fragments.core.update(true); } catch {}
          console.debug('[MiniSpaceViewer] ghost baseline applied');
        }
      } catch (e) {
        console.debug('[MiniSpaceViewer] failed to apply ghost baseline', e);
      }

      // Disable picking/selection only via raycaster (keep highlighter enabled so styles render)
      try {
        const raycasters = components.get(OBC.Raycasters);
        const caster = raycasters.get(world);
        if (caster) { (caster as any).enabled = false; }
      } catch {}

      // Locate IFCSPACE by GUID
      let localId: number | null = null;
      let supplierLocalId: number | null = null;
      try {
        if (spaceGuid) {
          try {
            const idMap = await (fragments as any).guidsToModelIdMap(new Set([String(spaceGuid)]));
            const set = idMap?.[buildingCode] as Set<number> | number[] | undefined;
            if (set) {
              const arr = Array.isArray(set) ? set : Array.from(set as Set<number>);
              if (arr.length > 0) localId = arr[0];
            }
          } catch {}
        }
        // Resolve supplier by GUID first if provided
        if (supplierGuid) {
          try {
            const m = await (fragments as any).guidsToModelIdMap(new Set([String(supplierGuid)]));
            const key = supplierBuildingCode || buildingCode;
            const set = m?.[key] as Set<number> | number[] | undefined;
            if (set) {
              const arr = Array.isArray(set) ? set : Array.from(set as Set<number>);
              if (arr.length > 0) supplierLocalId = arr[0];
            }
          } catch {}
        }

        if (localId == null || (supplierLocationHint && supplierLocalId == null)) {
          // Fallback manual mapping for main building
          if (localId == null) {
            const categories = await (model as any).getItemsOfCategories([/IFCSPACE/i]);
            const spaceIds: number[] = (categories?.IFCSPACE || []) as number[];
            if (spaceIds && spaceIds.length > 0 && spaceGuid) {
              const guids: string[] = await (model as any).getGuidsByLocalIds(spaceIds);
              if (Array.isArray(guids)) {
                for (let i = 0; i < guids.length; i++) {
                  if (String(guids[i]).toUpperCase() === String(spaceGuid).toUpperCase()) { localId = spaceIds[i]; break; }
                }
              }
            }
          }
          
          // Fallback manual mapping for supplier in appropriate model
          if (supplierLocationHint && supplierLocalId == null) {
            try {
              const supplierModel = supplierBuildingCode ? fragments.list.get(supplierBuildingCode) : model;
              if (supplierModel) {
                const categories = await (supplierModel as any).getItemsOfCategories([/IFCSPACE/i]);
                const spaceIds: number[] = (categories?.IFCSPACE || []) as number[];
                if (spaceIds && spaceIds.length > 0) {
                  const parts = String(supplierLocationHint).split('-');
                  const roomCode = parts[2] || parts[parts.length - 1] || '';
                  // Read items data to match by Name includes roomCode
                  const itemsData = await (supplierModel as any).getItemsData(spaceIds, { attributesDefault: true });
                  for (let i = 0; i < itemsData.length; i++) {
                    const d = itemsData[i];
                    const name = String(d?.Name?.value ?? d?.Name ?? '').toUpperCase();
                    if (roomCode && name.includes(String(roomCode).toUpperCase())) { supplierLocalId = spaceIds[i]; break; }
                  }
                  // If still not found, pick first space as a visible fallback
                  if (supplierLocalId == null && spaceIds.length) {
                    supplierLocalId = spaceIds[0];
                  }
                }
              }
            } catch (e) {
              console.debug('[MiniSpaceViewer] error in supplier fallback mapping', e);
            }
          }
        }
      } catch (e) {
        console.debug('[MiniSpaceViewer] error mapping GUID to localId', e);
      }

      // Optionally isolate floor like ModelViewer using Hider + GUID mapping
      let levelLocalIds: number[] = [];
      try {
        if (planta) {
          console.debug('[MiniSpaceViewer] isolating level', planta);
          // Clear any previous isolation
          await hider.isolate({});
          const model = fragments.list.get(buildingCode);
          if (model) {
            // Fetch GUIDs for the level from backend
            let guidsSet = new Set<string>();
            try {
              const resp = await fetch(`/api/ifcspace/departaments?edifici=${encodeURIComponent(buildingCode)}&planta=${encodeURIComponent(planta)}`, { headers: { Accept: 'application/json' } });
              if (resp.ok) {
                const data = await resp.json();
                const items: Array<{ departament?: string; guids?: string[] }> = Array.isArray(data) ? data : [];
                for (const it of items) if (Array.isArray(it.guids)) it.guids.forEach((g: any) => g && guidsSet.add(String(g)));
              }
            } catch {}

            // Fallback to sensorData GUIDs if backend empty
            if (guidsSet.size === 0 && Array.isArray(sensorData)) {
              const sensGuids = sensorData
                .filter((s: any) => s.edifici === buildingCode && s.planta === planta && s.spaceGuid)
                .map((s: any) => String(s.spaceGuid));
              sensGuids.forEach(g => guidsSet.add(g));
            }

            console.debug('[MiniSpaceViewer] found GUIDs for level', guidsSet.size);

            // Map GUIDs to local IDs
            const categories = await (model as any).getItemsOfCategories([/IFCSPACE/i]);
            const spaceIds: number[] = (categories?.IFCSPACE || []) as number[];
            if (spaceIds && spaceIds.length && guidsSet.size > 0) {
              const mappedGuids: string[] = await (model as any).getGuidsByLocalIds(spaceIds);
              if (Array.isArray(mappedGuids)) {
                for (let i = 0; i < spaceIds.length; i++) {
                  const gid = mappedGuids[i];
                  if (gid && guidsSet.has(String(gid))) levelLocalIds.push(spaceIds[i]);
                }
              }
            }

            console.debug('[MiniSpaceViewer] mapped to localIds', levelLocalIds.length);

            if (levelLocalIds.length) {
              const modelIdMap: { [modelId: string]: Set<number> } = {};
              modelIdMap[buildingCode] = new Set(levelLocalIds);
              await hider.isolate(modelIdMap);
              console.debug('[MiniSpaceViewer] isolated level with', levelLocalIds.length, 'elements');
            }
          }
        }
      } catch (e) {
        console.debug('[MiniSpaceViewer] error isolating level', e);
      }

      // Frame selection
      const boxer = components.get(OBC.BoundingBoxer);
      boxer.list.clear();
      if (levelLocalIds.length > 0) {
        // Focus on entire level if isolated
        const map: OBC.ModelIdMap = { [buildingCode]: new Set(levelLocalIds) };
        await boxer.addFromModelIdMap(map);
      } else {
        // No level isolation requested (e.g., Sistemes): show whole building
        boxer.addFromModels();
      }
      const box = boxer.get();
      if (box && !box.isEmpty()) {
        const sphere = new THREE.Sphere();
        box.getBoundingSphere(sphere);
        if (world.camera?.controls) {
          world.camera.controls.fitToSphere(sphere, true);
          // add slight azimuth/elevation offset to avoid straight top-down
          try { (world.camera.controls as any).dolly(0); (world.camera.controls as any).rotate(0.2, 0.2); } catch {}
        }
      }
      boxer.list.clear();

      // Prepare selected map(s) for later (will apply after peers to stand out)
      let selectedMap: { [k: string]: Set<number> } | null = null;
      let supplierMap: { [k: string]: Set<number> } | null = null;
      let selectedStyle: string = 'alt'; // always red for the selected space
      if (localId != null) {
        selectedMap = { [buildingCode]: new Set([localId]) };
        selectedStyle = 'alt';
      }
      if (supplierLocalId != null) {
        const key = supplierBuildingCode || buildingCode;
        supplierMap = { [key]: new Set([supplierLocalId]) };
      }

      // Highlight peers (all spaces of the same department) using backend GUIDs
      try {
        if (departament && planta && buildingCode) {
          const resp = await fetch(`/api/ifcspace/departaments?edifici=${encodeURIComponent(buildingCode)}&planta=${encodeURIComponent(planta)}`, { headers: { Accept: 'application/json' } });
          if (resp.ok) {
            const data = await resp.json();
            const items: Array<any> = Array.isArray(data) ? data : [];
            const target = String(departament).trim().toLowerCase();
            const dept = items.find((it: any) => {
              const name = String(it?.departament ?? it?.Departament ?? '').trim().toLowerCase();
              return name === target;
            });
            let peerGuids: string[] = Array.isArray(dept?.guids) ? (dept!.guids as string[]) : [];
            // Fallback with sensorData if backend does not include the department item or is empty
            if ((!peerGuids || peerGuids.length === 0) && Array.isArray(sensorData)) {
              peerGuids = sensorData
                .filter((s: any) => s && s.edifici === buildingCode && s.planta === planta && s.departament === departament && s.spaceGuid)
                .map((s: any) => String(s.spaceGuid));
            }
            if (peerGuids.length) {
              const model = fragments.list.get(buildingCode);
              if (model) {
                const categories = await (model as any).getItemsOfCategories([/IFCSPACE/i]);
                const spaceIds: number[] = (categories?.IFCSPACE || []) as number[];
                if (spaceIds?.length) {
                  const mappedGuids: string[] = await (model as any).getGuidsByLocalIds(spaceIds);
                  const peerLocalIds: number[] = [];
                  const set = new Set(peerGuids.map(String));
                  for (let i = 0; i < spaceIds.length; i++) {
                    const gid = mappedGuids[i];
                    if (gid && set.has(String(gid))) peerLocalIds.push(spaceIds[i]);
                  }
                  if (peerLocalIds.length) {
                    const m: { [k: string]: Set<number> } = { [buildingCode]: new Set(peerLocalIds) };
                    await highlighter.highlightByID('peers', m as any, false);
                    try { await fragments.core.update(true); } catch {}
                    console.debug('[MiniSpaceViewer] peers highlighted', peerLocalIds.length);
                    // If there is no explicit selected space, pick the first peer as selected
                    if (!selectedMap && peerLocalIds.length) {
                      selectedMap = { [buildingCode]: new Set([peerLocalIds[0]]) };
                    }
                  }
                }
              }
            }
          }
        }
      } catch {}


      // Ensure no 3D markers are present in mini viewer
      try { const marker = components.get(OBF.Marker); marker.list.clear(); } catch {}
      try { document.querySelectorAll('[data-marker]').forEach(el => el.remove()); } catch {}

      // Finally, apply selected highlight(s) over peers so it stands out (golden) and create marker
      if (selectedMap) {
        await highlighter.highlightByID(selectedStyle, selectedMap, false);
        try { await fragments.core.update(true); } catch {}
        console.debug('[MiniSpaceViewer] selected highlighted after peers');
      }
      if (supplierMap) {
        // Use same red style for supplier in Sistemes scenario
        await highlighter.highlightByID('alt', supplierMap as any, false);
        try { await fragments.core.update(true); } catch {}
        console.debug('[MiniSpaceViewer] supplier highlighted');
      }

      // Render loop
      const render = () => {
        if (disposed) return;
        try { fragments.core.update(true); } catch {}
        if (world.renderer) world.renderer.three.render(world.scene.three, world.camera.three);
        requestAnimationFrame(render);
      };
      render();

      // Resize handler (use container ResizeObserver for first layout too)
      onResize = async () => {
        if (!world.renderer || !world.camera) return;
        const r = container.getBoundingClientRect();
        try { (world.renderer.three as any).setSize(r.width, r.height); } catch {}
        if (world.camera.three instanceof THREE.PerspectiveCamera) {
          world.camera.three.aspect = r.width / Math.max(1, r.height);
          world.camera.three.updateProjectionMatrix();
        }
        // Keep mini viewer clean of markers after resize too
        try { const marker = components.get(OBF.Marker); marker.list.clear(); } catch {}
        try { document.querySelectorAll('[data-marker]').forEach(el => el.remove()); } catch {}
      };
      window.addEventListener('resize', onResize);
      try {
        ro = new ResizeObserver(() => { onResize && onResize(); });
        ro.observe(container);
      } catch {}
      // Ensure one immediate sizing after DOM paint
      if (onResize) await onResize();
    };

    run();

    return () => {
      // Remove listeners/observers
      try { if (onResize) window.removeEventListener('resize', onResize); } catch {}
      try { ro?.disconnect(); } catch {}
      createdMarkerOnceRef.current = false;
      // Restore materials if ghost baseline was applied
      try {
        if (originalMaterialsRef.current.size) {
          for (const [material, data] of originalMaterialsRef.current) {
            material.transparent = data.transparent;
            material.opacity = data.opacity;
            try { material.depthWrite = true; } catch {}
            if (data.hasColor) material.color.setHex(data.color); else material.lodColor.setHex(data.color);
            material.needsUpdate = true;
          }
          originalMaterialsRef.current.clear();
        }
      } catch {}
      try {
        const marker = componentsRef.current?.get?.(OBF.Marker);
        marker?.list.clear();
      } catch {}
      // Improved cleanup using componentsInstance
      if (componentsInstance) {
        try {
          // Clear highlights first
          const highlighter = componentsInstance.get(OBF.Highlighter);
          if (highlighter) highlighter.clear();
          
          // Dispose components properly
          componentsInstance.dispose();
          console.debug('[MiniSpaceViewer] components disposed');
        } catch (e) {
          console.debug('[MiniSpaceViewer] disposal error', e);
        }
      }
      
      try { componentsRef.current?.dispose(); } catch {}
      try { window.dispatchEvent(new Event('resize')); } catch {}
      try {
        // Also remove any stray markers from DOM
        document.querySelectorAll('[data-marker]').forEach(el => {
          try { el.parentElement?.removeChild(el as HTMLElement); } catch {}
        });
      } catch {}
    };
  }, [buildingCode, spaceGuid, severity, planta, departament, dispositiu, supplierLocationHint, supplierGuid, supplierBuildingCode]);

  return (
    <div ref={containerRef} style={{ width: '100%', aspectRatio: '1 / 1', minHeight: 360, borderRadius: 12, overflow: 'hidden' }} />
  );
};

export default MiniSpaceViewer;
