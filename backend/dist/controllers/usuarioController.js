"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteUsuario = exports.updateUsuario = exports.createUsuario = exports.getUsuarios = void 0;
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
// Obtener todos los usuarios
const getUsuarios = async (req, res) => {
    const usuarios = await prisma.usuario.findMany();
    res.json(usuarios);
};
exports.getUsuarios = getUsuarios;
// Crear usuario
const createUsuario = async (req, res) => {
    const { nombre, email, rol, password } = req.body;
    try {
        const usuario = await prisma.usuario.create({
            data: { nombre, email, rol, password },
        });
        res.status(201).json(usuario);
    }
    catch (error) {
        res.status(400).json({ error: 'No se pudo crear el usuario', details: error });
    }
};
exports.createUsuario = createUsuario;
// Actualizar usuario
const updateUsuario = async (req, res) => {
    const { id } = req.params;
    const { nombre, email, rol } = req.body;
    try {
        const usuario = await prisma.usuario.update({
            where: { id: Number(id) },
            data: { nombre, email, rol },
        });
        res.json(usuario);
    }
    catch (error) {
        res.status(400).json({ error: 'No se pudo actualizar el usuario', details: error });
    }
};
exports.updateUsuario = updateUsuario;
// Eliminar usuario
const deleteUsuario = async (req, res) => {
    const { id } = req.params;
    try {
        await prisma.usuario.delete({ where: { id: Number(id) } });
        res.json({ message: 'Usuario eliminado' });
    }
    catch (error) {
        res.status(400).json({ error: 'No se pudo eliminar el usuario', details: error });
    }
};
exports.deleteUsuario = deleteUsuario;
