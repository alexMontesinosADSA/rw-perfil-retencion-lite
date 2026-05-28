# PROMPT-PLAN: Consulta Perfil Retención — Web App

> **Propósito de este documento**: Servir como guía completa y accionable para implementar la mini webapp de gestión del ciclo de retención. Consolida las especificaciones detalladas en `/spec/` con las decisiones finales acordadas.

---

## 1. Visión General del Proyecto

### Qué es
Mini webapp **temporal** (2-4 semanas de uso) para gestionar el primer ciclo operativo del Motor de Retención Proactiva. Permite:
1. **Consultar y filtrar** el universo de advertisers clasificados por riesgo y acción
2. **Tipificar (tagging)** advertisers contactados con almacenamiento local

### Contexto operativo
- **Usuarios**: 4 operadores simultáneos (analistas y ejecutivos de retención)
- **Volumen de datos**: Hasta **80,000 advertisers** por ciclo
- **Fuente de datos**: CSV exportado de la vista `vw_ret_list_operativa`
- **Sin backend**: Todo el procesamiento ocurre en el navegador

### Criterios de éxito
1. Cargar CSV de 80,000 filas en menos de 3 segundos
2. Filtrar y mostrar resultados en menos de 200ms
3. Tipificar 50+ advertisers por sesión sin pérdida de datos
4. Exportar/importar JSON de tags sin pérdida

---

## 2. Stack Tecnológico (Decisiones Finales)

| Aspecto | Decisión | Justificación |
|---------|----------|---------------|
| **Lenguaje** | Vanilla JS (ES6) | Sin overhead de frameworks, mantenible por cualquier dev |
| **CSS** | CSS vanilla + variables CSS | Sin dependencias, reutiliza design system existente |
| **Estructura** | `index.html` + `style.css` + `app.js` + `/lib/` | Archivos separados, edición independiente |
| **Parsing CSV** | PapaParse (obligatorio) | Worker thread para 80K filas sin bloquear UI |
| **Persistencia** | localStorage + export JSON | Simple, funciona offline, compartible |
| **Deploy** | Azure Static Web Apps (Free) | HTTPS gratis, auth Azure AD integrada |

### Dependencias (copiar localmente en `/lib/`)
```
lib/
├── papaparse.min.js    (~44 KB) — Parsing CSV robusto
└── dayjs.min.js        (~7 KB)  — Formateo de fechas (opcional)
```

---

## 3. Arquitectura de la Aplicación

### 3.1 Estructura de Archivos
```
ConsultaPerfilRetencion/
├── index.html              — Estructura HTML y layout
├── style.css               — Estilos, variables CSS, badges
├── app.js                  — Lógica principal, módulos
├── config.js               — Configuración centralizada
├── lib/
│   ├── papaparse.min.js
│   └── dayjs.min.js
├── data/
│   └── tags-taxonomy.json  — Taxonomía de tags predefinida
└── spec/                   — Documentación (no se despliega)
```

### 3.2 Módulos JavaScript (en `app.js`)

```javascript
// ═══════════════════════════════════════════════════════════
// MÓDULO: CONFIG
// ═══════════════════════════════════════════════════════════
var CONFIG = {
  PAGE_SIZE: 100,
  DEBOUNCE_SEARCH_MS: 250,
  DEBOUNCE_NOTE_MS: 600,
  LOCALSTORAGE_PREFIX: 'retention_tags_',
  MAX_NOTE_LENGTH: 500,
  REQUIRE_FILTER_TO_SHOW_LIST: true  // CRÍTICO para 80K filas
};

// ═══════════════════════════════════════════════════════════
// MÓDULO: DataLoader
// ═══════════════════════════════════════════════════════════
// - parseCSV(file) → Promise<AdvertiserRecord[]>
// - inferCycleId(fileName) → string | null
// - buildIndexes(advertisers) → { byRisk, byAction, byLabel }

// ═══════════════════════════════════════════════════════════
// MÓDULO: FilterEngine  
// ═══════════════════════════════════════════════════════════
// - apply(advertisers, filterState, indexes) → AdvertiserRecord[]
// - getDistinctValues(advertisers, field) → string[]
// - hasActiveFilters(filterState) → boolean

// ═══════════════════════════════════════════════════════════
// MÓDULO: TagStore
// ═══════════════════════════════════════════════════════════
// - init(cycleId) → void
// - get(advertiserId) → TagRecord | null
// - set(advertiserId, tags, note, taggedBy) → void
// - exportJSON() → string
// - importJSON(jsonText, mergeStrategy) → { imported, skipped }
// - exportCSV(advertisers) → string

// ═══════════════════════════════════════════════════════════
// MÓDULO: UI
// ═══════════════════════════════════════════════════════════
// - renderTable(advertisers, page) → void
// - renderProfile(advertiser) → void
// - renderTaggingPanel(advertiser, tagRecord) → void
// - showToast(message, type) → void
// - updateCounters(filtered, total, tagged) → void
```

