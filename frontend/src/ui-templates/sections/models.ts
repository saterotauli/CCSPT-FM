import * as BUI from "@thatopen/ui";
import * as CUI from "@thatopen/ui-obc";
import * as OBC from "@thatopen/components";
import { appIcons, BUILDINGS } from "../../globals";
import { loadBuilding } from "../../utils/BuildingLoader";

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

    // Use shared loader
    await loadBuilding(components, building.value);

    // Refresh this panel UI after loading
    setTimeout(() => update(state), 0);
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


