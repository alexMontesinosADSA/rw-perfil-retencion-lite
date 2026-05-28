# 07 — Contrato de la API Interna (Módulos JavaScript)

Esta herramienta no expone una API HTTP. Este documento define el **contrato entre módulos JavaScript** de la aplicación: qué funciones deben existir, qué reciben y qué devuelven. Es el contrato de integración interna que garantiza que cualquier implementador puede construir cada módulo de forma independiente.

---

## Módulo: `DataLoader`

Responsable de leer el CSV y construir el array de advertisers en memoria.

---

### `DataLoader.parseCSV(text, fileName) → AdvertiserRecord[]`

Parsea el texto completo del CSV y retorna un array de objetos advertiser.

**Parámetros:**
- `text` (string): contenido del archivo CSV como texto plano.
- `fileName` (string): nombre del archivo, usado para inferir el `cycle_id`.

**Retorna:** array de `AdvertiserRecord` (ver `03-data-model.md`). Array vacío si no hay filas válidas.

**Efectos secundarios:**
- Llama a `UI.showToast(message)` si detecta duplicados o columnas faltantes opcionales.
- Lanza excepción si falta columna obligatoria (manejada por el caller).

---

### `DataLoader.inferCycleId(fileName) → string | null`

Extrae el ciclo del nombre del archivo.

**Parámetros:** `fileName` (string)

**Retorna:** string `"YYYY-MM"` si se encuentra el patrón; `null` en caso contrario.

---

## Módulo: `FilterEngine`

Aplica los filtros activos sobre el array de advertisers.

---

### `FilterEngine.apply(advertisers, filterState) → AdvertiserRecord[]`

Filtra el array según el estado de filtros.

**Parámetros:**
- `advertisers` (AdvertiserRecord[]): array completo cargado en memoria.
- `filterState` (FilterState): objeto de estado de filtros (ver `03-data-model.md`).

**Retorna:** array filtrado. Nunca modifica el array original.

**Lógica de filtros:**
- Todos los filtros activos se combinan con lógica **AND**.
- `riskLevels: []` = sin filtro por riesgo (pasan todos).
- `actionCodes: []` = sin filtro por acción.
- `labelCodes: []` = sin filtro por segmento.
- `searchText: ""` = sin filtro de texto.
- `taggedStatus: "ALL"` = sin filtro por estado de tipificación.
- El filtro `taggedStatus` requiere acceso al store de tags: `TagStore.getAll()`.

---

### `FilterEngine.getDistinctValues(advertisers, field) → string[]`

Obtiene los valores únicos de un campo del array, para poblar los dropdowns de filtros.

**Parámetros:**
- `advertisers` (AdvertiserRecord[]): array completo.
- `field` (string): nombre del campo (e.g., `"assigned_risk_level_code"`).

**Retorna:** array de strings únicos, ordenados alfabéticamente. Excluye `null` y vacíos.

---

## Módulo: `TagStore`

Gestiona la lectura y escritura del almacenamiento de tags.

---

### `TagStore.init(cycleId) → void`

Inicializa el store para el ciclo activo. Lee de `localStorage` si existe. Debe llamarse una sola vez al cargar el CSV.

**Parámetros:** `cycleId` (string): ciclo activo (e.g., `"2025-04"`).

---

### `TagStore.get(advertiserId) → TagRecord | null`

Obtiene el registro de tags de un advertiser.

**Retorna:** `TagRecord` si existe; `null` si el advertiser no tiene tags.

---

### `TagStore.getAll() → Record<string, TagRecord>`

Retorna el objeto completo del store (clave = `advertiser_id`).

---

### `TagStore.set(advertiserId, tags, note, taggedBy) → void`

Guarda o actualiza el registro de tags de un advertiser.

**Parámetros:**
- `advertiserId` (string)
- `tags` (string[]): array de códigos de la taxonomía.
- `note` (string): texto libre.
- `taggedBy` (string): nombre del operador.

**Efectos secundarios:**
- Actualiza `tagged_at` al timestamp actual (ISO 8601).
- Persiste en `localStorage` inmediatamente.
- Si `tags` es array vacío y `note` es string vacío, **elimina** el registro del store.

---

### `TagStore.exportJSON() → string`

Genera el JSON exportable del store completo.

**Retorna:** string JSON serializado con el objeto `TagsStore` (ver `03-data-model.md`).

---

### `TagStore.importJSON(jsonText, mergeStrategy) → { imported: number, skipped: number }`

Importa un archivo de tags exportado.

**Parámetros:**
- `jsonText` (string): contenido del archivo JSON.
- `mergeStrategy` (`"replace"` | `"keep_existing"`): cómo resolver conflictos.
  - `"replace"`: si el advertiser ya existe en el store local, se sobreescribe con el importado.
  - `"keep_existing"`: si ya existe localmente, se ignora el valor importado.

**Retorna:** objeto con contadores `{ imported, skipped }`.

**Validaciones:**
- El JSON debe tener la estructura de `TagsStore` (ver `03-data-model.md`).
- Si el JSON es inválido, lanza excepción.
- Muestra toast con resultado al completar.

---

### `TagStore.exportCSV(advertisers) → string`

Genera un CSV de los advertisers con sus tags.

**Parámetros:**
- `advertisers` (AdvertiserRecord[]): lista actualmente visible (con filtros aplicados).

**Retorna:** string en formato CSV con columnas:
```
advertiser_id, advertiser_name, assigned_label_code, assigned_risk_level_code,
assigned_action_code, score_total, tags, note, tagged_at, tagged_by
```

La columna `tags` contiene los códigos separados por `|` (e.g., `CONTACTADO|INTERESADO`).

---

### `TagStore.getSummary() → TagSummary`

Calcula y retorna el objeto de resumen (ver `03-data-model.md`).

**Parámetros implícitos:** accede internamente al store y al array de advertisers en memoria.

---

## Módulo: `UI`

Funciones de renderizado y feedback.

---

### `UI.renderList(advertisers, tagStore) → void`

Re-renderiza la tabla del panel superior con el array dado.

---

### `UI.renderProfile(advertiser) → void`

Renderiza el panel inferior izquierdo para el advertiser dado.

---

### `UI.renderTagPanel(advertiser, tagRecord) → void`

Renderiza el panel de tipificación con el estado actual de tags.

---

### `UI.renderSummary(summary) → void`

Actualiza el badge de resumen en la barra superior.

---

### `UI.showToast(message, type) → void`

Muestra un mensaje temporal (toast).

**Parámetros:**
- `message` (string): texto del mensaje.
- `type` (`"info"` | `"success"` | `"warning"` | `"error"`): estilo visual.

---

### `UI.downloadFile(content, filename, mimeType) → void`

Dispara la descarga de un archivo en el navegador usando un `Blob` + `<a>` temporal.

**Compatible con `file://` sin servidor.**