---

## 4. Modelo de Datos

### 4.1 Registro de Advertiser (en memoria)
```javascript
{
  advertiser_id:            "12345",           // string — PK
  advertiser_name:          "Empresa ABC",     // string
  assigned_label_code:      "CQ",              // VP|CQ|SP|FL|TA|CS|RB|IND
  assigned_risk_level_code: "ALTO",            // ALTO|MEDIO|BAJO|INDETERMINADO
  assigned_action_code:     "CAC",             // código de acción
  score_total:              88,                // number | null
  has_rezago:               true,              // boolean | null
  sessions_month:           42,                // number | null
  open_cases_count:         2,                 // number | null
  has_digital_campaign:     false,             // boolean | null
  trigger_reason_detail:    "Queja activa",    // string | null
  trigger_reason_code:      "CQ_OPEN_CASE",    // string | null
  last_contract_date:       "2024-11-01",      // string | null
  total_contract_amount:    150000,            // number | null
  cycle_id:                 "2025-04"          // string | null
}
```

### 4.2 Registro de Tag (localStorage)
```javascript
{
  advertiser_id:  "12345",
  cycle_id:       "2025-04",
  tags:           ["CONTACTADO", "INTERESADO"],
  note:           "Llamar el lunes",           // max 500 chars
  tagged_at:      "2025-04-30T10:15:00.000Z",  // ISO 8601
  tagged_by:      "Ana García"                 // nombre del operador
}
```

### 4.3 Índices Pre-calculados (para 80K filas)
```javascript
// Crear al cargar el CSV (una sola vez)
var INDEXES = {
  byRisk: {
    "ALTO": [adv1, adv2, ...],
    "MEDIO": [...],
    "BAJO": [...],
    "INDETERMINADO": [...]
  },
  byAction: {
    "CAC": [...],
    "NO_ACTION": [...],
    // ...
  },
  byLabel: {
    "CQ": [...],
    "VP": [...],
    // ...
  }
};
```

---

## 5. Taxonomía de Tags

### Categoría A — Estado de Gestión
| Código | Etiqueta UI | Color |
|--------|-------------|-------|
| `PENDIENTE_CONTACTO` | Pendiente de contacto | Gris |
| `CONTACTADO` | Contactado | Azul |
| `NO_CONTACTA` | No contesta | Naranja |
| `NUMERO_INVALIDO` | Número inválido | Rojo claro |

### Categoría B — Resultado del Contacto
| Código | Etiqueta UI | Color |
|--------|-------------|-------|
| `INTERESADO` | Interesado en resolver | Verde |
| `SIN_INTERES` | Sin interés | Rojo |
| `EN_NEGOCIACION` | En negociación | Amarillo |
| `ACUERDO_ALCANZADO` | Acuerdo alcanzado | Verde oscuro |
| `PLAN_DE_PAGO_ACTIVO` | Plan de pago activo | Verde |

### Categoría C — Cierre de Gestión
| Código | Etiqueta UI | Color |
|--------|-------------|-------|
| `ESCALADO` | Escalado | Morado |
| `CERRADO_EXITOSO` | Cerrado exitoso | Verde oscuro |
| `CERRADO_SIN_RESOLUCION` | Cerrado sin resolución | Gris oscuro |
| `FUERA_DE_UNIVERSO` | Fuera de universo | Gris |

**Regla**: Un advertiser puede tener múltiples tags simultáneos.

---

## 6. Layout de la UI

