import * as THREE from "three";
import * as OBC from "@thatopen/components";

/**
 * Utilidades para manejo de cámara usando BoundingBoxer
 * Basado en el tutorial oficial: https://docs.thatopen.com/Tutorials/Components/Core/BoundingBoxer
 */

export class CameraUtils {
  private components: OBC.Components;
  private world: any;
  private boxer: OBC.BoundingBoxer;

  constructor(components: OBC.Components, world: any) {
    this.components = components;
    this.world = world;
    this.boxer = components.get(OBC.BoundingBoxer);
  }

  /**
   * Obtiene el bounding box de todos los modelos cargados
   * Implementación basada en el tutorial oficial
   */
  private getLoadedModelsBoundings(): THREE.Box3 {
    // Como buena práctica, limpiar la lista del boxer primero
    // para que no se tengan en cuenta cajas anteriores
    this.boxer.list.clear();

    // Añadir todos los modelos cargados
    this.boxer.addFromModels();

    // Calcular la caja fusionada de la lista
    const box = this.boxer.get();

    // Como buena práctica, limpiar la lista después del cálculo
    this.boxer.list.clear();

    // Verificar que el box sea válido
    if (!box || box.isEmpty()) {
      console.warn('⚠️ Bounding box vacío, creando box por defecto');
      // Crear un bounding box por defecto centrado en el origen
      return new THREE.Box3(
        new THREE.Vector3(-35, -35, -35),
        new THREE.Vector3(35, 35, 35)
      );
    }

    console.log('📦 Bounding box calculado:', {
      min: box.min,
      max: box.max,
      size: box.getSize(new THREE.Vector3())
    });

    return box;
  }

  /**
   * Obtiene el bounding box de elementos específicos usando ModelIdMap
   * @param modelIdMap Mapa de elementos seleccionados por modelo
   */
  private async getBoundingBoxFromModelIdMap(modelIdMap: Record<string, Set<number>>): Promise<THREE.Box3> {
    try {
      this.boxer.list.clear();

      // Agregar elementos al boxer
      await this.boxer.addFromModelIdMap(modelIdMap);

      const box = this.boxer.get();

      // Verificar que el box sea válido
      if (!box || box.isEmpty()) {
        console.warn('⚠️ Bounding box vacío o inválido del boxer, usando método alternativo');
        return await this.getBoundingBoxFromModelIdMapAlternative(modelIdMap);
      }

      this.boxer.list.clear();
      return box;
    } catch (error) {
      console.warn('⚠️ Error usando boxer, usando método alternativo:', error);
      return await this.getBoundingBoxFromModelIdMapAlternative(modelIdMap);
    }
  }

  /**
   * Método alternativo para obtener bounding box de elementos específicos
   * @param modelIdMap Mapa de elementos seleccionados por modelo
   */
  private async getBoundingBoxFromModelIdMapAlternative(modelIdMap: Record<string, Set<number>>): Promise<THREE.Box3> {
    try {
      const fragments = this.components.get(OBC.FragmentsManager);
      if (!fragments) {
        console.warn('⚠️ Fragments manager no disponible');
        return this.getLoadedModelsBoundings();
      }

      const boundingBox = new THREE.Box3();
      let hasValidBox = false;

      for (const [modelId, localIds] of Object.entries(modelIdMap)) {
        const model = fragments.list.get(modelId);
        if (!model) continue;

        const localIdsArray = Array.from(localIds);
        if (localIdsArray.length === 0) continue;

        try {
          // Obtener las posiciones de los elementos
          const itemsData = await (model as any).getItemsData(localIdsArray, {
            attributesDefault: true
          });

          for (const itemData of itemsData) {
            // Intentar diferentes atributos de posición
            let position = null;

            if (itemData._position?.value) {
              position = itemData._position.value;
            } else if (itemData.position?.value) {
              position = itemData.position.value;
            } else if (itemData._center?.value) {
              position = itemData._center.value;
            }

            if (position && Array.isArray(position) && position.length >= 3) {
              const point = new THREE.Vector3(position[0], position[1], position[2]);
              boundingBox.expandByPoint(point);
              hasValidBox = true;
            }
          }
        } catch (error) {
          console.warn(`⚠️ Error obteniendo posiciones de elementos en ${modelId}:`, error);
        }
      }

      if (hasValidBox) {
        console.log('✅ Bounding box calculado usando método alternativo:', {
          min: boundingBox.min,
          max: boundingBox.max,
          size: boundingBox.getSize(new THREE.Vector3())
        });
        return boundingBox;
      } else {
        console.warn('⚠️ No se pudo calcular bounding box, usando fallback');
        return this.getLoadedModelsBoundings();
      }
    } catch (error) {
      console.error('❌ Error en método alternativo:', error);
      return this.getLoadedModelsBoundings();
    }
  }

