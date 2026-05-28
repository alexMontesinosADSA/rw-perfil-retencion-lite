# 12 — Criterios de Aceptación

Todos los criterios usan formato **Dado / Cuando / Entonces** (Given / When / Then). Un criterio se considera superado cuando el comportamiento observado coincide exactamente con el descrito.

---

## AC-01 — Carga de CSV válido

**Dado** que el usuario abre la aplicación por primera vez y no hay datos cargados,
**Cuando** hace clic en "Cargar CSV" y selecciona el archivo `sample-input.csv` de la carpeta `/examples`,
**Entonces**:
- La barra superior muestra el ciclo inferido del nombre del archivo.
- La barra superior muestra "10 advertisers cargados" (o el total del archivo).
- La tabla del panel superior muestra 10 filas.
- El contador de filtros muestra "10 de 10 advertisers".

---

## AC-02 — Error por CSV sin columnas mínimas

**Dado** que el usuario tiene la app abierta,
**Cuando** carga un CSV que solo contiene columnas irreconocibles (sin `advertiser_id` ni alias),
**Entonces**:
- Se muestra un mensaje de error: "No se encontró columna de ID. Se esperaba advertiser_id o similar."
- La lista permanece vacía.
- No se pierde ningún dato previamente cargado.

---

## AC-03 — Filtro por nivel de riesgo

**Dado** que hay datos cargados con advertisers de nivel ALTO y MEDIO,
**Cuando** el usuario hace clic en el botón "ALTO" en el filtro de nivel de riesgo,
**Entonces**:
- La lista muestra únicamente advertisers con `assigned_risk_level_code = "ALTO"`.
- El botón "ALTO" aparece visualmente activo (relleno, no outline).
- El contador muestra "X de Y advertisers" donde X es el número de ALTO.

**Cuando** el usuario hace clic además en "MEDIO",
**Entonces**:
- La lista muestra advertisers con nivel ALTO **o** MEDIO.
- El contador refleja la nueva suma.

**Cuando** el usuario hace clic en "Limpiar filtros",
**Entonces**:
- La lista vuelve a mostrar todos los advertisers.
- Ningún botón de filtro aparece activo.

---

## AC-04 — Filtro por acción asignada

**Dado** que hay datos cargados,
**Cuando** el usuario selecciona "CAC" en el dropdown de acción asignada,
**Entonces**:
- La lista muestra únicamente advertisers con `assigned_action_code = "CAC"`.
- El dropdown muestra el valor seleccionado.

---

## AC-05 — Búsqueda por texto libre

**Dado** que hay datos cargados,
**Cuando** el usuario escribe "12345" en el campo de búsqueda,
**Entonces**:
- Después de 250ms (debounce), la lista muestra solo el advertiser con `advertiser_id = "12345"`.

**Cuando** el usuario borra el texto,
**Entonces**:
- La lista vuelve a mostrar todos los advertisers (con filtros previos activos si los hay).

---

## AC-06 — Filtros combinados (AND)

**Dado** que hay datos cargados,
**Cuando** el usuario activa el filtro "ALTO" y también selecciona "CAC" en acción,
**Entonces**:
- La lista muestra solo advertisers que son **simultáneamente** de nivel ALTO **y** acción CAC.
- El contador refleja el número correcto.

---

## AC-07 — Selección de advertiser y panel de perfil

**Dado** que hay datos cargados y la lista muestra al menos una fila,
**Cuando** el usuario hace clic en cualquier fila de la lista,
**Entonces**:
- La fila seleccionada se resalta visualmente.
- El panel inferior izquierdo muestra el nombre, ID, segmento, nivel de riesgo y señales del advertiser seleccionado.
- El panel inferior derecho muestra el módulo de tipificación para ese advertiser.

**Cuando** el usuario hace clic en una fila diferente,
**Entonces**:
- El panel se actualiza con los datos del nuevo advertiser.
- La fila anterior deja de estar resaltada.

---

## AC-08 — Tipificación básica

**Dado** que hay un advertiser seleccionado y el panel de tipificación está visible,
**Cuando** el usuario hace clic en el tag "Contactado",
**Entonces**:
- El botón "Contactado" cambia visualmente a estado activo.
- El indicador de tipificación en la fila de la lista se actualiza (muestra badge tipificado).
- El tag se persiste en `localStorage` (verificable recargando la página).

**Cuando** el usuario hace clic nuevamente en "Contactado" (toggle off),
**Entonces**:
- El botón vuelve al estado inactivo.
- Si no quedan otros tags, el registro se elimina del store.

---

## AC-09 — Nota libre

**Dado** que hay un advertiser seleccionado,
**Cuando** el usuario escribe una nota en el campo de texto del panel de tipificación,
**Entonces**:
- El contador de caracteres se actualiza en tiempo real.
- Después de 600ms (debounce), la nota se guarda en `localStorage`.
- Al seleccionar el mismo advertiser nuevamente, la nota persiste.

---

## AC-10 — Persistencia entre sesiones

**Dado** que el usuario tipificó 3 advertisers en una sesión anterior,
**Cuando** cierra el navegador, lo reabre, abre la app y carga el mismo CSV,
**Entonces**:
- Los 3 advertisers tipificados muestran el badge de tipificado en la lista.
- Al seleccionarlos, sus tags y notas están correctamente cargados en el panel.

---

## AC-11 — Exportar JSON

**Dado** que hay al menos un advertiser tipificado,
**Cuando** el usuario hace clic en "Exportar tags",
**Entonces**:
- El navegador descarga un archivo con nombre `tags_{cycle_id}_{fecha}_{hora}.json`.
- El archivo contiene una entrada por cada advertiser tipificado.
- Los tags y notas en el archivo coinciden con los visibles en la UI.

---

## AC-12 — Importar JSON

**Dado** que el usuario tiene el archivo `sample-tags.json` de la carpeta `/examples`,
**Cuando** hace clic en "Importar tags" y selecciona ese archivo,
**Entonces**:
- Los advertisers del archivo JSON aparecen marcados como tipificados en la lista.
- El resumen de tipificación en la barra superior se actualiza.
- Un toast confirma: "87 tags importados, 0 omitidos." (o los números reales del sample).

---

## AC-13 — Exportar CSV de la lista filtrada

**Dado** que hay datos cargados y el usuario aplicó un filtro que muestra 50 advertisers,
**Cuando** hace clic en "Exportar lista",
**Entonces**:
- El navegador descarga un CSV con exactamente 50 filas de datos (más encabezado).
- El CSV incluye columnas de tags y notas.
- Los advertisers fuera del filtro no aparecen en el CSV.

---

## AC-14 — Navegación por teclado

**Dado** que hay filas en la lista y una está seleccionada,
**Cuando** el usuario presiona la tecla `↓`,
**Entonces**:
- La selección avanza a la siguiente fila.
- El panel de perfil se actualiza.

**Cuando** el usuario presiona la tecla `↑` desde la primera fila,
**Entonces**:
- No ocurre nada (no hay fila anterior).

---

## AC-15 — Resumen de tipificación

**Dado** que hay 87 advertisers tipificados de 1.200 totales,
**Entonces**:
- La barra superior muestra "87 / 1.200 tipificados".
- El resumen por tag es accesible desde algún punto de la UI.
