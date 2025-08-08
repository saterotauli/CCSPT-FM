import * as BUI from "@thatopen/ui";
import * as OBC from "@thatopen/components";
import * as OBF from "@thatopen/components-front";
import * as FRAGS from "@thatopen/fragments";
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
        await hider.set(true);
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
            //console.log('📊 Obteniendo fragmentos del nivel...');
            const floorFragments = await floorData.get();
            //console.log('🔍 Fragmentos del nivel', floorName, ':', floorFragments);
            //console.log('📈 Número total de elementos en el nivel:', Object.keys(floorFragments).length);

            if (floorFragments && Object.keys(floorFragments).length > 0) {
              //console.log('🎯 Elementos que se van a aislar para el nivel', floorName, ':');
              Object.entries(floorFragments).forEach(([modelId, fragments]) => {
                //console.log(`  📦 Modelo ${modelId}:`, fragments);
                //console.log(`     Tipo de datos:`, typeof fragments);
                //console.log(`     Es array:`, Array.isArray(fragments));
                console.log(`     Longitud:`, Array.isArray(fragments) ? fragments.length : 'N/A');
              });

              //console.log('🚀 Ejecutando aislamiento...');
              await hider.isolate(floorFragments);
              // already notified above
              //console.log('✅ Elementos aislados correctamente para el nivel:', floorName);
            } else {
              console.warn('⚠️ No hay elementos para aislar en el nivel:', floorName);
            }
          } else {
            console.warn('❌ No se encontraron datos para el nivel:', floorName);
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
        // Vista 3D: centrar en todos los modelos
        if (cameraUtils) {
          await cameraUtils.fitToAllModels();
          //console.log('Vista 3D establecida');
        }
      } else {
        // Vista 2D: vista cenital desde arriba con rotación
        if (cameraUtils) {
          // Aplicar rotación de 99.01 grados para alinear los muros con el visor
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


      </div>
    </div>
  `;
}; 