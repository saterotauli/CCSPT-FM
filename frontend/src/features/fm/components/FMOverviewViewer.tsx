import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import * as OBC from '@thatopen/components';
import * as OBF from '@thatopen/components-front';
import * as BUI from '@thatopen/ui';

/**
 * FMOverviewViewer (migrated to features)
 * - Dedicated, self-contained viewer for FM landing page
 * - Loads only the campus MAP model (CCSPT-MAP-M3D-AS.frag)
 */
const FMOverviewViewer: React.FC = () => {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const componentsRef = useRef<OBC.Components | null>(null);
  const worldRef = useRef<OBC.World | null>(null);

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
      const world = worlds.create<OBC.SimpleScene, OBC.OrthoPerspectiveCamera, OBF.PostproductionRenderer>();
      worldRef.current = world;

      world.name = 'FM-Overview';
      world.scene = new OBC.SimpleScene(components);
      world.scene.setup();
      world.scene.three.background = new THREE.Color(0x1a1d23);

      world.renderer = new OBF.PostproductionRenderer(components, viewportDiv);
      world.camera = new OBC.OrthoPerspectiveCamera(components);
      world.camera.threePersp.near = 0.1;
      world.camera.threePersp.far = 1_000_000;
      world.camera.threePersp.updateProjectionMatrix();
      try { world.camera.threeOrtho.near = -1_000_000; world.camera.threeOrtho.far = 1_000_000; world.camera.threeOrtho.updateProjectionMatrix(); } catch {}
      try { (world.camera.controls as any).maxDistance = 500_000; } catch {}

      components.init();

      const { postproduction } = world.renderer;
      postproduction.enabled = true;
      postproduction.style = OBF.PostproductionAspect.COLOR_SHADOWS;
      world.renderer.postproduction.edgesPass.color = new THREE.Color(0x494b50);

      const fragments = components.get(OBC.FragmentsManager);
      try {
        fragments.init('/node_modules/@thatopen/fragments/dist/Worker/worker.mjs');
      } catch (e) {
        console.warn('[FMOverview] Worker init failed, continuing without worker:', e);
      }

      fragments.core.models.materials.list.onItemSet.add(({ value: material }) => {
        const isLod = 'isLodMaterial' in (material as any) && (material as any).isLodMaterial;
        if (isLod) world.renderer!.postproduction.basePass.isolatedMaterials.push(material as any);
      });

      const attachModel = async (model: any) => {
        try { model.useCamera(world.camera.three); } catch {}
        try { world.scene.three.add(model.object); } catch {}
        try { await fragments.core.update(true); } catch {}
      };
      fragments.list.onItemSet.add(async ({ value: model }) => { await attachModel(model); });

      world.camera.projection.onChanged.add(() => {
        for (const [, model] of fragments.list) model.useCamera(world.camera.three);
      });
      world.camera.controls.addEventListener('rest', () => { fragments.core.update(true); });

      const handleFocusAsset = async (event: CustomEvent) => {
        const { guid, name } = event.detail;
        try {
          const highlighter = components.get(OBF.Highlighter);
          const marker = components.get(OBF.Marker);
          marker.list.clear();
          for (const [styleName] of highlighter.styles) {
            if (typeof styleName === 'string' && styleName.startsWith('asset-focus:')) {
              await highlighter.clear(styleName);
              highlighter.styles.delete(styleName);
            }
          }
          const modelIdMap = await fragments.guidsToModelIdMap(new Set([guid]));
          if (!modelIdMap || Object.keys(modelIdMap).length === 0) return;
          const styleName = `asset-focus:${guid}`;
          const highlightColor = new THREE.Color().setHSL(0.1, 0.8, 0.6);
          highlighter.styles.set(styleName, { color: highlightColor, opacity: 1, transparent: false, renderedFaces: 1 });
          const finalSetMap: Record<string, Set<number>> = {};
          for (const [modelId, ids] of Object.entries(modelIdMap)) finalSetMap[modelId] = new Set(Array.isArray(ids) ? ids : Array.from(ids as any));
          await highlighter.highlightByID(styleName, finalSetMap as any, false, false);
          for (const [modelId, localIds] of Object.entries(modelIdMap)) {
            const model = fragments.list.get(modelId);
            if (!model) continue;
            const positions = await model.getPositions(Array.from(localIds));
            if (positions && positions.length > 0) {
              const markerElement = document.createElement('div');
              markerElement.innerHTML = `<div style="background:#ff6b35;color:#fff;padding:4px 8px;border-radius:4px;font-size:12px;font-weight:bold;box-shadow:0 2px 4px rgba(0,0,0,0.3);white-space:nowrap;">${name}</div>`;
              marker.create(world, markerElement, positions[0]);
            }
          }
          try { await (world.camera as any).fitToItems(finalSetMap); } catch {}
        } catch (error) {
          console.error('[FMOverview] Error focusing on asset:', error);
        }
      };

      window.addEventListener('fm:focus-asset', handleFocusAsset as any);

      const mapFile = 'CCSPT-MAP-M3D-AS.frag';
      try {
        const resp = await fetch(`/models/${mapFile}`);
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
        const buffer = await resp.arrayBuffer();
        await fragments.core.load(new Uint8Array(buffer), { modelId: mapFile.replace('.frag','') });
        for (const [, model] of fragments.list) { await attachModel(model); }
      } catch (e) {
        console.error('[FMOverview] Failed to load MAP model:', e);
      }

      setTimeout(async () => {
        try { await (world.camera as any).fitToItems(); } catch {}
      }, 500);

      const onResize = () => { try { world.renderer?.resize(); } catch {} try { world.camera.updateAspect(); } catch {} };
      window.addEventListener('resize', onResize);

      return () => {
        try { window.removeEventListener('resize', onResize); } catch {}
        try { components.dispose(); } catch {}
      };
    };

    let cleanup: (() => void) | undefined;
    init().then((fn) => { cleanup = fn as any; }).catch(() => {});

    return () => { try { if (cleanup) cleanup(); } catch {} };
  }, []);

  return <div ref={rootRef} style={{ width: '100%', height: '100%', position: 'relative' }} />;
};

export default FMOverviewViewer;
