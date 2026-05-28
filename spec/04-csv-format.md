# 04 — Formato del CSV de Entrada

---

## Fuente

El CSV debe exportarse desde la vista `vw_ret_list_operativa` (contrato B.01 del pipeline de retención).

También se acepta cualquier CSV que contenga al menos las dos columnas mínimas obligatorias.

---

## Reglas generales

| Regla | Detalle |
|---|---|
| Separador | Coma (`,`) |
| Encabezados | Primera fila obligatoriamente |
| Encoding | UTF-8 (con o sin BOM) |
| Comillas | Strings con comas deben ir entre comillas dobles `"` |
| Valores nulos | Celda vacía o `NULL` (se trata como `null`) |
| Case de encabezados | Se normalizan a minúsculas, se ignoran espacios y guiones bajos de más |

---

## Columnas mínimas obligatorias

| Columna | Descripción |
|---|---|
| `advertiser_id` | Identificador único del advertiser. Requerido para funcionar. |
| `assigned_label_code` | Código de segmento asignado por el modelo. Requerido para clasificación y filtros. |

---

## Columnas del contrato de lectura (vw_ret_list_operativa)

| Nombre en vista | Tipo | Descripción | Obligatoria |
|---|---|---|---|
| `advertiser_id` | string | ID único del advertiser | **Sí** |
| `advertiser_name` | string | Nombre oficial del advertiser | No |
| `cycle_id` | string | Ciclo de evaluación (`YYYY-MM`) | No |
| `assigned_label_code` | string | Segmento del modelo (VP, CQ, SP...) | **Sí** |
| `assigned_risk_level_code` | string | Nivel de riesgo (ALTO, MEDIO, BAJO) | No |
| `assigned_action_code` | string | Código de acción sugerida | No |
| `score_total` | number | Score de retención (0–100) | No |
| `trigger_reason_code` | string | Código de la razón de activación | No |
| `trigger_reason_detail` | string | Descripción de la señal principal | No |
| `has_rezago` | boolean (0/1) | Flag de rezago financiero | No |
| `sessions_month` | integer | Sesiones web del mes | No |
| `open_cases_count` | integer | Casos de atención abiertos | No |
| `has_digital_campaign` | boolean (0/1) | Flag de campaña digital activa | No |
| `last_contract_date` | date (YYYY-MM-DD) | Fecha del último contrato | No |
| `total_contract_amount` | number | Monto contractual total | No |

---

## Aliases de columnas aceptados

La aplicación reconoce variantes comunes de nombres de columna. La normalización elimina espacios, convierte a minúsculas y preserva guiones bajos.

| Campo interno | Nombres de columna aceptados |
|---|---|
| `advertiser_id` | `advertiser_id`, `advertiserid`, `cliente_id`, `clienteid`, `id` |
| `advertiser_name` | `advertiser_name`, `advertisername`, `nombre`, `name`, `cliente` |
| `assigned_label_code` | `assigned_label_code`, `assignedlabelcode`, `clasificacion`, `clasificacion_final`, `segmento`, `label`, `label_code` |
| `assigned_risk_level_code` | `assigned_risk_level_code`, `assignedrisklevelcode`, `nivel`, `risk_level`, `riesgo` |
| `assigned_action_code` | `assigned_action_code`, `assignedactioncode`, `accion`, `accion_sugerida`, `action` |
| `score_total` | `score_total`, `scoretotal`, `score_final`, `scorefinal`, `score`, `score_retencion` |
| `trigger_reason_detail` | `trigger_reason_detail`, `triggerreasondetail`, `señal`, `senal`, `seal_principal` |
| `trigger_reason_code` | `trigger_reason_code`, `triggerreasoncode` |
| `has_rezago` | `has_rezago`, `hasrezago`, `flg_rezago`, `rezago` |
| `sessions_month` | `sessions_month`, `sessionsmonth`, `session_month`, `sesiones` |
| `open_cases_count` | `open_cases_count`, `opencasescount`, `open_cases`, `casos` |
| `has_digital_campaign` | `has_digital_campaign`, `hasdigitalcampaign`, `flg_digital`, `digital` |
| `last_contract_date` | `last_contract_date`, `lastcontractdate`, `fecha_contrato` |
| `total_contract_amount` | `total_contract_amount`, `totalcontractamount`, `monto_contrato`, `monto` |

---

## Valores de columnas booleanas

Las columnas de tipo boolean (has_rezago, has_digital_campaign) pueden contener:

| Valor | Interpretación |
|---|---|
| `1`, `true`, `TRUE`, `True`, `yes`, `sí`, `si` | `true` |
| `0`, `false`, `FALSE`, `False`, `no` | `false` |
| vacío, `NULL`, `null` | `null` (sin dato) |

---

## Inferencia del ciclo

Si el CSV no tiene columna `cycle_id`:
1. Se intenta extraer el ciclo del nombre del archivo con el patrón `YYYY-MM` (ejemplo: `retencion_2025-04_publicado.csv` → `2025-04`).
2. Si no se puede inferir, se muestra un campo de texto en la UI para que el usuario ingrese el ciclo manualmente.

---

## Validaciones al cargar

| Validación | Resultado si falla |
|---|---|
| El archivo tiene al menos 2 filas (encabezado + 1 dato) | Error: "El archivo no contiene datos suficientes." |
| Existe columna `advertiser_id` o alias | Error: "No se encontró columna de ID. Se esperaba advertiser_id o similar." |
| Existe columna `assigned_label_code` o alias | Error: "No se encontró columna de clasificación. Se esperaba assigned_label_code o similar." |
| Al menos 1 fila con `assigned_label_code` no vacío | Error: "No se encontraron filas con clasificación válida." |
| Filas con `advertiser_id` duplicado | Warning (toast): "Se encontraron X IDs duplicados. Se conservó el último registro de cada ID." |

---

## Ejemplo de encabezado mínimo válido

```
advertiser_id,assigned_label_code
12345,CQ
67890,VP
```

## Ejemplo de encabezado completo (vw_ret_list_operativa)

```
advertiser_id,advertiser_name,cycle_id,assigned_label_code,assigned_risk_level_code,assigned_action_code,score_total,trigger_reason_code,trigger_reason_detail,has_rezago,sessions_month,open_cases_count,has_digital_campaign,last_contract_date,total_contract_amount
```

Ver `examples/sample-input.csv` para un ejemplo con datos.