  /**
   * Centra la cámara en todos los modelos cargados
   */
  async fitToAllModels(): Promise<void> {
    try {
      const box = this.getLoadedModelsBoundings();

      // Verificar que el bounding box sea válido
      if (!box || box.isEmpty()) {
        console.warn('⚠️ Bounding box vacío, intentando centrar con valores por defecto');
        // Posicionar cámara en una posición por defecto más cercana
        const camera = this.world.camera;
        if (camera && camera.controls) {
          await camera.controls.setLookAt(0, 10, 20, 0, 0, 0, true);
        }
        return;
      }

      await this.fitCameraToBox(box);
      console.log('✅ Cámara centrada en todos los modelos');
    } catch (error) {
      console.error('❌ Error al centrar cámara en todos los modelos:', error);
    }
  }

  /**
   * Centra la cámara en elementos específicos
   * @param modelIdMap Mapa de elementos por modelo
   */
  async fitToElements(modelIdMap: Record<string, Set<number>>): Promise<void> {
    try {
      console.log('🎯 Intentando centrar cámara en elementos específicos:', modelIdMap);

      // Debug: mostrar información detallada del modelIdMap
      for (const [modelId, localIds] of Object.entries(modelIdMap)) {
        console.log(`📋 Modelo ${modelId}: ${localIds.size} elementos`);
      }

      const box = await this.getBoundingBoxFromModelIdMap(modelIdMap);

      if (!box || box.isEmpty()) {
        console.warn('⚠️ Bounding box inválido, usando fitToAllModels como fallback');
        await this.fitToAllModels();
        return;
      }

      console.log('📦 Bounding box calculado:', {
        min: box.min,
        max: box.max,
        size: box.getSize(new THREE.Vector3())
      });

      await this.fitCameraToBox(box);
      console.log('✅ Cámara centrada en elementos seleccionados');
    } catch (error) {
      console.error('❌ Error al centrar cámara en elementos:', error);
      console.log('🔄 Usando fitToAllModels como fallback');
      await this.fitToAllModels();
    }
  }

