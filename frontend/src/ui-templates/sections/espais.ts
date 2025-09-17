/**
  * Panel de Espais
  *
  * Responsabilidades:
  * - Buscar departamentos y dispositivos contra los endpoints del backend.
  * - Cargar modelos de fragmentos del edificio bajo demanda y mantener `modelStore` sincronizado.
  * - Filtrar/realzar visualmente elementos IFCSPACE por departamento y foco por dispositivo.
  * - Aplicar modo fantasma (ghost) y restaurar materiales del modelo base sin perder estilos de departamento.
  * - Crear marcadores 2D (etiquetas) para dispositivos dentro de los espacios y gestionar la leyenda.
  *
  * Integraciones clave:
  * - OBC.FragmentsManager: mapeo modelo/IDs y cálculo de posiciones.
  * - OBF.Highlighter: gestión de estilos visuales por nombre de estilo.
  * - OBF.Marker: creación de marcadores HUD para dispositivos/espacios.
  * - `modelStore`: estado compartido de edificio/planta activos y datos de leyenda.
  */
import * as BUI from "@thatopen/ui";
import * as OBC from "@thatopen/components";
import * as OBF from "@thatopen/components-front";
import * as FRAGS from "@thatopen/fragments";
import * as THREE from "three";
import { appIcons } from "../../globals";
import { modelStore } from "../../globals";
import { ClassificationUtils } from "../../utils/ClassificationUtils";
import { ensureGlobalMarkerCSS, createSpaceMarker } from "../../bim/Markers";

export interface EspaisPanelState {
  components: OBC.Components;
  searchQuery?: string;
  searchResults?: Array<{
    guid: string;
    departament: string;
    dispositiu: string;
    edifici: string;
    planta: string;
    total_area: number;
    element_count: number;
    tipo_coincidencia: string;
  }>;
  viewCategory?: string;
  subCategory?: string;
  labelOptions?: {
    name: boolean; // Nom dispositiu
    id: boolean;   // GUID/ID
    costCenter: boolean; // Centre de cost
    area: boolean;  // Àrea
  };
}

