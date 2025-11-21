# Configuración de Botón de Pago Yappy

Este documento describe cómo configurar la integración del **Botón de Pago Yappy** según la documentación oficial: https://www.yappy.com.pa/comercial/desarrolladores/boton-de-pago-yappy-nueva-integracion/

## Variables de Entorno Requeridas

Agrega las siguientes variables a tu archivo `.env.local` o `.env`:

```env
# Botón de Pago Yappy Configuration
YAPPY_MERCHANT_ID=MVZQO-44905104
YAPPY_SECRET_KEY=WVBfODgwRTBCQkItNjBEOS0zQzlBLUIzMTAtNzc2MzA1Q0RCRkY2
YAPPY_BUTTON_API_URL=https://apipagosbg.bgeneral.cloud
YAPPY_DOMAIN=https://tdp-eosin.vercel.app
YAPPY_WEBHOOK_URL=https://tdp-eosin.vercel.app/api/yappy/button/ipn

# Para el frontend (componente web)
NEXT_PUBLIC_YAPPY_MERCHANT_ID=MVZQO-44905104
```

### Valores Actuales Configurados

- **YAPPY_MERCHANT_ID**: `MVZQO-44905104` (ID de comercio)
- **YAPPY_SECRET_KEY**: `WVBfODgwRTBCQkItNjBEOS0zQzlBLUIzMTAtNzc2MzA1Q0RCRkY2` (Clave secreta)
- **YAPPY_BUTTON_API_URL**: `https://apipagosbg.bgeneral.cloud` (URL de API para Botón de Pago - Producción)
- **YAPPY_DOMAIN**: `https://tdp-eosin.vercel.app` (Dominio configurado en Yappy Comercial)
- **YAPPY_WEBHOOK_URL**: `https://tdp-eosin.vercel.app/api/yappy/button/ipn` (URL del IPN)
- **NEXT_PUBLIC_YAPPY_MERCHANT_ID**: `MVZQO-44905104` (Para el componente web del frontend)

### URLs de API según Ambiente

**Producción:**
- API: `https://apipagosbg.bgeneral.cloud`
- CDN Botón: `https://bt-cdn.yappy.cloud/v1/cdn/web-component-btn-yappy.js`

**Pruebas (UAT):**
- API: `https://api-comecom-uat.yappycloud.com`
- CDN Botón: `https://bt-cdn-uat.yappycloud.com/v1/cdn/web-component-btn-yappy.js`

## Configuración del IPN (Instant Payment Notification)

### ¿Dónde está el IPN?

El endpoint del IPN está implementado en:
- **Ruta**: `/api/yappy/button/ipn`
- **Método**: `GET` (Yappy envía los parámetros como query string)
- **Archivo**: `src/app/api/yappy/button/ipn/route.ts`

**Nota**: El Botón de Pago Yappy usa **IPN (Instant Payment Notification)** en lugar de webhooks. Yappy redirige al usuario a esta URL después del pago con los parámetros `orderId`, `status`, `domain` y `hash`.

### ¿Cómo configurar el IPN URL?

El IPN URL se configura en el portal de Yappy Comercial cuando creas el Botón de Pago:

#### URL de Producción:
```env
YAPPY_WEBHOOK_URL=https://tdp-eosin.vercel.app/api/yappy/button/ipn
```

**✅ Configurado para este proyecto**: `https://tdp-eosin.vercel.app/api/yappy/button/ipn`

### Configurar el Botón de Pago en el Portal de Yappy Comercial

1. Accede al portal de Yappy Comercial: https://comercial.yappy.com.pa
2. Inicia sesión con tus credenciales
3. Ve a **"Métodos de cobro"** → **"Botón de Pago Yappy"**
4. Selecciona una plataforma de desarrollo propio (Node.JS)
5. Llena los datos:
   - **URL del sitio**: `https://tdp-eosin.vercel.app`
   - Haz clic en **"Activar"**
6. Genera tu clave secreta haciendo clic en **"Generar clave secreta"**
7. Copia las credenciales:
   - **ID de comercio**: `MVZQO-44905104`
   - **Clave Secreta**: `WVBfODgwRTBCQkItNjBEOS0zQzlBLUIzMTAtNzc2MzA1Q0RCRkY2`
8. El IPN URL se configura automáticamente cuando creas la orden desde tu backend

**Importante**: 
- El dominio debe coincidir exactamente con el configurado en Yappy Comercial
- El IPN URL se envía en cada creación de orden (parámetro `ipnUrl`)
- No hay opción de webhook en el portal, se usa IPN mediante redirección