```
┌─────────────────────────────────────────────────────────────┐
│  BARRA SUPERIOR (52px fija)                                 │
│  [Logo] Gestión Retención · Ciclo 2025-04                   │
│  [📂 Cargar CSV] [💾 Exportar Tags] [📥 Importar] [📊 CSV]  │
│  87 / 80,000 tipificados                                    │
├─────────────────────────────────────────────────────────────┤
│  PANEL DE FILTROS (56px)                                    │
│  🔍 [Buscar ID o nombre...]                                 │
│  Riesgo: [ALTO] [MEDIO] [BAJO] [IND]                        │
│  Acción: [▼ Seleccionar...]  Segmento: [▼ Seleccionar...]   │
│  Estado: (•) Todos  ( ) Tipificados  ( ) Sin tipificar      │
│  [Limpiar filtros]                     X de Y advertisers   │
├─────────────────────────────────────────────────────────────┤
│  ⚠️ AVISO: Aplica al menos un filtro para ver resultados   │  ← NUEVO
│  (80,000 advertisers en el universo)                        │
├─────────────────────────────────────────────────────────────┤
│  LISTA DE ADVERTISERS (40% altura)                          │
│  ┌─────┬─────────────┬────────┬───────┬────────┬─────┬────┐ │
│  │ ID  │ Nombre      │Segmento│Riesgo │ Acción │Score│Tags│ │
│  ├─────┼─────────────┼────────┼───────┼────────┼─────┼────┤ │
│  │12345│ Empresa ABC │  CQ    │ ALTO  │  CAC   │ 88  │ ✓  │ │
│  │67890│ Comercio XYZ│  VP    │ MEDIO │NO_ACTN │ 45  │    │ │
│  └─────┴─────────────┴────────┴───────┴────────┴─────┴────┘ │
│  < Anterior  Página 1 de 50  Siguiente >                    │
├──────────────────────────────┬──────────────────────────────┤
│  PERFIL (60% ancho)          │  TIPIFICACIÓN (40% ancho)    │
│                              │                              │
│  [CQ] Empresa ABC   Score:88 │  ESTADO DE GESTIÓN           │
│  ID: 12345 · Ciclo: 2025-04  │  [Pendiente] [✓Contactado]   │
│  Riesgo: ALTO · Acción: CAC  │  [No contesta] [Núm.inválido]│
│  ───────────────────────     │                              │
│  SEÑALES ACTIVAS             │  RESULTADO                   │
│  💳 Rezago: ✓ Activo         │  [✓Interesado] [Sin interés] │
│  📞 Casos: 2                 │  [En negociación] [Acuerdo]  │
│  💻 Sesiones: 42             │  [Plan de pago]              │
│  🎯 Campaña digital: ✗       │                              │
│  ───────────────────────     │  CIERRE                      │
│  SEÑAL PRINCIPAL             │  [Escalado] [Cerrado OK]     │
│  "Queja activa sin resolver" │  [Cerrado sin res.] [Fuera]  │
│  ───────────────────────     │  ─────────────────────────── │
│  DATOS COMERCIALES           │  Operador: [Ana García    ]  │
│  Último contrato: 2024-11-01 │  Nota:                       │
│  Monto: $150,000             │  ┌─────────────────────────┐ │
│                              │  │ Llamar el lunes 9am    │ │
│                              │  └─────────────────────────┘ │
│                              │  250/500 chars  ✓ Guardado   │
└──────────────────────────────┴──────────────────────────────┘
```

---

## 7. Flujos de Usuario Principales

### Flujo 1: Primera Carga
```
1. Usuario abre index.html
2. UI muestra: "Sin datos cargados"
3. Click en "Cargar CSV" → FileReader + PapaParse (worker)
4. Mientras carga: spinner "Procesando 80,000 registros..."
5. Al completar:
   - Construir índices (byRisk, byAction, byLabel)
   - Mostrar: "80,000 advertisers cargados · Ciclo 2025-04"
   - Lista vacía con mensaje: "Aplica un filtro para ver resultados"
```

### Flujo 2: Filtrar y Consultar
```
1. Usuario selecciona "ALTO" en filtro de riesgo
2. FilterEngine usa INDEXES.byRisk["ALTO"] (O(1))
3. Lista muestra primeras 100 filas paginadas
4. Contador: "528 de 80,000 advertisers"
5. Click en fila → Panel de perfil se actualiza
6. ↑↓ para navegar entre filas
```

### Flujo 3: Tipificar
```
1. Con advertiser seleccionado
2. Click en tag "Contactado" → toggle activo
3. Click en "Interesado" → toggle activo
4. Escribir nota → debounce 600ms → guardar
5. TagStore.set() → localStorage inmediato
6. Badge "✓ Tipificado" aparece en la fila
7. Indicador "✓ Guardado" por 2 segundos
```

