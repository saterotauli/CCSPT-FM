import * as OBC from "@thatopen/components";
import * as BUI from "@thatopen/ui";
import { ViewerToolbarState, viewerToolbarTemplate, floorSelectorTemplate } from "..";

type BottomToolbar = { name: "bottomToolbar"; state: ViewerToolbarState };
type FloorSelector = { name: "floorSelector"; state: ViewerToolbarState };

type ViewportGridElements = [BottomToolbar, FloorSelector];

type ViewportGridLayouts = ["main"];

interface ViewportGridState {
  components: OBC.Components;
  world: OBC.World;
}

export const viewportGridTemplate: BUI.StatefullComponent<ViewportGridState> = (
  state,
) => {
  const { components, world } = state;



  const elements: BUI.GridComponents<ViewportGridElements> = {
    bottomToolbar: {
      template: viewerToolbarTemplate,
      initialState: { components, world },
    },
    floorSelector: {
      template: floorSelectorTemplate,
      initialState: { components, world },
    },
  };

  const onCreated = (e?: Element) => {
    if (!e) return;
    const grid = e as BUI.Grid<ViewportGridLayouts, ViewportGridElements>;
    grid.elements = elements;

    grid.layouts = {
      main: {
        template: `
          "floorSelector messages" auto
          "floorSelector empty" 1fr
          "bottomToolbar bottomToolbar" auto
          /auto 1fr
        `,
      },
    };
  };

  return BUI.html`<bim-grid ${BUI.ref(onCreated)} layout="main" floating></bim-grid>`;
};
