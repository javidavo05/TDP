# Instrucciones de Configuración de Dominio - pimetransport.com

Este documento contiene las instrucciones paso a paso para configurar el dominio `pimetransport.com` y sus subdominios en Vercel.

## 📋 Resumen de Subdominios

- **admin.pimetransport.com** → Panel de administración
- **driver.pimetransport.com** → Aplicación para choferes
- **assistant.pimetransport.com** → Aplicación para ayudantes
- **scanner.pimetransport.com** → Escáner de códigos QR
- **pos.pimetransport.com** → Terminal POS
- **pimetransport.com** o **www.pimetransport.com** → Sitio público

## 🚀 Paso 1: Configurar Dominio en Vercel

### 1.1 Agregar Dominio Principal

1. Ve a tu proyecto en [Vercel Dashboard](https://vercel.com/dashboard)
2. Selecciona tu proyecto **TDP**
3. Ve a **Settings** → **Domains**
4. Haz clic en **Add Domain**
5. Ingresa: `pimetransport.com`
6. Haz clic en **Add**
7. Vercel te mostrará instrucciones para verificar el dominio

### 1.2 Agregar Subdominios

Repite el proceso para cada subdominio:

1. En **Settings** → **Domains**, haz clic en **Add Domain**
2. Ingresa cada subdominio:
   - `admin.pimetransport.com`
   - `driver.pimetransport.com`
   - `assistant.pimetransport.com`
   - `scanner.pimetransport.com`
   - `pos.pimetransport.com`
   - `www.pimetransport.com` (opcional)
3. Vercel detectará automáticamente que son subdominios

## 🔧 Paso 2: Configurar DNS

Ve a tu proveedor de DNS (donde compraste el dominio `pimetransport.com`) y agrega los siguientes registros:

### Opción A: Usar CNAME (Recomendado)

Agrega estos registros CNAME en tu proveedor de DNS:

```
Tipo    Nombre          Valor
CNAME   admin           cname.vercel-dns.com
CNAME   driver          cname.vercel-dns.com
CNAME   assistant       cname.vercel-dns.com
CNAME   scanner         cname.vercel-dns.com
CNAME   pos             cname.vercel-dns.com
CNAME   www             cname.vercel-dns.com
```

**Para el dominio principal (`pimetransport.com`):**
- Vercel te dará instrucciones específicas (puede requerir un registro A o ALIAS)
- Sigue las instrucciones que Vercel muestra en el Dashboard

### Opción B: Usar Registros A (Si CNAME no está disponible)

Si tu proveedor de DNS no permite CNAME para el dominio raíz, Vercel te proporcionará una IP específica cuando agregues cada dominio. Usa esa IP para crear registros A.

## ⏱️ Paso 3: Esperar Propagación DNS

1. **Tiempo de propagación**: 5 minutos a 24 horas (normalmente 1-2 horas)
2. **Verificar estado**: En Vercel Dashboard → Domains, verás el estado de cada dominio
   - 🟡 **Pending** = Esperando verificación
   - 🟢 **Valid** = Configurado correctamente
   - 🔴 **Invalid** = Revisa la configuración DNS

## ✅ Paso 4: Verificar Funcionamiento

Después de que los dominios estén verificados (estado verde en Vercel):

1. Espera 5-10 minutos adicionales para que todo se propague
2. Prueba cada subdominio en tu navegador:
   - `https://admin.pimetransport.com` → Debe mostrar el dashboard
   - `https://driver.pimetransport.com` → Debe mostrar la app de chofer
   - `https://assistant.pimetransport.com` → Debe mostrar la app de ayudante
   - `https://scanner.pimetransport.com` → Debe mostrar el escáner
   - `https://pos.pimetransport.com` → Debe mostrar el POS
   - `https://pimetransport.com` → Debe mostrar el sitio público

## 🔐 Paso 5: Configurar Variables de Entorno en Vercel

1. Ve a **Settings** → **Environment Variables**
2. Actualiza o agrega las siguientes variables:

### Variable Principal
```
NEXT_PUBLIC_APP_URL=https://pimetransport.com
```

### Variables de Yappy (si las usas)
```
YAPPY_DOMAIN=https://pimetransport.com
YAPPY_WEBHOOK_URL=https://pimetransport.com/api/yappy/button/ipn
```

### Variables de PagueloFacil (si las usas)
```
PAGUELOFACIL_WEBHOOK_URL=https://pimetransport.com/api/public/payments/paguelofacil/webhook
```

### Variable de Email
```
RESEND_FROM_EMAIL=noreply@pimetransport.com
```

**Importante**: Después de cambiar las variables de entorno, necesitas hacer un nuevo deploy:
- Ve a **Deployments**
- Haz clic en los tres puntos (⋯) del último deployment
- Selecciona **Redeploy**

## 🔄 Paso 6: Actualizar URLs en Pasarelas de Pago

### Yappy Comercial

1. Accede al [Portal de Yappy Comercial](https://comercial.yappy.com.pa)
2. Ve a **Métodos de cobro** → **Botón de Pago Yappy**
3. Actualiza:
   - **URL del sitio**: `https://pimetransport.com`
   - El IPN URL se actualizará automáticamente cuando uses la nueva variable de entorno

### PagueloFacil

1. Accede al panel de PagueloFacil
2. Actualiza la URL del webhook a:
   - `https://pimetransport.com/api/public/payments/paguelofacil/webhook`

## 📧 Paso 7: Configurar Email (Opcional pero Recomendado)

Para enviar emails desde `noreply@pimetransport.com`:

1. **Configurar dominio en Resend**:
   - Ve a [Resend Dashboard](https://resend.com/domains)
   - Agrega el dominio `pimetransport.com`
   - Sigue las instrucciones para verificar el dominio (agregar registros DNS)
   - Una vez verificado, podrás usar `noreply@pimetransport.com`

2. **Actualizar variable de entorno**:
   ```
   RESEND_FROM_EMAIL=noreply@pimetransport.com
   ```

## 🧪 Paso 8: Probar Todo

1. **Probar cada subdominio**:
   - Visita cada URL y verifica que carga correctamente
   - Verifica que los PWAs se pueden instalar desde cada subdominio

2. **Probar autenticación**:
   - Intenta iniciar sesión en cada aplicación
   - Verifica que las credenciales se guardan correctamente

3. **Probar pagos** (si están configurados):
   - Realiza un pago de prueba
   - Verifica que los webhooks funcionan correctamente

## 🐛 Troubleshooting

### Los subdominios no funcionan

1. **Verifica DNS**:
   - Usa [dnschecker.org](https://dnschecker.org) para verificar que los registros DNS se propagaron globalmente
   - Espera hasta 24 horas para propagación completa

2. **Verifica en Vercel**:
   - Ve a Settings → Domains
   - Asegúrate de que todos los dominios muestren estado 🟢 **Valid**

3. **Verifica el middleware**:
   - Revisa los logs de Vercel para ver si hay errores
   - El middleware debería detectar automáticamente los subdominios

### Error 404 en subdominios

1. Verifica que `vercel.json` esté en la raíz del proyecto
2. Verifica que el middleware (`src/middleware.ts`) esté funcionando
3. Revisa los logs de deployment en Vercel

### Service Workers no funcionan

1. Limpia el cache del navegador
2. Desinstala PWAs anteriores si las tienes
3. Reinstala desde el nuevo subdominio

### Emails no se envían

1. Verifica que el dominio esté verificado en Resend
2. Verifica que `RESEND_FROM_EMAIL` esté configurado correctamente
3. Revisa los logs de Resend para ver errores

## 📝 Checklist Final

- [ ] Dominio principal `pimetransport.com` agregado en Vercel
- [ ] Todos los subdominios agregados en Vercel
- [ ] Registros DNS configurados en el proveedor de DNS
- [ ] Todos los dominios muestran estado 🟢 Valid en Vercel
- [ ] Variables de entorno actualizadas en Vercel
- [ ] Nuevo deployment realizado después de cambiar variables
- [ ] URLs de webhooks actualizadas en pasarelas de pago
- [ ] Dominio verificado en Resend (si usas email)
- [ ] Todos los subdominios probados y funcionando
- [ ] PWAs se pueden instalar desde cada subdominio

## 🎉 ¡Listo!

Una vez completados todos los pasos, tu sistema estará completamente configurado con el dominio `pimetransport.com` y todos los subdominios funcionando correctamente.

**Soporte**: Si tienes problemas, revisa los logs de Vercel o contacta al equipo de desarrollo.

