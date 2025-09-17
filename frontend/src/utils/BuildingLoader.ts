import * as OBC from "@thatopen/components";
import * as OBF from "@thatopen/components-front";
import * as FRAGS from "@thatopen/fragments";
import * as BUI from "@thatopen/ui";
import { createBuildingMarker, createSpaceMarker, ensureGlobalMarkerCSS } from "../bim/Markers";
import * as THREE from "three";
import { modelStore, BUILDINGS, BUILDING_COLORS } from "../globals";

function getSavedBuildingColors(): Record<string, string> {
  try {
    const raw = localStorage.getItem('ccspt:building-colors');
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed as Record<string, string> : {};
  } catch { return {}; }
}

// Feature flag para mostrar etiquetas de IFCSPACE. Por defecto desactivado para evitar duplicados.
const SHOW_SPACE_LABELS = false;

/**
 * Etiqueta cada IFCSPACE en el punto superior central de su bounding box (BoundingBoxer).
 */
export async function labelSpacesAtBBoxTop(components: OBC.Components) {
  if (!SHOW_SPACE_LABELS) return; // hard stop to avoid duplicates if called indirectamente
  const fragments = components.get(OBC.FragmentsManager);
  const worlds = components.get(OBC.Worlds);
  const marker = components.get(OBF.Marker);
  const boxer = components.get(OBC.BoundingBoxer);
  const world = worlds.list.get(Array.from(worlds.list.keys())[0]);
  if (!world) return;

  // Activar y limpiar markers previos
  marker.threshold = 20;
  try { (marker as any).enabled = true; } catch {}
  // No limpiar toda la lista global para no borrar otros tipos (p. ej., edificios)
  // Limpiar solo los DOM markers de tipo IFCSPACE
  try { document.querySelectorAll('[data-marker="ifcspace"]').forEach((el) => el.remove()); } catch {}

  let count = 0;
  for (const [modelId, model] of fragments.list) {
    try {
      // Buscar solo la categoría exacta IFCSPACE para evitar falsos positivos
      const categoryIds = await (model as any).getItemsOfCategories([/IFCSPACE/i]);
      const ifcSpaceIds: number[] = (categoryIds.IFCSPACE || []) as number[];
      if (!ifcSpaceIds.length) continue;

      for (const id of ifcSpaceIds) {
        try {
          // BBox por elemento usando BoundingBoxer
          boxer.list.clear();
          const modelIdMap: OBC.ModelIdMap = { [modelId]: new Set([id]) } as any;
          await boxer.addFromModelIdMap(modelIdMap);
          const box = boxer.get();
          boxer.list.clear();
          if (!box) continue;

          const center = new THREE.Vector3();
          box.getCenter(center);
          const topY = box.max.y + 2; // pequeño offset
          const pos = new THREE.Vector3(center.x, topY, center.z);

          // Texto del label
          let labelText: string | undefined = await getSpaceIdentifier(components, model, id);
          if (!labelText) labelText = `Space [${id}]`;

          ensureGlobalMarkerCSS();
          const markerElement = createSpaceMarker(labelText);
          marker.create(world, markerElement as unknown as HTMLElement, pos);
          count++;
        } catch {}
      }
    } catch {}
  }
  console.log(`[IFCSPACE labels@bbox] creados: ${count}`);
  try { (globalThis as any).labelSpacesAtBBoxTop = () => labelSpacesAtBBoxTop(components); } catch {}
}

/**
 * Coloca etiquetas para edificios usando datos de BD (/api/ifcbuildings):
 * texto = nom, búsqueda por GUID, posición = centro XZ y yMax + offset de la bounding box del elemento.
 */
async function labelBuildingsFromDB(components: OBC.Components) {
  const fragments = components.get(OBC.FragmentsManager);
  const worlds = components.get(OBC.Worlds);
  const marker = components.get(OBF.Marker);
  const world = worlds.list.get(Array.from(worlds.list.keys())[0]);
  if (!world) return;

  // Asegurar markers activos y limpiar anteriores
  marker.threshold = 10;
  try { (marker as any).enabled = true; } catch {}
  // Limpiar lista interna de markers para evitar que markers antiguos (p. ej. ifcspace) se vuelvan a crear
  try { marker.list.clear(); } catch {}
  // Eliminar DOM markers de edificios y de ifcspace para evitar duplicados
  try {
    document.querySelectorAll('[data-marker="building"]').forEach((el) => el.remove());
    document.querySelectorAll('[data-marker="ifcspace"]').forEach((el) => el.remove());
  } catch {}

  // Leer edificios de BD
  let rows: Array<{ guid?: string; nom?: string; codi?: string; color?: string }> = [];
  try {
    const res = await fetch('/api/ifcbuildings', { headers: { Accept: 'application/json' } });
    if (res.ok) rows = await res.json();
  } catch {}
  if (!Array.isArray(rows) || !rows.length) return;

  // Mapear cada GUID del edificio a ids locales usando FragmentsManager
  for (const row of rows) {
    const guid = row?.guid;
    const label = row?.nom || row?.codi || 'Sense nom';
    if (!guid) continue;
    try {
      const guidMap = await fragments.guidsToModelIdMap([guid] as any);
      // Unir todas las ids de todos los modelos en un único mapa para una sola bbox
      const combined: Record<string, Set<number>> = {};
      for (const [modelId, ids] of Object.entries(guidMap as Record<string, number[] | Set<number>>)) {
        const model = fragments.list.get(modelId);
        if (!model) continue;
        const set = combined[modelId] || new Set<number>();
        const arr = Array.isArray(ids) ? (ids as number[]) : Array.from(ids as Set<number>);
        for (const id of arr) set.add(id);
        combined[modelId] = set;
      }
      if (Object.keys(combined).length === 0) continue;

      // Calcular bbox del edificio usando todas las ids combinadas
      const boxer = components.get(OBC.BoundingBoxer);
      boxer.list.clear();
      await boxer.addFromModelIdMap(combined as any);
      const box = boxer.get();
      boxer.list.clear();
      if (!box) continue;

      const center = new THREE.Vector3();
      box.getCenter(center);
      const topY = box.max.y + 2; // pequeño offset, igual que en labelSpacesAtBBoxTop
      const elevated = new THREE.Vector3(center.x, topY, center.z);

      try {
        const width = (box.max.x - box.min.x);
        const height = (box.max.y - box.min.y);
        const depth = (box.max.z - box.min.z);
        // console.log(`[BuildingBBox] ${label}: width=${width.toFixed(2)}, depth=${depth.toFixed(2)}, height=${height.toFixed(2)}, topY=${topY.toFixed(2)} (merged)`);
      } catch {}

      ensureGlobalMarkerCSS();
      const markerElement = createBuildingMarker(label);
      // keep data attributes if used elsewhere for debugging
      try {
        (markerElement as HTMLElement).setAttribute('data-marker-x', elevated.x.toFixed(3));
        (markerElement as HTMLElement).setAttribute('data-marker-y', elevated.y.toFixed(3));
        (markerElement as HTMLElement).setAttribute('data-marker-z', elevated.z.toFixed(3));
      } catch {}
      marker.create(world, markerElement as unknown as HTMLElement, elevated);
    } catch {}
  }
}

