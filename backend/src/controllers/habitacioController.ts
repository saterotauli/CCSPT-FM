import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// GET /api/ifcspace/departaments?edifici=CQA
export const getDepartamentsByEdifici = async (req: Request, res: Response) => {
  try {
    const { edifici, planta } = req.query as { edifici?: string; planta?: string };
    if (!edifici || typeof edifici !== 'string') {
      return res.status(400).json({ error: 'Parámetro edifici requerido' });
    }

    console.log(`[ifcspace] Solicitud de departaments para edifici=${edifici}`);

    let result: Array<{ departament: string; guids: string[]; count: number; totalArea: number }> = [];
    if (planta && typeof planta === 'string' && planta.trim().length > 0) {
      const rawPlanta = planta.trim();
      console.log(`[ifcspace]   con filtro de planta=${rawPlanta}`);
      result = await prisma.$queryRaw`
        SELECT
          departament,
          ARRAY_AGG(guid) AS guids,
          COUNT(*)::int AS count,
          COALESCE(SUM(area), 0)::numeric(10,2) AS "totalArea"
        FROM "patrimoni"."ifcspace"
        WHERE edifici = ${edifici}
          AND TRIM(departament) <> ''
          AND departament IS NOT NULL
          AND TRIM(planta) = ${rawPlanta}
        GROUP BY departament
        ORDER BY "totalArea" DESC
      ` as any;
    } else {
      result = await prisma.$queryRaw`
        SELECT
          departament,
          ARRAY_AGG(guid) AS guids,
          COUNT(*)::int AS count,
          COALESCE(SUM(area), 0)::numeric(10,2) AS "totalArea"
        FROM "patrimoni"."ifcspace"
        WHERE edifici = ${edifici} AND departament IS NOT NULL AND TRIM(departament) <> ''
        GROUP BY departament
        ORDER BY "totalArea" DESC
      ` as any;
    }

    console.log(`[ifcspace] Departaments encontrados (${result.length} grupos)`);
    // Log de muestra (primeros 5 grupos) para no saturar consola
    for (const item of result.slice(0, 5)) {
      console.log(`  - ${item.departament}: ${item.count} guids, ${item.totalArea} m²`);
    }

    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: 'Error al obtener departaments por edificio', details: err.message });
  }
};

// GET /api/ifcspace/search?departament=valor&edificio=CQA
export const buscarPorDepartamento = async (req: Request, res: Response) => {
  try {
    const { departament, edificio } = req.query;
    
    if (!departament || typeof departament !== 'string') {
      return res.status(400).json({ error: 'Parámetro departament requerido' });
    }
    
    if (departament.trim().length < 3) {
      return res.status(400).json({ error: 'Mínimo 3 caracteres para buscar' });
    }
    
    let ifcSpaces;
    
    if (edificio && typeof edificio === 'string') {
      // Buscar solo en el edificio especificado
      ifcSpaces = await prisma.$queryRaw`
        SELECT guid, codi, dispositiu, edifici, planta, departament, area 
        FROM "patrimoni"."ifcspace" 
        WHERE LOWER(departament) LIKE LOWER(${`%${departament}%`})
        AND edifici = ${edificio}
        ORDER BY departament, codi ASC
      `;
    } else {
      // Buscar en todos los edificios
      ifcSpaces = await prisma.$queryRaw`
        SELECT guid, codi, dispositiu, edifici, planta, departament, area 
        FROM "patrimoni"."ifcspace" 
        WHERE LOWER(departament) LIKE LOWER(${`%${departament}%`})
        ORDER BY edifici, departament, codi ASC
      `;
    }
    
    res.json(ifcSpaces);
  } catch (err: any) {
    res.status(500).json({ error: 'Error al buscar por departamento', details: err.message });
  }
};

