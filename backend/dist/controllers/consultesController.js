"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.consultaNatural = void 0;
const client_1 = require("@prisma/client");
const sqlAssistantPrompt_1 = require("../prompts/sqlAssistantPrompt");
const openaiService_1 = require("../services/openaiService");
const sqlValidator_1 = require("../utils/sqlValidator");
const prisma = new client_1.PrismaClient();
// Diccionario de sinónimos para subtipus
const subtipusDictionary = {
    'ducha': 'DutxaPlat',
    'duchas': 'DutxaPlat',
    'dutxa': 'DutxaPlat',
    'dutxes': 'DutxaPlat',
    'plato de ducha': 'DutxaPlat',
    'plat de dutxa': 'DutxaPlat',
    'plat dutxa': 'DutxaPlat',
    // Magatzem/almacén sinónimos
    'magatzem': 'Mgtz.',
    'magatzems': 'Mgtz.',
    'almacén': 'Mgtz.',
    'almacen': 'Mgtz.',
    'almacenes': 'Mgtz.',
    'mgtz': 'Mgtz.',
    'mgtz.': 'Mgtz.',
    // InodorMonobloc sinónimos
    'inodor': 'InodorMonobloc',
    'inodoro': 'InodorMonobloc',
    'inodors': 'InodorMonobloc',
    'inodoros': 'InodorMonobloc',
    'water': 'InodorMonobloc',
    'wc': 'InodorMonobloc',
    'váter': 'InodorMonobloc',
    'vater': 'InodorMonobloc',
    // LavaboMural sinónimos
    'lavabo': 'LavaboMural',
    'lavabos': 'LavaboMural',
    'pica': 'LavaboMural',
    'piques': 'LavaboMural',
    'rentamans': 'LavaboMural',
    'rentamanos': 'LavaboMural',
    'lavamanos': 'LavaboMural',
    'lavamanos mural': 'LavaboMural',
    // Añade aquí más sinónimos según sea necesario
};
function normalizaPregunta(pregunta) {
    let preguntaNormalizada = pregunta;
    for (const [sinonimo, canonico] of Object.entries(subtipusDictionary)) {
        // Reemplazo insensible a mayúsculas/minúsculas y solo palabras completas
        const regex = new RegExp(`\\b${sinonimo}\\b`, 'gi');
        preguntaNormalizada = preguntaNormalizada.replace(regex, canonico);
    }
    return preguntaNormalizada;
}
const consultaNatural = async (req, res) => {
    try {
        const { pregunta, edificio } = req.body;
        if (!pregunta) {
            return res.status(400).json({ error: 'La consulta es obligatoria.' });
        }
        // Normalizar la pregunta usando el diccionario de subtipus
        const preguntaNormalizada = normalizaPregunta(pregunta);
        let promptFinal;
        if (edificio) {
            const instruccion = `Contexto: El usuario ha solicitado filtrar por el edificio '${edificio}'. Aplica SIEMPRE la condición de filtrado correcta: para consultas a 'actius', usa "LEFT(ubicacio, 3) = '${edificio}'"; para consultas a 'ifcspace', usa "edifici = '${edificio}'".`;
            const preguntaModificada = `${preguntaNormalizada} (del edificio ${edificio})`;
            promptFinal = `${sqlAssistantPrompt_1.sqlAssistantPrompt}\n\n${instruccion}\nPregunta: ${preguntaModificada}`;
        }
        else {
            promptFinal = `${sqlAssistantPrompt_1.sqlAssistantPrompt}\n\nPregunta: ${preguntaNormalizada}`;
        }
        const prompt = promptFinal;
        // Obtener la consulta SQL desde OpenAI
        const sql = (await (0, openaiService_1.getOpenAICompletion)(prompt)).trim();
        console.log('SQL generado:', sql);
        // Validar la consulta SQL antes de ejecutarla
        if (!(0, sqlValidator_1.isValidSQL)(sql)) {
            return res.status(400).json({ error: 'La consulta generada no es válida.', sql });
        }
        // Ejecutar la consulta SQL
        let result;
        function replacerBigInt(key, value) {
            return typeof value === 'bigint' ? value.toString() : value;
        }
        try {
            result = await prisma.$queryRawUnsafe(sql);
        }
        catch (e) {
            console.error('Error ejecutando la consulta SQL generada:', e);
            return res.status(400).json({ error: 'Error ejecutando la consulta SQL generada.', sql, details: e.message });
        }
        // Asegura que cada fila tenga un campo 'guid' correcto para el frontend
        let resultWithGuid = Array.isArray(result)
            ? result.map((row) => {
                let guid = row.GlobalId || row.globalid || row.guid;
                // Si no hay campo, busca el primer valor tipo GUID IFC
                if (!guid) {
                    for (const v of Object.values(row)) {
                        if (typeof v === 'string' && /^[A-Za-z0-9_$]{22}$/.test(v)) {
                            guid = v;
                            break;
                        }
                    }
                }
                return { ...row, guid };
            })
            : result;
        res.setHeader('Content-Type', 'application/json');
        res.send(JSON.stringify({ sql, result: resultWithGuid }, replacerBigInt));
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error en la consulta', details: err.message });
    }
};
exports.consultaNatural = consultaNatural;
