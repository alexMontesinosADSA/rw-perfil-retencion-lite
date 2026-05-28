# 00 — Visión General del Proyecto

## Nombre del proyecto

**Consulta de Perfil de Retención — Herramienta de Gestión del Primer Ciclo**
Carpeta de proyecto sugerida: `ConsultaPerfilRetencion`

---

## Propósito

Mini webapp de uso temporal para gestionar de forma controlada el resultado del **primer ciclo operativo del Motor de Retención Proactiva (Sprint 1)**. Cubre dos necesidades que el storyboard ejecutivo no cubre:

1. **Consulta y filtrado** del universo de advertisers clasificados, con filtros operativos por nivel de riesgo y acción asignada.
2. **Tipificación (tagging)** de advertisers contactados durante la gestión del ciclo, con almacenamiento local sin base de datos.

---

## Contexto

- El Motor de Retención Proactiva produce una lectura mensual del universo de clientes (advertisers) con una clasificación de riesgo, señales activas y una acción operativa sugerida.
- Los resultados del ciclo se publican a través de la vista `vw_ret_list_operativa` y se exportan como CSV.
- Esta herramienta consume ese CSV directamente. No tiene conexión a base de datos.
- Su vida útil estimada es de **2 a 4 semanas** (gestión del primer ciclo). Puede reutilizarse en ciclos siguientes con un nuevo CSV.

---

## Relación con el Storyboard Ejecutivo

El storyboard (`Dashboard_Ejecutivo_Retencion_SP1`) es un artefacto de presentación. Esta herramienta es un artefacto **operativo**: permite a los equipos de retención explorar, filtrar y anotar el universo de forma práctica, no sólo visualizarlo.

---

## Alcance del MVP

| Incluido | Excluido |
|---|---|
| Carga de CSV del modelo | Conexión directa a BD |
| Filtros por nivel de riesgo y acción | Edición de clasificaciones del modelo |
| Vista de perfil completo de señales | Historial de cambios entre ciclos |
| Tipificación con tags predefinidos | Autenticación de usuarios |
| Nota libre por advertiser | Envío de notificaciones |
| Exportar/importar tags como JSON | Integración con CRM externo |
| Exportar lista tipificada como CSV | Multi-usuario concurrente |

---

## Restricciones técnicas clave

- Debe funcionar en `file://` (sin servidor) y en `http://localhost`.
- Sin dependencias externas (CDN, npm, backend). Un solo archivo HTML o archivos locales.
- Compatible con Chrome y Edge modernos.
- Datos sensibles del cliente no deben salir del entorno local.
- Tags almacenados en `localStorage` del navegador + exportables como JSON.

---

## Usuarios objetivo

| Rol | Uso principal |
|---|---|
| Analista de retención | Consulta de perfiles, filtrado por segmento |
| Ejecutivo de cuenta / CAC | Tipificación de contactos gestionados |
| Coordinador de retención | Monitoreo del progreso de tipificación del ciclo |

---

## Criterios de éxito del proyecto

1. El equipo puede cargar el CSV del ciclo y explorar cualquier advertiser en menos de 10 segundos.
2. Se pueden tipificar al menos 50 advertisers en una sesión sin pérdida de datos.
3. El archivo de tags puede exportarse, compartirse y reimportarse sin pérdida.
4. No se requiere ningún soporte técnico para que un usuario nuevo comience a usar la herramienta.

---

## Archivos relacionados

| Archivo | Descripción |
|---|---|
| `04-csv-format.md` | Formato exacto del CSV de entrada |
| `03-data-model.md` | Estructura de datos de advertisers y tags |
| `05-tagging-rules.md` | Taxonomía de tipificaciones y reglas de negocio |
| `06-ui-ux-flow.md` | Flujo de pantalla y layout |
| `08-storage-strategy.md` | Estrategia de almacenamiento sin BD |
| `12-acceptance-criteria.md` | Criterios de aceptación ejecutables |