/**
 * Dibuja la geometría de la bounding box de TODOS los IFCSPACE cargados.
 * Limpia los helpers anteriores si existen.
 */
export async function drawIFCSpaceBBoxes(components: OBC.Components) {
  const fragments = components.get(OBC.FragmentsManager);
  const worlds = components.get(OBC.Worlds);
  const boxer = components.get(OBC.BoundingBoxer);
  const disposer = components.get(OBC.Disposer);
  const worldKeys = Array.from(worlds.list.keys());
  const worldId = worldKeys[0];
  const world = worlds.list.get(worldId);
  if (!world) return;

  const scene: THREE.Scene | undefined = (world as any)?.scene?.three ?? (world as any)?.three?.scene;
  if (!scene) return;

  // Eliminar helpers anteriores  // Remove previous helpers
  const registryKey = '__ifcspace_bbox_helpers';
  try {
    const prev: THREE.Object3D[] | undefined = (globalThis as any)[registryKey];
    if (Array.isArray(prev)) {
      for (const obj of prev) {
        try { scene.remove(obj); } catch {}
        try { disposer.destroy(obj); } catch {}
      }
    }
  } catch {}

  // Also remove any leftover helpers tagged in the scene (in case registry was lost)
  try {
    const toRemove: THREE.Object3D[] = [];
    scene.traverse((o: any) => { if (o?.userData?.ifcspaceHelper) toRemove.push(o as THREE.Object3D); });
    for (const o of toRemove) {
      try { scene.remove(o); } catch {}
      try { disposer.destroy(o); } catch {}
    }
  } catch {}

  const helpers: THREE.Object3D[] = [];

  for (const [modelId, model] of fragments.list) {
    try {
      const categoryIds = await (model as any).getItemsOfCategories([/IFCSPACE/i]);
      const ifcSpaceIds: number[] = (categoryIds.IFCSPACE || []) as number[];
      console.log(`[BBoxes] Modelo ${modelId}: IFCSPACE ids = ${ifcSpaceIds.length}`);
      if (!ifcSpaceIds.length) continue;

      for (const id of ifcSpaceIds) {
        try {
          // Construir ModelIdMap solo con este elemento
          const modelIdMap: OBC.ModelIdMap = { [modelId]: new Set([id]) } as any;
          boxer.list.clear();
          await boxer.addFromModelIdMap(modelIdMap);
          const box = boxer.get();
          boxer.list.clear();
          if (!box) continue;

          const helper = new THREE.Box3Helper(box, new THREE.Color(0xffff00));
          try { (helper as any).userData = { ...(helper as any).userData, ifcspaceHelper: true }; } catch {}
          try {
            const mat = (helper as any).material as THREE.LineBasicMaterial | undefined;
            if (mat) { mat.transparent = true; mat.opacity = 0.95; mat.depthTest = false; }
          } catch {}
          (helper as any).renderOrder = 9999;
          helpers.push(helper);
        } catch (e) {
          // continuar con el siguiente id
        }
      }
    } catch (e) {
      console.warn('[BBoxes] Error en modelo', modelId, e);
    }
  }

  // Guardar registro global para poder limpiar después
  try { (globalThis as any)[registryKey] = helpers; } catch {}
  console.log(`[BBoxes] IFCSPACE helpers creados: ${helpers.length}`);
  // Exponer utilidades globales para mostrar/ocultar/limpiar desde consola
  try {
    (globalThis as any).drawIFCSpaceBBoxes = () => drawIFCSpaceBBoxes(components);
    (globalThis as any).showIFCSpaceBBoxes = () => {
      const arr: THREE.Object3D[] = (globalThis as any)[registryKey] || [];
      for (const o of arr) { try { scene.add(o); } catch {} }
      console.log(`[BBoxes] Mostrados ${arr.length} helpers en escena`);
    };
    (globalThis as any).hideIFCSpaceBBoxes = () => {
      const arr: THREE.Object3D[] = (globalThis as any)[registryKey] || [];
      for (const o of arr) { try { scene.remove(o); } catch {} }
      console.log(`[BBoxes] Ocultados ${arr.length} helpers de escena`);
    };
    (globalThis as any).clearIFCSpaceBBoxes = () => {
      const arr: THREE.Object3D[] = (globalThis as any)[registryKey] || [];
      for (const o of arr) {
        try { scene.remove(o); } catch {}
        try { disposer.destroy(o); } catch {}
      }
      try { (globalThis as any)[registryKey] = []; } catch {}
      console.log('[BBoxes] Helpers eliminados y liberados');
    };
  } catch {}
}

// (Eliminado) listIfcSpaceGuidsViaClassifier: nos quedamos únicamente con el flujo basado en GUIDs de BD.

function saveBuildingColor(code: string, color: string) {
  try {
    const current = getSavedBuildingColors();
    current[code] = color;
    localStorage.setItem('ccspt:building-colors', JSON.stringify(current));
  } catch {}
}



// Eliminado: diagnósticos de escaneo de IFCSPACE por el modelo. Vamos a usar solo GUIDs provenientes de BD.

/**
 * Log de atributos de elementos IFCSPACE (diagnóstico):
 * - Usa getItemsOfCategories() para obtener IFCSPACE directamente
 * - Usa getItemsData() para obtener todos los atributos
 * - Muestra en consola todas las claves y el objeto completo
 */
