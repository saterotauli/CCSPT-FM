import * as OBC from "@thatopen/components";
import * as BUI from "@thatopen/ui";
import * as TEMPLATES from "..";
import {
  CONTENT_GRID_GAP,
  CONTENT_GRID_ID,
  SMALL_COLUMN_WIDTH,
} from "../../globals";

type Viewer = "viewer";

type Models = {
  name: "models";
  state: TEMPLATES.ModelsPanelState;
};

type ElementData = {
  name: "elementData";
  state: TEMPLATES.ElementsDataPanelState;
};

type Actius = { name: "actius"; state: TEMPLATES.ActiusPanelState };

type Queries = { name: "queries"; state: TEMPLATES.QueriesPanelState };

export type ContentGridElements = [Viewer, Models, ElementData, Queries, Actius];

export type ContentGridLayouts = ["Viewer"];

export interface ContentGridState {
  components: OBC.Components;
  id: string;
  viewportTemplate: BUI.StatelessComponent;
  onModelsLoaded?: () => void;
}

export const contentGridTemplate: BUI.StatefullComponent<ContentGridState> = (
  state,
) => {
  const { components, onModelsLoaded } = state;

  const onCreated = (e?: Element) => {
    if (!e) return;
    const grid = e as BUI.Grid<ContentGridLayouts, ContentGridElements>;

    grid.elements = {
      models: {
        template: TEMPLATES.modelsPanelTemplate,
        initialState: { components, onModelsLoaded },
      },
      elementData: {
        template: TEMPLATES.elementsDataPanelTemplate,
        initialState: { components },
      },
      queries: {
        template: TEMPLATES.queriesPanelTemplate,
        initialState: { components, isAdmin: true },
      },
      actius: {
        template: TEMPLATES.actiusPanelTemplate,
        initialState: { components },
      },
      viewer: state.viewportTemplate,
    };

    grid.layouts = {
      Viewer: {
        template: `
          "models viewer elementData" 1fr
          "actius viewer elementData" 1fr
          "actius viewer queries" 2fr
          /${SMALL_COLUMN_WIDTH} 1fr ${SMALL_COLUMN_WIDTH}
        `,
      },
    };
  };

  return BUI.html`
    <bim-grid id=${state.id} style="padding: ${CONTENT_GRID_GAP}; gap: ${CONTENT_GRID_GAP}" ${BUI.ref(onCreated)}></bim-grid>
  `;
};

export const getContentGrid = () => {
  const contentGrid = document.getElementById(CONTENT_GRID_ID) as BUI.Grid<
    ContentGridLayouts,
    ContentGridElements
  > | null;

  return contentGrid;
};
