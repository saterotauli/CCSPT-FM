import * as OBC from "@thatopen/components";
import * as BUI from "@thatopen/ui";

export type GetElementBasicsFn = (model: any, id: number) => Promise<{ name?: string; ifcClass?: string; globalId?: string }>;

/**
 * Sets up a pointerdown capture listener on the viewport that prevents clicks on IFCSITE.
 * Hover behavior is not modified.
 * Returns a cleanup function.
 */
export function setupIfcsClickBlocker(
  components: OBC.Components,
  world: OBC.World,
  viewport: BUI.Viewport,
  getElementBasics: GetElementBasicsFn,
) {
  const raycasters = components.get(OBC.Raycasters).get(world);

  const onPointerDownCapture = async (e: PointerEvent) => {
    try {
      const hit: any = await (raycasters as any).castRay(e);
      if (!hit) return;
      const model = (hit as any)?.model || (hit as any)?.fragment?.model || (hit as any)?.object?.userData?.model;
      const rawId = (hit as any)?.localId ?? (hit as any)?.id ?? (hit as any)?.expressID ?? (hit as any)?.expressId ?? (hit as any)?.itemID ?? (hit as any)?.instanceID ?? (hit as any)?.elementId ?? (hit as any)?.dbid ?? (hit as any)?.fragId;
      const id = typeof rawId === 'string' ? Number(rawId) : rawId;
      if (!model || typeof id !== 'number') return;

      const basics = await getElementBasics(model, id);
      const cls = basics?.ifcClass ? String(basics.ifcClass).toUpperCase() : undefined;
      if (cls === 'IFCSITE') {
        e.stopPropagation();
        e.preventDefault();
      }
    } catch {}
  };

  try { viewport.addEventListener('pointerdown', onPointerDownCapture, true); } catch {}

  return () => {
    try { viewport.removeEventListener('pointerdown', onPointerDownCapture, true); } catch {}
  };
}
