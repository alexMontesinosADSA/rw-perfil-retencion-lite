# Prompt Plan de Instalacion y Despliegue en Azure

## Objetivo

Desplegar la webapp de Consulta Perfil Retencion en **Azure Static Web Apps** como sitio estatico, sin backend, manteniendo el comportamiento local ya implementado en el repo.

## Alcance

- Publicar `index.html`, `style.css`, `app.js`, `config.js`, `lib/`, `data/` y `staticwebapp.config.json`.
- Mantener el uso de `localStorage` para tags y notas.
- Exponer la app por HTTPS en Azure.
- Opcionalmente restringir acceso con Azure AD si la organizacion lo requiere.

## Repositorio base

Archivos relevantes:

- `index.html`
- `style.css`
- `app.js`
- `config.js`
- `lib/papaparse.min.js`
- `lib/dayjs.min.js`
- `data/tags-taxonomy.json`
- `data/tags-default.json`
- `staticwebapp.config.json`
- `README.md`

## Requisitos previos

- Cuenta activa de Azure.
- Permisos para crear recursos en el subscription objetivo.
- Repositorio Git con acceso al codigo fuente.
- Navegador Chrome o Edge para pruebas manuales.

## Decisiones tecnicas

- Servicio elegido: **Azure Static Web Apps**.
- Tipo de despliegue: **sitio estatico sin build**.
- App location: raiz del proyecto.
- Output location: raiz del proyecto.
- API location: vacio.

## Instalacion en Azure

### Opcion A: Azure Portal

1. Crear un recurso **Static Web App**.
2. Definir nombre del recurso, por ejemplo `consulta-retencion-sp1`.
3. Elegir plan **Free** si el uso lo permite.
4. Vincular el repositorio Git correspondiente.
5. Configurar la build con estos valores:
   - App location: `/`
   - Output location: `/`
   - API location: dejar vacio
6. Completar el deploy inicial.
7. Confirmar que Azure publique una URL similar a `https://<app>.azurestaticapps.net`.

### Opcion B: Azure CLI

1. Iniciar sesion en Azure.
2. Crear el recurso Static Web App.
3. Desplegar la carpeta del proyecto sin build step.
4. Verificar la URL final emitida por Azure.

## Configuracion del sitio

- `staticwebapp.config.json` ya define el fallback a `index.html`.
- Las rutas `spec/*` quedan excluidas por configuracion local y no deben ser parte del sitio publicado.
- No se requieren endpoints de API.

## Validacion post-despliegue

Verificar manualmente estos puntos:

1. La pagina carga sin errores en la URL de Azure.
2. El boton **Cargar CSV** abre el selector de archivo.
3. El CSV se procesa y la tabla muestra resultados.
4. Los filtros actualizan el listado.
5. Al seleccionar un advertiser, se activa el modo foco y se contrae la lista.
6. Los tags se guardan en `localStorage` del navegador.
7. Exportar JSON y exportar CSV descargan archivos correctamente.

## Criterios de exito

- La app abre por HTTPS y responde como sitio estatico.
- No se requiere backend para operar.
- La funcionalidad de filtros, perfil, tipificacion y exportacion funciona igual que en local.
- Los tags persisten por ciclo en el navegador.

## Manejo de acceso

### Sin autenticacion

Usar si la app solo se expone internamente mediante URL controlada.

### Con Azure AD

Si la organizacion requiere control de acceso, habilitar autenticacion de Static Web Apps con Azure AD y restringir rutas a usuarios autenticados.

## Plan de despliegue operativo

1. Congelar cambios funcionales del ciclo.
2. Validar localmente con un CSV real o sample.
3. Publicar a Azure Static Web Apps.
4. Probar carga, filtros, tipificacion y exportaciones en la URL publicada.
5. Compartir la URL con el equipo operativo.
6. Registrar la URL y el ciclo activo.

## Rollback

Si el despliegue introduce una regresion:

1. Volver a la version anterior del contenido estatico en Azure.
2. Confirmar que la URL previa vuelve a cargar correctamente.
3. Mantener los JSON exportados como respaldo externo de los tags.

## Mantenimiento minimo

- Actualizar `README.md` si cambia la forma de despliegue.
- Mantener la taxonomia de tags en `config.js` y `data/tags-taxonomy.json`.
- No mover el CSV a almacenamiento persistente del navegador.
- Revalidar la URL publicada en cada nuevo ciclo.