// GET /api/ifcspace/devices?guids=guid1,guid2,guid3&edifici=CQA
export const getDevicesByGuids = async (req: Request, res: Response) => {
  try {
    const { guids, edifici } = req.query;
    
    if (!guids || typeof guids !== 'string') {
      return res.status(400).json({ error: 'Parámetro guids requerido' });
    }
    
    if (!edifici || typeof edifici !== 'string') {
      return res.status(400).json({ error: 'Parámetro edifici requerido' });
    }
    
    const guidArray = guids.split(',').map(g => g.trim()).filter(g => g.length > 0);
    
    if (guidArray.length === 0) {
      return res.status(400).json({ error: 'Al menos un GUID debe ser proporcionado' });
    }
    
    console.log(`[ifcspace] Buscando dispositivos para ${guidArray.length} GUIDs en edifici=${edifici}`);
    console.log(`[ifcspace] Primeros 5 GUIDs:`, guidArray.slice(0, 5));
    
    const devices = await prisma.$queryRaw`
      SELECT guid, dispositiu, codi, departament, planta, area
      FROM "patrimoni"."ifcspace" 
      WHERE guid = ANY(${guidArray})
        AND edifici = ${edifici}
      ORDER BY departament, codi ASC
    ` as any;
    
    console.log(`[ifcspace] Dispositivos encontrados: ${devices.length}`);
    if (devices.length > 0) {
      console.log(`[ifcspace] Primeros 3 dispositivos:`, devices.slice(0, 3));
    }
    
    res.json(devices);
  } catch (err: any) {
    res.status(500).json({ error: 'Error al obtener dispositivos por GUIDs', details: err.message });
  }
};

// GET /api/ifcspace
export const getHabitacions = async (req: Request, res: Response) => {
  try {
    const ifcSpaces = await prisma.$queryRaw`
      SELECT * FROM "patrimoni"."ifcspace" ORDER BY guid ASC
    `;
    res.json(ifcSpaces);
  } catch (err: any) {
    res.status(500).json({ error: 'Error al obtener las ifcSpaces', details: err.message });
  }
};

// POST /api/ifcspace/summary
export const summaryHabitacions = async (req: Request, res: Response) => {
  try {
    let ifcSpaces = [];
    if (Array.isArray(req.body)) {
      ifcSpaces = req.body;
    } else if (typeof req.body === 'object' && req.body !== null) {
      ifcSpaces = req.body.ifcSpaces;
    }
    if (!Array.isArray(ifcSpaces)) {
      return res.status(400).json({ error: 'El cuerpo debe ser un array de ifcSpaces.' });
    }
    if (ifcSpaces.length === 0) {
      return res.status(200).json({ nuevos: 0, borrados: 0, modificados: 0 });
    }
    // Agrupar por edificio
    const edificios = Array.from(new Set(ifcSpaces.map((h: any) => h.edifici)));
    let nuevos = 0, borrados = 0, modificados = 0;
    for (const edificio of edificios) {
      const nuevasHabitaciones = ifcSpaces.filter((h: any) => h.edifici === edificio);
      const habitacionesDB: any[] = await prisma.$queryRaw`
        SELECT guid, codi, planta, dispositiu, departament, id, centre_cost, area FROM "patrimoni"."ifcspace" WHERE edifici = ${edificio}
      `;
      const guidsDB = habitacionesDB.map(h => h.guid);
      const guidsNuevos = nuevasHabitaciones.map((h: any) => h.guid);
      // Nuevos: están en nuevasHabitaciones pero no en la base de datos
      nuevos += nuevasHabitaciones.filter(h => !guidsDB.includes(h.guid)).length;
      // Borrados: están en la base de datos pero no en nuevasHabitaciones
      borrados += habitacionesDB.filter(h => !guidsNuevos.includes(h.guid)).length;
      // Modificados: existen en ambos pero tienen diferencias de campos relevantes
      modificados += nuevasHabitaciones.filter(h => {
        const db = habitacionesDB.find(x => x.guid === h.guid);
        if (!db) return false;
        // Compara campos relevantes
        return (
          db.codi !== h.codi ||
          db.planta !== h.planta ||
          db.dispositiu !== h.dispositiu ||
          db.departament !== h.departament ||
          db.id !== h.id ||
          db.centre_cost !== h.centre_cost ||
          Number(db.area) !== Number(h.area)
        );
      }).length;
    }
    res.json({ nuevos, borrados, modificados });
  } catch (err: any) {
    res.status(500).json({ error: 'Error al calcular el resumen de ifcSpaces', details: err.message });
  }
};