  /**
   * Centra la cámara en elementos por GUIDs (útil para departamentos)
   * @param guids Array de GUIDs de elementos
   */
  async fitToGuids(guids: string[]): Promise<void> {
    try {
      console.log(`🎯 Intentando centrar en ${guids.length} elementos por GUIDs`);

      // Obtener el fragments manager
      const fragments = this.components.get(OBC.FragmentsManager);
      if (!fragments) {
        console.warn('⚠️ Fragments manager no disponible');
        await this.fitToAllModels();
        return;
      }

      // Buscar elementos por GUIDs en todos los modelos
      const elementsToIsolate: Record<string, Set<number>> = {};

      for (const [modelId, model] of fragments.list) {
        try {
          // Obtener elementos IFCSPACE y IFCDOOR
          let allLocalIds: number[] = [];

          try {
            const spaces = await (model as any).getItemsOfCategories([/IFCSPACE/]);
            if (spaces && typeof spaces === 'object') {
              const spaceIds = Object.values(spaces).flat() as number[];
              allLocalIds = [...allLocalIds, ...spaceIds];
            }

            const doors = await (model as any).getItemsOfCategories([/IFCDOOR/]);
            if (doors && typeof doors === 'object') {
              const doorIds = Object.values(doors).flat() as number[];
              allLocalIds = [...allLocalIds, ...doorIds];
            }
          } catch (categoryError) {
            console.warn(`⚠️ Error obteniendo categorías en ${modelId}:`, categoryError);
            continue;
          }

          if (allLocalIds.length === 0) {
            console.warn(`⚠️ Modelo ${modelId} no tiene elementos IFCSPACE o IFCDOOR`);
            continue;
          }

          // Buscar elementos por GUID
          const modelElements = new Set<number>();

          // Procesar elementos en chunks para evitar sobrecarga
          const CHUNK_SIZE = 50;

          for (let i = 0; i < allLocalIds.length; i += CHUNK_SIZE) {
            const chunk = allLocalIds.slice(i, i + CHUNK_SIZE);

            try {
              const itemsData = await (model as any).getItemsData(chunk, {
                attributesDefault: false,
                attributes: ["_guid"]
              });

              for (let j = 0; j < itemsData.length; j++) {
                const itemData = itemsData[j];
                const localId = chunk[j];

                if (itemData._guid?.value && guids.includes(itemData._guid.value) && typeof localId === 'number') {
                  modelElements.add(localId);
                  console.log(`✅ Coincidencia: GUID ${itemData._guid.value}, localId ${localId} en modelo ${modelId}`);
                }
              }
            } catch (chunkError) {
              console.warn(`⚠️ Error procesando chunk en ${modelId}:`, chunkError);
            }
          }

          if (modelElements.size > 0) {
            elementsToIsolate[modelId] = modelElements;
            console.log(`📦 Añadido modelo ${modelId} con ${modelElements.size} elementos para aislar`);
          }

        } catch (modelError) {
          console.warn(`⚠️ Error procesando modelo ${modelId}:`, modelError);
        }
      }

      // Si encontramos elementos, hacer zoom en ellos
      if (Object.keys(elementsToIsolate).length > 0) {
        console.log(`🎯 Encontrados elementos en ${Object.keys(elementsToIsolate).length} modelos`);
        await this.fitToElements(elementsToIsolate);
        console.log('✅ Cámara centrada en elementos específicos por GUIDs');
      } else {
        console.warn('⚠️ No se encontraron elementos por GUIDs, usando fallback');
        await this.fitToAllModels();
      }

    } catch (error) {
      console.error('❌ Error al centrar cámara en GUIDs:', error);
      await this.fitToAllModels();
    }
  }

  /**
   * Centra la cámara en un elemento específico
   * @param modelId ID del modelo
   * @param elementId ID local del elemento
   */
  async fitToElement(modelId: string, elementId: number): Promise<void> {
    const modelIdMap: Record<string, Set<number>> = {
      [modelId]: new Set([elementId])
    };
    await this.fitToElements(modelIdMap);
  }

