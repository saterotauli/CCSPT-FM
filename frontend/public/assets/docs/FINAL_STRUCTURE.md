# 🎯 Estructura Final del Proyecto - CCSPT-FM

## 📁 Estructura Completa de `src/`

```
src/
├── features/                    ✅ SECCIONES DEL SIDEBAR (8)
│   ├── control/                → Control de edificios
│   ├── espais/                 → Gestión de espacios
│   ├── fm/                     → Facility Management
│   ├── projectes/              → Proyectos
│   ├── docs/                   → Documentación
│   ├── consultes/              → Consultas
│   ├── actius-mobils/          → Activos móbiles
│   └── config/                 → Configuración
│
├── modules/                     ✅ FEATURES TRANSVERSALES (3)
│   ├── viewer/                 → Infraestructura BIM
│   │   ├── components/         → BIMViewer, MiniSpaceViewer
│   │   ├── hooks/              → useModelViewer, useRaycasting, useIsolation
│   │   ├── interactions/       → Hover, Interactions (click blockers)
│   │   ├── layers/             → MobileAssetsLayer (geolocalización)
│   │   └── utils/              → BuildingLoader, CameraUtils, Geolocation, etc.
│   ├── messaging/              → Sistema de mensajería
│   │   ├── components/         → NotificationCenter
│   │   └── pages/              → Mensajes
│   └── notifications/          → Sistema de notificaciones
│       └── pages/              → Notificaciones
│
├── admin/                       ✅ ADMINISTRACIÓN (3)
│   ├── users/                  → Gestión de usuarios (ADMIN)
│   │   └── components/         → UserManagement
│   ├── tasks/                  → Gestión de tareas (ADMIN/COORDINADOR)
│   │   └── components/         → MyTasks, TaskManagement
│   └── dashboard/              → Panel de administración
│       └── components/         → Dashboard
│
├── auth/                        ✅ AUTENTICACIÓN (raíz)
│   └── pages/
│       └── LoginLanding.tsx    → Página de login
│
├── shared/                      ✅ CÓDIGO COMPARTIDO
│   ├── components/
│   │   ├── charts/             → SensorHistoryChart, SensorStats
│   │   ├── common/             → CodeBall, ErrorBoundary
│   │   ├── layout/             → AppHeader, Header, Sidebar, Layout
│   │   └── panels/             → AlertsPanel, BuildingCard, etc.
│   ├── hooks/                  → useData
│   ├── routes/                 → ProtectedRoute
│   └── styles/                 → highlightColors, Pages.css
│
├── ui/                          ✅ UI COMPONENTS (consolidado)
│   ├── buttons/                → viewport-settings
│   ├── components/             → QueriesList
│   ├── grids/                  → content, viewport
│   ├── groups/                 → grid-sidebar
│   ├── sections/               → actius, espais, models, etc.
│   ├── toolbars/               → viewer-toolbar, floor-selector
│   └── index.ts
│
├── services/                    ✅ SERVICIOS (9)
│   ├── authService.ts          → Autenticación principal
│   ├── userService.ts          → Gestión de usuarios
│   ├── firebaseAuthService.ts  → Auth con Firebase
│   ├── firebaseMessagingService.ts → Mensajería Firebase
│   ├── firebaseNotificationsService.ts → Notificaciones Firebase
│   ├── axiosConfig.ts          → Configuración HTTP
│   ├── messagingService.ts     → API de mensajería
│   ├── sensorService.ts        → API de sensores
│   └── taskService.ts          → API de tareas
│
├── hooks/                       ✅ HOOKS COMPARTIDOS (3)
│   ├── index.ts
│   ├── useAlerts.ts            → Gestión de alertas
│   └── useRealTimeSensors.ts   → Sensores en tiempo real
│
├── utils/                       ✅ UTILIDADES GENERALES (2)
│   ├── ClassificationExamples.ts → Ejemplos de clasificación
│   └── ClassificationUtils.ts   → Utilidades de clasificación
│
├── config/                      ✅ CONFIGURACIÓN
│   └── firebase.ts             → Config de Firebase
│
├── __tests__/                   ✅ TESTS
│   └── App.test.tsx
│
├── App.tsx                      ✅ App principal
├── main.tsx                     ✅ Entry point
├── index.tsx
├── globals.ts                   ✅ Estado global
├── style.css                    ✅ Estilos globales
└── vite-env.d.ts
```

---

## 🎯 Aliases configurados

```typescript
"@features/*"  → src/features/*    // Secciones del sidebar
"@modules/*"   → src/modules/*     // Código transversal
"@admin/*"     → src/admin/*       // Administración
"@auth/*"      → src/auth/*        // Autenticación
"@shared/*"    → src/shared/*      // Compartido
"@ui/*"        → src/ui/*          // UI components
"@styles/*"    → src/shared/styles/* // Estilos
```

---

## 📊 Mapeo Sidebar → Estructura

| Sección Sidebar | Carpeta | Tipo |
|----------------|---------|------|
| 🏥 Control | `features/control/` | Feature |
| 🏢 Espais | `features/espais/` | Feature |
| 🔧 FM | `features/fm/` | Feature |
| 📁 Projectes | `features/projectes/` | Feature |
| 📄 Docs | `features/docs/` | Feature |
| 💬 Consultes | `features/consultes/` | Feature |
| 📱 Actius mòbils | `features/actius-mobils/` | Feature |
| ⚙️ Config | `features/config/` | Feature |

**Mapeo perfecto 1:1** ✨

---

## 🎉 Resultado Final

### ✅ Estructura clara por propósito:
- `features/` → Solo secciones del sidebar
- `modules/` → Código técnico transversal
- `admin/` → Funcionalidades de administración
- `auth/` → Sistema de autenticación
- `shared/` → Componentes reutilizables
- `ui/` → Templates del viewer BIM
- `services/` → API services
- `hooks/` → React hooks compartidos
- `utils/` → Utilidades generales

### ✅ Sin confusión:
- 1 sola carpeta UI
- Sin duplicados
- Sin legacy
- Sin carpetas vacías

### ✅ Profesional y escalable:
- Organización enterprise
- Fácil de navegar
- Fácil de mantener
- Lista para crecer

---

**El proyecto está ahora perfectamente organizado** 🚀

