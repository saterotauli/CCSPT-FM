import { Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import multer from 'multer';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Base uploads directory relative to this file (controllers -> src -> uploads sibling of src)
const UPLOADS_ROOT = path.resolve(__dirname, '..', '..', 'uploads');

function ensureDirSync(dir: string) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

// Multer temp storage
const tempDir = path.resolve(UPLOADS_ROOT, 'tmp');
ensureDirSync(tempDir);
const upload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, tempDir),
    filename: (_req, file, cb) => {
      const ext = path.extname(file.originalname) || '.bin';
      const base = Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 8);
      cb(null, `${base}${ext}`);
    },
  }),
  limits: { fileSize: 20 * 1024 * 1024, files: 10 },
});
export const multerUploadMaintenance = upload.array('files');

function addMonths(date: Date, months: number) {
  const d = new Date(date);
  const day = d.getDate();
  d.setMonth(d.getMonth() + months);
  if (d.getDate() < day) d.setDate(0); // end-of-month adjust
  return d;
}

function addDays(date: Date, days: number) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

export async function listMaintenanceRecords(req: Request, res: Response) {
  try {
    const { guid } = req.params;
    if (!guid) return res.status(400).json({ error: 'GUID requerido' });

    const records = await (prisma as any).maintenance_record.findMany({
      where: { actiuGuid: guid },
      orderBy: { performedAt: 'desc' },
      include: { attachments: true },
    });
    res.json(records);
  } catch (err: any) {
    res.status(500).json({ error: 'Error al listar mantenimiento', details: err.message });
  }
}

export async function createMaintenanceRecord(req: Request, res: Response) {
  try {
    const { guid } = req.params;
    if (!guid) return res.status(400).json({ error: 'GUID requerido' });

    const {
      performedAt,
      nextPlannedAt,
      periodMonths,
      periodDays,
      responsible,
      incidents,
      correctiveActions,
      checklist,
    } = req.body || {};

    const performedDate = performedAt ? new Date(performedAt) : new Date();
    let nextDate: Date | null = nextPlannedAt ? new Date(nextPlannedAt) : null;
    const m = periodMonths != null ? Number(periodMonths) : null;
    const d = periodDays != null ? Number(periodDays) : null;

    if (!nextDate) {
      if (m && m > 0) nextDate = addMonths(performedDate, m);
      else if (d && d > 0) nextDate = addDays(performedDate, d);
    }

    const rec = await (prisma as any).maintenance_record.create({
      data: {
        actiuGuid: guid,
        performedAt: performedDate,
        nextPlannedAt: nextDate,
        periodMonths: m,
        periodDays: d,
        responsible: responsible ?? null,
        incidents: incidents ?? null,
        correctiveActions: correctiveActions ?? null,
        checklist: checklist ? (typeof checklist === 'string' ? JSON.parse(checklist) : checklist) : null,
      },
    });

    res.status(201).json(rec);
  } catch (err: any) {
    res.status(500).json({ error: 'Error al crear registro de mantenimiento', details: err.message });
  }
}

export async function updateMaintenanceRecord(req: Request, res: Response) {
  try {
    const { guid, recordId } = req.params as { guid: string; recordId: string };
    if (!guid || !recordId) return res.status(400).json({ error: 'Parámetros requeridos' });

    const data: any = {};
    const fields = [
      'performedAt',
      'nextPlannedAt',
      'periodMonths',
      'periodDays',
      'responsible',
      'incidents',
      'correctiveActions',
      'checklist',
    ];
    for (const f of fields) {
      if (f in req.body) {
        let v = (req.body as any)[f];
        if (['performedAt', 'nextPlannedAt'].includes(f) && v) v = new Date(v);
        if (['periodMonths', 'periodDays'].includes(f) && v != null) v = Number(v);
        if (f === 'checklist' && v) v = typeof v === 'string' ? JSON.parse(v) : v;
        data[f] = v ?? null;
      }
    }

    const rec = await (prisma as any).maintenance_record.update({
      where: { id: recordId },
      data,
    });
    res.json(rec);
  } catch (err: any) {
    res.status(500).json({ error: 'Error al actualizar mantenimiento', details: err.message });
  }
}

export async function deleteMaintenanceRecord(req: Request, res: Response) {
  try {
    const { guid, recordId } = req.params as { guid: string; recordId: string };
    if (!guid || !recordId) return res.status(400).json({ error: 'Parámetros requeridos' });

    // Delete files from FS
    const baseDir = path.resolve(UPLOADS_ROOT, 'actius', guid, 'maintenance', recordId);
    try { if (fs.existsSync(baseDir)) fs.rmSync(baseDir, { recursive: true, force: true }); } catch {}

    await (prisma as any).maintenance_attachment.deleteMany({ where: { recordId } });
    await (prisma as any).maintenance_record.delete({ where: { id: recordId } });

    res.json({ ok: true });
  } catch (err: any) {
    res.status(500).json({ error: 'Error al eliminar mantenimiento', details: err.message });
  }
}

export async function listMaintenanceAttachments(req: Request, res: Response) {
  try {
    const { recordId } = req.params as { guid: string; recordId: string };
    const items = await (prisma as any).maintenance_attachment.findMany({ where: { recordId } });
    res.json(items);
  } catch (err: any) {
    res.status(500).json({ error: 'Error al listar adjuntos', details: err.message });
  }
}

export async function addMaintenanceAttachments(req: Request, res: Response) {
  try {
    const { guid, recordId } = req.params as { guid: string; recordId: string };
    const files = (req as any).files as Express.Multer.File[];
    if (!guid || !recordId) return res.status(400).json({ error: 'Parámetros requeridos' });
    if (!files || files.length === 0) return res.status(400).json({ error: 'No se enviaron archivos' });

    const baseDir = path.resolve(UPLOADS_ROOT, 'actius', guid, 'maintenance', recordId);
    ensureDirSync(baseDir);

    const created: any[] = [];
    for (const f of files) {
      const destPath = path.join(baseDir, f.originalname);
      try {
        fs.copyFileSync(f.path, destPath);
      } finally {
        try { fs.existsSync(f.path) && fs.unlinkSync(f.path); } catch {}
      }
      const relUrl = `/uploads/actius/${guid}/maintenance/${recordId}/${encodeURIComponent(f.originalname)}`;
      const att = await (prisma as any).maintenance_attachment.create({
        data: {
          recordId,
          type: f.mimetype || null,
          filename: f.originalname,
          url: relUrl,
        },
      });
      created.push(att);
    }
    res.status(201).json(created);
  } catch (err: any) {
    res.status(500).json({ error: 'Error al subir adjuntos', details: err.message });
  }
}

export async function deleteMaintenanceAttachment(req: Request, res: Response) {
  try {
    const { guid, recordId, attachmentId } = req.params as { guid: string; recordId: string; attachmentId: string };
    const att = await (prisma as any).maintenance_attachment.findUnique({ where: { id: attachmentId } });
    if (!att) return res.status(404).json({ error: 'Adjunto no encontrado' });

    // Try remove file
    const abs = path.resolve(UPLOADS_ROOT, att.url.replace('/uploads/', ''));
    try { if (fs.existsSync(abs)) fs.unlinkSync(abs); } catch {}

    await (prisma as any).maintenance_attachment.delete({ where: { id: attachmentId } });
    res.json({ ok: true });
  } catch (err: any) {
    res.status(500).json({ error: 'Error al eliminar adjunto', details: err.message });
  }
}