### Flujo 4: Exportar/Importar (4 operadores)
```
EXPORTAR:
1. Click "Exportar tags"
2. Descarga: tags_2025-04_20250528_1430.json

IMPORTAR:
1. Click "Importar tags"
2. Seleccionar JSON
3. Diálogo: "¿Reemplazar existentes o mantener locales?"
4. Merge según selección
5. Toast: "Importados: 45, Omitidos: 12"

CONSOLIDACIÓN DIARIA (workflow sugerido):
- Operador 1 exporta → comparte → Operador 2-4 importan con "mantener locales"
- Al final del día: Operador 1 importa todos con "reemplazar" y re-exporta consolidado
```

---

## 8. Reglas de Implementación

### 8.1 Seguridad (No Negociables)
```javascript
// ❌ NUNCA
element.innerHTML = advertiser.advertiser_name;  // XSS
eval(userInput);                                  // Injection

// ✓ SIEMPRE
element.textContent = advertiser.advertiser_name;

// Sanitizar al insertar en DOM
function escapeHtml(text) {
  var div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}
```

### 8.2 Manejo de CSV con BOM
```javascript
// Detectar y eliminar BOM UTF-8
function removeBOM(text) {
  if (text.charCodeAt(0) === 0xFEFF) {
    return text.slice(1);
  }
  return text;
}
```

### 8.3 Parsing con PapaParse (Worker)
```javascript
function loadCSV(file) {
  return new Promise(function(resolve, reject) {
    Papa.parse(file, {
      worker: true,           // No bloquea UI
      header: true,           // Primera fila = headers
      skipEmptyLines: true,
      transformHeader: function(h) {
        return h.toLowerCase().trim().replace(/\s+/g, '_');
      },
      complete: function(results) {
        if (results.errors.length > 0) {
          reject(new Error('Error parsing CSV'));
          return;
        }
        var advertisers = normalizeRecords(results.data);
        resolve(advertisers);
      },
      error: function(err) {
        reject(err);
      }
    });
  });
}
```

### 8.4 Filtrado Optimizado con Índices
```javascript
function applyFilters(filterState, indexes, allAdvertisers) {
  // Si no hay filtros activos, retornar vacío (regla 80K)
  if (!hasActiveFilters(filterState)) {
    return [];
  }
  
  var result = allAdvertisers;
  
  // Aplicar filtros usando índices (más restrictivo primero)
  if (filterState.riskLevels.length > 0) {
    result = [];
    filterState.riskLevels.forEach(function(level) {
      result = result.concat(indexes.byRisk[level] || []);
    });
  }
  
  // Intersectar con otros filtros...
  if (filterState.actionCodes.length > 0) {
    var actionSet = new Set();
    filterState.actionCodes.forEach(function(code) {
      (indexes.byAction[code] || []).forEach(function(adv) {
        actionSet.add(adv.advertiser_id);
      });
    });
    result = result.filter(function(adv) {
      return actionSet.has(adv.advertiser_id);
    });
  }
  
  // Filtro de texto (al final, más costoso)
  if (filterState.searchText) {
    var search = filterState.searchText.toLowerCase();
    result = result.filter(function(adv) {
      return adv.advertiser_id.toLowerCase().indexOf(search) !== -1 ||
             (adv.advertiser_name || '').toLowerCase().indexOf(search) !== -1;
    });
  }
  
  return result;
}
```

### 8.5 Paginación
```javascript
function paginate(array, page, pageSize) {
  var start = (page - 1) * pageSize;
  var end = start + pageSize;
  return {
    items: array.slice(start, end),
    currentPage: page,
    totalPages: Math.ceil(array.length / pageSize),
    totalItems: array.length
  };
}
```

### 8.6 localStorage con Fallback
```javascript
var TagStore = {
  _store: null,
  _cycleId: null,
  
  init: function(cycleId) {
    this._cycleId = cycleId;
    var key = CONFIG.LOCALSTORAGE_PREFIX + cycleId;
    try {
      var stored = localStorage.getItem(key);
      this._store = stored ? JSON.parse(stored) : { version: '1.0', cycle_id: cycleId, tags: {} };
    } catch (e) {
      console.error('Error loading tags from localStorage:', e);
      this._store = { version: '1.0', cycle_id: cycleId, tags: {} };
    }
  },
  
  _persist: function() {
    var key = CONFIG.LOCALSTORAGE_PREFIX + this._cycleId;
    try {
      var json = JSON.stringify(this._store);
      // Verificar tamaño antes de guardar
      if (json.length > 5 * 1024 * 1024) {  // 5MB warning
        UI.showToast('Advertencia: store de tags cerca del límite', 'warning');
      }
      localStorage.setItem(key, json);
    } catch (e) {
      UI.showToast('Error guardando tags: ' + e.message, 'error');
    }
  },
  
  set: function(advertiserId, tags, note, taggedBy) {
    // Si vacío, eliminar
    if (tags.length === 0 && !note) {
      delete this._store.tags[advertiserId];
    } else {
      this._store.tags[advertiserId] = {
        advertiser_id: advertiserId,
        cycle_id: this._cycleId,
        tags: tags,
        note: note || '',
        tagged_at: new Date().toISOString(),
        tagged_by: taggedBy || ''
      };
    }
    this._persist();
  }
  // ... más métodos
};
```