// POST /api/ifcspace
export const updateHabitacions = async (req: Request, res: Response) => {
  try {
    let confirmDelete = false;
    let ifcSpaces = [];
    // Permitir que el body sea un array plano o un objeto
    if (Array.isArray(req.body)) {
      ifcSpaces = req.body;
    } else if (typeof req.body === 'object' && req.body !== null) {
      ifcSpaces = req.body.ifcSpaces;
      confirmDelete = req.body.confirmDelete || false;
    }
    if (!Array.isArray(ifcSpaces)) {
      return res.status(400).json({ error: 'El cuerpo debe ser un array de ifcSpaces.' });
    }
    if (ifcSpaces.length === 0) {
      return res.status(400).json({ error: 'El array de ifcSpaces está vacío.' });
    }
    // LOG: Mostrar el array recibido para depuración
    console.log('Recibido en backend (ifcSpaces):', ifcSpaces);
    // Agrupar habitaciones subidas por edificio
    const edificios = Array.from(new Set(ifcSpaces.map((h: any) => h.edifici)));
    let habitacionesAEliminar: any[] = [];
    for (const edificio of edificios) {
      console.log(`Edificio procesado: ${edificio}`);
      // Todas las habitaciones subidas para este edificio
      const nuevasHabitaciones = ifcSpaces.filter((h: any) => h.edifici === edificio);
      // Obtener todas las habitaciones actuales de ese edificio (con info extra)
      const habitacionesDB: any[] = await prisma.$queryRaw`
        SELECT guid, codi, planta, dispositiu, departament FROM "patrimoni"."ifcspace" WHERE edifici = ${edificio}
      `;
      const guidsDB = habitacionesDB.map(h => h.guid);
      const guidsNuevos = nuevasHabitaciones.map((h: any) => h.guid);
      console.log(`Guids en BD para edificio ${edificio}:`, guidsDB);
      console.log(`Guids recibidos para edificio ${edificio}:`, guidsNuevos);
      // Habitaciones a eliminar: están en la base de datos pero no en el fichero
      const aEliminar = habitacionesDB.filter(h => !guidsNuevos.includes(h.guid));
      console.log(`Guids a eliminar para edificio ${edificio}:`, aEliminar.map(h => h.guid));
      habitacionesAEliminar = habitacionesAEliminar.concat(aEliminar);
    }
    if (!confirmDelete) {
      // Solo advertir, no borrar
      return res.status(200).json({
        advertencia: 'Se detectaron habitaciones que serían eliminadas si confirmas.',
        habitacionesAEliminar
      });
    }
    // Borrar habitaciones que ya no están
    if (habitacionesAEliminar.length > 0) {
      const guidsAEliminar = habitacionesAEliminar.map(h => h.guid);
      await prisma.$executeRaw`
        DELETE FROM "patrimoni"."ifcspace" WHERE guid = ANY(${guidsAEliminar})
      `;
    }
    // Insertar o actualizar habitaciones nuevas/actualizadas
    for (const h of ifcSpaces) {
      // LOG: Mostrar cada habitación que se va a guardar/actualizar
      console.log('Guardando/actualizando habitación:', h);
      await prisma.$executeRaw`
        INSERT INTO "patrimoni"."ifcspace" (
          guid, dispositiu, edifici, planta, departament, id, centre_cost, area
        ) VALUES (
          ${h.guid}, ${h.dispositiu}, ${h.edifici}, ${h.planta}, ${h.departament}, ${h.id}, ${h.centre_cost}, ${h.area}
        )
        ON CONFLICT (guid) DO UPDATE SET
          dispositiu = EXCLUDED.dispositiu,
          edifici = EXCLUDED.edifici,
          planta = EXCLUDED.planta,
          departament = EXCLUDED.departament,
          id = EXCLUDED.id,
          centre_cost = EXCLUDED.centre_cost,
          area = EXCLUDED.area;
      `;
    }
    res.json({ message: 'IfcSpaces actualizados correctamente', habitacionesEliminadas: habitacionesAEliminar });
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: 'Error al actualizar las ifcSpaces', details: err.message });
  }
};

