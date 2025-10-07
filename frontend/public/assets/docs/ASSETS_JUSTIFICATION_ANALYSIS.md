# 🤔 ¿Se justifica el nivel `assets/`?

## 📊 Análisis actual

### Estructura actual:
```
public/
├── assets/
│   └── images/          ← Solo 1 tipo de recurso
└── models/
```

**Pregunta válida**: ¿Por qué `assets/images/` en vez de `public/images/`?

---

## 🎯 Tipos de assets comunes en aplicaciones web/BIM

### 1. **images/** ✅ YA TIENES
- Logos, iconos, backgrounds
- Fotos de edificios
- Screenshots de referencia

### 2. **fonts/** (Tipografías personalizadas)
- Fuentes corporativas
- Iconos como fuentes (Font Awesome, Material Icons)
- **¿Necesitas?** Probablemente no (usas system fonts)

### 3. **documents/** (Documentación)
- PDFs de manuales
- Guías de usuario
- Documentación técnica
- Fichas técnicas de activos
- **¿Necesitas?** ⚠️ POSIBLEMENTE - para la sección "Docs"

### 4. **videos/** (Multimedia)
- Tutoriales
- Presentaciones
- Tours virtuales
- **¿Necesitas?** Probablemente no

### 5. **data/** (Datos estáticos)
- CSVs de catálogos
- JSONs de configuración
- Datasets de referencia
- Taxonomías (OmniClass)
- **¿Necesitas?** ⚠️ POSIBLEMENTE - tienes CSVs en raíz del proyecto

### 6. **audio/** (Sonidos)
- Notificaciones
- Alertas
- **¿Necesitas?** Probablemente no

### 7. **locales/** (Internacionalización)
- Traducciones CA/ES/EN
- **¿Necesitas?** Solo si planeas multiidioma

### 8. **templates/** (Plantillas)
- Plantillas de reports
- Templates de exports
- **¿Necesitas?** Posiblemente para consultas/exports

---

## 🔍 Análisis para CCSPT-FM

### Recursos que probablemente necesitarás:

#### ✅ **documents/** (ALTA PROBABILIDAD)
```
assets/documents/
├── manuals/           → Manuales de usuario
├── technical/         → Fichas técnicas de equipos
├── compliance/        → Normativas, certificados
└── reports/           → Templates de informes
```
**Razón**: Feature "Docs" sugiere documentación

#### ⚠️ **data/** (MEDIA PROBABILIDAD)
```
assets/data/
├── catalogs/          → Catálogos de productos
├── classifications/   → OmniClass, GuBIM
└── templates/         → Plantillas de datos
```
**Razón**: Tienes varios .xlsx y .csv en raíz del proyecto

#### ⚠️ **exports/** (MEDIA PROBABILIDAD)
```
assets/exports/
└── templates/         → Plantillas de Excel para exports
```
**Razón**: Feature "Consultes" probablemente exporta datos

---

## 💡 Recomendaciones por Escenario

### Escenario 1: Solo tienes images (ACTUAL)
**→ NO justifica `assets/`**

```
public/
├── images/
│   ├── logos/
│   └── icons/
└── models/
```

**Más simple y directo** ✅

---

### Escenario 2: Añadirás documents y/o data
**→ SÍ justifica `assets/`**

```
public/
├── assets/
│   ├── images/
│   ├── documents/
│   └── data/
└── models/              ← Fuera porque es BIM específico
```

**Organizado y escalable** ✅

---

### Escenario 3: TODO es asset (menos común)
**→ Consistencia total**

```
public/
└── assets/
    ├── images/
    ├── documents/
    ├── data/
    └── models/          ← También dentro
```

**Muy estructurado pero mezcla tamaños muy diferentes** ⚠️

---

## 🎯 Mi Recomendación

### Opción A - Simplificar AHORA (RECOMENDADA)

Dado que **solo tienes images**:

```
public/
├── images/
│   ├── logos/
│   └── icons/
└── models/
    ├── Rooms/
    └── *.frag
```

**Ventajas:**
- Más simple
- Menos anidamiento
- Rutas más cortas
- Se justifica cada carpeta

**Cuando añadas documents/data en el futuro, puedes reorganizar**

---

### Opción B - Preparar para el futuro

Si sabes que vas a añadir documentos pronto:

```
public/
├── assets/
│   ├── images/
│   ├── documents/       ← Preparado para futuro
│   └── data/            ← Preparado para futuro
└── models/
```

**Ventajas:**
- Preparado para crecer
- No necesitarás reorganizar después

---

## 📋 Mi recomendación final

### Si NO vas a añadir documents/data pronto:
**→ Simplifica a `public/images/` directamente**

### Si SÍ vas a añadir más tipos de assets:
**→ Mantén `public/assets/` para agruparlos**

### Los modelos BIM:
**→ SIEMPRE en `public/models/` (separados por tamaño/naturaleza)**

---

## 🤔 ¿Qué hacemos?

1. **Simplificar AHORA** → `images/` en raíz de public/
2. **Mantener `assets/`** → Preparado para documents/data
3. **Mover models a assets/** → Consistencia total (no recomendado)

**Yo te recomiendo Opción 1 (simplificar)** a menos que sepas que vas a añadir documents pronto 🎯

