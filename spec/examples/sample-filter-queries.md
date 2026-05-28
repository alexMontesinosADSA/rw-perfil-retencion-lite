# Ejemplos de Consultas y Filtros

Estos ejemplos ilustran las combinaciones de filtros más útiles para la gestión operativa del primer ciclo. Todos los resultados se basan en el archivo `sample-input.csv` (20 advertisers de muestra).

---

## Consulta 1 — Todos los clientes de alto riesgo sin tipificar

**Objetivo:** Identificar qué clientes de alto riesgo aún no han sido gestionados.

**Filtros a aplicar:**
- Nivel de riesgo: `ALTO`
- Estado tipificación: `Sin tipificar`

**Resultado esperado con el sample:** 8 advertisers (de los 9 de nivel ALTO, 6 ya tienen tags en `sample-tags.json`, quedan 3 sin gestionar: Zeta, Eta, Theta, Kappa).

**Interpretación:** Esta consulta es el punto de partida diario del operador para saber dónde enfocar la gestión del día.

---

## Consulta 2 — Clientes CAC pendientes de contacto

**Objetivo:** Ver los clientes asignados al CAC que aún no fueron contactados.

**Filtros a aplicar:**
- Acción asignada: `CAC`
- Estado tipificación: `Sin tipificar`

**Resultado esperado con el sample:** Los advertisers con `assigned_action_code = CAC` que no tienen ningún tag en el store. Con el sample, Alpha, Beta, Epsilon ya tienen tags; quedan 0 CAC sin tipificar.

**Interpretación:** Permite verificar si el equipo de CAC tiene pendientes sin gestionar.

---

## Consulta 3 — Clientes en negociación activa

**Objetivo:** Ver en qué estado está cada negociación en curso.

**Filtros a aplicar:**
- Estado tipificación: `Solo tipificados`
- Búsqueda o filtro por tag: `EN_NEGOCIACION` *(si se implementa filtro por tag)*

**Sin filtro por tag disponible**, alternativa:
- Exportar el JSON y filtrar en Excel por la columna `tags` que contenga `EN_NEGOCIACION`.

**Resultado esperado con el sample:** 1 advertiser (Empresa Alpha SA, ID 10042).

---

## Consulta 4 — Universo de clientes VP para revisión estratégica

**Objetivo:** Ver todos los clientes de alto valor asignados a revisión estratégica.

**Filtros a aplicar:**
- Segmento: `VP`
- Acción asignada: `REVISION_ESTRATEGICA`

**Resultado esperado con el sample:** 2 advertisers (Gamma SA, Iota SA).

**Nota:** Al seleccionar cada uno, el panel de perfil mostrará el score, las señales y si tienen tags asignados.

---

## Consulta 5 — Clientes silenciosos (CS/CS_MEDIO) sin actividad digital

**Objetivo:** Identificar clientes del segmento silencioso que tampoco tienen campaña digital, para evaluar si agregar cobertura.

**Filtros a aplicar:**
- Segmento: `CS`, `CS_MEDIO`, `CS_BAJO`

**Luego revisar manualmente** cuáles tienen `has_digital_campaign = 0` en el panel de perfil.

**Resultado esperado con el sample:** 4 advertisers del cluster silencioso. De ellos, Mu, Xi, Pi, Rho no tienen campaña digital activa.

---

## Consulta 6 — Clientes con rezago financiero

**Objetivo:** Lista priorizada de advertisers con señal de rezago activa.

**Filtros a aplicar:**
- Nivel de riesgo: `ALTO`
- Acción asignada: `SEND_CAMPAIGN`

**Resultado esperado con el sample:** Delta Corp (rezago=1), Eta SRL (rezago=1), Nu Ltda (rezago=1).

**Interpretación:** Candidatos para campaña preventiva de pago. Verificar en el panel de perfil cuáles ya tienen plan de pago activo como resultado del contacto.

---

## Consulta 7 — Progreso general de gestión del ciclo

**Objetivo:** Evaluar cuántos advertisers de alto riesgo han sido gestionados vs. pendientes.

**Filtros a aplicar:**
- Nivel de riesgo: `ALTO`
- Estado tipificación: `Solo tipificados`

Compara el contador contra el total de ALTO para calcular el porcentaje de avance.

**Fórmula:** `(tipificados ALTO / total ALTO) × 100`

**Resultado esperado con el sample:** 5 de 9 ALTO tipificados = 55.6% de avance.

---

## Consulta 8 — Exportar solo los acuerdos alcanzados

**Objetivo:** Generar un CSV con los clientes que llegaron a un acuerdo.

**Pasos:**
1. Aplicar filtro: Estado tipificación = `Solo tipificados`.
2. Exportar lista como CSV.
3. En Excel, filtrar la columna `tags` por los que contienen `ACUERDO_ALCANZADO`.

*(Si la app implementa filtro por tag, se puede aplicar directamente en la UI.)*

**Resultado esperado con el sample:** 1 advertiser (Empresa Gamma SA).

---

## Notas sobre filtros combinados

- Todos los filtros se combinan con lógica **AND**: cuantos más filtros activos, más específico el resultado.
- Para consultas tipo **OR** entre segmentos (ej: "CQ o VP"), seleccionar ambos en el filtro de segmento (multi-select).
- Para consultas complejas que la UI no soporta directamente, usar "Exportar CSV" y procesar en Excel.
