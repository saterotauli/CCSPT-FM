import * as OBC from "@thatopen/components";
import * as BUI from "@thatopen/ui";
import * as TEMPLATES from "..";
import {
  CONTENT_GRID_GAP,
  CONTENT_GRID_ID,
  SMALL_COLUMN_WIDTH,
  MEDIUM_COLUMN_WIDTH,
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

// This slot can render Actius (FM) or Espais panels depending on pageMode
type Actius = {
  name: "actius";
  state: TEMPLATES.ActiusPanelState | TEMPLATES.EspaisPanelState;
};

type Queries = { name: "queries"; state: TEMPLATES.QueriesPanelState };

export type ContentGridElements = [Viewer, Models, ElementData, Queries, Actius];

export type ContentGridLayouts = ["Viewer"];

export interface ContentGridState {
  components: OBC.Components;
  id: string;
  viewportTemplate: BUI.StatelessComponent;
  onModelsLoaded?: () => void;
  pageMode?: "fm" | "espais";
  mobile?: boolean;
}

export const contentGridTemplate: BUI.StatefullComponent<ContentGridState> = (
  state,
) => {
  const { components, onModelsLoaded, pageMode, mobile } = state;

  const onCreated = (e?: Element) => {
    if (!e) return;
    const grid = e as BUI.Grid<ContentGridLayouts, ContentGridElements>;

    const hidden = (() => BUI.html`<div style="display:none"></div>`) as unknown as BUI.StatefullComponent<any>;

    // Layout fijo - no más redimensionamiento dinámico

    grid.elements = mobile
      ? {
          // Mobile: ocultar todo menos el visor
          models: { template: hidden, initialState: {} as any },
          elementData: { template: hidden, initialState: {} as any },
          queries: { template: hidden, initialState: {} as any },
          actius: { template: hidden as unknown as BUI.StatefullComponent<TEMPLATES.ActiusPanelState | TEMPLATES.EspaisPanelState>, initialState: {} as any },
          viewer: state.viewportTemplate,
        }
      : {
          models: pageMode === "espais"
            ? {
                // Hidden placeholder: keeps the grid area but hides the panel visually
                template: hidden,
                initialState: {} as any,
              }
            : {
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
          actius: pageMode === "espais"
            ? {
                template: TEMPLATES.espaisPanelTemplate as unknown as BUI.StatefullComponent<TEMPLATES.ActiusPanelState | TEMPLATES.EspaisPanelState>,
                initialState: { components },
              }
            : {
                template: TEMPLATES.actiusPanelTemplate,
                initialState: { components },
              },
          viewer: state.viewportTemplate,
        };

    // Layout: in Espais mode, show right-side info panel (elementData)
    grid.layouts = mobile
      ? {
          Viewer: {
            template: `
              "viewer" 1fr
              /1fr
            `,
          },
        }
      : pageMode === "espais"
        ? {
            Viewer: {
              template: `
                "actius viewer elementData" 1fr
                "actius viewer elementData" 1fr
                "actius viewer elementData" 2fr
                /300px 1fr 300px
              `,
            },
          }
        : {
            Viewer: {
              template: `
                "actius viewer elementData" 1fr
                "actius viewer elementData" 1fr
                "actius viewer elementData" 2fr
                /300px 1fr 300px
              `,
            },
          };

    // Layout fijo aplicado
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
