# Configuración de PagueloFacil

Este documento describe cómo configurar la integración con PagueloFacil para procesar pagos.

## Documentación Oficial

- **Base de Conocimientos**: https://soporte.paguelofacil.com/portal/es/kb/paguelofacil/integraciones/e-commerce
- **Portal de Negocios**: https://www.paguelofacil.com/

## Variables de Entorno Requeridas

Agrega las siguientes variables a tu archivo `.env.local` o `.env`:

```env
# PagueloFacil Configuration
PAGUELOFACIL_CCLW=tu_cclw_aqui
PAGUELOFACIL_ACCESS_TOKEN=tu_access_token_aqui
PAGUELOFACIL_API_URL=https://api.paguelofacil.com
PAGUELOFACIL_WEBHOOK_URL=https://tdp-eosin.vercel.app/api/public/payments/paguelofacil/webhook
```

### Valores a Configurar

- **PAGUELOFACIL_CCLW**: Código CCLW obtenido de "Mi Empresa" → "Llaves" en el portal de PagueloFacil
- **PAGUELOFACIL_ACCESS_TOKEN**: Token de acceso obtenido de "Mi Empresa" → "Llaves" en el portal de PagueloFacil
- **PAGUELOFACIL_API_URL**: URL base de la API (producción: `https://api.paguelofacil.com`)
- **PAGUELOFACIL_WEBHOOK_URL**: URL del webhook para recibir notificaciones de pago

## Obtener Credenciales

1. Accede al portal de PagueloFacil Business: https://www.paguelofacil.com/
2. Inicia sesión con tu cuenta de negocio
3. Ve a **"Mi Empresa"** → **"Llaves"**
4. Copia las siguientes credenciales:
   - **CCLW**: Código único de tu empresa
   - **Access Token**: Token de autorización para la API

## Configuración del Webhook

### ¿Dónde está el webhook?

El endpoint del webhook está implementado en:
- **Ruta**: `/api/public/payments/paguelofacil/webhook`
- **Método**: `POST`
- **Archivo**: `src/app/api/public/payments/paguelofacil/webhook/route.ts`

### ¿Cómo configurar el Webhook URL?

El webhook URL depende de dónde esté desplegada tu aplicación:

#### Si estás en Vercel:
```env
PAGUELOFACIL_WEBHOOK_URL=https://tdp-eosin.vercel.app/api/public/payments/paguelofacil/webhook
```

**✅ Configurado para este proyecto**: `https://tdp-eosin.vercel.app/api/public/payments/paguelofacil/webhook`

#### Si estás en un dominio personalizado:
```env
PAGUELOFACIL_WEBHOOK_URL=https://www.tudominio.com/api/public/payments/paguelofacil/webhook
```

#### Si estás en desarrollo local (solo para pruebas con ngrok):
```env
# Usa ngrok para exponer tu localhost
# ngrok http 3000
# Luego usa la URL de ngrok:
PAGUELOFACIL_WEBHOOK_URL=https://abc123.ngrok.io/api/public/payments/paguelofacil/webhook
```

### Configurar el Webhook en el Portal de PagueloFacil

1. Accede al portal de PagueloFacil Business
2. Ve a **"Configuración"** o **"Webhooks"**
3. Ingresa la URL completa del webhook:
   - **URL para este proyecto**: `https://tdp-eosin.vercel.app/api/public/payments/paguelofacil/webhook`
4. Guarda la configuración

## Flujo de Pago

1. Usuario selecciona PagueloFacil como método de pago en el checkout
2. Sistema crea un ticket en estado "pending"
3. Sistema inicia el pago con PagueloFacil usando CCLW y Access Token
4. Usuario es redirigido a PagueloFacil para completar el pago
5. PagueloFacil procesa el pago y redirige al usuario de vuelta
6. PagueloFacil envía webhook a `/api/public/payments/paguelofacil/webhook`
7. Sistema verifica la transacción y marca el ticket como "paid"

## Endpoints de la API

- `POST /api/public/payments/paguelofacil` - Iniciar pago con PagueloFacil
- `POST /api/public/payments/paguelofacil/webhook` - Recibir notificaciones de PagueloFacil

## Estructura del Webhook

El webhook recibe notificaciones de PagueloFacil cuando:
- Un pago se completa exitosamente
- Un pago es rechazado
- Una transacción cambia de estado

El webhook automáticamente:
1. Verifica la transacción con PagueloFacil
2. Actualiza el ticket a estado "paid" si el pago fue exitoso
3. Actualiza el registro de pago en la base de datos

## Notas Importantes

- **Autenticación**: PagueloFacil usa CCLW y Access Token para autenticación
- **Webhooks**: Deben ser accesibles públicamente (no funcionan en localhost sin ngrok)
- **Seguridad**: El webhook valida las notificaciones de PagueloFacil antes de procesarlas
- **Ambiente**: Asegúrate de usar las credenciales correctas para pruebas o producción

## Pruebas

Para probar la integración:

1. Realiza un pago de prueba en el checkout
2. Completa el pago en PagueloFacil
3. Revisa los logs del servidor para ver si PagueloFacil envió el webhook
4. Verifica en la base de datos que el ticket se actualizó a estado "paid"

## Soporte

Para más información o soporte, consulta:
- Base de Conocimientos: https://soporte.paguelofacil.com/portal/es/kb/paguelofacil/integraciones/e-commerce
- Portal de Negocios: https://www.paguelofacil.com/

