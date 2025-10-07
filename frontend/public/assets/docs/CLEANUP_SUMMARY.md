# 🧹 Resumen de Limpieza de `src/`

## ✅ Completado - Alta Prioridad

### 1. Hooks duplicados eliminados
**Eliminados de `src/hooks/`:**
- ❌ `useModelViewer.ts` → ahora solo en `features/viewer/hooks/`
- ❌ `useRaycasting.ts` → ahora solo en `features/viewer/hooks/`
- ❌ `useIsolation.ts` → ahora solo en `features/viewer/hooks/`

**Mantenidos:**
- ✅ `useAlerts.ts`
- ✅ `useRealTimeSensors.ts`
- ✅ `index.ts`

### 2. Utils duplicados eliminados
**Eliminados de `src/utils/`:**
- ❌ `BuildingLoader.ts` → ahora solo en `features/viewer/utils/`
- ❌ `CameraUtils.ts` → ahora solo en `features/viewer/utils/`
- ❌ `Geolocation.ts` → ahora solo en `features/viewer/utils/`

**Mantenidos:**
- ✅ `ClassificationExamples.ts`
- ✅ `ClassificationUtils.ts`

### 3. ViewerRegistry reorganizado
**Movido:**
- 📁 `src/viewer/ViewerRegistry.ts` → `features/viewer/utils/ViewerRegistry.ts`
- 🗑️ Carpeta `src/viewer/` eliminada (ahora vacía)

**Imports actualizados:**
- ✅ `ControlModelViewer.tsx`
- ✅ `MiniSpaceViewer.tsx`

### 4. Archivos App legacy archivados
**11 archivos movidos a `archive/`:**
1. `AppFirebase.tsx`
2. `AppFirebaseComplete.tsx`
3. `AppFirebaseSimple.tsx`
4. `AppIntegrated.tsx`
5. `AppMinimal.tsx`
6. `AppSimple.tsx`
7. `AppTest.tsx`
8. `AppWithAuth.tsx`
9. `AppWithAuth.css`
10. `AppWithFirebaseAuth.tsx`
11. `TestApp.tsx`

**Test movido a carpeta dedicada:**
- `App.test.tsx` → `__tests__/App.test.tsx`

**Archivos App en producción:**
- ✅ `App.tsx` (usado en `main.tsx`)
- ✅ `main.tsx`
- ✅ `index.tsx`

## 📊 Impacto de la limpieza

### Antes:
```
frontend/src/
├── App.tsx (+ 11 variantes legacy)
├── hooks/ (6 archivos, 3 duplicados)
├── utils/ (5 archivos, 3 duplicados)
├── viewer/ (1 archivo mal ubicado)
└── ... (estructura fragmentada)
```

### Después:
```
frontend/src/
├── App.tsx ✨ (único App)
├── __tests__/ ✨ (nueva carpeta)
│   └── App.test.tsx
├── hooks/ (3 archivos únicos)
├── utils/ (2 archivos únicos)
├── features/
│   └── viewer/ (todo consolidado aquí)
└── ... (estructura limpia)

frontend/archive/ ✨ (nueva carpeta)
└── 11 archivos App legacy
```

## 🎯 Resultados

- ✅ **6 archivos duplicados eliminados** (3 hooks + 3 utils)
- ✅ **11 archivos legacy archivados**
- ✅ **3 carpetas obsoletas eliminadas** (`src/viewer/`, `src/bim/`, `src/components/`)
- ✅ **2 carpetas nuevas creadas** (`__tests__/`, `archive/`)
- ✅ **0 errores de linter**
- ✅ **Imports actualizados correctamente**

## 📝 Pendiente (Media-Baja Prioridad)

### Services con duplicados
Evaluar qué versión se usa en cada caso:
- `authService.ts` vs `authServiceNew.ts`
- `userService.ts` vs `userServiceSimple.ts`
- `firebaseAuthService.ts` (¿se usa?)
- `firebaseMessagingService.ts` (¿se usa?)
- `firebaseNotificationsService.ts` (¿se usa?)

### UI folders
Considerar consolidar:
- `ui/`
- `ui-components/`
- `ui-templates/`

## 🎉 Conclusión

**Estructura mucho más limpia y mantenible:**
- Sin duplicados
- Sin código legacy en producción
- Organización clara por features
- Tests en carpeta dedicada

**Siguiente paso recomendado:**
Evaluar services duplicados para eliminar más código innecesario.