export const espaisPanelTemplate: BUI.StatefullComponent<EspaisPanelState> = (
  state,
  update,
) => {
  // Helpers (scoped to Espais)
  const originalColors = new Map<
    FRAGS.BIMMaterial,
    { color: number; transparent: boolean; opacity: number }
  >();

  // Defaults for label options
  if (!state.labelOptions) {
    state.labelOptions = { name: true, id: false, costCenter: false, area: false };
  }

  type MarkerData = {
    name?: string;
    id?: string | number;
    guid?: string; // id will use guid if present
    expressId?: number;
    costCenter?: string;
    area?: number | string;
  };

  const buildMarkerText = (data: MarkerData): string => {
    const parts: string[] = [];
    const opts = state.labelOptions!;
    if (opts.name && data.name) parts.push(data.name);
    if (opts.id) {
      // Only show DB 'id'. Do NOT fall back to GUID/expressId.
      const idStr = (data.id !== undefined && data.id !== null && String(data.id) !== '')
        ? String(data.id)
        : undefined;
      if (idStr) parts.push(idStr);
    }
    if (opts.costCenter && data.costCenter) parts.push(String(data.costCenter));
    if (opts.area && (data.area !== undefined && data.area !== null && data.area !== '')) {
      const n = typeof data.area === 'number' ? data.area : Number(data.area);
      const areaStr = isNaN(n) ? String(data.area) : `${n.toFixed(1)} m²`;
      parts.push(areaStr);
    }
    return parts.join(' · ');
  };

  const refreshAllMarkerLabels = () => {
    try {
      const markers = document.querySelectorAll('[data-marker="ifcspace"]');
      markers.forEach((el) => {
        const labelEl = (el as HTMLElement).querySelector('[data-marker-label]') as HTMLElement | null;
        if (!labelEl) return;
        const h = el as HTMLElement;
        const data: MarkerData = {
          name: h.dataset.name,
          id: h.dataset.id,
          guid: h.dataset.guid,
          expressId: h.dataset.expressId ? Number(h.dataset.expressId) : undefined,
          costCenter: h.dataset.cc,
          area: h.dataset.area,
        };
        labelEl.textContent = buildMarkerText(data);
      });
    } catch {}
  };

  // Refresh labels when selection editor saves changes
  try {
    window.addEventListener('ccspt:refresh-ifcspace-labels', () => refreshAllMarkerLabels());
  } catch {}

  // Selección para panel de datos: usa el estilo reservado 'select'
  const selectElements = async (components: OBC.Components, modelIdMap: Record<string, Set<number>>) => {
    const highlighter = components.get(OBF.Highlighter);
    try { await highlighter.clear('select'); } catch {}
    await highlighter.highlightByID('select', modelIdMap as any, true, false);
  };

  /**
   * Aísla IFCSPACE, manteniendo IFCSITE visible en modo fantasma.
   * Además, puede dejar en fantasma el IFCBUILDING de modelos indicados.
   * - Usa `OBC.Hider.isolate` con IFCSPACE ∪ IFCSITE para que solo se vean esos.
   * - Aplica un estilo semitransparente a IFCSITE y, opcionalmente, a IFCBUILDING.
   *
   * @param components
   * @param ghostBuildingModelIds Conjunto de modelIds cuyo IFCBUILDING debe quedar en fantasma
   */
  const isolateIfcSpaces = async (components: OBC.Components, ghostBuildingModelIds?: Set<string>) => {
    const fragments = components.get(OBC.FragmentsManager);
    const hider = components.get(OBC.Hider);
    const highlighter = components.get(OBF.Highlighter);
    const selection: Record<string, Set<number>> = {};
    const siteMap: Record<string, Set<number>> = {};
    const buildingMap: Record<string, Set<number>> = {};
    const buildingPartsMap: Record<string, Set<number>> = {};
    for (const [modelId, model] of fragments.list.entries()) {
      try {
        const cat = await (model as any).getItemsOfCategories([/IFCSPACE/i, /IFCSITE/i, /IFCBUILDING/i]);
        const spaceIds: number[] = (cat?.IFCSPACE || []) as number[];
        const siteIds: number[] = (cat?.IFCSITE || []) as number[];
        const buildingIds: number[] = (cat?.IFCBUILDING || []) as number[];
        const merged = [...(spaceIds || []), ...(siteIds || [])];
        // Incluir IFCBUILDING en la selección si debemos dejarlo visible en este modelo
        if (ghostBuildingModelIds && ghostBuildingModelIds.has(modelId) && buildingIds?.length) {
          merged.push(...buildingIds);
        }
        if (merged.length) selection[modelId] = new Set(merged);
        if (siteIds && siteIds.length) siteMap[modelId] = new Set(siteIds);
        if (ghostBuildingModelIds && ghostBuildingModelIds.has(modelId) && buildingIds?.length) {
          buildingMap[modelId] = new Set(buildingIds);
        }
      } catch {}
    }
    if (Object.keys(selection).length === 0) return;
    await hider.isolate(selection as any);
    // Aplicar ghost a IFCSITE
    // Limpiar estilos previos del ghost de sitio
    for (const [styleName] of highlighter.styles) {
      if (typeof styleName === 'string' && styleName.startsWith('ghost:IFCSITE')) {
        await highlighter.clear(styleName);
        highlighter.styles.delete(styleName);
      }
    }
    if (Object.keys(siteMap).length) {
      const siteGhost = 'ghost:IFCSITE';
      highlighter.styles.set(siteGhost, {
        color: new THREE.Color(0xffffff),
        renderedFaces: FRAGS.RenderedFaces.ONE,
        opacity: 0.12,
        transparent: true,
      });
      await highlighter.highlightByID(siteGhost, siteMap as any, false, false);
    }
    // Mostrar y fantasmear elementos del edificio (paredes, losas, cubiertas, etc.) del/los modelos objetivo
    if (ghostBuildingModelIds && ghostBuildingModelIds.size) {
      for (const modelId of ghostBuildingModelIds) {
        const model = fragments.list.get(modelId);
        if (!model) continue;
        try {
          const cats = await (model as any).getItemsOfCategories([
            /IFCWALL/i, /IFCSLAB/i, /IFCROOF/i, /IFCWINDOW/i, /IFCDOOR/i,
            /IFCCOLUMN/i, /IFCBEAM/i, /IFCCOVERING/i, /IFCPLATE/i, /IFCMEMBER/i,
          ]);
          const merged: number[] = [];
          for (const arr of Object.values(cats || {})) merged.push(...(arr as number[]));
          if (merged.length) buildingPartsMap[modelId] = new Set(merged);
        } catch {}
      }
      if (Object.keys(buildingPartsMap).length) {
        try { await hider.set(true, buildingPartsMap as any); } catch {}
        // Clear previous building-parts ghost style
        for (const [styleName] of highlighter.styles) {
          if (typeof styleName === 'string' && styleName.startsWith('ghost:IFC_BUILDING_PARTS')) {
            await highlighter.clear(styleName);
            highlighter.styles.delete(styleName);
          }
        }
        const partsGhost = 'ghost:IFC_BUILDING_PARTS';
        highlighter.styles.set(partsGhost, {
          color: new THREE.Color(0xffffff),
          renderedFaces: FRAGS.RenderedFaces.ONE,
          opacity: 0.18,
          transparent: true,
        });
        await highlighter.highlightByID(partsGhost, buildingPartsMap as any, false, false);
      }
    }
    // Aplicar ghost a IFCBUILDING de modelos solicitados
    if (Object.keys(buildingMap).length) {
      // Limpiar estilos previos
      for (const [styleName] of highlighter.styles) {
        if (typeof styleName === 'string' && styleName.startsWith('ghost:IFCBUILDING')) {
          await highlighter.clear(styleName);
          highlighter.styles.delete(styleName);
        }
      }
      const buildingGhost = 'ghost:IFCBUILDING';
      highlighter.styles.set(buildingGhost, {
        color: new THREE.Color(0xffffff),
        renderedFaces: FRAGS.RenderedFaces.ONE,
        opacity: 0.18,
        transparent: true,
      });
      await highlighter.highlightByID(buildingGhost, buildingMap as any, false, false);
    }
  };

  /**
   * Establece el modelo en modo fantasma (transparente) guardando los materiales originales.
   * Limpia estilos de resaltado relacionados con edificios que podrían interferir.
   *
   * @param components Contenedor de componentes OBC
   * @param opacity Opacidad objetivo (por defecto 0.05). Usa 0 para ocultar por completo.
   */
  const setModelTransparent = async (components: OBC.Components, opacity: number = 0.05) => {
    // Clear building-related highlight styles (including DB-driven ones)
    // so they don't override the ghost effect.
    try {
      const highlighter = components.get(OBF.Highlighter);
      for (const [styleName] of highlighter.styles) {
        if (
          typeof styleName === "string" &&
          (styleName.startsWith("bld:") || styleName.startsWith("bld-db:"))
        ) {
          await highlighter.clear(styleName);
          highlighter.styles.delete(styleName);
        }
      }
    } catch {}

    const fragments = components.get(OBC.FragmentsManager);
    const materials = [...fragments.core.models.materials.list.values()];
    for (const material of materials) {
      if ((material as any).userData?.customId) continue;
      let color: number | undefined;
      if ("color" in material) color = (material as any).color.getHex();
      else color = (material as any).lodColor.getHex();
      originalColors.set(material, {
        color: color!,
        transparent: (material as any).transparent,
        opacity: (material as any).opacity,
      });
      (material as any).transparent = true;
      (material as any).opacity = opacity;
      (material as any).needsUpdate = true;
      if ("color" in material) (material as any).color.setColorName("white");
      else (material as any).lodColor.setColorName("white");
    }
  };

  // Actius-like device focus with markers
  /**
   * Enfoca un dispositivo por GUID.
   * - Aplica ghost al modelo, limpia estilos previos de foco y marcadores.
   * - Resalta el/los elementos del GUID con un estilo dedicado.
   * - Crea marcadores 2D elevados en sus posiciones y ajusta la cámara.
   *
   * @param components Contenedor de componentes OBC
   * @param deviceGuid GUID del dispositivo/elemento IFC
   * @param deviceName Nombre mostrado en la etiqueta del marcador
   */
  const focusOnDevice = async (components: OBC.Components, deviceGuid: string, deviceName: string) => {
    try {
      const fragments = components.get(OBC.FragmentsManager);
      const marker = components.get(OBF.Marker);
      const highlighter = components.get(OBF.Highlighter);

      marker.threshold = 10;
      marker.list.clear();
      const existingMarkers = document.querySelectorAll('[data-marker]');
      existingMarkers.forEach(el => el.remove());

      let deviceModelIds: Set<string> | undefined;
      try {
        const modelIdMapPre = await fragments.guidsToModelIdMap(new Set([deviceGuid]));
        if (modelIdMapPre && Object.keys(modelIdMapPre).length) {
          deviceModelIds = new Set(Object.keys(modelIdMapPre));
        }
      } catch {}

      // Aislar IFCSPACE y dejar IFCBUILDING del modelo del dispositivo en fantasma
      await isolateIfcSpaces(components, deviceModelIds);
      // Aplicar ghost global suave; luego re-resaltamos elementos clave
      await setModelTransparent(components, 0.12);

      // Clear previous device-focus styles
      for (const [styleName] of highlighter.styles) {
        if (typeof styleName === "string" && styleName.startsWith("device-focus:")) {
          await highlighter.clear(styleName);
          highlighter.styles.delete(styleName);
        }
      }


      const modelIdMap = await fragments.guidsToModelIdMap(new Set([deviceGuid]));
      if (!modelIdMap || Object.keys(modelIdMap).length === 0) return;

      const styleName = `device-focus:${deviceGuid}`;
      const highlightColor = new THREE.Color().setHSL(0.3, 0.8, 0.6);
      highlighter.styles.set(styleName, {
        color: highlightColor,
        renderedFaces: FRAGS.RenderedFaces.ONE,
        opacity: 1,
        transparent: false,
      });

      const finalSetMap: Record<string, Set<number>> = {};
      for (const [modelId, ids] of Object.entries(modelIdMap)) {
        finalSetMap[modelId] = new Set(Array.isArray(ids) ? ids : Array.from(ids as any));
      }
      await highlighter.highlightByID(styleName, finalSetMap as any, false, false);

      // Markers on positions
      const worlds = components.get(OBC.Worlds);
      const worldKeys = Array.from(worlds.list.keys());
      const worldId = worldKeys[0];
      const world = worlds.list.get(worldId);
      if (world) {
        // Fetch device meta (id, centre_cost, area) for label content
        let deviceMeta: { id?: string | number; centre_cost?: string; area?: number } = {};
        try {
          const { activeBuildingCode } = modelStore.getState();
          if (activeBuildingCode) {
            const url = `/api/ifcspace/devices?guids=${encodeURIComponent(deviceGuid)}&edifici=${encodeURIComponent(activeBuildingCode)}`;
            const r = await fetch(url, { headers: { Accept: 'application/json' } });
            if (r.ok) {
              const arr = await r.json();
              const found = Array.isArray(arr) ? arr.find((it: any) => it.guid === deviceGuid) : undefined;
              if (found) deviceMeta = { id: (found.id ?? found.device_id ?? found.Id), centre_cost: found.centre_cost, area: (found.area ?? found.area_m2 ?? found.m2) };
            }
          }
        } catch {}

        for (const [modelId, localIds] of Object.entries(modelIdMap)) {
          const model = fragments.list.get(modelId);
          if (!model) continue;
          const localIdsArray = Array.from(localIds);
          try {
            // Compute top-center of each element's bounding box instead of raw center position
            const boxer = components.get(OBC.BoundingBoxer);
            const topPositions: THREE.Vector3[] = [];
            for (const eid of localIdsArray) {
              try {
                boxer.list.clear();
                await boxer.addFromModelIdMap({ [modelId]: new Set([eid]) } as any);
                const box = boxer.get();
                boxer.list.clear();
                if (!box) { topPositions.push(new THREE.Vector3()); continue; }
                const center = new THREE.Vector3();
                box.getCenter(center);
                const height = Math.max(0, box.max.y - box.min.y);
                const extra = Math.max(2.0, 0.3 * height); // 30% height or 2m
                const topY = box.max.y + extra;
                topPositions.push(new THREE.Vector3(center.x, topY, center.z));
              } catch {}
            }
            if (topPositions.length > 0) {
              ensureGlobalMarkerCSS();
              for (let i = 0; i < topPositions.length; i++) {
                const elevatedPosition = topPositions[i];
                const markerElement = createSpaceMarker(deviceName);
                // Populate datasets for dynamic label building
                (markerElement as any).dataset.name = (deviceName || '').toString();
                (markerElement as any).dataset.guid = deviceGuid || '';
                if (deviceMeta.id !== undefined) (markerElement as any).dataset.id = String(deviceMeta.id);
                (markerElement as any).dataset.cc = deviceMeta.centre_cost || '';
                (markerElement as any).dataset.area = deviceMeta.area !== undefined ? String(deviceMeta.area) : '';
                const lbl = (markerElement as HTMLElement).querySelector('[data-marker-label]') as HTMLElement | null;
                if (lbl) lbl.textContent = buildMarkerText({ name: deviceName, id: deviceMeta.id, guid: deviceGuid, costCenter: deviceMeta.centre_cost, area: deviceMeta.area });
                // Anclar marcador y vincular selección al clic
                marker.create(world, markerElement as unknown as HTMLElement, elevatedPosition);
                try {
                  const modelSet = Object.keys(finalSetMap);
                  const modelId = modelSet[0];
                  const id = (Array.from(finalSetMap[modelId] as Set<number>)[i]) as number;
                  (markerElement as any).dataset.modelId = modelId;
                  (markerElement as any).dataset.expressId = String(id);
                  markerElement.addEventListener('click', async (ev) => {
                    ev.stopPropagation();
                    const m = (ev.currentTarget as HTMLElement).dataset.modelId!;
                    const eid = Number((ev.currentTarget as HTMLElement).dataset.expressId!);
                    await selectElements(state.components, { [m]: new Set([eid]) });
                  });
                } catch {}
              }
            }
          } catch {}
        }
      }

      // Fit camera
      const worldFit = worlds?.list.get(worldId);
      if (worldFit && worldFit.camera instanceof OBC.SimpleCamera) {
        try { await worldFit.camera.fitToItems(finalSetMap); } catch {}
      }
    } catch {}
  };

  // Load building files by code (mirrors Actius)
  /**
   * Carga archivos .frag del edificio indicado y prepara clasificaciones por niveles.
   * Actualiza `modelStore` (edificio activo, niveles) y encuadra la cámara.
   *
   * @param components Contenedor de componentes OBC
   * @param buildingCode Código de edificio (p.ej. 'TAU', 'UDI')
   * @returns true si la carga ha sido correcta; false en caso contrario
   */
  const loadBuildingByCode = async (components: OBC.Components, buildingCode: string) => {
    try {
      const fragments = components.get(OBC.FragmentsManager);
      const buildingFiles: Record<string, string[]> = {
        'TAU': ['CCSPT-TAU-M3D-AS.frag'],
        'TOC': ['CCSPT-TOC-M3D-AS.frag'],
        'ALB': ['CCSPT-ALB-M3D-AS.frag'],
        'CQA': ['CCSPT-CQA-M3D-AS.frag'],
        'MIN': ['CCSPT-MIN-M3D-AS.frag'],
        'UDI': ['CCSPT-UDI-M3D-AS.frag', 'CCSPT-UDI-M3D-ME.frag'],
        'VII': ['CCSPT-VII-M3D-AS.frag']
      };
      const filesToLoad = buildingFiles[buildingCode] || [];
      if (filesToLoad.length === 0) return false;
      for (const fileName of filesToLoad) {
        const response = await fetch(`/models/${fileName}`);
        if (!response.ok) continue;
        const buffer = await response.arrayBuffer();
        const bytes = new Uint8Array(buffer);
        const modelId = fileName.replace(".frag", "");
        await fragments.core.load(bytes, { modelId });
      }
      modelStore.setActiveBuilding(buildingCode);
      await fragments.core.update(true);

      // Camera fit
      try {
        const worlds = components.get(OBC.Worlds);
        const worldKeys = Array.from(worlds.list.keys());
        const worldId = worldKeys[0];
        const world = worlds.list.get(worldId);
        if (world && world.camera instanceof OBC.SimpleCamera) {
          await world.camera.fitToItems();
        }
      } catch {}

      // Levels classification
      const classificationUtils = new ClassificationUtils(components);
      const availableLevels = await classificationUtils.getAvailableLevels();
      const levelsClassification = await classificationUtils.createDynamicLevelClassification(availableLevels);
      let floorData: any[] = [];
      if (levelsClassification) {
        for (const [groupName] of levelsClassification) {
          floorData.push({ Name: { value: groupName }, expressID: groupName });
        }
      }
      modelStore.setModelsLoaded(fragments, floorData, levelsClassification);
      return true;
    } catch {
      return false;
    }
  };

  // Search function
  /**
   * Ejecuta la búsqueda de texto de departamentos y dispositivos contra el backend.
   * Actualiza `state.searchResults` y fuerza un refresco del panel.
   *
   * @param query Texto de búsqueda (mínimo 2 caracteres tras trim)
   */
  const performSearch = async (query: string) => {
    if (!query || query.trim().length < 2) {
      state.searchResults = [];
      update(state);
      return;
    }
    try {
      const url = `/api/ifcspace/search-all?query=${encodeURIComponent(query.trim())}`;
      const resp = await fetch(url, { headers: { Accept: 'application/json' } });
      if (!resp.ok) return;
      const results = await resp.json();
      state.searchResults = results;
      update(state);
    } catch {}
  };

  // Restore materials after ghosting
  /**
   * Restaura los materiales cambiados por `setModelTransparent` a su estado original.
   * Vacía la caché `originalColors` una vez aplicado.
   */
  const restoreModelMaterials = () => {
    for (const [material, data] of originalColors) {
      const { color, transparent, opacity } = data;
      (material as any).transparent = transparent;
      (material as any).opacity = opacity;
      if ("color" in material) (material as any).color.setHex(color);
      else (material as any).lodColor.setHex(color);
      (material as any).needsUpdate = true;
    }
    originalColors.clear();
  };

  // Update Espais legend container
  /**
   * Rellena el contenedor de leyenda `#espais-legend-content` con entradas de departamento.
   * Cada entrada emite `ccspt:espais-focus-department` al hacer clic.
   *
   * @param legendItems Lista de { name, color, count } donde count representa m²
   */
  const updateLegendDisplay = (
    legendItems: { name: string; color: string; count: number }[],
  ) => {
    const legendContent = document.getElementById("espais-legend-content");
    if (!legendContent) return;
    legendContent.innerHTML = legendItems
      .map(
        (item, index) => `
        <div 
          title="${item.name}" 
          data-department="${item.name}"
          style="display: flex; align-items: center; gap: 0.5rem; padding: 0.35rem 0.25rem; border-radius: 0.375rem; color: var(--bim-ui_bg-contrast-100); cursor: pointer; transition: background-color 0.2s ease;"
          onmouseover="this.style.backgroundColor='var(--bim-ui_bg-contrast-30)'"
          onmouseout="this.style.backgroundColor='transparent'"
          onclick="window.dispatchEvent(new CustomEvent('ccspt:espais-focus-department', { detail: { department: '${item.name}', index: ${index} } }))"
        >
          <span style="width: 14px; height: 14px; border-radius: 2px; background: ${item.color}; border: 1px solid var(--bim-ui_bg-contrast-80);"></span>
          <span style="flex: 1; font-size: 0.92rem; font-weight: 600; letter-spacing: 0.2px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${item.name}</span>
          <span style="color: var(--bim-ui_bg-contrast-80); font-size: 0.85rem; font-weight: 600; font-variant-numeric: tabular-nums; min-width: 2.5rem; text-align: right;">${(
            typeof item.count === "number" ? item.count : 0
          ).toFixed(1)} m²</span>
        </div>
      `,
      )
      .join("");
  };

  // Clear department styles added by coloring
  /**
   * Limpia estilos de resaltado por departamento (`dept:*`), marcadores y leyenda.
   * Restaura materiales y resetea el estado relacionado en `modelStore`.
   */
  const clearDepartmentStyles = async () => {
    const highlighter = state.components.get(OBF.Highlighter);
    const hider = state.components.get(OBC.Hider);
    for (const [styleName] of highlighter.styles) {
      if (typeof styleName === 'string' && styleName.startsWith('dept:')) {
        await highlighter.clear(styleName);
        highlighter.styles.delete(styleName);
      }
    }
    // Limpiar ghost de IFCSITE si existe
    for (const [styleName] of highlighter.styles) {
      if (typeof styleName === 'string' && styleName.startsWith('ghost:IFCSITE')) {
        await highlighter.clear(styleName);
        highlighter.styles.delete(styleName);
      }
    }
    // Limpiar ghost de IFCBUILDING si existe
    for (const [styleName] of highlighter.styles) {
      if (typeof styleName === 'string' && styleName.startsWith('ghost:IFCBUILDING')) {
        await highlighter.clear(styleName);
        highlighter.styles.delete(styleName);
      }
    }
    // Restaurar visibilidad completa al limpiar
    try { await hider.set(true); } catch {}
    restoreModelMaterials();
    // Clear markers/labels as well
    try {
      const marker = state.components.get(OBF.Marker);
      marker.list.clear();
    } catch {}
    try {
      const existingMarkers = document.querySelectorAll('[data-marker]');
      existingMarkers.forEach(el => el.remove());
    } catch {}
    modelStore.setDepartmentsLegend([]);
    updateLegendDisplay([]);
  };

  // Colorize departments and populate legend (mirrors Actius)
  /**
   * Solicita departamentos del edificio/planta activa y colorea sus IFCSPACEs.
   * - Aplica un color por departamento con `OBF.Highlighter`.
   * - Activa ghost del modelo base previamente.
   * - Actualiza y muestra la leyenda con áreas agregadas.
   */
  const colorizeDepartments = async () => {
    try {
      const highlighter = state.components.get(OBF.Highlighter);
      const fragments = state.components.get(OBC.FragmentsManager);

      // Clear existing dept styles
      for (const [styleName] of highlighter.styles) {
        if (typeof styleName === 'string' && styleName.startsWith('dept:')) {
          await highlighter.clear(styleName);
          highlighter.styles.delete(styleName);
        }
      }
      restoreModelMaterials();
      await setModelTransparent(state.components);

      const { activeBuildingCode, activeFloorCode } = modelStore.getState();
      if (!activeBuildingCode) return;
      const plantaQuery = activeFloorCode ? `&planta=${encodeURIComponent(activeFloorCode)}` : '';
      const url = `/api/ifcspace/departaments?edifici=${encodeURIComponent(activeBuildingCode)}${plantaQuery}`;
      const resp = await fetch(url, { headers: { Accept: 'application/json' } });
      const text = await resp.text();
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      let departaments: Array<{ departament: string; guids: string[]; count: number; totalArea: number }> = [];
      departaments = JSON.parse(text);

      const legendItems: { name: string; color: string; count: number }[] = [];
      for (let index = 0; index < departaments.length; index++) {
        const { departament, guids, totalArea } = departaments[index] as any;
        if (!departament || !Array.isArray(guids) || guids.length === 0) continue;
        const modelIdMap = await fragments.guidsToModelIdMap(new Set(guids));
        if (!modelIdMap) continue;

        const finalMap: Record<string, number[]> = modelIdMap as any;
        const styleName = `dept:${departament}`;
        const color = new THREE.Color().setHSL((index % 12) / 12, 0.65, 0.5);
        highlighter.styles.set(styleName, {
          color,
          renderedFaces: FRAGS.RenderedFaces.ONE,
          opacity: 1,
          transparent: false,
        });
        const finalSetMap: Record<string, Set<number>> = {} as any;
        for (const [modelId, ids] of Object.entries(finalMap)) {
          finalSetMap[modelId] = new Set(Array.isArray(ids) ? ids : Array.from(ids as any));
        }
        await highlighter.highlightByID(styleName, finalSetMap as any, false, false);

        const areaValue = typeof totalArea === 'number' ? totalArea : parseFloat(totalArea) || 0;
        legendItems.push({ name: String(departament), color: `#${color.getHexString()}`, count: areaValue });
      }

      modelStore.setDepartmentsLegend(legendItems);
      updateLegendDisplay(legendItems);
    } catch {}
  };

  const focusOnDepartment = async (
    components: OBC.Components,
    departmentName: string,
  ) => {
    /**
     * Enfoca un departamento aplicando ghost y resaltando sus IFCSPACEs.
     * También crea etiquetas de dispositivos y ajusta la cámara a la selección.
     */
    const fragments = components.get(OBC.FragmentsManager);
    const highlighter = components.get(OBF.Highlighter);
    const marker = components.get(OBF.Marker);

    // Clear previous focus and markers
    for (const [styleName] of highlighter.styles) {
      if (
        typeof styleName === "string" &&
        (styleName.startsWith("espais-focus:") || styleName.startsWith("espais-ghost:"))
      ) {
        await highlighter.clear(styleName);
        highlighter.styles.delete(styleName);
      }
    }
    marker.threshold = 10;
    marker.list.clear();
    const existingMarkers = document.querySelectorAll('[data-marker]');
    existingMarkers.forEach(el => el.remove());

    // Obtener datos de departamento (para IDs de modelo y resaltar)
    const { activeBuildingCode, activeFloorCode } = modelStore.getState();
    if (!activeBuildingCode) return;
    let plantaQuery = "";
    if (activeFloorCode) plantaQuery = `&planta=${encodeURIComponent(activeFloorCode)}`;
    const url = `/api/ifcspace/departaments?edifici=${encodeURIComponent(
      activeBuildingCode,
    )}${plantaQuery}`;
    const resp = await fetch(url, { headers: { Accept: "application/json" } });
    const departaments = await resp.json();
    const target = departaments.find((d: any) => d.departament === departmentName);
    if (!target || !Array.isArray(target.guids)) return;

    // Determinar modelos del edificio del departamento a partir de los GUIDs
    let buildingModelIds: Set<string> | undefined;
    try {
      const deptModelMap = await fragments.guidsToModelIdMap(new Set(target.guids));
      if (deptModelMap && Object.keys(deptModelMap).length) {
        buildingModelIds = new Set(Object.keys(deptModelMap));
      }
    } catch {}

    // Aislar IFCSPACE y dejar en fantasma el IFCBUILDING correspondiente
    await isolateIfcSpaces(components, buildingModelIds);
    // Aplicar ghost global suave para que edificio/sitio queden en fantasma
    await setModelTransparent(components, 0.12);

    const deptModelMap = await fragments.guidsToModelIdMap(new Set(target.guids));
    if (!deptModelMap) return;
    const finalSetMap: Record<string, Set<number>> = {};
    for (const [modelId, ids] of Object.entries(deptModelMap)) {
      finalSetMap[modelId] = new Set(Array.isArray(ids) ? ids : Array.from(ids as any));
    }

    const styleName = `espais-focus:${departmentName}`;
    highlighter.styles.set(styleName, {
      color: new THREE.Color().setHSL(0.6, 0.8, 0.6),
      renderedFaces: FRAGS.RenderedFaces.ONE,
      opacity: 1,
      transparent: false,
    });
    await highlighter.highlightByID(styleName, finalSetMap as any, false, false);

    // Create 2D labels for devices in this department (like Actius)
    try {
      const { activeBuildingCode } = modelStore.getState();
      if (!activeBuildingCode) {
        // No building context → skip device labels
        throw new Error('No active building when creating device labels');
      }
      const guidsParam = target.guids.join(',');
      const deviceUrl = `/api/ifcspace/devices?guids=${encodeURIComponent(guidsParam)}&edifici=${encodeURIComponent(activeBuildingCode)}`;
      const deviceResp = await fetch(deviceUrl, { headers: { Accept: 'application/json' } });
      let deviceData: any[] = [];
      if (deviceResp.ok) deviceData = await deviceResp.json();

      const worlds = state.components.get(OBC.Worlds);
      const world = worlds.list.get(Array.from(worlds.list.keys())[0]);
      if (world) {
        for (const [modelId, idsSet] of Object.entries(finalSetMap)) {
          const model = fragments.list.get(modelId);
          if (!model) continue;
          const localIdsArray = Array.from(idsSet as Set<number>);
          try {
            // Use BoundingBoxer to place marker at top of the IFCSPACE instead of its center
            const boxer = state.components.get(OBC.BoundingBoxer);
            const topPositions: THREE.Vector3[] = [];
            for (const eid of localIdsArray) {
              try {
                boxer.list.clear();
                await boxer.addFromModelIdMap({ [modelId]: new Set([eid]) } as any);
                const box = boxer.get();
                boxer.list.clear();
                if (!box) { topPositions.push(new THREE.Vector3()); continue; }
                const center = new THREE.Vector3();
                box.getCenter(center);
                const height = Math.max(0, box.max.y - box.min.y);
                const extra = Math.max(3.0, 0.5 * height); // 50% height or 3m
                const topY = box.max.y + extra;
                topPositions.push(new THREE.Vector3(center.x, topY, center.z));
              } catch { topPositions.push(new THREE.Vector3()); }
            }
            if (topPositions.length > 0) {
              for (let i = 0; i < topPositions.length; i++) {
                const posIndex = i;
                let deviceName = 'Sin dispositivo';
                const guid = target.guids[posIndex];
                const deviceInfo = deviceData.find((item: any) => item.guid === guid);
                if (deviceInfo && deviceInfo.dispositiu) deviceName = deviceInfo.dispositiu;

                if (deviceName !== 'Sin dispositivo') {
                  ensureGlobalMarkerCSS();
                  const markerElement = createSpaceMarker(deviceName);
                  // Populate datasets for dynamic label building
                  (markerElement as any).dataset.name = deviceName || '';
                  (markerElement as any).dataset.guid = guid || '';
                  // Populate ID and Centre de cost using backend keys exactly as provided
                  const devId = deviceInfo && (deviceInfo.id ?? deviceInfo.device_id ?? deviceInfo.Id);
                  const cc = deviceInfo && (deviceInfo.centre_cost ?? deviceInfo.centreDeCost ?? deviceInfo.cc);
                  const area = deviceInfo && (deviceInfo.area ?? deviceInfo.area_m2 ?? deviceInfo.m2);
                  if (devId !== undefined) (markerElement as any).dataset.id = String(devId);
                  if (cc) (markerElement as any).dataset.cc = String(cc);
                  if (area !== undefined) (markerElement as any).dataset.area = String(area);
                  const lbl = (markerElement as HTMLElement).querySelector('[data-marker-label]') as HTMLElement | null;
                  if (lbl) lbl.textContent = buildMarkerText({ name: deviceName, id: devId, guid, costCenter: cc, area });
                  const elevatedPosition = topPositions[i];
                  marker.create(world, markerElement as unknown as HTMLElement, elevatedPosition);
                  try {
                    // Vincular selección al clic usando el id local del elemento
                    (markerElement as any).dataset.modelId = modelId;
                    (markerElement as any).dataset.expressId = String(localIdsArray[i]);
                    markerElement.addEventListener('click', async (ev) => {
                      ev.stopPropagation();
                      const m = (ev.currentTarget as HTMLElement).dataset.modelId!;
                      const eid = Number((ev.currentTarget as HTMLElement).dataset.expressId!);
                      await selectElements(state.components, { [m]: new Set([eid]) });
                    });
                  } catch {}
                }
              }
            }
          } catch {}
        }
      }
    } catch {}

    // Fit camera
    try {
      const worlds = state.components.get(OBC.Worlds);
      const world = worlds.list.get(Array.from(worlds.list.keys())[0]);
      if (world && world.camera instanceof OBC.SimpleCamera) {
        await world.camera.fitToItems(finalSetMap);
      }
    } catch {}
  };



  // Template with search and simple scope dropdown
  /**
   * Hook de creación del panel: registra el listener
   * `ccspt:espais-focus-department` para permitir enfocar desde la leyenda.
   */
  const onCreated = (e?: Element) => {
    if (!e) return;
    // input search is handled inline via lit events

    // focus event
    const handler = async (event: any) => {
      const { department } = event.detail || {};
      if (!department) return;
      await focusOnDepartment(state.components, department);
    };
    window.addEventListener('ccspt:espais-focus-department', handler);

  };

  return BUI.html`
    <bim-panel-section fixed icon=${appIcons.SETTINGS} label="Espais" ${BUI.ref(onCreated)}>
      <div style="display: flex; flex-direction: column; gap: 0.75rem;">
        <!-- Cercador (igual a Actius) -->
        <div style="margin-bottom: 0.25rem;">
          <div style="font-weight: 600; color: var(--bim-ui_bg-contrast-100); margin-bottom: 0.25rem; font-size: 0.875rem;">Cercador</div>
          <div style="position: relative; width: 100%;">
            <input
              type="text"
              placeholder="Cerca departaments i dispositius..."
              value=${state.searchQuery || ''}
              style="width: 100%; box-sizing: border-box; padding: 0.75rem; padding-left: 2.5rem; border: 1px solid var(--bim-ui_bg-contrast-40); border-radius: 0.375rem; background: var(--bim-ui_bg-contrast-20); color: var(--bim-ui_bg-contrast-100); font-size: 0.875rem; font-family: inherit; outline: none; transition: all 0.2s ease;"
              @input=${(e: Event) => {
                const input = e.target as HTMLInputElement;
                state.searchQuery = input.value;
                update(state);
                clearTimeout((globalThis as any).espaisSearchTimeout);
                (globalThis as any).espaisSearchTimeout = setTimeout(() => performSearch(input.value), 300);
              }}
              @focus=${(e: Event) => {
                const input = e.target as HTMLInputElement;
                input.style.borderColor = 'var(--bim-ui_accent-base)';
                input.style.boxShadow = '0 0 0 2px rgba(40, 180, 215, 0.2)';
              }}
              @blur=${(e: Event) => {
                const input = e.target as HTMLInputElement;
                input.style.borderColor = 'var(--bim-ui_bg-contrast-40)';
                input.style.boxShadow = 'none';
              }}
            />
            <div style="position: absolute; left: 0.75rem; top: 50%; transform: translateY(-50%); color: var(--bim-ui_bg-contrast-60); font-size: 0.875rem; pointer-events: none;">🔍</div>
          </div>
        </div>

        ${state.searchResults && state.searchResults.length > 0 ? BUI.html`
          <div style="margin-bottom: 0.25rem;">
            <div style="font-weight: 600; color: var(--bim-ui_bg-contrast-100); margin-bottom: 0.25rem; font-size: 0.875rem;">Resultats (${state.searchResults.length})</div>
            <div style="max-height: 20rem; overflow: auto; border: 1px solid var(--bim-ui_bg-contrast-40); background: var(--bim-ui_bg-contrast-20); border-radius: 0.5rem; padding: 0.5rem;">
              ${state.searchResults.map((result) => BUI.html`
                <div 
                  style="display: flex; flex-direction: column; gap: 0.25rem; padding: 0.5rem; border-radius: 0.375rem; background: var(--bim-ui_bg-contrast-10); margin-bottom: 0.25rem; cursor: pointer; transition: background-color 0.2s ease;"
                  @mouseover=${(e: Event) => { (e.currentTarget as HTMLDivElement).style.backgroundColor = 'var(--bim-ui_bg-contrast-30)'; }}
                  @mouseout=${(e: Event) => { (e.currentTarget as HTMLDivElement).style.backgroundColor = 'var(--bim-ui_bg-contrast-10)'; }}
                  @click=${async () => {
                    const displayName = result.tipo_coincidencia === 'dispositiu' ? result.dispositiu : result.departament;
                    const fragments = state.components.get(OBC.FragmentsManager);
                    const isBuildingLoaded = Array.from(fragments.list.keys()).some(modelId => modelId.includes(result.edifici));
                    if (!isBuildingLoaded) {
                      const success = await loadBuildingByCode(state.components, result.edifici);
                      if (!success) return;
                    }
                    if (result.tipo_coincidencia === 'departament') {
                      // No ocultar/ghost: solo resaltar el departamento
                      await focusOnDepartment(state.components, result.departament);
                    } else {
                      await focusOnDevice(state.components, result.guid, displayName);
                    }
                  }}
                >
                  <div style="display: flex; align-items: center; gap: 0.5rem;">
                    <span style="font-size: 0.75rem; padding: 0.125rem 0.375rem; border-radius: 0.25rem; background: ${result.tipo_coincidencia === 'departament' ? 'var(--bim-ui_accent-base)' : result.tipo_coincidencia === 'dispositiu' ? '#10b981' : '#f59e0b'}; color: white; font-weight: 600; text-transform: uppercase; pointer-events: none;">${result.tipo_coincidencia}</span>
                    <span style="font-weight: 600; color: var(--bim-ui_bg-contrast-100); font-size: 0.875rem;">${result.tipo_coincidencia === 'dispositiu' ? result.dispositiu : result.departament}</span>
                  </div>
                  <div style="display: flex; gap: 1rem; font-size: 0.75rem; color: var(--bim-ui_bg-contrast-80);">
                    <span>🏢 ${result.edifici}</span>
                    <span>🏗️ ${result.planta}</span>
                    <span>📐 ${(result.total_area?.toFixed ? result.total_area.toFixed(1) : (Number(result.total_area) || 0).toFixed(1))} m²</span>
                  </div>
                </div>
              `)}
            </div>
          </div>
        ` : ''}
        <!-- Opcions d'etiquetes -->
        <div style="display: flex; flex-direction: column; gap: 0.25rem; padding: 0.5rem; background: var(--bim-ui_bg-contrast-20); border: 1px solid var(--bim-ui_bg-contrast-40); border-radius: 0.5rem; color: var(--bim-ui_bg-contrast-100);">
          <div style="font-weight: 600; color: var(--bim-ui_bg-contrast-100); font-size: 0.875rem;">Opcions d'etiqueta</div>
          <div style="display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 0.25rem 1rem; align-items: center;">
            <label style="display: flex; align-items: center; gap: 0.5rem; cursor: pointer; color: var(--bim-ui_bg-contrast-100);">
              <input type="checkbox" style="accent-color: var(--bim-ui_primary-100);" .checked=${state.labelOptions?.name ?? true} @change=${(e: Event) => { state.labelOptions = { ...(state.labelOptions || { name: true, id: false, costCenter: false, area: false }), name: (e.target as HTMLInputElement).checked }; update(state); refreshAllMarkerLabels(); }} />
              <span style="color: var(--bim-ui_bg-contrast-100);">Nom dispositiu</span>
            </label>
            <label style="display: flex; align-items: center; gap: 0.5rem; cursor: pointer; color: var(--bim-ui_bg-contrast-100);">
              <input type="checkbox" style="accent-color: var(--bim-ui_primary-100);" .checked=${!!state.labelOptions?.id} @change=${(e: Event) => { state.labelOptions = { ...(state.labelOptions || { name: true, id: false, costCenter: false, area: false }), id: (e.target as HTMLInputElement).checked }; update(state); refreshAllMarkerLabels(); }} />
              <span style="color: var(--bim-ui_bg-contrast-100);">ID</span>
            </label>
            <label style="display: flex; align-items: center; gap: 0.5rem; cursor: pointer; color: var(--bim-ui_bg-contrast-100);">
              <input type="checkbox" style="accent-color: var(--bim-ui_primary-100);" .checked=${!!state.labelOptions?.costCenter} @change=${(e: Event) => { state.labelOptions = { ...(state.labelOptions || { name: true, id: false, costCenter: false, area: false }), costCenter: (e.target as HTMLInputElement).checked }; update(state); refreshAllMarkerLabels(); }} />
              <span style="color: var(--bim-ui_bg-contrast-100);">Centre de cost</span>
            </label>
            <label style="display: flex; align-items: center; gap: 0.5rem; cursor: pointer; color: var(--bim-ui_bg-contrast-100);">
              <input type="checkbox" style="accent-color: var(--bim-ui_primary-100);" .checked=${!!state.labelOptions?.area} @change=${(e: Event) => { state.labelOptions = { ...(state.labelOptions || { name: true, id: false, costCenter: false, area: false }), area: (e.target as HTMLInputElement).checked }; update(state); refreshAllMarkerLabels(); }} />
              <span style="color: var(--bim-ui_bg-contrast-100);">Àrea</span>
            </label>
          </div>
        </div>
        <select
          style="padding: 0.75rem; border: 1px solid var(--bim-ui_bg-contrast-40); border-radius: 0.375rem; background: var(--bim-ui_bg-contrast-20); color: var(--bim-ui_bg-contrast-100); font-size: 0.875rem; font-family: inherit; cursor: pointer; transition: all 0.2s ease; outline: none;"
          @change=${(e: Event) => {
            const select = e.target as HTMLSelectElement;
            state.viewCategory = (select.value || "");
            state.subCategory = "";
            update(state);
          }}
          @focus=${(e: Event) => {
            const select = e.target as HTMLSelectElement;
            select.style.borderColor = 'var(--bim-ui_accent-base)';
            select.style.boxShadow = '0 0 0 2px rgba(40, 180, 215, 0.2)';
          }}
          @blur=${(e: Event) => {
            const select = e.target as HTMLSelectElement;
            select.style.borderColor = 'var(--bim-ui_bg-contrast-40)';
            select.style.boxShadow = 'none';
          }}
        >
          <option value="">Sel·lecciona àmbit...</option>
          <option value="Espais" ?selected=${state.viewCategory === 'Espais'}>Espais</option>
          <option value="Instal·lacions" ?selected=${state.viewCategory === 'Instal·lacions'}>Instal·lacions</option>
        </select>
        ${state.viewCategory === 'Espais' ? BUI.html`
          <select
            style="padding: 0.75rem; border: 1px solid var(--bim-ui_bg-contrast-40); border-radius: 0.375rem; background: var(--bim-ui_bg-contrast-20); color: var(--bim-ui_bg-contrast-100); font-size: 0.875rem; font-family: inherit; cursor: pointer; transition: all 0.2s ease; outline: none;"
            @change=${async (e: Event) => {
              const select = e.target as HTMLSelectElement;
              state.subCategory = select.value || "";
              // Mirror Actius behavior: toggle departaments coloring
              modelStore.setDepartamentsActive(state.subCategory === "Departaments" && state.viewCategory === 'Espais');
              update(state);
              if (modelStore.getState().isDepartamentsActive) {
                await colorizeDepartments();
              } else {
                await clearDepartmentStyles();
              }
            }}
            @focus=${(e: Event) => {
              const select = e.target as HTMLSelectElement;
              select.style.borderColor = 'var(--bim-ui_accent-base)';
              select.style.boxShadow = '0 0 0 2px rgba(40, 180, 215, 0.2)';
            }}
            @blur=${(e: Event) => {
              const select = e.target as HTMLSelectElement;
              select.style.borderColor = 'var(--bim-ui_bg-contrast-40)';
              select.style.boxShadow = 'none';
            }}
          >
            <option value="">Sel·lecciona...</option>
            <option value="Departaments" ?selected=${state.subCategory === 'Departaments'}>Departaments</option>
            <option value="Dispositius" ?selected=${state.subCategory === 'Dispositius'}>Dispositius</option>
          </select>
        ` : ''}
        ${state.viewCategory === 'Espais' && state.subCategory === 'Departaments' ? BUI.html`
          <div style="display: flex; flex-direction: column; gap: 0.25rem;">
            <div style="font-weight: 600; color: var(--bim-ui_bg-contrast-90);">Llegenda</div>
            <div id="espais-legend-content" style="display: flex; flex-direction: column; gap: 0.125rem;"></div>
          </div>
        ` : ''}
      </div>
    </bim-panel-section>
  `;
};
