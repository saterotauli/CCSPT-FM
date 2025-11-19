"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteMobileAsset = exports.getMobileAssetById = exports.listMobileAssets = exports.upsertMobileAsset = void 0;
const assets = new Map();
const upsertMobileAsset = (req, res) => {
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
        const entry = {
            id,
            label: typeof label === 'string' ? label : undefined,
            lat: nlat,
            lng: nlng,
            accuracy: nacc,
            updatedAt: new Date().toISOString(),
        };
        assets.set(id, entry);
        return res.json(entry);
    }
    catch (err) {
        return res.status(500).json({ error: 'Error al desar la posició', details: err?.message || String(err) });
    }
};
exports.upsertMobileAsset = upsertMobileAsset;
const listMobileAssets = (_req, res) => {
    try {
        const list = Array.from(assets.values()).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
        return res.json(list);
    }
    catch (err) {
        return res.status(500).json({ error: 'Error al llistar posicions', details: err?.message || String(err) });
    }
};
exports.listMobileAssets = listMobileAssets;
const getMobileAssetById = (req, res) => {
    try {
        const { id } = req.params;
        if (!id)
            return res.status(400).json({ error: 'id requerit' });
        const item = assets.get(id);
        if (!item)
            return res.status(404).json({ error: 'No trobat' });
        return res.json(item);
    }
    catch (err) {
        return res.status(500).json({ error: 'Error intern', details: err?.message || String(err) });
    }
};
exports.getMobileAssetById = getMobileAssetById;
const deleteMobileAsset = (req, res) => {
    try {
        const { id } = req.params;
        if (!id)
            return res.status(400).json({ error: 'id requerit' });
        const ok = assets.delete(id);
        return res.json({ deleted: ok });
    }
    catch (err) {
        return res.status(500).json({ error: 'Error intern', details: err?.message || String(err) });
    }
};
exports.deleteMobileAsset = deleteMobileAsset;
