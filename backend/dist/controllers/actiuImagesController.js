"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.multerUpload = void 0;
exports.listActiuImages = listActiuImages;
exports.uploadActiuImages = uploadActiuImages;
exports.deleteActiuImage = deleteActiuImage;
const multer_1 = __importDefault(require("multer"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const sharp_1 = __importDefault(require("sharp"));
// Base uploads directory relative to this file (controllers -> src -> uploads sibling of src)
const UPLOADS_ROOT = path_1.default.resolve(__dirname, '..', '..', 'uploads');
// Ensure directory exists
function ensureDirSync(dir) {
    if (!fs_1.default.existsSync(dir)) {
        fs_1.default.mkdirSync(dir, { recursive: true });
    }
}
// Multer storage to temp dir before processing with sharp
const tempDir = path_1.default.resolve(UPLOADS_ROOT, 'tmp');
ensureDirSync(tempDir);
const upload = (0, multer_1.default)({
    storage: multer_1.default.diskStorage({
        destination: (_req, _file, cb) => cb(null, tempDir),
        filename: (_req, file, cb) => {
            const ext = path_1.default.extname(file.originalname) || '.bin';
            const base = Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 8);
            cb(null, `${base}${ext}`);
        },
    }),
    limits: { fileSize: 10 * 1024 * 1024, files: 10 }, // 10MB, max 10 files
    fileFilter: (_req, file, cb) => {
        const ok = /image\/(jpeg|png|webp|heic|heif)/i.test(file.mimetype);
        cb(null, ok);
    },
});
exports.multerUpload = upload.array('files');
function indexPathFor(guid) {
    const baseDir = path_1.default.resolve(UPLOADS_ROOT, 'actius', guid);
    return path_1.default.join(baseDir, 'index.json');
}
function readIndex(guid) {
    try {
        const p = indexPathFor(guid);
        if (!fs_1.default.existsSync(p))
            return [];
        const txt = fs_1.default.readFileSync(p, 'utf8');
        const arr = JSON.parse(txt);
        return Array.isArray(arr) ? arr : [];
    }
    catch {
        return [];
    }
}
function writeIndex(guid, items) {
    const p = indexPathFor(guid);
    ensureDirSync(path_1.default.dirname(p));
    fs_1.default.writeFileSync(p, JSON.stringify(items, null, 2), 'utf8');
}
async function listActiuImages(req, res) {
    try {
        const { guid } = req.params;
        if (!guid)
            return res.status(400).json({ error: 'GUID requerido' });
        const images = readIndex(guid).sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0) || (a.createdAt < b.createdAt ? 1 : -1));
        res.json(images);
    }
    catch (err) {
        res.status(500).json({ error: 'Error al listar imágenes', details: err.message });
    }
}
async function uploadActiuImages(req, res) {
    try {
        const { guid } = req.params;
        if (!guid)
            return res.status(400).json({ error: 'GUID requerido' });
        const files = req.files;
        if (!files || files.length === 0)
            return res.status(400).json({ error: 'No se enviaron archivos' });
        const baseDir = path_1.default.resolve(UPLOADS_ROOT, 'actius', guid);
        const originalDir = path_1.default.join(baseDir, 'original');
        const thumbDir = path_1.default.join(baseDir, 'thumb');
        ensureDirSync(originalDir);
        ensureDirSync(thumbDir);
        const saved = [];
        const index = readIndex(guid);
        for (const f of files) {
            const baseName = path_1.default.parse(f.filename).name;
            const relBase = `/uploads/actius/${guid}`;
            const origExt = (path_1.default.extname(f.originalname) || path_1.default.extname(f.filename) || '.jpg').toLowerCase();
            const safeOrigName = `${baseName}${origExt}`;
            const safeThumbName = `${baseName}.webp`;
            const origPath = path_1.default.join(originalDir, safeOrigName);
            const thumbPath = path_1.default.join(thumbDir, safeThumbName);
            let width = null;
            let height = null;
            let thumbCreated = false;
            try {
                const image = (0, sharp_1.default)(f.path, { failOnError: false });
                const meta = await image.metadata();
                width = meta.width ?? null;
                height = meta.height ?? null;
                // Resized original
                await (0, sharp_1.default)(f.path)
                    .rotate()
                    .resize({ width: 2560, height: 2560, fit: 'inside', withoutEnlargement: true })
                    .toFile(origPath);
                // Thumbnail
                await (0, sharp_1.default)(f.path)
                    .rotate()
                    .resize({ width: 480, height: 480, fit: 'inside', withoutEnlargement: true })
                    .webp({ quality: 80 })
                    .toFile(thumbPath);
                thumbCreated = true;
            }
            catch (err) {
                console.warn('Image processing failed, falling back to copy:', err?.message);
                try {
                    // Fallback: copy original temp file as original
                    fs_1.default.copyFileSync(f.path, origPath);
                    // Try to create thumbnail from copied original
                    try {
                        await (0, sharp_1.default)(origPath)
                            .rotate()
                            .resize({ width: 480, height: 480, fit: 'inside', withoutEnlargement: true })
                            .webp({ quality: 80 })
                            .toFile(thumbPath);
                        thumbCreated = true;
                    }
                    catch (thumbErr) {
                        console.warn('Thumbnail creation failed; will use original as preview:', thumbErr?.message);
                    }
                }
                catch (copyErr) {
                    console.error('Fallback copy failed:', copyErr?.message);
                }
            }
            finally {
                try {
                    fs_1.default.existsSync(f.path) && fs_1.default.unlinkSync(f.path);
                }
                catch { }
            }
            const url = `${relBase}/original/${encodeURIComponent(safeOrigName)}`;
            const thumbUrl = thumbCreated
                ? `${relBase}/thumb/${encodeURIComponent(safeThumbName)}`
                : url; // fallback to original if no thumb
            const rec = {
                id: baseName,
                filename: f.originalname,
                mime: f.mimetype,
                size: f.size,
                url,
                thumbUrl,
                width,
                height,
                isCover: false,
                sortOrder: 0,
                uploadedBy: null,
                createdAt: new Date().toISOString(),
                description: null,
            };
            index.push(rec);
            saved.push(rec);
        }
        writeIndex(guid, index);
        res.status(201).json(saved);
    }
    catch (err) {
        res.status(500).json({ error: 'Error al subir imágenes', details: err.message });
    }
}
async function deleteActiuImage(req, res) {
    try {
        const { id } = req.params;
        const guid = String(req.query.guid || '');
        if (!id || !guid)
            return res.status(400).json({ error: 'Parámetros requeridos (id, guid)' });
        const index = readIndex(guid);
        const img = index.find((x) => x.id === id);
        if (!img)
            return res.status(404).json({ error: 'Imagen no encontrada' });
        // Try delete files
        const origPath = path_1.default.resolve(UPLOADS_ROOT, img.url.replace('/uploads/', ''));
        const thumbPath = path_1.default.resolve(UPLOADS_ROOT, img.thumbUrl.replace('/uploads/', ''));
        for (const p of [origPath, thumbPath]) {
            try {
                if (fs_1.default.existsSync(p))
                    fs_1.default.unlinkSync(p);
            }
            catch { }
        }
        const next = index.filter((x) => x.id !== id);
        writeIndex(guid, next);
        res.json({ ok: true });
    }
    catch (err) {
        res.status(500).json({ error: 'Error al eliminar imagen', details: err.message });
    }
}
