import * as THREE from "three";
import * as OBC from "@thatopen/components";
import * as OBF from "@thatopen/components-front";
import * as BUI from "@thatopen/ui";

export type SetupHoverDeps = {
  resolveModelFromHit: (hit: any) => any | undefined;
  resolveElementIdFromHit: (model: any, hit: any) => number | undefined;
  extractIfcClass: (data: any) => string | undefined;
};

export type HoverAPI = {
  cleanup: () => void;
  getLastHoveredIfcClass: () => string | undefined;
};

export function setupHover(
  components: OBC.Components,
  world: OBC.World,
  viewport: BUI.Viewport,
  deps: SetupHoverDeps
): HoverAPI {
  const { resolveModelFromHit, resolveElementIdFromHit, extractIfcClass } = deps;

  const raycasters = components.get(OBC.Raycasters).get(world);
  const highlighter = components.get(OBF.Highlighter);

  // Style used by the app for hover
  const hoverStyle = "hover:ifcspace";
  try {
    highlighter.styles.set(hoverStyle, {
      color: new THREE.Color("#00ccff"),
      opacity: 0.35,
      transparent: true,
      renderedFaces: 1,
    });
  } catch {}

  let lastHoveredIfcClass: string | undefined;
  let lastHoverModel: any = null;
  let lastHoverId: number | null = null;
  let hoverRAF = 0;

  const onPointerMoveShowCategory = (e: PointerEvent) => {
    if (hoverRAF) cancelAnimationFrame(hoverRAF);
    hoverRAF = requestAnimationFrame(async () => {
      try {
        const cur = await (raycasters as any).castRay(e);
        if (!cur) {
          lastHoveredIfcClass = undefined;
          try { (world.renderer!.three.domElement as HTMLCanvasElement).style.cursor = 'default'; } catch {}
          return;
        }
        const model = resolveModelFromHit(cur);

        // Prefer localId when available
        let id: any =
          (cur as any)?.localId ?? (cur as any)?.id ?? (cur as any)?.expressID ?? (cur as any)?.expressId ??
          (cur as any)?.itemId ?? (cur as any)?.itemID ?? (cur as any)?.object?.userData?.expressID ??
          (cur as any)?.object?.userData?.id;
        if (id == null) id = resolveElementIdFromHit(model, cur);
        if (typeof id === 'string') id = Number(id);
        if (id == null || Number.isNaN(id)) return;

        if (model === lastHoverModel && id === lastHoverId) return; // avoid spam
        lastHoverModel = model;
        lastHoverId = id;

        let ifcClass: string | undefined;
        let name: string | undefined;
        let globalId: string | undefined;

        // Find target model that can resolve GUIDs
        let targetModel: any = null;
        try {
          const models = components.get(OBC.FragmentsManager);
          if (models && models.list) {
            for (const [uuid, modelInstance] of models.list) {
              if (typeof (modelInstance as any).getGuidsByLocalIds === 'function') {
                try {
                  const guids = await (modelInstance as any).getGuidsByLocalIds([id]);
                  if (guids && guids.length > 0) {
                    targetModel = modelInstance;
                    globalId = guids[0];
                    console.log('Found model with GUID:', uuid, 'GUID:', globalId);
                    break;
                  }
                } catch {}
              }
            }
          }
        } catch {}

        if (targetModel && globalId) {
          try {
            if (typeof (targetModel as any).getItemsData === 'function') {
              const [data] = await (targetModel as any).getItemsData([id], { attributesDefault: true });
              if (data) {
                name = (data as any)?.Name?.value ?? (data as any)?.Name;
                // Extract IFC class, prioritizing _category
                let cls: any = (data as any)?._category;
                const norm = extractIfcClass(data);
                cls = norm || (typeof cls?.value === 'string' ? cls.value : cls);
                ifcClass = typeof cls === 'string' ? cls : undefined;
                lastHoveredIfcClass = ifcClass;
                console.log('Found element data:', { name, ifcClass, globalId });
              }
            }
          } catch (err) {
            console.log('Error getting element data:', err);
          }
        }

        // Fallbacks if no properties
        if (!ifcClass) {
          ifcClass = (cur as any)?.representationclass || (cur as any)?.snappingclass;
          const objUserData = (cur as any)?.object?.userData || {};
          ifcClass = ifcClass || objUserData.ifcClass || objUserData.IFCClass || objUserData.type;
        }

        // Persist for click usage
        const clsFinal = typeof ifcClass === 'string' ? ifcClass : (typeof (ifcClass as any)?.value === 'string' ? (ifcClass as any).value : undefined);
        lastHoveredIfcClass = clsFinal;

        // Cursor change based on selectability (not IFCSITE)
        try {
          const selectable = !!clsFinal && clsFinal !== 'IFCSITE';
          (world.renderer!.three.domElement as HTMLCanvasElement).style.cursor = selectable ? 'pointer' : 'default';
        } catch {}

        if (!name) {
          name = (cur as any)?.object?.name || (cur as any)?.object?.userData?.name;
        }

        console.log(`Hover: ${ifcClass || 'Unknown'} (id: ${id})${name ? ` - ${name}` : ''}${globalId ? ` [${globalId}]` : ''}`);
      } catch {}
    });
  };

  // Attach listeners to both viewport and canvas
  viewport.addEventListener('pointermove', onPointerMoveShowCategory as any);
  let canvas: HTMLCanvasElement | null = null;
  try {
    canvas = world.renderer!.three.domElement as HTMLCanvasElement;
    canvas.addEventListener('pointermove', onPointerMoveShowCategory as any, { passive: true } as any);
    canvas.addEventListener('mousemove', onPointerMoveShowCategory as any, { passive: true } as any);
  } catch {}

  const cleanup = () => {
    try { viewport.removeEventListener('pointermove', onPointerMoveShowCategory as any); } catch {}
    try { if (canvas) canvas.removeEventListener('pointermove', onPointerMoveShowCategory as any); } catch {}
    try { if (canvas) canvas.removeEventListener('mousemove', onPointerMoveShowCategory as any); } catch {}
    try { if (hoverRAF) cancelAnimationFrame(hoverRAF); } catch {}
  };

  return {
    cleanup,
    getLastHoveredIfcClass: () => lastHoveredIfcClass,
  };
}