  /**
   * Hace fit de la cámara a un elemento específico usando BoundingBoxer
   * Basado en el tutorial oficial: https://docs.thatopen.com/Tutorials/Components/Core/BoundingBoxer
   * @param modelId ID del modelo
   * @param elementId ID del elemento
   */
  async fitToSingleElement(modelId: string, elementId: number): Promise<void> {
    try {
      console.log(`🎯 Haciendo fit al elemento ${elementId} del modelo ${modelId}`);

      // Crear ModelIdMap para el elemento específico
      const modelIdMap: Record<string, Set<number>> = {
        [modelId]: new Set([elementId])
      };

      // Obtener bounding box del elemento usando BoundingBoxer
      this.boxer.list.clear();
      await this.boxer.addFromModelIdMap(modelIdMap);
      const box = this.boxer.get();
      this.boxer.list.clear();

      if (!box || box.isEmpty()) {
        console.warn('⚠️ No se pudo obtener bounding box del elemento, usando fallback');
        // Fallback: usar el método existente
        await this.fitToElement(modelId, elementId);
        return;
      }

      // Crear esfera del bounding box
      const sphere = new THREE.Sphere();
      box.getBoundingSphere(sphere);

      // Ajustar el radio de la esfera para que el elemento se vea más cerca
      sphere.radius *= 0.8; // Reducir el radio para acercar la cámara

      console.log('🎯 Ajustando cámara a elemento específico:', {
        center: sphere.center,
        radius: sphere.radius,
        elementId,
        modelId
      });

      // Hacer fit de la cámara a la esfera usando la estructura correcta de ThatOpen
      if (!this.world.camera || !this.world.camera.controls) {
        console.warn('⚠️ Controles de cámara no disponibles');
        // Fallback: usar el método existente
        await this.fitToElement(modelId, elementId);
        return;
      }

      try {
        // Usar fitToSphere para centrar la cámara en el elemento
        await this.world.camera.controls.fitToSphere(sphere, true);
        console.log('✅ Fit completado usando BoundingBoxer para elemento específico');
      } catch (error) {
        console.error('❌ Error ajustando cámara al elemento:', error);
        // Fallback al método existente
        await this.fitToElement(modelId, elementId);
      }

    } catch (error) {
      console.warn('⚠️ Error haciendo fit con BoundingBoxer:', error);
      // Fallback al método existente
      await this.fitToElement(modelId, elementId);
    }
  }

  /**
   * Ajusta la cámara a un bounding box específico
   * @param box Bounding box de THREE.js
   */
  private async fitCameraToBox(box: THREE.Box3): Promise<void> {
    if (!this.world.camera || !this.world.camera.controls) {
      console.warn('Controles de cámara no disponibles');
      return;
    }

    // Verificar que el box sea válido
    if (!box || box.isEmpty()) {
      console.warn('⚠️ Bounding box inválido en fitCameraToBox');
      return;
    }

    // Calcular esfera envolvente del bounding box
    const sphere = new THREE.Sphere();
    box.getBoundingSphere(sphere);

    // Verificar que la esfera sea válida
    if (sphere.radius <= 0) {
      console.warn('⚠️ Radio de esfera inválido:', sphere.radius);
      return;
    }

    // Ajustar el radio de la esfera para que el modelo se vea más cerca
    sphere.radius *= 0.8; // Reducir el radio para acercar la cámara

    console.log('🎯 Ajustando cámara a esfera:', {
      center: sphere.center,
      radius: sphere.radius,
      boxSize: box.getSize(new THREE.Vector3())
    });

    try {
      // Usar fitToSphere para centrar la cámara
      await this.world.camera.controls.fitToSphere(sphere, true);
      console.log('✅ Cámara ajustada exitosamente');
    } catch (error) {
      console.error('❌ Error ajustando cámara:', error);
    }
  }

  /**
   * Obtiene información de cámara para una orientación específica
   * @param orientation Orientación deseada
   */
  async getCameraOrientation(
    orientation: "front" | "back" | "left" | "right" | "top" | "bottom"
  ): Promise<{ position: THREE.Vector3; target: THREE.Vector3 }> {
    // Asegurar que el boxer tenga los modelos cargados
    this.getLoadedModelsBoundings();

    // Usar el método oficial del boxer para obtener la orientación
    return await this.boxer.getCameraOrientation(orientation);
  }

  /**
   * Establece la vista desde una orientación específica
   * @param orientation Orientación deseada
   */
  async viewFromOrientation(
    orientation: "front" | "back" | "left" | "right" | "top" | "bottom"
  ): Promise<void> {
    const camera = this.world.camera;
    if (!camera.hasCameraControls()) {
      console.warn('Controles de cámara no disponibles');
      return;
    }

    try {
      const { position, target } = await this.getCameraOrientation(orientation);

      await camera.controls.setLookAt(
        position.x, position.y, position.z,
        target.x, target.y, target.z,
        true // animación
      );

      console.log(`✅ Vista establecida desde orientación: ${orientation}`);
    } catch (error) {
      console.error(`❌ Error al establecer vista ${orientation}:`, error);
    }
  }

