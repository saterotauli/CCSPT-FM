import * as BUI from "@thatopen/ui";
import * as CUI from "@thatopen/ui-obc";
import * as OBC from "@thatopen/components";
import * as OBF from "@thatopen/components-front";
import { appIcons, modelStore } from "../../globals";

export interface ElementsDataPanelState {
  components: OBC.Components;
}

export const elementsDataPanelTemplate: BUI.StatefullComponent<
  ElementsDataPanelState
> = (state) => {
  const { components } = state;

  const fragments = components.get(OBC.FragmentsManager);
  const highlighter = components.get(OBF.Highlighter);

  const [propsTable, updatePropsTable] = CUI.tables.itemsData({
    components,
    modelIdMap: {},
  });

  propsTable.preserveStructureOnFilter = true;
  // fragments.onFragmentsDisposed.add(() => updatePropsTable());

  // Helpers for Selection Editor
  const selectionEditorId = BUI.Manager.newRandomId();
  let currentGuid: string | undefined;
  let currentRow: any | undefined; // data returned from backend for selected guid

  async function resolveFirstGuid(modelIdMap: OBC.ModelIdMap): Promise<string | undefined> {
    try {
      const entries = Object.entries(modelIdMap || {});
      if (!entries.length) return undefined;
      const [modelId, idsSet] = entries[0];
      const ids = Array.from(idsSet as Set<number>);
      if (!ids.length) return undefined;
      const localId = ids[0];
      const model = fragments.list.get(modelId);
      if (!model) return undefined;
      const [item] = await (model as any).getItemsData([localId], { attributesDefault: true });
      const guid = item?._guid?.value || item?._guid;
      return typeof guid === 'string' ? guid : undefined;
    } catch { return undefined; }
  }

  async function fetchRowForGuid(guid: string) {
    const edifici = modelStore.getState().activeBuildingCode || '';
    if (!edifici) return undefined;
    try {
      const url = `/api/ifcspace/devices?guids=${encodeURIComponent(guid)}&edifici=${encodeURIComponent(edifici)}`;
      const res = await fetch(url, { headers: { Accept: 'application/json' } });
      if (!res.ok) return undefined;
      const arr = await res.json();
      return Array.isArray(arr) && arr.length ? arr[0] : undefined;
    } catch { return undefined; }
  }

  function renderSelectionForm(row?: any) {
    const container = document.getElementById(selectionEditorId);
    if (!container) return;
    if (!row) {
      container.innerHTML = `<div style="opacity:.7;font-size:.9rem;">Cap element seleccionat</div>`;
      return;
    }
    const dispositiu = row?.dispositiu ?? '';
    const departament = row?.departament ?? '';
    const id = row?.id ?? '';
    const centre_cost = row?.centre_cost ?? '';
    const area = row?.area ?? '';

    container.innerHTML = `
      <div style="display:grid; gap:.5rem; grid-template-columns: 1fr;">
        <bim-text-input label="Dispositiu" value="${String(dispositiu)}" data-field="dispositiu"></bim-text-input>
        <bim-text-input label="Departament" value="${String(departament)}" data-field="departament"></bim-text-input>
        <bim-text-input label="ID" value="${String(id)}" data-field="id"></bim-text-input>
        <bim-text-input label="Centre de cost" value="${String(centre_cost)}" data-field="centre_cost"></bim-text-input>
        <bim-text-input label="Àrea (m²)" value="${String(area)}" disabled></bim-text-input>
        <div style="display:flex; gap:.5rem; justify-content:flex-end; margin-top:.25rem;">
          <bim-button appearance="primary" id="btn-save-selection" label="Guardar"></bim-button>
        </div>
      </div>
    `;

    const saveBtn = document.getElementById('btn-save-selection');
    if (saveBtn) {
      saveBtn.addEventListener('click', async () => {
        if (!currentGuid) return;
        const editor = document.getElementById(selectionEditorId)!;
        const getVal = (name: string) => (editor.querySelector(`[data-field="${name}"]`) as any)?.value ?? '';
        const payload = {
          guid: currentGuid,
          edifici: modelStore.getState().activeBuildingCode,
          dispositiu: getVal('dispositiu'),
          departament: getVal('departament'),
          id: getVal('id'),
          centre_cost: getVal('centre_cost'),
        } as any;
        try {
          (saveBtn as any).disabled = true;
          (saveBtn as any).setAttribute('label', 'Desant...');
          const res = await fetch('/api/ifcspace/item', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          });
          const ok = res.ok;
          // Simple feedback
          (saveBtn as any).disabled = false;
          const msg = ok ? '✅ Desat' : '❌ Error desant';
          (saveBtn as any).setAttribute('label', msg);
          setTimeout(() => { (saveBtn as any).setAttribute('label', 'Guardar'); }, 1200);
          // Refresh data in form after save
          if (ok && currentGuid) {
            const refreshed = await fetchRowForGuid(currentGuid);
            currentRow = refreshed;
            renderSelectionForm(currentRow);
            // Update marker datasets for this GUID and notify label refresh
            try {
              const selector = `[data-marker="ifcspace"][data-guid="${currentGuid}"]`;
              const markers = document.querySelectorAll(selector);
              markers.forEach((el) => {
                const h = el as HTMLElement;
                (h as any).dataset.name = payload.dispositiu || '';
                (h as any).dataset.id = payload.id ? String(payload.id) : '';
                (h as any).dataset.cc = payload.centre_cost || '';
              });
              window.dispatchEvent(new CustomEvent('ccspt:refresh-ifcspace-labels'));
            } catch {}
          }
        } catch {
          (saveBtn as any).setAttribute('label', '❌ Error desant');
          setTimeout(() => { (saveBtn as any).setAttribute('label', 'Guardar'); }, 1400);
        }
      });
    }
  }

  highlighter.events.select.onHighlight.add(async (modelIdMap) => {
    updatePropsTable({ modelIdMap });
    currentGuid = await resolveFirstGuid(modelIdMap);
    if (currentGuid) {
      currentRow = await fetchRowForGuid(currentGuid);
      renderSelectionForm(currentRow);
    } else {
      currentRow = undefined;
      renderSelectionForm(undefined);
    }
  });

  highlighter.events.select.onClear.add(() => {
    // const panel = document.getElementById("data")!;
    // panel.style.display = "none";
    updatePropsTable({ modelIdMap: {} });
    currentGuid = undefined;
    currentRow = undefined;
    renderSelectionForm(undefined);
  });

  const search = (e: Event) => {
    const input = e.target as BUI.TextInput;
    propsTable.queryString = input.value;
  };

  const toggleExpanded = () => {
    propsTable.expanded = !propsTable.expanded;
  };

  const sectionId = BUI.Manager.newRandomId();

  return BUI.html`
    <bim-panel-section fixed id=${sectionId} icon=${appIcons.TASK} label="Dades de selecció">
      <div style="display: flex; gap: 0.375rem;">
        <bim-text-input @input=${search} vertical placeholder="Cercar..." debounce="200"></bim-text-input>
        <bim-button style="flex: 0;" @click=${toggleExpanded} icon=${appIcons.EXPAND}></bim-button>
        <bim-button style="flex: 0;" @click=${() => propsTable.downloadData("ElementData", "tsv")} icon=${appIcons.EXPORT} tooltip-title="Exportar dades" tooltip-text="Exportar les propietats mostrades a TSV."></bim-button>
      </div>
      <div style="margin-top:.5rem; padding:.5rem; border:1px solid var(--bui-grey-700); border-radius:.375rem;">
        <div style="font-weight:600; margin-bottom:.25rem;">Paràmetres (IFCSPACE)</div>
        <div id=${selectionEditorId}></div>
      </div>
      ${propsTable}
    </bim-panel-section> 
  `;
};
