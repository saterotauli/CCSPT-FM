"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.changePassword = exports.updateProfile = exports.getProfile = exports.updateFCMToken = exports.login = exports.register = void 0;
const client_1 = require("@prisma/client");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const firebaseService_1 = require("../services/firebaseService");
const prisma = new client_1.PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || 'supersecret';
const register = async (req, res) => {
    const { nombre, apellidos, email, password, telefono, rol } = req.body;
    try {
        // Verificar si el email ya existe
        const existingUser = await prisma.usuario.findUnique({ where: { email } });
        if (existingUser) {
            return res.status(400).json({ error: 'El email ya está registrado' });
        }
        const hashedPassword = await bcryptjs_1.default.hash(password, 10);
        const usuario = await prisma.usuario.create({
            data: {
                nombre,
                apellidos,
                email,
                password: hashedPassword,
                telefono,
                rol: rol || 'VISOR'
            },
            select: {
                id: true,
                nombre: true,
                apellidos: true,
                email: true,
                telefono: true,
                rol: true,
                activo: true,
                createdAt: true
            }
        });
        res.status(201).json({
            message: 'Usuario registrado exitosamente',
            usuario
        });
    }
    catch (error) {
        console.error('Error en registro:', error);
        res.status(400).json({ error: 'No se pudo registrar el usuario', details: error });
    }
};
exports.register = register;
const login = async (req, res) => {
    const { email, password, fcmToken } = req.body;
    try {
        const usuario = await prisma.usuario.findUnique({
            where: { email },
            select: {
                id: true,
                nombre: true,
                apellidos: true,
                email: true,
                telefono: true,
                password: true,
                rol: true,
                activo: true,
                avatar: true
            }
        });
        if (!usuario) {
            return res.status(401).json({ error: 'Credenciales inválidas' });
        }
        if (!usuario.activo) {
            return res.status(401).json({ error: 'Cuenta desactivada' });
        }
        const valid = await bcryptjs_1.default.compare(password, usuario.password);
        if (!valid) {
            return res.status(401).json({ error: 'Credenciales inválidas' });
        }
        // Actualizar último acceso y token FCM si se proporciona
        const updateData = { ultimoAcceso: new Date() };
        if (fcmToken) {
            updateData.fcmToken = fcmToken;
        }
        await prisma.usuario.update({
            where: { id: usuario.id },
            data: updateData
        });
        const token = jsonwebtoken_1.default.sign({ id: usuario.id, email: usuario.email, rol: usuario.rol }, JWT_SECRET, { expiresIn: '24h' });
        const { password: _, ...usuarioSinPassword } = usuario;
        res.json({
            token,
            usuario: usuarioSinPassword,
            message: 'Inicio de sesión exitoso'
        });
    }
    catch (error) {
        console.error('Error en login:', error);
        res.status(400).json({ error: 'No se pudo iniciar sesión', details: error });
    }
};
exports.login = login;
const updateFCMToken = async (req, res) => {
    const { fcmToken } = req.body;
    try {
        if (!req.user) {
            return res.status(401).json({ error: 'No autenticado' });
        }
        await firebaseService_1.FirebaseService.updateUserFCMToken(req.user.id, fcmToken);
        res.json({ message: 'Token FCM actualizado exitosamente' });
    }
    catch (error) {
        console.error('Error actualizando token FCM:', error);
        res.status(400).json({ error: 'No se pudo actualizar el token FCM' });
    }
};
exports.updateFCMToken = updateFCMToken;
const getProfile = async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({ error: 'No autenticado' });
        }
        const usuario = await prisma.usuario.findUnique({
            where: { id: req.user.id },
            select: {
                id: true,
                nombre: true,
                apellidos: true,
                email: true,
                telefono: true,
                rol: true,
                activo: true,
                avatar: true,
                ultimoAcceso: true,
                createdAt: true
            }
        });
        if (!usuario) {
            return res.status(404).json({ error: 'Usuario no encontrado' });
        }
        res.json({ usuario });
    }
    catch (error) {
        console.error('Error obteniendo perfil:', error);
        res.status(400).json({ error: 'No se pudo obtener el perfil' });
    }
};
exports.getProfile = getProfile;
const updateProfile = async (req, res) => {
    const { nombre, apellidos, telefono } = req.body;
    try {
        if (!req.user) {
            return res.status(401).json({ error: 'No autenticado' });
        }
        const usuario = await prisma.usuario.update({
            where: { id: req.user.id },
            data: {
                nombre,
                apellidos,
                telefono
            },
            select: {
                id: true,
                nombre: true,
                apellidos: true,
                email: true,
                telefono: true,
                rol: true,
                avatar: true
            }
        });
        res.json({
            message: 'Perfil actualizado exitosamente',
            usuario
        });
    }
    catch (error) {
        console.error('Error actualizando perfil:', error);
        res.status(400).json({ error: 'No se pudo actualizar el perfil' });
    }
};
exports.updateProfile = updateProfile;
const changePassword = async (req, res) => {
    const { currentPassword, newPassword } = req.body;
    try {
        if (!req.user) {
            return res.status(401).json({ error: 'No autenticado' });
        }
        // Verificar contraseña actual
        const usuario = await prisma.usuario.findUnique({
            where: { id: req.user.id },
            select: { password: true }
        });
        if (!usuario) {
            return res.status(404).json({ error: 'Usuario no encontrado' });
        }
        const valid = await bcryptjs_1.default.compare(currentPassword, usuario.password);
        if (!valid) {
            return res.status(400).json({ error: 'Contraseña actual incorrecta' });
        }
        // Actualizar contraseña
        const hashedNewPassword = await bcryptjs_1.default.hash(newPassword, 10);
        await prisma.usuario.update({
            where: { id: req.user.id },
            data: { password: hashedNewPassword }
        });
        res.json({ message: 'Contraseña actualizada exitosamente' });
    }
    catch (error) {
        console.error('Error cambiando contraseña:', error);
        res.status(400).json({ error: 'No se pudo cambiar la contraseña' });
    }
};
exports.changePassword = changePassword;
