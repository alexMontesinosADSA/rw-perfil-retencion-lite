# 01 — Requerimientos Funcionales

## Convenciones

- **RF-XX** = Requerimiento funcional.
- **Prioridad**: P1 = obligatorio MVP · P2 = importante · P3 = deseable.
- **Estado**: Abierto | En especificación | Aceptado.

---

## Módulo A — Carga de Datos

### RF-01 · Carga de CSV del modelo
**Prioridad:** P1

El usuario puede cargar un archivo CSV exportado desde `vw_ret_list_operativa`.

- Se activa con un botón "Cargar CSV" visible siempre en la barra superior.
- Se usa la API `FileReader` del navegador (compatible con `file://`).
- El archivo debe tener encabezados en la primera fila.
- Las columnas reconocidas se especifican en `04-csv-format.md`.
- Si falta la columna mínima obligatoria (`advertiser_id` o `assigned_label_code`), se muestra un mensaje de error descriptivo y no se carga.
- El ciclo se infiere del nombre del archivo (`YYYY-MM`) o del campo `cycle_id` si existe.
- Al cargar, se actualiza un indicador de ciclo activo en la barra superior.

### RF-02 · Persistencia del CSV en sesión
**Prioridad:** P2

- Los datos del CSV cargado se mantienen en memoria (`window` global) durante toda la sesión del navegador.
- No se almacena el contenido del CSV en `localStorage` (puede ser grande y sensible).
- Al recargar la página, el CSV debe cargarse nuevamente.

### RF-03 · Indicador de estado de carga
**Prioridad:** P1

La interfaz muestra claramente:
- Si no hay CSV cargado: mensaje de estado "Sin datos" con instrucción de carga.
- Si hay CSV cargado: ciclo activo y total de advertisers en el universo.

---

## Módulo B — Listado y Filtrado

### RF-04 · Listado de advertisers
**Prioridad:** P1

Muestra una tabla/lista en el panel superior con los siguientes campos visibles:
- `advertiser_id`
- `advertiser_name`
- `assigned_label_code` (badge con color por segmento)
- `assigned_risk_level_code` (badge de riesgo)
- `assigned_action_code`
- Indicador visual de si el advertiser ya tiene tags asignados (ícono o badge)

La lista muestra todos los advertisers del CSV cargado, ordenados por score descendente por defecto.

### RF-05 · Filtro por nivel de riesgo
**Prioridad:** P1

Filtro de selección múltiple con los valores de `assigned_risk_level_code` presentes en el CSV cargado. Valores esperados:
- `ALTO`
- `MEDIO`
- `BAJO`
- `INDETERMINADO` (o `—`)

Permite seleccionar uno o varios niveles simultáneamente. La lista se actualiza en tiempo real.

### RF-06 · Filtro por acción asignada
**Prioridad:** P1

Filtro de selección múltiple con los valores de `assigned_action_code` presentes en el CSV cargado. Valores típicos (no exhaustivos):
- `CAC` / `ATENCION_CAC`
- `SEND_CAMPAIGN` / `CAMPANA_PREVENTIVA`
- `NO_ACTION`
- `SEGUIMIENTO_COMERCIAL`
- `GESTION_OPERATIVA`
- `MONITOREO_PREVENTIVO`
- `REVISION_ESTRATEGICA`

Los valores se generan dinámicamente desde el CSV cargado, no son hardcodeados.

### RF-07 · Filtro por segmento
**Prioridad:** P2

Filtro adicional por `assigned_label_code` (VP, CQ, SP, FL, TA, CS, CS_MEDIO, CS_BAJO, RB, INDETERMINADO). Selección múltiple. Generado dinámicamente desde el CSV.

### RF-08 · Búsqueda por texto libre
**Prioridad:** P1

Campo de texto que filtra la lista por:
- `advertiser_id` (coincidencia parcial, case insensitive)
- `advertiser_name` (coincidencia parcial, case insensitive)

Se aplica junto con los filtros activos (lógica AND).

### RF-09 · Filtro por estado de tipificación
**Prioridad:** P2

