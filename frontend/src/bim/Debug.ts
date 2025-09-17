import * as OBC from "@thatopen/components";

// Hook de debug de cámara (placeholder). Devuelve cleanup.
// Firma alineada con el uso en App.tsx: setupCameraDebug(world, handlersRef)
export function setupCameraDebug(
  world: OBC.World,
  handlersRef?: { current?: any }
): () => void {
  const onKeyDownPrint = (e: KeyboardEvent) => {
    if (e.code === "KeyP") {
      try {
        const c = world.camera.three as any;
        const ctl = (world.camera as any).controls;
        const pos = c?.position; const tgt = ctl?.target;
        console.log(`[Camera] pos=(${pos?.x}, ${pos?.y}, ${pos?.z}) target=(${tgt?.x}, ${tgt?.y}, ${tgt?.z})`);
      } catch {}
    }
  };
  window.addEventListener("keydown", onKeyDownPrint);
  if (handlersRef?.current) handlersRef.current.keyDownPrint = onKeyDownPrint;
  return () => {
    try { window.removeEventListener("keydown", onKeyDownPrint); } catch {}
  };
}