export async function logIfcSpaceAttributes(components: OBC.Components) {
  const fragments = components.get(OBC.FragmentsManager);
  
  console.log('🔎 [IFCSPACE attrs] Iniciando volcado de atributos por elemento');
  
  for (const [modelId, model] of fragments.list) {
    try {
      // Usar getItemsOfCategories para obtener IFCSPACE directamente
      const categoryIds = await (model as any).getItemsOfCategories([/IFCSPACE/i]);
      const ifcSpaceIds = categoryIds.IFCSPACE || [];
      
      if (!ifcSpaceIds.length) {
        console.log(`[IFCSPACE attrs] No se encontraron IFCSPACE en modelo ${modelId}`);
        continue;
      }
      
      console.log(`[IFCSPACE attrs] Encontrados ${ifcSpaceIds.length} IFCSPACE en modelo ${modelId}`);
      
      // Obtener datos completos de todos los IFCSPACE
      const itemsData = await (model as any).getItemsData(ifcSpaceIds, {
        attributesDefault: true, // obtener todos los atributos por defecto
        relations: {
          IsDefinedBy: { attributes: true, relations: true }, // PropertySets
        }
      });
      
      // Mostrar cada elemento IFCSPACE
      for (let i = 0; i < itemsData.length; i++) {
        const data = itemsData[i];
        const localId = ifcSpaceIds[i];
        const keys = Object.keys(data || {});
        
        console.log('—— IFCSPACE ——', { modelId, localId, keys });
        console.log(data);
        
        // Si tiene PropertySets, mostrarlos también
        if (data.IsDefinedBy && Array.isArray(data.IsDefinedBy)) {
          console.log('  PropertySets:', data.IsDefinedBy.length);
          for (const pset of data.IsDefinedBy) {
            console.log('    Pset:', pset);
          }
        }
      }
      
    } catch (e) {
      console.warn('[IFCSPACE attrs] Falló en modelo', modelId, e);
    }
  }
  console.log('✅ [IFCSPACE attrs] Fin de volcado');
}

/**
 * Lista simple de GUIDs de IFCSPACE al cargar el modelo
 */
async function listIfcSpaceGuidsOnLoad(components: OBC.Components) {
  const fragments = components.get(OBC.FragmentsManager);
  
  console.log('📋 [IFCSPACE GUIDs] Lista de GUIDs en el modelo:');
  
  for (const [modelId, model] of fragments.list) {
    try {
      const categoryIds = await (model as any).getItemsOfCategories([/IFCSPACE/i]);
      const ifcSpaceIds = categoryIds.IFCSPACE || [];
      
      if (ifcSpaceIds.length) {
        console.log(`📋 Modelo ${modelId}: ${ifcSpaceIds.length} IFCSPACE`);
        
        for (let i = 0; i < ifcSpaceIds.length; i++) {
          const localId = ifcSpaceIds[i];
          try {
            const [elementData] = await (model as any).getItemsData([localId], {
              attributesDefault: true
            });
            
            const guid = elementData._guid?.value || elementData._guid;
            console.log(`  ${i + 1}. ${guid}`);
          } catch (e) {
            console.log(`  ${i + 1}. ERROR leyendo localId ${localId}`);
          }
        }
      }
    } catch (e) {
      console.warn('Error listando GUIDs del modelo', modelId, e);
    }
  }
}

/**
 * Resaltado genérico por GUIDs (p. ej., obtenidos de la BD).
 * Devuelve el conteo de elementos resaltados.
 */
export async function highlightGuids(
  components: OBC.Components,
  styleName: string,
  guids: Iterable<string>,
  colorHex: string,
): Promise<number> {
  const fragments = components.get(OBC.FragmentsManager);
  const highlighter = components.get(OBF.Highlighter);
  const color = new THREE.Color(colorHex);
  highlighter.styles.set(styleName, {
    color,
    renderedFaces: FRAGS.RenderedFaces.ONE,
    opacity: 1, // 40% de opacidad para los espacios
    transparent: true, // Habilitar transparencia para la opacidad
  });
  const guidSet = Array.isArray(guids) ? new Set(guids) : new Set(Array.from(guids));
  if (guidSet.size === 0) return 0;
  const modelIdMap = await fragments.guidsToModelIdMap(guidSet as any);
  const finalSetMap: Record<string, Set<number>> = {} as any;
  let total = 0;
  for (const [modelId, ids] of Object.entries(modelIdMap as Record<string, number[] | Set<number>>)) {
    const s = new Set(Array.isArray(ids) ? ids : Array.from(ids as Set<number>));
    finalSetMap[modelId] = s;
    total += s.size;
  }
  if (total > 0) await highlighter.highlightByID(styleName, finalSetMap as any, false, false);
  return total;
}

/**
 * Compara GUIDs de IFCSPACE del modelo con los de la BD y aplica colores automáticamente.
 * Extrae GUIDs del modelo, los compara con departamentos de BD y pinta coincidencias.
 */
