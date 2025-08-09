import * as BUI from "@thatopen/ui";
import * as OBC from "@thatopen/components";
import * as OBF from "@thatopen/components-front";
import * as FRAGS from "@thatopen/fragments";
import * as THREE from "three";
import { appIcons, tooltips } from "../../globals";

export interface ViewerToolbarState {
  components: OBC.Components;
  world: OBC.World;
}

const originalColors = new Map<
  FRAGS.BIMMaterial,
  { color: number; transparent: boolean; opacity: number }
>();

const setModelTransparent = (components: OBC.Components) => {
  const fragments = components.get(OBC.FragmentsManager);

  const materials = [...fragments.core.models.materials.list.values()];
  for (const material of materials) {
    if (material.userData.customId) continue;
    // save colors
    let color: number | undefined;
    if ("color" in material) {
      color = material.color.getHex();
    } else {
      color = material.lodColor.getHex();
    }

    originalColors.set(material, {
      color,
      transparent: material.transparent,
      opacity: material.opacity,
    });

    // set color
    material.transparent = true;
    material.opacity = 0.05;
    material.needsUpdate = true;
    if ("color" in material) {
      material.color.setColorName("white");
    } else {
      material.lodColor.setColorName("white");
    }
  }
};

const restoreModelMaterials = () => {
  for (const [material, data] of originalColors) {
    const { color, transparent, opacity } = data;
    material.transparent = transparent;
    material.opacity = opacity;
    if ("color" in material) {
      material.color.setHex(color);
    } else {
      material.lodColor.setHex(color);
    }
    material.needsUpdate = true;
  }
  originalColors.clear();
};

export const viewerToolbarTemplate: BUI.StatefullComponent<
  ViewerToolbarState
