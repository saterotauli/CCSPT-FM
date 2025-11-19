"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteIfcBuilding = exports.updateIfcBuilding = exports.createIfcBuilding = exports.getIfcBuildings = void 0;
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
const getIfcBuildings = async (req, res) => {
    try {
        const ifcBuildings = await prisma.$queryRaw `
      SELECT * FROM "patrimoni"."ifcbuilding" ORDER BY nom ASC
    `;
        res.json(ifcBuildings);
    }
    catch (error) {
        res.status(500).json({ error: 'Error al obtener los ifcBuildingos', details: error });
    }
};
exports.getIfcBuildings = getIfcBuildings;
const createIfcBuilding = async (req, res) => {
    const { guid, nom, codi, id, centre_cost } = req.body;
    try {
        const result = await prisma.$executeRaw `
      INSERT INTO "patrimoni"."ifcbuilding" (guid, nom, codi, id, centre_cost)
      VALUES (${guid}, ${nom}, ${codi}, ${id}, ${centre_cost})
    `;
        res.status(201).json({ message: 'IfcBuilding creado' });
    }
    catch (error) {
        res.status(500).json({ error: 'Error al crear ifcBuilding', details: error });
    }
};
exports.createIfcBuilding = createIfcBuilding;
const updateIfcBuilding = async (req, res) => {
    const { guid } = req.params;
    const { nom, codi } = req.body;
    try {
        const result = await prisma.$executeRaw `
      UPDATE "patrimoni"."ifcbuilding"
      SET nom = ${nom}, codi = ${codi}
      WHERE guid = ${guid}
    `;
        res.json({ message: 'IfcBuilding actualizado' });
    }
    catch (error) {
        res.status(500).json({ error: 'Error al actualizar ifcBuilding', details: error });
    }
};
exports.updateIfcBuilding = updateIfcBuilding;
const deleteIfcBuilding = async (req, res) => {
    const { guid } = req.params;
    try {
        const result = await prisma.$executeRaw `
      DELETE FROM "patrimoni"."ifcbuilding"
      WHERE guid = ${guid}
    `;
        res.json({ message: 'IfcBuilding eliminado' });
    }
    catch (error) {
        res.status(500).json({ error: 'Error al eliminar ifcBuilding', details: error });
    }
};
exports.deleteIfcBuilding = deleteIfcBuilding;
