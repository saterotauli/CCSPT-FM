import * as OBC from "@thatopen/components";
import * as BUI from "@thatopen/ui";

// No-op: dejamos que la toolbar gestione completamente las mediciones y la sección.
// Mantenemos la firma para no romper llamadas desde App.tsx.
export function setupMeasurements(
  _components: OBC.Components,
  _world: OBC.World,
  _viewport: BUI.Viewport,
  _handlersRef?: { current?: any }
): () => void {
  return () => { /* no cleanup needed */ };
}