> = (state, update) => {
  const { components, world } = state;

  const highlighter = components.get(OBF.Highlighter);
  const hider = components.get(OBC.Hider);
  const lengthMeasurer = components.get(OBF.LengthMeasurement);
  const areaMeasurer = components.get(OBF.AreaMeasurement);
  const clipper = components.get(OBC.Clipper);

  const onToggleGhost = () => {
    if (originalColors.size) {
      restoreModelMaterials();
    } else {
      setModelTransparent(components);
    }
  };

  // Tool functions for the "Eines" section
  const areMeasurementsEnabled = lengthMeasurer.enabled || areaMeasurer.enabled;

  const disableAll = (exceptions?: ("clipper" | "length" | "area")[]) => {
    BUI.ContextMenu.removeMenus();
    highlighter.clear("select");
    highlighter.enabled = false;
    if (!exceptions?.includes("length")) lengthMeasurer.enabled = false;
    if (!exceptions?.includes("area")) areaMeasurer.enabled = false;
    if (!exceptions?.includes("clipper")) clipper.enabled = false;
  };

  const onLengthMeasurement = () => {
    disableAll(["length"]);
    lengthMeasurer.enabled = !lengthMeasurer.enabled;
    highlighter.enabled = !lengthMeasurer.enabled;
    update(state);
  };

  const onAreaMeasurement = () => {
    disableAll(["area"]);
    areaMeasurer.enabled = !areaMeasurer.enabled;
    highlighter.enabled = !areaMeasurer.enabled;
    update(state);
  };

  const onModelSection = () => {
    disableAll(["clipper"]);
    clipper.enabled = !clipper.enabled;
    highlighter.enabled = !clipper.enabled;
    update(state);
  };

  const onMeasurementsClick = () => {
    if (areMeasurementsEnabled) {
      lengthMeasurer.enabled = false;
      areaMeasurer.enabled = false;
      highlighter.enabled = true;
    }
    update(state);
  };

  let focusBtn: BUI.TemplateResult | undefined;
  if (world.camera instanceof OBC.SimpleCamera) {
    const onFocus = async ({ target }: { target: BUI.Button }) => {
      if (!(world.camera instanceof OBC.SimpleCamera)) return;
      const selection = highlighter.selection.select;
      target.loading = true;
      await world.camera.fitToItems(
        OBC.ModelIdMapUtils.isEmpty(selection) ? undefined : selection,
      );
      target.loading = false;
    };

    focusBtn = BUI.html`<bim-button tooltip-title=${tooltips.FOCUS.TITLE} tooltip-text=${tooltips.FOCUS.TEXT} icon=${appIcons.FOCUS} label="Enfocar" @click=${onFocus}></bim-button>`;
  }

  const onHide = async ({ target }: { target: BUI.Button }) => {
    const selection = highlighter.selection.select;
    if (OBC.ModelIdMapUtils.isEmpty(selection)) return;
    target.loading = true;
    await hider.set(false, selection);
    target.loading = false;
  };

  const onIsolate = async ({ target }: { target: BUI.Button }) => {
    const selection = highlighter.selection.select;
    if (OBC.ModelIdMapUtils.isEmpty(selection)) return;
    target.loading = true;
    await hider.isolate(selection);
    target.loading = false;
  };

  const onShowAll = async ({ target }: { target: BUI.Button }) => {
    target.loading = true;
    await hider.set(true);
    target.loading = false;
  };



  const colorInputId = BUI.Manager.newRandomId();
  const getColorValue = () => {
    const input = document.getElementById(
      colorInputId,
    ) as BUI.ColorInput | null;
    if (!input) return null;
    return input.color;
  };

  const onApplyColor = async ({ target }: { target: BUI.Button }) => {
    const colorValue = getColorValue();
    const selection = highlighter.selection.select;
    if (OBC.ModelIdMapUtils.isEmpty(selection) || !colorValue) return;
    const color = new THREE.Color(colorValue);
    const style = [...highlighter.styles.entries()].find(([, definition]) => {
      if (!definition) return false;
      return definition.color.getHex() === color.getHex();
    });
    target.loading = true;
    if (style) {
      const name = style[0];
      if (name === "select") {
        target.loading = false;
        return;
      }
      await highlighter.highlightByID(name, selection, false, false);
    } else {
      highlighter.styles.set(colorValue, {
        color,
        renderedFaces: FRAGS.RenderedFaces.ONE,
        opacity: 1,
        transparent: false,
      });
      await highlighter.highlightByID(colorValue, selection, false, false);
    }
    await highlighter.clear("select");
    target.loading = false;
  };

  return BUI.html`
    <bim-toolbar>
      <bim-toolbar-section label="Visibilitat" icon=${appIcons.SHOW}>
        <bim-button tooltip-title=${tooltips.SHOW_ALL.TITLE} tooltip-text=${tooltips.SHOW_ALL.TEXT} icon=${appIcons.SHOW} label="Mostrar Tot" @click=${onShowAll}></bim-button> 
        <bim-button tooltip-title=${tooltips.GHOST.TITLE} tooltip-text=${tooltips.GHOST.TEXT} icon=${appIcons.TRANSPARENT} label="Mode Fantasma" @click=${onToggleGhost}></bim-button>
      </bim-toolbar-section> 
      <bim-toolbar-section label="Selecció" icon=${appIcons.SELECT}>
        ${focusBtn}
        <bim-button tooltip-title=${tooltips.HIDE.TITLE} tooltip-text=${tooltips.HIDE.TEXT} icon=${appIcons.HIDE} label="Amagar" @click=${onHide}></bim-button> 
        <bim-button tooltip-title=${tooltips.ISOLATE.TITLE} tooltip-text=${tooltips.ISOLATE.TEXT} icon=${appIcons.ISOLATE} label="Aïllar" @click=${onIsolate}></bim-button>
        <bim-button icon=${appIcons.COLORIZE} label="Color">
          <bim-context-menu>
            <div style="display: flex; gap: 0.5rem; width: 10rem;">
              <bim-color-input id=${colorInputId}></bim-color-input>
              <bim-button label="Aplicar" @click=${onApplyColor}></bim-button>
            </div>
          </bim-context-menu>
        </bim-button>
      </bim-toolbar-section>
      <bim-toolbar-section label="Eines" icon=${appIcons.SETTINGS}>
        <bim-button @click=${onMeasurementsClick} ?active=${areMeasurementsEnabled} label="Mesurament" tooltip-title="Mesurament" icon=${appIcons.RULER}>
          <bim-context-menu>
            <bim-button ?active=${lengthMeasurer.enabled} label="Longitud" @click=${onLengthMeasurement}></bim-button>
            <bim-button ?active=${areaMeasurer.enabled} label="Àrea" @click=${onAreaMeasurement}></bim-button>
          </bim-context-menu>
        </bim-button>
        <bim-button ?active=${clipper.enabled} @click=${onModelSection} label="Secció" tooltip-title="Secció del Model" icon=${appIcons.CLIPPING}></bim-button> 
      </bim-toolbar-section>
    </bim-toolbar>
  `;
};