  /**
   * Establece vista 2D cenital con rotación personalizada para el norte del proyecto
   * @param northRotationDegrees Ángulo de rotación del norte en grados (por defecto 99.01)
   */
  async viewFrom2DTop(northRotationDegrees: number = 99.01): Promise<void> {
    const camera = this.world.camera;
    if (!camera.hasCameraControls()) {
      console.warn('Controles de cámara no disponibles');
      return;
    }

    try {
      // Obtener el bounding box de todos los modelos
      const box = this.getLoadedModelsBoundings();

      if (box) {
        const center = box.getCenter(new THREE.Vector3());
        const size = box.getSize(new THREE.Vector3());

        // Posicionar cámara desde arriba
        const height = Math.max(size.x, size.z) * 1.5; // Altura basada en el tamaño del modelo

        // Rotación para alinear con el norte del proyecto
        // Convertir grados a radianes
        const northRotationRadians = (northRotationDegrees * Math.PI) / 180;

        // Calcular posición de cámara con rotación más efectiva
        const radius = height * 0.8; // Radio para la posición de la cámara
        const offsetX = Math.sin(northRotationRadians) * radius * 0.01;
        const offsetZ = Math.cos(northRotationRadians) * radius * 0.01;

        const cameraPosition = new THREE.Vector3(
          center.x + offsetX,
          center.y + height,
          center.z + offsetZ
        );
        const target = new THREE.Vector3(center.x, center.y, center.z);

        console.log('🎯 Configurando vista 2D con rotación:', {
          northRotationDegrees,
          northRotationRadians,
          cameraPosition,
          target,
          center,
          size
        });

        // Usar setLookAt para posicionar la cámara
        await camera.controls.setLookAt(
          cameraPosition.x, cameraPosition.y, cameraPosition.z,
          target.x, target.y, target.z,
          true // animate
        );

        // Para vista 2D cenital, mantener el vector up estándar (0,1,0)
        // Esto asegura que la cámara esté completamente paralela al suelo
        if (camera.three && camera.controls) {
          // Vector up estándar para vista cenital perfecta
          camera.three.up.set(0, 1, 0);
          camera.three.updateProjectionMatrix();
          // Forzar actualización de los controles con delta time
          if (typeof camera.controls.update === 'function') {
            try {
              camera.controls.update(0.016); // ~60fps delta time
            } catch (e) {
              console.warn('No se pudo actualizar los controles:', e);
            }
          }
        }

        console.log('✅ Vista 2D cenital establecida con rotación personalizada:', northRotationDegrees, 'grados');
        console.log('Cámara posicionada en:', cameraPosition, 'mirando a:', target);
      } else {
        console.warn('No se pudo obtener el bounding box del modelo');
      }
    } catch (error) {
      console.error('❌ Error al establecer vista 2D cenital:', error);
    }
  }

  /**
   * Obtiene el bounding box de elementos de una categoría específica
   * @param category Categoría IFC (ej: "IFCWALL", "IFCDOOR")
   * @param modelId ID del modelo (opcional, si no se especifica busca en todos)
   */
  async getBoundingBoxByCategory(category: string, modelId?: string): Promise<THREE.Box3 | null> {
    try {
      const fragments = this.components.get(OBC.FragmentsManager);

      // Si se especifica un modelo, usar solo ese
      let targetModelId = modelId;
      if (!targetModelId) {
        // Buscar el primer modelo disponible
        const modelIds = Array.from(fragments.list.keys());
        if (modelIds.length === 0) {
          console.warn('No hay modelos cargados');
          return null;
        }
        targetModelId = modelIds[0];
      }

      const model = fragments.list.get(targetModelId);
      if (!model) {
        console.warn(`Modelo ${targetModelId} no encontrado`);
        return null;
      }

      // Obtener elementos de la categoría
      const items = await model.getItemsOfCategories([new RegExp(`^${category}$`)]);
      const localIds = Object.values(items).flat();

      if (localIds.length === 0) {
        console.warn(`No se encontraron elementos de categoría ${category}`);
        return null;
      }

      // Crear ModelIdMap para los elementos encontrados
      const modelIdMap: Record<string, Set<number>> = {
        [targetModelId]: new Set(localIds)
      };

      return await this.getBoundingBoxFromModelIdMap(modelIdMap);
    } catch (error) {
      console.error(`Error al obtener bounding box de categoría ${category}:`, error);
      return null;
    }
  }

