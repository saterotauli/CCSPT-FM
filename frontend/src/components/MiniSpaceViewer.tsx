import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import * as OBC from '@thatopen/components';
import * as OBF from '@thatopen/components-front';
import ViewerRegistry from '../viewer/ViewerRegistry';

export type MiniSeverity = 'ok' | 'mitjà' | 'alt';

interface MiniSpaceViewerProps {
  buildingCode: string;
  spaceGuid?: string; // preferred if available
  severity: MiniSeverity;
  paramType?: 'temperatura' | 'humitat' | 'ppm';
  value?: number;
  dispositiu?: string;
  planta?: string;
  sensorData?: any[];
}

const MiniSpaceViewer: React.FC<MiniSpaceViewerProps> = ({ buildingCode, spaceGuid, severity, paramType, value, dispositiu, planta, sensorData }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const componentsRef = useRef<OBC.Components | null>(null);

  useEffect(() => {
    let disposed = false;

    const run = async () => {
      if (!containerRef.current) return;
      const container = containerRef.current;
      container.innerHTML = '';
      console.debug('[MiniSpaceViewer] init', { buildingCode, spaceGuid, severity });

      // Try to get buffer from registry, else fetch from public models
      let buffer = ViewerRegistry.getModelBuffer(buildingCode);
      console.debug('[MiniSpaceViewer] buffer in registry?', !!buffer);
      if (!buffer) {
        let modelPath = '';
        switch (buildingCode) {
          case 'ALB': modelPath = '/models/CCSPT-ALB-M3D-Rooms.frag'; break;
          case 'CQA': modelPath = '/models/CCSPT-CQA-M3D-Rooms.frag'; break;
          case 'MAP': modelPath = '/models/CCSPT-MAP-M3D-AS.frag'; break;
          case 'MIN': modelPath = '/models/CCSPT-MIN-M3D-AS.frag'; break;
          case 'RAC': modelPath = '/models/CCSPT-RAC-M3D-AS.frag'; break;
          case 'SAL': modelPath = '/models/CCSPT-SAL-M3D-Rooms.frag'; break;
          case 'TAU': modelPath = '/models/CCSPT-TAU-M3D-Rooms.frag'; break;
          case 'TOC': modelPath = '/models/CCSPT-TOC-M3D-AS.frag'; break;
          case 'UDI': modelPath = '/models/CCSPT-UDI-M3D-Rooms.frag'; break;
          case 'VEU': modelPath = '/models/CCSPT-VEU-M3D-Rooms.frag'; break;
          case 'VII': modelPath = '/models/CCSPT-VII-M3D-AS.frag'; break;
          default: modelPath = '/models/CCSPT-ALB-M3D-Rooms.frag';
        }
        try {
          const res = await fetch(modelPath);
          if (res.ok) {
            buffer = await res.arrayBuffer();
            console.debug('[MiniSpaceViewer] fetched buffer from', modelPath);
          }
        } catch {}
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
      // Ensure proper size
      const rect = container.getBoundingClientRect();
      if (world.renderer) {
        try { (world.renderer.three as any).setSize(rect.width, rect.height); } catch {}
      }

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

      // Highlighter styles similar to ModelViewer
      const highlighter = components.get(OBF.Highlighter);
      highlighter.setup({ world, selectMaterialDefinition: { color: new THREE.Color('#bcf124'), opacity: 1, transparent: false, renderedFaces: 0 } });
      highlighter.styles.set('mitja', { color: new THREE.Color('#ffd073'), opacity: 1, transparent: false, renderedFaces: 0 });
      highlighter.styles.set('alt', { color: new THREE.Color('#ff7873'), opacity: 1, transparent: false, renderedFaces: 0 });
      const hider = components.get(OBC.Hider);

      // Locate IFCSPACE by GUID
      let localId: number | null = null;
      try {
        // get all spaces
        const categories = await (model as any).getItemsOfCategories([/IFCSPACE/i]);
        const spaceIds: number[] = (categories?.IFCSPACE || []) as number[];
        if (spaceIds && spaceIds.length > 0) {
          const guids: string[] = await (model as any).getGuidsByLocalIds(spaceIds);
          if (Array.isArray(guids) && spaceGuid) {
            for (let i = 0; i < guids.length; i++) {
              if (guids[i] === spaceGuid) { localId = spaceIds[i]; break; }
            }
          }
        }
      } catch (e) {
        console.debug('[MiniSpaceViewer] error mapping GUID to localId', e);
      }

      // Isolate floor exactly like ModelViewer using Hider + GUID mapping
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

      // Frame selection - focus on entire level, not just selected space
      const boxer = components.get(OBC.BoundingBoxer);
      boxer.list.clear();
      if (levelLocalIds.length > 0) {
        // Focus on entire level
        const map: OBC.ModelIdMap = { [buildingCode]: new Set(levelLocalIds) };
        await boxer.addFromModelIdMap(map);
      } else if (localId != null) {
        // Fallback to selected space only
        const map: OBC.ModelIdMap = { [buildingCode]: new Set([localId]) };
        await boxer.addFromModelIdMap(map);
      } else {
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

      // Apply highlight if we got the element
      if (localId != null) {
        const map: { [k: string]: Set<number> } = { [buildingCode]: new Set([localId]) };
        const styleName = severity === 'alt' ? 'alt' : severity === 'mitjà' ? 'mitja' : 'select';
        await highlighter.highlightByID(styleName, map, false);
        console.debug('[MiniSpaceViewer] highlighted element', localId, styleName);
      }


      // Create a small badge label above the space
      try {
        const marker = components.get(OBF.Marker);
        // clear any previous labels to avoid duplication
        try { marker.list.clear(); } catch {}
        const boxer3 = components.get(OBC.BoundingBoxer);
        boxer3.list.clear();
        if (localId != null) {
          const map3: OBC.ModelIdMap = { [buildingCode]: new Set([localId]) };
          await boxer3.addFromModelIdMap(map3);
        } else {
          boxer3.addFromModels();
        }
        const bbox = boxer3.get();
        if (bbox && !bbox.isEmpty()) {
          const center = bbox.getCenter(new THREE.Vector3());
          const size = bbox.getSize(new THREE.Vector3());
          const y = bbox.max.y + Math.max(0.5, 0.2 * size.y);
          const position = new THREE.Vector3(center.x, y, center.z);
          const el = document.createElement('div');
          el.style.cssText = 'background:#fff2d8;color:#a16207;border:1px solid #f1c169;border-radius:14px;padding:4px 8px;font-weight:700;font-size:12px;box-shadow:0 2px 8px rgba(0,0,0,0.12)';
          const unit = paramType === 'ppm' ? 'ppm' : paramType === 'temperatura' ? '°C' : paramType === 'humitat' ? '%' : '';
          const text = `${dispositiu || ''} ${value != null ? ` ${value}${unit}` : ''}`.trim();
          el.textContent = text || '—';
          // Signature based on BuildingLoader.ts: marker.create(world, element, position)
          marker.create((world as unknown) as any, el as unknown as HTMLElement, position);
        }
        boxer3.list.clear();
      } catch {}

      // Basic render loop
      const render = () => {
        if (disposed) return;
        try { fragments.core.update(true); } catch {}
        if (world.renderer) world.renderer.three.render(world.scene.three, world.camera.three);
        requestAnimationFrame(render);
      };
      render();

      // Resize handler
      const onResize = () => {
        if (!world.renderer || !world.camera) return;
        const r = container.getBoundingClientRect();
        try { (world.renderer.three as any).setSize(r.width, r.height); } catch {}
        if (world.camera.three instanceof THREE.PerspectiveCamera) {
          world.camera.three.aspect = r.width / Math.max(1, r.height);
          world.camera.three.updateProjectionMatrix();
        }
      };
      window.addEventListener('resize', onResize);
      onResize();
    };

    run();

    return () => {
      disposed = true;
      try {
        const marker = componentsRef.current?.get?.(OBF.Marker);
        marker?.list.clear();
      } catch {}
      try { componentsRef.current?.dispose(); } catch {}
      try { window.dispatchEvent(new Event('resize')); } catch {}
    };
  }, [buildingCode, spaceGuid, severity]);

  return (
    <div ref={containerRef} style={{ width: '100%', aspectRatio: '1 / 1', minHeight: 360, borderRadius: 12, overflow: 'hidden' }} />
  );
};

export default MiniSpaceViewer;
