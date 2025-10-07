import { ClassificationUtils, ClassificationConfig } from './ClassificationUtils';
import * as OBC from "@thatopen/components";

/**
 * Ejemplos de uso de ClassificationUtils para diferentes partes de la aplicación
 */
export class ClassificationExamples {
  private classificationUtils: ClassificationUtils;

  constructor(components: OBC.Components) {
    this.classificationUtils = new ClassificationUtils(components);
  }

  /**
   * Ejemplo: Clasificación para elementos de fontanería
   */
  async createPlumbingClassification() {
    const config: ClassificationConfig = {
      classificationName: "Plumbing Classification",
      groupName: "Plumbing Elements",
      queryName: "Plumbing_Query",
      categories: [/FLOW/, /SANITARY/, /PIPE/],
    };

    return this.classificationUtils.createCustomClassification(config);
  }

  /**
   * Ejemplo: Clasificación para elementos eléctricos
   */
  async createElectricalClassification() {
    const config: ClassificationConfig = {
      classificationName: "Electrical Classification",
      groupName: "Electrical Elements",
      queryName: "Electrical_Query",
      categories: [/ELECTRICAL/, /LIGHTING/, /SWITCH/],
    };

    return this.classificationUtils.createCustomClassification(config);
  }

  /**
   * Ejemplo: Clasificación para elementos de HVAC
   */
  async createHVACClassification() {
    const config: ClassificationConfig = {
      classificationName: "HVAC Classification",
      groupName: "HVAC Elements",
      queryName: "HVAC_Query",
      categories: [/HVAC/, /AIR/, /VENTILATION/],
    };

    return this.classificationUtils.createCustomClassification(config);
  }

  /**
   * Ejemplo: Clasificación para elementos estructurales
   */
  async createStructuralClassification() {
    const config: ClassificationConfig = {
      classificationName: "Structural Classification",
      groupName: "Structural Elements",
      queryName: "Structural_Query",
      categories: [/COLUMN/, /BEAM/, /SLAB/, /WALL/],
    };

    return this.classificationUtils.createCustomClassification(config);
  }

  /**
   * Ejemplo: Clasificación para elementos de acabados
   */
  async createFinishesClassification() {
    const config: ClassificationConfig = {
      classificationName: "Finishes Classification",
      groupName: "Finishes Elements",
      queryName: "Finishes_Query",
      categories: [/COVERING/, /PAINTING/, /FLOORING/],
    };

    return this.classificationUtils.createCustomClassification(config);
  }

  /**
   * Ejemplo: Clasificación para elementos de seguridad
   */
  async createSecurityClassification() {
    const config: ClassificationConfig = {
      classificationName: "Security Classification",
      groupName: "Security Elements",
      queryName: "Security_Query",
      categories: [/FIRE/, /SECURITY/, /ALARM/],
    };

    return this.classificationUtils.createCustomClassification(config);
  }

  /**
   * Ejemplo: Clasificación para elementos de un nivel específico
   */
  async createLevelSpecificClassification(levelName: string) {
    const config: ClassificationConfig = {
      classificationName: "Level Specific Classification",
      groupName: `Level_${levelName}`,
      queryName: `${levelName}_Specific_Query`,
      categories: [/WALL/, /DOOR/, /WINDOW/, /FURNITURE/],
      relation: {
        name: "ContainedInStructure",
        query: {
          categories: [/SPACE/, /STOREY/],
          attributes: {
            queries: [{ name: /Name/, value: new RegExp(levelName) }],
          },
        },
      },
    };

    return this.classificationUtils.createCustomClassification(config);
  }

  /**
   * Ejemplo: Clasificación para elementos por tipo de habitación
   */
  async createRoomTypeClassification(roomType: string) {
    const config: ClassificationConfig = {
      classificationName: "Room Type Classification",
      groupName: roomType,
      queryName: `${roomType}_Room_Query`,
      categories: [/SPACE/, /ROOM/],
      relation: {
        name: "ContainedInStructure",
        query: {
          categories: [/SPACE/],
          attributes: {
            queries: [{ name: /Name/, value: new RegExp(roomType, 'i') }],
          },
        },
      },
    };

    return this.classificationUtils.createCustomClassification(config);
  }

  /**
   * Ejemplo: Obtener datos de una clasificación específica
   */
  async getClassificationData(classification: any, groupName: string) {
    return this.classificationUtils.getGroupData(classification, groupName);
  }

  /**
   * Ejemplo: Crear múltiples clasificaciones a la vez
   */
  async createMultipleClassifications() {
    const classifications = {
      plumbing: await this.createPlumbingClassification(),
      electrical: await this.createElectricalClassification(),
      hvac: await this.createHVACClassification(),
      structural: await this.createStructuralClassification(),
      finishes: await this.createFinishesClassification(),
      security: await this.createSecurityClassification(),
    };

    console.log('✅ Todas las clasificaciones creadas:', classifications);
    return classifications;
  }
} 