export async function compareAndColorIfcSpaces(components: OBC.Components, buildingCode?: string) {
  const fragments = components.get(OBC.FragmentsManager);
  
  // console.log('🎨 [IFCSPACE Color] Iniciando comparación y coloreado automático');
  
  // 1. Extraer todos los GUIDs de IFCSPACE del modelo recorriendo elemento por elemento
  const modelGuids = new Set<string>();
  
  for (const [modelId, model] of fragments.list) {
    try {
      const categoryIds = await (model as any).getItemsOfCategories([/IFCSPACE/i]);
      const ifcSpaceIds = categoryIds.IFCSPACE || [];
      
      // console.log(`[IFCSPACE Color] Modelo ${modelId}: encontrados ${ifcSpaceIds.length} IFCSPACE`);
      
      if (ifcSpaceIds.length) {
        // Recorrer cada elemento individualmente
        for (let i = 0; i < ifcSpaceIds.length; i++) {
          const localId = ifcSpaceIds[i];
          try {
            const [elementData] = await (model as any).getItemsData([localId], {
              attributesDefault: true
            });
            
            const guid = elementData._guid?.value || elementData._guid;
            // console.log(`[IFCSPACE Color] Elemento ${i + 1}/${ifcSpaceIds.length} - localId: ${localId}, _guid: ${guid}`);
            
            if (guid) {
              modelGuids.add(guid);
            }
          } catch (e) {
            console.warn(`[IFCSPACE Color] Error leyendo elemento ${localId}:`, e);
          }
        }
        
        // console.log(`[IFCSPACE Color] Modelo ${modelId}: ${ifcSpaceIds.length} espacios procesados, ${modelGuids.size} GUIDs extraídos`);
      }
    } catch (e) {
      console.warn('[IFCSPACE Color] Error extrayendo GUIDs del modelo', modelId, e);
    }
  }
  
  if (modelGuids.size === 0) {
    // console.log('[IFCSPACE Color] No se encontraron IFCSPACE en el modelo');
    return;
  }
  // Log de control: tamaño y una muestra de GUIDs del modelo
  try {
    const sample = Array.from(modelGuids).slice(0, 10);
    // console.log(`[IFCSPACE Color] Total GUIDs en modelo: ${modelGuids.size}. Muestra(10):`, sample);
  } catch {}
  
  // 2. Obtener departamentos de la BD usando el mismo endpoint que espais.ts
  try {
    const currentBuilding = buildingCode || (globalThis as any).modelStore?.getState?.()?.activeBuildingCode || 'UNK';
    const url = `/api/ifcspace/departaments?edifici=${encodeURIComponent(currentBuilding)}`;
    // console.log(`[IFCSPACE Color] Consultando: ${url}`);
    
    const response = await fetch(url, { headers: { Accept: 'application/json' } });
    const text = await response.text();
    
    if (!response.ok) {
      console.warn('[IFCSPACE Color] Error obteniendo departamentos de BD:', response.status, text);
      return;
    }
    
    // console.log('[IFCSPACE Color] Respuesta de BD:', text);
    const departments = JSON.parse(text);
    // console.log(`[IFCSPACE Color] Departamentos de BD: ${departments.length}`);
    
    // 3. Comparar y aplicar colores usando la misma lógica que espais.ts
    let totalMatches = 0;
    
    for (let index = 0; index < departments.length; index++) {
      const { departament, guids } = departments[index];
      if (!departament || !Array.isArray(guids) || guids.length === 0) continue;
      
      // Diagnóstico: comprobar uno a uno si cada GUID de BD existe en el modelo
      try {
        // console.log(`[IFCSPACE Color] Departamento ${departament}: comprobando ${guids.length} GUIDs contra el modelo...`);
        for (const g of guids) {
          const exists = modelGuids.has(g);
          // console.log(`   ${exists ? '✔' : '✖'} ${g}${exists ? ' (match)' : ''}`);
        }
      } catch {}

      // Filtrar solo los GUIDs que están en el modelo
      const matchingGuids = guids.filter((guid: string) => modelGuids.has(guid));
      // console.log(`[IFCSPACE Color] Departamento ${departament}: matches=${matchingGuids.length}/${guids.length}`, matchingGuids);
      
      if (matchingGuids.length > 0) {
        const styleName = `ifcspace-dept:${departament}`;
        // Usar la misma lógica de colores que espais.ts
        const color = new THREE.Color().setHSL((index % 12) / 12, 0.65, 0.5);
        const colorHex = `#${color.getHexString()}`;
        
        const highlighted = await highlightGuids(components, styleName, matchingGuids, colorHex);
        
        // console.log(`[IFCSPACE Color] ${departament}: ${matchingGuids.length}/${guids.length} coincidencias, ${highlighted} pintados (${colorHex})`);
        totalMatches += highlighted;
      } else {
        // console.log(`[IFCSPACE Color] ${departament}: 0 coincidencias. No se aplica color.`);
      }
    }
    
    // console.log(`✅ [IFCSPACE Color] Completado: ${totalMatches} elementos coloreados`);
    // Forzar refresco del visor si se han aplicado estilos
    try {
      if (totalMatches > 0) {
        try { await (fragments as any).core.update(true); } catch (e) { console.warn('[BuildingLoader] update(true) failed:', e); }
      }
    } catch {}
    
  } catch (e) {
    console.warn('[IFCSPACE Color] Error obteniendo datos de BD:', e);
  }
}

/**
 * Aplica colores a edificios combinando defaults (BUILDING_COLORS) con los guardados en localStorage.
 */
