"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const tareasController_1 = require("../controllers/tareasController");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
// Todas las rutas requieren autenticación
router.use(auth_1.authenticateToken);
// Rutas para operarios y superiores
router.get('/mis-tareas', auth_1.requireOperario, tareasController_1.getMisTareas);
router.get('/:id', auth_1.requireOperario, tareasController_1.getTarea);
router.put('/:id', auth_1.requireOperario, tareasController_1.updateTarea);
router.post('/:id/comentarios', auth_1.requireOperario, tareasController_1.addComentario);
// Rutas para coordinadores y admins
router.get('/', auth_1.requireCoordinador, tareasController_1.getTareas);
router.post('/', auth_1.requireCoordinador, tareasController_1.createTarea);
router.delete('/:id', auth_1.requireCoordinador, tareasController_1.deleteTarea);
exports.default = router;
