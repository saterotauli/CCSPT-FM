import * as THREE from "three";
import * as OBC from "@thatopen/components";
import * as OBF from "@thatopen/components-front";
// import { createUserMarker, ensureGlobalMarkerCSS } from "../bim/Markers"; // No usado ahora

export type GeorefCalibration = {
  lat0: number; // reference latitude (deg)
  lon0: number; // reference longitude (deg)
  alt0?: number; // reference altitude (meters), optional
  modelOrigin: { x: number; y: number; z: number }; // model coords for the ref geodetic point
  headingDeg?: number; // rotation to align true north to +Z model axis. 0 = model +Z is north
  scale?: number; // optional scale multiplier (meters per meter), default 1
};

const STORAGE_KEY = "ccspt:georef";

export function loadGeorefCalibration(): GeorefCalibration | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return null;
    return parsed as GeorefCalibration;
  } catch {
    return null;
  }
}

export function saveGeorefCalibration(calib: GeorefCalibration) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(calib)); } catch {}
}

// WGS84 ellipsoid constants
const a = 6378137.0; // semi-major axis
const f = 1 / 298.257223563; // flattening
const b = a * (1 - f);
const e2 = 1 - (b * b) / (a * a);

function deg2rad(d: number) { return (d * Math.PI) / 180; }

function geodeticToECEF(latDeg: number, lonDeg: number, h: number = 0) {
  const lat = deg2rad(latDeg);
  const lon = deg2rad(lonDeg);
  const sinLat = Math.sin(lat);
  const cosLat = Math.cos(lat);
  const sinLon = Math.sin(lon);
  const cosLon = Math.cos(lon);
  const N = a / Math.sqrt(1 - e2 * sinLat * sinLat);
  const x = (N + h) * cosLat * cosLon;
  const y = (N + h) * cosLat * sinLon;
  const z = (N * (1 - e2) + h) * sinLat;
  return new THREE.Vector3(x, y, z);
}

function ecefToENU(pointECEF: THREE.Vector3, refECEF: THREE.Vector3, lat0Deg: number, lon0Deg: number) {
  // Compute ENU coordinates of point relative to ref
  const lat0 = deg2rad(lat0Deg);
  const lon0 = deg2rad(lon0Deg);
  const dx = pointECEF.x - refECEF.x;
  const dy = pointECEF.y - refECEF.y;
  const dz = pointECEF.z - refECEF.z;

  const sinLat = Math.sin(lat0);
  const cosLat = Math.cos(lat0);
  const sinLon = Math.sin(lon0);
  const cosLon = Math.cos(lon0);

  // ENU basis vectors
  const e = -sinLon * dx + cosLon * dy;
  const n = -sinLat * cosLon * dx - sinLat * sinLon * dy + cosLat * dz;
  const u =  cosLat * cosLon * dx + cosLat * sinLon * dy + sinLat * dz;

  return new THREE.Vector3(e, u, n); // map to (X=East, Y=Up, Z=North) in THREE's Y-up convention
}

function enuToModel(enu: THREE.Vector3, calib: GeorefCalibration): THREE.Vector3 {
  const heading = deg2rad(calib.headingDeg ?? 0);
  const scale = calib.scale ?? 1;
  // Rotate around Y (up) so that +Z aligns to North
  const cosH = Math.cos(heading);
  const sinH = Math.sin(heading);
  // enu = (E, U, N); we already arranged enu as Vector3(E, U, N)
  // Apply rotation in XZ plane: [x', z'] = R(heading) * [E, N]
  const E = enu.x, U = enu.y, N = enu.z;
  const x =  cosH * E + sinH * N;
  const z = -sinH * E + cosH * N;
  const y = U;
  return new THREE.Vector3(
    calib.modelOrigin.x + x * scale,
    calib.modelOrigin.y + y * scale,
    calib.modelOrigin.z + z * scale,
  );
}

