import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import * as THREE from "three";
import * as OBC from "@thatopen/components";
import * as OBF from "@thatopen/components-front";
import * as BUI from "@thatopen/ui";
import * as TEMPLATES from "./ui-templates";
import { CONTENT_GRID_ID, modelStore } from "./globals";
// import { viewportSettingsTemplate } from "./ui-templates/buttons/viewport-settings";
import { Sidebar } from './components/Sidebar';
import { floorSelectorTemplate } from './ui-templates/toolbars/floor-selector';
import Control from './pages/Control';
import Espais from './pages/Espais';
import Projectes from './pages/Projectes';
import Docs from './pages/Docs';
import Consultes from './pages/Consultes';
import Config from './pages/Config';
import './pages/Pages.css';
import './style.css';

const App: React.FC = () => {
  const location = useLocation();
  const componentsRef = useRef<OBC.Components | null>(null);
  const worldRef = useRef<OBC.World | null>(null);
  const viewportRef = useRef<BUI.Viewport | null>(null);
  const appGridRef = useRef<BUI.Grid<any, any> | null>(null);
  const contentGridRef = useRef<BUI.Grid<any, any> | null>(null);
  const [sidebarContainer, setSidebarContainer] = useState<HTMLElement | null>(null);
  const [modelsLoaded, setModelsLoaded] = useState(false);



  // Solo inicializar BIM cuando estemos en la ruta /fm
  const isFMPage = location.pathname === '/fm' || location.pathname === '/';

  useEffect(() => {
    // Resetear el estado cuando cambia la ruta
    setModelsLoaded(false);

    const initializeApp = async () => {
      // Get the root element
      const rootElement = document.getElementById('root');
      if (!rootElement) return;

      // Clear the root element only once
      if (!rootElement.querySelector('#app-container')) {
        rootElement.innerHTML = '';

        // Create main container
        const mainContainer = document.createElement('div');
        mainContainer.style.display = 'flex';
        mainContainer.style.width = '100%';
        mainContainer.style.height = '100vh';
        mainContainer.id = 'app-container';

        // Create sidebar container for React component
        const sidebarContainer = document.createElement('div');
        sidebarContainer.style.position = 'fixed';
        sidebarContainer.style.left = '0';
        sidebarContainer.style.top = '0';
        sidebarContainer.style.width = '5rem';
        sidebarContainer.style.height = '100vh';
        sidebarContainer.style.zIndex = '10';
        sidebarContainer.id = 'sidebar-container';
        setSidebarContainer(sidebarContainer);

        // Create content container for content only
        const contentContainer = document.createElement('div');
        contentContainer.style.marginLeft = '5rem';
        contentContainer.style.width = 'calc(100% - 5rem)';
        contentContainer.style.height = '100%';

        // Create content area that will change based on route
        const contentArea = document.createElement('div');
        contentArea.id = 'content-area';
        contentArea.style.width = '100%';
        contentArea.style.height = '100%';
        contentArea.style.overflow = 'hidden';

        // Insert content area
        contentContainer.appendChild(contentArea);

        // Append containers to main container
        mainContainer.appendChild(sidebarContainer);
        mainContainer.appendChild(contentContainer);

        // Append to root element
        rootElement.appendChild(mainContainer);
      }

      // Initialize BIM only for FM page
      if (isFMPage) {
        const contentArea = document.getElementById('content-area');
        if (!contentArea) return;

        // Clear content area for BIM
        contentArea.innerHTML = '';
        contentArea.style.background = '#1a1d23';

        BUI.Manager.init();

        // Components Setup
        const components = new OBC.Components();
        componentsRef.current = components;

        const worlds = components.get(OBC.Worlds);

        const world = worlds.create<
          OBC.SimpleScene,
          OBC.OrthoPerspectiveCamera,
          OBF.PostproductionRenderer
        >();

        worldRef.current = world;
        world.name = "Main";
        world.scene = new OBC.SimpleScene(components);
        world.scene.setup();
        world.scene.three.background = new THREE.Color(0x1a1d23);

        const viewport = BUI.Component.create<BUI.Viewport>(() => {
          return BUI.html`<bim-viewport></bim-viewport>`;
        });

        viewportRef.current = viewport;

        world.renderer = new OBF.PostproductionRenderer(components, viewport);
        world.camera = new OBC.OrthoPerspectiveCamera(components);
        world.camera.threePersp.near = 0.01;
        world.camera.threePersp.updateProjectionMatrix();
        world.camera.controls.restThreshold = 0.05;

        const worldGrid = components.get(OBC.Grids).create(world);
        worldGrid.material.uniforms.uColor.value = new THREE.Color(0x494b50);
        worldGrid.material.uniforms.uSize1.value = 2;
        worldGrid.material.uniforms.uSize2.value = 8;
        worldGrid.visible = false; // Ocultar rejilla por defecto

        const resizeWorld = () => {
          world.renderer?.resize();
          world.camera.updateAspect();
        };

        viewport.addEventListener("resize", resizeWorld);

        world.dynamicAnchor = false;

        components.init();

        components.get(OBC.Raycasters).get(world);

        const { postproduction } = world.renderer;
        postproduction.enabled = true;
        postproduction.style = OBF.PostproductionAspect.COLOR_SHADOWS;

        const { aoPass, edgesPass } = world.renderer.postproduction;

        edgesPass.color = new THREE.Color(0x494b50);

        const aoParameters = {
          radius: 0.25,
          distanceExponent: 1,
          thickness: 1,
          scale: 1,
          samples: 16,
          distanceFallOff: 1,
          screenSpaceRadius: true,
        };

        const pdParameters = {
          lumaPhi: 10,
          depthPhi: 2,
          normalPhi: 3,
          radius: 4,
          radiusExponent: 1,
          rings: 2,
          samples: 16,
        };

        aoPass.updateGtaoMaterial(aoParameters);
        aoPass.updatePdMaterial(pdParameters);

        const fragments = components.get(OBC.FragmentsManager);
        fragments.init("/node_modules/@thatopen/fragments/dist/Worker/worker.mjs");

        fragments.core.models.materials.list.onItemSet.add(({ value: material }) => {
          const isLod = "isLodMaterial" in material && material.isLodMaterial;
          if (isLod) {
            world.renderer!.postproduction.basePass.isolatedMaterials.push(material);
          }
        });

        world.camera.projection.onChanged.add(() => {
          for (const [_, model] of fragments.list) {
            model.useCamera(world.camera.three);
          }
        });

        world.camera.controls.addEventListener("rest", () => {
          fragments.core.update(true);
        });

        const ifcLoader = components.get(OBC.IfcLoader);
        await ifcLoader.setup({
          autoSetWasm: false,
          wasm: { absolute: true, path: "https://unpkg.com/web-ifc@0.0.70/" },
        });

        const highlighter = components.get(OBF.Highlighter);
        highlighter.setup({
          world,
          selectMaterialDefinition: {
            color: new THREE.Color("#bcf124"),
            renderedFaces: 1,
            opacity: 1,
            transparent: false,
          },
        });

        // Clipper Setup
        const clipper = components.get(OBC.Clipper);
        viewport.ondblclick = () => {
          if (clipper.enabled) clipper.create(world);
        };

        const handleKeyDown = (event: KeyboardEvent) => {
          if (event.code === "Delete" || event.code === "Backspace") {
            clipper.delete(world);
          }
        };

        window.addEventListener("keydown", handleKeyDown);

        // Length Measurement Setup
        const lengthMeasurer = components.get(OBF.LengthMeasurement);
        lengthMeasurer.world = world;
        lengthMeasurer.color = new THREE.Color("#6528d7");

        lengthMeasurer.list.onItemAdded.add((line) => {
          const center = new THREE.Vector3();
          line.getCenter(center);
          const radius = line.distance() / 3;
          const sphere = new THREE.Sphere(center, radius);
          world.camera.controls.fitToSphere(sphere, true);
        });

        viewport.addEventListener("dblclick", () => lengthMeasurer.create());

        const handleLengthKeyDown = (event: KeyboardEvent) => {
          if (event.code === "Delete" || event.code === "Backspace") {
            lengthMeasurer.delete();
          }
        };

        window.addEventListener("keydown", handleLengthKeyDown);

        // Area Measurement Setup
        const areaMeasurer = components.get(OBF.AreaMeasurement);
        areaMeasurer.world = world;
        areaMeasurer.color = new THREE.Color("#6528d7");

        areaMeasurer.list.onItemAdded.add((area) => {
          if (!area.boundingBox) return;
          const sphere = new THREE.Sphere();
          area.boundingBox.getBoundingSphere(sphere);
          world.camera.controls.fitToSphere(sphere, true);
        });

        viewport.addEventListener("dblclick", () => {
          areaMeasurer.create();
        });

        const handleAreaKeyDown = (event: KeyboardEvent) => {
          if (event.code === "Enter" || event.code === "NumpadEnter") {
            areaMeasurer.endCreation();
          }
        };

        window.addEventListener("keydown", handleAreaKeyDown);

        // Define what happens when a fragments model has been loaded
        fragments.list.onItemSet.add(async ({ value: model }) => {
          model.useCamera(world.camera.three);
          model.getClippingPlanesEvent = () => {
            return Array.from(world.renderer!.three.clippingPlanes) || [];
          };
          world.scene.three.add(model.object);
          await fragments.core.update(true);
        });

        // Finder setup
        const finder = components.get(OBC.ItemsFinder);
        finder.create("Walls", [{ categories: [/WALL/] }]);
        finder.create("Slabs", [{ categories: [/SLAB/] }]);
        finder.create("Rooms", [{ categories: [/SPACE/] }]);
        finder.create("Sostres", [{ categories: [/COVERING/] }]);

        // Viewport Layouts
        // const [viewportSettings] = BUI.Component.create(viewportSettingsTemplate, {
        //   components,
        //   world,
        // });

        // viewport.append(viewportSettings);

        const [viewportGrid] = BUI.Component.create(TEMPLATES.viewportGridTemplate, {
          components,
          world,
        });

        viewport.append(viewportGrid);

        // Content Grid Setup
        const viewportCardTemplate = () => BUI.html`
          <div class="dashboard-card" style="padding: 0px; position: relative;">
            ${viewport}
            <div id="floor-selector-container" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; pointer-events: none; z-index: 1000;">
              <div style="pointer-events: auto;">
                <!-- FloorSelector se renderizará aquí -->
              </div>
            </div>
          </div>
        `;

        const [contentGrid] = BUI.Component.create<
          BUI.Grid<TEMPLATES.ContentGridLayouts, TEMPLATES.ContentGridElements>,
          TEMPLATES.ContentGridState
        >(TEMPLATES.contentGridTemplate, {
          components,
          id: CONTENT_GRID_ID,
          viewportTemplate: viewportCardTemplate,
          onModelsLoaded: () => {
            console.log('App: Modelos cargados - actualizando estado...');
            setModelsLoaded(true);
          },
        });

        const setInitialLayout = () => {
          // Siempre establecer el layout por defecto sin modificar la URL
          contentGrid.layout = "Viewer";

          // Limpiar cualquier hash que pueda haberse establecido
          if (window.location.hash) {
            window.history.replaceState(null, '', window.location.pathname + window.location.search);
          }
        };

        setInitialLayout();

        // Limpiar hash si se establece posteriormente
        const hashCleaner = setInterval(() => {
          if (window.location.hash) {
            window.history.replaceState(null, '', window.location.pathname + window.location.search);
          }
        }, 100);

        // Limpiar el interval después de 5 segundos
        setTimeout(() => clearInterval(hashCleaner), 5000);

        // Comentado para evitar modificar la URL
        // contentGrid.addEventListener("layoutchange", () => {
        //   window.location.hash = contentGrid.layout as string;
        // });

        contentGridRef.current = contentGrid;

        // Layout change handler removido ya que no se usa

        // Create BIM grid element for content only
        const appGrid = document.createElement('bim-grid') as BUI.Grid<
          ["App"],
          [{ name: "contentGrid"; state: TEMPLATES.ContentGridState }]
        >;

        appGrid.id = 'app';
        appGrid.style.width = '100%';
        appGrid.style.height = '100%';

        appGridRef.current = appGrid;

        appGrid.elements = {
          contentGrid,
        };

        appGrid.layouts = {
          App: {
            template: `
              "contentGrid" 1fr
              /1fr
            `,
          },
        };

        appGrid.layout = "App";

        // Append BIM grid to content area
        contentArea.appendChild(appGrid);

        // El FloorSelector ahora se integra en el grid del viewport
      } else {
        // For non-FM pages, clear content area and set background
        const contentArea = document.getElementById('content-area');
        if (contentArea) {
          contentArea.innerHTML = '';
          contentArea.style.background = '#f8f9fa';
        }
      }
    };

    initializeApp();
  }, [location.pathname]);

  return (
    <>
      {/* Sidebar y Header siempre visibles */}
      {sidebarContainer && createPortal(
        <Sidebar />,
        sidebarContainer
      )}

      {/* FloorSelector se integra en el grid del viewport */}

      {/* Contenido dinámico solo para páginas no-FM */}
      {!isFMPage && (
        <div style={{
          position: 'absolute',
          top: '0',
          left: '5rem',
          right: '0',
          bottom: '0',
          overflow: 'auto',
          background: '#f8f9fa',
          zIndex: 1
        }}>
          <Routes>
            <Route path="/" element={<Navigate to="/fm" replace />} />
            <Route path="/control" element={<Control />} />
            <Route path="/espais" element={<Espais />} />
            <Route path="/projectes" element={<Projectes />} />
            <Route path="/docs" element={<Docs />} />
            <Route path="/consultes" element={<Consultes />} />
            <Route path="/config" element={<Config />} />
          </Routes>
        </div>
      )}
    </>
  );
};

export default App;
