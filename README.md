# Consulta Perfil Retención

Mini webapp temporal para consultar, filtrar y tipificar advertisers del primer ciclo operativo del Motor de Retención Proactiva.

La aplicación funciona completamente en el navegador, sin backend, sin instalación y sin dependencias externas en tiempo de ejecución. Está pensada para abrirse con `file://` o desde un servidor estático local.

## Qué hace

- Carga un CSV exportado desde `vw_ret_list_operativa`.
- Permite filtrar por nivel de riesgo, acción, segmento, texto libre y estado de tipificación.
- Muestra el perfil completo del advertiser seleccionado.
- Permite asignar uno o varios tags predefinidos y una nota libre.
- Guarda las tipificaciones en `localStorage` por ciclo.
- Exporta e importa tags en JSON.
- Exporta la lista filtrada a CSV.
- Incluye modo foco: al seleccionar un cliente se contrae la lista para priorizar el perfil y la tipificación.

## Archivos principales

- `index.html` — estructura de la interfaz.
- `style.css` — estilos visuales.
- `app.js` — lógica principal de carga, filtros, tipificación y exportación.
- `config.js` — configuración central y taxonomía.
- `lib/papaparse.min.js` — parser CSV local.
- `lib/dayjs.min.js` — formateo de fechas local.
- `data/tags-taxonomy.json` — taxonomía de tags.
- `data/tags-default.json` — store base de tags.
- `staticwebapp.config.json` — configuración opcional para Azure Static Web Apps.

## Requisitos de uso

- Navegador moderno: Chrome 110+ o Edge 110+.
- No se requiere Node.js ni instalación de paquetes.
- El CSV debe contener al menos estas columnas:
  - `advertiser_id`
  - `assigned_label_code`

## Cómo usarla

1. Abrir `index.html` en el navegador, o servir la carpeta con un servidor estático local.
2. Hacer clic en `Cargar CSV` y seleccionar el archivo del ciclo.
3. Aplicar filtros para reducir el universo.
4. Seleccionar un advertiser de la lista.
5. Tipificar desde el panel inferior derecho y escribir una nota si aplica.
6. Exportar los tags en JSON o la lista filtrada en CSV si lo necesitas.

## Modo foco

Al seleccionar un advertiser, la vista entra en modo foco y la lista superior se contrae para dejar más espacio al perfil y la tipificación.

- Botón `Mostrar lista` o `Mostrar foco` para alternar manualmente.
- Si no hay advertiser seleccionado, la vista vuelve al estado normal.

## Formato del CSV

La app acepta variantes comunes de nombres de columna mediante aliases. El formato esperado está documentado en `spec/04-csv-format.md`.

Ejemplo mínimo válido:

```csv
advertiser_id,assigned_label_code
12345,CQ
67890,VP
```

## Tipificación

Los tags disponibles están definidos en la taxonomía del proyecto y se agrupan en tres categorías:

- Estado de gestión
- Resultado del contacto
- Cierre de gestión

Un advertiser puede tener múltiples tags simultáneos. La nota libre tiene un máximo de 500 caracteres.

## Persistencia

- El CSV cargado vive solo en memoria durante la sesión.
- Los tags y notas se guardan en `localStorage` con una clave por ciclo.
- La exportación JSON permite compartir el estado con otros operadores.

## Exportación e importación

- `Exportar tags` descarga un JSON con el store del ciclo activo.
- `Importar tags` fusiona o reemplaza registros según la opción elegida.
- `Exportar lista` descarga un CSV con la lista actualmente filtrada y las anotaciones.

## Despliegue en Azure

La app puede publicarse como sitio estático con Azure Static Web Apps. La configuración base está en `staticwebapp.config.json`.

Para despliegue manual local, solo copiar estos archivos al hosting estático:

- `index.html`
- `style.css`
- `app.js`
- `config.js`
- `lib/`
- `data/`
- `staticwebapp.config.json` si se usa Azure

## Referencias del proyecto

- Visión general: `spec/00-overview.md`
- Requerimientos funcionales: `spec/01-functional-requirements.md`
- Modelo de datos: `spec/03-data-model.md`
- Formato CSV: `spec/04-csv-format.md`
- Reglas de tagging: `spec/05-tagging-rules.md`
- Flujo UI/UX: `spec/06-ui-ux-flow.md`
- Contrato interno de módulos: `spec/07-api-contract.md`
- Estrategia de almacenamiento: `spec/08-storage-strategy.md`
- Seguridad y acceso: `spec/10-security-and-access.md`
- Consideraciones de rendimiento: `spec/11-performance-considerations.md`
- Criterios de aceptación: `spec/12-acceptance-criteria.md`

## Notas

- La app no envía datos a ningún servidor.
- No almacena el CSV en disco ni en `localStorage`.
- Está diseñada para uso operativo temporal, no como sistema permanente.
