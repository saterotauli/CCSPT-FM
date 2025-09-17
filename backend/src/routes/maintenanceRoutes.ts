import { Router } from 'express';
import {
  listMaintenanceRecords,
  createMaintenanceRecord,
  updateMaintenanceRecord,
  deleteMaintenanceRecord,
  listMaintenanceAttachments,
  addMaintenanceAttachments,
  deleteMaintenanceAttachment,
  multerUploadMaintenance,
} from '../controllers/maintenanceController';

const router = Router();

// Base: /api/actius/:guid/maintenance
router.get('/actius/:guid/maintenance', listMaintenanceRecords);
router.post('/actius/:guid/maintenance', createMaintenanceRecord);
router.put('/actius/:guid/maintenance/:recordId', updateMaintenanceRecord);
router.delete('/actius/:guid/maintenance/:recordId', deleteMaintenanceRecord);

// Attachments
router.get('/actius/:guid/maintenance/:recordId/attachments', listMaintenanceAttachments);
router.post('/actius/:guid/maintenance/:recordId/attachments', multerUploadMaintenance, addMaintenanceAttachments);
router.delete('/actius/:guid/maintenance/:recordId/attachments/:attachmentId', deleteMaintenanceAttachment);

export default router;
