"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const maintenanceController_1 = require("../controllers/maintenanceController");
const router = (0, express_1.Router)();
// Base: /api/actius/:guid/maintenance
router.get('/actius/:guid/maintenance', maintenanceController_1.listMaintenanceRecords);
router.post('/actius/:guid/maintenance', maintenanceController_1.createMaintenanceRecord);
router.put('/actius/:guid/maintenance/:recordId', maintenanceController_1.updateMaintenanceRecord);
router.delete('/actius/:guid/maintenance/:recordId', maintenanceController_1.deleteMaintenanceRecord);
// Attachments
router.get('/actius/:guid/maintenance/:recordId/attachments', maintenanceController_1.listMaintenanceAttachments);
router.post('/actius/:guid/maintenance/:recordId/attachments', maintenanceController_1.multerUploadMaintenance, maintenanceController_1.addMaintenanceAttachments);
router.delete('/actius/:guid/maintenance/:recordId/attachments/:attachmentId', maintenanceController_1.deleteMaintenanceAttachment);
exports.default = router;