---

## 9. Estilos CSS (Variables y Componentes Clave)

```css
:root {
  /* Colores de riesgo */
  --risk-alto: #dc3545;
  --risk-medio: #fd7e14;
  --risk-bajo: #28a745;
  --risk-ind: #6c757d;
  
  /* Colores de segmento */
  --label-cq: #e74c3c;
  --label-vp: #9b59b6;
  --label-sp: #3498db;
  --label-fl: #1abc9c;
  --label-ta: #f39c12;
  --label-cs: #2ecc71;
  --label-rb: #95a5a6;
  
  /* Colores de tags */
  --tag-gestion: #5dade2;
  --tag-resultado-ok: #58d68d;
  --tag-resultado-bad: #ec7063;
  --tag-cierre: #af7ac5;
  
  /* UI */
  --bg-primary: #ffffff;
  --bg-secondary: #f8f9fa;
  --border-color: #dee2e6;
  --text-primary: #212529;
  --text-muted: #6c757d;
  --row-selected: #e3f2fd;
  --row-hover: #f5f5f5;
}

/* Badge de riesgo */
.badge-risk {
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 600;
}
.badge-risk--alto { background: var(--risk-alto); color: white; }
.badge-risk--medio { background: var(--risk-medio); color: white; }
.badge-risk--bajo { background: var(--risk-bajo); color: white; }
.badge-risk--ind { background: var(--risk-ind); color: white; }

/* Tag button */
.tag-btn {
  padding: 4px 12px;
  border: 2px solid var(--border-color);
  border-radius: 16px;
  background: white;
  cursor: pointer;
  transition: all 0.15s;
}
.tag-btn:hover { border-color: var(--tag-gestion); }
.tag-btn--active {
  background: var(--tag-gestion);
  border-color: var(--tag-gestion);
  color: white;
}

/* Tabla */
.adv-table {
  width: 100%;
  border-collapse: collapse;
}
.adv-table th {
  position: sticky;
  top: 0;
  background: var(--bg-secondary);
  padding: 8px 12px;
  text-align: left;
  border-bottom: 2px solid var(--border-color);
  cursor: pointer;
}
.adv-table td {
  padding: 8px 12px;
  border-bottom: 1px solid var(--border-color);
}
.adv-table tr:hover { background: var(--row-hover); }
.adv-table tr.selected { background: var(--row-selected); }

/* Toast */
.toast {
  position: fixed;
  bottom: 20px;
  right: 20px;
  padding: 12px 20px;
  border-radius: 8px;
  color: white;
  animation: slideIn 0.3s ease;
}
.toast--success { background: #28a745; }
.toast--error { background: #dc3545; }
.toast--warning { background: #ffc107; color: #212529; }
```

---

## 10. Despliegue en Azure

### 10.1 Estructura para Deploy
```
dist/                      ← Carpeta a desplegar
├── index.html
├── style.css
├── app.js
├── config.js
├── lib/
│   ├── papaparse.min.js
│   └── dayjs.min.js
└── staticwebapp.config.json
```

### 10.2 Configuración de Auth (staticwebapp.config.json)
```json
{
  "auth": {
    "identityProviders": {
      "azureActiveDirectory": {
        "registration": {
          "openIdIssuer": "https://login.microsoftonline.com/{TENANT_ID}/v2.0",
          "clientIdSettingName": "AZURE_CLIENT_ID",
          "clientSecretSettingName": "AZURE_CLIENT_SECRET"
        }
      }
    }
  },
  "routes": [
    {
      "route": "/*",
      "allowedRoles": ["authenticated"]
    }
  ],
  "responseOverrides": {
    "401": {
      "redirect": "/.auth/login/aad",
      "statusCode": 302
    }
  }
}
```

### 10.3 Comandos de Deploy
```bash
# Login a Azure
az login

# Crear recurso
az staticwebapp create \
  --name consulta-retencion-sp1 \
  --resource-group rg-retencion \
  --location "eastus2" \
  --sku Free

# Deploy
az staticwebapp deploy \
  --name consulta-retencion-sp1 \
  --source "./dist" \
  --no-build
```

