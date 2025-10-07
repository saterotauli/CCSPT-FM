# 📦 ¿Qué hace la carpeta `ui/`?

## 🎯 Propósito

La carpeta `ui/` contiene **templates para `@thatopen/ui`**, que es la librería de UI específica de **That Open Company** para crear interfaces del visor BIM.

## 🔍 Diferencia clave

### `shared/components/layout/` ✅
**Tecnología**: React components normales
**Propósito**: Layout de la aplicación principal
**Ejemplos**:
- `Header.tsx` → Header de la app con menú
- `Sidebar.tsx` → Menú lateral de navegación
- `AppLayout.tsx` → Layout general de la app

**Uso**: Toda la aplicación React

---

### `ui/` (antes `ui-templates/`) ✅
**Tecnología**: Templates de `@thatopen/ui` (librería BIM específica)
**Propósito**: UI **dentro del visor BIM 3D**
**Ejemplos**:
- `sections/models.ts` → Panel de carga de modelos BIM
- `sections/actius.ts` → Panel de activos en el viewer
- `sections/espais.ts` → Panel de espacios en el viewer
- `toolbars/viewer-toolbar.ts` → Toolbar del viewer 3D
- `toolbars/floor-selector.ts` → Selector de plantas en el viewer
- `grids/content.ts` → Grid layout del viewer
- `buttons/viewport-settings.ts` → Botones de configuración del viewport

**Uso**: Solo dentro de `BIMViewer.tsx`

## 📚 Sintaxis diferente

### React normal (shared/components/):
```tsx
// Componente React normal
export const Header: React.FC = () => {
  return (
    <header className="main-header">
      <div>...</div>
    </header>
  );
};
```

### @thatopen/ui templates (ui/):
```typescript
// Template de @thatopen/ui (sintaxis especial)
export const modelsPanelTemplate: BUI.StatefullComponent<State> = (state) => {
  return BUI.html`
    <bim-panel label="Models">
      <bim-button @click=${handleClick}>
        Load Building
      </bim-button>
    </bim-panel>
  `;
};
```

## 🎯 ¿Dónde se usan?

### `shared/components/` → Usados en toda la app:
```typescript
// App.tsx
import { Sidebar } from '@shared/components/layout/Sidebar';
import AppHeader from '@shared/components/layout/AppHeader';
```

### `ui/` → Solo usados en BIMViewer:
```typescript
// BIMViewer.tsx
import * as TEMPLATES from "@ui/index";

// Crear grid del viewer con templates
const [contentGrid] = BUI.Component.create(
  TEMPLATES.contentGridTemplate,
  { components, ... }
);
```

## ✅ ¿Por qué está separado?

1. **Tecnología diferente**: 
   - `shared/` → React estándar
   - `ui/` → @thatopen/ui (librería BIM específica)

2. **Propósito diferente**:
   - `shared/` → Estructura de la app
   - `ui/` → UI del visor BIM 3D

3. **Reutilización**:
   - `shared/` → Usado en toda la app
   - `ui/` → Solo en el viewer BIM

## 🤔 ¿Está bien ubicado?

**Sí y No**. Hay dos opciones:

### Opción A - Mantener en raíz (actual)
```
src/
├── ui/              → Templates BIM (@thatopen/ui)
└── shared/          → Componentes React
```
**Pro**: Fácil acceso con alias `@ui`
**Contra**: No se ve claramente que es específico del viewer

### Opción B - Mover a modules/viewer/ (RECOMENDADA)
```
src/
├── modules/
│   └── viewer/
│       ├── components/  → BIMViewer, MiniSpaceViewer
│       ├── ui/          → Templates @thatopen/ui
│       ├── hooks/
│       └── utils/
└── shared/              → Componentes React generales
```
**Pro**: Todo del viewer BIM junto
**Contra**: Alias más largo (`@modules/viewer/ui`)

## 💡 Recomendación

**Mover `ui/` a `modules/viewer/ui/`** porque:

1. Es código **específico del viewer BIM**
2. Solo lo usa `BIMViewer.tsx`
3. Agrupa todo el código del viewer en un solo lugar
4. Más claro semánticamente

## 🎯 ¿Qué hacemos?

1. **Dejar como está** → Funciona, pero menos claro
2. **Mover a `modules/viewer/ui/`** → Más claro y organizado (RECOMENDADO)
3. **Renombrar a `viewer-ui/`** → Compromiso

¿Cuál prefieres?

