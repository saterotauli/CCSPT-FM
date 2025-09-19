import * as OBC from "@thatopen/components";

export interface ClassificationConfig {
  classificationName: string;
  groupName: string;
  queryName: string;
  categories: RegExp[];
  relation?: {
    name: string;
    query: {
      categories: RegExp[];
      attributes: {
        queries: Array<{
          name: RegExp;
          value: RegExp;
        }>;
      };
    };
  };
}

export class ClassificationUtils {
  private components: OBC.Components;

  constructor(components: OBC.Components) {
    this.components = components;
  }

  /**
   * Crea una clasificación dinámica por niveles del edificio
   * @param levels - Array de nombres de niveles (ej: ["P01", "P02", "P03"])
   * @returns Promise con la clasificación creada
   */
  async createDynamicLevelClassification(levels: string[]) {
    console.log('🏗️ Creando clasificación dinámica para niveles:', levels);

    const classifier = this.components.get(OBC.Classifier);
    const finder = this.components.get(OBC.ItemsFinder);

    const classificationName = "Dynamic Levels Classification";

    // Crear un grupo para cada nivel
    for (const level of levels) {
      console.log(`📋 Creando grupo para nivel: ${level}`);

      const groupName = level; // Usar el nombre real del nivel

      // Primera consulta: elementos relacionados por ContainedInStructure
      const queryName1 = `${level}_Contained_Elements`;
      finder.create(queryName1, [
        {
          categories: [
            /WALL/, /FURNITURE/, /WINDOW/, /DOOR/, /FLOW/, /SLAB/,
            /COLUMN/, /BEAM/, /MEMBER/, /PLATE/, /COVERING/, /SANITARY/,
            /ELECTRICAL/, /LIGHTING/, /HVAC/, /AIR/, /VENTILATION/
          ],
          relation: {
            name: "ContainedInStructure",
            query: {
              categories: [/SPACE/, /STOREY/],
              attributes: {
                queries: [{
                  name: /Name/,
                  value: new RegExp(level)
                }]
              },
            },
          },
        },
      ]);

      // Segunda consulta: elementos relacionados por IsDefinedBy
      const queryName2 = `${level}_Defined_Elements`;
      finder.create(queryName2, [
        {
          categories: [
            /SPACE/
          ],
          relation: {
            name: "IsDefinedBy",
            query: {
              categories: [/IFCPROPERTYSET/],
              relation: {
                name: "HasProperties",
                query: {
                  categories: [/IFCPROPERTYSINGLEVALUE/],
                  attributes: {
                    queries: [
                      {
                        name: /NominalValue/i,
                        value: new RegExp(level)
                      }
                    ]
                  }
                }
              }
            }
          },
        },
      ]);

      /*// Tercera consulta: elementos relacionados por RelatingStructure
      const queryName3 = `${level}_Relating_Elements`;
      finder.create(queryName3, [
        {
          categories: [
            /WALL/, /FURNITURE/, /WINDOW/, /DOOR/, /FLOW/, /SLAB/,
            /COLUMN/, /BEAM/, /MEMBER/, /PLATE/, /COVERING/, /SANITARY/,
            /ELECTRICAL/, /LIGHTING/, /HVAC/, /AIR/, /VENTILATION/
          ],
          relation: {
            name: "RelatingStructure",
            query: {
              categories: [/SPACE/, /STOREY/],
              attributes: {
                queries: [{
                  name: /Name/,
                  value: new RegExp(level)
                }]
              },
            },
          },
        },
      ]);*/

      // Asignar la consulta principal al grupo (puedes elegir cuál usar)
      classifier.setGroupQuery(classificationName, groupName, {
        name: queryName2, // Usar la primera consulta como principal
      });

      //console.log(`✅ Grupo "${groupName}" creado con consultas "${queryName1}", "${queryName2}", "${queryName3}"`);
    }



    // Obtener la clasificación completa
    const classification = classifier.list.get(classificationName);
    console.log('📊 Clasificación dinámica creada:', classification);

    return classification;
  }

  /**
   * Crea una clasificación personalizada con configuración específica
   * @param config - Configuración de la clasificación
   * @returns Promise con la clasificación creada
   */
  async createCustomClassification(config: ClassificationConfig) {
    console.log('🔧 Creando clasificación personalizada:', config);

    const classifier = this.components.get(OBC.Classifier);
    const finder = this.components.get(OBC.ItemsFinder);

    // Crear la consulta
    finder.create(config.queryName, [
      {
        categories: config.categories,
        relation: config.relation,
      },
    ]);

    // Asignar la consulta al grupo
    classifier.setGroupQuery(config.classificationName, config.groupName, {
      name: config.queryName,
    });

    const classification = classifier.list.get(config.classificationName);
    console.log('✅ Clasificación personalizada creada:', classification);

    return classification;
  }

  /**
 * Obtiene los niveles disponibles del edificio usando clasificación IFC
 * @returns Array de nombres de niveles
 */
  async getAvailableLevels(): Promise<string[]> {
    console.log('🔍 Detectando niveles disponibles del edificio...');

    const classifier = this.components.get(OBC.Classifier);

    // Usar la clasificación automática por IFC Building Storey
    await classifier.byIfcBuildingStorey({ classificationName: "IFC_Levels" });

    const levelsClassification = classifier.list.get("IFC_Levels");

    if (levelsClassification) {
      const levels = Array.from(levelsClassification.keys());
      console.log('📋 Niveles detectados del modelo IFC:', levels);
      return levels;
    } else {
      console.warn('⚠️ No se pudieron detectar niveles automáticamente');
      return [];
    }
  }

  /**
   * Crea una clasificación para elementos específicos (muros, puertas, etc.)
   * @param elementType - Tipo de elemento
   * @returns Promise con la clasificación
   */
  async createElementClassification(elementType: string) {
    const config: ClassificationConfig = {
      classificationName: "Element Classification",
      groupName: elementType,
      queryName: `${elementType}_Query`,
      categories: [new RegExp(elementType.toUpperCase())],
    };

    return this.createCustomClassification(config);
  }

  /**
   * Obtiene datos de un grupo específico de la clasificación
   * @param classification - Clasificación completa
   * @param groupName - Nombre del grupo
   * @returns Promise con los datos del grupo
   */
  async getGroupData(classification: any, groupName: string) {
    if (!classification) {
      console.warn('❌ No hay clasificación disponible');
      return null;
    }

    const groupData = classification.get(groupName);
    if (!groupData) {
      console.warn(`❌ No se encontró el grupo: ${groupName}`);
      return null;
    }

    console.log(`📊 Obteniendo datos del grupo: ${groupName}`);
    const data = await groupData.get();
    console.log(`✅ Datos obtenidos para ${groupName}:`, data);

    return data;
  }
} 