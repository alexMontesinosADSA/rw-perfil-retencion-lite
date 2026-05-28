# 02 — Requerimientos No Funcionales

---

## Compatibilidad

### RNF-01 · Protocolo de acceso
La aplicación debe funcionar correctamente bajo el protocolo `file://` (apertura directa del HTML desde el sistema de archivos local) **y** bajo `http://localhost` con cualquier servidor estático simple (npx serve, Python http.server, Live Server de VSCode).

No se requiere ningún servidor de aplicaciones, backend ni proceso Node.js en producción.

### RNF-02 · Navegadores soportados
- Google Chrome ≥ 110
- Microsoft Edge ≥ 110
- No se requiere compatibilidad con Internet Explorer, Firefox ni Safari (contexto corporativo Chrome/Edge).

### RNF-03 · Sin dependencias externas
El archivo (o conjunto de archivos) debe funcionar completamente sin conexión a internet. No se deben cargar librerías desde CDN en tiempo de ejecución. Cualquier dependencia debe estar embebida o bundleada en los archivos del proyecto.

---

## Performance

### RNF-04 · Tiempo de carga del CSV
El procesamiento y renderizado de un CSV con hasta **5.000 filas** debe completarse en menos de **3 segundos** desde la selección del archivo.

### RNF-05 · Respuesta de filtros
La actualización de la lista al aplicar o quitar un filtro debe ocurrir en menos de **200 ms** percibidos por el usuario, incluyendo para el universo completo de 5.000 advertisers.

### RNF-06 · Búsqueda incremental
El filtro de texto libre usa debounce de **250 ms** para evitar re-renders en cada tecla.

### RNF-07 · Renderizado de lista
La lista de advertisers usa renderizado virtualizado o paginación si supera **200 filas visibles**, para evitar degradación de rendimiento en el DOM.

---

## Persistencia y Datos

### RNF-08 · Almacenamiento de tags
Los tags se almacenan en `localStorage` del navegador. El tamaño total del objeto de tags no debe superar **2 MB** para evitar problemas de cuota (ver `08-storage-strategy.md`).

### RNF-09 · Integridad de datos
Los tags no se pierden si el usuario recarga la página o cierra y reabre el navegador, siempre que use el mismo navegador y perfil.

### RNF-10 · CSV no persistido
El contenido del CSV **no** se almacena en `localStorage` ni en ningún almacenamiento persistente del navegador. Solo existe en memoria durante la sesión activa.

---

## Usabilidad

### RNF-11 · Tiempo de orientación
Un usuario nuevo sin capacitación debe ser capaz de cargar un CSV, aplicar un filtro y tipificar un advertiser en menos de **5 minutos** la primera vez.

### RNF-12 · Sin instalación
No requiere ningún proceso de instalación. El usuario abre el archivo HTML directamente o navega a la URL local.

### RNF-13 · Resolución mínima
La interfaz debe ser usable en resoluciones de pantalla de al menos **1280 × 768 px**. No se requiere diseño responsive para mobile.

### RNF-14 · Feedback visual de acciones
Toda acción del usuario que modifique datos (guardar tag, importar JSON, exportar) debe producir feedback visual inmediato (toast, badge de confirmación, o indicador de estado).

---

## Seguridad y Privacidad

### RNF-15 · Sin transmisión de datos
La herramienta no envía ningún dato a servidores externos. Todo el procesamiento ocurre en el navegador del usuario.

### RNF-16 · Sin telemetría
No se incluye ningún script de analytics, rastreo o monitoreo externo.

### RNF-17 · Datos en localStorage
El `localStorage` contiene únicamente los tags y notas generados por el usuario, no los datos del CSV. Los tags se almacenan bajo una clave con prefijo de ciclo para evitar contaminación entre ciclos.

---

## Mantenibilidad

### RNF-18 · Código autocontenido
El código JavaScript debe ser vanilla JS (ES5/ES6), sin frameworks, para minimizar la curva de mantenimiento y facilitar modificaciones rápidas.

### RNF-19 · Estructura de archivos clara
El proyecto debe tener una estructura de archivos separados (`index.html`, `style.css`, `app.js`, `data/tags-default.json`) para facilitar modificaciones sin reescribir el archivo completo.

### RNF-20 · Variables de configuración centralizadas
Los valores configurables (nombre del ciclo, taxonomía de tags, colores por segmento) deben estar en un archivo de configuración separado (`config.js` o sección `CONFIG` al inicio de `app.js`), no dispersos en el código.
