/**
 * Servicio centralizado para gestionar datos de ifcspace con caché
 * Evita llamadas repetitivas a la API y proporciona acceso rápido a los datos
 */

export interface IfcSpaceItem {
  guid: string;
  edifici: string;
  planta: string;
  departament: string;
  nom?: string;
  codi?: string;
  [key: string]: any;
}

export interface DepartmentGroup {
  departament: string;
  planta: string;
  edifici: string;
  guids: string[];
  items: IfcSpaceItem[];
}

class IfcSpaceService {
  private cache: Map<string, IfcSpaceItem[]> = new Map();
  private departmentCache: Map<string, DepartmentGroup[]> = new Map();
  private levelsCache: Map<string, string[]> = new Map();
  private initialized = false;

  /**
   * Inicializa el servicio cargando todos los datos de ifcspace
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;
    
    try {
      //console.log('[IfcSpaceService] Initializing...');
      const response = await fetch('/api/ifcspace', {
        headers: { Accept: 'application/json' }
      });
      
      if (response.ok) {
        const allSpaces: IfcSpaceItem[] = await response.json();
        //console.log(`[IfcSpaceService] Loaded ${allSpaces.length} spaces`);
        
        // Agrupar por edificio
        const spacesByBuilding = new Map<string, IfcSpaceItem[]>();
        allSpaces.forEach(space => {
          if (space.edifici) {
            if (!spacesByBuilding.has(space.edifici)) {
              spacesByBuilding.set(space.edifici, []);
            }
            spacesByBuilding.get(space.edifici)!.push(space);
          }
        });
        
        // Guardar en caché y procesar cada edificio
        for (const [edifici, spaces] of spacesByBuilding) {
          this.cache.set(edifici, spaces);
          this.processBuilding(edifici, spaces);
        }
        
        this.initialized = true;
        //console.log(`[IfcSpaceService] Initialized with ${spacesByBuilding.size} buildings`);
      } else {
        console.error('[IfcSpaceService] Failed to load ifcspace data:', response.status);
      }
    } catch (error) {
      console.error('[IfcSpaceService] Error initializing:', error);
    }
  }

  /**
   * Procesa los espacios de un edificio para generar cachés derivados
   */
  private processBuilding(edifici: string, spaces: IfcSpaceItem[]): void {
    // Generar caché de plantas
    const levels = [...new Set(spaces.map(s => s.planta).filter(Boolean))].sort((a, b) => {
      const specialLevels = ['PSS', 'PS1', 'Sin planta'];
      const aIsSpecial = specialLevels.includes(a);
      const bIsSpecial = specialLevels.includes(b);
      
      if (aIsSpecial && bIsSpecial) {
        const specialOrder = ['Sin planta', 'PSS', 'PS1'];
        return specialOrder.indexOf(a) - specialOrder.indexOf(b);
      } else if (aIsSpecial) {
        return 1;
      } else if (bIsSpecial) {
        return -1;
      } else {
        const aNum = parseInt(a.replace('P', ''));
        const bNum = parseInt(b.replace('P', ''));
        return bNum - aNum; // Descendente (más alto primero)
      }
    });
    this.levelsCache.set(edifici, levels);

    // Generar caché de departamentos agrupados
    const departmentGroups = new Map<string, DepartmentGroup>();
    
    spaces.forEach(space => {
      const key = `${space.planta}-${space.departament}`;
      if (!departmentGroups.has(key)) {
        departmentGroups.set(key, {
          departament: space.departament,
          planta: space.planta,
          edifici: space.edifici,
          guids: [],
          items: []
        });
      }
      const group = departmentGroups.get(key)!;
      group.guids.push(space.guid);
      group.items.push(space);
    });

    this.departmentCache.set(edifici, Array.from(departmentGroups.values()));
  }

  /**
   * Obtiene las plantas de un edificio
   */
  async getLevels(edifici: string): Promise<string[]> {
    await this.ensureInitialized();
    return this.levelsCache.get(edifici) || [];
  }

  /**
   * Obtiene los departamentos de un edificio (opcionalmente filtrados por planta)
   */
  async getDepartments(edifici: string, planta?: string): Promise<DepartmentGroup[]> {
    await this.ensureInitialized();
    const departments = this.departmentCache.get(edifici) || [];
    
    if (planta) {
      return departments.filter(dept => dept.planta === planta);
    }
    
    return departments;
  }

  /**
   * Obtiene todos los espacios de un edificio
   */
  async getSpaces(edifici: string): Promise<IfcSpaceItem[]> {
    await this.ensureInitialized();
    return this.cache.get(edifici) || [];
  }

  /**
   * Busca espacios por GUID
   */
  async getSpacesByGuids(guids: string[]): Promise<IfcSpaceItem[]> {
    await this.ensureInitialized();
    const results: IfcSpaceItem[] = [];
    
    for (const spaces of this.cache.values()) {
      for (const space of spaces) {
        if (guids.includes(space.guid)) {
          results.push(space);
        }
      }
    }
    
    return results;
  }

  /**
   * Busca un espacio específico por GUID
   */
  async getSpaceByGuid(spaceGuid: string): Promise<IfcSpaceItem | null> {
    await this.ensureInitialized();
    for (const spaces of this.cache.values()) {
      for (const space of spaces) {
        if (space.guid === spaceGuid) {
          return space;
        }
      }
    }
    return null;
  }

  /**
   * Busca un espacio específico por código (codi)
   */
  async getSpaceByCodi(codi: string): Promise<IfcSpaceItem | null> {
    await this.ensureInitialized();
    for (const spaces of this.cache.values()) {
      for (const space of spaces) {
        if (space.codi === codi) {
          return space;
        }
      }
    }
    return null;
  }

  /**
   * Asegura que el servicio esté inicializado
   */
  private async ensureInitialized(): Promise<void> {
    if (!this.initialized) {
      await this.initialize();
    }
  }

  /**
   * Fuerza la recarga de datos (útil para desarrollo)
   */
  async reload(): Promise<void> {
    this.cache.clear();
    this.departmentCache.clear();
    this.levelsCache.clear();
    this.initialized = false;
    await this.initialize();
  }

  /**
   * Obtiene estadísticas del caché
   */
  getStats() {
    return {
      initialized: this.initialized,
      buildings: this.cache.size,
      totalSpaces: Array.from(this.cache.values()).reduce((sum, spaces) => sum + spaces.length, 0),
      levels: Array.from(this.levelsCache.entries()).map(([edifici, levels]) => ({ edifici, count: levels.length }))
    };
  }
}

// Instancia singleton
export const ifcSpaceService = new IfcSpaceService();

// Función de conveniencia para inicializar en el arranque de la app
export const initializeIfcSpaceService = () => ifcSpaceService.initialize();
