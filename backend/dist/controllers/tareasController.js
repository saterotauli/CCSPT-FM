"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getMisTareas = exports.addComentario = exports.deleteTarea = exports.updateTarea = exports.createTarea = exports.getTarea = exports.getTareas = void 0;
const client_1 = require("@prisma/client");
const firebaseService_1 = require("../services/firebaseService");
const prisma = new client_1.PrismaClient();
const getTareas = async (req, res) => {
    try {
        const { estado, prioridad, tipo, asignadoA, creadoPor, edifici, page = 1, limit = 10 } = req.query;
        const where = {};
        if (estado)
            where.estado = estado;
        if (prioridad)
            where.prioridad = prioridad;
        if (tipo)
            where.tipo = tipo;
        if (asignadoA)
            where.asignadoAId = Number(asignadoA);
        if (creadoPor)
            where.creadoPorId = Number(creadoPor);
        if (edifici)
            where.edifici = edifici;
        // Si es operario, solo ver sus tareas asignadas
        if (req.user?.rol === 'OPERARIO') {
            where.asignadoAId = req.user.id;
        }
        const skip = (Number(page) - 1) * Number(limit);
        const [tareas, total] = await Promise.all([
            prisma.tarea.findMany({
                where,
                include: {
                    creadoPor: {
                        select: { id: true, nombre: true, apellidos: true, email: true }
                    },
                    asignadoA: {
                        select: { id: true, nombre: true, apellidos: true, email: true }
                    },
                    actiu: {
                        select: { guid: true, tipus: true, subtipus: true }
                    },
                    _count: {
                        select: { comentarios: true, adjuntos: true }
                    }
                },
                skip,
                take: Number(limit),
                orderBy: [
                    { prioridad: 'desc' },
                    { fechaCreacion: 'desc' }
                ]
            }),
            prisma.tarea.count({ where })
        ]);
        res.json({
            tareas,
            pagination: {
                page: Number(page),
                limit: Number(limit),
                total,
                pages: Math.ceil(total / Number(limit))
            }
        });
    }
    catch (error) {
        console.error('Error obteniendo tareas:', error);
        res.status(400).json({ error: 'No se pudieron obtener las tareas' });
    }
};
exports.getTareas = getTareas;
const getTarea = async (req, res) => {
    try {
        const { id } = req.params;
        const tarea = await prisma.tarea.findUnique({
            where: { id },
            include: {
                creadoPor: {
                    select: { id: true, nombre: true, apellidos: true, email: true, avatar: true }
                },
                asignadoA: {
                    select: { id: true, nombre: true, apellidos: true, email: true, avatar: true }
                },
                actiu: {
                    select: { guid: true, tipus: true, subtipus: true, edifici: true, planta: true }
                },
                adjuntos: {
                    include: {
                        usuario: {
                            select: { id: true, nombre: true, apellidos: true }
                        }
                    }
                },
                comentarios: {
                    include: {
                        usuario: {
                            select: { id: true, nombre: true, apellidos: true, avatar: true }
                        }
                    },
                    orderBy: { createdAt: 'asc' }
                }
            }
        });
        if (!tarea) {
            return res.status(404).json({ error: 'Tarea no encontrada' });
        }
        // Verificar permisos: operarios solo pueden ver sus tareas asignadas
        if (req.user?.rol === 'OPERARIO' && tarea.asignadoAId !== req.user.id) {
            return res.status(403).json({ error: 'No tienes permisos para ver esta tarea' });
        }
        res.json({ tarea });
    }
    catch (error) {
        console.error('Error obteniendo tarea:', error);
        res.status(400).json({ error: 'No se pudo obtener la tarea' });
    }
};
exports.getTarea = getTarea;
const createTarea = async (req, res) => {
    try {
        const { titulo, descripcion, tipo, prioridad, edifici, planta, zona, ubicacio, fechaVencimiento, asignadoAId, actiuGuid, tiempoEstimado } = req.body;
        if (!req.user) {
            return res.status(401).json({ error: 'No autenticado' });
        }
        const tarea = await prisma.tarea.create({
            data: {
                titulo,
                descripcion,
                tipo: tipo || 'MANTENIMIENTO',
                prioridad: prioridad || 'MEDIA',
                edifici,
                planta,
                zona,
                ubicacio,
                fechaVencimiento: fechaVencimiento ? new Date(fechaVencimiento) : null,
                creadoPorId: req.user.id,
                asignadoAId: asignadoAId ? Number(asignadoAId) : null,
                actiuGuid,
                tiempoEstimado: tiempoEstimado ? Number(tiempoEstimado) : null,
                fechaAsignacion: asignadoAId ? new Date() : null
            },
            include: {
                creadoPor: {
                    select: { id: true, nombre: true, apellidos: true }
                },
                asignadoA: {
                    select: { id: true, nombre: true, apellidos: true }
                }
            }
        });
        // Enviar notificación si se asignó a alguien
        if (asignadoAId) {
            await Promise.all([
                // Crear notificación en base de datos
                prisma.notificacion.create({
                    data: {
                        usuarioId: Number(asignadoAId),
                        tipo: 'TAREA_ASIGNADA',
                        titulo: 'Nueva tarea asignada',
                        mensaje: `Se te ha asignado la tarea: ${titulo}`,
                        tareaId: tarea.id
                    }
                }),
                // Enviar notificación push
                firebaseService_1.FirebaseService.sendNotificationToUser(Number(asignadoAId), {
                    title: 'Nueva tarea asignada',
                    body: `${titulo} - Prioridad: ${prioridad}`,
                    data: { tareaId: tarea.id, tipo: 'TAREA_ASIGNADA' }
                })
            ]);
        }
        res.status(201).json({
            message: 'Tarea creada exitosamente',
            tarea
        });
    }
    catch (error) {
        console.error('Error creando tarea:', error);
        res.status(400).json({ error: 'No se pudo crear la tarea' });
    }
};
exports.createTarea = createTarea;
const updateTarea = async (req, res) => {
    try {
        const { id } = req.params;
        const { titulo, descripcion, tipo, prioridad, estado, edifici, planta, zona, ubicacio, fechaVencimiento, asignadoAId, observaciones, tiempoReal } = req.body;
        if (!req.user) {
            return res.status(401).json({ error: 'No autenticado' });
        }
        // Verificar que la tarea existe
        const tareaExistente = await prisma.tarea.findUnique({
            where: { id },
            select: { asignadoAId: true, estado: true }
        });
        if (!tareaExistente) {
            return res.status(404).json({ error: 'Tarea no encontrada' });
        }
        // Verificar permisos: operarios solo pueden actualizar sus tareas asignadas
        if (req.user.rol === 'OPERARIO' && tareaExistente.asignadoAId !== req.user.id) {
            return res.status(403).json({ error: 'No tienes permisos para modificar esta tarea' });
        }
        const updateData = {
            titulo,
            descripcion,
            tipo,
            prioridad,
            edifici,
            planta,
            zona,
            ubicacio,
            fechaVencimiento: fechaVencimiento ? new Date(fechaVencimiento) : null,
            observaciones,
            tiempoReal: tiempoReal ? Number(tiempoReal) : null
        };
        // Solo coordinadores y admins pueden cambiar asignación
        if (req.user.rol !== 'OPERARIO') {
            if (asignadoAId !== undefined) {
                updateData.asignadoAId = asignadoAId ? Number(asignadoAId) : null;
                updateData.fechaAsignacion = asignadoAId ? new Date() : null;
            }
        }
        // Manejar cambios de estado
        if (estado && estado !== tareaExistente.estado) {
            updateData.estado = estado;
            if (estado === 'EN_PROGRESO' && !updateData.fechaInicio) {
                updateData.fechaInicio = new Date();
            }
            else if (estado === 'COMPLETADA') {
                updateData.fechaCompletada = new Date();
            }
        }
        const tarea = await prisma.tarea.update({
            where: { id },
            data: updateData,
            include: {
                creadoPor: {
                    select: { id: true, nombre: true, apellidos: true }
                },
                asignadoA: {
                    select: { id: true, nombre: true, apellidos: true }
                }
            }
        });
        // Enviar notificaciones según el cambio
        if (asignadoAId && asignadoAId !== tareaExistente.asignadoAId) {
            await Promise.all([
                prisma.notificacion.create({
                    data: {
                        usuarioId: Number(asignadoAId),
                        tipo: 'TAREA_ASIGNADA',
                        titulo: 'Tarea reasignada',
                        mensaje: `Se te ha asignado la tarea: ${titulo}`,
                        tareaId: tarea.id
                    }
                }),
                firebaseService_1.FirebaseService.sendNotificationToUser(Number(asignadoAId), {
                    title: 'Tarea reasignada',
                    body: `${titulo} - Prioridad: ${prioridad}`,
                    data: { tareaId: tarea.id, tipo: 'TAREA_ASIGNADA' }
                })
            ]);
        }
        res.json({
            message: 'Tarea actualizada exitosamente',
            tarea
        });
    }
    catch (error) {
        console.error('Error actualizando tarea:', error);
        res.status(400).json({ error: 'No se pudo actualizar la tarea' });
    }
};
exports.updateTarea = updateTarea;
const deleteTarea = async (req, res) => {
    try {
        const { id } = req.params;
        const tarea = await prisma.tarea.findUnique({ where: { id } });
        if (!tarea) {
            return res.status(404).json({ error: 'Tarea no encontrada' });
        }
        await prisma.tarea.delete({ where: { id } });
        res.json({ message: 'Tarea eliminada exitosamente' });
    }
    catch (error) {
        console.error('Error eliminando tarea:', error);
        res.status(400).json({ error: 'No se pudo eliminar la tarea' });
    }
};
exports.deleteTarea = deleteTarea;
const addComentario = async (req, res) => {
    try {
        const { id } = req.params;
        const { contenido } = req.body;
        if (!req.user) {
            return res.status(401).json({ error: 'No autenticado' });
        }
        // Verificar que la tarea existe
        const tarea = await prisma.tarea.findUnique({
            where: { id },
            select: { asignadoAId: true, creadoPorId: true }
        });
        if (!tarea) {
            return res.status(404).json({ error: 'Tarea no encontrada' });
        }
        const comentario = await prisma.tareaComentario.create({
            data: {
                tareaId: id,
                usuarioId: req.user.id,
                contenido
            },
            include: {
                usuario: {
                    select: { id: true, nombre: true, apellidos: true, avatar: true }
                }
            }
        });
        res.status(201).json({
            message: 'Comentario agregado exitosamente',
            comentario
        });
    }
    catch (error) {
        console.error('Error agregando comentario:', error);
        res.status(400).json({ error: 'No se pudo agregar el comentario' });
    }
};
exports.addComentario = addComentario;
const getMisTareas = async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({ error: 'No autenticado' });
        }
        const { estado, page = 1, limit = 10 } = req.query;
        const where = { asignadoAId: req.user.id };
        if (estado)
            where.estado = estado;
        const skip = (Number(page) - 1) * Number(limit);
        const [tareas, total] = await Promise.all([
            prisma.tarea.findMany({
                where,
                include: {
                    creadoPor: {
                        select: { id: true, nombre: true, apellidos: true }
                    },
                    actiu: {
                        select: { guid: true, tipus: true, subtipus: true }
                    },
                    _count: {
                        select: { comentarios: true, adjuntos: true }
                    }
                },
                skip,
                take: Number(limit),
                orderBy: [
                    { prioridad: 'desc' },
                    { fechaCreacion: 'desc' }
                ]
            }),
            prisma.tarea.count({ where })
        ]);
        res.json({
            tareas,
            pagination: {
                page: Number(page),
                limit: Number(limit),
                total,
                pages: Math.ceil(total / Number(limit))
            }
        });
    }
    catch (error) {
        console.error('Error obteniendo mis tareas:', error);
        res.status(400).json({ error: 'No se pudieron obtener las tareas' });
    }
};
exports.getMisTareas = getMisTareas;
