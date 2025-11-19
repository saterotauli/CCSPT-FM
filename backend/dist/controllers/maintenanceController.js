"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.multerUploadMaintenance = void 0;
exports.listMaintenanceRecords = listMaintenanceRecords;
exports.createMaintenanceRecord = createMaintenanceRecord;
exports.updateMaintenanceRecord = updateMaintenanceRecord;
exports.deleteMaintenanceRecord = deleteMaintenanceRecord;
exports.listMaintenanceAttachments = listMaintenanceAttachments;
exports.addMaintenanceAttachments = addMaintenanceAttachments;
exports.deleteMaintenanceAttachment = deleteMaintenanceAttachment;
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const multer_1 = __importDefault(require("multer"));
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
// Base uploads directory relative to this file (controllers -> src -> uploads sibling of src)
const UPLOADS_ROOT = path_1.default.resolve(__dirname, '..', '..', 'uploads');
function ensureDirSync(dir) {
    if (!fs_1.default.existsSync(dir))
        fs_1.default.mkdirSync(dir, { recursive: true });
}
// Multer temp storage
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
    limits: { fileSize: 20 * 1024 * 1024, files: 10 },
});
exports.multerUploadMaintenance = upload.array('files');
function addMonths(date, months) {
    const d = new Date(date);
    const day = d.getDate();
    d.setMonth(d.getMonth() + months);
    if (d.getDate() < day)
        d.setDate(0); // end-of-month adjust
    return d;
}
function addDays(date, days) {
    const d = new Date(date);
    d.setDate(d.getDate() + days);
    return d;
}
async function listMaintenanceRecords(req, res) {
    try {
        const { guid } = req.params;
        if (!guid)
            return res.status(400).json({ error: 'GUID requerido' });
        const records = await prisma.maintenance_record.findMany({
            where: { actiuGuid: guid },
            orderBy: { performedAt: 'desc' },
            include: { attachments: true },
        });
        res.json(records);
    }
    catch (err) {
        res.status(500).json({ error: 'Error al listar mantenimiento', details: err.message });
    }
}
async function createMaintenanceRecord(req, res) {
    try {
        const { guid } = req.params;
        if (!guid)
            return res.status(400).json({ error: 'GUID requerido' });
        const { performedAt, nextPlannedAt, periodMonths, periodDays, responsible, incidents, correctiveActions, checklist, } = req.body || {};
        const performedDate = performedAt ? new Date(performedAt) : new Date();
        let nextDate = nextPlannedAt ? new Date(nextPlannedAt) : null;
        const m = periodMonths != null ? Number(periodMonths) : null;
        const d = periodDays != null ? Number(periodDays) : null;
        if (!nextDate) {
            if (m && m > 0)
                nextDate = addMonths(performedDate, m);
            else if (d && d > 0)
                nextDate = addDays(performedDate, d);
        }
        const rec = await prisma.maintenance_record.create({
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
    }
    catch (err) {
        res.status(500).json({ error: 'Error al crear registro de mantenimiento', details: err.message });
    }
}
async function updateMaintenanceRecord(req, res) {
    try {
        const { guid, recordId } = req.params;
        if (!guid || !recordId)
            return res.status(400).json({ error: 'Parámetros requeridos' });
        const data = {};
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
                let v = req.body[f];
                if (['performedAt', 'nextPlannedAt'].includes(f) && v)
                    v = new Date(v);
                if (['periodMonths', 'periodDays'].includes(f) && v != null)
                    v = Number(v);
                if (f === 'checklist' && v)
                    v = typeof v === 'string' ? JSON.parse(v) : v;
                data[f] = v ?? null;
            }
        }
        const rec = await prisma.maintenance_record.update({
            where: { id: recordId },
            data,
        });
        res.json(rec);
    }
    catch (err) {
        res.status(500).json({ error: 'Error al actualizar mantenimiento', details: err.message });
    }
}
async function deleteMaintenanceRecord(req, res) {
    try {
        const { guid, recordId } = req.params;
        if (!guid || !recordId)
            return res.status(400).json({ error: 'Parámetros requeridos' });
        // Delete files from FS
        const baseDir = path_1.default.resolve(UPLOADS_ROOT, 'actius', guid, 'maintenance', recordId);
        try {
            if (fs_1.default.existsSync(baseDir))
                fs_1.default.rmSync(baseDir, { recursive: true, force: true });
        }
        catch { }
        await prisma.maintenance_attachment.deleteMany({ where: { recordId } });
        await prisma.maintenance_record.delete({ where: { id: recordId } });
        res.json({ ok: true });
    }
    catch (err) {
        res.status(500).json({ error: 'Error al eliminar mantenimiento', details: err.message });
    }
}
async function listMaintenanceAttachments(req, res) {
    try {
        const { recordId } = req.params;
        const items = await prisma.maintenance_attachment.findMany({ where: { recordId } });
        res.json(items);
    }
    catch (err) {
        res.status(500).json({ error: 'Error al listar adjuntos', details: err.message });
    }
}
async function addMaintenanceAttachments(req, res) {
    try {
        const { guid, recordId } = req.params;
        const files = req.files;
        if (!guid || !recordId)
            return res.status(400).json({ error: 'Parámetros requeridos' });
        if (!files || files.length === 0)
            return res.status(400).json({ error: 'No se enviaron archivos' });
        const baseDir = path_1.default.resolve(UPLOADS_ROOT, 'actius', guid, 'maintenance', recordId);
        ensureDirSync(baseDir);
        const created = [];
        for (const f of files) {
            const destPath = path_1.default.join(baseDir, f.originalname);
            try {
                fs_1.default.copyFileSync(f.path, destPath);
            }
            finally {
                try {
                    fs_1.default.existsSync(f.path) && fs_1.default.unlinkSync(f.path);
                }
                catch { }
            }
            const relUrl = `/uploads/actius/${guid}/maintenance/${recordId}/${encodeURIComponent(f.originalname)}`;
            const att = await prisma.maintenance_attachment.create({
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
    }
    catch (err) {
        res.status(500).json({ error: 'Error al subir adjuntos', details: err.message });
    }
}
async function deleteMaintenanceAttachment(req, res) {
    try {
        const { guid, recordId, attachmentId } = req.params;
        const att = await prisma.maintenance_attachment.findUnique({ where: { id: attachmentId } });
        if (!att)
            return res.status(404).json({ error: 'Adjunto no encontrado' });
        // Try remove file
        const abs = path_1.default.resolve(UPLOADS_ROOT, att.url.replace('/uploads/', ''));
        try {
            if (fs_1.default.existsSync(abs))
                fs_1.default.unlinkSync(abs);
        }
        catch { }
        await prisma.maintenance_attachment.delete({ where: { id: attachmentId } });
        res.json({ ok: true });
    }
    catch (err) {
        res.status(500).json({ error: 'Error al eliminar adjunto', details: err.message });
    }
}
