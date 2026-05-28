# 13 — Guía de Decisiones Tecnológicas

Este documento justifica las decisiones tecnológicas clave de la herramienta y proporciona criterios para tomar decisiones durante la implementación.

---

## Decisión 1 — Vanilla JS vs Framework (React, Vue, Svelte)

### Decisión: **Vanilla JS (ES6)**

**Por qué:**
- La vida útil de la herramienta es de 2–4 semanas. El overhead de configurar un proyecto React/Vue (npm, bundler, build) no se justifica.
- Un archivo HTML autocontenido puede abrirse directamente con `file://` sin ningún servidor. Un proyecto React requiere un proceso de build y un servidor para desarrollo.
- Vanilla JS es mantenible por cualquier desarrollador del equipo sin conocimiento de frameworks específicos.
- La complejidad de la UI (tabla + filtros + panel de perfil + tagging) es manejable sin reactividad declarativa.

**Cuándo reconsiderar:** si la herramienta evoluciona a más de 3 ciclos de uso, con múltiples usuarios y más funcionalidades, migrar a un framework liviano (Svelte o Vue 3 CDN) sería razonable.

---

## Decisión 2 — CSS Framework vs CSS vanilla

### Decisión: **CSS vanilla con variables CSS + clases utilitarias propias**

**Por qué:**
- Tailwind CSS vía CDN funciona, pero agrega 300KB de red (o requiere build para purgar).
- Bootstrap agrega estilos no usados y opina mucho sobre la UI.
- El proyecto storyboard ya tiene un design system en CSS vanilla que puede reutilizarse como base (variables de color, badges, tablas).

**Alternativa aceptable:** Tailwind CSS Play CDN (`https://cdn.tailwindcss.com`) en modo desarrollo si el equipo lo prefiere por velocidad. Solo si se opera con servidor HTTP, no `file://`.

---

## Decisión 3 — Almacenamiento: localStorage vs IndexedDB vs Servidor

### Decisión: **localStorage con exportación JSON**

**Comparación:**

| Opción | Pros | Contras | ¿Aplica? |
|---|---|---|---|
| `localStorage` | Simple, síncrono, funciona en file://, 5–10MB | No compartido entre usuarios, tamaño limitado | ✅ **Elegido** |
| `IndexedDB` | Hasta GBs, asíncrono, queries | API compleja, no necesario para este tamaño | No justificado |
| Backend + BD | Compartido entre usuarios, persistente | Requiere servidor, deploy, mantenimiento | Fuera del alcance |
| Exportar/Importar JSON | Resuelve compartir sin servidor | Proceso manual | ✅ Como complemento |

**Criterio de cambio:** si el tamaño del store supera los 3 MB en uso real, migrar la nota libre a `IndexedDB` y mantener solo los tags en `localStorage`.

---

## Decisión 4 — Estructura de archivos: monolito vs separado

### Decisión: **Archivos separados** (`index.html` + `style.css` + `app.js`)

**Por qué:**
- Un único archivo HTML es más fácil de distribuir por `file://`, pero se vuelve inmanejable rápidamente.
- Archivos separados permiten editar cada parte de forma independiente sin riesgo de romper el HTML o el CSS.
- Compatible con `file://` siempre que los archivos estén en la misma carpeta (paths relativos).

**Para distribución sin servidor:** empaquetar en un ZIP que preserve la estructura de carpetas. El usuario descomprime y abre `index.html`.

---

## Decisión 5 — Paginación vs Virtualización de lista

### Decisión: **Paginación de 100 filas** para el MVP

**Por qué:**
- Implementación de ~20 líneas de código. Virtualización requiere ~100+ líneas y es propensa a bugs de scroll.
- Para 1.200 advertisers, 12 páginas de 100 filas es usable.
- La navegación con ↑/↓ del teclado funciona dentro de la página actual.

**Cuándo reconsiderar:** si en pruebas de usuario el cambio de página interrumpe el flujo de trabajo, implementar un scroll infinito (appending de filas al final del DOM al hacer scroll) como término medio.

---

## Decisión 6 — Tabla HTML vs Lista de items

### Decisión: **`<table>` HTML nativa**

**Por qué:**
- Una tabla es semánticamente correcta para datos tabulares.
- Permite ordenamiento por columna con un handler de click en el `<th>`.
- Sticky headers (`position: sticky; top: 0`) funcionan bien en tablas para el scroll del panel.
- `<table>` tiene mejor rendimiento de layout que flexbox/grid para muchas filas homogéneas.

---

## Decisión 7 — Codificación de caracteres del CSV

### Decisión: **UTF-8 como estándar; soporte BOM**

Oracle puede exportar con BOM (Byte Order Mark) en UTF-8. El parser debe detectar y ignorar el BOM (`﻿`) al inicio del archivo.

```javascript
// Detectar y eliminar BOM al inicio del texto
if (text.charCodeAt(0) === 0xFEFF) {
  text = text.slice(1);
}
```

---

## Reglas de implementación no negociables

1. **No usar `eval()`** para ningún propósito.
2. **No usar `innerHTML` con datos del usuario** sin sanitizar (los nombres de advertisers pueden contener caracteres HTML). Usar `textContent` o escapar `<`, `>`, `&`, `"`.
3. **No usar librerías de terceros sin versionado local** — si se incluye alguna librería, debe estar copiada en el proyecto, no cargada desde CDN en producción.
4. **No async/await en el código principal** — usar callbacks o Promises `.then()/.catch()` para mantener compatibilidad máxima con ES6.
5. **Toda columna del CSV debe sanitizarse** antes de insertarse en el DOM.

---

## Dependencias permitidas (opcionales)

Si el implementador desea usar alguna librería pequeña y autocontenida, las siguientes son aceptables si se copian localmente:

| Librería | Uso | Tamaño min |
|---|---|---|
| `papaparse.min.js` | Parsing robusto de CSV con manejo de comillas y saltos de línea | ~44 KB |
| `dayjs.min.js` | Formateo de fechas para `tagged_at` | ~7 KB |

Cualquier otra dependencia debe ser aprobada explícitamente.