export const searchDepartmentsAndDevices = async (req: Request, res: Response) => {
  try {
    const { query } = req.query;
    if (!query || typeof query !== 'string') {
      return res.status(400).json({ error: 'Parámetro query requerido' });
    }

    console.log(`🔍 Buscando: "${query}" en departamentos y dispositivos`);
    
    // Normalizar la consulta para búsqueda insensible a acentos
    const normalizedQuery = query.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
    console.log(`🔍 Consulta normalizada: "${normalizedQuery}"`);
    
    // Función para normalizar texto (quitar acentos)
    const normalizeText = (text: string) => {
      return text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
    };
    
    // Hacer una consulta de prueba para ver qué departamentos hay
    const testQuery = await prisma.$queryRaw`
      SELECT DISTINCT departament, LOWER(departament) as lower_dept
      FROM "patrimoni"."ifcspace" 
      WHERE departament ILIKE '%qui%' OR departament ILIKE '%quir%' OR departament ILIKE '%quiro%'
      LIMIT 10
    ` as any;
    console.log(`🔍 Departamentos que contienen 'qui':`, testQuery);
    
    // Hacer una consulta específica para "Quiròfan"
    const testQuirofan = await prisma.$queryRaw`
      SELECT DISTINCT departament, dispositiu, LOWER(departament) as lower_dept, LOWER(dispositiu) as lower_disp
      FROM "patrimoni"."ifcspace" 
      WHERE departament ILIKE '%quir%' OR dispositiu ILIKE '%quir%'
      LIMIT 10
    ` as any;
    console.log(`🔍 Elementos que contienen 'quir':`, testQuirofan);
    
    // Obtener todos los datos y filtrar en JavaScript
    const allData = await prisma.$queryRaw`
      SELECT 
        guid,
        departament,
        dispositiu,
        edifici,
        planta,
        area
      FROM "patrimoni"."ifcspace"
      ORDER BY 
        departament ASC,
        dispositiu ASC
    ` as any;
    
    // Filtrar y procesar en JavaScript
    const allResults: any[] = [];
    
    for (const item of allData) {
      const normalizedDepartament = normalizeText(item.departament || '');
      const normalizedDispositiu = normalizeText(item.dispositiu || '');
      const normalizedQuery = normalizeText(query);
      
      const deptMatch = normalizedDepartament.includes(normalizedQuery);
      const dispMatch = normalizedDispositiu.includes(normalizedQuery);
      
      if (deptMatch && dispMatch) {
        // Si coincide en ambos, crear dos entradas
        allResults.push({
          ...item,
          tipo_coincidencia: 'departament'
        });
        allResults.push({
          ...item,
          tipo_coincidencia: 'dispositiu'
        });
      } else if (deptMatch) {
        // Solo coincide en departamento
        allResults.push({
          ...item,
          tipo_coincidencia: 'departament'
        });
      } else if (dispMatch) {
        // Solo coincide en dispositivo
        allResults.push({
          ...item,
          tipo_coincidencia: 'dispositiu'
        });
      }
    }
    
    console.log(`🔍 Resultados brutos encontrados: ${allResults.length}`);
    if (allResults.length > 0) {
      console.log(`🔍 Primeros 5 resultados:`, allResults.slice(0, 5).map(r => ({
        departament: r.departament,
        dispositiu: r.dispositiu,
        tipo: r.tipo_coincidencia,
        normalized_dept: normalizeText(r.departament || ''),
        normalized_disp: normalizeText(r.dispositiu || ''),
        normalized_query: normalizeText(query)
      })));
    }

    // Procesar resultados para unificar departamentos
    const processedResults: any[] = [];
    const departmentGroups = new Map<string, any[]>();

    for (const result of allResults) {
      if (result.tipo_coincidencia === 'departament') {
        // Agrupar por departamento, edificio y planta
        const key = `${result.departament}|${result.edifici}|${result.planta}`;
        if (!departmentGroups.has(key)) {
          departmentGroups.set(key, []);
        }
        departmentGroups.get(key)!.push(result);
      } else if (result.tipo_coincidencia === 'dispositiu') {
        // Dispositivos se mantienen individuales
        processedResults.push({
          guid: result.guid,
          departament: result.departament,
          dispositiu: result.dispositiu,
          edifici: result.edifici,
          planta: result.planta,
          total_area: result.area,
          element_count: 1,
          tipo_coincidencia: 'dispositiu'
        });
      }
      // Si es 'ambos', se incluye tanto en departamento como dispositivo
    }

    // Agregar departamentos unificados
    for (const [key, group] of departmentGroups) {
      const [departament, edifici, planta] = key.split('|');
      const totalArea = group.reduce((sum, item) => sum + (item.area || 0), 0);
      
      processedResults.push({
        guid: group[0].guid, // Usar el primer GUID como representativo
        departament,
        dispositiu: '', // Vacío para departamentos unificados
        edifici,
        planta,
        total_area: totalArea,
        element_count: group.length,
        tipo_coincidencia: 'departament'
      });
    }

    // Ordenar resultados
    const searchResults = processedResults
      .sort((a, b) => {
        // Priorizar departamentos sobre dispositivos
        if (a.tipo_coincidencia === 'departament' && b.tipo_coincidencia !== 'departament') return -1;
        if (a.tipo_coincidencia !== 'departament' && b.tipo_coincidencia === 'departament') return 1;
        return a.departament.localeCompare(b.departament);
      })
      .slice(0, 50);

    console.log(`✅ Encontrados ${searchResults.length} resultados para "${query}"`);
    
    res.json(searchResults);
  } catch (err: any) {
    console.error('❌ Error en búsqueda:', err);
    res.status(500).json({ error: 'Error al buscar departamentos y dispositivos', details: err.message });
  }
};
