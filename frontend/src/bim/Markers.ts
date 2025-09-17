import * as BUI from "@thatopen/ui";

let cssInjected = false;

export function ensureGlobalMarkerCSS() {
  if (cssInjected) return;
  if (document.getElementById('ccspt-markers-css')) return;
  const style = document.createElement('style');
  style.id = 'ccspt-markers-css';
  style.textContent = `
    [data-marker] { cursor: pointer; pointer-events: auto !important; }
    [data-marker] [data-marker-label] {
      transition: transform .15s ease, box-shadow .15s ease;
      will-change: transform;
      box-shadow: 0 2px 4px rgba(0,0,0,0.3);
    }
  `;
  document.head.appendChild(style);
  cssInjected = true;
}

export function attachHoverEffects(root: HTMLElement) {
  const labelEl = root.querySelector('[data-marker-label]') as HTMLElement | null;
  if (!labelEl) return;
  root.addEventListener('mouseenter', () => {
    try {
      labelEl.style.transform = 'translateY(-12px) scale(1.2)';
      labelEl.style.boxShadow = '0 6px 14px rgba(0,0,0,0.35)';
    } catch {}
  });
  root.addEventListener('mouseleave', () => {
    try {
      labelEl.style.transform = '';
      labelEl.style.boxShadow = '0 2px 4px rgba(0,0,0,0.3)';
    } catch {}
  });
}

export function createBuildingMarker(label: string): HTMLElement {
  ensureGlobalMarkerCSS();
  const el = BUI.Component.create(() => BUI.html`
    <div data-marker="building" style="position: relative; display: flex; flex-direction: column; align-items: center; z-index: 1;">
      <div data-marker-label style="font-size: 18px; background: rgba(0, 204, 255, 0.8); color: white; padding: 8px 12px; border-radius: 4px; white-space: nowrap; font-family: Arial, sans-serif;"><span>${label}</span></div>
      <div style="width: 2px; height: 20px; background: rgba(255,255,255,0.6); margin-top: 2px;"></div>
    </div>
  `) as unknown as HTMLElement;
  attachHoverEffects(el);
  return el;
}

// Marcador per als elements de Control
export function createSpaceMarker(label: string, opts?: { color?: string; subtitle?: string }): HTMLElement {
  ensureGlobalMarkerCSS();
  const color = opts?.color || 'rgba(0, 183, 255, 0.8)';
  const subtitle = (opts?.subtitle ?? '').toString();
  const hasSubtitle = subtitle.trim().length > 0;
  const el = BUI.Component.create(() => BUI.html`
    <div data-marker="ifcspace" style="position: relative; display: flex; flex-direction: column; align-items: center; z-index: 1;">
      <div data-marker-label style="display:flex; flex-direction:column; align-items:center; gap:2px; font-size: 12px; background: ${color}; color: white; padding: 6px 10px; border-radius: 6px; white-space: nowrap; font-family: Arial, sans-serif; text-shadow: 0 1px 2px rgba(0,0,0,0.35); font-weight: 600;">
        <span>${label}</span>
        ${hasSubtitle ? BUI.html`<small style="font-size:12px; opacity:0.98;">${subtitle}</small>` : ''}
      </div>
    </div>
  `) as unknown as HTMLElement;
  attachHoverEffects(el);
  return el;
}

export function createUserMarker(): HTMLElement {
  ensureGlobalMarkerCSS();
  const el = BUI.Component.create(() => BUI.html`
    <div data-marker="user" style="position: relative; display: flex; flex-direction: column; align-items: center; z-index: 2;">
      <div data-marker-label style="display: flex; align-items: center; gap: 6px; font-size: 14px; background: rgba(0, 123, 255, 0.9); color: white; padding: 4px 8px; border-radius: 999px; white-space: nowrap; font-family: Arial, sans-serif;">
        <span style="display:inline-flex;width:16px;height:16px;">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden="true">
            <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-3.33 0-10 1.67-10 5v1h20v-1c0-3.33-6.67-5-10-5z"/>
          </svg>
        </span>
        <span>You're here</span>
      </div>
      <div style="width: 2px; height: 18px; background: rgba(255,255,255,0.75); margin-top: 2px;"></div>
    </div>
  `) as unknown as HTMLElement;
  attachHoverEffects(el);
  return el;
}