async function colorizeBuildingsByCode(components: OBC.Components) {
  const highlighter = components.get(OBF.Highlighter);
  const classifier = components.get(OBC.Classifier);
  const finder = components.get(OBC.ItemsFinder);
  // const fragments = components.get(OBC.FragmentsManager);

  // Limpiar estilos previos de edificios
  for (const [styleName] of highlighter.styles) {
    if (typeof styleName === 'string' && styleName.startsWith('bld:')) {
      await highlighter.clear(styleName);
      highlighter.styles.delete(styleName);
    }
  }

  // 1) Intentar leer colores desde la BD por GUID
  try {
    // console.log('[BldColor] Fetching /api/ifcbuildings ...');
    const res = await fetch('/api/ifcbuildings');
    // console.log('[BldColor] /api/ifcbuildings status:', res.status, res.statusText);
    if (res.ok) {
      const list: Array<{ guid?: string; code?: string; name?: string; color?: string }>= await res.json();
      // console.log('[BldColor] Received', Array.isArray(list) ? list.length : typeof list, 'rows');
      const valid = (list || []).filter(r => r && r.color && (r.guid || r.code || r.name));
      if (valid.length) {
        // Aplicar por GUID si existe, fallback a name/code
        const classificationName = 'BuildingsColoring:db';
        const escapeRegExp = (s: string) => s.replace(/[.*+?^${}()|[\\]\\]/g, "\\$&");
        for (const row of valid) {
          const colorHex = row.color!;
          const key = row.guid || row.code || row.name!;
          // console.log('[BldColor] Applying color from DB', { key, colorHex });
          const styleName = `bld-db:${key}`;
          highlighter.styles.set(styleName, {
            color: new THREE.Color(colorHex),
            renderedFaces: FRAGS.RenderedFaces.ONE,
            opacity: 1,
            transparent: false,
          });
          const queryName = `BldDb_${key}`;
          const queries: any[] = [];
          if (row.guid) {
            queries.push({ name: /GlobalId|Guid/i, value: new RegExp(`^${escapeRegExp(row.guid)}$`, 'i') });
          } else if (row.name || row.code) {
            const rx = new RegExp(`^(?:${escapeRegExp(row.name || '')}|${escapeRegExp(row.code || '')})$`, 'i');
            queries.push({ name: /Name/i, value: rx });
          }
          // Colorear elementos IfcBuilding por GUID/Name
          finder.create(queryName, [ { categories: [/IFCBUILDING/i], attributes: { queries } } ]);
          classifier.setGroupQuery(classificationName, key, { name: queryName });
        }
        const classification = classifier.list.get('BuildingsColoring:db');
        if (classification) {
          for (const [key, group] of classification) {
            try {
              const modelIdMap = await group.get();
              let total = 0;
              const finalSetMap: Record<string, Set<number>> = {};
              for (const [modelId, ids] of Object.entries(modelIdMap as Record<string, number[] | Set<number>>)) {
                finalSetMap[modelId] = new Set(Array.isArray(ids) ? ids : Array.from(ids as Set<number>));
                total += finalSetMap[modelId].size;
              }
              // console.log('[BldColor] Group items for', key, '=>', total);
              const styleName = `bld-db:${key}`;
              if (total === 0) {
                // Fallback directo: mapear el GUID contra los modelos cargados
                try {
                  const fragments = components.get(OBC.FragmentsManager);
                  const guid = String(key);
                  const guidMap = await fragments.guidsToModelIdMap([guid] as any);
                  let foundTotal = 0;
                  for (const [modelId, ids] of Object.entries(guidMap as Record<string, number[] | Set<number>>)) {
                    const set = new Set(Array.isArray(ids) ? ids : Array.from(ids as Set<number>));
                    if (set.size > 0) {
                      finalSetMap[modelId] = set;
                      foundTotal += set.size;
                    }
                  }
                  if (foundTotal > 0) {
                    await highlighter.highlightByID(styleName, finalSetMap as any, false, false);
                    // console.log('[BldColor] Coloreado por GUID (fallback):', key, '=>', foundTotal);
                    try { await fragments.core.update(true); } catch {}
                    continue;
                  } else {
                    // console.log('[BldColor] GUID no encontrado en ningún modelo:', key);
                  }
                } catch (e) {
                  console.warn('[BldColor] Error usando FragmentsManager:', e);
                }
              } else {
                await highlighter.highlightByID(styleName, finalSetMap as any, false, false);
                try {
                  const fragments = components.get(OBC.FragmentsManager);
                  await fragments.core.update(true);
                } catch {}
              }
            } catch (e) {
              console.warn('No se pudo colorear edificio (DB)', key, e);
            }
          }
          return; // Éxito con DB: no seguir con defaults/local
        }
      }
    }
  } catch (e) {
    console.warn('Fallo leyendo colores de BD, usaré defaults/local', e);
  }

  // 2) Fallback: defaults + localStorage por código
  const classificationName = 'BuildingsColoring';
  const mergedColors: Record<string, string> = { ...BUILDING_COLORS, ...getSavedBuildingColors() };
  const escapeRegExp = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  for (const code of Object.keys(mergedColors)) {
    const building = BUILDINGS.find(b => b.value === code);
    if (!building) continue;
    const queryName = `Building_${code}`;
    finder.create(queryName, [
      {
        categories: [/BUILDING/i],
        attributes: { queries: [ { name: /Name/i, value: new RegExp(`^(?:${escapeRegExp(building.label)}|${escapeRegExp(building.value)})$`, 'i') } ] },
      },
    ]);
    classifier.setGroupQuery(classificationName, code, { name: queryName });
  }
  const classification = classifier.list.get(classificationName);
  if (!classification) {
    try { console.warn('[Markers] No classification found for MapBuildings'); } catch {}
    return;
  }
  for (const [code, group] of classification) {
    try {
      const modelIdMap = await group.get();
      const finalSetMap: Record<string, Set<number>> = {};
      for (const [modelId, ids] of Object.entries(modelIdMap as Record<string, number[] | Set<number>>)) {
        finalSetMap[modelId] = new Set(Array.isArray(ids) ? ids : Array.from(ids as Set<number>));
      }
      const colorStr = mergedColors[code];
      if (!colorStr) continue;
      const color = new THREE.Color(colorStr);
      const styleName = `bld:${code}`;
      highlighter.styles.set(styleName, { color, renderedFaces: FRAGS.RenderedFaces.ONE, opacity: 1, transparent: false });
      await highlighter.highlightByID(styleName, finalSetMap as any, false, false);
    } catch (e) {
      console.warn('No se pudo colorear edificio (fallback)', code, e);
    }
  }
}

/**
 * API pública: aplica un color a un edificio por código y lo persiste en localStorage.
 */
export async function applyAndSaveBuildingColor(
  components: OBC.Components,
  code: string,
  colorHex: string
) {
  saveBuildingColor(code, colorHex);
  // Aplicamos inmediatamente sólo a ese edificio
  const highlighter = components.get(OBF.Highlighter);
  const classifier = components.get(OBC.Classifier);
  const finder = components.get(OBC.ItemsFinder);
  // Estilo
  const styleName = `bld:${code}`;
  highlighter.styles.set(styleName, {
    color: new THREE.Color(colorHex),
    renderedFaces: FRAGS.RenderedFaces.ONE,
    opacity: 1,
    transparent: false,
  });
  // Query puntual
  const building = BUILDINGS.find(b => b.value === code);
  if (!building) return;
  const queryName = `Building_${code}`;
  const escapeRegExp = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  finder.create(queryName, [
    {
      categories: [/BUILDING/i],
      attributes: { queries: [ { name: /Name/i, value: new RegExp(`^(?:${escapeRegExp(building.label)}|${escapeRegExp(building.value)})$`, 'i') } ] },
    },
  ]);
  const classificationName = 'BuildingsColoring:single';
  classifier.setGroupQuery(classificationName, code, { name: queryName });
  const classification = classifier.list.get(classificationName);
  if (!classification) return;
  for (const [, group] of classification) {
    const modelIdMap = await group.get();
    const finalSetMap: Record<string, Set<number>> = {};
    for (const [modelId, ids] of Object.entries(modelIdMap as Record<string, number[] | Set<number>>)) {
      finalSetMap[modelId] = new Set(Array.isArray(ids) ? ids : Array.from(ids as Set<number>));
    }
    await highlighter.highlightByID(styleName, finalSetMap as any, false, false);
  }
}