**Nota importante**: El webhook debe ser accesible públicamente. Yappy no puede enviar webhooks a `localhost` o URLs privadas.

### Verificar que el Webhook Funciona

Para verificar que el webhook está funcionando:

1. Realiza un pago de prueba en el checkout
2. Completa el pago en la aplicación Yappy
3. Revisa los logs del servidor para ver si Yappy envió el webhook
4. Verifica en la base de datos que el ticket se actualizó a estado "paid"

## Flujo de Pago con Botón de Pago Yappy

1. Usuario selecciona Yappy como método de pago en el checkout
2. Sistema crea un ticket en estado "pending"
3. Sistema crea una orden en Yappy usando `/payments/payment-wc`
4. Sistema muestra el componente web `<btn-yappy>` con el orderId
5. Usuario hace clic en el botón de Yappy
6. Usuario completa el pago en la aplicación Yappy
7. Yappy redirige al usuario a `/api/yappy/button/ipn` con parámetros:
   - `orderId`: ID de la orden
   - `status`: Estado del pago (APPROVED, REJECTED, etc.)
   - `domain`: Dominio configurado
   - `hash`: Hash de validación HMAC SHA-256
8. Sistema valida el hash y actualiza el ticket a estado "paid"

## Endpoints de la API

### Botón de Pago Yappy:
- `POST /api/yappy/button/validate` - Validar comercio y obtener token
- `POST /api/yappy/button/create-order` - Crear orden de pago
- `GET /api/yappy/button/ipn` - Recibir notificación instantánea de pago (IPN)
- `POST /api/public/payments/yappy` - Iniciar pago (crea ticket y orden)

### APIs de Yappy (backend):
- `POST /payments/validate/merchant` - Validar comercio (Yappy API)
- `POST /payments/payment-wc` - Crear orden (Yappy API)

## Notas Importantes

- **Validación de Hash**: El IPN valida el hash usando `HMAC SHA-256(orderId + status + domain)` con la primera parte de la clave secreta decodificada
- **Componente Web**: El botón de Yappy se carga desde el CDN oficial de Yappy
- **OrderId**: Debe ser alfanumérico, máximo 15 caracteres
- **IPN URL**: Se envía en cada creación de orden, debe ser accesible públicamente
- **Dominio**: Debe coincidir exactamente con el configurado en Yappy Comercial
- **Seguridad**: El IPN valida el hash antes de procesar el pago para evitar fraudes

## Estructura del IPN

El IPN recibe una redirección de Yappy después del pago con los siguientes parámetros GET:

- `orderId`: ID de la orden creada
- `status`: Estado del pago (`APPROVED`, `REJECTED`, etc.)
- `domain`: Dominio configurado en Yappy Comercial
- `hash`: Hash de validación HMAC SHA-256

El IPN automáticamente:
1. Valida el hash usando la clave secreta
2. Si el hash es válido y el status es `APPROVED`, actualiza el ticket a estado "paid"
3. Actualiza el registro de pago en la base de datos
4. Retorna `{ success: true }` a Yappy

## Testing

### Pruebas Locales (con ngrok)

1. Instala ngrok: `npm install -g ngrok` o descarga desde [ngrok.com](https://ngrok.com)
2. Inicia tu servidor local: `npm run dev`
3. En otra terminal, ejecuta: `ngrok http 3000`
4. Copia la URL de ngrok (ej: `https://abc123.ngrok.io`)
5. Configura `YAPPY_WEBHOOK_URL=https://abc123.ngrok.io/api/yappy/webhook` en `.env.local`
6. Configura esta URL en el portal de Yappy Comercial
7. Realiza un pago de prueba

### Pruebas en Producción

1. Asegúrate de que tu aplicación esté desplegada y accesible
2. Configura `YAPPY_WEBHOOK_URL` con la URL de producción
3. Configura esta URL en el portal de Yappy Comercial
4. Realiza un pago de prueba
5. Verifica los logs para confirmar que el webhook se recibió correctamente

### Verificar que Todo Funciona

1. ✅ Configura las variables de entorno en `.env.local`
2. ✅ Inicia el servidor: `npm run dev`
3. ✅ Ve al checkout y selecciona Yappy como método de pago
4. ✅ Verifica que se crea el ticket en estado "pending"
5. ✅ Completa el pago en la aplicación Yappy
6. ✅ Verifica que el webhook se recibe (revisa logs del servidor)
7. ✅ Verifica que el ticket se actualiza a estado "paid" en la base de datos