export class GeoTracker {
  private world: OBC.World;
  private markerSvc: any;
  private markerEl: HTMLElement | null = null;
  private watchId: number | null = null;
  private lastUpdate = 0;
  private yOffsetMeters: number = 0;
  private snapEnabled: boolean = true;
  private userMarker: THREE.Object3D | null = null;

  constructor(components: OBC.Components, world: OBC.World) {
    this.world = world;
    this.markerSvc = components.get(OBF.Marker);
  }

  private ensureUserMarker(): THREE.Object3D {
    if (this.userMarker) return this.userMarker as THREE.Object3D;
    
    try {
      const scene = (this.world.scene as any)?.three as THREE.Scene;
      if (!scene) throw new Error('No scene available');
      
      // Crear marcador 3D independiente
      const group = new THREE.Group();
      
      // Esfera principal (cuerpo del marcador)
      const sphereGeometry = new THREE.SphereGeometry(3, 16, 16);
      const sphereMaterial = new THREE.MeshBasicMaterial({ 
        color: 0x007bff,
        transparent: true,
        opacity: 0.8
      });
      const sphere = new THREE.Mesh(sphereGeometry, sphereMaterial);
      
      // Cilindro vertical (poste)
      const cylinderGeometry = new THREE.CylinderGeometry(0.5, 0.5, 8, 8);
      const cylinderMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff });
      const cylinder = new THREE.Mesh(cylinderGeometry, cylinderMaterial);
      cylinder.position.y = 4;
      
      // Anillo superior
      const ringGeometry = new THREE.RingGeometry(1, 2, 16);
      const ringMaterial = new THREE.MeshBasicMaterial({ 
        color: 0xff0000,
        side: THREE.DoubleSide
      });
      const ring = new THREE.Mesh(ringGeometry, ringMaterial);
      ring.position.y = 8;
      ring.rotation.x = -Math.PI / 2;
      
      group.add(sphere);
      group.add(cylinder);
      group.add(ring);
      
      // Añadir a la escena
      scene.add(group);
      this.userMarker = group as any;
      
