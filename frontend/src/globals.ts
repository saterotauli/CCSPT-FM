import * as OBC from "@thatopen/components";

export const CONTENT_GRID_ID = "content-grid";

// Store centralizado para gestión de estado
export interface ModelState {
  fragments: OBC.FragmentsManager | null;
  floors: any[];
  levelsClassification: any;
  isLoading: boolean;
  hasModels: boolean;
  activeBuildingCode?: string;
  activeFloorCode?: string; // p.ej. 'P01'
  departmentsLegend?: { name: string; color: string; count: number }[];
  isDepartamentsActive?: boolean;
}

class ModelStore {
  private state: ModelState = {
    fragments: null,
    floors: [],
    levelsClassification: null,
    isLoading: false,
    hasModels: false,
    activeBuildingCode: undefined,
    activeFloorCode: undefined,
    departmentsLegend: [],
    isDepartamentsActive: false,
  };

  private listeners: ((state: ModelState) => void)[] = [];

  // Obtener el estado actual
  getState(): ModelState {
    return { ...this.state };
  }

  // Suscribirse a cambios de estado
  subscribe(listener: (state: ModelState) => void): () => void {
    this.listeners.push(listener);
    return () => {
      const index = this.listeners.indexOf(listener);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  // Notificar a todos los listeners
  private notify() {
    this.listeners.forEach(listener => listener(this.getState()));
  }

  // Actualizar el estado
  updateState(updates: Partial<ModelState>) {
    this.state = { ...this.state, ...updates };
    this.notify();
  }

  // Métodos específicos para modelos
  setModelsLoaded(fragments: OBC.FragmentsManager, floors: any[], levelsClassification: any) {
    this.updateState({
      fragments,
      floors,
      levelsClassification,
      isLoading: false,
      hasModels: true,
    });
  }

  setLoading(loading: boolean) {
    this.updateState({ isLoading: loading });
  }

  clearModels() {
    this.updateState({
      fragments: null,
      floors: [],
      levelsClassification: null,
      hasModels: false,
      activeBuildingCode: undefined,
      activeFloorCode: undefined,
      departmentsLegend: [],
      isDepartamentsActive: false,
    });
  }

  setActiveBuilding(code?: string) {
    this.updateState({ activeBuildingCode: code });
  }

  setActiveFloor(code?: string) {
    this.updateState({ activeFloorCode: code });
  }

  setDepartmentsLegend(legend: { name: string; color: string; count: number }[]) {
    this.updateState({ departmentsLegend: legend });
  }

  setDepartamentsActive(active: boolean) {
    this.updateState({ isDepartamentsActive: active });
  }
}

// Instancia global del store
export const modelStore = new ModelStore();

export const CONTENT_GRID_GAP = "1rem";
export const SMALL_COLUMN_WIDTH = "300px";
export const MEDIUM_COLUMN_WIDTH = "300px";

import * as BUI from "@thatopen/ui";
import React from 'react';
import HomeIcon from '@mui/icons-material/Home';
import MicrosoftIcon from '@mui/icons-material/Microsoft';
import DescriptionIcon from '@mui/icons-material/Description';
import HandymanIcon from '@mui/icons-material/Handyman';
import SettingsIcon from '@mui/icons-material/Settings';
import MonitorHeartIcon from '@mui/icons-material/MonitorHeart';
import QuestionAnswerIcon from '@mui/icons-material/QuestionAnswer';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import VisibilityIcon from '@mui/icons-material/Visibility';

// Icons for BIM UI components (using MDI strings)
export const appIcons = {
  ADD: "mdi:plus",
  SELECT: "solar:cursor-bold",
  CLIPPING: "fluent:cut-16-filled",
  SHOW: "mdi:eye",
  HIDE: "mdi:eye-off",
  LEFT: "tabler:chevron-compact-left",
  RIGHT: "tabler:chevron-compact-right",
  SETTINGS: "solar:settings-bold",
  COLORIZE: "famicons:color-fill",
  EXPAND: "eva:expand-fill",
  EXPORT: "ph:export-fill",
  TASK: "material-symbols:task",
  CAMERA: "solar:camera-bold",
  FOCUS: "ri:focus-mode",
  TRANSPARENT: "mdi:ghost",
  ISOLATE: "mdi:selection-ellipse",
  RULER: "solar:ruler-bold",
  MODEL: "mage:box-3d-fill",
  LAYOUT: "tabler:layout-filled",
  VIEWER: "mdi:eye",
  MODELS: "mdi:cube",
  ELEMENT_DATA: "mdi:information",
  VIEWPOINTS: "mdi:camera",
  SEARCH: "mdi:magnify",
};

// React icons for the sidebar
export const sidebarIcons = {
  CONTROL: React.createElement(MonitorHeartIcon, { fontSize: 'large' }),
  ESPAIS: React.createElement(MicrosoftIcon, { fontSize: 'large' }),
  FM: React.createElement(HandymanIcon, { fontSize: 'large' }),
  PROJECTES: React.createElement(HomeIcon, { fontSize: 'large' }),
  DOCS: React.createElement(DescriptionIcon, { fontSize: 'large' }),
  CONSULTES: React.createElement(QuestionAnswerIcon, { fontSize: 'large' }),
  CONFIG: React.createElement(SettingsIcon, { fontSize: 'large' }),
  LEFT: React.createElement(ChevronLeftIcon, { fontSize: 'medium' }),
  RIGHT: React.createElement(ChevronRightIcon, { fontSize: 'medium' }),
  VIEWER: React.createElement(VisibilityIcon, { fontSize: 'large' }),
};

export const sidebarItems = [
  { label: 'Control', icon: 'CONTROL', route: '/control' },
  { label: 'Espais', icon: 'ESPAIS', route: '/espais' },
  { label: 'FM', icon: 'FM', route: '/fm' },
  { label: 'Projectes', icon: 'PROJECTES', route: '/projectes' },
  { label: 'Docs', icon: 'DOCS', route: '/docs' },
  { label: 'Consultes', icon: 'CONSULTES', route: '/consultes' },
  { label: 'Config', icon: 'CONFIG', route: '/config' },
];

export const tooltips = {
  FOCUS: {
    TITLE: "Items Focusing",
    TEXT: "Move the camera to focus the selected items. If no items are selected, all models will be focused.",
  },
  HIDE: {
    TITLE: "Hide Selection",
    TEXT: "Hide the currently selected items.",
  },
  ISOLATE: {
    TITLE: "Isolate Selection",
    TEXT: "Hide everything expect the currently selected items.",
  },
  GHOST: {
    TITLE: "Ghost Mode",
    TEXT: "Set all models transparent, so selections and colors can be seen better.",
  },
  SHOW_ALL: {
    TITLE: "Show All Items",
    TEXT: "Reset the visibility of all hidden items, so they become visible again.",
  },
};

export const createBimGrid = () => {
  const grid = BUI.Component.create<BUI.Grid>(() => {
    return BUI.html`<bim-grid></bim-grid>`;
  });

  return grid;
};

// Helper function to get sidebar icon component
export const getSidebarIcon = (iconKey: keyof typeof sidebarIcons) => {
  return sidebarIcons[iconKey];
};

export interface Building {
  label: string;
  value: string;
  file: string;
}

export interface Discipline {
  code: string;
  name: string;
  icon: string;
}

export const BUILDINGS: Building[] = [
  { label: "MAP", value: "MAP", file: "CCSPT-MAP-M3D-AS.frag" },
  { label: "Taulí", value: "TAU", file: "CCSPT-TAU-M3D-AS.frag" },
  { label: "That OPEN", value: "TOC", file: "CCSPT-TOC-M3D-AS.frag" },
  { label: "Albada", value: "ALB", file: "CCSPT-ALB-M3D-AS.frag" },
  { label: "CQA", value: "CQA", file: "CCSPT-CQA-M3D-AS.frag" },
  { label: "Mínimo", value: "MIN", file: "CCSPT-MIN-M3D-AS.frag" },
  { label: "UDIAT", value: "UDI", file: "CCSPT-UDI-M3D-AS.frag" },
  { label: "VII Centenari", value: "VII", file: "CCSPT-VII-M3D-AS.frag" },
];

// Color mapping for buildings by code. Use hex colors (with or without '#').
// Example: 'ALB' in red, 'TAU' in green. Add or change as needed.
export const BUILDING_COLORS: Record<string, string> = {
  // MAP is the campus shell; usually we don't color it here.
  ALB: '#FF0000',
  TAU: '#00FF00',
  TOC: '#00FFFF',
  CQA: '#FFA500',
  MIN: '#FF00FF',
  UDI: '#3366FF',
  VII: '#996600',
};

export const DISCIPLINES: Discipline[] = [
  { code: "HVAC", name: "Climatització", icon: "HVAC.png" },
  { code: "FON", name: "Fontaneria", icon: "FON.png" },
  { code: "GAS", name: "Gasos Medicinals", icon: "GAS.png" },
  { code: "SEG", name: "Seguretat", icon: "SEG.png" },
  { code: "TUB", name: "Tub Pneumàtic", icon: "TUB.png" },
  { code: "SAN", name: "Sanejament", icon: "SAN.png" },
  { code: "ELE", name: "Electricitat", icon: "ELE.png" },
  { code: "TEL", name: "Telecomunicacions", icon: "TEL.png" }
]; 