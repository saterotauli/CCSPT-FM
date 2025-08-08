import * as BUI from "@thatopen/ui";
import * as CUI from "@thatopen/ui-obc";
import * as OBC from "@thatopen/components";
import { appIcons, BUILDINGS } from "../../globals";
import { modelStore } from "../../globals";
import { ClassificationUtils } from "../../utils/ClassificationUtils";

export interface ModelsPanelState {
  components: OBC.Components;
  onModelsLoaded?: () => void;
  viewCategory?: "Espais" | "Instal·lacions";
  subCategory?: string;
}

export const modelsPanelTemplate: BUI.StatefullComponent<ModelsPanelState> = (
  state,
  update,
) => {
  const { components } = state;

  const fragments = components.get(OBC.FragmentsManager);
  
  // Escuchar eventos de edificios cargados desde actius
  if (!(globalThis as any).__modelsPanelSubscribed) {
    (globalThis as any).__modelsPanelSubscribed = true;
    
    window.addEventListener('ccspt:building-loaded', async (event: any) => {
      const { buildingCode, fragments: newFragments } = event.detail;
      console.log(`🏢 Panel de edificios: Edificio ${buildingCode} cargado desde actius`);
      
      // Forzar actualización de la interfaz
      setTimeout(() => {
        update(state);
      }, 100);
    });
  }

  const [modelsList] = CUI.tables.modelsList({
    components,
    actions: { download: false },
  });

  const customModelsList = () => {
    if (!fragments.list.size) {
      return BUI.html`
        <div style="color: var(--bim-ui_bg-contrast-60); font-size: 0.875rem; text-align: center; padding: 1rem;">
          No hay modelos cargados
        </div>
      `;
    }

    return modelsList;
  };

  const onAddIfcModel = async () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".ifc";
    input.onchange = async (event) => {
      const file = (event.target as HTMLInputElement).files?.[0];
      if (!file) return;

      const ifcLoader = components.get(OBC.IfcLoader);
      const buffer = await file.arrayBuffer();
      const bytes = new Uint8Array(buffer);
      await ifcLoader.load(bytes, true, file.name.replace(".ifc", ""));
    };
    input.click();
  };

  const onAddFragmentsModel = async () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".frag";
    input.multiple = true;
    input.onchange = async (event) => {
      const files = (event.target as HTMLInputElement).files;
      if (!files) return;

      for (const file of Array.from(files)) {
        await fragments.core.load(await file.arrayBuffer(), {
          modelId: file.name.replace(".frag", ""),
        });
      }
    };
    input.click();
  };

  const onLoadBuilding = async ({ target }: { target: BUI.Dropdown }) => {
    const selectedValue = target.value[0];
    if (!selectedValue) return;

    const building = BUILDINGS.find(b => b.value === selectedValue);
    if (!building) return;

    //console.log(`Cargando edificio: ${building.label} (${building.file})`);

    try {
      // No limpiar modelos existentes - dejar que se acumulen
      //console.log('Cargando nuevos modelos sin eliminar los existentes...');

      // Obtener archivos por edificio

      // Lista de archivos conocidos para cada edificio
      const buildingFiles: Record<string, string[]> = {
        'RAC': ['CCSPT-RAC-M3D-AS.frag'],
        'TOC': ['CCSPT-TOC-M3D-AS.frag'],
        'ALB': ['CCSPT-ALB-M3D-AS.frag'],
        'CQA': ['CCSPT-CQA-M3D-AS.frag'],
        'MIN': ['CCSPT-MIN-M3D-AS.frag'],
        'UDI': ['CCSPT-UDI-M3D-AS.frag', 'CCSPT-UDI-M3D-ME.frag'],
        'VII': ['CCSPT-VII-M3D-AS.frag']
      };

      const filesToLoad = buildingFiles[building.value] || [building.file];
      //console.log(`Archivos a cargar: ${filesToLoad.join(', ')}`);

      // Cargar todos los archivos del edificio
      for (const fileName of filesToLoad) {
        //console.log(`Cargando archivo: ${fileName}`);

        const response = await fetch(`/models/${fileName}`);
        if (!response.ok) {
          console.error(`Error loading file: ${fileName} - ${response.status} ${response.statusText}`);
          continue; // Continuar con el siguiente archivo si este falla
        }

        //console.log(`Archivo ${fileName} descargado correctamente`);
        const buffer = await response.arrayBuffer();
        const bytes = new Uint8Array(buffer);
        //console.log(`Buffer size: ${bytes.length} bytes`);

        // Cargar el modelo
        const modelId = fileName.replace(".frag", "");
        await fragments.core.load(bytes, {
          modelId: modelId,
        });

        //console.log(`Modelo ${fileName} cargado exitosamente con ID: ${modelId}`);

        // Verificar que el modelo se cargó correctamente
        const loadedModel = fragments.list.get(modelId);
        if (loadedModel) {
          //console.log(`Modelo ${modelId} verificado en la lista de fragmentos`);
        } else {
          console.warn(`Modelo ${modelId} no encontrado en la lista de fragmentos`);
        }
      }

      //console.log(`Todos los modelos del edificio ${building.label} han sido cargados`);
      // Guardar edificio activo en el store
      modelStore.setActiveBuilding(building.value);

      // Actualizar la escena y forzar el renderizado
      //console.log('Actualizando escena...');
      await fragments.core.update(true);



      // Enfocar la cámara en los modelos cargados
      try {
        //console.log('Intentando enfocar la cámara...');
        const worlds = components.get(OBC.Worlds);
        //console.log('Worlds obtenido:', worlds);
        //console.log('Lista de worlds:', Array.from(worlds.list.keys()));

        // Obtener el primer world disponible (ya que solo hay uno)
        const worldKeys = Array.from(worlds.list.keys());
        const worldId = worldKeys[0];
        const world = worlds.list.get(worldId);
        //console.log('World obtenido:', world);

        if (world) {
          //console.log('World camera type:', world.camera?.constructor.name);
          //console.log('Es SimpleCamera?', world.camera instanceof OBC.SimpleCamera);

          if (world.camera instanceof OBC.SimpleCamera) {
            //console.log('Enfocando cámara en los modelos...');
            await world.camera.fitToItems();
            //console.log('Cámara enfocada correctamente');
          } else {
            //console.log('La cámara no es del tipo esperado');
          }
        } else {
          //console.log('No se encontró ningún world');
        }
      } catch (error) {
        //console.log('No se pudo enfocar la cámara:', error);
      }

      // 12. Clasifica los elementos por niveles (plantas) usando ClassificationUtils
      console.log('=== INICIANDO CLASIFICACIÓN DINÁMICA DE ELEMENTOS ===');

      const classificationUtils = new ClassificationUtils(components);

      // Obtener los niveles disponibles del edificio
      const availableLevels = await classificationUtils.getAvailableLevels();
      console.log('📋 Niveles disponibles:', availableLevels);

      // Crear clasificación dinámica para todos los niveles
      const levelsClassification = await classificationUtils.createDynamicLevelClassification(availableLevels);
      console.log('🏗️ Clasificación dinámica creada:', levelsClassification);

      // Generar datos de pisos para el store
      let floorData = [];
      if (levelsClassification) {
        console.log('📊 Procesando datos de pisos...');
        for (const [groupName] of levelsClassification) {
          console.log(`  📋 Procesando nivel: ${groupName}`);

          floorData.push({
            Name: { value: groupName },
            expressID: groupName,
          });
        }
        console.log('✅ Pisos procesados:', floorData);
      } else {
        console.warn('❌ No se pudo crear la clasificación dinámica');
      }

      console.log('=== FINALIZADA CLASIFICACIÓN DINÁMICA ===');

      // Disparar evento global para FloorSelector con las plantas ya clasificadas
      //console.log('Disparando evento global para FloorSelector...');

      // Usar el store en lugar del evento directo
      modelStore.setModelsLoaded(fragments, floorData, levelsClassification);

      //console.log('Estado del store actualizado con plantas:', floorData);

      // Forzar actualización de la interfaz
      setTimeout(() => {
        //console.log('Actualizando interfaz...');
        update(state);
      }, 100);

    } catch (error) {
      console.error('Error loading building:', error);
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
      alert(`Error cargando el edificio: ${errorMessage}`);
    }
  };

  return BUI.html`
    <bim-panel-section fixed icon=${appIcons.MODEL} label="Edificis">
      <div style="display: flex; gap: 0.5rem; align-items: center; margin-bottom: 0.5rem;">
        <select 
          style="flex: 1; padding: 0.75rem; border: 1px solid var(--bim-ui_bg-contrast-40); border-radius: 0.375rem; background: var(--bim-ui_bg-contrast-20); color: var(--bim-ui_bg-contrast-100); font-size: 0.875rem; font-family: inherit; cursor: pointer; transition: all 0.2s ease; outline: none;"
          @change=${(e: Event) => {
      const select = e.target as HTMLSelectElement;
      const selectedValue = select.value;
      if (selectedValue) {
        const building = BUILDINGS.find(b => b.value === selectedValue);
        if (building) {
          onLoadBuilding({ target: { value: [selectedValue] } } as any);
        }
      }
    }}
          @focus=${(e: Event) => {
      const select = e.target as HTMLSelectElement;
      select.style.borderColor = 'var(--bim-ui_accent-base)';
      select.style.boxShadow = '0 0 0 2px rgba(40, 180, 215, 0.2)';
    }}
          @blur=${(e: Event) => {
      const select = e.target as HTMLSelectElement;
      select.style.borderColor = 'var(--bim-ui_bg-contrast-40)';
      select.style.boxShadow = 'none';
    }}
        >
          <option value="">Sel·lecciona edifici...</option>
          ${BUILDINGS.map(building =>
      BUI.html`<option value=${building.value}>${building.label}</option>`
    )}
        </select>
        <bim-button style="flex: 0;" icon=${appIcons.ADD}>
          <bim-context-menu style="gap: 0.25rem;">
            <bim-button label="IFC" @click=${onAddIfcModel}></bim-button>
            <bim-button label="Fragments" @click=${onAddFragmentsModel}></bim-button>
          </bim-context-menu> 
        </bim-button>
      </div>
            ${customModelsList()}
      
    </bim-panel-section>
  `;
};

/**
 * Función utilitaria para escalar solo elementos SPACE (habitaciones) en altura
 * @param components - Componentes de OBC
 * @param heightFactor - Factor de altura (por defecto 0.5 = 50% de altura)
 */
export const scaleSelectedElement = undefined as unknown as never;


