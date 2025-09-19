import { Request, Response } from 'express';

// In-memory store for mobile assets positions (MVP, non-persistent)
// Keyed by asset id (e.g., user id or device id)
interface MobileAsset {
  id: string;
  label?: string;
  lat: number;
  lng: number;
  accuracy?: number;
  updatedAt: string; // ISO string
}

const assets = new Map<string, MobileAsset>();

export const upsertMobileAsset = (req: Request, res: Response) => {
  try {
    const { id, label, lat, lng, accuracy } = req.body || {};
    if (!id || typeof id !== 'string') {
      return res.status(400).json({ error: 'id (string) és requerit' });
    }
    const nlat = Number(lat);
    const nlng = Number(lng);
    const nacc = accuracy !== undefined ? Number(accuracy) : undefined;
    if (!isFinite(nlat) || !isFinite(nlng)) {
      return res.status(400).json({ error: 'lat i lng han de ser números' });
    }
    const entry: MobileAsset = {
      id,
      label: typeof label === 'string' ? label : undefined,
      lat: nlat,
      lng: nlng,
      accuracy: nacc,
      updatedAt: new Date().toISOString(),
    };
    assets.set(id, entry);
    return res.json(entry);
  } catch (err: any) {
    return res.status(500).json({ error: 'Error al desar la posició', details: err?.message || String(err) });
  }
};

export const listMobileAssets = (_req: Request, res: Response) => {
  try {
    const list = Array.from(assets.values()).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
    return res.json(list);
  } catch (err: any) {
    return res.status(500).json({ error: 'Error al llistar posicions', details: err?.message || String(err) });
  }
};

export const getMobileAssetById = (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    if (!id) return res.status(400).json({ error: 'id requerit' });
    const item = assets.get(id);
    if (!item) return res.status(404).json({ error: 'No trobat' });
    return res.json(item);
  } catch (err: any) {
    return res.status(500).json({ error: 'Error intern', details: err?.message || String(err) });
  }
};

export const deleteMobileAsset = (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    if (!id) return res.status(400).json({ error: 'id requerit' });
    const ok = assets.delete(id);
    return res.json({ deleted: ok });
  } catch (err: any) {
    return res.status(500).json({ error: 'Error intern', details: err?.message || String(err) });
  }
};
