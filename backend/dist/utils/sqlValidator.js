"use strict";
// Utilidad para validar consultas SQL generadas
// Aquí puedes agregar funciones para comprobar la validez y seguridad de las consultas
Object.defineProperty(exports, "__esModule", { value: true });
exports.isValidSQL = isValidSQL;
function isValidSQL(query) {
    // TODO: Implementar validaciones reales
    return query.trim().toLowerCase().startsWith('select');
}
