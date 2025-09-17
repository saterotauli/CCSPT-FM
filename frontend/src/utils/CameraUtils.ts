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
  // Factor para acercar más tras el fit (solo ortográfica). 1.0 = sin extra, >1 = más cerca
  private fitCloseFactor: number = 1.85;
  // Factor para ESCALAR el box antes del fit ( <1 encuadra más cerca, >1 más lejos )
  private fitScaleFactor: number = 0.9;

  constructor(components: OBC.Components, world: any) {
    this.components = components;
    this.world = world;
    this.boxer = components.get(OBC.BoundingBoxer);
  }

  /**
   * Configura cuánto se acerca la cámara adicionalmente tras el fit (solo ortográfica)
   * @param factor 1.0 = sin extra, 1.2..2.0 más cerca
   */
  setFitCloseFactor(factor: number) {
    if (Number.isFinite(factor) && factor > 0) {
      this.fitCloseFactor = factor;
    }
  }

  /**
   * Configura el factor de escala aplicado al Box3 antes del fit.
   * Valores < 1 encuadran más cerca (reducen el box), > 1 más lejos.
   */
  setFitScaleFactor(factor: number) {
    if (Number.isFinite(factor) && factor > 0) {
      this.fitScaleFactor = factor;
    }
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

      // 1) Camino preferente: usar el mismo método que el botón "Enfocar"
      //    Esto garantiza exactamente el mismo padding/comportamiento.
      try {
        const cam: any = this.world?.camera;
        if (cam && typeof cam.fitToItems === 'function') {
          await cam.fitToItems(modelIdMap);
          console.log('✅ Fit completado con camera.fitToItems (coincide con toolbar)');
          return;
        }
      } catch (e) {
        console.warn('⚠️ No se pudo usar camera.fitToItems, usando fallback boxer:', e);
      }

      // 2) Fallback: usar BoundingBoxer y fitToSphere
      this.boxer.list.clear();
      await this.boxer.addFromModelIdMap(modelIdMap);
      const box = this.boxer.get();
      this.boxer.list.clear();

      if (!box || box.isEmpty()) {
        console.warn('⚠️ No se pudo obtener bounding box del elemento, usando fallback genérico');
        await this.fitToElement(modelId, elementId);
        return;
      }

      const sphere = new THREE.Sphere();
      box.getBoundingSphere(sphere);
      // Dar un poco de aire para no quedar demasiado cerca
      sphere.radius *= 1.25;

      console.log('🎯 Ajustando cámara a elemento (fallback boxer):', {
        center: sphere.center,
        radius: sphere.radius,
        elementId,
        modelId
      });

      if (!this.world.camera || !this.world.camera.controls) {
        console.warn('⚠️ Controles de cámara no disponibles (fallback boxer)');
        await this.fitToElement(modelId, elementId);
        return;
      }

      try {
        await this.world.camera.controls.fitToSphere(sphere, true);
        console.log('✅ Fit completado usando BoundingBoxer (fallback)');
      } catch (error) {
        console.error('❌ Error ajustando cámara (fallback boxer):', error);
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

    // Intentar un encuadre con padding casi nulo para acercar al máximo
    const padding = 0; // píxeles
    console.log('🎯 Ajustando cámara a box con padding reducido:', {
      center: sphere.center,
      radius: sphere.radius,
      boxSize: box.getSize(new THREE.Vector3()),
      padding
    });

    try {
      // Reducir o ampliar el box alrededor de su centro para controlar la distancia percibida
      const scaledBox = box.clone();
      const center = scaledBox.getCenter(new THREE.Vector3());
      const size = scaledBox.getSize(new THREE.Vector3()).multiplyScalar(this.fitScaleFactor);
      scaledBox.setFromCenterAndSize(center, size);

      if (typeof this.world.camera.controls.fitToBox === 'function') {
        await this.world.camera.controls.fitToBox(scaledBox, true, {
          paddingLeft: padding,
          paddingRight: padding,
          paddingTop: padding,
          paddingBottom: padding,
        });
      } else {
        // Fallback a esfera si fitToBox no está disponible
        await this.world.camera.controls.fitToSphere(sphere, true);
      }

      // Acercar aún más después del fit según tipo de cámara
      const cam = this.world.camera.three;
      if (!cam) {
        console.warn('⚠️ Cámara Three.js no disponible tras el fit');
      } else if ((cam as any).isOrthographicCamera) {
        // ORTHO: aumentar zoom
        if (this.world.camera.controls?.zoomTo) {
          const currentZoom = cam.zoom || 1;
          // Elevar límites si existen
          if ('maxZoom' in this.world.camera.controls && typeof (this.world.camera.controls as any).maxZoom === 'number') {
            (this.world.camera.controls as any).maxZoom = Math.max((this.world.camera.controls as any).maxZoom, 1e6);
          }
          const targetZoom = Math.min(currentZoom * this.fitCloseFactor, 1e6);
          await this.world.camera.controls.zoomTo(targetZoom, true);
        }
      } else if ((cam as any).isPerspectiveCamera) {
        // PERSPECTIVE: reducir distancia al target con dollyTo
        const controls: any = this.world.camera.controls;
        if (controls && typeof controls.dollyTo === 'function') {
          const target = controls.getTarget ? controls.getTarget(new THREE.Vector3()) : (controls.target ?? new THREE.Vector3());
          const currentDistance = cam.position.clone().sub(target).length();
          const targetDistance = Math.max(currentDistance / this.fitCloseFactor, 0.01);
          await controls.dollyTo(targetDistance, true);
        } else if (controls && typeof controls.dolly === 'function') {
          // Fallback: dolly relativo (aproximado)
          await controls.dolly(1 / this.fitCloseFactor, true);
        }
      }

      console.log('✅ Cámara ajustada exitosamente (fitToBox + zoom ortográfico opcional)');
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
        const height = Math.max(size.x, size.z) * 1.0; // Altura más baja para ver marcadores más cerca

        // Rotación para alinear con el norte del proyecto
        // Convertir grados a radianes
        const northRotationRadians = (northRotationDegrees * Math.PI) / 180;

        // Calcular posición de cámara con rotación más efectiva
        const radius = height * 0.6; // Radio menor para acercar aún más
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

// === Controls presets for 2D vs 3D ===
// We avoid importing ACTION enums; instead we reuse current mappings so it's version-agnostic.

export interface TwoDControlsOptions {
  lockAzimuth?: boolean; // default true
}

export class CameraControlsPresets {
  static setControlsFor2D(world: any, opts: TwoDControlsOptions = {}) {
    try {
      const cam: any = world?.camera;
      const controls: any = cam?.controls;
      if (!cam || !controls) return;

      // Switch to orthographic projection if supported
      try { cam.projection?.set?.('Orthographic'); } catch {}

      // Disable rotation/orbit
      if ('rotateSpeed' in controls) controls.rotateSpeed = 0;
      if ('azimuthRotateSpeed' in controls) controls.azimuthRotateSpeed = 0;
      if ('polarRotateSpeed' in controls) controls.polarRotateSpeed = 0;

      // Lock polar angle straight-down
      if ('minPolarAngle' in controls) controls.minPolarAngle = 0;
      if ('maxPolarAngle' in controls) controls.maxPolarAngle = 0;

      // Optionally lock azimuth to current value
      const lockAzimuth = opts.lockAzimuth !== false;
      const currentAzimuth = (typeof controls.getAzimuthAngle === 'function') ? controls.getAzimuthAngle() : 0;
      if (lockAzimuth) {
        if ('minAzimuthAngle' in controls) controls.minAzimuthAngle = currentAzimuth;
        if ('maxAzimuthAngle' in controls) controls.maxAzimuthAngle = currentAzimuth;
      }

      // Mouse and touch mappings: left = pan (truck), wheel = zoom (dolly), right = none
      try {
        // Save originals once
        (controls as any).__origMouseButtons = (controls as any).__origMouseButtons || { ...(controls.mouseButtons || {}) };
        (controls as any).__origTouches = (controls as any).__origTouches || { ...(controls.touches || {}) };

        const current = controls.mouseButtons || {};
        const rightAsTruck = current.right ?? current.secondary ?? current.contextmenu;
        const noneToken = (current as any).none ?? (current as any).NONE ?? undefined;
        const middleAsDolly = current.middle ?? current.wheel ?? current.MIDDLE ?? undefined;
        const wheelAsDolly = current.wheel ?? current.middle ?? undefined;

        controls.mouseButtons = {
          ...current,
          left: rightAsTruck ?? current.left, // force left to act like TRUCK
          right: noneToken ?? current.right,  // disable right if possible
          middle: middleAsDolly ?? current.middle,
          wheel: wheelAsDolly ?? current.wheel,
        };

        const tcur = controls.touches || {};
        const twoAsDollyTruck = (tcur as any).two ?? (tcur as any).TWO;
        const oneAsTruck = (tcur as any).one ?? (tcur as any).ONE;
        const noneTouch = (tcur as any).none ?? (tcur as any).NONE ?? undefined;
        controls.touches = {
          ...tcur,
          one: oneAsTruck,  // prefer pan on single touch
          two: twoAsDollyTruck,
          three: noneTouch ?? (tcur as any).three,
        } as any;
      } catch {}

      // Remove rotation inertia
      if ('enableDamping' in controls) controls.enableDamping = true;
      if ('draggingDampingFactor' in controls) controls.draggingDampingFactor = 0.25;
      if (typeof controls.update === 'function') controls.update(0);
    } catch {}
  }

  static setControlsFor3D(world: any) {
    try {
      const cam: any = world?.camera;
      const controls: any = cam?.controls;
      if (!cam || !controls) return;

      // Allow perspective or keep current projection
      // Reset limits for free orbit
      if ('rotateSpeed' in controls) controls.rotateSpeed = 1.0;
      if ('azimuthRotateSpeed' in controls) controls.azimuthRotateSpeed = 1.0;
      if ('polarRotateSpeed' in controls) controls.polarRotateSpeed = 1.0;
      if ('minPolarAngle' in controls) controls.minPolarAngle = 0;
      if ('maxPolarAngle' in controls) controls.maxPolarAngle = Math.PI;
      if ('minAzimuthAngle' in controls) controls.minAzimuthAngle = -Infinity as any;
      if ('maxAzimuthAngle' in controls) controls.maxAzimuthAngle = Infinity as any;

      // Restore original mappings if we saved them
      try {
        if ((controls as any).__origMouseButtons) {
          controls.mouseButtons = { ...(controls as any).__origMouseButtons };
        }
        if ((controls as any).__origTouches) {
          controls.touches = { ...(controls as any).__origTouches };
        }
      } catch {}

      if (typeof controls.update === 'function') controls.update(0);
    } catch {}
  }
}

// Backward-compatible helpers bound to CameraUtils for convenience
export interface CameraUtils {
  setControlsFor2D: (opts?: TwoDControlsOptions) => void;
  setControlsFor3D: () => void;
}

CameraUtils.prototype.setControlsFor2D = function (this: CameraUtils, opts?: TwoDControlsOptions) {
  CameraControlsPresets.setControlsFor2D((this as any).world, opts);
};

CameraUtils.prototype.setControlsFor3D = function (this: CameraUtils) {
  CameraControlsPresets.setControlsFor3D((this as any).world);
};

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