"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getOperarios = exports.resetPassword = exports.deleteUsuario = exports.updateUsuario = exports.createUsuario = exports.getUsuario = exports.getUsuarios = void 0;
const client_1 = require("@prisma/client");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const prisma = new client_1.PrismaClient();
const getUsuarios = async (req, res) => {
    try {
        const { rol, activo, page = 1, limit = 10 } = req.query;
        const where = {};
        if (rol)
            where.rol = rol;
        if (activo !== undefined)
            where.activo = activo === 'true';
        const skip = (Number(page) - 1) * Number(limit);
        const [usuarios, total] = await Promise.all([
            prisma.usuario.findMany({
                where,
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
                    createdAt: true,
                    _count: {
                        select: {
                            tareasAsignadas: { where: { estado: { not: 'COMPLETADA' } } },
                            tareasCreadas: true
                        }
                    }
                },
                skip,
                take: Number(limit),
                orderBy: { createdAt: 'desc' }
            }),
            prisma.usuario.count({ where })
        ]);
        res.json({
            usuarios,
            pagination: {
                page: Number(page),
                limit: Number(limit),
                total,
                pages: Math.ceil(total / Number(limit))
            }
        });
    }
    catch (error) {
        console.error('Error obteniendo usuarios:', error);
        res.status(400).json({ error: 'No se pudieron obtener los usuarios' });
    }
};
exports.getUsuarios = getUsuarios;
const getUsuario = async (req, res) => {
    try {
        const { id } = req.params;
        const usuario = await prisma.usuario.findUnique({
            where: { id: Number(id) },
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
                createdAt: true,
                _count: {
                    select: {
                        tareasAsignadas: { where: { estado: { not: 'COMPLETADA' } } },
                        tareasCreadas: true,
                        mensajesEnviados: true
                    }
                }
            }
        });
        if (!usuario) {
            return res.status(404).json({ error: 'Usuario no encontrado' });
        }
        res.json({ usuario });
    }
    catch (error) {
        console.error('Error obteniendo usuario:', error);
        res.status(400).json({ error: 'No se pudo obtener el usuario' });
    }
};
exports.getUsuario = getUsuario;
const createUsuario = async (req, res) => {
    try {
        const { nombre, apellidos, email, telefono, password, rol } = req.body;
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
                telefono,
                password: hashedPassword,
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
            message: 'Usuario creado exitosamente',
            usuario
        });
    }
    catch (error) {
        console.error('Error creando usuario:', error);
        res.status(400).json({ error: 'No se pudo crear el usuario' });
    }
};
exports.createUsuario = createUsuario;
const updateUsuario = async (req, res) => {
    try {
        const { id } = req.params;
        const { nombre, apellidos, email, telefono, rol, activo } = req.body;
        // Verificar que el usuario existe
        const existingUser = await prisma.usuario.findUnique({ where: { id: Number(id) } });
        if (!existingUser) {
            return res.status(404).json({ error: 'Usuario no encontrado' });
        }
        // Verificar si el email ya existe en otro usuario
        if (email && email !== existingUser.email) {
            const emailExists = await prisma.usuario.findUnique({ where: { email } });
            if (emailExists) {
                return res.status(400).json({ error: 'El email ya está registrado' });
            }
        }
        const usuario = await prisma.usuario.update({
            where: { id: Number(id) },
            data: {
                nombre,
                apellidos,
                email,
                telefono,
                rol,
                activo
            },
            select: {
                id: true,
                nombre: true,
                apellidos: true,
                email: true,
                telefono: true,
                rol: true,
                activo: true,
                updatedAt: true
            }
        });
        res.json({
            message: 'Usuario actualizado exitosamente',
            usuario
        });
    }
    catch (error) {
        console.error('Error actualizando usuario:', error);
        res.status(400).json({ error: 'No se pudo actualizar el usuario' });
    }
};
exports.updateUsuario = updateUsuario;
const deleteUsuario = async (req, res) => {
    try {
        const { id } = req.params;
        // Verificar que el usuario existe
        const existingUser = await prisma.usuario.findUnique({ where: { id: Number(id) } });
        if (!existingUser) {
            return res.status(404).json({ error: 'Usuario no encontrado' });
        }
        // No permitir eliminar el propio usuario
        if (req.user && req.user.id === Number(id)) {
            return res.status(400).json({ error: 'No puedes eliminar tu propia cuenta' });
        }
        // En lugar de eliminar, desactivar el usuario para mantener integridad referencial
        await prisma.usuario.update({
            where: { id: Number(id) },
            data: { activo: false }
        });
        res.json({ message: 'Usuario desactivado exitosamente' });
    }
    catch (error) {
        console.error('Error eliminando usuario:', error);
        res.status(400).json({ error: 'No se pudo eliminar el usuario' });
    }
};
exports.deleteUsuario = deleteUsuario;
const resetPassword = async (req, res) => {
    try {
        const { id } = req.params;
        const { newPassword } = req.body;
        // Verificar que el usuario existe
        const existingUser = await prisma.usuario.findUnique({ where: { id: Number(id) } });
        if (!existingUser) {
            return res.status(404).json({ error: 'Usuario no encontrado' });
        }
        const hashedPassword = await bcryptjs_1.default.hash(newPassword, 10);
        await prisma.usuario.update({
            where: { id: Number(id) },
            data: { password: hashedPassword }
        });
        res.json({ message: 'Contraseña restablecida exitosamente' });
    }
    catch (error) {
        console.error('Error restableciendo contraseña:', error);
        res.status(400).json({ error: 'No se pudo restablecer la contraseña' });
    }
};
exports.resetPassword = resetPassword;
const getOperarios = async (req, res) => {
    try {
        const operarios = await prisma.usuario.findMany({
            where: {
                rol: 'OPERARIO',
                activo: true
            },
            select: {
                id: true,
                nombre: true,
                apellidos: true,
                email: true,
                telefono: true,
                avatar: true,
                _count: {
                    select: {
                        tareasAsignadas: { where: { estado: { not: 'COMPLETADA' } } }
                    }
                }
            },
            orderBy: { nombre: 'asc' }
        });
        res.json({ operarios });
    }
    catch (error) {
        console.error('Error obteniendo operarios:', error);
        res.status(400).json({ error: 'No se pudieron obtener los operarios' });
    }
};
exports.getOperarios = getOperarios;
