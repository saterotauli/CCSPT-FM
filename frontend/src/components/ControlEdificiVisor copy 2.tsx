import React, { useEffect, useRef, useCallback, useState } from 'react';
import * as THREE from 'three';
import * as OBC from '@thatopen/components';
import * as FRAGS from '@thatopen/fragments';
import { useRealTimeSensors } from '../hooks/useRealTimeSensors';
import { AlertItem } from './AlertsPanel';
import '../pages/Pages.css';

type ParamType = 'temperatura' | 'humitat' | 'ppm';

interface ControlEdificiVisorProps {
  buildingCode: string;
  paramType: ParamType;
  onAlertsUpdate: (alerts: AlertItem[]) => void;
  onLevelSelect?: (levelName: string) => void;
}

/**
 * Componente del visor 3D para edificios individuales
 * Reescrito desde cero siguiendo el ejemplo oficial de FragmentsModels
 */
const ControlEdificiVisor: React.FC<ControlEdificiVisorProps> = ({
  buildingCode,
  paramType,
  onAlertsUpdate,
  onLevelSelect,
}) => {
  const viewerRef = useRef<HTMLDivElement>(null);
  
  // Estados principales
  const [world, setWorld] = useState<any>(null);
  const [fragments, setFragments] = useState<FRAGS.FragmentsModels | null>(null);
  const [model, setModel] = useState<any>(null);
  const [selectedElement, setSelectedElement] = useState<any>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  
  // Datos de sensores
  const { data: sensorData } = useRealTimeSensors();

  /**
   * Material para resaltar elementos según documentación oficial
   */
  const highlightMaterial: any = {
    color: new THREE.Color("#bcf124"),
    opacity: 1,
    transparent: false,
  };

  /**
   * Obtiene el color de un edificio por su código
   */
  const getBuildingColor = useCallback(async (buildingCode: string): Promise<string> => {
    try {
      const res = await fetch('/api/ifcbuildings');
      if (res.ok) {
        const buildings = await res.json();
        const building = buildings.find((b: any) => (b.codi || b.nom || b.code) === buildingCode);
        return building?.color || '#9aa0a6';
      }
    } catch (error) {
      console.warn('[Visor] Error cargando colores de edificios:', error);
    }
    return '#9aa0a6';
  }, []);

  /**
   * Configuración inicial del visor siguiendo el ejemplo oficial
   */
  const initViewer = useCallback(async () => {
    if (!viewerRef.current || isInitialized) return;

    try {
      // Inicializando visor siguiendo ejemplo oficial
      
      // 1. Crear componentes
      const newComponents = new OBC.Components();
      
      // 2. Crear mundo
      const worlds = newComponents.get(OBC.Worlds);
      const newWorld = worlds.create<
        OBC.SimpleScene,
        OBC.SimpleCamera,
        OBC.SimpleRenderer
      >();

      // 3. Configurar escena
      newWorld.scene = new OBC.SimpleScene(newComponents);
      newWorld.scene.setup();
      newWorld.scene.three.background = new THREE.Color(0.95, 0.95, 0.95);

      // 4. Configurar renderer
      newWorld.renderer = new OBC.SimpleRenderer(newComponents, viewerRef.current);
      
      // 5. Configurar cámara
      newWorld.camera = new OBC.SimpleCamera(newComponents);
      newWorld.camera.controls.setLookAt(58, 22, -25, 13, 0, 4.2);

      // 6. Inicializar componentes
      newComponents.init();

      // 7. Configurar FragmentsModels siguiendo el ejemplo oficial
      const githubUrl = "https://thatopen.github.io/engine_fragment/resources/worker.mjs";
      const fetchedUrl = await fetch(githubUrl);
      const workerBlob = await fetchedUrl.blob();
      const workerFile = new File([workerBlob], "worker.mjs", {
        type: "text/javascript",
      });
      const workerUrl = URL.createObjectURL(workerFile);
      const newFragments = new FRAGS.FragmentsModels(workerUrl);

      // 8. Configurar eventos de cámara
      newWorld.camera.controls.addEventListener("rest", () => newFragments.update(true));

      // 9. Configurar eventos de modelos
      newFragments.models.list.onItemSet.add(({ value: model }) => {
        model.useCamera(newWorld.camera.three);
        newWorld.scene.three.add(model.object);
        newFragments.update(true);
        setModel(model); // Guardar referencia del modelo
      });

      // 10. Actualizar estados
      setWorld(newWorld);
      setFragments(newFragments);
      setIsInitialized(true);

      // Inicialización completada
    } catch (error) {
      console.error('[Visor] Error en inicialización:', error);
    }
  }, [isInitialized]);

  /**
   * Carga un modelo específico del edificio
   */
  const loadModel = useCallback(async () => {
    if (!fragments || !buildingCode) return;

    try {
      // Cargando modelo para edificio
      
      // Intentar cargar modelo específico del edificio
      const specificFileName = `CCSPT-${buildingCode}-M3D-Rooms.frag`;
      // Intentando cargar modelo específico
      
      let buffer: ArrayBuffer;
      try {
        const specificFile = await fetch(`/public/models/${specificFileName}`);
        if (specificFile.ok) {
          buffer = await specificFile.arrayBuffer();
          // Modelo específico cargado exitosamente
        } else {
          throw new Error(`Archivo no encontrado: ${specificFileName}`);
        }
      } catch (error) {
        console.warn('[Visor] Usando modelo de ejemplo:', error);
        // Fallback al modelo de ejemplo
        const basicFile = await fetch("https://thatopen.github.io/engine_fragment/resources/frags/school_arq.frag");
        buffer = await basicFile.arrayBuffer();
      }
      
      // Cargar el modelo siguiendo el ejemplo oficial
      await fragments.load(buffer, { modelId: buildingCode });
      // Modelo cargado exitosamente
      
    } catch (error) {
      console.error('[Visor] Error cargando modelo:', error);
    }
  }, [fragments, buildingCode]);

  /**
   * Configurar raycasting para selección de elementos siguiendo el ejemplo oficial
   */
  const setupRaycasting = useCallback(() => {
    if (!viewerRef.current || !model || !world) return;

    const container = viewerRef.current;
    const mouse = new THREE.Vector2();

    const handleClick = async (event: MouseEvent) => {
      console.log('[CLIC] Click detectado en coordenadas:', event.clientX, event.clientY);
      
      // Configurar mouse según ejemplo oficial
      mouse.x = event.clientX;
      mouse.y = event.clientY;

      try {
        console.log('[CLIC] Iniciando raycast...');
        // Realizar raycast siguiendo el ejemplo oficial
        const result = await model.raycast({
          camera: world.camera.three,
          mouse,
          dom: world.renderer!.three.domElement!,
        });
        console.log('[CLIC] Raycast completado');

        console.log('[CLIC] Raycast result:', result);

        if (result) {
          console.log('[CLIC] Elemento seleccionado - LocalId:', result.localId);
          
          // Limpiar resaltado anterior
          if (selectedElement) {
            await model.resetHighlight([selectedElement.localId]);
            console.log('[CLIC] Limpiado resaltado anterior');
          }
          
          setSelectedElement(result);
          
          // Resaltar elemento siguiendo el ejemplo oficial
          await model.highlight([result.localId], highlightMaterial);
          console.log('[CLIC] Elemento resaltado');
          
          // Obtener información del elemento
          const [data] = await model.getItemsData([result.localId], {
            attributesDefault: true,
          });
          console.log('[CLIC] Datos del elemento:', data);
          
        } else {
          console.log('[CLIC] No hay elemento bajo el cursor');
          // Limpiar resaltado si no hay elemento
          if (selectedElement) {
            await model.resetHighlight([selectedElement.localId]);
            setSelectedElement(null);
            console.log('[CLIC] Resaltado limpiado');
          }
        }
        
        // Actualizar fragmentos
        if (fragments) {
          fragments.update(true);
        }
        
      } catch (error) {
        console.error('[Visor] Error en raycast:', error);
      }
    };

    console.log('[CLIC] Event listener agregado al container');
    container.addEventListener("click", handleClick);
    
    return () => {
      console.log('[CLIC] Event listener removido del container');
      container.removeEventListener("click", handleClick);
    };
  }, [model, world, fragments, selectedElement, highlightMaterial]);

  /**
   * Generar alertas a partir de datos de sensores
   */
  const generateAlerts = useCallback(async () => {
    if (!sensorData || !buildingCode) return;

    try {
      // Obtener color del edificio
      const buildingColor = await getBuildingColor(buildingCode);
      
      // Filtrar sensores del edificio actual
      const buildingSensors = sensorData.filter(sensor => 
        sensor.spaceGuid && sensor.edifici === buildingCode
      );

      // Generar alertas basadas en el parámetro seleccionado
      const alerts: AlertItem[] = buildingSensors.map(sensor => {
        let value: number;
        let severity: 'mitjà' | 'alt' | 'ok' = 'ok';

        // Obtener valor y calcular severidad según el parámetro seleccionado
        switch (paramType) {
          case 'temperatura':
            value = sensor.temperature;
            if (value > 25) severity = 'alt';
            else if (value > 22) severity = 'mitjà';
            // Eliminado nivel 'baix'
            break;
          case 'humitat':
            value = sensor.humidity;
            if (value > 70) severity = 'alt';
            else if (value > 60) severity = 'mitjà';
            // Eliminado nivel 'baix'
            break;
          case 'ppm':
            value = sensor.ppm;
            if (value > 1000) severity = 'alt';
            else if (value > 800) severity = 'mitjà';
            // Eliminado nivel 'baix'
            break;
        }

        return {
          id: sensor.spaceGuid,
          buildingCode: buildingCode,
          buildingColor: buildingColor,
          planta: sensor.planta || 'P00',
          departament: sensor.departament || 'Desconegut',
          dispositiu: sensor.dispositiu || 'Sensor',
          value,
          severity,
        };
      });

      // Ordenar por severidad
      const order: Record<'alt' | 'mitjà' | 'baix' | 'ok', number> = { alt: 0, mitjà: 1, baix: 2, ok: 3 };
      alerts.sort((a, b) => order[a.severity] - order[b.severity]);

      onAlertsUpdate(alerts);
    } catch (error) {
      console.error('[Visor] Error generando alertas:', error);
    }
  }, [sensorData, buildingCode, paramType, getBuildingColor, onAlertsUpdate]);

  // Efecto de inicialización
  useEffect(() => {
    initViewer();
  }, [initViewer]);

  // Efecto de carga de modelo
  useEffect(() => {
    if (isInitialized && fragments) {
      loadModel();
    }
  }, [isInitialized, fragments, loadModel]);

  // Efecto de configuración de raycasting
  useEffect(() => {
    if (model && world) {
      const cleanup = setupRaycasting();
      return cleanup;
    }
  }, [model, world, setupRaycasting]);

  // Efecto de generación de alertas
  useEffect(() => {
    generateAlerts();
  }, [generateAlerts]);

  // Exponer función de selección de nivel globalmente
  useEffect(() => {
    if (onLevelSelect) {
      (window as any).ccsptLevelSelect = (levelName: string) => {
        console.log('[Visor] Selección de nivel:', levelName);
        onLevelSelect(levelName);
        // TODO: Implementar lógica de aislamiento de niveles
      };
    }
    
    return () => {
      delete (window as any).ccsptLevelSelect;
    };
  }, [onLevelSelect]);

  return (
    <div 
      ref={viewerRef} 
      style={{ 
        width: '100%', 
        height: '100%',
        minHeight: '400px',
        background: '#f5f5f5',
        position: 'relative'
      }}
    >
      {!isInitialized && (
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          background: 'rgba(255, 255, 255, 0.9)',
          padding: '20px',
          borderRadius: '8px',
          textAlign: 'center'
        }}>
          <div>Inicialitzant visor 3D...</div>
          <div style={{ fontSize: '0.9em', color: '#666', marginTop: '8px' }}>
            Edifici: {buildingCode}
          </div>
        </div>
      )}
    </div>
  );
};

export default ControlEdificiVisor;