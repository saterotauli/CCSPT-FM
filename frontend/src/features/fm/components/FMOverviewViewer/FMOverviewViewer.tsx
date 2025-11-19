import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import * as OBC from '@thatopen/components';
import * as OBF from '@thatopen/components-front';
import * as BUI from '@thatopen/ui';
import * as FRAGS from '@thatopen/fragments';
import { labelBuildingsFromDB } from '@modules/viewer/utils/BuildingLoader';

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
      const world = worlds.create<OBC.SimpleScene, OBC.SimpleCamera, OBF.PostproductionRenderer>();
      worldRef.current = world;

      world.name = 'FM-Overview';
      world.scene = new OBC.SimpleScene(components);
      world.scene.setup();
      world.scene.three.background = new THREE.Color(0x1a1d23);

      world.renderer = new OBF.PostproductionRenderer(components, viewportDiv);
      world.camera = new OBC.SimpleCamera(components);
      try {
        // Configure camera controls
        (world.camera.controls as any).maxDistance = 500_000;
        (world.camera.controls as any).minDistance = 1;
        
        // Configure camera clipping planes and FOV for better far distance rendering
        if (world.camera.three) {
          world.camera.three.near = 0.1;  // Very close near plane
          world.camera.three.far = 1_000_000;  // Very far plane to avoid clipping
          
          // Set FOV only if it's a PerspectiveCamera
          if (world.camera.three instanceof THREE.PerspectiveCamera) {
            world.camera.three.fov = 60;  // Wider field of view
          }
          
          world.camera.three.updateProjectionMatrix();
        }
        
        // Set exact initial position and target as requested
        //(world.camera.controls as any).setLookAt(58, 22, -25, 13, 0, 4.2, true);
        //world.camera.controls.setLookAt(9.63, 277.12, 318.94, 76.89, -74.69, 148.04, true);
        world.camera.controls.setLookAt(81.38, 363.71, 335.55, 185.01, -53.70, 143.86, true)
      } catch {}

      components.init();

      const ensureResize = () => {
        try { world.renderer?.resize(); } catch {}
        try { 
          world.camera.updateAspect(); 
          // Ensure camera clipping planes are maintained after aspect update
          if (world.camera.three) {
            world.camera.three.near = 0.1;
            world.camera.three.far = 1_000_000;
            world.camera.three.updateProjectionMatrix();
          }
        } catch {}
      };

      const { postproduction } = world.renderer;
      postproduction.enabled = true;
      // Use BASIC style if available in this library version; otherwise fallback to COLOR
      //const AspectAny: any = OBF.PostproductionAspect as any;
      postproduction.style = OBF.PostproductionAspect.COLOR_SHADOWS;
      world.renderer.postproduction.edgesPass.color = new THREE.Color(0x494b50);

      // Do a couple of initial resizes to account for CSS/layout settling
      ensureResize();
      requestAnimationFrame(() => ensureResize());
      setTimeout(() => ensureResize(), 100);

      // Initialize both FragmentsManager and FragmentsModels for compatibility
      const fragmentsManager = components.get(OBC.FragmentsManager);
      const fragmentsModels = new FRAGS.FragmentsModels('/worker.mjs');
      
      // Initialize FragmentsManager with worker
      try {
        await fragmentsManager.init('/worker.mjs');
      } catch (e) {
        console.warn('[FMOverview] FragmentsManager init warning:', e);
      }

      // React to container size changes (e.g., CSS grid settle) to avoid distorted first render
      let resizeObserver: ResizeObserver | undefined;
      try {
        resizeObserver = new ResizeObserver(() => { ensureResize(); try { fragmentsModels.update(true); } catch {} });
        resizeObserver.observe(viewportDiv);
      } catch {}

      // Expose console helpers to capture/apply camera lookAt
      (window as any).fmDumpLookAt = () => {
        try {
          const ctrls: any = world.camera.controls;
          const pos = new THREE.Vector3();
          const tar = new THREE.Vector3();
          if (typeof ctrls.getPosition === 'function') ctrls.getPosition(pos); else pos.copy(world.camera.three.position);
          if (typeof ctrls.getTarget === 'function') ctrls.getTarget(tar);
          const line = `world.camera.controls.setLookAt(${pos.x.toFixed(2)}, ${pos.y.toFixed(2)}, ${pos.z.toFixed(2)}, ${tar.x.toFixed(2)}, ${tar.y.toFixed(2)}, ${tar.z.toFixed(2)}, true)`;
          console.log('[FMOverview] setLookAt:', line);
          return { position: pos, target: tar, command: line };
        } catch (e) { console.warn('[FMOverview] fmDumpLookAt failed', e); }
      };
      (window as any).fmSetLookAt = (px: number, py: number, pz: number, tx: number, ty: number, tz: number) => {
        try { (world.camera.controls as any).setLookAt(px, py, pz, tx, ty, tz, true); fragmentsModels.update(true); } catch (e) { console.warn('[FMOverview] fmSetLookAt failed', e); }
      };

      const attachModel = async (model: any) => {
        try { model.useCamera(world.camera.three); } catch {}
        try { world.scene.three.add(model.object); } catch {}
        try { await fragmentsModels.update(true); } catch {}
      };
      fragmentsModels.models.list.onItemSet.add(async ({ value: model }) => { await attachModel(model); });

      // Update fragments when camera rests after interaction
      world.camera.controls.addEventListener('rest', () => { fragmentsModels.update(true); });

      // No need to compute initial pose: already set via setLookAt above

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
          // NOTE: FragmentsModels doesn't expose the same GUID helpers as FragmentsManager.
          // If needed, plug your own GUID->ids map. For now we skip highlighting when not available.
          const modelIdMap: Record<string, Set<number>> = {} as any;
          if (!modelIdMap || Object.keys(modelIdMap).length === 0) return;
          const styleName = `asset-focus:${guid}`;
          const highlightColor = new THREE.Color().setHSL(0.1, 0.8, 0.6);
          highlighter.styles.set(styleName, { color: highlightColor, opacity: 1, transparent: false, renderedFaces: 1 });
          const finalSetMap: Record<string, Set<number>> = {};
          for (const [modelId, ids] of Object.entries(modelIdMap)) finalSetMap[modelId] = new Set(Array.isArray(ids) ? ids : Array.from(ids as any));
          await highlighter.highlightByID(styleName, finalSetMap as any, false, false);
          for (const [modelId, localIds] of Object.entries(modelIdMap)) {
            const model = fragmentsModels.models.list.get(modelId);
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
        
        // IMPORTANT: clone the buffer to avoid it being detached by the first consumer
        const bufferForModels = buffer; // FRAGS.FragmentsModels expects ArrayBuffer
        const bufferForManager = buffer.slice(0); // clone for FragmentsManager
        
        // Load into both systems for compatibility (use independent copies)
        await fragmentsModels.load(bufferForModels, { modelId: mapFile.replace('.frag','') });
        await fragmentsManager.core.load(bufferForManager, { modelId: mapFile.replace('.frag','') });
        
        for (const [, model] of fragmentsModels.models.list) { await attachModel(model); }
        
        // After model is loaded, create building markers
        setTimeout(async () => {
          try {
            // Ensure marker component is available
            const marker = components.get(OBF.Marker);
            marker.threshold = 10;
            try { (marker as any).enabled = true; } catch {}

            // Force fragments update before creating markers
            await fragmentsManager.core.update(true);

            await labelBuildingsFromDB(components);
            console.log('[FMOverview] Building markers created');
          } catch (error) {
            console.error('[FMOverview] Error creating building markers:', error);
          }
        }, 2000);
      } catch (e) {
        console.error('[FMOverview] Failed to load MAP model:', e);
      }

      // After model load and first update, trigger fragments update and a resize
      setTimeout(() => { try { fragmentsModels.update(true); } catch {} ensureResize(); }, 500);

      const onResize = () => { ensureResize(); };
      const onVisibility = () => { if (document.visibilityState === 'visible') { setTimeout(() => ensureResize(), 50); } };
      window.addEventListener('resize', onResize);
      document.addEventListener('visibilitychange', onVisibility);

      return () => {
        try { window.removeEventListener('resize', onResize); } catch {}
        try { document.removeEventListener('visibilitychange', onVisibility); } catch {}
        try { resizeObserver?.disconnect(); } catch {}
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
