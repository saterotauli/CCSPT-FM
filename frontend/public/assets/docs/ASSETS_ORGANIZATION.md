# 📦 Organización de Assets - CCSPT-FM

## ✅ Estructura Final de `public/`

```
public/
├── assets/
│   └── images/
│       ├── logos/                    ✨ 5 logos de Taulí
│       │   ├── logo_tauli.png
│       │   ├── logo_tauli_blanc.png
│       │   ├── logo_tauli_color.png
│       │   ├── logo_tauli_quadrat_blanc.png
│       │   └── logo_tauli_quadrat_color.png
│       │
│       ├── icons/                    ✨ 22 iconos organizados
│       │   ├── control_humitat.png
│       │   ├── control_particules.png
│       │   ├── control_pressio.png
│       │   ├── control_temperatura.png
│       │   ├── ELE.png              → Eléctrico
│       │   ├── FM.png               → Facility Management
│       │   ├── FON.png              → Fontanería
│       │   ├── GAS.png              → Gas
│       │   ├── HVAC.png             → Climatización
│       │   ├── ILU.png              → Iluminación
│       │   ├── PCI.png              → PCI
│       │   ├── SAN.png              → Sanitario
│       │   ├── SEG.png              → Seguridad
│       │   ├── TEL.png              → Telecomunicaciones
│       │   ├── TUB.png              → Tuberías
│       │   ├── menu_building.svg    → Icono menú edificios
│       │   ├── menu_fm.svg          → Icono menú FM
│       │   ├── query.png            → Icono consultas
│       │   ├── ticket.png           → Icono tickets
│       │   ├── view.png             → Icono vista
│       │   ├── wifi.png             → Icono wifi
│       │   └── tau-bot.png          → Bot de ayuda
│       │
│       └── landing-background.png   → Background de login
│
└── models/
    ├── Rooms/                        ✨ Modelos con habitaciones (6)
    │   ├── CCSPT-ALB-M3D-Rooms.frag
    │   ├── CCSPT-CQA-M3D-Rooms.frag
    │   ├── CCSPT-SAL-M3D-Rooms.frag
    │   ├── CCSPT-TAU-M3D-Rooms.frag
    │   ├── CCSPT-UDI-M3D-Rooms.frag
    │   └── CCSPT-VEU-M3D-Rooms.frag
    │
    ├── CCSPT-ALB-M3D-AS.frag         → Modelos AS (10)
    ├── CCSPT-CQA-M3D-AS.frag
    ├── CCSPT-MAP-M3D-AS.frag
    ├── CCSPT-MIN-M3D-AS.frag
    ├── CCSPT-RAC-M3D-AS.frag
    ├── CCSPT-TAU-M3D-AS.frag
    ├── CCSPT-TOC-M3D-AS.frag
    ├── CCSPT-UDI-M3D-AS.frag
    ├── CCSPT-UDI-M3D-ME.frag
    ├── CCSPT-VII-M3D-AS.frag
    └── worker.mjs
```

---

## 🎯 Cambios Realizados

### Assets reorganizados:
1. ✅ **Logos** (5 archivos) → `assets/images/logos/`
2. ✅ **Iconos** (22 archivos) → `assets/images/icons/`
3. ✅ **Background** (1 archivo) → `assets/images/`
4. ❌ **TMP/** eliminada (duplicados)

### Modelos reorganizados:
1. ✅ **Modelos Rooms** (6 archivos) → `models/Rooms/`
2. ✅ **Modelos AS** (10 archivos) → `models/` (raíz)

---

## 🔧 Rutas Actualizadas en el Código

### Logos:
```diff
// LoginLanding.tsx
- src="../public/assets/logo_tauli_color.png"
+ src="/assets/images/logos/logo_tauli_color.png"

// Sidebar.tsx
- src="/assets/logo_tauli_quadrat_blanc.png"
+ src="/assets/images/logos/logo_tauli_quadrat_blanc.png"
```

### Modelos Rooms:
```diff
// ControlModelViewer.tsx
- `/models/CCSPT-${code}-M3D-Rooms.frag`
+ `/models/Rooms/CCSPT-${code}-M3D-Rooms.frag`

// MiniSpaceViewer.tsx
- '/models/CCSPT-ALB-M3D-Rooms.frag'
+ '/models/Rooms/CCSPT-ALB-M3D-Rooms.frag'

// BuildingLoader.ts
- 'CCSPT-ALB-M3D-Rooms.frag'
+ 'Rooms/CCSPT-ALB-M3D-Rooms.frag'
```

---

## 📊 Beneficios

### ✅ Claridad
- Logos separados de iconos
- Modelos Rooms claramente diferenciados de AS
- Estructura fácil de navegar

### ✅ Escalabilidad
- Fácil añadir nuevos logos
- Fácil añadir nuevos tipos de iconos
- Fácil añadir nuevas variantes de modelos

### ✅ Mantenibilidad
- Sin duplicados (TMP/ eliminada)
- Organización por tipo
- Rutas consistentes

---

## 📁 Tipos de Assets

### Logos (5):
- Variantes de color (blanc, color)
- Formatos (cuadrado, horizontal)

### Iconos (22):
- **Control** (4): humitat, particules, pressio, temperatura
- **Sistemas** (10): ELE, FON, GAS, HVAC, ILU, PCI, SAN, SEG, TEL, TUB
- **App** (6): FM, query, ticket, view, wifi, tau-bot
- **Menú** (2): menu_building.svg, menu_fm.svg

### Modelos BIM:
- **Rooms** (6): Modelos con habitaciones detalladas
- **AS** (10): Modelos arquitectónicos simplificados
- **ME** (1): Modelo MEP (UDI)

---

## 🎉 Resultado

**Assets perfectamente organizados:**
- ✅ Imágenes por tipo (logos, iconos)
- ✅ Modelos por variante (Rooms, AS)
- ✅ Rutas actualizadas en código
- ✅ Sin duplicados
- ✅ Estructura clara y escalable

**¡Listo para producción!** 🚀

