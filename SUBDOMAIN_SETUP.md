# Configuración de Subdominios para PWAs

Este documento explica cómo configurar subdominios separados para cada PWA en Vercel.

## Subdominios Configurados

- **admin.pimetransport.com** → Panel de administración (`/dashboard`)
- **driver.pimetransport.com** → Aplicación para choferes (`/mobile/driver`)
- **assistant.pimetransport.com** → Aplicación para ayudantes (`/mobile/assistant`)
- **scanner.pimetransport.com** → Escáner de códigos QR (`/scanner`)
- **pos.pimetransport.com** → Terminal POS (`/pos`)
- **www.pimetransport.com** o **pimetransport.com** → Sitio público (`/`)

## Configuración en Vercel

### Paso 1: Agregar Dominio Principal

1. Ve a tu proyecto en Vercel Dashboard
2. Ve a **Settings** → **Domains**
3. Agrega tu dominio principal: `pimetransport.com`
4. Sigue las instrucciones para verificar el dominio (agregar registros DNS)

### Paso 2: Agregar Subdominios

Para cada subdominio, agrega un nuevo dominio en Vercel:

1. En **Settings** → **Domains**, haz clic en **Add Domain**
2. Ingresa el subdominio (ej: `admin.pimetransport.com`)
3. Vercel automáticamente detectará que es un subdominio y lo configurará

**Subdominios a agregar:**
- `admin.pimetransport.com`
- `driver.pimetransport.com`
- `assistant.pimetransport.com`
- `scanner.pimetransport.com`
- `pos.pimetransport.com`
- `www.pimetransport.com` (opcional, redirige a dominio principal)

### Paso 3: Configurar DNS

En tu proveedor de DNS (donde compraste el dominio), agrega los siguientes registros:

#### Opción A: Usar CNAME (Recomendado)

```
admin       CNAME   cname.vercel-dns.com
driver      CNAME   cname.vercel-dns.com
assistant   CNAME   cname.vercel-dns.com
scanner     CNAME   cname.vercel-dns.com
pos         CNAME   cname.vercel-dns.com
www         CNAME   cname.vercel-dns.com
```

#### Opción B: Usar A Record (Si CNAME no está disponible)

Vercel te dará una IP específica cuando agregues cada dominio. Usa esa IP para los registros A.

### Paso 4: Verificar Configuración

Después de agregar los dominios en Vercel y configurar DNS:

1. Espera 5-10 minutos para que los cambios de DNS se propaguen
2. Verifica cada subdominio:
   - `https://admin.pimetransport.com` → Debe mostrar el dashboard
   - `https://driver.pimetransport.com` → Debe mostrar la app de chofer
   - `https://assistant.pimetransport.com` → Debe mostrar la app de ayudante
   - `https://scanner.pimetransport.com` → Debe mostrar el escáner
   - `https://pos.pimetransport.com` → Debe mostrar el POS

## Configuración de Variables de Entorno

Actualiza las variables de entorno en Vercel para cada subdominio:

### Variable: `NEXT_PUBLIC_APP_URL`

Debe apuntar al dominio principal:
```
NEXT_PUBLIC_APP_URL=https://pimetransport.com
```

### Variables de Webhooks

Actualiza las URLs de webhooks en las pasarelas de pago:

**Yappy:**
```
YAPPY_DOMAIN=https://pimetransport.com
YAPPY_WEBHOOK_URL=https://pimetransport.com/api/yappy/button/ipn
```

**PagueloFacil:**
```
PAGUELOFACIL_WEBHOOK_URL=https://pimetransport.com/api/public/payments/paguelofacil/webhook
```

## Cómo Funciona

### Middleware de Subdominios

El archivo `src/middleware.ts` detecta automáticamente el subdominio y reescribe las peticiones a la ruta correcta usando `NextResponse.rewrite()`:

```typescript
// admin.pimetransport.com/ → /dashboard/ (internamente)
// driver.pimetransport.com/ → /mobile/driver/ (internamente)
// assistant.pimetransport.com/ → /mobile/assistant/ (internamente)
// scanner.pimetransport.com/ → /scanner/ (internamente)
// pos.pimetransport.com/ → /pos/ (internamente)
// pimetransport.com o www.pimetransport.com → / (público, sin rewrite)
```

**Nota**: El middleware usa `rewrite` en lugar de `redirect`, por lo que la URL en el navegador mantiene el subdominio pero el contenido se sirve desde la ruta interna correcta.

### Manifests Actualizados

Cada manifest ahora usa `start_url: "/"` y `scope: "/"` porque cada subdominio es una aplicación completamente separada.

### Service Workers

Cada PWA tiene su propio service worker con scope específico:
- `/sw-admin.js` → `admin.pimetransport.com`
- `/sw-driver.js` → `driver.pimetransport.com`
- `/sw-assistant.js` → `assistant.pimetransport.com`
- `/sw-scanner.js` → `scanner.pimetransport.com`
- `/sw-pos.js` → `pos.pimetransport.com`

## Ventajas de Subdominios Separados

1. **Instalación Separada**: Cada PWA se instala como una app independiente
2. **Service Workers Aislados**: Cada app tiene su propio service worker
3. **Cookies Separados**: Cada subdominio tiene sus propias cookies
4. **Mejor Seguridad**: Aislamiento entre aplicaciones
5. **Mejor UX**: Los usuarios pueden tener todas las apps instaladas simultáneamente

## Troubleshooting

### Los subdominios no funcionan

1. Verifica que los registros DNS estén configurados correctamente
2. Espera hasta 24 horas para la propagación completa de DNS
3. Verifica en Vercel Dashboard que los dominios estén verificados (verde)

### Error 404 en subdominios

1. Verifica que `vercel.json` esté en la raíz del proyecto
2. Verifica que el middleware esté funcionando correctamente
3. Revisa los logs de Vercel para ver errores

### Service Workers no funcionan

1. Verifica que cada manifest tenga el scope correcto (`/`)
2. Verifica que los service workers estén en `/public/`
3. Limpia el cache del navegador y reinstala la PWA

## Desarrollo Local

Para probar subdominios localmente, edita tu archivo `/etc/hosts` (Mac/Linux) o `C:\Windows\System32\drivers\etc\hosts` (Windows):

```
127.0.0.1 admin.localhost
127.0.0.1 driver.localhost
127.0.0.1 assistant.localhost
127.0.0.1 scanner.localhost
127.0.0.1 pos.localhost
```

Luego accede a:
- `http://admin.localhost:3000`
- `http://driver.localhost:3000`
- etc.

**Nota**: En desarrollo, Next.js puede requerir configuración adicional para manejar subdominios. El middleware debería funcionar automáticamente.

## Próximos Pasos

1. ✅ Configurar dominios en Vercel
2. ✅ Configurar registros DNS
3. ✅ Actualizar variables de entorno
4. ✅ Actualizar URLs de webhooks en pasarelas de pago
5. ✅ Probar cada subdominio
6. ✅ Instalar cada PWA en dispositivos de prueba

