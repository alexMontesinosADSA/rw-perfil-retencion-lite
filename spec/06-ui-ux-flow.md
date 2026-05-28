# 06 — Flujo UI/UX

---

## Layout general

La aplicación tiene una sola pantalla dividida en tres zonas verticales:

```
┌─────────────────────────────────────────────────────┐
│  BARRA SUPERIOR (fija, 52px)                        │
│  Nombre app · Ciclo activo · Botones de acción      │
├─────────────────────────────────────────────────────┤
│  PANEL DE FILTROS (colapsable, ~56px)               │
│  Búsqueda · Nivel Riesgo · Acción · Segmento ·      │
│  Estado Tag · Limpiar · Contador de resultados      │
├─────────────────────────────────────────────────────┤
│  PANEL SUPERIOR — LISTA DE ADVERTISERS (~45% alto)  │
│  Tabla scrollable con las columnas de contexto      │
│  Fila seleccionada resaltada                        │
├──────────────────────────┬──────────────────────────┤
│  PANEL INFERIOR IZQUIERDO │ PANEL INFERIOR DERECHO  │
│  Perfil del advertiser   │ Módulo de tipificación   │
│  (~55% alto, 60% ancho)  │ (~55% alto, 40% ancho)  │
└──────────────────────────┴──────────────────────────┘
```

**Proporciones aproximadas (pantalla 1440×900):**
- Barra superior: 52px fija
- Panel de filtros: 56px (colapsable a 0)
- Lista: 40% de la altura restante
- Paneles inferiores: 60% de la altura restante

---

## Zona 1 — Barra Superior

### Elementos (de izquierda a derecha)
1. **Nombre de la app**: "Gestión Retención" + ciclo activo ("Ciclo 2025-04")
2. **Badge de estado**: "Sin datos" (rojo/naranja) | "1.200 advertisers cargados" (verde)
3. **Botón Cargar CSV**: ícono 📂 + texto "Cargar CSV"
4. **Botón Exportar JSON**: ícono 💾 + texto "Exportar tags" (deshabilitado si no hay tags)
5. **Botón Importar JSON**: ícono 📥 + texto "Importar tags"
6. **Botón Exportar CSV**: ícono 📊 + texto "Exportar lista"
7. **Resumen rápido de tipificación**: "87 / 1.200 tipificados" (badge gris)

---

## Zona 2 — Panel de Filtros

### Elementos
1. **Campo de búsqueda** (texto libre): placeholder "Buscar por ID o nombre..."
   - Debounce 250ms. Se aplica sobre la lista en tiempo real.
2. **Filtro Nivel de Riesgo** (multi-select pill buttons):
   - Botones: `ALTO` · `MEDIO` · `BAJO` · `INDETERMINADO`
   - Generados dinámicamente, coloreados por nivel.
   - Inactivo = borde gris / activo = relleno de color.
3. **Filtro Acción Asignada** (dropdown multi-select):
   - Opciones generadas desde el CSV. Máximo ~8 valores distintos.
4. **Filtro Segmento** (dropdown multi-select, colapsado por defecto):
   - Opciones: VP, CQ, SP, FL, TA, CS, CS_MEDIO, CS_BAJO, RB, IND
5. **Filtro Estado Tipificación** (selector simple):
   - "Todos" | "Solo tipificados" | "Sin tipificar"
6. **Contador**: "X de Y advertisers" — siempre visible junto a Limpiar filtros.
7. **Botón Limpiar filtros**: visible sólo cuando hay algún filtro activo.

---

## Zona 3 — Lista de Advertisers (Panel Superior)

### Columnas de la tabla

| Columna | Ancho aprox | Descripción |
|---|---|---|
| `advertiser_id` | 120px | ID del advertiser |
| `advertiser_name` | flex (crece) | Nombre, truncado con ellipsis |
| `Segmento` | 90px | Badge coloreado con `assigned_label_code` |
| `Riesgo` | 90px | Badge coloreado con `assigned_risk_level_code` |
| `Acción` | 150px | `assigned_action_code` como texto |
| `Score` | 70px | Numérico, centrado |
| `Tags` | 80px | Badge "✓ Tipificado" o ícono de etiqueta vacía |

### Comportamiento
- Ordenamiento por `score_total` descendente al cargar. Click en encabezado ordena por esa columna (toggle asc/desc).
- Scroll vertical infinito o paginación si > 200 filas visibles (ver RNF-07).
- Al hacer click en una fila: se resalta (fondo azul claro), y los paneles inferiores se actualizan.
- Teclas `↑` / `↓` navegan entre filas y actualizan los paneles.
- Si no hay CSV cargado: tabla vacía con mensaje "Carga un CSV para ver los advertisers".

---

## Zona 4A — Panel Inferior Izquierdo: Perfil del Advertiser

