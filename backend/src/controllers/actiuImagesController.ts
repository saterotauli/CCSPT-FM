import { Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import sharp from 'sharp';

// Base uploads directory relative to this file (controllers -> src -> uploads sibling of src)
const UPLOADS_ROOT = path.resolve(__dirname, '..', '..', 'uploads');

// Ensure directory exists
function ensureDirSync(dir: string) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

// Multer storage to temp dir before processing with sharp
const tempDir = path.resolve(UPLOADS_ROOT, 'tmp');
ensureDirSync(tempDir);

const upload = multer({
  storage: multer.diskStorage({
    destination: (_req: Request, _file: Express.Multer.File, cb: (error: any, destination: string) => void) => cb(null, tempDir),
    filename: (_req: Request, file: Express.Multer.File, cb: (error: any, filename: string) => void) => {
      const ext = path.extname(file.originalname) || '.bin';
      const base = Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 8);
      cb(null, `${base}${ext}`);
    },
  }),
  limits: { fileSize: 10 * 1024 * 1024, files: 10 }, // 10MB, max 10 files
  fileFilter: (_req: Request, file: Express.Multer.File, cb: (error: any, acceptFile: boolean) => void) => {
    const ok = /image\/(jpeg|png|webp|heic|heif)/i.test(file.mimetype);
    cb(null, ok);
  },
});

export const multerUpload = upload.array('files');

type ActiuImage = {
  id: string;
  filename: string;
  mime: string;
  size: number;
  url: string;
  thumbUrl: string;
  width?: number | null;
  height?: number | null;
  description?: string | null;
  isCover?: boolean;
  sortOrder?: number;
  uploadedBy?: string | null;
  createdAt: string; // ISO
};

function indexPathFor(guid: string) {
  const baseDir = path.resolve(UPLOADS_ROOT, 'actius', guid);
  return path.join(baseDir, 'index.json');
}

function readIndex(guid: string): ActiuImage[] {
  try {
    const p = indexPathFor(guid);
    if (!fs.existsSync(p)) return [];
    const txt = fs.readFileSync(p, 'utf8');
    const arr = JSON.parse(txt);
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

function writeIndex(guid: string, items: ActiuImage[]) {
  const p = indexPathFor(guid);
  ensureDirSync(path.dirname(p));
  fs.writeFileSync(p, JSON.stringify(items, null, 2), 'utf8');
}

export async function listActiuImages(req: Request, res: Response) {
  try {
    const { guid } = req.params;
    if (!guid) return res.status(400).json({ error: 'GUID requerido' });
    const images = readIndex(guid).sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0) || (a.createdAt < b.createdAt ? 1 : -1));
    res.json(images);
  } catch (err: any) {
    res.status(500).json({ error: 'Error al listar imágenes', details: err.message });
  }
}

export async function uploadActiuImages(req: Request, res: Response) {
  try {
    const { guid } = req.params;
    if (!guid) return res.status(400).json({ error: 'GUID requerido' });

    const files = (req as any).files as Express.Multer.File[];
    if (!files || files.length === 0) return res.status(400).json({ error: 'No se enviaron archivos' });

    const baseDir = path.resolve(UPLOADS_ROOT, 'actius', guid);
    const originalDir = path.join(baseDir, 'original');
    const thumbDir = path.join(baseDir, 'thumb');
    ensureDirSync(originalDir);
    ensureDirSync(thumbDir);

    const saved: ActiuImage[] = [];
    const index = readIndex(guid);

    for (const f of files) {
      const baseName = path.parse(f.filename).name;
      const relBase = `/uploads/actius/${guid}`;
      const origExt = (path.extname(f.originalname) || path.extname(f.filename) || '.jpg').toLowerCase();
      const safeOrigName = `${baseName}${origExt}`;
      const safeThumbName = `${baseName}.webp`;
      const origPath = path.join(originalDir, safeOrigName);
      const thumbPath = path.join(thumbDir, safeThumbName);

      let width: number | null = null;
      let height: number | null = null;
      let thumbCreated = false;

      try {
        const image = sharp(f.path, { failOnError: false });
        const meta = await image.metadata();
        width = meta.width ?? null;
        height = meta.height ?? null;

        // Resized original
        await sharp(f.path)
          .rotate()
          .resize({ width: 2560, height: 2560, fit: 'inside', withoutEnlargement: true })
          .toFile(origPath);

        // Thumbnail
        await sharp(f.path)
          .rotate()
          .resize({ width: 480, height: 480, fit: 'inside', withoutEnlargement: true })
          .webp({ quality: 80 })
          .toFile(thumbPath);
        thumbCreated = true;
      } catch (err: any) {
        console.warn('Image processing failed, falling back to copy:', err?.message);
        try {
          // Fallback: copy original temp file as original
          fs.copyFileSync(f.path, origPath);
          // Try to create thumbnail from copied original
          try {
            await sharp(origPath)
              .rotate()
              .resize({ width: 480, height: 480, fit: 'inside', withoutEnlargement: true })
              .webp({ quality: 80 })
              .toFile(thumbPath);
            thumbCreated = true;
          } catch (thumbErr: any) {
            console.warn('Thumbnail creation failed; will use original as preview:', thumbErr?.message);
          }
        } catch (copyErr: any) {
          console.error('Fallback copy failed:', copyErr?.message);
        }
      } finally {
        try { fs.existsSync(f.path) && fs.unlinkSync(f.path); } catch {}
      }

      const url = `${relBase}/original/${encodeURIComponent(safeOrigName)}`;
      const thumbUrl = thumbCreated
        ? `${relBase}/thumb/${encodeURIComponent(safeThumbName)}`
        : url; // fallback to original if no thumb

      const rec: ActiuImage = {
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
  } catch (err: any) {
    res.status(500).json({ error: 'Error al subir imágenes', details: err.message });
  }
}

export async function deleteActiuImage(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const guid = String(req.query.guid || '');
    if (!id || !guid) return res.status(400).json({ error: 'Parámetros requeridos (id, guid)' });
    const index = readIndex(guid);
    const img = index.find((x) => x.id === id);
    if (!img) return res.status(404).json({ error: 'Imagen no encontrada' });

    // Try delete files
    const origPath = path.resolve(UPLOADS_ROOT, img.url.replace('/uploads/', ''));
    const thumbPath = path.resolve(UPLOADS_ROOT, img.thumbUrl.replace('/uploads/', ''));
    for (const p of [origPath, thumbPath]) {
      try { if (fs.existsSync(p)) fs.unlinkSync(p); } catch {}
    }

    const next = index.filter((x) => x.id !== id);
    writeIndex(guid, next);
    res.json({ ok: true });
  } catch (err: any) {
    res.status(500).json({ error: 'Error al eliminar imagen', details: err.message });
  }
}
