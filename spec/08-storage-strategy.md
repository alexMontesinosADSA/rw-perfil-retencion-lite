# 08 — Estrategia de Almacenamiento

---

## Principio general

Esta herramienta no usa base de datos ni backend. El almacenamiento de tags sigue una estrategia de dos capas:

| Capa | Qué almacena | Cuándo | Persistencia |
|---|---|---|---|
| **Memoria (`window`)** | CSV cargado (array de advertisers) | Durante la sesión | Se pierde al recargar |
| **`localStorage`** | Tags y notas del operador | Al modificar cualquier tag | Persiste entre sesiones |
| **JSON en disco** | Exportación del store de tags | Al hacer click en "Exportar" | Permanente (archivo del usuario) |

---

## localStorage

### Clave de almacenamiento

```
retention_tags_${cycle_id}
```

Ejemplo: `retention_tags_2025-04`

El uso de prefijo por ciclo evita mezclar datos de ciclos distintos si el usuario usa la misma máquina para ciclos futuros.

### Valor almacenado

El valor es un JSON string del objeto `TagsStore` (sin el campo `exported_at`):

```json
{
  "version": "1.0",
  "cycle_id": "2025-04",
  "tags": {
    "12345": {
      "advertiser_id": "12345",
      "cycle_id": "2025-04",
      "tags": ["CONTACTADO", "INTERESADO"],
      "note": "Llamar el lunes",
      "tagged_at": "2025-04-30T10:15:00.000Z",
      "tagged_by": "Ana García"
    }
  }
}
```

### Cuándo se escribe

- Inmediatamente al togglear cualquier tag (sin botón guardar).
- Inmediatamente al modificar la nota (con debounce de 600ms para evitar escrituras por tecla).
- Inmediatamente al cambiar el campo `tagged_by`.

### Cuándo se lee

- Al inicializar la app (`TagStore.init(cycleId)`), después de procesar el CSV.
- No se lee en cada operación; el store se mantiene en memoria como objeto JavaScript y se sincroniza a localStorage en cada escritura.

### Límite de tamaño

`localStorage` tiene un límite típico de 5–10 MB por origen. Con ~5.000 advertisers tipificados y 500 chars de nota cada uno, el store puede ocupar hasta ~3 MB serializado. Se debe monitorear.

**Mitigación:** el store solo persiste advertisers que tienen al menos un tag o nota (no los sin gestión). Esto reduce significativamente el tamaño.

**Regla de implementación:** si `TagStore.set()` recibe `tags: []` y `note: ""`, debe **eliminar** la entrada del store y de `localStorage`.

---

## Exportación como JSON

### Cuándo

El usuario hace clic en "Exportar tags". También se puede ofrecer autoexportación al cerrar la ventana (evento `beforeunload`) como salvaguarda.

### Nombre del archivo

```
tags_{cycle_id}_{YYYYMMDD}_{HHMM}.json
```

Ejemplo: `tags_2025-04_20250430_1015.json`

### Estructura del archivo

```json
{
  "version": "1.0",
  "cycle_id": "2025-04",
  "exported_at": "2025-04-30T10:15:00.000Z",
  "exported_by": "Ana García",
  "total_tagged": 87,
  "tags": {
    "12345": { ... },
    "67890": { ... }
  }
}
```

`exported_by` se toma del campo `tagged_by` del advertiser más recientemente modificado, o se deja vacío.

### Mecanismo de descarga (compatible con `file://`)

```javascript
function downloadJSON(content, filename) {
  var blob = new Blob([content], { type: 'application/json' });
  var url  = URL.createObjectURL(blob);
  var a    = document.createElement('a');
  a.href     = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
```

---

## Importación de JSON

### Proceso
1. Usuario selecciona archivo JSON con `<input type="file" accept=".json">`.
2. Se lee con `FileReader.readAsText()`.
3. Se parsea y valida la estructura (debe tener `version`, `cycle_id`, `tags`).
4. Se fusiona con el store local usando la estrategia `"replace"` (el archivo importado tiene precedencia).
5. Se persiste el store fusionado en `localStorage`.
6. Se re-renderiza la lista y el resumen.

### Validaciones de importación
- El `cycle_id` del archivo debe coincidir con el ciclo activo. Si no coincide, mostrar warning: "El archivo es del ciclo YYYY-MM. ¿Deseas importarlo de todas formas?"
- Los `tags[]` de cada entry deben ser valores válidos de la taxonomía. Valores desconocidos se ignoran con warning en consola.

---

## Exportación como CSV

### Estructura del CSV exportado

```
advertiser_id,advertiser_name,assigned_label_code,assigned_risk_level_code,
assigned_action_code,score_total,tags,note,tagged_at,tagged_by
```

La columna `tags` usa `|` como separador interno (e.g., `CONTACTADO|INTERESADO`).

El CSV exportado incluye solo los advertisers con la lista actualmente filtrada (lo que el usuario está viendo). Si no hay filtros activos, incluye el universo completo.

Los advertisers sin tags aparecen con columnas `tags`, `note`, `tagged_at`, `tagged_by` vacías.

---

## Consideraciones de privacidad

- El CSV de input (con datos del modelo) nunca se persiste en disco ni en `localStorage`.
- Los tags almacenados contienen únicamente `advertiser_id` (no nombres ni montos).
- Los datos sensibles del perfil del advertiser solo existen en memoria.
- Al exportar el JSON, el archivo contiene solo `advertiser_id` + tags + notas del operador.
