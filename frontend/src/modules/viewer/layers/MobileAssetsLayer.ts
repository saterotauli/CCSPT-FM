import * as OBC from "@thatopen/components";
import * as OBF from "@thatopen/components-front";
import * as THREE from "three";
import { wgs84ToModel, loadGeorefCalibration } from "../utils/Geolocation";
import { ensureGlobalMarkerCSS } from "../utils/Markers";

export type MobileAssetDTO = {
  id: string;
  label?: string;
  lat: number;
  lng: number;
  accuracy?: number;
  updatedAt: string;
};

/**
 * MobileAssetsLayer: polls /api/mobile-assets and renders DOM markers in the FM viewer.
 * Requires georeferencing saved via Geolocation.saveGeorefCalibration().
 */
export class MobileAssetsLayer {
  private world: OBC.World;
  private markerSvc: any;
  private timer: any = null;
  private frequencyMs = 8000;
  private enabled = false;
  private elements = new Map<string, HTMLElement>();
  private lastPos = new Map<string, THREE.Vector3>();

  constructor(components: OBC.Components, world: OBC.World) {
    this.world = world;
    this.markerSvc = components.get(OBF.Marker);
  }

  setFrequency(ms: number) { this.frequencyMs = Math.max(1000, ms | 0); }

  async start() {
    if (this.enabled) return;
    this.enabled = true;
    // Basic CSS for markers
    ensureGlobalMarkerCSS();
    try { (this.markerSvc as any).enabled = true; } catch {}
    try { (this.markerSvc as any).threshold = 0; } catch {}
    // Run once and then start interval
    await this.refreshOnce();
    this.timer = setInterval(() => this.refreshOnce(), this.frequencyMs);
  }

  stop() {
    this.enabled = false;
    if (this.timer) { clearInterval(this.timer); this.timer = null; }
    try {
      // remove only our DOM markers tagged with data-marker="mobile"
      for (const [,el] of this.elements) {
        try { el.remove(); } catch {}
      }
      this.elements.clear();
      this.lastPos.clear();
    } catch {}
  }

  private createMarkerElement(asset: MobileAssetDTO): HTMLElement {
    const div = document.createElement('div');
    div.setAttribute('data-marker', 'mobile');
    div.style.position = 'relative';
    div.style.display = 'flex';
    div.style.flexDirection = 'column';
    div.style.alignItems = 'center';
    div.style.zIndex = '2';

    const pill = document.createElement('div');
    pill.setAttribute('data-marker-label', '');
    pill.style.background = 'rgba(0, 140, 255, 0.92)';
    pill.style.color = '#fff';
    pill.style.borderRadius = '999px';
    pill.style.padding = '6px 10px';
    pill.style.fontFamily = 'Arial, sans-serif';
    pill.style.fontSize = '12px';
    pill.style.boxShadow = '0 2px 4px rgba(0,0,0,0.30)';
    pill.textContent = asset.label || asset.id;

    const stem = document.createElement('div');
    stem.style.width = '2px';
    stem.style.height = '14px';
    stem.style.background = 'rgba(255,255,255,0.8)';
    stem.style.marginTop = '3px';

    div.appendChild(pill);
    div.appendChild(stem);
    return div;
  }

  private toModel(lat: number, lon: number): THREE.Vector3 | null {
    // Requires previously saved calibration; GeoTracker already uses it.
    if (!loadGeorefCalibration()) return null;
    const p = wgs84ToModel(lat, lon);
    return p;
  }

  private async refreshOnce() {
    if (!this.enabled) return;
    try {
      const res = await fetch('/api/mobile-assets', { headers: { Accept: 'application/json' } });
      if (!res.ok) return;
      const items: MobileAssetDTO[] = await res.json();

      // Build a set of current ids
      const currentIds = new Set<string>(items.map(i => i.id));

      // Remove markers that are no longer present
      for (const [id, el] of Array.from(this.elements.entries())) {
        if (!currentIds.has(id)) {
          try { el.remove(); } catch {}
          this.elements.delete(id);
          this.lastPos.delete(id);
        }
      }

      // Upsert markers for each asset with valid georef
      for (const a of items) {
        const pos = this.toModel(a.lat, a.lng);
        if (!pos) continue;
        const p2 = pos.clone();
        p2.y = p2.y - 190; // same vertical adjustment as GeoTracker

        const prev = this.lastPos.get(a.id);
        const moved = !prev || prev.distanceToSquared(p2) > 0.01; // ~1 cm squared

        if (!moved && this.elements.has(a.id)) {
          // No movement: keep existing element to avoid flicker
          continue;
        }

        // If exists and moved, remove and recreate to update position
        const existing = this.elements.get(a.id);
        if (existing) { try { existing.remove(); } catch {} }

        const el = this.createMarkerElement(a);
        this.markerSvc.create(this.world as any, el, p2);
        this.elements.set(a.id, el);
        this.lastPos.set(a.id, p2);
      }
    } catch (e) {
      // ignore errors to keep loop running
    }
  }
}
