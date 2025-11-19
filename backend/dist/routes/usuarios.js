"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const usuariosController_1 = require("../controllers/usuariosController");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
// Todas las rutas requieren autenticación
router.use(auth_1.authenticateToken);
// Rutas para coordinadores y admins
router.get('/', auth_1.requireCoordinador, usuariosController_1.getUsuarios);
router.get('/operarios', auth_1.requireCoordinador, usuariosController_1.getOperarios);
router.get('/:id', auth_1.requireCoordinador, usuariosController_1.getUsuario);
router.post('/', auth_1.requireAdmin, usuariosController_1.createUsuario);
router.put('/:id', auth_1.requireAdmin, usuariosController_1.updateUsuario);
router.delete('/:id', auth_1.requireAdmin, usuariosController_1.deleteUsuario);
router.put('/:id/reset-password', auth_1.requireAdmin, usuariosController_1.resetPassword);
exports.default = router;
