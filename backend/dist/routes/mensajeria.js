"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const mensajeriaController_1 = require("../controllers/mensajeriaController");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
// Todas las rutas requieren autenticación
router.use(auth_1.authenticateToken);
// Rutas de conversaciones
router.get('/conversaciones', mensajeriaController_1.getConversaciones);
router.post('/conversaciones', mensajeriaController_1.createConversacion);
router.get('/conversaciones/:id', mensajeriaController_1.getConversacion);
router.post('/conversaciones/:id/mensajes', mensajeriaController_1.enviarMensaje);
// Rutas de notificaciones
router.get('/notificaciones', mensajeriaController_1.getNotificaciones);
router.put('/notificaciones/:id/leida', mensajeriaController_1.marcarNotificacionLeida);
router.put('/notificaciones/marcar-todas-leidas', mensajeriaController_1.marcarTodasNotificacionesLeidas);
exports.default = router;
