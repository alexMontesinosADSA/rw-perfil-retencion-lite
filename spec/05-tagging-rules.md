# 05 — Reglas de Tipificación (Tagging)

---

## Propósito

El módulo de tipificación permite a los operadores de retención registrar el resultado de la gestión de cada advertiser durante el primer ciclo. Las tipificaciones son **código de contacto + resultado**, no notas libres — garantizan uniformidad para análisis posterior.

---

## Taxonomía de Tags

Las tipificaciones están organizadas en tres categorías operativas.

### Categoría A — Estado de Gestión

| Código | Etiqueta UI | Descripción operativa |
|---|---|---|
| `PENDIENTE_CONTACTO` | Pendiente de contacto | El advertiser está en cola de gestión, aún no fue abordado. |
| `CONTACTADO` | Contactado | Se logró contacto efectivo con el advertiser. |
| `NO_CONTACTA` | No contesta | Se intentó contactar pero no hubo respuesta. |
| `NUMERO_INVALIDO` | Número inválido / sin contacto | No se dispone de dato de contacto válido. |

### Categoría B — Resultado del Contacto

| Código | Etiqueta UI | Descripción operativa |
|---|---|---|
| `INTERESADO` | Interesado en resolver | El advertiser expresó disposición a resolver la situación. |
| `SIN_INTERES` | Sin interés | El advertiser no mostró disposición. |
| `EN_NEGOCIACION` | En negociación | Hay una conversación activa en curso. |
| `ACUERDO_ALCANZADO` | Acuerdo alcanzado | Se llegó a un acuerdo (pago, renovación, solución). |
| `PLAN_DE_PAGO_ACTIVO` | Plan de pago activo | El advertiser aceptó un plan de pago específico. |

### Categoría C — Cierre de Gestión

| Código | Etiqueta UI | Descripción operativa |
|---|---|---|
| `ESCALADO` | Escalado | El caso fue derivado a un nivel superior o área diferente. |
| `CERRADO_EXITOSO` | Cerrado exitoso | La gestión terminó con una resolución favorable. |
| `CERRADO_SIN_RESOLUCION` | Cerrado sin resolución | La gestión terminó sin lograr el objetivo. |
| `FUERA_DE_UNIVERSO` | Fuera de universo | El advertiser no corresponde al ciclo (baja, error, etc.). |

---

## Reglas de negocio

### Multiplicidad
- Un advertiser puede tener **uno o varios tags simultáneos**.
- No hay límite de cantidad de tags por advertiser dentro de la taxonomía.
- Combinaciones típicas válidas: `CONTACTADO + INTERESADO + EN_NEGOCIACION`, o `CONTACTADO + SIN_INTERES + CERRADO_SIN_RESOLUCION`.

### Restricciones de combinación (reglas suaves)
Las siguientes combinaciones son lógicamente inconsistentes. La UI puede mostrar un **warning visual**, pero no bloquear:

| Combinación | Razón del warning |
|---|---|
| `CERRADO_EXITOSO` + `CERRADO_SIN_RESOLUCION` | Dos cierres contradictorios. |
| `INTERESADO` + `SIN_INTERES` | Resultados opuestos. |
| `NO_CONTACTA` + `ACUERDO_ALCANZADO` | No es posible un acuerdo sin contacto. |

### Orden de sugerencia en la UI
Los tags se muestran en el orden de la tabla anterior (A → B → C), no alfabéticamente.

### Estado inicial
Un advertiser sin ninguna gestión no tiene tags. No se crea un registro en el store hasta que se asigna al menos un tag o una nota.

---

## Nota libre

- Campo de texto libre complementario a los tags.
- Máximo **500 caracteres**.
- No reemplaza a los tags; es un campo adicional de contexto.
- Si se escribe una nota sin asignar tags, se guarda igual (un record con `tags: []` y `note: "..."` es válido).

---

## Campo tagged_by (operador)

- Campo de texto libre, no obligatorio.
- Permite registrar quién gestionó al advertiser.
- Si la organización tiene varios operadores, se recomienda convencionar el formato (nombre, inicial, legajo).
- No hay autenticación: el usuario escribe su nombre manualmente.

---

## Modificación y reversión

- Los tags pueden agregarse y quitarse libremente en cualquier momento durante la vigencia del ciclo.
- Cada modificación actualiza `tagged_at` al timestamp actual.
- No se guarda historial de cambios (solo el estado actual).

---

## Integración futura (fuera del alcance del MVP)

Si en el futuro esta herramienta se conecta a un sistema de gestión o CRM, los campos `tags[]` y `note` deberían mapearse a los campos de tipificación del sistema destino. La taxonomía de tags fue diseñada para ser compatible con clasificaciones típicas de contactabilidad y gestión de retención.
