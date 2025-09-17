import * as THREE from "three";
import * as OBC from "@thatopen/components";

// Extrae un ID básico desde userData (placeholder)
export function pickIdWithThree(
  modelRoot: any,
  camera: THREE.Camera,
  clientX: number,
  clientY: number,
  dom: HTMLCanvasElement
): number | undefined {
  try {
    const raycaster = new THREE.Raycaster();
    const rect = dom.getBoundingClientRect();
    const x = ((clientX - rect.left) / rect.width) * 2 - 1;
    const y = -((clientY - rect.top) / rect.height) * 2 + 1;
    const ndc = new THREE.Vector2(x, y);
    raycaster.setFromCamera(ndc as any, camera as any);
    const root: THREE.Object3D | undefined = (modelRoot as any)?.mesh || (modelRoot as any)?.group || (modelRoot as any)?.scene || (modelRoot as any)?.three || (modelRoot as any);
    if (!root) return undefined;
    const hits = raycaster.intersectObject(root, true);
    const h = hits[0];
    const id = h?.object?.userData?.expressID ?? h?.object?.userData?.id;
    return typeof id === 'string' ? Number(id) : id;
  } catch {
    return undefined;
  }
}

// Resuelve la instancia de modelo a partir del resultado del raycast
export function resolveModelFromHit(hit: any, fragmentsList?: Map<string, any>): any | undefined {
  try {
    const direct = hit?.model || hit?.fragment?.model || hit?.object?.userData?.model || hit?.object?.parent?.userData?.model;
    if (direct) return direct;
    const key: string | undefined = hit?.modelKey || hit?.modelID || hit?.modelId;
    if (key && fragmentsList?.has(String(key))) return fragmentsList.get(String(key));
  } catch {}
  return undefined;
}

// Resuelve el ID del elemento a partir del hit (prioriza localId)
export function resolveElementIdFromHit(_model: any, hit: any, _components?: OBC.Components): number | undefined {
  try {
    const raw = hit?.localId ?? hit?.id ?? hit?.expressID ?? hit?.expressId ??
      hit?.elementId ?? hit?.itemID ?? hit?.itemId ?? hit?.instanceID ?? hit?.dbid ??
      hit?.object?.userData?.expressID ?? hit?.object?.userData?.id;
    const n = typeof raw === "string" ? Number(raw) : raw;
    if (typeof n === "number" && !Number.isNaN(n)) return n;
  } catch {}
  return undefined;
}

// Raycast básico usando Three.js contra las raíces de modelos conocidos
export async function raycastAll(
  fragmentsList: Map<string, any>,
  data: { camera: THREE.PerspectiveCamera | THREE.OrthographicCamera; mouse: THREE.Vector2; dom: HTMLCanvasElement; }
): Promise<any[]> {
  const raycaster = new THREE.Raycaster();
  const ndc = new THREE.Vector2(
    (data.mouse.x / data.dom.clientWidth) * 2 - 1,
    -(data.mouse.y / data.dom.clientHeight) * 2 + 1
  );
  raycaster.setFromCamera(ndc, data.camera as any);

  const roots: THREE.Object3D[] = [];
  for (const [, mdl] of fragmentsList) {
    try {
      const root = (mdl as any).mesh || (mdl as any).group || (mdl as any).scene || (mdl as any).three;
      if (root) roots.push(root);
    } catch {}
  }
  const intersects = raycaster.intersectObjects(roots, true);
  return intersects as any[];
}

// Placeholder de UI para resultados de raycast (no hace nada por ahora)
export async function showRayResults(
  _results: any[],
  _deps: {
    resolveModelFromHit: (hit: any) => any | undefined;
    getModelKeyFromInstance: (inst: any) => string | null;
    getElementBasics: (model: any, id: number) => Promise<{ name?: string; ifcClass?: string; globalId?: string }>;
    rayLine: THREE.Line;
    rayHud: HTMLElement;
  }
): Promise<void> {
  return;
}