      console.debug('[Geo] Created 3D user marker');
      return group;
      
    } catch (e) {
      console.error('[Geo] Failed to create user marker:', e);
      // Crear marcador mínimo como fallback
      const fallback = new THREE.Group();
      const box = new THREE.Mesh(
        new THREE.BoxGeometry(5, 5, 5),
        new THREE.MeshBasicMaterial({ color: 0xff0000 })
      );
      fallback.add(box);
      this.userMarker = fallback as any;
      return fallback;
    }
  }

  private toModelPosition(lat: number, lon: number, alt?: number): THREE.Vector3 | null {
    const calib = loadGeorefCalibration();
    if (!calib) return null;
    const pECEF = geodeticToECEF(lat, lon, alt ?? 0);
    const rECEF = geodeticToECEF(calib.lat0, calib.lon0, calib.alt0 ?? 0);
    const enu = ecefToENU(pECEF, rECEF, calib.lat0, calib.lon0);
    return enuToModel(enu, calib);
  }

  private positionMarker(lat: number, lon: number, alt?: number, yOffsetMeters?: number): void {
    const mpos = this.toModelPosition(lat, lon, alt);
    if (!mpos) {
      console.warn('[Geo] No calibration found. Set with saveGeorefCalibration({...}).');
      return;
    }
    
    let pos = mpos.clone();
    
    // Snap a suelo si está activado
    if (this.snapEnabled) {
      const snapped = this.snapDownToModel(pos);
      if (snapped) pos = snapped;
    }
    
    // Apply vertical offset
    try {
      const scale = (loadGeorefCalibration()?.scale ?? 1);
      const offset = yOffsetMeters ?? this.yOffsetMeters;
      if (typeof offset === 'number' && !Number.isNaN(offset)) {
        pos.y += offset * scale;
      }
    } catch {}
    
    // Ajuste fijo de altura
    pos.y = pos.y - 190;
    
    console.debug('[Geo] Positioning marker at:', pos.x, pos.y, pos.z);
    
    try {
      const marker = this.ensureUserMarker();
      marker.position.copy(pos);
      console.debug('[Geo] 3D user marker positioned at:', marker.position.x, marker.position.y, marker.position.z);
    } catch (e) {
      console.warn('[Geo] Failed to position marker:', e);
    }
  }

  private updateMarker(lat: number, lon: number, alt?: number) {
    const now = performance.now();
    if (now - this.lastUpdate < 500) return; // rate limit ~2 Hz
    this.lastUpdate = now;
    this.positionMarker(lat, lon, alt);
  }

  start() {
    if (!('geolocation' in navigator)) {
      console.warn('[Geo] Browser geolocation not available');
      return;
    }
    if (this.watchId != null) return;

    // expose helpers globally for quick calibration in console
    try {
      (window as any).saveGeorefCalibration = saveGeorefCalibration;
      (window as any).loadGeorefCalibration = loadGeorefCalibration;
    } catch {}

    this.watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const { latitude, longitude, altitude } = pos.coords;
        this.updateMarker(latitude, longitude, altitude ?? undefined);
      },
      (err) => {
        console.warn('[Geo] watchPosition error', err);
      },
      {
        enableHighAccuracy: true,
        maximumAge: 1000,
        timeout: 5000,
      }
    );
  }

  stop() {
    if (this.watchId != null) {
      try { navigator.geolocation.clearWatch(this.watchId); } catch {}
      this.watchId = null;
    }
    if (this.markerEl) {
      try {
        // Limpiar marcador 3D
        if (this.userMarker) {
          const scene = (this.world.scene as any)?.three as THREE.Scene;
          if (scene) scene.remove(this.userMarker);
          this.userMarker = null;
        }
        if (this.markerEl) this.markerEl.remove();
      } catch {}
      this.markerEl = null;
    }
  }

  // Place the marker once at a given geodetic position (for testing)
  public placeAt(lat: number, lon: number, alt?: number, yOffsetMeters: number = -5, snapToGround: boolean = true) {
    try {
      // Persistir configuración
      this.snapEnabled = !!snapToGround;
      if (typeof yOffsetMeters === 'number' && !Number.isNaN(yOffsetMeters)) {
        this.yOffsetMeters = yOffsetMeters;
      }
      
      this.positionMarker(lat, lon, alt, yOffsetMeters);
    } catch (e) {
      console.warn('[Geo] Failed to place marker:', e);
    }
  }

  // Public setter for vertical offset that affects both test placement and live updates
  public setYOffsetMeters(offset: number) {
    this.yOffsetMeters = Number.isFinite(offset) ? offset : 0;
  }

  // Activar/desactivar snap a suelo de forma persistente
  public setSnapToGround(enabled: boolean) {
    this.snapEnabled = !!enabled;
  }

  // Raycast straight down from well above pos to find ground; returns adjusted position or null
  private snapDownToModel(pos: THREE.Vector3): THREE.Vector3 | null {
    try {
      const scene = (this.world.scene as any)?.three as THREE.Scene;
      if (!scene) return null;
      const raycaster = new THREE.Raycaster();
      const origin = pos.clone();
      origin.y += 1000; // start above
      const direction = new THREE.Vector3(0, -1, 0);
      raycaster.set(origin, direction);
      const intersects = raycaster.intersectObjects(scene.children, true);
      if (!intersects || intersects.length === 0) return null;
      for (const hit of intersects) {
        if (!hit?.point) continue;
        // accept the first valid hit below origin
        if (hit.point.y <= origin.y - 0.1) {
          const p = pos.clone();
          let clearance = 0.5;
          try { clearance = (loadGeorefCalibration()?.scale ?? 1) * 0.5; } catch {}
          p.y = hit.point.y + clearance; // add small offset above surface (scaled)
          return p;
        }
      }
      return null;
    } catch {
      return null;
    }
  }
}
