import * as BUI from "@thatopen/ui";
import * as OBC from "@thatopen/components";
import * as OBF from "@thatopen/components-front";
import * as FRAGS from "@thatopen/fragments";
import * as THREE from "three";
import { modelStore } from "../../globals";
import { CameraUtils } from "../../utils/CameraUtils";
import "./floor-selector.css";

export interface FloorSelectorState {
  components: OBC.Components;
  world: OBC.World;
}

// Variables de estado persistentes fuera del template
let selectedFloor = 'all';
let selectedView = '3D'; // Estado para los botones de vista
let cameraUtils: CameraUtils | null = null;

export const floorSelectorTemplate: BUI.StatefullComponent<
  FloorSelectorState
> = (state, update) => {
  const { components, world } = state;

  //console.log('FloorSelector template ejecutándose...');

  // Inicializar CameraUtils si no existe
  if (!cameraUtils) {
    cameraUtils = new CameraUtils(components, world);
  }

  const onFloorSelect = async ({ target }: { target: BUI.Button }, floorName: string) => {
    //console.log('onFloorSelect llamado con:', floorName);

    const hider = components.get(OBC.Hider);
    if (!hider) {
      console.error('Hider no disponible');
      return;
    }

    try {
      // Actualizar el estado del nivel seleccionado
      selectedFloor = floorName;
      // Publicar planta activa inmediatamente para que otras UIs (Departaments) filtren al instante
      if (floorName === 'all') {
        modelStore.setActiveFloor(undefined);
        window.dispatchEvent(new CustomEvent('ccspt:active-floor-changed', { detail: { floor: undefined }, bubbles: true, composed: true }));
        if (modelStore.getState().isDepartamentsActive) {
          window.dispatchEvent(new CustomEvent('ccspt:refresh-departaments', { detail: { floor: undefined }, bubbles: true, composed: true }));
        }
      } else {
        modelStore.setActiveFloor(floorName);
        window.dispatchEvent(new CustomEvent('ccspt:active-floor-changed', { detail: { floor: floorName }, bubbles: true, composed: true }));
        if (modelStore.getState().isDepartamentsActive) {
          window.dispatchEvent(new CustomEvent('ccspt:refresh-departaments', { detail: { floor: floorName }, bubbles: true, composed: true }));
        }
      }
      //console.log('Nivel seleccionado actualizado a:', selectedFloor);

      if (floorName === 'all') {
        // Mostrar todo y limpiar clipping
        try {
          (world.renderer as any)?.three && ((world.renderer as any).three.clippingPlanes = []);
        } catch {}
        try { await components.get(OBC.FragmentsManager).core.update(true); } catch {}
        //console.log('Todo mostrado correctamente');
        // already notified above
      } else {
        //console.log('=== BUSCANDO INFORMACIÓN PARA AISLAR ===');

        const storeState = modelStore.getState();
        console.log('Estado del store obtenido:', {
          hasModels: storeState.hasModels,
          floorsCount: storeState.floors?.length,
          hasLevelsClassification: !!storeState.levelsClassification,
          fragments: !!storeState.fragments
        });

        const levelsClassification = storeState.levelsClassification;
        //console.log('Clasificación de niveles desde el store:', levelsClassification);

        if (levelsClassification) {
          //console.log('✅ Clasificación de niveles disponible', levelsClassification);
          //console.log('📋 Niveles disponibles:', Array.from(levelsClassification.keys()));

          // Buscar el grupo correspondiente al nivel seleccionado
          const floorData = levelsClassification.get(floorName);
          //console.log('🎯 Datos del nivel seleccionado:', floorName, floorData);

          if (floorData) {
            // Clipping inmediato sin esperas: usar caché si existe; si no, aproximación con target de cámara
            const fragmentsMgr = components.get(OBC.FragmentsManager);
            const cacheKey = `${modelStore.getState().activeBuildingCode || 'UNK'}:${floorName}`;
            (globalThis as any).__floorYBands = (globalThis as any).__floorYBands || new Map<string, { yMin: number; yMax: number }>();
            const yBandCache: Map<string, { yMin: number; yMax: number }> = (globalThis as any).__floorYBands;
            let band = yBandCache.get(cacheKey);

            // Si no hay banda en caché, usar banda rápida en función del índice de planta para que cada planta tenga altura distinta
            if (!band) {
              const cam: any = (world as any).camera;
              const targetY = cam?.controls?.target?.y ?? cam?.position?.y ?? 0;
              const store = modelStore.getState();
              const floors = store.floors || [];
              let idx = floors.findIndex((f: any) => (f.Name?.value || f.expressID) === floorName);
              // Si no se encuentra en floors, usar el orden de la clasificación
              if (idx < 0 && levelsClassification) {
                const ordered = Array.from(levelsClassification.keys());
                idx = ordered.findIndex(n => n === floorName);
              }
              // Fallback: extraer número de planta del nombre (e.g., P03 -> 3)
              if (idx < 0) {
                const m = /(-?\d+)/.exec(floorName);
                if (m) idx = parseInt(m[1], 10);
              }
              // Estimar altura de planta a partir de bandas ya cacheadas en el edificio
              const cachedBands: { yMin: number; yMax: number }[] = [];
              for (const [k, v] of (yBandCache as any).entries()) {
                if (k.startsWith(`${store.activeBuildingCode || 'UNK'}:`)) cachedBands.push(v);
              }
              const avgH = cachedBands.length ? (cachedBands.reduce((s, b) => s + (b.yMax - b.yMin), 0) / cachedBands.length) : 3.2;
              const groundY = cachedBands.length ? Math.min(...cachedBands.map(b => b.yMin)) : targetY;
              const centerY = groundY + Math.max(0, idx) * avgH;
              const quickHalf = Math.max(1.2, avgH * 0.5);
              band = { yMin: centerY - quickHalf, yMax: centerY + quickHalf };
              console.log(`[Clip quick] ${floorName} idx=${idx} ground=${groundY.toFixed(2)} avgH=${avgH.toFixed(2)} centerY=${centerY.toFixed(2)} h=${(2*quickHalf).toFixed(2)}`);
            }

            // Aplicar clipping inmediato
            const margin = 0.75;
            const top = band.yMax + margin;
            const bottom = band.yMin - margin;
            const upperPlane = new THREE.Plane(new THREE.Vector3(0, -1, 0), top);
            const lowerPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -bottom);
            try {
              (world.renderer as any).three.clippingPlanes = [upperPlane, lowerPlane];
            } catch (e) {
              console.warn('No se pudieron aplicar clipping planes', e);
            }
            try { await fragmentsMgr.core.update(true); } catch {}

            // Cambiar automáticamente a vista 2D cenital al seleccionar una planta
            try {
              if (cameraUtils) {
                selectedView = '2D';
                cameraUtils.setControlsFor2D(); // bloquea órbita y asigna pan con botón izquierdo
                await cameraUtils.viewFrom2DTop(99.01);
              }
            } catch {}

            // Cálculo preciso optimizado en background: muestreo y token anti-acumulación
            (globalThis as any).__clipToken = ((globalThis as any).__clipToken ?? 0) + 1;
            const myToken = (globalThis as any).__clipToken;
            const sample = (arr: number[], n: number) => {
              if (arr.length <= n) return arr;
              const step = arr.length / n;
              const out: number[] = [];
              for (let i = 0; i < n; i++) out.push(arr[Math.floor(i * step)]);
              return out;
            };
            (async () => {
              try {
                const floorFragments = await floorData.get();
                if ((globalThis as any).__clipToken !== myToken) return; // cancelado
                let yMin = Number.POSITIVE_INFINITY;
                let yMax = Number.NEGATIVE_INFINITY;
                const MAX_PER_MODEL = 400;
                for (const [modelId, ids] of Object.entries(floorFragments as Record<string, number[] | Set<number>>)) {
                  const model = fragmentsMgr.list.get(modelId);
                  if (!model) continue;
                  const localIdsArray = Array.isArray(ids) ? (ids as number[]) : Array.from(ids as Set<number>);
                  if (!localIdsArray.length) continue;
                  const sampled = sample(localIdsArray, MAX_PER_MODEL);
                  try {
                    const positions = await model.getPositions(sampled);
                    if (!positions) continue;
                    for (const p of positions as any[]) {
                      const y = (p.y ?? p[1] ?? 0);
                      if (y < yMin) yMin = y;
                      if (y > yMax) yMax = y;
                    }
                  } catch {}
                  if ((globalThis as any).__clipToken !== myToken) return; // cancelado
                }
                if (isFinite(yMin) && isFinite(yMax) && (globalThis as any).__clipToken === myToken) {
                  const computed = { yMin, yMax };
                  yBandCache.set(cacheKey, computed);
                  const t = computed.yMax + margin;
                  const b = computed.yMin - margin;
                  const up = new THREE.Plane(new THREE.Vector3(0, -1, 0), t);
                  const lo = new THREE.Plane(new THREE.Vector3(0, 1, 0), -b);
                  try {
                    (world.renderer as any).three.clippingPlanes = [up, lo];
                  } catch {}
                  try { await fragmentsMgr.core.update(true); } catch {}
                  console.log(`[Clip precise-sampled] ${floorName} yMin=${yMin.toFixed(2)} yMax=${yMax.toFixed(2)}`);
                }
              } catch {}
            })();
          } else {
            console.warn('⚠️ No hay datos de planta para clipping', floorName);
          }
        } else {
          console.warn('❌ No hay clasificación de niveles disponible');
        }

        //console.log('=== FINALIZADA BÚSQUEDA DE INFORMACIÓN ===');
      }

      // Forzar re-renderización para actualizar el estado de los botones
      if (update) {
        update();
      }
    } catch (error) {
      console.error('Error al seleccionar planta:', error);
    }
  };



  const onToggleView = async ({ target }: { target: BUI.Button }, is3D: boolean) => {
    //console.log('Toggle view:', is3D ? '3D' : '2D');

    try {
      // Actualizar el estado de la vista seleccionada
      selectedView = is3D ? '3D' : '2D';
      //console.log('Vista seleccionada:', selectedView);

      if (is3D) {
        // Vista 3D: restablecer controles y centrar
        if (cameraUtils) {
          cameraUtils.setControlsFor3D();
          await cameraUtils.fitToAllModels();
          //console.log('Vista 3D establecida');
        }
      } else {
        // Vista 2D: bloquear órbita y pan con botón izquierdo
        if (cameraUtils) {
          cameraUtils.setControlsFor2D();
          await cameraUtils.viewFrom2DTop(99.01);
          //console.log('Vista 2D cenital establecida con rotación');
        }
      }

      // Forzar re-renderización para actualizar el estado de los botones
      if (update) {
        update();
      }
    } catch (error) {
      console.error('Error al cambiar vista:', error);
    }
  };

  // Obtener el estado actual del store
  const storeState = modelStore.getState();
  const floors = storeState.floors || [];
  const modelsReady = storeState.hasModels && floors.length > 0 && storeState.levelsClassification;
  const isMAP = (storeState.activeBuildingCode || '').toUpperCase() === 'MAP';

  /*console.log('FloorSelector - Estado actual:', {
    hasModels: storeState.hasModels,
    floorsLength: floors.length,
    levelsClassification: !!storeState.levelsClassification,
    modelsReady,
    selectedFloor,
    selectedView
  });*/

  const displayFloors = floors.length > 0 ?
    [...floors].reverse().map((floor: any) => ({
      ...floor,
      displayName: floor.Name.value || floor.expressID,
      originalName: floor.Name.value || floor.expressID
    })) : [];

  // Suscribirse al store para re-renderizar cuando cambie el estado
  modelStore.subscribe((newState) => {
    /*console.log('FloorSelector - Store actualizado:', {
      hasModels: newState.hasModels,
      floorsLength: newState.floors?.length,
      levelsClassification: !!newState.levelsClassification
    });*/

    // Forzar la re-renderización del componente
    if (update) {
      update();
    }
  });

  return BUI.html`
    <div class="floor-selector-container">
      <div class="floor-selector-panel">
        <div class="view-toggle-buttons">
          <button class="view-toggle-button ${selectedView === '3D' ? 'active' : ''}" @click=${(e: any) => onToggleView(e, true)}>3D</button>
          <button class="view-toggle-button ${selectedView === '2D' ? 'active' : ''}" @click=${(e: any) => onToggleView(e, false)}>2D</button>
        </div>

        ${!isMAP ? BUI.html`
          <button 
            class="floor-button ${selectedFloor === 'all' ? 'active' : ''}"
            @click=${(e: any) => onFloorSelect(e, 'all')}
          >
            Tot
          </button>

          ${displayFloors.length > 0 ?
            displayFloors.map((floor: any) => BUI.html`
              <button 
                class="floor-button ${selectedFloor === floor.originalName ? 'active' : ''}"
                @click=${(e: any) => onFloorSelect(e, floor.originalName)}
                ?disabled=${!modelsReady}
                style="${!modelsReady ? 'opacity: 0.5; cursor: not-allowed;' : ''}"
              >
                ${floor.displayName}
              </button>
            `) :
            BUI.html`<div class="no-floors-message"></div>`
          }
        ` : BUI.html``}


      </div>
    </div>
  `;
}; 