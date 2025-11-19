"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireOperario = exports.requireCoordinador = exports.requireAdmin = exports.requireRole = exports.authenticateToken = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
const authenticateToken = async (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) {
        return res.status(401).json({ error: 'Token de acceso requerido' });
    }
    try {
        const decoded = jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET);
        // Verificar que el usuario existe y está activo
        const user = await prisma.usuario.findUnique({
            where: { id: decoded.id, activo: true },
            select: { id: true, email: true, rol: true }
        });
        if (!user) {
            return res.status(401).json({ error: 'Usuario no válido' });
        }
        req.user = user;
        next();
    }
    catch (error) {
        return res.status(403).json({ error: 'Token no válido' });
    }
};
exports.authenticateToken = authenticateToken;
const requireRole = (roles) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ error: 'No autenticado' });
        }
        if (!roles.includes(req.user.rol)) {
            return res.status(403).json({ error: 'Permisos insuficientes' });
        }
        next();
    };
};
exports.requireRole = requireRole;
exports.requireAdmin = (0, exports.requireRole)(['ADMIN']);
exports.requireCoordinador = (0, exports.requireRole)(['ADMIN', 'COORDINADOR']);
exports.requireOperario = (0, exports.requireRole)(['ADMIN', 'COORDINADOR', 'OPERARIO']);
