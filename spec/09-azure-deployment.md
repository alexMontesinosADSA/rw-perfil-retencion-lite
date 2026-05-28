# 09 — Despliegue en Azure (Opcional)

---

## Cuándo aplica

Este documento describe cómo desplegar la herramienta como sitio estático en Azure si el equipo necesita acceso compartido desde múltiples equipos o fuera de la red local. Para uso en una sola máquina (modo `file://` o `http://localhost`), este paso es innecesario.

---

## Opción recomendada: Azure Static Web Apps

### Por qué Static Web Apps
- Servicio gratuito (Free tier) para sitios estáticos.
- Deploy directo desde una carpeta de archivos sin configuración de servidor.
- HTTPS automático con dominio `.azurestaticapps.net`.
- Compatible con la naturaleza de la app (solo HTML + CSS + JS).

### Prerrequisitos
- Cuenta de Azure activa.
- Azure CLI instalado localmente (o uso del portal web).
- El código fuente en un repositorio Git (GitHub, Azure DevOps, o GitLab).

---

## Estructura de archivos para deploy

```
ConsultaPerfilRetencion/
├── index.html
├── style.css
├── app.js
└── data/
    └── tags-default.json      ← Archivo vacío de tags para inicialización opcional
```

No se requiere carpeta `/api` ni funciones serverless.

---

## Pasos de despliegue (Azure Portal)

1. Ir a **Azure Portal → Crear recurso → Static Web App**.
2. Configurar:
   - **Nombre**: `consulta-retencion-sp1`
   - **Plan**: Free
   - **Región**: la más cercana (East US 2 o Brasil South)
   - **Fuente**: conectar con repositorio Git
3. En la configuración de build:
   - **App location**: `/` (raíz del proyecto)
   - **Output location**: `/` (no hay build step)
   - **API location**: vacío
4. Completar el deploy. Azure genera una URL tipo `https://consulta-retencion-sp1.azurestaticapps.net`.

---

## Pasos de despliegue (Azure CLI)

```bash
# Login
az login

# Crear el recurso
az staticwebapp create \
  --name consulta-retencion-sp1 \
  --resource-group rg-retencion \
  --location "eastus2" \
  --sku Free

# Deploy de archivos locales (sin repositorio Git)
az staticwebapp deploy \
  --name consulta-retencion-sp1 \
  --source "C:\proyectosNet\ConsultaPerfilRetencion" \
  --no-build
```

---

## Consideraciones de seguridad en Azure

### Autenticación (opcional)
Para un acceso controlado sin implementar autenticación en la app misma, se puede configurar **Static Web Apps Authentication** con Azure AD:

```json
// staticwebapp.config.json — agregar en la raíz del proyecto
{
  "auth": {
    "identityProviders": {
      "azureActiveDirectory": {
        "registration": {
          "openIdIssuer": "https://login.microsoftonline.com/{tenant-id}/v2.0",
          "clientIdSettingName": "AZURE_CLIENT_ID",
          "clientSecretSettingName": "AZURE_CLIENT_SECRET"
        }
      }
    }
  },
  "routes": [
    {
      "route": "/*",
      "allowedRoles": ["authenticated"]
    }
  ]
}
```

Esto restringe el acceso a usuarios autenticados en el tenant de la organización, sin código adicional en la app.

### Limitaciones de localStorage en Azure
Si varios usuarios acceden desde diferentes navegadores, cada uno tiene su propio `localStorage` independiente. Los tags **no se comparten** automáticamente entre usuarios. Para sincronización multi-usuario se requiere un backend (fuera del alcance del MVP).

**Workaround para equipo pequeño:** usar el flujo de exportar/importar JSON para compartir el archivo de tags entre operadores.

---

## Actualización del deploy

Para actualizar la app después de cambios en los archivos:

```bash
az staticwebapp deploy \
  --name consulta-retencion-sp1 \
  --source "C:\proyectosNet\ConsultaPerfilRetencion" \
  --no-build
```

O mediante push al repositorio Git si está conectado (Azure redespliega automáticamente).

---

## Alternativa: Azure Blob Storage como sitio estático

Si Static Web Apps presenta restricciones organizacionales:

1. Crear un Storage Account con "Static website" habilitado.
2. Subir los archivos al contenedor `$web`.
3. La URL queda como `https://{account}.z6.web.core.windows.net`.

Esta opción no soporta autenticación integrada, pero es más simple de configurar.
