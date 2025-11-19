import * as BUI from "@thatopen/ui";
import * as OBC from "@thatopen/components";
// import * as CUI from "@thatopen/ui-obc"; // Reserved for future use
import { appIcons } from "../../../../globals";

export interface QueriesPanelState {
  components: OBC.Components;
  isAdmin: boolean;
}

export const queriesPanelTemplate: BUI.StatefullComponent<QueriesPanelState> = (
  state,
) => {
  const { components, isAdmin } = state;
  const finder = components.get(OBC.ItemsFinder);

  // Note: queriesList may not be available in all versions of @thatopen/ui-obc
  // Using a placeholder element instead
  // @ts-ignore - queriesList may not exist in this version
  const [element] = CUI.queriesList ? CUI.queriesList({ components }) : [BUI.html`<div>Queries panel (feature not available in this version)</div>`];

  let exportBtn: BUI.TemplateResult | undefined;
  if (isAdmin) {
    const onExport = () => {
      const data = finder.export();
      const json = JSON.stringify(data);
      const blob = new Blob([json], { type: "application/json" });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = "queries.json";
      link.click();
      URL.revokeObjectURL(link.href);
    };

    exportBtn = BUI.html`
      <bim-button @click=${onExport} style="flex: 0" label="Export"></bim-button>
    `;
  }

  return BUI.html`
    <bim-panel-section fixed label="Queries" icon=${appIcons.SEARCH}>
      ${exportBtn}
      ${element}
    </bim-panel-section>
  `;
};