// Try to resolve a Properties service dynamically (different versions export different names)
let CachedPropertiesCtor: any | null = null;
function resolvePropertiesCtor(): any | null {
  if (CachedPropertiesCtor) return CachedPropertiesCtor;
  const candidates = [
    (OBC as any).Properties,
    (OBC as any).PropertiesManager,
  ].filter(Boolean);
  if (candidates.length) {
    CachedPropertiesCtor = candidates[0];
    try { console.log('[PropsSvc] Using direct export:', CachedPropertiesCtor?.name || 'anonymous'); } catch {}
    return CachedPropertiesCtor;
  }
  // Fallback: scan OBC exports for anything with "Properties" in its name
  try {
    for (const [key, value] of Object.entries(OBC as Record<string, any>)) {
      if (typeof value === 'function' && /Properties/i.test(key)) {
        CachedPropertiesCtor = value;
        console.log('[PropsSvc] Resolved by scan:', key);
        return CachedPropertiesCtor;
      }
    }
  } catch {}
  return null;
}

/**
 * Load one or more .frag models for a given building code and perform post setup.
 * Mirrors the behavior used in `ui-templates/sections/models.ts` dropdown handler.
 */
let __fragmentsInitedFlag = false;
async function ensureFragmentsInitialized(components: OBC.Components) {
  if (__fragmentsInitedFlag) return;
  try {
    // Ensure components are initialized (no-op if already inited)
    try { await (components as any)?.init?.(); } catch {}
    const fragments = components.get(OBC.FragmentsManager) as any;
    if (!fragments) return;
    // Prevent double init: mark instance once initialized
    if ((fragments as any).__ccsptWorkerInited) { __fragmentsInitedFlag = true; return; }
    // Initialize with explicit worker path to match App/Edifici viewers
    const workerPath = "/node_modules/@thatopen/fragments/dist/Worker/worker.mjs";
    if (typeof fragments.init === 'function') {
      await fragments.init(workerPath);
    } else if (fragments.core && typeof fragments.core.init === 'function') {
      await fragments.core.init(workerPath);
    } else if (fragments.core && typeof fragments.core.initialize === 'function') {
      await fragments.core.initialize(workerPath);
    }
    try { (fragments as any).__ccsptWorkerInited = true; } catch {}
    __fragmentsInitedFlag = true;
  } catch (e) {
    // Swallow to avoid breaking caller; load() will still throw if needed
    console.warn('[BuildingLoader] Could not explicitly init FragmentsManager:', e);
  }
}

type LoadOptions = { variant?: 'rooms' | 'as' };

export async function loadBuilding(components: OBC.Components, buildingCode: string, options: LoadOptions = {}) {
  const fragments = components.get(OBC.FragmentsManager);
  await ensureFragmentsInitialized(components);

  const building = BUILDINGS.find(b => b.value === buildingCode);
  if (!building) return;

  // Get world to add models to scene
  const worlds = components.get(OBC.Worlds);
  const world = worlds.list.values().next().value;
  if (!world) {
    console.error('[BuildingLoader] No world found');
    return;
  }

  try {
    // Explicit maps per variant
    const buildingFilesRooms: Record<string, string[]> = {
      'MAP': ['CCSPT-MAP-M3D-Rooms.frag'],
      'TAU': ['CCSPT-TAU-M3D-Rooms.frag'],
      'TOC': ['CCSPT-TOC-M3D-Rooms.frag'],
      'ALB': ['CCSPT-ALB-M3D-Rooms.frag'],
      'CQA': ['CCSPT-CQA-M3D-Rooms.frag'],
      'MIN': ['CCSPT-MIN-M3D-Rooms.frag'],
      'UDI': ['CCSPT-UDI-M3D-Rooms.frag'],
      'VII': ['CCSPT-VII-M3D-Rooms.frag'],
    };
    const buildingFilesAS: Record<string, string[]> = {
      'MAP': ['CCSPT-MAP-M3D-AS.frag'],
    };

    const variant = options.variant ?? 'as';
    const filesToLoad =
      (variant === 'rooms'
        ? buildingFilesRooms[building.value]
        : (buildingFilesAS[building.value] || undefined))
      || [building.file];

    for (const fileName of filesToLoad) {
      try {
        const response = await fetch(`/models/${fileName}`);
        if (!response.ok) {
          console.error(`Error loading file: ${fileName} - ${response.status} ${response.statusText}`);
          continue;
        }
        const buffer = await response.arrayBuffer();
        const bytes = new Uint8Array(buffer);
        const modelId = fileName.replace(".frag", "");
        try {
          await (fragments as any).core.load(bytes, { modelId });
        } catch (e: any) {
          const msg = String(e?.message || e || '');
          if (/not initialized/i.test(msg)) {
            console.warn('[BuildingLoader] Fragments not initialized, retrying init+load...');
            try {
              await ensureFragmentsInitialized(components);
              if ((fragments as any).core?.init) await (fragments as any).core.init();
            } catch {}
            await (fragments as any).core.load(bytes, { modelId });
          } else {
            throw e;
          }
        }
      } catch (e) {
        console.error('[BuildingLoader] Failed to load fragment', fileName, e);
      }
    }

    // Add all loaded models to the scene with proper materials
    for (const [_, model] of fragments.list) {
      try {
        world.scene.three.add(model.object);
      } catch (e) {
        console.error('[BuildingLoader] Failed to add model to scene:', e);
      }
    }

    // Force solid material rendering after all models are added
    setTimeout(() => {
      try {
        world.scene.three.traverse((child: any) => {
          if (child.isMesh) {
            if (Array.isArray(child.material)) {
              child.material.forEach((mat: any) => {
                if (mat) {
                  mat.wireframe = false;
                  mat.transparent = false;
                  mat.opacity = 1.0;
                  mat.needsUpdate = true;
                }
              });
            } else if (child.material) {
              child.material.wireframe = false;
              child.material.transparent = false;
              child.material.opacity = 1.0;
              child.material.needsUpdate = true;
            }
          }
        });
        console.log('[BuildingLoader] Forced solid materials on all scene objects');
      } catch (e) {
        console.warn('[BuildingLoader] Could not force solid materials:', e);
      }
    }, 100);

    modelStore.setActiveBuilding(building.value);

    await fragments.core.update(true);

    // Skip classification - load model only
    const floorData: any[] = [];
    const levelsClassification = undefined;

    modelStore.setModelsLoaded(fragments, floorData, levelsClassification);

    try {
      window.dispatchEvent(new CustomEvent('ccspt:building-loaded', {
        detail: { buildingCode: building.value },
        bubbles: true,
        composed: true,
      }));
    } catch {}

    // Skip Y-bands computation - no classification needed

    // Eliminado: diagnósticos de IFCSPACE. A partir de ahora, utilizar solo GUIDs provenientes de BD.

    // Skip all IFCSPACE processing - model only

    // Skip coloring and labeling - model only

  } catch (error) {
    console.error('Error loading building:', error);
    const errorMessage = error instanceof Error ? error.message : 'Error desconegut';
    alert(`Error carregant l'edifici: ${errorMessage}`);
  }
}