### Estado vacío (ningún advertiser seleccionado)
Mensaje centrado: "Selecciona un advertiser de la lista para ver su perfil."

### Estado con advertiser seleccionado

```
┌─────────────────────────────────────────────────────┐
│ [CQ] Empresa Ejemplo SA               [Score: 88]  │
│ ID: 12345  ·  Ciclo: 2025-04                        │
│ Riesgo: ALTO  ·  Acción: CAC                        │
├─────────────────────────────────────────────────────┤
│ SEÑALES ACTIVAS                                     │
│                                                     │
│ 💳 Rezago / Pago:    ✓ Activo                       │
│ 📞 Casos abiertos:   2 casos                        │
│ 💻 Sesiones (mes):   42 sesiones                    │
│ 🎯 Campaña digital:  ✗ Inactiva                     │
├─────────────────────────────────────────────────────┤
│ SEÑAL PRINCIPAL                                     │
│ "Queja activa sin resolver — escalada"              │
├─────────────────────────────────────────────────────┤
│ DATOS COMERCIALES                                   │
│ Último contrato: 2024-11-01                         │
│ Monto contractual: $150,000                         │
└─────────────────────────────────────────────────────┘
```

---

## Zona 4B — Panel Inferior Derecho: Tipificación

### Estado vacío (ningún advertiser seleccionado)
Mensaje: "Selecciona un advertiser para tipificar."

### Estado con advertiser seleccionado

```
┌─────────────────────────────────────────────────────┐
│ TIPIFICACIÓN — Empresa Ejemplo SA                   │
│ Última modificación: 30/04/2025 10:15 por Ana García│
├─────────────────────────────────────────────────────┤
│ ESTADO DE GESTIÓN                                   │
│ [Pendiente]  [✓ Contactado]  [No contesta]          │
│ [Núm. inválido]                                     │
├─────────────────────────────────────────────────────┤
│ RESULTADO                                           │
│ [✓ Interesado]  [Sin interés]  [En negociación]     │
│ [Acuerdo alcanzado]  [Plan de pago activo]          │
├─────────────────────────────────────────────────────┤
│ CIERRE                                              │
│ [Escalado]  [Cerrado exitoso]  [Cerrado sin resoluc.]│
│ [Fuera de universo]                                 │
├─────────────────────────────────────────────────────┤
│ OPERADOR: [Ana García          ] (opcional)         │
│ NOTA:                                               │
│ ┌─────────────────────────────────────────────────┐ │
│ │ Llamar el lunes 9am. Pidió hablar con gerencia. │ │
│ └─────────────────────────────────────────────────┘ │
│                             250 / 500 caracteres    │
│                              [✓ Guardado]           │
└─────────────────────────────────────────────────────┘
```

### Comportamiento de los botones de tag
- Los tags activos se muestran con fondo coloreado (según categoría) y borde.
- Los tags inactivos se muestran como botón outline.
- Click en tag activo → lo desactiva (toggle off).
- Click en tag inactivo → lo activa (toggle on).
- Los cambios se guardan automáticamente en localStorage al ocurrir (sin botón guardar).
- El indicador "✓ Guardado" aparece 2 segundos después de cada cambio.

---

## Flujos de usuario principales

### Flujo 1 — Primera carga
1. Usuario abre `index.html` → ve estado "Sin datos".
2. Hace clic en "Cargar CSV" → se abre diálogo de selección de archivo.
3. Selecciona el archivo del ciclo → la app procesa y muestra la lista.
4. La barra muestra "1.200 advertisers cargados · Ciclo 2025-04".

### Flujo 2 — Filtrar y consultar
1. Usuario hace clic en "ALTO" en el filtro de nivel de riesgo → lista se reduce a 528 advertisers.
2. Selecciona también "CAC" en el filtro de acción → lista se reduce a 96.
3. Contador muestra "96 de 1.200 advertisers".
4. Hace clic en una fila → aparece el perfil del advertiser.
5. Navega con ↓ para ver el siguiente advertiser.

### Flujo 3 — Tipificar un advertiser
1. Con un advertiser seleccionado en el panel de perfil.
2. En el panel de tipificación, hace clic en "Contactado" → se activa (azul).
3. Hace clic en "Interesado" → se activa (verde).
4. Escribe nota: "Llamar lunes 9am".
5. El store se actualiza en localStorage automáticamente.
6. La fila en la lista muestra un badge "✓ Tipificado".

### Flujo 4 — Exportar y compartir
1. Usuario hace clic en "Exportar tags" → se descarga `tags_2025-04_20250430_1015.json`.
2. Comparte el archivo con su equipo.
3. Compañero carga el JSON con "Importar tags" → sus tags locales se fusionan.

### Flujo 5 — Reanudar sesión
1. Usuario cierra el navegador.
2. Reabre `index.html`, carga el CSV del ciclo.
3. Los tags persisten desde localStorage → los advertisers tipificados siguen marcados.
