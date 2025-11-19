"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const authController_1 = require("../controllers/authController");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
// Rutas públicas
router.post('/register', authController_1.register);
router.post('/login', authController_1.login);
// Rutas protegidas
router.use(auth_1.authenticateToken);
router.post('/fcm-token', authController_1.updateFCMToken);
router.get('/profile', authController_1.getProfile);
router.put('/profile', authController_1.updateProfile);
router.put('/change-password', authController_1.changePassword);
exports.default = router;