// Helper: intenta recuperar el Name (o GlobalId) de un elemento
async function getElementName(
  components: OBC.Components,
  model: any,
  id: number
): Promise<string | undefined> {
  try {
    const propsSvc: any = (OBC as any).Properties || (OBC as any).PropertiesManager;
    if (propsSvc) {
      const properties = components.get(propsSvc);
      if (properties && typeof (properties as any).get === 'function') {
        const data = await (properties as any).get(model, id);
        const name = data?.Name?.value ?? data?.Name ?? data?.LongName?.value ?? data?.LongName;
        if (name) return String(name);
        const gid = data?.GlobalId?.value ?? data?.GlobalId;
        if (gid) return String(gid);
      }
    }
  } catch {}
  return undefined;
}

// Helper: etiqueta determinista para IFCSPACE (sin LocalId)
// Prioridad: ObjectType > Name > Guid/GlobalId(8) > Sense nom
async function getSpaceIdentifier(
  components: OBC.Components,
  model: any,
  id: number
): Promise<string> {
  try {
    const PropertiesCtor = resolvePropertiesCtor();

    console.log("[PropsSvc] ctor:", PropertiesCtor?.name || PropertiesCtor);

    if (PropertiesCtor) {
      const properties = components.get(PropertiesCtor as any);
      if (properties && typeof (properties as any).get === 'function') {
        const data: any = await (properties as any).get(model, id);

        // Log de diagnóstico (mantener para inspección)
        try {
          console.log('[IFCSPACE props]', {
            id,
            base: {
              Name: data?.Name?.value ?? data?.Name ?? null,
              ObjectType: data?.ObjectType?.value ?? data?.ObjectType ?? null,
              Guid: (data as any)?.Guid?.value ?? (data as any)?.Guid ?? data?.GlobalId?.value ?? data?.GlobalId ?? null,
            },
          });
        } catch {}

        const objectType = data?.ObjectType?.value ?? data?.ObjectType;
        if (objectType && String(objectType).trim()) return `${String(objectType)} [${id}]`;

        const name = data?.Name?.value ?? data?.Name;
        if (name && String(name).trim()) return `${String(name)} [${id}]`;

        const gid = (data as any)?.Guid?.value ?? (data as any)?.Guid ?? data?.GlobalId?.value ?? data?.GlobalId;
        if (gid && String(gid).trim()) return `${String(gid).substring(0, 8)}... [${id}]`;

        return `Sense nom [${id}]`;
      }
    }
  } catch {}
  return `Sense nom [${id}]`;
}

// Helper: detecta si un IFCSPACE proviene de una masa de Revit analizando sus propiedades
async function getSpaceElementInfo(
  components: OBC.Components,
  model: any,
  id: number
): Promise<{ isMass: boolean; info: string }> {
  try {
    const propsSvc: any = (OBC as any).Properties || (OBC as any).PropertiesManager;
    if (propsSvc) {
      const properties = components.get(propsSvc);
      if (properties && typeof (properties as any).get === 'function') {
        const data: any = await (properties as any).get(model, id);
        
        // Indicadores de que el elemento proviene de una masa de Revit
        const name = String(data?.Name?.value ?? data?.Name ?? '').toLowerCase();
        const longName = String(data?.LongName?.value ?? data?.LongName ?? '').toLowerCase();
        const objectType = String(data?.ObjectType?.value ?? data?.ObjectType ?? '').toLowerCase();
        
        // Buscar en propiedades personalizadas
        let hasRevitMassProps = false;
        const psets: any[] | undefined = Array.isArray(data?.IsDefinedBy) ? data.IsDefinedBy : undefined;
        if (psets) {
          for (const pset of psets) {
            const psetName = String(pset?.Name?.value ?? pset?.Name ?? '').toLowerCase();
            if (psetName.includes('mass') || psetName.includes('masa')) {
              hasRevitMassProps = true;
              break;
            }
            const hasProps = Array.isArray(pset?.HasProperties) ? pset.HasProperties : undefined;
            if (!hasProps) continue;
            for (const prop of hasProps) {
              const propName = String(prop?.Name?.value ?? prop?.Name ?? '').toLowerCase();
              if (propName.includes('mass') || propName.includes('masa') || propName.includes('volume')) {
                hasRevitMassProps = true;
                break;
              }
            }
            if (hasRevitMassProps) break;
          }
        }
        
        // Determinar si es elemento tipo masa
        const isMass = hasRevitMassProps || 
                      name.includes('mass') || name.includes('masa') ||
                      longName.includes('mass') || longName.includes('masa') ||
                      objectType.includes('mass') || objectType.includes('masa');
        
        return {
          isMass,
          info: `${isMass ? 'MASS' : 'NORMAL'} - ${name || objectType || 'unnamed'}`
        };
      }
    }
  } catch {}
  return { isMass: false, info: 'UNKNOWN' };
}

/**
 * Crea un marker de prueba con texto fijo "Edifici" para validar el render de markers.
 */
