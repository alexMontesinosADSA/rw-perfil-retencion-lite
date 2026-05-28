# 03 — Modelo de Datos

---

## 1. Registro de Advertiser (en memoria)

Objeto JavaScript derivado del CSV cargado. Cada fila del CSV produce un objeto de este tipo.

```javascript
{
  // Identidad
  advertiser_id:           "12345",            // string — llave primaria
  advertiser_name:         "Empresa Ejemplo",  // string

  // Clasificación del modelo
  assigned_label_code:     "CQ",              // string — VP|CQ|SP|FL|TA|CS|CS_MEDIO|CS_BAJO|RB|IND
  assigned_risk_level_code:"ALTO",            // string — ALTO|MEDIO|BAJO|INDETERMINADO
  assigned_action_code:    "CAC",             // string — código de acción del modelo

  // Score
  score_total:             88,                // number | null

  // Señales del modelo (pueden ser null si no están en el CSV)
  has_rezago:              true,              // boolean | null
  sessions_month:          42,               // number | null
  open_cases_count:        2,                // number | null
  has_digital_campaign:    false,            // boolean | null

  // Señal principal
  trigger_reason_detail:   "Queja activa sin resolver",  // string | null
  trigger_reason_code:     "CQ_OPEN_CASE",               // string | null

  // Datos comerciales (opcionales)
  last_contract_date:      "2024-11-01",     // string | null
  total_contract_amount:   150000,           // number | null

  // Metadatos del ciclo
  cycle_id:                "2025-04"         // string | null
}
```

**Notas:**
- Todo campo ausente del CSV se almacena como `null`.
- `assigned_label_code` se normaliza a mayúsculas al cargar.
- El `advertiser_id` es siempre string, no se asume numérico.

---

## 2. Registro de Tag (almacenado en localStorage / JSON)

Objeto que representa las anotaciones del operador para un advertiser.

```javascript
{
  advertiser_id:  "12345",                  // string — llave primaria, coincide con el CSV
  cycle_id:       "2025-04",               // string — ciclo al que pertenece este tag
  tags:           ["CONTACTADO", "INTERESADO"],  // array de strings — valores de TAG_TAXONOMY
  note:           "Llamar nuevamente el lunes", // string — nota libre (max 500 chars)
  tagged_at:      "2025-04-30T10:15:00.000Z",   // ISO 8601 — timestamp de última modificación
  tagged_by:      ""                            // string — nombre del operador (opcional, libre)
}
```

**Notas:**
- `tags` puede ser array vacío `[]` (advertiser con registro pero sin tags).
- `tagged_at` se actualiza cada vez que se modifica cualquier campo (tags o note).
- `tagged_by` es libre, no se valida ni se requiere.
- Un advertiser sin entrada en el store de tags no aparece en el JSON exportado (solo se persisten los que tienen al menos un tag o nota).

---

## 3. Store de Tags (objeto raíz en localStorage)

Estructura completa del objeto almacenado.

```javascript
{
  version:     "1.0",                        // string — versión del esquema
  cycle_id:    "2025-04",                    // string — ciclo activo al momento de la exportación
  exported_at: "2025-04-30T12:00:00.000Z",  // ISO 8601 — sólo en archivo exportado
  tags: {
    "12345": {                               // clave = advertiser_id
      advertiser_id:  "12345",
      cycle_id:       "2025-04",
      tags:           ["CONTACTADO", "INTERESADO"],
      note:           "Llamar lunes",
      tagged_at:      "2025-04-30T10:15:00.000Z",
      tagged_by:      "Ana García"
    },
    "67890": {
      advertiser_id:  "67890",
      cycle_id:       "2025-04",
      tags:           ["NO_CONTACTA"],
      note:           "",
      tagged_at:      "2025-04-30T11:30:00.000Z",
      tagged_by:      ""
    }
  }
}
```

**Clave de localStorage:**
```
retention_tags_2025-04
```
Formato: `retention_tags_${cycle_id}`

---

## 4. Estado de Filtros (en memoria, no persiste)

Objeto que describe el estado actual del panel de filtros.

```javascript
{
  riskLevels:      ["ALTO", "MEDIO"],     // array — vacío = sin filtro
  actionCodes:     ["CAC"],               // array — vacío = sin filtro
  labelCodes:      [],                    // array — vacío = sin filtro
  searchText:      "empresa",             // string — vacío = sin filtro
  taggedStatus:    "ALL"                  // "ALL" | "TAGGED" | "UNTAGGED"
}
```

---

## 5. Objeto de Resumen de Tipificaciones (calculado)

Se recalcula cada vez que cambia el store de tags. No se almacena.

```javascript
{
  total_advertisers:   1200,
  total_tagged:        87,
  total_untagged:      1113,
  by_tag: {
    "CONTACTADO":         34,
    "NO_CONTACTA":        18,
    "INTERESADO":         22,
    "ACUERDO_ALCANZADO":   8,
    // ...
  },
  by_risk_level: {
    "ALTO":          { total: 528, tagged: 55, untagged: 473 },
    "MEDIO":         { total: 192, tagged: 18, untagged: 174 },
    "BAJO":          { total: 252, tagged:  8, untagged: 244 },
    "INDETERMINADO": { total: 180, tagged:  6, untagged: 174 }
  }
}
```

---

## 6. Taxonomía de Tags (constante de configuración)

Ver detalle en `05-tagging-rules.md`. Estructura de referencia:

```javascript
const TAG_TAXONOMY = [
  { code: "SIN_GESTIONAR",        label: "Sin gestionar",          category: "estado",    color: "#94a3b8" },
  { code: "PENDIENTE_CONTACTO",   label: "Pendiente de contacto",  category: "estado",    color: "#f59e0b" },
  { code: "CONTACTADO",           label: "Contactado",             category: "contacto",  color: "#3b82f6" },
  { code: "NO_CONTACTA",          label: "No contesta",            category: "contacto",  color: "#6b7280" },
  { code: "NUMERO_INVALIDO",      label: "Número inválido",        category: "contacto",  color: "#6b7280" },
  { code: "INTERESADO",           label: "Interesado",             category: "resultado", color: "#16a34a" },
  { code: "SIN_INTERES",          label: "Sin interés",            category: "resultado", color: "#dc2626" },
  { code: "EN_NEGOCIACION",       label: "En negociación",         category: "resultado", color: "#7c3aed" },
  { code: "ACUERDO_ALCANZADO",    label: "Acuerdo alcanzado",      category: "resultado", color: "#15803d" },
  { code: "PLAN_DE_PAGO_ACTIVO",  label: "Plan de pago activo",    category: "resultado", color: "#0369a1" },
  { code: "ESCALADO",             label: "Escalado",               category: "gestion",   color: "#c2410c" },
  { code: "CERRADO_EXITOSO",      label: "Cerrado exitoso",        category: "gestion",   color: "#15803d" },
  { code: "CERRADO_SIN_RESOLUCION",label:"Cerrado sin resolución", category: "gestion",   color: "#6b7280" },
  { code: "FUERA_DE_UNIVERSO",    label: "Fuera de universo",      category: "gestion",   color: "#94a3b8" }
];
```