Selector que permite mostrar:
- Todos los advertisers
- Solo tipificados (con al menos un tag)
- Solo sin tipificar

### RF-10 · Contador de resultados
**Prioridad:** P1

La barra de filtros muestra el número de advertisers que coinciden con los filtros activos, en formato: `X de Y advertisers`.

### RF-11 · Limpiar filtros
**Prioridad:** P1

Botón "Limpiar filtros" que resetea todos los filtros activos y la búsqueda de texto.

---

## Módulo C — Perfil de Advertiser

### RF-12 · Selección de advertiser
**Prioridad:** P1

Al hacer clic en una fila del listado, el panel inferior se actualiza con el perfil completo del advertiser seleccionado. La fila seleccionada se resalta visualmente.

### RF-13 · Panel de perfil — señales del modelo
**Prioridad:** P1

El panel inferior muestra para el advertiser seleccionado:
- `advertiser_id` y `advertiser_name`
- `assigned_label_code` (badge con color)
- `assigned_risk_level_code` (badge de riesgo)
- `score_total` (si existe)
- Señales activas:
  - `has_rezago`: Sí/No
  - `open_cases_count`: valor numérico
  - `sessions_month`: valor numérico
  - `has_digital_campaign`: Sí/No
- `trigger_reason_detail` (señal principal del modelo)
- `assigned_action_code` (acción sugerida)
- `last_contract_date` (si existe en el CSV)
- `total_contract_amount` (si existe en el CSV)

Campos no presentes en el CSV se muestran como "S/D" (sin dato).

### RF-14 · Navegación entre advertisers con teclado
**Prioridad:** P2

Las teclas `↑` / `↓` del teclado navegan entre las filas del listado filtrado, actualizando el panel inferior automáticamente.

---

## Módulo D — Tipificación (Tagging)

### RF-15 · Asignar tags a un advertiser
**Prioridad:** P1

En el panel de perfil, el usuario puede asignar uno o más tags desde una lista predefinida (ver `05-tagging-rules.md`). La UI puede ser checkboxes, botones toggle, o un selector multi.

### RF-16 · Nota libre por advertiser
**Prioridad:** P2

Campo de texto libre (máximo 500 caracteres) donde el usuario puede escribir una observación para el advertiser. Se guarda junto con los tags.

### RF-17 · Guardar tipificación
**Prioridad:** P1

Los cambios de tags y notas se guardan automáticamente en `localStorage` al modificar (sin botón de guardar explícito, o con autoguardado inmediato). Un indicador visual confirma el guardado.

### RF-18 · Indicador de tipificación en lista
**Prioridad:** P1

Los advertisers tipificados muestran un indicador visual en la fila del listado (ícono de etiqueta, badge de color, o cambio de fondo de fila).

### RF-19 · Ver resumen de tipificaciones
**Prioridad:** P2

Un panel o sección visible en la UI muestra el conteo de advertisers por tag y el total de tipificados vs. sin tipificar.

### RF-20 · Quitar tags
**Prioridad:** P1

El usuario puede quitar un tag asignado haciendo clic nuevamente sobre él (toggle).

---

## Módulo E — Exportación e Importación

### RF-21 · Exportar tags como JSON
**Prioridad:** P1

Botón "Exportar JSON" que descarga un archivo `tags_YYYY-MM_TIMESTAMP.json` con el contenido del almacenamiento de tags. Ver estructura en `08-storage-strategy.md`.

### RF-22 · Importar tags desde JSON
**Prioridad:** P1

Botón "Importar JSON" que carga un archivo de tags exportado previamente. La importación **fusiona** (merge) los tags importados con los existentes: si un advertiser ya tiene tags, se reemplazan con los del archivo importado para ese advertiser.

### RF-23 · Exportar lista tipificada como CSV
**Prioridad:** P2

Botón "Exportar CSV" que descarga la lista de advertisers actualmente visible (con filtros aplicados) incluyendo columnas de tags y notas, como archivo CSV plano.

### RF-24 · Limpiar todos los tags
**Prioridad:** P3

Opción (con confirmación) para borrar todos los tags almacenados del ciclo activo.
