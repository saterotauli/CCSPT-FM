import React, { useEffect, useRef } from 'react';
import * as THREE from "three";
import * as OBC from "@thatopen/components";
import * as OBF from "@thatopen/components-front";
import * as BUI from "@thatopen/ui";
import * as TEMPLATES from "../ui-templates";
import { CONTENT_GRID_ID } from "../globals";
import { loadBuilding } from "../utils/BuildingLoader";
import { createCameraUtils } from "../utils/CameraUtils";
import { setupIfcsClickBlocker } from "../bim/Interactions";
import { extractIfcClass, extractName, extractGlobalId } from "../bim/IfcProps";
import { pickIdWithThree, resolveModelFromHit as resolveModelFromHitExt, resolveElementIdFromHit as resolveElementIdFromHitExt, raycastAll as raycastAllExt, showRayResults as showRayResultsExt } from "../bim/Raycast";
import { setupCameraDebug } from "../bim/Debug";
import { setupMeasurements } from "../bim/Measurements";
import { setupHover } from "../bim/Hover";
import { GeoTracker, loadGeorefCalibration, saveGeorefCalibration } from "../utils/Geolocation";

interface BIMViewerProps {
  isMobile: boolean;
}

const BIMViewer: React.FC<BIMViewerProps> = ({ isMobile }) => {
  const componentsRef = useRef<OBC.Components | null>(null);
  const worldRef = useRef<OBC.World | null>(null);
  const viewportRef = useRef<BUI.Viewport | null>(null);
  const appGridRef = useRef<BUI.Grid<any, any> | null>(null);
  const contentGridRef = useRef<BUI.Grid<any, any> | null>(null);
  const geoTrackerRef = useRef<GeoTracker | null>(null);
  const bimContainerRef = useRef<HTMLDivElement>(null);
  
  // Handlers to be able to remove listeners on cleanup
  const handlersRef = useRef<{
    resize?: () => void;
    keyDownClip?: (event: KeyboardEvent) => void;
    keyDownLength?: (event: KeyboardEvent) => void;
    keyDownArea?: (event: KeyboardEvent) => void;
    keyDownPrint?: (event: KeyboardEvent) => void;
    debugCleanup?: () => void;
    measurementsCleanup?: () => void;
    hoverCleanup?: () => void;
  }>({});

  useEffect(() => {
    const initializeBIM = async () => {
      if (!bimContainerRef.current) return;

      const bimContainer = bimContainerRef.current;
      // Limpiar el contenedor BIM
      bimContainer.innerHTML = '';
      bimContainer.style.background = '#1a1d23';

      BUI.Manager.init();

      // Components Setup
      const components = new OBC.Components();
      componentsRef.current = components;

      const worlds = components.get(OBC.Worlds);

      const world = worlds.create<
        OBC.SimpleScene,
        OBC.OrthoPerspectiveCamera,
        OBF.PostproductionRenderer
      >();

      worldRef.current = world;
      world.name = "Main";
      world.scene = new OBC.SimpleScene(components);
      world.scene.setup();
      world.scene.three.background = new THREE.Color(0x1a1d23);

      const viewport = BUI.Component.create<BUI.Viewport>(() => {
        return BUI.html`<bim-viewport></bim-viewport>`;
      });

      viewportRef.current = viewport;

      world.renderer = new OBF.PostproductionRenderer(components, viewport);
      world.camera = new OBC.OrthoPerspectiveCamera(components);
      // Camera clipping: avoid view getting cut off when zooming out
      world.camera.threePersp.near = 0.1;
      world.camera.threePersp.far = 1_000_000; // large far plane for campus scale
      world.camera.threePersp.updateProjectionMatrix();
      // Also set orthographic ranges for when projection toggles
      try {
        world.camera.threeOrtho.near = -1_000_000;
        world.camera.threeOrtho.far = 1_000_000;
        world.camera.threeOrtho.updateProjectionMatrix();
      } catch {}
      // Relax camera controls distance limits
      try { (world.camera.controls as any).maxDistance = 500_000; } catch {}
      world.camera.controls.restThreshold = 0.05;

      const camPos = { x: 13.271793986303862, y: 338.60956075694435, z: 314.40256496541434 };
      const camTarget = { x: 42.1722138373932, y: 188.94919748591866, z: 257.8792054873822 };
      await world.camera.controls.setLookAt(camPos.x, camPos.y, camPos.z, camTarget.x, camTarget.y, camTarget.z);

      // Start real-time geolocation tracker (user marker)
      try {
        const tracker = new GeoTracker(components, world as any);
        tracker.start();
        tracker.placeAt(41.557028010672504, 2.1113948982393413, undefined, 0, false);
        (window as any).geoTracker = tracker;
        geoTrackerRef.current = tracker;
      } catch (e) {
        console.warn('[Geo] Failed to start GeoTracker', e);
      }

      // Debug keys: print camera pose with 'P'
      (handlersRef.current as any).debugCleanup = setupCameraDebug(world, handlersRef as any);

      const worldGrid = components.get(OBC.Grids).create(world);
      worldGrid.material.uniforms.uColor.value = new THREE.Color(0x494b50);
      worldGrid.material.uniforms.uSize1.value = 2;
      worldGrid.material.uniforms.uSize2.value = 8;
      worldGrid.visible = false; // Ocultar rejilla por defecto

      // Measurements (OBF) must know the world before enabling, per docs
      try {
        const lengthMeasurer = components.get(OBF.LengthMeasurement);
        const areaMeasurer = components.get(OBF.AreaMeasurement);
        (lengthMeasurer as any).world = world;
        (areaMeasurer as any).world = world;
        if (typeof (lengthMeasurer as any).setWorld === 'function') (lengthMeasurer as any).setWorld(world);
        if (typeof (areaMeasurer as any).setWorld === 'function') (areaMeasurer as any).setWorld(world);
        if (typeof (lengthMeasurer as any).setViewport === 'function') (lengthMeasurer as any).setViewport(viewport);
        if (typeof (areaMeasurer as any).setViewport === 'function') (areaMeasurer as any).setViewport(viewport);
        if ('viewport' in (lengthMeasurer as any)) (lengthMeasurer as any).viewport = viewport;
        if ('viewport' in (areaMeasurer as any)) (areaMeasurer as any).viewport = viewport;
        try { (lengthMeasurer as any).enabled = false; } catch {}
        try { (areaMeasurer as any).enabled = false; } catch {}
      } catch {}

      const resizeWorld = () => {
        world.renderer?.resize();
        world.camera.updateAspect();
      };

      viewport.addEventListener("resize", resizeWorld);
      handlersRef.current.resize = resizeWorld;

      world.dynamicAnchor = false;

      components.init();

      components.get(OBC.Raycasters).get(world);

      const { postproduction } = world.renderer;
      postproduction.enabled = true;
      postproduction.style = OBF.PostproductionAspect.COLOR_SHADOWS;

      // Estilos globales: resaltar etiquetas (markers) al pasar el ratón
      try {
        if (!document.getElementById('ccspt-marker-hover-style')) {
          const style = document.createElement('style');
          style.id = 'ccspt-marker-hover-style';
          style.textContent = `
            [data-marker] { cursor: pointer; transition: transform 120ms ease, filter 120ms ease; pointer-events: auto !important; }
            [data-marker]:hover { transform: scale(1.5); filter: drop-shadow(0 2px 4px rgba(0,0,0,0.35)); }
            [data-marker]:hover > div:first-child { background: rgba(253, 145, 3, 0.9) !important; border: 2px rgba(255, 255, 255, 0.6); font-size: 1.1em; }
            .marker-hover-active { transform: scale(1.08); filter: drop-shadow(0 2px 4px rgba(0,0,0,0.35)); }
            .marker-hover-active > div:first-child { background: rgba(235, 100, 10, 0.9) !important; border: 2px rgba(255, 255, 255, 0.6); font-size: 1.1em; }
          `;
          document.head.appendChild(style);
        }
      } catch {}

      // Camera utils: expose global for convenience
      const cameraUtils = createCameraUtils(components, world as any);
      try { (window as any).cameraUtils = cameraUtils; } catch {}

      const { aoPass, edgesPass } = world.renderer.postproduction;

      edgesPass.color = new THREE.Color(0x494b50);

      const aoParameters = {
        radius: 0.25,
        distanceExponent: 1,
        thickness: 1,
        scale: 1,
        samples: 16,
        distanceFallOff: 1,
        screenSpaceRadius: true,
      };

      const pdParameters = {
        lumaPhi: 10,
        depthPhi: 2,
        normalPhi: 3,
        radius: 4,
        radiusExponent: 1,
        rings: 2,
        samples: 16,
      };

      aoPass.updateGtaoMaterial(aoParameters);
      aoPass.updatePdMaterial(pdParameters);

      const fragments = components.get(OBC.FragmentsManager);
      fragments.init("/node_modules/@thatopen/fragments/dist/Worker/worker.mjs");

      fragments.core.models.materials.list.onItemSet.add(({ value: material }) => {
        const isLod = "isLodMaterial" in material && material.isLodMaterial;
        if (isLod) {
          world.renderer!.postproduction.basePass.isolatedMaterials.push(material);
        }
      });

      world.camera.projection.onChanged.add(() => {
        for (const [_, model] of fragments.list) {
          model.useCamera(world.camera.three);
        }
      });

      world.camera.controls.addEventListener("rest", () => {
        fragments.core.update(true);
      });

      const ifcLoader = components.get(OBC.IfcLoader);
      await ifcLoader.setup({
        autoSetWasm: false,
        wasm: { absolute: true, path: "https://unpkg.com/web-ifc@0.0.70/" },
      });

      const highlighter = components.get(OBF.Highlighter);
      highlighter.setup({
        world,
        selectMaterialDefinition: {
          color: new THREE.Color("#bcf124"),
          renderedFaces: 1,
          opacity: 1,
          transparent: false,
        },
      });

      // Asegurar que el highlighter esté habilitado
      try {
        (highlighter as any).enabled = true;
      } catch {}

      // Hover propio por raycast solo para IFCSPACE
      const ifcspaceByModel = new WeakMap<any, Set<number>>();

      // Deshabilitar Hoverer para evitar preselecciones no deseadas
      try { (components.get(OBF.Hoverer) as any).enabled = false; } catch {}

      // Estilo de hover
      const hoverStyle = 'hover:ifcspace';
      highlighter.styles.set(hoverStyle, {
        color: new THREE.Color('#00ccff'),
        opacity: 0.35,
        transparent: true,
        renderedFaces: 1,
      });

      // Estilo para depuración de raycast
      const rayHitStyle = 'ray:hit';
      highlighter.styles.set(rayHitStyle, {
        color: new THREE.Color(0xff3366),
        opacity: 0.6,
        transparent: true,
        renderedFaces: 1,
      });

      // Utilidades raycast/hover
      const raycasters = components.get(OBC.Raycasters).get(world);

      function getModelKeyFromInstance(inst: any): string | null {
        for (const [key, mdl] of fragments.list) {
          if (mdl === inst) return key;
        }
        return null;
      }

      function resolveModelFromHit(hit: any): any | undefined {
        return resolveModelFromHitExt(hit, fragments.list as any);
      }

      // ========= Raycasting estilo tutorial =========
      const mouse = new THREE.Vector2();
      let rayHoverTimeout: any = null;

      // Línea indicadora (punto+normal)
      const lineGeometry = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(0, 0, 0),
        new THREE.Vector3(0, 0, 2),
      ]);
      const lineMaterial = new THREE.LineBasicMaterial({ color: 0x6528d7 });
      const rayLine = new THREE.Line(lineGeometry, lineMaterial);
      rayLine.visible = false;
      world.scene.three.add(rayLine);

      const raycastAll = async (data: { camera: THREE.PerspectiveCamera | THREE.OrthographicCamera; mouse: THREE.Vector2; dom: HTMLCanvasElement; }) => {
        return raycastAllExt(fragments.list as any, data);
      };

      // ======= Helpers para Properties (Name y clase IFC) =======
      function resolvePropertiesCtor(): any | null {
        console.log('Available OBC keys:', Object.keys(OBC as any));
        console.log('Available OBF keys:', Object.keys(OBF as any));
        
        const candidates = [
          (OBC as any).Properties,
          (OBC as any).PropertiesManager,
          (OBC as any).IfcPropertiesManager,
          (OBC as any).IfcPropertiesUtils,
          (OBF as any)?.Properties,
          (OBF as any)?.PropertiesManager,
          (OBF as any)?.IfcProperties,
          (OBF as any)?.IfcPropertiesManager,
          (OBF as any)?.IfcPropertiesUtils,
        ].filter(Boolean);
        
        console.log('Properties candidates found:', candidates.map(c => c.name));
        
        if (candidates.length) return candidates[0];
        try {
          for (const [key, value] of Object.entries(OBC as Record<string, any>)) {
            if (typeof value === 'function' && /Properties/i.test(key)) {
              console.log('Found OBC property service:', key);
              return value;
            }
          }
          for (const [key, value] of Object.entries(OBF as unknown as Record<string, any>)) {
            if (typeof value === 'function' && /Properties/i.test(key)) {
              console.log('Found OBF property service:', key);
              return value;
            }
          }
        } catch {}
        return null;
      }

      function resolveElementIdFromHit(model: any, hit: any): number | undefined {
        return resolveElementIdFromHitExt(model, hit, components);
      }

      async function getElementBasics(model: any, id: number): Promise<{ name?: string; ifcClass?: string; globalId?: string }> {
        try {
          if (typeof (model as any).getItemsData === 'function') {
            try {
              const [data] = await (model as any).getItemsData([id], { attributesDefault: true });
              if (data) {
                const name = extractName(data);
                const ifcClass = extractIfcClass(data);
                const globalId = extractGlobalId(data);
                console.log('getItemsData data:', data);
                console.log('getItemsData success:', { name, ifcClass, globalId, keys: Object.keys(data || {}) });
                return {
                  name: name ? String(name) : undefined,
                  ifcClass: ifcClass ? String(ifcClass) : undefined,
                  globalId: globalId ? String(globalId) : undefined,
                };
              }
            } catch (err) {
              console.log('getItemsData error:', err);
            }
          }
          
          if (typeof (model as any).getGuidsByLocalIds === 'function') {
            try {
              const guids = await (model as any).getGuidsByLocalIds([id]);
              if (guids && guids.length > 0) {
                const guid = guids[0];
                console.log('Found GUID for localId', id, ':', guid);
                if (typeof (model as any).getPropertiesByGuid === 'function') {
                  const props = await (model as any).getPropertiesByGuid(guid);
                  if (props) {
                    const name = extractName(props) ?? (props?.Name?.value ?? props?.Name);
                    const ifcClass = extractIfcClass(props);
                    return {
                      name: name ? String(name) : undefined,
                      ifcClass: ifcClass ? String(ifcClass) : undefined,
                      globalId: guid,
                    };
                  }
                }
              }
            } catch (err) {
              console.log('getGuidsByLocalIds error:', err);
            }
          }
          
          const Ctor = resolvePropertiesCtor();
          let data: any = null;
          if (Ctor) {
            const props = components.get(Ctor as any) as any;
            if (props && typeof props.get === 'function') {
              try { data = await props.get(model, id); } catch {}
            }
          }
          
          if (!data) {
            try { if (typeof (model as any).getProperties === 'function') data = await (model as any).getProperties(id); } catch {}
            try { if (!data && typeof (model as any).get === 'function') data = await (model as any).get(id); } catch {}
          }
          
          if (data) {
            const name = extractName(data) ?? (data?.Name?.value ?? data?.Name ?? data?.LongName?.value ?? data?.LongName);
            const ifcClass = extractIfcClass(data);
            const globalId = extractGlobalId(data) ?? (data?.GlobalId?.value ?? data?.GlobalId ?? data?.GlobalID ?? data?.globalId);
            return {
              name: name ? String(name) : undefined,
              ifcClass: ifcClass ? String(ifcClass) : undefined,
              globalId: globalId ? String(globalId) : undefined,
            };
          }
        } catch {}
        try {
          const hud = document.getElementById('raycast-hud');
          if (hud && hud.parentElement) hud.parentElement.removeChild(hud);
        } catch {}
        try { world.scene.three.remove(rayLine); } catch {}
        return {} as any;
      };

      let activeMarkerEl: HTMLElement | null = null;

      function clearMarkerHighlight() {
        if (activeMarkerEl) {
          try { activeMarkerEl.classList.remove('marker-hover-active'); } catch {}
          activeMarkerEl = null;
        }
      }

      async function clearHover() {
        await highlighter.clear(hoverStyle);
        clearMarkerHighlight();
      }

      // Pointer move: solo actualizar posición del mouse (sin raycast). Hover real se mueve a bim/Hover
      const onPointerMove = async (e: PointerEvent) => {
        try {
          mouse.x = e.clientX as any;
          mouse.y = e.clientY as any;
          if (rayHoverTimeout) clearTimeout(rayHoverTimeout);
          return;
        } catch {}
      };
      viewport.addEventListener('pointermove', onPointerMove);
      (handlersRef.current as any).pointerMove = onPointerMove;

      // Setup hover module
      const hoverApi = setupHover(components, world, viewport, {
        resolveModelFromHit,
        resolveElementIdFromHit,
        extractIfcClass,
      });
      (handlersRef.current as any).hoverCleanup = hoverApi.cleanup;

      // Click: ejecutar raycast y mostrar lista de impactos
      const onClickRay = async (e: MouseEvent) => {
        try {
          const lastHoveredIfcClass = hoverApi.getLastHoveredIfcClass?.();
          console.log('lastHoveredIfcClass', lastHoveredIfcClass);
          if (lastHoveredIfcClass === 'IFCSITE') {
            console.log('lastHoveredIfcClass === IFCSITE');
            return;
          } else {
            console.log('lastHoveredIfcClass !== IFCSITE'); 
          }
          mouse.x = e.clientX as any;
          mouse.y = e.clientY as any;
          const results = await raycastAll({
            camera: world.camera.three as any,
            mouse,
            dom: world.renderer!.three.domElement as any,
          });
          let detailedHit: any = null;
          try { detailedHit = await (raycasters as any).castRay(e); } catch {}
          try {
            const hoverer: any = components.get(OBF.Hoverer as any);
            const prev = hoverer.enabled;
            hoverer.enabled = true;
            try {
              const dom = world.renderer!.three.domElement as HTMLCanvasElement;
              const evt = new PointerEvent('pointermove', { clientX: e.clientX, clientY: e.clientY, bubbles: true });
              dom.dispatchEvent(evt);
            } catch {}
            const cur = hoverer?.current || hoverer?.hovered || hoverer?.hit || null;
            hoverer.enabled = prev;
            if (cur) {
              detailedHit = detailedHit || {};
              try { (detailedHit as any).id = (cur as any).id ?? (cur as any).expressID ?? (cur as any).expressId; } catch {}
              try { (detailedHit as any).model = (cur as any).model ?? (detailedHit as any).model; } catch {}
              try { (detailedHit as any).modelKey = (cur as any).modelKey ?? (detailedHit as any).modelKey; } catch {}
              try { (detailedHit as any).fragmentId = (cur as any).fragmentId ?? (cur as any).fragId ?? (detailedHit as any).fragmentId; } catch {}
              try { (detailedHit as any).faceIndex = (cur as any).faceIndex ?? (detailedHit as any).faceIndex; } catch {}
            }
          } catch {}
          if (detailedHit) {
            try {
              console.log('Raycasters.castRay hit', detailedHit);
              console.log('Raycasters.castRay hit keys', Object.keys(detailedHit || {}));
              if ((detailedHit as any)?.object) console.log('hit.object.userData', (detailedHit as any).object.userData);
            } catch {}
            const m = resolveModelFromHit(detailedHit);
            const raw =
              (detailedHit as any)?.id ??
              (detailedHit as any)?.expressID ??
              (detailedHit as any)?.expressId ??
              (detailedHit as any)?.elementId ??
              (detailedHit as any)?.itemID ??
              (detailedHit as any)?.itemId ??
              (detailedHit as any)?.instanceID ??
              (detailedHit as any)?.dbid ??
              (detailedHit as any)?.fragId ??
              (detailedHit as any)?.fragmentId ??
              (detailedHit as any)?.object?.userData?.expressID ??
              (detailedHit as any)?.object?.userData?.id;
            let did: any = typeof raw === 'string' ? Number(raw) : raw;
            if (did == null) {
              did = resolveElementIdFromHit(m, detailedHit);
            }
            if (did == null) {
              try {
                const dom = world.renderer!.three.domElement as HTMLCanvasElement;
                did = pickIdWithThree(m, world.camera.three as any, e.clientX, e.clientY, dom);
              } catch {}
            }
            try { console.log('Resolved element id (click):', did); } catch {}
            let target = results[0];
            if (m) {
              const idx = results.findIndex((r: any) => resolveModelFromHit(r) === m);
              if (idx >= 0) target = results[idx];
            }
            if (!target) {
              target = {
                distance: (detailedHit as any)?.distance,
                index: 0,
                model: m,
                modelKey: (m as any)?.uuid || (m as any)?.key || (m as any)?.id,
                modelName: (m as any)?.name,
                point: (detailedHit as any)?.point,
                normal: (detailedHit as any)?.normal,
              } as any;
              results.push(target);
            }
            if (target) {
              try { (target as any).id = did; } catch {}
              try { (target as any).point = (detailedHit as any).point || (target as any).point; } catch {}
              try { (target as any).normal = (detailedHit as any).normal || (target as any).normal; } catch {}
              try { (target as any).model = (detailedHit as any).model || (target as any).model; } catch {}
              try { (target as any).modelKey = (detailedHit as any).modelKey || (target as any).modelKey; } catch {}
              if ((target as any).id == null) {
                const tm = resolveModelFromHit(target);
                const alt = resolveElementIdFromHit(tm, target);
                if (alt != null) try { (target as any).id = alt; } catch {}
              }
              try { results.splice(0, results.length, target); } catch {}
            }
            if (did == null) console.debug('Detailed hit sin id detectable', detailedHit);
          }
          if (results?.some((r: any) => (r?.id ?? r?.expressID ?? r?.expressId ?? r?.instanceID ?? r?.elementId ?? r?.itemID ?? r?.dbid ?? r?.fragId ?? r?.fragmentId) == null)) {
            console.log('Raycast results sin id, objeto crudo', results);
            try { const r0 = results[0]; if (r0?.object) console.log('r0.object.userData', r0.object.userData); } catch {}
          }
          await showRayResultsExt(results, {
            resolveModelFromHit,
            getModelKeyFromInstance,
            getElementBasics,
            rayLine,
            rayHud: document.getElementById('raycast-hud') as any,
          });
        } catch {}
      };
      viewport.addEventListener('click', onClickRay as any);
      (handlersRef.current as any).rayClick = onClickRay;

      console.log('Hover category handler attached');

      const disableHoverOnPointerDown = () => { clearHover(); };
      const enableHoverOnPointerUp = () => { /* no-op */ };
      try {
        const ifcsBlockerCleanup = setupIfcsClickBlocker(components, world, viewport, getElementBasics);
        viewport.addEventListener("pointerdown", disableHoverOnPointerDown);
        window.addEventListener("pointerup", enableHoverOnPointerUp);
        (handlersRef.current as any).ifcsBlockerCleanup = ifcsBlockerCleanup;
        (handlersRef.current as any).pointerDown = disableHoverOnPointerDown;
        (handlersRef.current as any).pointerUp = enableHoverOnPointerUp;
      } catch {}

      // Clipper + Double click focus
      const clipper = components.get(OBC.Clipper);
      const onDblClick = async (e: MouseEvent) => {
        try {
          if (clipper.enabled) {
            clipper.create(world);
            return;
          }
          const raycasters = components.get(OBC.Raycasters).get(world);
          let detailedHit: any = null;
          try { detailedHit = await (raycasters as any).castRay(e); } catch {}
          try {
            const hoverer: any = components.get(OBF.Hoverer as any);
            const prev = hoverer.enabled;
            hoverer.enabled = true;
            try {
              const dom = world.renderer!.three.domElement as HTMLCanvasElement;
              const evt = new PointerEvent('pointermove', { clientX: e.clientX, clientY: e.clientY, bubbles: true });
              dom.dispatchEvent(evt);
            } catch {}
            const cur = hoverer?.current || hoverer?.hovered || hoverer?.hit || null;
            hoverer.enabled = prev;
            if (cur) {
              detailedHit = detailedHit || {};
              try { (detailedHit as any).id = (cur as any).id ?? (cur as any).expressID ?? (cur as any).expressId; } catch {}
              try { (detailedHit as any).model = (cur as any).model ?? (detailedHit as any).model; } catch {}
              try { (detailedHit as any).modelKey = (cur as any).modelKey ?? (detailedHit as any).modelKey; } catch {}
              try { (detailedHit as any).fragmentId = (cur as any).fragmentId ?? (cur as any).fragId ?? (detailedHit as any).fragmentId; } catch {}
              try { (detailedHit as any).faceIndex = (cur as any).faceIndex ?? (detailedHit as any).faceIndex; } catch {}
            }
          } catch {}
          if (!detailedHit) {
            console.debug('[dblclick] No detailedHit from raycasters/hoverer');
            return;
          }
          const m = resolveModelFromHit(detailedHit);
          if (!m) {
            console.debug('[dblclick] No model resolved from hit');
          }
          let id: any =
            (detailedHit as any)?.id ??
            (detailedHit as any)?.expressID ??
            (detailedHit as any)?.expressId ??
            (detailedHit as any)?.elementId ??
            (detailedHit as any)?.itemID ??
            (detailedHit as any)?.itemId ??
            (detailedHit as any)?.instanceID ??
            (detailedHit as any)?.dbid ??
            (detailedHit as any)?.fragId ??
            (detailedHit as any)?.fragmentId ??
            (detailedHit as any)?.object?.userData?.expressID ??
            (detailedHit as any)?.object?.userData?.id;
          if (id == null) id = resolveElementIdFromHit(m, detailedHit);
          if (id == null) {
            try {
              const dom = world.renderer!.three.domElement as HTMLCanvasElement;
              id = pickIdWithThree(m, world.camera.three as any, e.clientX, e.clientY, dom);
            } catch {}
          }
          if (id != null && m) {
            const modelKey = getModelKeyFromInstance(m);
            if (modelKey) {
              const modelIdMap: Record<string, Set<number>> = { [modelKey]: new Set([Number(id)]) };
              console.debug('[dblclick] Focusing element via camera.fitToItems (toolbar parity)', { modelKey, id });
              const cam: any = world.camera as any;
              if (cam && typeof cam.fitToItems === 'function') {
                await cam.fitToItems(modelIdMap);
                return;
              }
              await cameraUtils.fitToSingleElement(modelKey, Number(id));
              return;
            }
          }
          try {
            const p = (detailedHit as any)?.point;
            if (p && world.camera?.controls) {
              const sphere = new THREE.Sphere(new THREE.Vector3(p.x, p.y, p.z), 6);
              console.debug('[dblclick] Fallback focus to point', p);
              await world.camera.controls.fitToSphere(sphere, true);
              return;
            }
          } catch {}
          console.debug('[dblclick] Could not resolve element id or point to focus');
        } catch {}
      };
      try {
        const canvasEl = world.renderer!.three.domElement as HTMLCanvasElement;
        canvasEl.addEventListener('dblclick', onDblClick as any);
        (handlersRef.current as any).dblclick = onDblClick;
      } catch {}

      const handleKeyDown = (event: KeyboardEvent) => {
        if (event.code === "Delete" || event.code === "Backspace") {
          clipper.delete(world);
        }
      };

      window.addEventListener("keydown", handleKeyDown);
      handlersRef.current.keyDownClip = handleKeyDown;

      // Measurements (length + area): setup and keep cleanup
      const measCleanup = setupMeasurements(components, world, viewport, handlersRef);
      handlersRef.current.measurementsCleanup = measCleanup;

      // Define qué hacer cuando se carga un modelo de fragments
      fragments.list.onItemSet.add(async ({ value: model }) => {
        model.useCamera(world.camera.three);
        model.getClippingPlanesEvent = () => {
          return Array.from(world.renderer!.three.clippingPlanes) || [];
        };
        world.scene.three.add(model.object);
        await fragments.core.update(true);

        // Compute and cache IFCSPACE ids for this model
        try {
          const categoryIds = await (model as any).getItemsOfCategories([/IFCSPACE/i]);
          const ids: number[] = (categoryIds?.IFCSPACE || []) as number[];
          ifcspaceByModel.set(model, new Set(ids));
        } catch {}
      });

      // Finder setup
      const finder = components.get(OBC.ItemsFinder);
      finder.create("Walls", [{ categories: [/WALL/] }]);
      finder.create("Slabs", [{ categories: [/SLAB/] }]);
      finder.create("Rooms", [{ categories: [/SPACE/] }]);
      finder.create("Sostres", [{ categories: [/COVERING/] }]);

      const [viewportGrid] = BUI.Component.create(TEMPLATES.viewportGridTemplate, {
        components,
        world,
      });

      viewport.append(viewportGrid);

      // Content Grid Setup
      const viewportCardTemplate = () => BUI.html`
        <div class="dashboard-card" style="padding: 0px; position: relative;">
          ${viewport}
          <div id="floor-selector-container" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; pointer-events: none; z-index: 1000;">
            <div style="pointer-events: auto;">
              <!-- FloorSelector se renderizará aquí -->
            </div>
          </div>
        </div>
      `;

      const [contentGrid] = BUI.Component.create<
        BUI.Grid<TEMPLATES.ContentGridLayouts, TEMPLATES.ContentGridElements>,
        TEMPLATES.ContentGridState
      >(TEMPLATES.contentGridTemplate, {
        components,
        id: CONTENT_GRID_ID,
        viewportTemplate: viewportCardTemplate,
        pageMode: 'fm',
        mobile: isMobile,
        onModelsLoaded: () => {
          console.log('BIMViewer: Modelos cargados');
        },
      });

      const setInitialLayout = () => {
        contentGrid.layout = "Viewer";
        if (window.location.hash) {
          window.history.replaceState(null, '', window.location.pathname + window.location.search);
        }
      };

      setInitialLayout();

      const hashCleaner = setInterval(() => {
        if (window.location.hash) {
          window.history.replaceState(null, '', window.location.pathname + window.location.search);
        }
      }, 100);

      setTimeout(() => clearInterval(hashCleaner), 5000);

      contentGridRef.current = contentGrid;

      // Create BIM grid element for content only
      const appGrid = document.createElement('bim-grid') as BUI.Grid<
        ["App"],
        [{ name: "contentGrid"; state: TEMPLATES.ContentGridState }]
      >;

      appGrid.id = 'app';
      appGrid.style.width = '100%';
      appGrid.style.height = '100%';

      appGridRef.current = appGrid;

      appGrid.elements = {
        contentGrid,
      };

      appGrid.layouts = {
        App: {
          template: `
            "contentGrid" 1fr
            /1fr
          `,
        },
      };

      appGrid.layout = "App";

      // Append BIM grid to BIM container
      bimContainer.appendChild(appGrid);

      // Force an initial resize to ensure correct aspect ratio
      requestAnimationFrame(() => {
        try {
          world.renderer?.resize();
          world.camera.updateAspect();
        } catch {}
      });

      // Auto-load default building (MAP) if no models are loaded yet
      try {
        const frags = components.get(OBC.FragmentsManager);
        if (frags.list.size === 0) {
          loadBuilding(components, 'MAP');
        }
      } catch {}
    };

    initializeBIM();
    
    // Cleanup when component unmounts
    return () => {
      try { (handlersRef.current as any).cleanupRay?.(); } catch {}
      try { (handlersRef.current as any).hoverCleanup?.(); } catch {}

      if (handlersRef.current.resize && viewportRef.current) {
        try { viewportRef.current.removeEventListener("resize", handlersRef.current.resize); } catch {}
      }
      if ((handlersRef.current as any).rayClick && viewportRef.current) {
        try { viewportRef.current.removeEventListener('click', (handlersRef.current as any).rayClick); } catch {}
      }
      if ((handlersRef.current as any).hoverShowCategory && viewportRef.current) {
        try { viewportRef.current.removeEventListener('pointermove', (handlersRef.current as any).hoverShowCategory); } catch {}
      }
      try {
        const canvas = worldRef.current?.renderer?.three?.domElement as HTMLCanvasElement | undefined;
        if (canvas) {
          const canvasPointer = (handlersRef.current as any).hoverCanvasPointerMove;
          const canvasMouse = (handlersRef.current as any).hoverCanvasMouseMove;
          if (canvasPointer) try { canvas.removeEventListener('pointermove', canvasPointer as any); } catch {}
          if (canvasMouse) try { canvas.removeEventListener('mousemove', canvasMouse as any); } catch {}
        }
      } catch {}
      if ((handlersRef.current as any).pointerMove && viewportRef.current) {
        try { viewportRef.current.removeEventListener('pointermove', (handlersRef.current as any).pointerMove); } catch {}
      }
      if ((handlersRef.current as any).pointerDown && viewportRef.current) {
        try { viewportRef.current.removeEventListener('pointerdown', (handlersRef.current as any).pointerDown); } catch {}
      }
      if ((handlersRef.current as any).pointerUp) {
        try { window.removeEventListener('pointerup', (handlersRef.current as any).pointerUp); } catch {}
      }
      try { (handlersRef.current as any).ifcsBlockerCleanup?.(); } catch {}
      try { (handlersRef.current as any).measurementsCleanup?.(); } catch {}
      try { (handlersRef.current as any).debugCleanup?.(); } catch {}
      if (handlersRef.current.keyDownClip) {
        try { window.removeEventListener("keydown", handlersRef.current.keyDownClip); } catch {}
      }
      if (handlersRef.current.keyDownLength) {
        try { window.removeEventListener("keydown", handlersRef.current.keyDownLength); } catch {}
      }
      if (handlersRef.current.keyDownArea) {
        try { window.removeEventListener("keydown", handlersRef.current.keyDownArea); } catch {}
      }
      if (handlersRef.current.keyDownPrint) {
        try { window.removeEventListener("keydown", handlersRef.current.keyDownPrint); } catch {}
      }

      if (appGridRef.current && appGridRef.current.parentElement) {
        try { appGridRef.current.parentElement.removeChild(appGridRef.current); } catch {}
      }
      
      // Clean up content grid resize listeners
      if (contentGridRef.current && (contentGridRef.current as any).__cleanup) {
        try { (contentGridRef.current as any).__cleanup(); } catch {}
      }
      
      if (bimContainerRef.current) {
        try { bimContainerRef.current.innerHTML = ""; } catch {}
        try { bimContainerRef.current.style.background = ""; } catch {}
      }

      try { document.body.style.background = ""; } catch {}

      try { geoTrackerRef.current?.stop(); } catch {}
      geoTrackerRef.current = null;

      viewportRef.current = null;
      appGridRef.current = null;
      contentGridRef.current = null;
      worldRef.current = null;
      componentsRef.current = null;
      handlersRef.current = {};
    };
  }, []);

  return (
    <div 
      ref={bimContainerRef}
      style={{
        width: '100%',
        height: '100%',
        background: '#1a1d23'
      }}
    />
  );
};

export default BIMViewer;