---

## 11. Checklist de Implementación

### Fase 1: Estructura Base
- [ ] Crear `index.html` con layout de 4 zonas
- [ ] Crear `style.css` con variables y componentes base
- [ ] Crear `app.js` con estructura de módulos vacíos
- [ ] Crear `config.js` con constantes
- [ ] Copiar `papaparse.min.js` a `/lib/`

### Fase 2: Carga de Datos
- [ ] Implementar `DataLoader.parseCSV()` con PapaParse worker
- [ ] Implementar `DataLoader.buildIndexes()` 
- [ ] Implementar normalización de columnas (aliases)
- [ ] Implementar inferencia de ciclo
- [ ] UI: botón cargar, spinner, mensajes de estado

### Fase 3: Filtros y Lista
- [ ] Implementar `FilterEngine.apply()` con índices
- [ ] Implementar generación dinámica de opciones de filtro
- [ ] Implementar debounce en búsqueda de texto
- [ ] Implementar paginación
- [ ] UI: panel de filtros, contador, lista vacía inicial

### Fase 4: Perfil y Tipificación
- [ ] Implementar selección de fila y navegación ↑↓
- [ ] Implementar panel de perfil con señales
- [ ] Implementar `TagStore` completo
- [ ] UI: panel de tags con toggles, nota, operador
- [ ] Implementar guardado automático con feedback

### Fase 5: Export/Import
- [ ] Implementar `TagStore.exportJSON()`
- [ ] Implementar `TagStore.importJSON()` con merge
- [ ] Implementar `TagStore.exportCSV()`
- [ ] UI: botones de acción, diálogos de confirmación

### Fase 6: Polish y Deploy
- [ ] Validar rendimiento con CSV de 80K filas
- [ ] Pruebas de los 4 operadores con workflow de consolidación
- [ ] Crear `staticwebapp.config.json`
- [ ] Deploy a Azure Static Web Apps
- [ ] Configurar auth Azure AD

---

## 12. Criterios de Aceptación Clave

| # | Criterio | Cómo verificar |
|---|----------|----------------|
| 1 | CSV de 80K filas carga en <3s | Cronómetro desde click hasta "Cargado" |
| 2 | Lista vacía sin filtros | Cargar CSV → mensaje "Aplica un filtro" |
| 3 | Filtro ALTO muestra solo ALTO | Activar filtro → verificar todas las filas |
| 4 | Tags persisten al recargar | Tipificar → F5 → cargar CSV → verificar |
| 5 | Export JSON genera archivo válido | Exportar → abrir JSON → validar estructura |
| 6 | Import merge funciona | Operador A exporta → Operador B importa → ambos tags existen |

---

## 13. Referencias a Especificación Detallada

| Tema | Documento |
|------|-----------|
| Visión general | [spec/00-overview.md](spec/00-overview.md) |
| Requerimientos funcionales | [spec/01-functional-requirements.md](spec/01-functional-requirements.md) |
| Requerimientos no funcionales | [spec/02-non-functional-requirements.md](spec/02-non-functional-requirements.md) |
| Modelo de datos | [spec/03-data-model.md](spec/03-data-model.md) |
| Formato CSV | [spec/04-csv-format.md](spec/04-csv-format.md) |
| Reglas de tagging | [spec/05-tagging-rules.md](spec/05-tagging-rules.md) |
| Flujo UI/UX | [spec/06-ui-ux-flow.md](spec/06-ui-ux-flow.md) |
| Contrato de módulos JS | [spec/07-api-contract.md](spec/07-api-contract.md) |
| Estrategia de storage | [spec/08-storage-strategy.md](spec/08-storage-strategy.md) |
| Deploy Azure | [spec/09-azure-deployment.md](spec/09-azure-deployment.md) |
| Seguridad | [spec/10-security-and-access.md](spec/10-security-and-access.md) |
| Performance | [spec/11-performance-considerations.md](spec/11-performance-considerations.md) |
| Acceptance criteria | [spec/12-acceptance-criteria.md](spec/12-acceptance-criteria.md) |
| Stack tecnológico | [spec/13-tech-stack-decision-guidelines.md](spec/13-tech-stack-decision-guidelines.md) |
| Ejemplos | [spec/examples/](spec/examples/) |

---

> **Nota**: Este documento es el punto de entrada para implementar la aplicación. Usa los archivos de `/spec/` para detalles específicos de cada área.
