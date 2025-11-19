"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getEphemeralRoomsWithInfo = exports.getEphemeralStatistics = exports.getEphemeralFilteredReadings = exports.getAllEphemeralReadings = exports.getEphemeralMultipleRooms = exports.getEphemeralRoomHistory = exports.getEphemeralRoomReading = exports.getEphemeralStatus = void 0;
const ephemeralSensorService_1 = require("../services/ephemeralSensorService");
/**
 * GET /api/ephemeral-sensors/status
 * Obtiene el estado del servicio efímero
 */
const getEphemeralStatus = async (req, res) => {
    try {
        const status = ephemeralSensorService_1.ephemeralSensorService.getServiceStatus();
        res.json(status);
    }
    catch (error) {
        console.error('Error obteniendo estado efímero:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
};
exports.getEphemeralStatus = getEphemeralStatus;
/**
 * GET /api/ephemeral-sensors/room/:spaceGuid
 * Obtiene la lectura actual de sensores para una habitación específica
 */
const getEphemeralRoomReading = async (req, res) => {
    try {
        const { spaceGuid } = req.params;
        if (!spaceGuid) {
            return res.status(400).json({ error: 'spaceGuid es requerido' });
        }
        const reading = await ephemeralSensorService_1.ephemeralSensorService.getCurrentSensorReading(spaceGuid);
        if (!reading) {
            return res.status(404).json({ error: 'Habitación no encontrada' });
        }
        res.json(reading);
    }
    catch (error) {
        console.error('Error obteniendo lectura efímera:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
};
exports.getEphemeralRoomReading = getEphemeralRoomReading;
/**
 * GET /api/ephemeral-sensors/room/:spaceGuid/history
 * Obtiene un historial simulado de lecturas para una habitación
 */
const getEphemeralRoomHistory = async (req, res) => {
    try {
        const { spaceGuid } = req.params;
        const { count = '10' } = req.query;
        if (!spaceGuid) {
            return res.status(400).json({ error: 'spaceGuid es requerido' });
        }
        const countNum = parseInt(count, 10);
        if (isNaN(countNum) || countNum < 1 || countNum > 100) {
            return res.status(400).json({ error: 'count debe ser un número entre 1 y 100' });
        }
        const history = await ephemeralSensorService_1.ephemeralSensorService.getSensorHistory(spaceGuid, countNum);
        res.json(history);
    }
    catch (error) {
        console.error('Error obteniendo historial efímero:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
};
exports.getEphemeralRoomHistory = getEphemeralRoomHistory;
/**
 * GET /api/ephemeral-sensors/rooms
 * Obtiene lecturas actuales para múltiples habitaciones
 */
const getEphemeralMultipleRooms = async (req, res) => {
    try {
        const { spaceGuids } = req.query;
        if (!spaceGuids || typeof spaceGuids !== 'string') {
            return res.status(400).json({ error: 'spaceGuids es requerido (array de GUIDs separados por comas)' });
        }
        const guidArray = spaceGuids.split(',').map(guid => guid.trim());
        if (guidArray.length > 100) {
            return res.status(400).json({ error: 'Máximo 100 habitaciones por consulta' });
        }
        const readings = await ephemeralSensorService_1.ephemeralSensorService.getCurrentSensorReadings(guidArray);
        res.json(readings);
    }
    catch (error) {
        console.error('Error obteniendo lecturas múltiples efímeras:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
};
exports.getEphemeralMultipleRooms = getEphemeralMultipleRooms;
/**
 * GET /api/ephemeral-sensors/all
 * Obtiene lecturas actuales para todas las habitaciones
 */
const getAllEphemeralReadings = async (req, res) => {
    try {
        const readings = await ephemeralSensorService_1.ephemeralSensorService.getAllCurrentSensorReadings();
        res.json(readings);
    }
    catch (error) {
        console.error('Error obteniendo todas las lecturas efímeras:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
};
exports.getAllEphemeralReadings = getAllEphemeralReadings;
/**
 * GET /api/ephemeral-sensors/filtered
 * Obtiene lecturas actuales filtradas por edificio y/o planta
 */
const getEphemeralFilteredReadings = async (req, res) => {
    try {
        const { edifici, planta } = req.query;
        const readings = await ephemeralSensorService_1.ephemeralSensorService.getCurrentSensorReadingsFiltered(edifici, planta);
        res.json(readings);
    }
    catch (error) {
        console.error('Error obteniendo lecturas filtradas efímeras:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
};
exports.getEphemeralFilteredReadings = getEphemeralFilteredReadings;
/**
 * GET /api/ephemeral-sensors/statistics
 * Obtiene estadísticas de los sensores efímeros
 */
const getEphemeralStatistics = async (req, res) => {
    try {
        const stats = await ephemeralSensorService_1.ephemeralSensorService.getEphemeralStats();
        res.json(stats);
    }
    catch (error) {
        console.error('Error obteniendo estadísticas efímeras:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
};
exports.getEphemeralStatistics = getEphemeralStatistics;
/**
 * GET /api/ephemeral-sensors/rooms-with-info
 * Obtiene habitaciones con información y lecturas actuales
 */
const getEphemeralRoomsWithInfo = async (req, res) => {
    try {
        const { edifici, planta } = req.query;
        const readings = await ephemeralSensorService_1.ephemeralSensorService.getCurrentSensorReadingsFiltered(edifici, planta);
        // Formatear respuesta con información completa
        const formattedReadings = readings.map(({ spaceGuid, reading, roomInfo }) => ({
            spaceGuid,
            ...roomInfo,
            temperature: reading.temperature,
            humidity: reading.humidity,
            ppm: reading.ppm,
            timestamp: reading.timestamp
        }));
        res.json(formattedReadings);
    }
    catch (error) {
        console.error('Error obteniendo habitaciones con info efímera:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
};
exports.getEphemeralRoomsWithInfo = getEphemeralRoomsWithInfo;