  /**
   * Centra la cámara en elementos de una categoría específica
   * @param category Categoría IFC
   * @param modelId ID del modelo (opcional)
   */
  async fitToCategory(category: string, modelId?: string): Promise<void> {
    const box = await this.getBoundingBoxByCategory(category, modelId);
    if (box) {
      await this.fitCameraToBox(box);
      console.log(`✅ Cámara centrada en categoría: ${category}`);
    }
  }

  /**
   * Crea un helper visual para mostrar el bounding box
   * @param box Bounding box a visualizar
   * @param color Color del helper (opcional)
   */
  createBoxHelper(box: THREE.Box3, color: number = 0xff0000): THREE.Box3Helper {
    const helper = new THREE.Box3Helper(box, new THREE.Color(color));
    this.world.scene.three.add(helper);
    return helper;
  }

  /**
   * Elimina un helper del bounding box
   * @param helper Helper a eliminar
   */
  disposeBoxHelper(helper: THREE.Box3Helper): void {
    const disposer = this.components.get(OBC.Disposer);
    disposer.destroy(helper);
  }

  /**
   * Configura la velocidad del zoom con rueda del mouse
   * @param speed Velocidad del zoom (por defecto 1.0, valores más altos = zoom más rápido)
   */
  setZoomSpeed(speed: number): void {
    const camera = this.world.camera;
    if (camera.hasCameraControls()) {
      camera.controls.dollySpeed = speed;
      console.log(`⚙️ Velocidad de zoom actualizada: ${speed}`);
    } else {
      console.warn('⚠️ No se pueden configurar los controles de cámara - controles no disponibles');
    }
  }

  /**
   * Configura la velocidad del zoom por defecto (más sensible)
   */
  setDefaultZoomSpeed(): void {
    this.setZoomSpeed(8.0); // Zoom más sensible por defecto
  }

  /**
   * Obtiene la velocidad actual del zoom
   * @returns Velocidad actual del zoom o null si no está disponible
   */
  getZoomSpeed(): number | null {
    const camera = this.world.camera;
    if (camera.hasCameraControls()) {
      return camera.controls.dollySpeed;
    }
    return null;
  }
}

/**
 * Función de conveniencia para crear una instancia de CameraUtils
 * @param components Instancia de componentes
 * @param world Instancia del mundo
 */
export function createCameraUtils(components: OBC.Components, world: any): CameraUtils {
  return new CameraUtils(components, world);
}

/**
 * Función global para centrar el modelo en el visor después de búsquedas
 * Esta función se puede llamar desde cualquier parte de la aplicación
 */
export function centerModelInViewer() {
  try {
    // Obtener la instancia global de CameraUtils si existe
    const globalCameraUtils = (window as any).cameraUtils;
    if (globalCameraUtils && typeof globalCameraUtils.fitToAllModels === 'function') {
      globalCameraUtils.fitToAllModels();
      console.log('✅ Modelo centrado usando CameraUtils global');
      return true;
    } else {
      console.warn('⚠️ CameraUtils global no disponible');
      return false;
    }
  } catch (error) {
    console.error('❌ Error al centrar modelo:', error);
    return false;
  }
} 