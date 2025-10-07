import * as BUI from "@thatopen/ui";
import * as OBC from "@thatopen/components";
import * as CUI from "@thatopen/ui-obc";
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

  const [element] = CUI.queriesList({ components });

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