async function createTestMarker(components: OBC.Components) {
  const worlds = components.get(OBC.Worlds);
  const worldKeys = Array.from(worlds.list.keys());
  const worldId = worldKeys[0];
  const world = worlds.list.get(worldId);
  if (!world) return;

  const marker = components.get(OBF.Marker);
  marker.threshold = 10;
  // Asegurar sistema de markers activo
  try { (marker as any).enabled = true; } catch {}

  const markerElement = BUI.Component.create(() =>
    BUI.html`
      <div data-marker="true" style="position: relative; display: flex; flex-direction: column; align-items: center;">
        <div style="font-size: 12px; background: rgba(0,0,0,0.8); color: white; padding: 2px 6px; border-radius: 4px; white-space: nowrap; font-family: Arial, sans-serif; box-shadow: 0 2px 4px rgba(0,0,0,0.3);">Edifici</div>
        <div style="width: 2px; height: 20px; background: rgba(255,255,255,0.6); margin-top: 2px;"></div>
      </div>
    `
  );

  // Posición visible cerca del target inicial de cámara en App.tsx
  const pos = new THREE.Vector3(73.6399167226419, 35.11624259729865 + 10, 98.72027051838988);
  try {
    marker.create(world, markerElement, pos);
  } catch (e) {
    console.warn('No se pudo crear el marker de prueba', e);
  }
}

 
/**
 * Coloca etiquetas sobre cada IFCSPACE usando sus propiedades para identificar cada espacio
 * del modelo cargado (diagnóstico de posicionamiento por espacio)
 */
async function labelSpacesFixed(components: OBC.Components) {
  const fragments = components.get(OBC.FragmentsManager);
  const worlds = components.get(OBC.Worlds);
  const worldKeys = Array.from(worlds.list.keys());
  const worldId = worldKeys[0];
  const world = worlds.list.get(worldId);
  if (!world) return;

  const marker = components.get(OBF.Marker);
  marker.threshold = 10;
  // Asegurar sistema de markers activo y limpiar existentes
  try { (marker as any).enabled = true; } catch {}
  try { marker.list.clear(); } catch {}
  try { document.querySelectorAll('[data-marker]').forEach((el) => el.remove()); } catch {}

  // Obtener mapa GUID->nombre desde BD (preferir 'nom', fallback 'departament' o 'name')
  const guidNameMap = new Map<string, string>();
  try {
    const currentBuilding = (globalThis as any).modelStore?.getState?.()?.activeBuildingCode || 'UNK';
    const url = `/api/ifcspace/departaments?edifici=${encodeURIComponent(currentBuilding)}`;
    const res = await fetch(url, { headers: { Accept: 'application/json' } });
    if (res.ok) {
      const rows = await res.json();
      for (const row of rows || []) {
        const label = row?.nom || row?.departament || row?.name;
        const guids: string[] = Array.isArray(row?.guids) ? row.guids : [];
        if (label && guids.length) {
          for (const g of guids) {
            if (g && typeof g === 'string') guidNameMap.set(g, String(label));
          }
        }
      }
    }
  } catch {}

  const classifier = components.get(OBC.Classifier);
  const finder = components.get(OBC.ItemsFinder);
  const classificationName = 'SpaceTest';

  // Debug helpers removed: no bbox or sprite overlays

  // Crear consulta: todos los IFCSPACE
  const queryName = 'AllSpacesQuery';
  finder.create(queryName, [
    {
      categories: [/IFCSPACE/i],
    },
  ]);
  classifier.setGroupQuery(classificationName, 'Espacios', { name: queryName });

  const classification = classifier.list.get(classificationName);
  if (!classification) return;

  for (const [, group] of classification) {
    try {
      const data = await group.get();
      for (const [modelId, ids] of Object.entries(data as Record<string, number[] | Set<number>>)) {
        const model = fragments.list.get(modelId);
        if (!model) continue;
        const localIdsArray = Array.isArray(ids) ? (ids as number[]) : Array.from(ids as Set<number>);
        if (!localIdsArray.length) continue;

        // Para no saturar, muestreamos algunos elementos si hay demasiados
        const MAX = 2000; // limita markers en la prueba
        const step = Math.max(1, Math.floor(localIdsArray.length / Math.min(localIdsArray.length, MAX)));
        let created = 0;
        for (let i = 0; i < localIdsArray.length; i += step) {
          const id = localIdsArray[i];
          // Obtener información del elemento para detectar tipo de origen
          const elementInfo = await getSpaceElementInfo(components, model, id);
          const isMassElement = elementInfo.isMass;
          
          // Calcular posición del marker: centro en XZ y yMax + offset de la bounding box
          let elevatedPosition: THREE.Vector3 | undefined;
          try {
            const positions: any[] | undefined = await model.getPositions([id]);
            if (positions && positions.length) {
              let sx = 0, sz = 0, yMax = Number.NEGATIVE_INFINITY, n = 0;
              for (const p of positions as any[]) {
                const x = (p && (p.x ?? p[0])) ?? 0;
                const y = (p && (p.y ?? p[1])) ?? 0;
                const z = (p && (p.z ?? p[2])) ?? 0;
                sx += x; sz += z; n++;
                if (y > yMax) yMax = y;
              }
              if (n > 0 && isFinite(yMax)) {
                const cx = sx / n;
                const cz = sz / n;
                const offsetY = isMassElement ? 5 : 2; // un poco más alto para masas
                elevatedPosition = new THREE.Vector3(cx, yMax + offsetY, cz);
              }
            }
          } catch {}
          if (!elevatedPosition) continue;

          // Intentar nombrar por GUID contra BD (preferir 'nom'), si no, fallback a identificador calculado
          let labelText: string | undefined;
          try {
            const [elementData] = await (model as any).getItemsData([id], { attributesDefault: true });
            const guid = elementData?._guid?.value || elementData?._guid || elementData?.GlobalId?.value || elementData?.GlobalId;
            if (guid && guidNameMap.has(String(guid))) {
              labelText = guidNameMap.get(String(guid));
            }
          } catch {}
          if (!labelText) {
            labelText = await getSpaceIdentifier(components, model, id);
          }
          console.log(`[Space element] ${elementInfo.info} | ${labelText} at position:`, elevatedPosition);
          const markerElement = BUI.Component.create(() =>
            BUI.html`
              <div data-marker="true" style="position: relative; display: flex; flex-direction: column; align-items: center;">
                <div style="font-size: 12px; background: rgba(0,0,0,0.8); color: white; padding: 2px 6px; border-radius: 4px; white-space: nowrap; font-family: Arial, sans-serif; box-shadow: 0 2px 4px rgba(0,0,0,0.3);">${labelText}</div>
                <div style="width: 2px; height: 20px; background: rgba(255,255,255,0.6); margin-top: 2px;"></div>
              </div>
            `
          );

          try {
            marker.create(world, markerElement, elevatedPosition);
            created++;
          } catch {}
        }
        console.log(`[IFCSPACE labels] model=${modelId} total=${localIdsArray.length} created=${created} step=${step}`);
      }
    } catch {}
  }
}
