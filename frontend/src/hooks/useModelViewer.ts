import { useRef, useState, useCallback } from 'react';
import * as THREE from "three";
import * as OBC from "@thatopen/components";
import * as OBF from "@thatopen/components-front";

export interface ModelViewerState {
  // 3D References
  componentsRef: React.MutableRefObject<OBC.Components | null>;
  worldRef: React.MutableRefObject<OBC.World | null>;
  fragmentsRef: React.MutableRefObject<OBC.FragmentsManager | null>;
  highlighterRef: React.MutableRefObject<OBF.Highlighter | null>;
  hiderRef: React.MutableRefObject<OBC.Hider | null>;
  markerRef: React.MutableRefObject<OBF.Marker | null>;
  
  // UI State
  levels: string[];
  selectedLevel: string | null;
  selectedDepartment: string | null;
  departments: {[key: string]: any[]};
  expandedLevel: string | null;
  activeParameter: 'temperatura' | 'humitat' | 'ppm';
  alerts: any[];
  buildingColor: string;
  selectedElement: any;
  localId: number | null;
  showOnlyAlerts: boolean;
  showHistoryPanel: boolean;
  selectedSensor: any;
  sensorHistory: any[];
  isMobile: boolean;
  
  // Setters
  setLevels: (levels: string[]) => void;
  setSelectedLevel: (level: string | null) => void;
  setSelectedDepartment: (department: string | null) => void;
  setDepartments: (departments: {[key: string]: any[]}) => void;
  setExpandedLevel: (level: string | null) => void;
  setActiveParameter: (param: 'temperatura' | 'humitat' | 'ppm') => void;
  setAlerts: (alerts: any[]) => void;
  setBuildingColor: (color: string) => void;
  setSelectedElement: (element: any) => void;
  setLocalId: (id: number | null) => void;
  setShowOnlyAlerts: (show: boolean) => void;
  setShowHistoryPanel: (show: boolean) => void;
  setSelectedSensor: (sensor: any) => void;
  setSensorHistory: (history: any[]) => void;
  setIsMobile: (mobile: boolean) => void;
}

export const useModelViewer = (code: string | undefined): ModelViewerState => {
  // 3D References
  const componentsRef = useRef<OBC.Components | null>(null);
  const worldRef = useRef<OBC.World | null>(null);
  const fragmentsRef = useRef<OBC.FragmentsManager | null>(null);
  const highlighterRef = useRef<OBF.Highlighter | null>(null);
  const hiderRef = useRef<OBC.Hider | null>(null);
  const markerRef = useRef<OBF.Marker | null>(null);
  
  // UI State
  const [levels, setLevels] = useState<string[]>([]);
  const [selectedLevel, setSelectedLevel] = useState<string | null>(null);
  const [selectedDepartment, setSelectedDepartment] = useState<string | null>(null);
  const [departments, setDepartments] = useState<{[key: string]: any[]}>({});
  const [expandedLevel, setExpandedLevel] = useState<string | null>(null);
  const [activeParameter, setActiveParameter] = useState<'temperatura' | 'humitat' | 'ppm'>('temperatura');
  const [alerts, setAlerts] = useState<any[]>([]);
  const [buildingColor, setBuildingColor] = useState<string>('#9aa0a6');
  const [selectedElement, setSelectedElement] = useState<any>(null);
  const [localId, setLocalId] = useState<number | null>(null);
  const [showOnlyAlerts, setShowOnlyAlerts] = useState<boolean>(true);
  const [showHistoryPanel, setShowHistoryPanel] = useState<boolean>(false);
  const [selectedSensor, setSelectedSensor] = useState<any>(null);
  const [sensorHistory, setSensorHistory] = useState<any[]>([]);
  const [isMobile, setIsMobile] = useState<boolean>(false);

  return {
    // 3D References
    componentsRef,
    worldRef,
    fragmentsRef,
    highlighterRef,
    hiderRef,
    markerRef,
    
    // UI State
    levels,
    selectedLevel,
    selectedDepartment,
    departments,
    expandedLevel,
    activeParameter,
    alerts,
    buildingColor,
    selectedElement,
    localId,
    showOnlyAlerts,
    showHistoryPanel,
    selectedSensor,
    sensorHistory,
    isMobile,
    
    // Setters
    setLevels,
    setSelectedLevel,
    setSelectedDepartment,
    setDepartments,
    setExpandedLevel,
    setActiveParameter,
    setAlerts,
    setBuildingColor,
    setSelectedElement,
    setLocalId,
    setShowOnlyAlerts,
    setShowHistoryPanel,
    setSelectedSensor,
    setSensorHistory,
    setIsMobile,
  };
};
