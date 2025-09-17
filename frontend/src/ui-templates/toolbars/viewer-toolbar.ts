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

  // Garantizar que inician desactivados para que los botones no salgan resaltados
  try { lengthMeasurer.enabled = false; } catch {}
  try { areaMeasurer.enabled = false; } catch {}


  let prevHighlighterEnabled: boolean | null = null;
  const onToggleGhost = async () => {
    if (originalColors.size) {
      restoreModelMaterials();
      // Re-enable previous highlighter state so building/space colors come back
      try {
        if (prevHighlighterEnabled !== null) highlighter.enabled = prevHighlighterEnabled;
        prevHighlighterEnabled = null;
      } catch {}
    } else {
      // Disable Highlighter while ghost is active so overlays don't override transparency
      try {
        prevHighlighterEnabled = highlighter.enabled;
        highlighter.enabled = false;
      } catch {}
      setModelTransparent(components);
      try {
        const fragments = components.get(OBC.FragmentsManager);
        await fragments.core.update(true);
      } catch {}
    }
  };

  // Tool functions for the "Eines" section
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
    areaMeasurer.enabled = false;
    highlighter.enabled = !(lengthMeasurer.enabled || areaMeasurer.enabled) && !clipper.enabled;
    update(state);
  };

  const onAreaMeasurement = () => {
    disableAll(["area"]);
    areaMeasurer.enabled = !areaMeasurer.enabled;
    lengthMeasurer.enabled = false;
    highlighter.enabled = !(lengthMeasurer.enabled || areaMeasurer.enabled) && !clipper.enabled;
    update(state);
  };

  const onModelSection = () => {
    disableAll(["clipper"]);
    clipper.enabled = !clipper.enabled;
    highlighter.enabled = !clipper.enabled;
    update(state);
  };

  // Eliminar desplegable de mediciones: botones directos

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
        <bim-button ?active=${clipper.enabled} @click=${onModelSection} label="Secció" icon=${appIcons.CLIPPING}></bim-button> 
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
      <bim-toolbar-section label="Mesurar" icon=${appIcons.RULER}>
        <bim-button id="btn-length" ?active=${lengthMeasurer.enabled} label="Longitud" icon=${appIcons.RULER} @click=${onLengthMeasurement}></bim-button>
        <bim-button id="btn-area" ?active=${areaMeasurer.enabled} label="Àrea" icon=${appIcons.RULER} @click=${onAreaMeasurement}></bim-button>
      </bim-toolbar-section>
    </bim-toolbar>
  `;
};
