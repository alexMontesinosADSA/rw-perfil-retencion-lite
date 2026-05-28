# 11 — Consideraciones de Rendimiento

---

## Universo de datos esperado

| Métrica | Valor esperado | Valor máximo a soportar |
|---|---|---|
| Filas en el CSV | ~1.200 advertisers | 5.000 |
| Columnas en el CSV | ~15 | 30 |
| Tags por advertiser | 1–5 | 14 (toda la taxonomía) |
| Advertisers tipificados | ~200–400 | 5.000 |
| Nota por advertiser (chars) | ~100 | 500 |

---

## Procesamiento del CSV

### Cuello de botella
`FileReader.readAsText()` es asíncrono. El cuello de botella real es el parsing fila por fila y la construcción del array de objetos.

### Estrategia
- Parsear todas las filas en un solo loop síncrono.
- No hacer `DOM updates` durante el parse (construir el array en memoria primero, luego renderizar una sola vez).
- Para 5.000 filas, el tiempo de parse es < 100 ms en hardware moderno.

### Indicador de progreso
Mostrar un spinner o mensaje "Procesando..." en la barra superior durante la carga. Reemplazar con el resultado al terminar.

---

## Renderizado de la lista

### Problema
Crear 1.200 `<tr>` en el DOM simultáneamente puede causar jank si el navegador hace layout en un solo frame.

### Estrategia — Paginación simple (recomendada para MVP)
- Mostrar 100 filas por página.
- Controles de paginación: `< Anterior` · `1 de 12` · `Siguiente >`.
- Los filtros se aplican sobre el array completo; la paginación opera sobre el resultado filtrado.
- Tiempo de renderizado de 100 `<tr>`: < 20 ms.

### Alternativa — Virtualización (solo si se requiere scroll continuo)
Si el equipo prefiere scroll continuo en vez de paginación, implementar un listado virtualizado:
- Solo renderizar las filas visibles en el viewport (+ un buffer de 20 arriba/abajo).
- Calcular el `scrollTop` y determinar qué índices renderizar.
- Más compleja de implementar, solo justificada si la paginación genera fricción en el uso.

---

## Filtros y búsqueda

### Debounce en búsqueda de texto
- Aplicar debounce de **250 ms** en el campo de búsqueda de texto libre.
- Sin debounce: `FilterEngine.apply()` se llamaría en cada tecla (puede ser 300ms × tecla en datasets grandes).

### Filtros por nivel / acción / segmento
- Aplicar inmediatamente al cambiar la selección (no requieren debounce).
- Operación de filtro sobre 5.000 objetos: < 5 ms.

### Orden de aplicación de filtros
Para optimizar, aplicar primero los filtros más restrictivos (los que reducen más el resultado):
1. `riskLevels` → suele reducir a 40–60% del total.
2. `actionCodes`
3. `labelCodes`
4. `taggedStatus`
5. `searchText` → aplicar al final (más costoso por string matching).

---

## localStorage

### Escritura
- Escribir a `localStorage` en cada cambio de tag introduce I/O sincrónico.
- Para un store con 1.000 advertisers tipificados, `JSON.stringify` del objeto puede tomar ~5 ms.
- **Estrategia**: escribir inmediatamente (el usuario espera el feedback), pero sin bloquear el UI thread usando `setTimeout(write, 0)` si se detecta lag.

### Lectura
- Leer una sola vez al init (`TagStore.init()`), luego operar sobre el objeto en memoria.
- No leer de `localStorage` en cada renderizado.

---

## Gestión de memoria

- El array de advertisers en memoria (1.200 objetos × ~20 campos) ocupa aproximadamente **1–2 MB**.
- No hay riesgo de memory leak si el array se declara como variable global o de módulo y no se recrea en cada render.
- El store de tags en memoria (hasta 5.000 entries) ocupa < 5 MB.

---

## Métricas objetivo de performance

| Operación | Objetivo | Máximo aceptable |
|---|---|---|
| Carga e interpretación del CSV | < 1s | 3s |
| Actualización de lista al aplicar filtro | < 100ms | 200ms |
| Actualización de lista al escribir búsqueda (con debounce) | < 300ms total | 500ms |
| Clic en fila → actualización de paneles inferiores | < 50ms | 100ms |
| Toggle de tag → guardado en localStorage | < 100ms | 200ms |
| Exportación de JSON (1.000 tags) | < 500ms | 1s |
