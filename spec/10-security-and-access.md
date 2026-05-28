# 10 — Seguridad y Control de Acceso

---

## Perfil de riesgo

Esta herramienta es un artefacto **interno, temporal y de uso restringido** para el equipo de retención. Contiene datos de clientes exportados del sistema de retención (identificadores, segmentos, señales). No contiene datos financieros directos (número de tarjeta, cuenta bancaria, etc.), pero sí datos operativos sensibles del modelo.

**Nivel de clasificación sugerido:** Interno / Confidencial Operativo.

---

## Modelo de acceso

### MVP (primer ciclo)
Sin autenticación en la aplicación. El control de acceso se basa en:
- El archivo `index.html` y el CSV solo se distribuyen internamente.
- El archivo HTML se abre desde la red local o desde un compartido controlado.
- El CSV nunca se publica en Internet ni se sube a repositorios públicos.

### Si se despliega en Azure (ver `09-azure-deployment.md`)
Se recomienda habilitar autenticación con Azure AD para restringir el acceso a miembros del tenant corporativo.

---

## Datos sensibles — qué está en la herramienta

| Dato | Dónde existe | Riesgo si se expone |
|---|---|---|
| `advertiser_id` | CSV + localStorage (como clave de tags) | Identificación de clientes |
| `advertiser_name` | CSV (solo en memoria) | Identificación de clientes |
| `score_total` | CSV (solo en memoria) | Modelo interno expuesto |
| `assigned_label_code` | CSV (solo en memoria) | Clasificación interna |
| Señales (rezago, casos, sesiones) | CSV (solo en memoria) | Estado operativo del cliente |
| Tags y notas | localStorage + JSON exportado | Opiniones del operador, acciones tomadas |

---

## Reglas de manejo del CSV

1. El archivo CSV exportado desde `vw_ret_list_operativa` es **confidencial**. No debe compartirse fuera del equipo autorizado.
2. El CSV no debe subirse a repositorios Git, plataformas de almacenamiento público ni enviarse por email no cifrado.
3. El CSV vive solo en el equipo local del operador durante la sesión.

---

## Reglas de manejo del JSON de tags

1. El JSON exportado contiene únicamente `advertiser_id`, tags y notas del operador. No contiene nombres ni datos financieros.
2. Puede compartirse internamente dentro del equipo para sincronización.
3. No debe publicarse fuera de la organización.
4. Después del cierre del ciclo, el JSON puede archivarse en el repositorio interno del proyecto.

---

## Reglas de localStorage

1. `localStorage` es específico al navegador y perfil del usuario. No viaja con el equipo ni con el usuario a otra máquina.
2. Si el operador cambia de equipo, debe exportar el JSON antes y reimportarlo en el nuevo equipo.
3. Al finalizar el ciclo, el operador puede limpiar el localStorage manualmente o mediante el botón "Limpiar todos los tags" (con confirmación).

---

## Lo que la herramienta NO hace (garantías de diseño)

- No envía datos a ningún servidor externo (no hay `fetch`, `XMLHttpRequest`, ni scripts de terceros).
- No almacena el CSV en disco ni en ningún storage persistente.
- No tiene formularios de login que puedan ser objeto de phishing.
- No tiene dependencias externas que puedan inyectar código malicioso.

---

## Auditoría mínima recomendada

Para el primer ciclo, llevar el siguiente registro manual:

| Ítem | Responsable |
|---|---|
| Quién tiene acceso al CSV | Coordinador de retención |
| Quién exportó tags y cuándo | Cada operador (campo `exported_by` en el JSON) |
| Dónde se almacenó el JSON final del ciclo | Repositorio interno del proyecto |
| Cuándo se eliminaron los CSVs locales | Cierre del ciclo |
